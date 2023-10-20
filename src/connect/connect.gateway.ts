import type { Handshake, Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { SessionService } from './session.service.js';
import { Logger, Session } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ConnectGateway {
  private subClient: Redis;
  private readonly logger = new Logger(ConnectGateway.name);

  constructor(
    private configService: ConfigService,
    private sessionService: SessionService,
  ) {
    this.subClient = new Redis({
      host: configService.get('socket.host'),
      port: configService.get('socket.port'),
      username: configService.get('socket.username'),
      password: configService.get('socket.password'),
      lazyConnect: true,
    });
  }
  @WebSocketServer()
  server: Server;

  handleConnection(@Session() session: Record<any, any>) {
    this.logger.debug(`WSS / Client Connected with Session: ${session.id}`);
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
      `WSS / Event: link for Session: ${handshake.sessionID} with RequestId: ${body.requestId}`,
    );
    // Find the stored session
    const session = await this.sessionService.find(handshake.sessionID);

    // Connect to the redis feed
    if (this.subClient.status !== 'ready') {
      await this.subClient.connect();
    }
    this.subClient.subscribe('auth');

    // Handle messages
    const obs$: Observable<any> = new Observable((observer) => {
      this.subClient.on('message', async (channel, eventMessage) => {
        const { data } = JSON.parse(eventMessage);
        if (body.requestId === data.requestId) {
          await this.sessionService.updateWallet(session, data.wallet);
          observer.next(data);
          this.subClient.disconnect();
          observer.complete();
        }
      });
    });
    return obs$.pipe(
      map((obs$) => ({
        data: {
          requestId: obs$.requestId,
          wallet: obs$.wallet,
        },
      })),
    );
  }
}
