import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
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

/**
 * Whether a linking session has already been claimed by a wallet credential.
 *
 * A session that authenticated with its own credential (a wallet that
 * completed a FIDO2 attestation/assertion — those controllers persist the
 * `credId`; passive peers such as agents never carry one) owns its wallet
 * binding. The `link` rendezvous must never rewrite such a session's wallet:
 * the re-announced `auth` event carries the wallet recorded on the OTHER
 * party's session, which can be stale (e.g. a connection last paired before
 * the wallet re-onboarded with fresh keys), and overwriting the
 * credential-authenticated binding with it silently de-authenticates the
 * wallet at its own origin.
 *
 * Checks the live express session first and falls back to the stored session
 * document, so the answer stays correct whichever copy is fresher.
 *
 * @param liveSession - The socket's live express session
 * @param stored - The stored Session document (serialized JSON payload)
 * @returns true when the session is claimed by a wallet credential
 */
export function sessionOwnsWalletBinding(
  liveSession: Record<string, any> | undefined,
  stored: Session | undefined,
): boolean {
  if (
    typeof liveSession?.credId === 'string' &&
    liveSession.credId.length > 0
  ) {
    return true;
  }
  try {
    const data = JSON.parse(stored?.session ?? '');
    return typeof data?.credId === 'string' && data.credId.length > 0;
  } catch {
    return false;
  }
}

/**
 * The wallet a session has claimed with its own credential, if any.
 *
 * Only a session that completed a FIDO2 ceremony carries a `credId`, so a
 * `credId` + `wallet` pair is the one wallet identity the server can attribute
 * to a socket. A wallet address WITHOUT a credential (what the `link`
 * rendezvous writes onto the peer/agent session) is hearsay and never counts
 * as a claim.
 *
 * Checks the live express session first and falls back to the stored session
 * document, so the answer stays correct whichever copy is fresher.
 *
 * @param liveSession - The socket's live express session
 * @param stored - The stored Session document (serialized JSON payload)
 * @returns The claimed wallet address, or null when the session is not
 *   credential-authenticated
 */
export function claimedWalletFromSession(
  liveSession: Record<string, any> | undefined,
  stored: Session | undefined,
): string | null {
  const claimedFrom = (data: Record<string, any> | undefined) =>
    typeof data?.credId === 'string' &&
    data.credId.length > 0 &&
    typeof data?.wallet === 'string' &&
    data.wallet.length > 0
      ? (data.wallet as string)
      : null;
  const live = claimedFrom(liveSession);
  if (live) {
    return live;
  }
  try {
    return claimedFrom(JSON.parse(stored?.session ?? ''));
  } catch {
    return null;
  }
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
              server.in(data.sessionId).socketsJoin(data.requestId);
              await this.updatePresence(data.requestId);
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
   * Find a LIVE conflicting wallet claim for a requestId
   *
   * A requestId names one pairing between one agent and one wallet. Once a
   * wallet has claimed it with its own credential, another wallet must not be
   * able to take it over just by knowing the identifier (requestIds are
   * long-lived — peers need a stable id to renegotiate over — and they travel
   * through QR codes, logs and UIs, so they are hints rather than secrets).
   *
   * Two properties keep this gate from ever locking out the legitimate wallet:
   *
   * - Only CREDENTIAL-claimed sessions count (see
   *   {@link AuthService.findWalletClaimsByRequestId}). The agent's session
   *   also stores a wallet address — written by the `link` rendezvous, and
   *   possibly stale — but it never proved it, so it can't block anyone.
   * - The conflicting claim must be LIVE (its session still owns a connected
   *   socket). Persisted sessions outlive the wallet that made them: after a
   *   re-onboarding the wallet returns to the same, persistent requestId with a
   *   NEW address and credential, and the abandoned claim must not stand in its
   *   way.
   *
   * @param requestId - The request identifier the caller wants to link for
   * @param wallet - The wallet the caller itself claimed with its credential
   * @param excludeSessionId - The caller's own session, never a conflict
   * @returns The conflicting claim, or null when the requestId is free for this
   *   wallet
   */
  async findLiveWalletClaimConflict(
    requestId: string,
    wallet: string,
    excludeSessionId?: string,
  ): Promise<{ sessionId: string; wallet: string } | null> {
    if (typeof requestId !== 'string' || requestId.length === 0) {
      return null;
    }
    try {
      const claims = await this.authService.findWalletClaimsByRequestId(
        requestId,
        excludeSessionId,
      );
      for (const claim of claims) {
        // The same wallet on another device is not a conflict: a key may live
        // on several devices, and both are the same party.
        if (claim.wallet === wallet) {
          continue;
        }
        const sockets = await this.server.in(claim.sessionId).fetchSockets();
        if (sockets.length === 0) {
          continue;
        }
        return { sessionId: claim.sessionId, wallet: claim.wallet };
      }
    } catch (e) {
      // Availability over strictness: a failed lookup must not break linking.
      this.logger.error('Failed to check wallet claims for requestId', e);
    }
    return null;
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
      // A wallet that authenticated with its own credential has claimed this
      // session; the auth rendezvous below must not re-claim it (see
      // sessionOwnsWalletBinding).
      const ownsWalletBinding = sessionOwnsWalletBinding(
        request.session,
        session,
      );
      // Claim gate: a requestId already claimed (and still held) by another
      // wallet is not up for grabs. Only decidable when the caller is itself
      // credential-authenticated — an anonymous session is the legitimate
      // agent role, so it cannot be refused here; peer-level authentication
      // above the signaling layer is what closes that remaining gap.
      const claimedWallet = claimedWalletFromSession(request.session, session);
      if (claimedWallet) {
        const conflict = await this.findLiveWalletClaimConflict(
          body.requestId,
          claimedWallet,
          request.sessionID,
        );
        if (conflict) {
          this.logger.warn(
            `(link): refusing RequestId: ${body.requestId} for wallet ${claimedWallet}; already claimed by ${conflict.wallet} (Session: ${conflict.sessionId})`,
          );
          // Refuse silently: no room join, no presence, no auth rendezvous —
          // the caller learns nothing about the connection it tried to take
          // over, and the acknowledgement it is waiting for never arrives.
          return;
        }
      }
      // Presence: join a room scoped to the requestId so we can track how
      // many devices are connected for this connection request.
      if (typeof body.requestId === 'string' && body.requestId.length > 0) {
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
              if (ownsWalletBinding) {
                // This session is already claimed by a wallet credential, so
                // linking must not re-bind it to the announced wallet. The
                // announce can carry a stale address recorded on the other
                // peer's session (e.g. a connection last paired before the
                // wallet re-onboarded), and rewriting would silently
                // de-authenticate the wallet at its own origin — forcing a
                // passkey prompt on the next connection switch.
                this.logger.debug(
                  `(*) Session: ${request.sessionID} already claimed by a wallet credential; not re-linking to ${data.wallet}`,
                );
              } else {
                this.logger.debug(
                  `(*) Linking Wallet: ${data.wallet} to Session: ${request.sessionID}`,
                );
                await this.authService.updateSessionWallet(
                  session,
                  data.wallet,
                );
                await reloadSession(request.session);
                this.logger.debug(
                  `(*) Joining Room: ${data.wallet} with Session: ${request.sessionID}`,
                );
                await client.join(data.wallet);
              }
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
