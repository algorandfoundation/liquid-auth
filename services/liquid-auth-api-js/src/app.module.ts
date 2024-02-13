import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AttestationModule } from './attestation/attestation.module.js';
import { AssertionModule } from './assertion/assertion.module.js';
import { AppService } from './app.service.js';
import { ConnectModule } from './connect/connect.module.js';
import configuration from './config/configuration.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const database = configService.get('database');
        const { host, username, password, name, atlas: isAtlas } = database;
        //mongodb+srv://algorand:<password>@fido2.ccg8rav.mongodb.net/?retryWrites=true&w=majority
        const uri = `mongodb${
          isAtlas ? '+srv' : ''
        }://${username}:${password}@${host}/${name}?authSource=admin&retryWrites=true&w=majority`;
        return {
          uri,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    AttestationModule,
    AssertionModule,
    ConnectModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
