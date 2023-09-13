import { Module } from '@nestjs/common';
import { AttestationController } from './attestation.controller.js';
import { AttestationService } from './attestation.service.js';
import { AuthService } from '../auth/auth.service.js';
import { ConfigModule } from '@nestjs/config';
import { AppService } from '../app.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/auth.schema.js';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AttestationController],
  providers: [AppService, AuthService, AttestationService],
})
export class AttestationModule {}
