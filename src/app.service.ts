import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import base64url from 'base64url';
import UAParser from 'ua-parser-js';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  getOrigin(ua: string): string {
    let origin: string;
    const parser = new UAParser(ua);
    // Android origin
    if (parser.getOS().name.includes('Android')) {
      // TODO: Ensure we are encoding properly for android
      const octArray: unknown = this.configService
        .get<{ hash: string }>('android')
        .hash.split(':')
        .map((h) => parseInt(h, 16));
      const androidHash = base64url.encode(octArray as Buffer);
      origin = `android:apk-key-hash:${androidHash}`;
    }
    // Web Origin
    else {
      origin = this.configService.get<string>('origin');
    }

    return origin;
  }
}
