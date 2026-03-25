import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UAParser } from 'ua-parser-js';
import { toBase64URL } from './encoding/index.js';

//@ts-ignore, required for jest
import assetLinks from '../assetlinks.json' with { type: 'json' };

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(private configService: ConfigService) {}
  getOrigin(ua: string): string | string[] {
    const parser = new UAParser(ua);
    // Android APK origin
    if (
      parser.getOS().name.includes('Android') &&
      typeof parser.getBrowser().name !== 'string'
    ) {
      const additionalEntries = [];
      if (process.env.NODE_ENV === 'development') {
        if (
          process.env.ANDROID_PACKAGENAME &&
          process.env.ANDROID_SHA256HASH &&
          !assetLinks.some(
            (al) =>
              al?.target?.package_name === process.env.ANDROID_PACKAGENAME,
          )
        ) {
          additionalEntries.push({
            target: {
              namespace: 'android_app',
              package_name: process.env.ANDROID_PACKAGENAME,
              sha256_cert_fingerprints: [process.env.ANDROID_SHA256HASH],
            },
          });
        }
      }

      const origins = [];
      for (const al of [...assetLinks, ...additionalEntries]) {
        if (al?.target?.namespace === 'android_app') {
          for (const fp of al.target.sha256_cert_fingerprints || []) {
            const octArray: number[] = fp
              .split(':')
              .map((h) => parseInt(h, 16));
            const androidHash = toBase64URL(new Uint8Array(octArray));
            origins.push(`android:apk-key-hash:${androidHash}`);
          }
        }
      }
      return Array.from(new Set(origins));
    }

    // Web Origin
    return this.configService.get<string>('origin');
  }
}
