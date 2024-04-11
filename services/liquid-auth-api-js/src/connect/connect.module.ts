import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';

// Connect
import { ConnectController } from './connect.controller.js';
import { ConnectGateway } from './connect.gateway.js';
// Auth
import { AuthService } from '../auth/auth.service.js';
import { Session, SessionSchema } from '../auth/session.schema.js';
import { User, UserSchema } from '../auth/auth.schema.js';
import { AlgodService } from '../algod/algod.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // TODO: inject configuration
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
  controllers: [ConnectController],
  providers: [AuthService, ConnectGateway, AlgodService],
})
export class ConnectModule {}
