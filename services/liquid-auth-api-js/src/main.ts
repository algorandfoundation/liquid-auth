import 'dotenv/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

// Application
import { AppModule } from './app.module.js';
import { RedisIoAdapter } from './adapters/redis-io.adapter.js';

// Session
import session from 'express-session';
import MongoStore from 'connect-mongo';

// Sentry
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { SentryFilter } from './sentry.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });
  const config = app.get<ConfigService>(ConfigService);

  const isSentryEnabled =
    config.get('sentry') || typeof process.env.SENTRY_DNS !== 'undefined';
  if (isSentryEnabled) {
    Sentry.init({
      dsn: process.env.SENTRY_DNS,
      integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        new ProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0,
      // Set sampling rate for profiling - this is relative to tracesSampleRate
      profilesSampleRate: 1.0,
    });
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new SentryFilter(httpAdapter));
  }
  const username = config.get('database.username');
  const host = config.get('database.host');
  const password = config.get('database.password');
  const name = config.get('database.name');
  const isAtlas = config.get('database.atlas');
  const uri = `mongodb${
    isAtlas ? '+srv' : ''
  }://${username}:${password}@${host}/${name}?authSource=admin&retryWrites=true&w=majority`;

  const store = MongoStore.create({
    mongoUrl: uri,
    ttl: 20000,
  });

  const sessionHandler = session({
    secret: 'my-secret',
    saveUninitialized: true,
    resave: false,
    cookie: {
      httpOnly: true,
      secure: false, // TODO: Secure the cookie
    },
    store,
  });
  app.use(sessionHandler);
  const redisIoAdapter = new RedisIoAdapter(app, sessionHandler);
  await redisIoAdapter.connectToRedis(config);

  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(process.env.PORT || 3000);
}

await bootstrap();
