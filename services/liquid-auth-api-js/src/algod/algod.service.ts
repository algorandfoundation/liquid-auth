import algosdk from 'algosdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlgodService extends algosdk.Algodv2 {
  constructor(private configService: ConfigService) {
    const token = configService.get('algod.token') || '';
    const server = configService.get('algod.server');
    const port = configService.get('algod.port');
    super(token, server, port);
  }
}

