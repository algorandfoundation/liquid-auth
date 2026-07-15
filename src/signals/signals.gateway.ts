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
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { Session as SessionType } from 'express-session';
import { Observable, Subscriber, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { RedisIoAdapter } from '../adapters/redis-io.adapter.js';
import { AuthService } from '../auth/auth.service.js';
import { Session } from '../auth/session.schema.js';
import { PairingRole } from '../pairings/pairing.schema.js';
import {
  PairingAuthorizationError,
  PairingService,
} from '../pairings/pairing.service.js';

type PairingSocketContext = {
  version: 2;
  pairingId: string;
  role: PairingRole;
  credential: string;
  status: 'pending' | 'active';
  wallet?: string;
};

export function pairingRoom(pairingId: string): string {
  return `pairing:${pairingId}`;
}

export function pairingRoleRoom(pairingId: string, role: PairingRole): string {
  return `${pairingRoom(pairingId)}:${role}`;
}

export async function reloadSession(session: SessionType) {
  return new Promise((resolve, reject) => {
    session.reload((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(session);
    });
  });
}

@WebSocketGateway()
export class SignalsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private ioAdapter: RedisIoAdapter;
  private readonly logger = new Logger(SignalsGateway.name);

  constructor(
    private readonly authService: AuthService,
    private readonly pairingService: PairingService,
  ) {}

  afterInit(server: Server) {
    this.ioAdapter = server.sockets.adapter as unknown as RedisIoAdapter;
    server.use(async (socket, next) => {
      const auth = socket.handshake?.auth as Record<string, any> | undefined;
      if (Number(auth?.version) !== 2) {
        next();
        return;
      }
      try {
        const result = await this.pairingService.authenticateCredential(
          auth.pairingId,
          auth.role,
          auth.credential,
        );
        socket.data.liquidPairing = {
          ...result,
          status: result.status as 'pending' | 'active',
          credential: auth.credential,
        } satisfies PairingSocketContext;
        next();
      } catch (error) {
        if (!(error instanceof PairingAuthorizationError)) {
          next(
            error instanceof Error
              ? error
              : new Error('Pairing authentication temporarily unavailable'),
          );
          return;
        }
        const handshakeError = new Error(error.message) as Error & {
          data?: { code: string };
        };
        handshakeError.data = { code: error.code };
        next(handshakeError);
      }
    });

    this.ioAdapter.subClient.subscribe('auth');
    this.ioAdapter.subClient.on('message', (channel, message) => {
      if (channel !== 'auth') return;
      try {
        const parsed = JSON.parse(message);
        const data = parsed.data || parsed;
        if (data.type === 'pairing:revoked' && data.pairingId) {
          const room = pairingRoom(data.pairingId);
          const revocation = {
            version: 2,
            pairingId: data.pairingId,
            status: 'revoked',
          };
          server.to(room).emit('pairing:revoked', revocation);
          server.in(room).disconnectSockets(true);
          return;
        }
        if (data.sessionId && data.wallet) {
          this.logger.debug(
            `(*) Global Auth Event: Joining Sockets for Session ${data.sessionId} to Room ${data.wallet}`,
          );
          server.in(data.sessionId).socketsJoin(data.wallet);
        }
        if (data.pairingId && data.wallet) {
          server
            .to(pairingRoleRoom(data.pairingId, 'provider'))
            .emit('pairing-approved', {
              version: 2,
              pairingId: data.pairingId,
              wallet: data.wallet,
              credId: data.credId,
            });
        }
      } catch (error) {
        this.logger.error('Failed to handle global auth message', error);
      }
    });
  }

  async handleConnection(socket: Socket) {
    const pairing = this.pairingContext(socket);
    if (pairing) {
      await Promise.all([
        socket.join(pairingRoom(pairing.pairingId)),
        socket.join(pairingRoleRoom(pairing.pairingId, pairing.role)),
      ]);
    }

    const request = socket.request as Record<string, any>;
    let session = request.session as Record<string, any> | undefined;
    if (session && typeof session.reload === 'function') {
      try {
        await reloadSession(session as SessionType);
        session = request.session as Record<string, any>;
      } catch (error) {
        this.logger.warn(
          `Unable to reload legacy session ${request.sessionID || 'unknown'}: ${(error as Error).message}`,
        );
        session = undefined;
      }
    }

    this.logger.debug(
      `(*) Client Connected with Session: ${request.sessionID || 'none'}${
        session?.wallet ? ` and PublicKey: ${session.wallet}` : ''
      }${pairing ? ` and Pairing: ${pairing.pairingId}/${pairing.role}` : ''}`,
    );
    if (typeof request.sessionID === 'string') {
      await socket.join(request.sessionID);
    }
    if (
      typeof session?.wallet === 'string' &&
      !socket.rooms.has(session.wallet)
    ) {
      this.logger.debug(
        `(*) Client Joining Room ${session.wallet} with Session: ${request.sessionID}`,
      );
      await socket.join(session.wallet);
    }
  }

  handleDisconnect(socket: Socket) {
    const request = socket.request as Record<string, any>;
    const pairing = this.pairingContext(socket);
    this.logger.debug(
      `(*) Client Disconnected with Session: ${request.sessionID || 'none'}${
        pairing ? ` and Pairing: ${pairing.pairingId}/${pairing.role}` : ''
      }`,
    );
  }

  @SubscribeMessage('link')
  async link(
    @MessageBody() body: { requestId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<Observable<{ data: Record<string, any> }>> {
    const request = client.request as Record<string, any>;
    const pairingContext = this.pairingContext(client);
    this.logger.debug(
      `(link): link for Session: ${request.sessionID || 'none'} with RequestId: ${body.requestId}`,
    );

    if (pairingContext) {
      if (
        pairingContext.role !== 'provider' ||
        pairingContext.pairingId !== body.requestId
      ) {
        throw this.linkAuthorizationException(
          new PairingAuthorizationError(
            'PAIRING_UNAUTHORIZED',
            'Pairing does not match link request',
          ),
          body,
        );
      }
      try {
        await this.pairingService.authenticateCredential(
          pairingContext.pairingId,
          pairingContext.role,
          pairingContext.credential,
        );
      } catch (error) {
        if (error instanceof PairingAuthorizationError) {
          throw this.linkAuthorizationException(error, body);
        }
        throw error;
      }
      const resolved = await this.pairingService.findActivePairing(
        pairingContext.pairingId,
      );
      if (resolved) {
        await client.join(
          pairingRoleRoom(pairingContext.pairingId, pairingContext.role),
        );
        return of({
          data: {
            version: 2,
            pairingId: resolved.pairingId,
            requestId: resolved.pairingId,
            wallet: resolved.wallet,
            credId: resolved.approvingCredentialId,
          },
        });
      }
    }

    const storedSession = request.sessionID
      ? await this.authService.findSession(request.sessionID)
      : null;
    if (!pairingContext && !storedSession) {
      throw new WsException('Signaling session not found');
    }

    await this.ioAdapter.subClient.subscribe('auth');
    const handleObserver = (observer: Subscriber<any>) => {
      let settled = false;
      const settle = async (
        data: Record<string, any>,
        prepare?: () => unknown | Promise<unknown>,
      ) => {
        if (settled) return;
        settled = true;
        try {
          if (prepare) await prepare();
          this.ioAdapter.subClient.off('message', handleAuthMessage);
          observer.next(data);
          observer.complete();
        } catch (error) {
          this.logger.error('Failed to complete link', error);
          this.ioAdapter.subClient.off('message', handleAuthMessage);
          observer.error(error);
        }
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        this.logger.error('Failed to handle auth message in link', error);
        this.ioAdapter.subClient.off('message', handleAuthMessage);
        observer.error(error);
      };
      const handleAuthMessage = async (
        channel: string,
        eventMessage: string,
      ) => {
        if (channel !== 'auth') return;
        try {
          const parsed = JSON.parse(eventMessage);
          const data = parsed.data || parsed;
          if (!data || body.requestId !== data.requestId) return;

          if (pairingContext) {
            const resolved = await this.pairingService.findActivePairing(
              pairingContext.pairingId,
            );
            if (!resolved || resolved.wallet !== data.wallet) return;
            await settle(
              {
                ...data,
                version: 2,
                pairingId: resolved.pairingId,
              },
              () =>
                client.join(
                  pairingRoleRoom(
                    pairingContext.pairingId,
                    pairingContext.role,
                  ),
                ),
            );
          } else {
            await settle(data, async () => {
              this.logger.debug(
                `(*) Linking Wallet: ${data.wallet} to Session: ${request.sessionID}`,
              );
              await this.authService.updateSessionWallet(
                storedSession,
                data.wallet,
              );
              if (
                request.session &&
                typeof request.session.reload === 'function'
              ) {
                await reloadSession(request.session);
              }
              await client.join(data.wallet);
            });
          }
        } catch (error) {
          fail(error);
        }
      };

      this.ioAdapter.subClient.on('message', handleAuthMessage);
      if (pairingContext) {
        // Close the small race where approval lands after the initial database
        // lookup but before this Redis listener is attached.
        void this.pairingService
          .findActivePairing(pairingContext.pairingId)
          .then(async (resolved) => {
            if (!resolved) return;
            await settle(
              {
                version: 2,
                pairingId: resolved.pairingId,
                requestId: resolved.pairingId,
                wallet: resolved.wallet,
                credId: resolved.approvingCredentialId,
              },
              () =>
                client.join(
                  pairingRoleRoom(
                    pairingContext.pairingId,
                    pairingContext.role,
                  ),
                ),
            );
          })
          .catch(fail);
      }
      return () => {
        settled = true;
        this.ioAdapter.subClient.off('message', handleAuthMessage);
      };
    };
    if (process.env.NODE_ENV === 'test') {
      globalThis.handleObserver = handleObserver;
    }
    const obs$: Observable<any> = new Observable(handleObserver);
    const handleObserverMap = (_obs$: any) => ({
      data: Object.fromEntries(
        ['version', 'pairingId', 'credId', 'requestId', 'wallet']
          .filter((key) => _obs$[key] !== undefined)
          .map((key) => [key, _obs$[key]]),
      ),
    });
    if (process.env.NODE_ENV === 'test') {
      globalThis.handleObserverMap = handleObserverMap;
    }
    return obs$.pipe(map(handleObserverMap));
  }

  @SubscribeMessage('offer-candidate')
  async onOfferCandidate(
    @MessageBody()
    data: { candidate: string; sdpMid: string; sdpMLineIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`(offer-candidate): ${JSON.stringify(data)}`);
    if (await this.routePairingSignal('offer-candidate', data, client)) return;
    const session = await this.legacySession(client);
    if (typeof session?.wallet === 'string') {
      this.server.in(session.wallet).emit('offer-candidate', data);
    }
  }

  @SubscribeMessage('offer-description')
  async onOfferDescription(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`(offer-description): ${data}`);
    if (await this.routePairingSignal('offer-description', data, client))
      return;
    const session = await this.legacySession(client);
    if (typeof session?.wallet === 'string') {
      if (!client.rooms.has(session.wallet)) await client.join(session.wallet);
      this.server.in(session.wallet).emit('offer-description', data);
    }
  }

  @SubscribeMessage('answer-description')
  async onAnswerDescription(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`(answer-description): ${data}`);
    if (await this.routePairingSignal('answer-description', data, client))
      return;
    const session = await this.legacySession(client);
    if (typeof session?.wallet === 'string') {
      if (!client.rooms.has(session.wallet)) await client.join(session.wallet);
      this.server.in(session.wallet).emit('answer-description', data);
    }
  }

  @SubscribeMessage('answer-candidate')
  async onAnswerCandidate(
    @MessageBody()
    data: { candidate: string; sdpMid: string; sdpMLineIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`(answer-candidate): ${JSON.stringify(data)}`);
    if (await this.routePairingSignal('answer-candidate', data, client)) return;
    const session = await this.legacySession(client);
    if (typeof session?.wallet === 'string') {
      if (!client.rooms.has(session.wallet)) await client.join(session.wallet);
      this.logger.debug(`Sending (answer-candidate): ${JSON.stringify(data)}`);
      this.server.in(session.wallet).emit('answer-candidate', data);
    }
  }

  private pairingContext(client: Socket): PairingSocketContext | undefined {
    return client.data?.liquidPairing as PairingSocketContext | undefined;
  }

  private linkAuthorizationException(
    error: PairingAuthorizationError,
    data: { requestId: string },
  ): WsException {
    return new WsException({
      status: 'error',
      code: error.code,
      message: error.message,
      error: error.message,
      cause: { pattern: 'link', data },
    });
  }

  private async routePairingSignal(
    event: string,
    data: unknown,
    client: Socket,
  ): Promise<boolean> {
    const context = this.pairingContext(client);
    if (!context) return false;
    const authentication = await this.pairingService.authenticateCredential(
      context.pairingId,
      context.role,
      context.credential,
    );
    if (authentication.status !== 'active') {
      throw new WsException('Pairing is not active');
    }
    const oppositeRole: PairingRole =
      context.role === 'provider' ? 'controller' : 'provider';
    this.server
      .to(pairingRoleRoom(context.pairingId, oppositeRole))
      .emit(event, data);
    return true;
  }

  private async legacySession(
    client: Socket,
  ): Promise<(Session & Record<string, any>) | undefined> {
    const request = client.request as Record<string, any>;
    if (!request.session || typeof request.session.reload !== 'function') {
      return request.session;
    }
    try {
      await reloadSession(request.session);
      return request.session as Session & Record<string, any>;
    } catch (error) {
      this.logger.warn(
        `Unable to reload legacy signaling session: ${(error as Error).message}`,
      );
      return undefined;
    }
  }
}
