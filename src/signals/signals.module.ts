import { Module } from '@nestjs/common';
import { SignalsGateway } from './signals.gateway.js';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Session, SessionSchema } from '../auth/session.schema.js';
import { User, UserSchema } from '../auth/auth.schema.js';
import { AuthService } from '../auth/auth.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // Presence-driven renegotiation: the gateway re-announces `auth` over this
    // client when an authenticated wallet reconnects, so a peer whose `link` is
    // waiting for the requestId can resume the session without a new passkey.
    ClientsModule.register([
      {
        name: 'ACCOUNT_LINK_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT, 10) || 6379,
          username: process.env.REDIS_USERNAME || 'default',
          password: process.env.REDIS_PASSWORD || '',
        },
      },
    ]),
  ],
  providers: [AuthService, SignalsGateway],
  exports: [SignalsGateway],
})
export class SignalsModule {}
