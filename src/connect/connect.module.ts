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
    ClientsModule.register([
      { name: 'ACCOUNT_LINK_SERVICE', transport: Transport.REDIS },
    ]),
  ],
  controllers: [ConnectController],
  providers: [SessionService, ConnectGateway],
})
export class ConnectModule {}
