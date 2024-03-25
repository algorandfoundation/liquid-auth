import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseInterceptors } from '@nestjs/common';
import type { Handshake, Server, Socket } from 'socket.io';
import { SignalsInterceptor } from './signals.interceptor.js';

@WebSocketGateway()
@UseInterceptors(SignalsInterceptor)
export class SignalsGateway {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(SignalsGateway.name);

  @SubscribeMessage('call-candidate')
  onCallCandidate(
    @MessageBody()
    data: { candidate: string; sdpMid: string; sdpMLineIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`(call-candidate): ${data}`);
    const handshake = client.handshake as Handshake;
    const session = handshake.session as Record<string, any>;
    this.server.in(session.wallet).emit('call-candidate', data);
  }
  @SubscribeMessage('call-description')
  async onCallDescription(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`(call-description): ${data}`);

    // Session from the initial Handshake
    const handshake = client.handshake as Handshake;
    const session = handshake.session as Record<string, any>;

    // Send description to all clients in the public key's room
    this.server.in(session.wallet).emit('call-description', data);
  }
  @SubscribeMessage('answer-description')
  async onAnswerDescription(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`(answer-description): ${data}`);
    const handshake = client.handshake as Handshake;
    const session = handshake.session as Record<string, any>;
    this.server.in(session.wallet).emit('answer-description', data);
  }
  @SubscribeMessage('answer-candidate')
  onAnswerCandidate(
    @MessageBody()
    data: { candidate: string; sdpMid: string; sdpMLineIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`(answer-candidate): ${data}`);
    const handshake = client.handshake as Handshake;
    const session = handshake.session as Record<string, any>;
    this.server.in(session.wallet).emit('answer-candidate', data);
  }
}
