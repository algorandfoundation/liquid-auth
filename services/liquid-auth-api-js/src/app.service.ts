import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import base64url from 'base64url';
import UAParser from 'ua-parser-js';
import assetLinks from '../assetlinks.json' assert { type: 'json' }
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
      const statement = assetLinks.filter((al)=>al.target.package_name === pkgName)
      // TODO: better lookup for fingerprints using Headers
      const octArray: unknown = statement[0].target.sha256_cert_fingerprints[0].split(':')
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
