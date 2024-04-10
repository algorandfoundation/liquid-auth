import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseInterceptors } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
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
    this.logger.debug(`(call-candidate): ${JSON.stringify(data)}`);
    const request = client.request as Record<string, any>;
    const session = request.session as Record<string, any>;
    this.server.in(session.wallet).emit('call-candidate', data);
  }
  @SubscribeMessage('call-description')
  onCallDescription(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`(call-description): ${data}`);

    // Session from the initial Handshake
    const request = client.request as Record<string, any>;
    const session = request.session as Record<string, any>;

    // Send description to all clients in the public key's room
    this.server.in(session.wallet).emit('call-description', data);
  }
  @SubscribeMessage('answer-description')
  onAnswerDescription(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`(answer-description): ${data}`);
    const request = client.request as Record<string, any>;
    const session = request.session as Record<string, any>;
    this.server.in(session.wallet).emit('answer-description', data);
  }
  @SubscribeMessage('answer-candidate')
  onAnswerCandidate(
    @MessageBody()
    data: { candidate: string; sdpMid: string; sdpMLineIndex: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`(answer-candidate): ${JSON.stringify(data)}`);
    const request = client.request as Record<string, any>;
    const session = request.session as Record<string, any>;
    this.server.in(session.wallet).emit('answer-candidate', data);
  }
}
