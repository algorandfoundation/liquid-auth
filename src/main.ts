import 'dotenv/config';
import { resolve } from 'node:path';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import hbs from 'hbs';
import MongoStore from 'connect-mongo';
import { AppModule } from './app.module.js';
import { RedisIoAdapter } from './adapters/redis-io.adapter.js';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { SentryFilter } from './sentry.filter.js';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });
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

  const config = app.get<ConfigService>(ConfigService);
  const env = config.get('env');

  const username = config.get('database.username');
  const host = config.get('database.host');
  const password = config.get('database.password');
  const name = config.get('database.name');

  const uri = `mongodb${
    env !== 'development' ? '+srv' : ''
  }://${username}:${password}@${host}/${name}?authSource=admin&retryWrites=true&w=majority`;
  console.log(uri);
  const store = MongoStore.create({
    mongoUrl: uri,
    ttl: 20000,
  });

  const sessionHandler = session({
    secret: 'my-secret',
    resave: false,
    saveUninitialized: false,
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

  app.useStaticAssets(resolve('./src/public'));
  app.setBaseViewsDir(resolve('./src/views'));
  app.setViewEngine('html');
  app.engine('html', hbs.__express);
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
