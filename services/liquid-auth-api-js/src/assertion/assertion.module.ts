import { Module } from '@nestjs/common';
import { AssertionService } from './assertion.service.js';
import { AssertionController } from './assertion.controller.js';
import { AuthService } from '../auth/auth.service.js';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/auth.schema.js';
import { AppService } from '../app.service.js';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
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
  providers: [AppService, AuthService, AssertionService],
  controllers: [AssertionController],
})
export class AssertionModule {}
