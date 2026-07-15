import { Module } from '@nestjs/common';
import { SignalsGateway } from './signals.gateway.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from '../auth/session.schema.js';
import { User, UserSchema } from '../auth/auth.schema.js';
import { AuthService } from '../auth/auth.service.js';
import { PairingModule } from '../pairings/pairing.module.js';

@Module({
  imports: [
    PairingModule,
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [AuthService, SignalsGateway],
})
export class SignalsModule {}
