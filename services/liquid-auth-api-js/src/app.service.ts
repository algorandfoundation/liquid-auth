import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import UAParser from 'ua-parser-js';
import { assetLinks } from './assetlinks';

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
      const pkgName = ua.split('/')[0]
      const statement = assetLinks.filter(
        (al) => al?.target?.package_name === pkgName,
      );
      // TODO: better lookup for fingerprints using Headers
      const octArray: unknown = statement[0].target.sha256_cert_fingerprints[0].split(':')
        .map((h) => parseInt(h, 16));
      const androidHash = (octArray as Buffer).toString('base64url');
      origin = `android:apk-key-hash:${androidHash}`;
    }
    // Web Origin
    else {
      origin = this.configService.get<string>('origin');
    }

    return origin;
  }
}
