import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { type Handshake, Socket } from 'socket.io';

@Injectable()
export class SignalsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SignalsInterceptor.name);
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const client = context.switchToWs().getClient() as Socket;
    const handshake = client.handshake as Handshake;
    const session = handshake.session as Record<string, any>;

    if (typeof session.wallet !== 'string') {
      this.logger.error(
        `(*) Client ${handshake.sessionID} is not authenticated`,
      );
      client.disconnect();
    } else {
      return next.handle();
    }
  }
}
