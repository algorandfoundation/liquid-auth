import { Module } from '@nestjs/common';
import { SignalsGateway } from './signals.gateway.js';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService, User, UserSchema, Session, SessionSchema } from '@algorand/liquid-auth';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [AuthService, SignalsGateway],
})
export class SignalsModule {}
