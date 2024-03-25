import type { Handshake, Server, Socket } from 'socket.io';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

import { Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { RedisIoAdapter } from '../adapters/redis-io.adapter';
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ConnectGateway implements OnGatewayInit, OnGatewayConnection {
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
  async handleConnection(client: Socket) {
    const handshake = client.handshake as Handshake;
    const session = handshake.session as Record<string, any>;
    this.logger.debug(
      `(*) Client Connected with Session: ${handshake.sessionID}${
        session.wallet ? ` and PublicKey: ${session.wallet}` : ''
      }`,
    );
    if (typeof session.wallet === 'string') {
      this.logger.debug(`(*) Client Joining Room ${session.wallet}`);
      await client.join(session.wallet);
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
    const handshake = client.handshake as Handshake;
    this.logger.debug(
      `(link): link for Session: ${handshake.sessionID} with RequestId: ${body.requestId}`,
    );

    // Find the stored session
    const session = await this.authService.findSession(handshake.sessionID);
    console.log('Session', session);
    if (session) {
      await this.ioAdapter.subClient.subscribe('auth');

      // Handle messages
      const obs$: Observable<any> = new Observable((observer) => {
        const handleAuthMessage = async (channel, eventMessage)=> {
          console.log('Link->Message', channel, eventMessage);
          const { data } = JSON.parse(eventMessage);
          console.log(body.requestId, data.requestId, data, body);
          if (body.requestId === data.requestId) {
            this.logger.debug(
              `(*) Linking Wallet: ${data.wallet} to Session: ${handshake.sessionID}`,
            );
            await this.authService.updateSessionWallet(session, data.wallet);
            this.logger.debug(`(*) Joining Room: ${data.wallet}`);
            await client.join(data.wallet);
            observer.next(data);
            this.ioAdapter.subClient.off('message', handleAuthMessage);
            observer.complete();
          }
        }

        this.ioAdapter.subClient.on(
          'message',
          handleAuthMessage,
        );
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
