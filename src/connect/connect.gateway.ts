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

//TODO: find better way to access the redis adapter
const subClient = new Redis({ lazyConnect: true });
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ConnectGateway {
  constructor(private sessionService: SessionService) {}
  @WebSocketServer()
  server: Server;

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
    console.log(`Message Recieved to Link ${body.requestId}`);
    // Recast the handshake
    const handshake = client.handshake as Handshake;

    // Find the stored session
    const session = await this.sessionService.find(handshake.sessionID);
    console.log(`Session found ${session}`);
    // Connect to the redis feed
    if (subClient.status !== 'ready') {
      await subClient.connect();
    }
    subClient.subscribe('auth');

    // Handle messages
    const obs$: Observable<any> = new Observable((observer) => {
      subClient.on('message', async (channel, eventMessage) => {
        const { data } = JSON.parse(eventMessage);
        if (body.requestId === data.requestId) {
          await this.sessionService.updateWallet(session, data.wallet);
          observer.next(data);
          subClient.disconnect();
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
