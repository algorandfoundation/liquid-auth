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
   * Counts how many sockets (devices) are currently connected for a given
   * requestId room. Works across nodes via the Redis adapter's fetchSockets.
   * This is the live source of truth for presence, so callers (e.g.
   * /auth/session) can check the count on demand instead of relying on a
   * value persisted at an earlier, possibly racy, moment.
   *
   * @param requestId - The request identifier peers are connecting for
   * @returns The number of connected devices for the requestId
   */
  async countDevices(requestId: string): Promise<number> {
    if (typeof requestId !== 'string' || requestId.length === 0) {
      return 0;
    }
    const sockets = await this.server.in(requestId).fetchSockets();
    return sockets.length;
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
                  this.server
                    .in(data.sessionId)
                    .socketsJoin(body.requestId);
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
   * anyone available to connect to before attempting to reconnect. The current
   * presence is also persisted to the requesting user's session information.
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
    const deviceCount = await this.updatePresence(
      body.requestId,
      request.session,
    );
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
