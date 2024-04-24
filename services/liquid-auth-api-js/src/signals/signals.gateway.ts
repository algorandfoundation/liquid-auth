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
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { Session } from 'express-session';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RedisIoAdapter } from '../adapters/redis-io.adapter.js';
import { AuthService } from '../auth/auth.service.js';

async function reloadSession(session: Session) {
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
  constructor(private authService: AuthService) {}
  /**
   * Initialize the Gateway
   *
   * Pulls the RedisIoAdapter instance from the server
   *
   * @param server
   */
  afterInit(server: Server) {
    this.ioAdapter = server.sockets.adapter as unknown as RedisIoAdapter;
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
    if (
      typeof session.wallet === 'string' &&
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
    this.logger.debug(
      `(*) Client Disconnected with Session: ${request.sessionID}`,
    );
  }
  /**
   * On Link Connection, wait for the wallet to connect
   * @param client
   * @param body
   */
  @SubscribeMessage('link')
  async linkAccount(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { requestId: string | number },
  ): Promise<
    Observable<{ data: { requestId: string | number; wallet: string } }>
  > {
    const request = client.request as Record<string, any>;
    this.logger.debug(
      `(link): link for Session: ${request.sessionID} with RequestId: ${body.requestId}`,
    );

    // Find the stored session
    const session = await this.authService.findSession(request.sessionID);
    console.log('Session', session);
    if (session) {
      console.log('Listening to auth messages');
      await this.ioAdapter.subClient.subscribe('auth');

      // Handle messages
      const obs$: Observable<any> = new Observable((observer) => {
        const handleAuthMessage = async (channel, eventMessage) => {
          console.log('Link->Message', channel, eventMessage);
          const { data } = JSON.parse(eventMessage);
          if (body.requestId === data.requestId) {
            this.logger.debug(
              `(*) Linking Wallet: ${data.wallet} to Session: ${request.sessionID}`,
            );
            await this.authService.updateSessionWallet(session, data.wallet);
            this.logger.debug(
              `(*) Joining Room: ${data.wallet} with Session: ${request.sessionID}`,
            );
            await client.join(data.wallet);
            observer.next(data);
            this.ioAdapter.subClient.off('message', handleAuthMessage);
            observer.complete();
          }
        };

        this.ioAdapter.subClient.on('message', handleAuthMessage);
      });
      return obs$.pipe(
        map((obs$) => ({
          data: {
            credId: obs$.credId,
            requestId: obs$.requestId,
            wallet: obs$.wallet,
          },
        })),
      );
    }
  }
  @SubscribeMessage('offer-candidate')
  async onCallCandidate(
    @MessageBody()
    data: { candidate: string; sdpMid: string; sdpMLineIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`(offer-candidate): ${JSON.stringify(data)}`);
    const request = client.request as Record<string, any>;
    await reloadSession(request.session);

    const session = request.session as Session & Record<string, any>;
    if (typeof session.wallet === 'string') {
      this.server.in(session.wallet).emit('offer-candidate', data);
    }
  }

  @SubscribeMessage('offer-description')
  async onCallDescription(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`(offer-description): ${data}`);

    // Session from the initial Handshake
    const request = client.request as Record<string, any>;
    await reloadSession(request.session);

    const session = request.session as Record<string, any>;

    if (typeof session.wallet === 'string') {
      if (!client.rooms.has(session.wallet)) {
        client.join(session.wallet);
      }
      // Send description to all clients in the public key's room
      this.server.in(session.wallet).emit('offer-description', data);
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
    if (typeof session.wallet === 'string') {
      if (!client.rooms.has(session.wallet)) {
        client.join(session.wallet);
      }
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
    const request = client.request as Record<string, any>;
    await reloadSession(request.session);

    const session = request.session as Record<string, any>;
    if (typeof session.wallet === 'string') {
      if (!client.rooms.has(session.wallet)) {
        client.join(session.wallet);
      }
      this.logger.debug(`Sending (answer-candidate): ${JSON.stringify(data)}`);
      this.server.in(session.wallet).emit('answer-candidate', data);
    }
  }
}
