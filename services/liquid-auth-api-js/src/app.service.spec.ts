import { Test, TestingModule } from '@nestjs/testing';

//@ts-ignore, required for jest
import uaChromeFixtures from './__fixtures__/user-agent.chrome.fixtures.json' assert { type: 'json' };
//@ts-ignore, required for jest
import uaAndroidFixtures from './__fixtures__/user-agent.android.fixtures.json' assert { type: 'json' };
//@ts-ignore, required for jest
import configurationFixture from './__fixtures__/configuration.fixture.json' assert { type: 'json' };

import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';

jest.mock(
  '../assetlinks.json',
  () => {
    return [
      {
        relation: [
          'delegate_permission/common.handle_all_urls',
          'delegate_permission/common.get_login_creds',
        ],
        target: {
          namespace: 'web',
          site: 'https://nest-authentication-api.onrender.com',
        },
      },
      ...uaAndroidFixtures.map((ua) => {
        return {
          relation: [
            'delegate_permission/common.handle_all_urls',
            'delegate_permission/common.get_login_creds',
          ],
          target: {
            namespace: 'android_app',
            package_name: ua.split('/')[0],
            sha256_cert_fingerprints: [
              'AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA',
            ],
          },
        };
      }),
    ];
  },
  { virtual: true },
);

describe('AppService', () => {
  let provider: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => configurationFixture],
        }),
      ],
      providers: [ConfigService, AppService],
    }).compile();

    provider = module.get<AppService>(AppService);
  });

  it('should return the configured origin when it is from chrome', () => {
    uaChromeFixtures.forEach((ua) => {
      expect(provider.getOrigin(ua)).toEqual(configurationFixture.origin);
    });
  });
  it('should return an android origin when it is from an app', () => {
    uaAndroidFixtures.forEach((ua) => {
      expect(provider.getOrigin(ua)).toEqual(
        'android:apk-key-hash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqo',
      );
    });
  });
});
