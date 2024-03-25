import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = request.session || request.handshake.session;
    return (
      typeof session !== 'undefined' &&
      typeof session.wallet === 'string' &&
      session.wallet.length === 58
    );
  }
}
