import { Module } from '@nestjs/common';
import { SignalsGateway } from './signals.gateway.js';

@Module({
  providers: [SignalsGateway],
})
export class SignalsModule {}
