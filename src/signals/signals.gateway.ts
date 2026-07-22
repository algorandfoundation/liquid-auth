import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { Server, Socket } from 'socket.io';
import { Session as SessionType } from 'express-session';
import { Observable, Subscriber } from 'rxjs';
import { map } from 'rxjs/operators';
import { RedisIoAdapter } from '../adapters/redis-io.adapter.js';
import { AuthService } from '../auth/auth.service.js';
import { Session } from '../auth/session.schema.js';

/**
 * The two parties a `requestId` room is meant to hold: the authenticating
 * wallet (`admin`, a device with its own `credId`) and the requesting
 * counterpart (`peer`, e.g. a dapp/agent that only ever links).
 */
export type PeerRole = 'admin' | 'peer';

/** Why the two-peer room policy refused to admit a device. */
export type RoomAdmissionReason =
  | 'room-full'
  | 'duplicate-admin'
  | 'duplicate-peer';

/**
 * The maximum number of DISTINCT devices allowed in a single `requestId` room:
 * exactly one wallet `admin` and one non-admin `peer`. Additional sockets of an
 * already-admitted device do not consume a slot (a device is counted once, by
 * session id — see {@link SignalsGateway.countDevices}).
 */
export const ROOM_DEVICE_LIMIT = 2;

export async function reloadSession(session: SessionType) {
  return new Promise((resolve, reject) => {
    session.reload((err) => {
      if (err) {
        reject(err);
      }
      resolve(session);
    });
  });
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SignalsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private ioAdapter: RedisIoAdapter;
  private readonly logger = new Logger(SignalsGateway.name);
  constructor(
    private authService: AuthService,
    @Inject('ACCOUNT_LINK_SERVICE') private client: ClientProxy,
  ) {}
  /**
   * Initialize the Gateway
   *
   * Pulls the RedisIoAdapter instance from the server
   *
   * @param server
   */
  afterInit(server: Server) {
    this.ioAdapter = server.sockets.adapter as unknown as RedisIoAdapter;
    this.ioAdapter.subClient.subscribe('auth');
    this.ioAdapter.subClient.on('message', async (channel, message) => {
      if (channel === 'auth') {
        try {
          const parsed = JSON.parse(message);
          const data = parsed.data || parsed;
          if (data.sessionId && data.wallet) {
            this.logger.debug(
              `(*) Global Auth Event: Joining Sockets for Session ${data.sessionId} to Room ${data.wallet}`,
            );
            server.in(data.sessionId).socketsJoin(data.wallet);
            // Presence: the authenticated device (e.g. a wallet) connects for a
            // requestId but above only joins its wallet room. Join it to the
            // requestId room as well so it is counted as a connected device and
            // refresh presence so peers see every device.
            if (
              typeof data.requestId === 'string' &&
              data.requestId.length > 0
            ) {
              // Two-peer lockdown: the wallet is the room `admin`. Refuse to
              // add it when the room already holds another admin or is full
              // (e.g. two wallets racing to authenticate for the same
              // requestId). This is a broadcast-driven join with no client ack,
              // so skip quietly instead of throwing.
              const reason = await this.checkRoomAdmission(
                data.requestId,
                data.sessionId,
                'admin',
              );
              if (reason) {
                this.logger.warn(
                  `(*) Refusing to admit wallet Session ${data.sessionId} to RequestId ${data.requestId}: ${reason}`,
                );
              } else {
                server.in(data.sessionId).socketsJoin(data.requestId);
                await this.updatePresence(data.requestId);
              }
            }
            // Device deduplication: a credential (`credId`) can only ever
            // belong to a single device, so any other session carrying the same
            // credId is a stale login from that same device (e.g. a legacy
            // application that re-authenticates on every connection, or a wallet
            // that logs in again). Kick those out so the device is always
            // counted once — other devices that merely share the wallet address
            // are left alone (a wallet key may live on many devices).
            if (typeof data.credId === 'string' && data.credId.length > 0) {
              await this.evictDuplicateCredentialSessions(
                data.credId,
                data.sessionId,
              );
            }
          }
        } catch (e) {
          this.logger.error('Failed to handle global auth message', e);
        }
      }
    });
  }

  /**
   * Handle Connection
   *
   * Automatically join the client to the public key's room
   *
   * @param socket
   */
  async handleConnection(socket: Socket) {
    const request = socket.request as Record<string, any>;
    await reloadSession(request.session);
    const session = request.session as Record<string, any>;

    this.logger.debug(
      `(*) Client Connected with Session: ${request.sessionID}${
        session.wallet ? ` and PublicKey: ${session.wallet}` : ''
      }`,
    );
    if (typeof request.sessionID === 'string') {
      await socket.join(request.sessionID);
      // Stamp the session id onto the socket so presence counting can collapse
      // multiple sockets belonging to the same device (session) into a single
      // device. socket.data is propagated across nodes by the Redis adapter, so
      // it is available on the RemoteSockets returned by fetchSockets.
      socket.data.sessionId = request.sessionID;
    }
    if (
      typeof session.wallet === 'string' &&
      !socket.rooms.has(session.wallet)
    ) {
      this.logger.debug(
        `(*) Client Joining Room ${session.wallet} with Session: ${request.sessionID}`,
      );
      await socket.join(session.wallet);
    }
    // Presence: if this session is already tied to a request, re-join the
    // request room and refresh how many devices are connected for it.
    if (typeof session.requestId === 'string' && session.requestId.length > 0) {
      if (!socket.rooms.has(session.requestId)) {
        await socket.join(session.requestId);
      }
      await this.updatePresence(session.requestId, request.session);
      // Presence-driven renegotiation: an already-authenticated device (it has
      // a wallet) that reconnects for a known requestId re-announces `auth`.
      // This is genuine presence — the device is actually online — so a peer
      // whose `link` is waiting for this requestId resolves and they can
      // renegotiate the session over the socket, with no new passkey assertion.
      // First-time handshakes (no wallet yet) still wait for the real auth
      // event, so `link` always waits as expected.
      if (typeof session.wallet === 'string' && session.wallet.length > 0) {
        this.logger.debug(
          `(*) Re-announcing auth for reconnected wallet ${session.wallet} on RequestId: ${session.requestId}`,
        );
        this.client.emit<string>('auth', {
          requestId: session.requestId,
          wallet: session.wallet,
          sessionId: request.sessionID,
        });
      }
    }
  }

  async handleDisconnect(socket: Socket) {
    const request = socket.request as Record<string, any>;
    this.logger.debug(
      `(*) Client Disconnected with Session: ${request.sessionID}`,
    );
    const session = request.session as Record<string, any>;
    // Presence: refresh the connected device count when a peer leaves so the
    // remaining peers know whether anyone is still available to connect to.
    if (session && typeof session.requestId === 'string') {
      await this.updatePresence(session.requestId, request.session);
    }
  }

  /**
   * Count Devices
   *
   * Counts how many distinct devices are currently connected for a given
   * requestId room. Devices are identified by their session id (not by raw
   * socket) so that a single device is only ever counted once even if it owns
   * several sockets in the room (e.g. a lingering socket from a previous
   * connection plus a freshly reconnected one). Works across nodes via the
   * Redis adapter's fetchSockets. This is the live source of truth for
   * presence, so callers (e.g. /auth/session) can check the count on demand
   * instead of relying on a value persisted at an earlier, possibly racy,
   * moment.
   *
   * @param requestId - The request identifier peers are connecting for
   * @returns The number of connected devices for the requestId
   */
  async countDevices(requestId: string): Promise<number> {
    if (typeof requestId !== 'string' || requestId.length === 0) {
      return 0;
    }
    const sockets = await this.server.in(requestId).fetchSockets();
    // Count distinct devices, not raw sockets. A single device (session) may
    // briefly own more than one socket in the room — e.g. when it reconnects
    // and its previous socket has not been cleaned up yet, or when the socket
    // service closes and reopens — and each socket would otherwise inflate the
    // count, making the same device look like a new one on every reconnect.
    // Since one session is always the same device, collapse the sockets by
    // their session id (stamped in handleConnection) so a device is only ever
    // counted once no matter how it reconnects. Sockets missing a session id
    // fall back to their own id so they are still counted individually.
    const devices = new Set<string>();
    for (const socket of sockets) {
      const sessionId =
        socket.data && typeof socket.data.sessionId === 'string'
          ? socket.data.sessionId
          : socket.id;
      devices.add(sessionId);
    }
    return devices.size;
  }

  /**
   * Classify the devices currently occupying a requestId room by role
   *
   * Collapses the room's sockets to distinct devices (by session id, exactly
   * like {@link countDevices}) and labels each device `admin` or `peer`. A
   * device is an `admin` when its session carries a `credId` — the marker that
   * it authenticated with its OWN credential (see
   * {@link AuthService.findAdminSessionIdsByRequestId}); every other occupant is
   * a `peer`. The classification comes from the persisted session store rather
   * than a per-socket flag, so it stays correct across nodes and across the
   * gap between a socket connecting and its device later authenticating.
   *
   * @param requestId - The request identifier peers are connecting for
   * @returns A map of device session id -> role for the current occupants
   */
  async roomOccupancyRoles(requestId: string): Promise<Map<string, PeerRole>> {
    const roles = new Map<string, PeerRole>();
    if (typeof requestId !== 'string' || requestId.length === 0) {
      return roles;
    }
    const sockets = await this.server.in(requestId).fetchSockets();
    const adminIds =
      await this.authService.findAdminSessionIdsByRequestId(requestId);
    for (const socket of sockets) {
      const sessionId =
        socket.data && typeof socket.data.sessionId === 'string'
          ? socket.data.sessionId
          : socket.id;
      roles.set(sessionId, adminIds.has(sessionId) ? 'admin' : 'peer');
    }
    return roles;
  }

  /**
   * Enforce the two-peer room policy before a NEW device joins a room
   *
   * A `requestId` room is limited to exactly one wallet `admin` and one
   * non-admin `peer` ({@link ROOM_DEVICE_LIMIT} distinct devices with distinct
   * roles). This refuses to admit a third device (`room-full`) or a second
   * device of an already-present role (`duplicate-admin` / `duplicate-peer`) by
   * throwing a {@link WsException}, which is delivered to the offending client
   * only — the two participants already in the room are left untouched, and the
   * caller MUST NOT join the room when this throws.
   *
   * A socket whose DEVICE is already in the room (a reconnected/duplicate socket
   * of an admitted device) is always admitted: it is the same participant, not a
   * new one, so it never consumes a fresh slot.
   *
   * @param requestId - The request identifier the device wants to join
   * @param sessionId - The joining device's session id
   * @param role - The joining device's role (`admin` when it has a `credId`)
   */
  async assertRoomAdmission(
    requestId: string,
    sessionId: string,
    role: PeerRole,
  ): Promise<void> {
    const reason = await this.checkRoomAdmission(requestId, sessionId, role);
    if (reason) {
      throw this.roomAdmissionError(reason, requestId);
    }
  }

  /**
   * Non-throwing variant of {@link assertRoomAdmission}: returns the reason a
   * device would be refused, or `null` when it may join. Used by broadcast
   * (fire-and-forget) join paths — e.g. the global `auth` handler admitting a
   * wallet — where there is no client ack to reject, so the caller simply skips
   * the join instead of throwing.
   *
   * @param requestId - The request identifier the device wants to join
   * @param sessionId - The joining device's session id
   * @param role - The joining device's role (`admin` when it has a `credId`)
   * @returns The refusal reason, or `null` when the device may be admitted
   */
  async checkRoomAdmission(
    requestId: string,
    sessionId: string,
    role: PeerRole,
  ): Promise<RoomAdmissionReason | null> {
    const occupants = await this.roomOccupancyRoles(requestId);
    // The same device rejoining (another socket, a reconnect) does not consume
    // a new slot, so it is always allowed.
    if (typeof sessionId === 'string' && occupants.has(sessionId)) {
      return null;
    }
    if (occupants.size >= ROOM_DEVICE_LIMIT) {
      return 'room-full';
    }
    for (const existingRole of occupants.values()) {
      if (existingRole === role) {
        return role === 'admin' ? 'duplicate-admin' : 'duplicate-peer';
      }
    }
    return null;
  }

  /**
   * Build the {@link WsException} raised when the two-peer room policy rejects a
   * device. The structured payload lets a client distinguish the reasons.
   */
  private roomAdmissionError(
    reason: RoomAdmissionReason,
    requestId: string,
  ): WsException {
    const message =
      reason === 'room-full'
        ? `room ${requestId} is full (max ${ROOM_DEVICE_LIMIT} devices: one admin + one peer)`
        : reason === 'duplicate-admin'
          ? `room ${requestId} already has an admin (wallet) device`
          : `room ${requestId} already has a non-admin peer device`;
    this.logger.warn(`(link): rejected join for RequestId ${requestId}: ${reason}`);
    return new WsException({ event: 'link-error', reason, requestId, message });
  }

  /**
   * Update Presence
   *
   * Counts the connected devices for a given requestId room and notifies
   * everyone connected for that request. When a session is provided the
   * presence information is persisted to the user's session so it can be
   * displayed in their session information and used to decide whether an
   * offline client should attempt to reconnect.
   *
   * @param requestId - The request identifier peers are connecting for
   * @param session - Optional Express session to persist presence to
   */
  async updatePresence(
    requestId: string,
    session?: SessionType & Record<string, any>,
  ): Promise<number> {
    if (typeof requestId !== 'string' || requestId.length === 0) {
      return 0;
    }
    const deviceCount = await this.countDevices(requestId);
    this.logger.debug(
      `(presence): ${deviceCount} device(s) connected for RequestId: ${requestId}`,
    );
    // Notify everyone connected for this request of the current presence
    this.server.in(requestId).emit('presence', {
      requestId,
      deviceCount,
      online: deviceCount > 0,
    });
    // Persist presence to the user's session information when provided
    if (session) {
      session.requestId = requestId;
      session.deviceCount = deviceCount;
      session.save();
    }
    return deviceCount;
  }

  /**
   * Evict stale sessions bound to the same credential
   *
   * A credential (`credId`) can only ever belong to a single device. When a
   * device authenticates (attestation or assertion — see the global `auth`
   * handler) any previously stored session carrying the same credId is a stale
   * login from that same device, so its sockets are disconnected: they
   * immediately stop counting toward presence for whatever request they were
   * connected to. This keeps a device — including a legacy application that
   * re-authenticates on every connection — counted once instead of accumulating
   * a new device on every login/link. Sessions that merely share the wallet
   * address (a different device the user owns) are left untouched.
   *
   * @param credId - The credential id that identifies the device to deduplicate
   * @param keepSessionId - The freshly authenticated session to keep
   */
  async evictDuplicateCredentialSessions(
    credId: string,
    keepSessionId?: string,
  ): Promise<void> {
    if (typeof credId !== 'string' || credId.length === 0) {
      return;
    }
    try {
      const staleSessions = await this.authService.findSessionsByCredId(
        credId,
        keepSessionId,
      );
      for (const sessionId of staleSessions) {
        this.logger.debug(
          `(*) Evicting stale session ${sessionId} for credential ${credId}`,
        );
        // Disconnect the stale session's sockets so it stops counting toward
        // presence for any request it was connected to.
        const sockets = await this.server.in(sessionId).fetchSockets();
        for (const socket of sockets) {
          socket.disconnect(true);
        }
      }
    } catch (e) {
      this.logger.error('Failed to evict stale credential sessions', e);
    }
  }

  /**
   * Re-announce Auth for a genuinely present wallet
   *
   * When a peer links for a requestId that a wallet has ALREADY authenticated
   * for and is currently connected to (a live socket in the requestId room),
   * re-announce that wallet's `auth`. This drives an order-independent pairing
   * rendezvous: the wallet only broadcasts `auth` once on connect, so a peer
   * that links afterwards would otherwise never learn the wallet is present.
   *
   * The re-announce is strictly gated on LIVE presence — it verifies a
   * candidate wallet session still has a connected socket — so a link never
   * resolves against a wallet that has gone offline. All authenticated
   * sessions for the requestId are considered (not just the first stored one),
   * so an accumulated stale/dead duplicate can never shadow the one wallet
   * session that is genuinely present.
   *
   * @param requestId - The request identifier peers are connecting for
   * @param excludeSessionId - The linking peer's own session, ignored so the
   *   matches identify the OTHER party (the wallet) rather than the caller
   */
  async reannounceIfWalletPresent(
    requestId: string,
    excludeSessionId?: string,
  ): Promise<void> {
    if (typeof requestId !== 'string' || requestId.length === 0) {
      return;
    }
    try {
      // Scan EVERY authenticated session for this requestId, not just the
      // first: repeated peer/app restarts accumulate several sessions carrying
      // the same requestId + wallet, and typically only one still owns a live
      // socket. Picking only the first match and bailing when it has no socket
      // (the previous behaviour) let a stale/dead session shadow the genuinely
      // present wallet, so the linking peer's `auth` never fired and its `link`
      // hung forever — the peer sat "waiting to pair" while presence showed the
      // wallet online. Re-announce the FIRST candidate that is actually present.
      const candidates =
        await this.authService.findAuthenticatedSessionsByRequestId(
          requestId,
          excludeSessionId,
        );
      for (const authed of candidates) {
        // Confirm the wallet is genuinely online right now: its session must
        // still own a connected socket. Without this a stale (persisted)
        // session would resolve a link for a wallet that is no longer
        // available.
        const walletSockets = await this.server
          .in(authed.sessionId)
          .fetchSockets();
        if (walletSockets.length === 0) {
          continue;
        }
        this.logger.debug(
          `(link): wallet ${authed.wallet} already present for RequestId: ${requestId}; re-announcing auth`,
        );
        this.client.emit<string>('auth', {
          requestId,
          wallet: authed.wallet,
          sessionId: authed.sessionId,
        });
        return;
      }
    } catch (e) {
      this.logger.error('Failed to re-announce auth for present wallet', e);
    }
  }

  /**
   * On Link Connection, wait for the wallet to connect
   * @param client
   * @param body
   */
  @SubscribeMessage('link')
  async link(
    @MessageBody() body: { requestId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<Observable<{ data: { requestId: string; wallet: string } }>> {
    const request = client.request as Record<string, any>;
    this.logger.debug(
      `(link): link for Session: ${request.sessionID} with RequestId: ${body.requestId}`,
    );
    // Find the stored session
    const session = await this.authService.findSession(request.sessionID);
    if (session) {
      // Presence: join a room scoped to the requestId so we can track how
      // many devices are connected for this connection request.
      if (typeof body.requestId === 'string' && body.requestId.length > 0) {
        // Two-peer lockdown: a requestId room holds exactly one wallet `admin`
        // and one non-admin `peer`. Refuse a third device or a duplicate of an
        // already-present role BEFORE joining, so the two participants already
        // linked are untouched. A device that only ever links (no `credId` on
        // its session) is a `peer`; a device that authenticated with its own
        // credential is an `admin`. This throws a WsException on rejection,
        // which reaches only the offending client.
        const reqSession = request.session as Record<string, any>;
        const role: PeerRole =
          typeof reqSession.credId === 'string' && reqSession.credId.length > 0
            ? 'admin'
            : 'peer';
        await this.assertRoomAdmission(
          body.requestId,
          request.sessionID,
          role,
        );
        if (!client.rooms.has(body.requestId)) {
          await client.join(body.requestId);
        }
        await this.updatePresence(body.requestId, request.session);
      }
      await this.ioAdapter.subClient.subscribe('auth');
      const handleObserver = (observer: Subscriber<any>) => {
        const handleAuthMessage = async (
          channel: string,
          eventMessage: string,
        ) => {
          if (channel !== 'auth') {
            return;
          }
          try {
            const parsed = JSON.parse(eventMessage);
            const data = parsed.data || parsed;
            if (data && body.requestId === data.requestId) {
              this.logger.debug(
                `(*) Linking Wallet: ${data.wallet} to Session: ${request.sessionID}`,
              );
              await this.authService.updateSessionWallet(session, data.wallet);
              await reloadSession(request.session);
              this.logger.debug(
                `(*) Joining Room: ${data.wallet} with Session: ${request.sessionID}`,
              );
              await client.join(data.wallet);
              // Presence: the wallet has authenticated for this request. Make
              // sure its sockets join the requestId room too, then recount and
              // persist presence to this (offer) session so every connected
              // device is reflected in its session information (/auth/session).
              if (
                typeof body.requestId === 'string' &&
                body.requestId.length > 0
              ) {
                if (typeof data.sessionId === 'string') {
                  this.server.in(data.sessionId).socketsJoin(body.requestId);
                }
                await this.updatePresence(body.requestId, request.session);
              }
              this.ioAdapter.subClient.off('message', handleAuthMessage);
              observer.next(data);
              observer.complete();
            }
          } catch (e) {
            this.logger.error('Failed to handle auth message in link', e);
            this.ioAdapter.subClient.off('message', handleAuthMessage);
          }
        };

        this.ioAdapter.subClient.on('message', handleAuthMessage);

        // Order-independent rendezvous: the wallet re-announces `auth` once when
        // its socket connects (see handleConnection). A peer that links AFTER
        // the wallet is already connected would miss that one-shot announce and
        // wait forever — its `once(offer-description)` never arms, so every
        // offer the wallet sends is dropped and negotiation times out. Now that
        // this peer's auth listener is armed, re-announce `auth` if the wallet
        // is genuinely present (a live socket) for this requestId, so the link
        // resolves regardless of which side connected first. Gated on live
        // presence, so a link never resolves against an offline wallet. The
        // caller's own session is excluded so we detect the OTHER party (both
        // peers share the same wallet + requestId after a first pairing).
        void this.reannounceIfWalletPresent(body.requestId, request.sessionID);

        return () => {
          this.ioAdapter.subClient.off('message', handleAuthMessage);
        };
      };
      if (process.env.NODE_ENV === 'test') {
        globalThis.handleObserver = handleObserver;
      }
      // Handle messages
      const obs$: Observable<any> = new Observable(handleObserver);
      const handleObserverMap = (_obs$: any) => ({
        data: {
          credId: _obs$.credId,
          requestId: _obs$.requestId,
          wallet: _obs$.wallet,
        },
      });
      if (process.env.NODE_ENV === 'test') {
        globalThis.handleObserverMap = handleObserverMap;
      }
      return obs$.pipe(map(handleObserverMap));
    }
  }

  /**
   * On Presence request, report how many devices are connected for a requestId.
   *
   * A (potentially offline) client can query this to detect whether there is
   * anyone available to connect to before attempting to reconnect.
   *
   * This is a pure read: it must NOT persist the requestId onto the querying
   * client's session. Persisting it here would cause that client to auto-join
   * the requestId room on its next (re)connect (see handleConnection), so it
   * would be counted as a connected device even though it never linked and is
   * not armed to receive a connection. Presence membership is only established
   * by actually waiting for a connection (link) or negotiating, so we count and
   * broadcast without touching the caller's session.
   *
   * @param body
   * @param client
   */
  @SubscribeMessage('presence')
  async onPresence(
    @MessageBody() body: { requestId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ requestId: string; deviceCount: number; online: boolean }> {
    const request = client.request as Record<string, any>;
    this.logger.debug(
      `(presence): request for Session: ${request.sessionID} with RequestId: ${body.requestId}`,
    );
    const deviceCount = await this.updatePresence(body.requestId);
    return {
      requestId: body.requestId,
      deviceCount,
      online: deviceCount > 0,
    };
  }

  @SubscribeMessage('offer-candidate')
  async onOfferCandidate(
    @MessageBody()
    data: { candidate: string; sdpMid: string; sdpMLineIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`(offer-candidate): ${JSON.stringify(data)}`);
    const request = client.request as Record<string, any>;
    await reloadSession(request.session);
    const session = request.session as Session & Record<string, any>;
    // Signaling is scoped to the requestId room (the identifier that names the
    // pairing and drives presence) rather than the wallet address, so SDP/ICE
    // flows between the two peers without depending on the wallet identity.
    if (typeof session.requestId === 'string') {
      if (!client.rooms.has(session.requestId)) {
        client.join(session.requestId);
      }
      this.server.in(session.requestId).emit('offer-candidate', data);
    }
  }

  @SubscribeMessage('offer-description')
  async onOfferDescription(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`(offer-description): ${data}`);
    // Session from the initial Handshake
    const request = client.request as Record<string, any>;
    await reloadSession(request.session);
    const session = request.session as Record<string, any>;

    if (typeof session.requestId === 'string') {
      if (!client.rooms.has(session.requestId)) {
        client.join(session.requestId);
      }
      // Send description to all clients in the requestId room
      this.server.in(session.requestId).emit('offer-description', data);
    }
  }
  @SubscribeMessage('answer-description')
  async onAnswerDescription(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`(answer-description): ${data}`);
    const request = client.request as Record<string, any>;
    await reloadSession(request.session);

    const session = request.session as Record<string, any>;
    if (typeof session.requestId === 'string') {
      if (!client.rooms.has(session.requestId)) {
        client.join(session.requestId);
      }
      this.server.in(session.requestId).emit('answer-description', data);
    }
  }
  @SubscribeMessage('answer-candidate')
  async onAnswerCandidate(
    @MessageBody()
    data: { candidate: string; sdpMid: string; sdpMLineIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`(answer-candidate): ${JSON.stringify(data)}`);
    const request = client.request as Record<string, any>;
    await reloadSession(request.session);

    const session = request.session as Record<string, any>;
    if (typeof session.requestId === 'string') {
      if (!client.rooms.has(session.requestId)) {
        client.join(session.requestId);
      }
      this.logger.debug(`Sending (answer-candidate): ${JSON.stringify(data)}`);
      this.server.in(session.requestId).emit('answer-candidate', data);
    }
  }
}
