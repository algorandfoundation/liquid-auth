import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RequestHandler } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Adapter for WebSockets to Redis
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly sessionHandler: RequestHandler;
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private pubClient: Redis;
  public subClient: Redis;

  constructor(app: NestExpressApplication, sessionHandler: RequestHandler) {
    super(app);
    this.sessionHandler = sessionHandler;
  }
  async connectToRedis(config: ConfigService): Promise<void> {
    this.pubClient = new Redis({
      host: config.get('socket.host'),
      port: config.get('socket.port'),
      username: config.get('socket.username'),
      password: config.get('socket.password'),
      lazyConnect: true,
    });
    this.subClient = this.pubClient.duplicate();
    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.engine.use(this.sessionHandler);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
