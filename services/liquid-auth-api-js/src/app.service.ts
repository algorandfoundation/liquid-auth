import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import UAParser from 'ua-parser-js';
import { toBase64URL } from '@liquid/core';

//@ts-ignore, required for jest
import assetLinks from '../assetlinks.json' assert { type: 'json' };

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(private configService: ConfigService) {}
  getOrigin(ua: string): string {
    let origin: string;
    const parser = new UAParser(ua);
    // Android APK origin
    if (
      parser.getOS().name.includes('Android') &&
      typeof parser.getBrowser().name !== 'string'
    ) {
      const pkgName = ua.split('/')[0];
      console.log(pkgName);
      const statement = assetLinks.filter(
        (al) => al?.target?.package_name === pkgName,
      );
      // TODO: better lookup for fingerprints using Headers
      const octArray: number[] = statement[0].target.sha256_cert_fingerprints[0]
        .split(':')
        .map((h) => parseInt(h, 16));
      const androidHash = toBase64URL(new Uint8Array(octArray));
      origin = `android:apk-key-hash:${androidHash}`;
    }
    // Web Origin
    else {
      origin = this.configService.get<string>('origin');
    }

    return origin;
  }
}
