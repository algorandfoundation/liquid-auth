import algosdk from 'algosdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlgodService extends algosdk.Algodv2 {
  constructor(configService: ConfigService) {
    const token = configService.get('algod.token') || '';
    const server = configService.get('algod.server') || 'https://testnet-api.algonode.cloud';
    const port = configService.get('algod.port') || '';
    super(token, server, port);
  }
}
