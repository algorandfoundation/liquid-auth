import { Module } from '@nestjs/common';
import { EventsService } from './events.service.js';

@Module({
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
