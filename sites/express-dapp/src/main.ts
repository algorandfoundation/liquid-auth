import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

// Application
import { AppModule, RedisIoAdapter } from '@liquid/auth-api';

// Session
import session from 'express-session';
import MongoStore from 'connect-mongo';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });
  const config = app.get<ConfigService>(ConfigService);
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Liquid Dapp')
    .setDescription('Authenticated Dapp API')
    .setVersion('1.0')
    .addCookieAuth('connect.sid')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
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
    resave: true,
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
  app.useStaticAssets(join(__dirname, '../../dapp-ui/dist'));
  app.setBaseViewsDir(join(__dirname, '../../dapp-ui/dist'));
  app.setViewEngine('hbs');

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
