import { Module } from '@nestjs/common';
import { AssertionService } from './assertion.service.js';
import { AssertionController } from './assertion.controller.js';
import { AuthService } from '../auth/auth.service.js';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/auth.schema.js';
import { AppService } from '../app.service.js';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [AppService, AuthService, AssertionService],
  controllers: [AssertionController],
})
export class AssertionModule {}
