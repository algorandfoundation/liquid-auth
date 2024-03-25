import { Module } from '@nestjs/common';
import { SignalsGateway } from './signals.gateway.js';
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({
  imports: [
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
  providers: [SignalsGateway],
})
export class SignalsModule {}
