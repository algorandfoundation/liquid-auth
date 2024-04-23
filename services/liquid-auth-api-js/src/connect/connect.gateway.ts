import type { Server, Socket } from 'socket.io';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

import { Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { RedisIoAdapter } from '../adapters/redis-io.adapter.js';
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ConnectGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private timers = new Map<string, NodeJS.Timeout>();
  private ioAdapter: RedisIoAdapter;
  private readonly logger = new Logger(ConnectGateway.name);
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
   * @param client
   */
  async handleConnection(socket: Socket) {
    const request = socket.request as Record<string, any>;
    const session = request.session as Record<string, any>;

    const timer = setInterval(() => {
      session.reload((err) => {
        // console.log('Reloaded session')
        if (err) {
          this.logger.error(err.message, err.stack);
          // forces the client to reconnect
          socket.conn.close();
          // you can also use socket.disconnect(), but in that case the client
          // will not try to reconnect
        } else {
          if (
            typeof session.wallet === 'string' &&
            socket.rooms.has(session.wallet) === false
          ) {
            this.logger.debug(`(*) Client Joining Room ${session.wallet}`);
            socket.join(session.wallet);
          }
        }
      });
    }, 200);

    if (this.timers.has(request.sessionID)) {
      clearInterval(this.timers.get(request.sessionID));
    }

    this.timers.set(request.sessionID, timer);

    this.logger.debug(
      `(*) Client Connected with Session: ${request.sessionID}${
        session.wallet ? ` and PublicKey: ${session.wallet}` : ''
      }`,
    );
    if (typeof session.wallet === 'string') {
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
    if (this.timers.has(request.sessionID)) {
      clearInterval(this.timers.get(request.sessionID));
    }
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
}
