import { Module } from '@nestjs/common';
import { AttestationController } from './attestation.controller.js';
import { AttestationService } from './attestation.service.js';
import { AuthService } from '../auth/auth.service.js';
import { ConfigModule } from '@nestjs/config';
import { AppService } from '../app.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/auth.schema.js';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Session, SessionSchema } from '../auth/session.schema.js';
import { AlgodService } from '../algod/algod.service.js';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
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
  controllers: [AttestationController],
  providers: [AppService, AlgodService, AuthService, AttestationService],
})
export class AttestationModule {}
