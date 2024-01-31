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
import { Logger, Session, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {Request, Response} from 'express'
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
    // Connect to the redis feed
    if (this.subClient.status !== 'ready') {
      this.subClient.connect();
    }
  }
  @WebSocketServer()
  server: Server;

  handleConnection(@Session() session: Record<any, any>) {
    session.connected = true;
    this.logger.debug(`WSS / Client Connected with Session: ${session.id}`);
  }
  @SubscribeMessage('hello')
  async hello(@MessageBody() data: string, @ConnectedSocket() client: Socket) {
    const handshake = client.handshake as Handshake;
    const session = await this.sessionService.find(handshake.sessionID);
    console.log('Hello triggered', session);
    return data;
  }
  @SubscribeMessage('wait')
  async waitOnRegistration(
    @Res() res: Response,
    @Req() req: Request,
    @Session() sessionz: Record<any, any>,
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { wallet: string },
  ) {
    console.log('waiting', sessionz);
    const handshake = (req as any).handshake as Handshake;
    console.log(sessionz, ((req as any).handshake as Handshake).sessionID);
    // Find the stored session
    const sessionRecord = await this.sessionService.find(handshake.sessionID);

    console.log(sessionRecord);

    if(sessionRecord) {
      const session = JSON.parse(sessionRecord.session);
      console.log(session)

    }
    // TODO: restrict to session
    this.subClient.subscribe('auth-interaction');

    // Handle messages
    const obs$: Observable<any> = new Observable((observer) => {
      this.subClient.on('message', async (channel, eventMessage) => {
        console.log(eventMessage);
        const { data } = JSON.parse(eventMessage);
        console.log(body.wallet, data.wallet);
        if (body.wallet === data.wallet) {
          observer.next(data);
          // this.subClient.disconnect();
          observer.complete();
        }
      });
    });
    return obs$.pipe(
      map((obs$) => ({
        data: {
          device: obs$.credential.device,
          credId: obs$.credential.credId,
          wallet: obs$.wallet,
        },
      })),
    );
  }
  /**
   * On Link Connection, wait for the wallet to connect
   * @param client
   * @param body
   */
  @SubscribeMessage('link')
  async linkAccount(
    @Req() req: Request,
    @Session() sessionz: Record<any, any>,
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { requestId: string | number },
  ): Promise<
    Observable<{ data: { requestId: string | number; wallet: string } }>
  > {
    console.log(sessionz, ((req as any).handshake as Handshake).sessionID);
    const handshake = client.handshake as Handshake;
    this.logger.debug(
      `WSS / Event: link for Session: ${handshake.sessionID} with RequestId: ${body.requestId}`,
    );

    // Find the stored session
    const session = await this.sessionService.find(handshake.sessionID);
    if(session){
      this.subClient.subscribe('auth');

      // Handle messages
      const obs$: Observable<any> = new Observable((observer) => {
        this.subClient.on('message', async (channel, eventMessage) => {
          const { data } = JSON.parse(eventMessage);
          console.log(body.requestId, data.requestId, data, body);
          if (body.requestId === data.requestId) {
            await this.sessionService.updateWallet(session, data.wallet);
            observer.next(data);
            // this.subClient.disconnect();
            observer.complete();
          }
        });
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
