import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private pubClient!: Redis;
  private subClient!: Redis;

  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  async onModuleInit(): Promise<void> {
    const redisOptions = {
      host: this.configService.get('socket.host'),
      port: this.configService.get('socket.port'),
      username: this.configService.get('socket.username'),
      password: this.configService.get('socket.password'),
      lazyConnect: true,
    };
    this.pubClient = new Redis(redisOptions);
    this.subClient = new Redis(redisOptions);
    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.pubClient.quit(), this.subClient.quit()]);
  }

  async publish(channel: string, data: any): Promise<number> {
    return this.pubClient.publish(channel, JSON.stringify(data));
  }

  get sub(): Redis {
    return this.subClient;
  }
}
