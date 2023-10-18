import { Module } from '@nestjs/common';
import { ConnectController } from './connect.controller.js';
import { ConnectGateway } from './connect.gateway.js';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from './session.schema.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
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
  providers: [SessionService, ConnectGateway],
})
export class ConnectModule {}
