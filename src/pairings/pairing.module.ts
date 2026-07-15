import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  PairingInvitation,
  PairingInvitationSchema,
} from './pairing-invitation.schema.js';
import { Pairing, PairingSchema } from './pairing.schema.js';
import { PairingController } from './pairing.controller.js';
import { PairingService } from './pairing.service.js';

@Module({
  imports: [
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
    MongooseModule.forFeature([
      { name: PairingInvitation.name, schema: PairingInvitationSchema },
      { name: Pairing.name, schema: PairingSchema },
    ]),
  ],
  controllers: [PairingController],
  providers: [PairingService],
  exports: [PairingService],
})
export class PairingModule {}
