import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import configuration from './config/configuration.js';

// FIDO
import { AttestationModule } from './attestation/attestation.module.js';
import { AssertionModule } from './assertion/assertion.module.js';

import { AndroidController } from './android/android.controller.js';
// User Endpoints
import { AuthModule } from './auth/auth.module.js';

// Signals
import { SignalsModule } from './signals/signals.module.js';

export function mongooseModuleFactory(configService: ConfigService) {
  const database = configService.get('database');
  const { host, username, password, name, atlas: isAtlas } = database;
  const uri = `mongodb${
    isAtlas ? '+srv' : ''
  }://${username}:${password}@${host}/${name}?authSource=admin&retryWrites=true&w=majority`;
  return {
    uri,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: mongooseModuleFactory,
      inject: [ConfigService],
    }),
    AuthModule,
    AttestationModule,
    AssertionModule,
    SignalsModule,
  ],
  controllers: [AndroidController],
})
export class AppModule {}
