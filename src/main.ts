import 'dotenv/config';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import hbs from 'hbs';
import MongoStore from 'connect-mongo';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  const username = process.env.DB_USERNAME;
  const host = process.env.DB_HOST;
  const password = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME;

  const uri = `mongodb${
    process.env.NODE_ENV !== 'development' ? '+srv' : ''
  }://${username}:${password}@${host}/${name}?authSource=admin&retryWrites=true&w=majority`;

  const store = MongoStore.create({
    mongoUrl: uri,
    ttl: 20000,
  });

  app.use(
    session({
      secret: 'my-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // TODO: Secure the cookie
      },
      store,
    }),
  );
  app.useStaticAssets(resolve('./src/public'));
  app.setBaseViewsDir(resolve('./src/views'));
  app.setViewEngine('html');
  app.engine('html', hbs.__express);
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
