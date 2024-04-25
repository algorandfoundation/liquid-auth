import { Test, TestingModule } from '@nestjs/testing';
import { AndroidController } from './android.controller.js';

import assetLinksInstance from '../../assetlinks.json';
import uaChromeFixtures from '../__fixtures__/user-agent.chrome.fixtures.json';

const assetLinks = [...assetLinksInstance];

describe('AndroidController', () => {
  let controller: AndroidController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AndroidController],
    }).compile();

    controller = module.get<AndroidController>(AndroidController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return asset links', () => {
    uaChromeFixtures.forEach((ua) => {
      expect(
        controller.assetLinks({
          headers: { 'user-agent': ua } as unknown as Headers,
        } as Request),
      ).toEqual(assetLinks);
    });
  });
  it('should return developer web links', () => {
    process.env.NODE_ENV = 'development';
    process.env.ORIGIN = 'http://unkown.site';
    // @ts-ignore
    expect(
      controller.assetLinks({ headers: { 'user-agent': uaChromeFixtures[0] } as unknown as Headers } as Request),
    ).toEqual([
      ...assetLinks,
      {
        relation: [
          'delegate_permission/common.handle_all_urls',
          'delegate_permission/common.get_login_creds',
        ],
        target: {
          namespace: 'web',
          site: 'http://unkown.site',
        },
      },
    ]);
    process.env.NODE_ENV = 'test';
    delete process.env.ORIGIN;
  });
  it('should return developer android links', () => {
    process.env.NODE_ENV = 'development';
    process.env.ANDROID_PACKAGENAME = 'com.example';
    process.env.ANDROID_SHA256HASH =
      'AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA';
    // @ts-ignore
    expect(
      controller.assetLinks({ headers: { 'user-agent': uaChromeFixtures[0] } as unknown as Headers } as Request),
    ).toEqual([
      ...assetLinks,
      {
        relation: [
          'delegate_permission/common.handle_all_urls',
          'delegate_permission/common.get_login_creds',
        ],
        target: {
          namespace: 'android_app',
          package_name: 'com.example',
          sha256_cert_fingerprints: [
            'AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA',
          ],
        },
      },
    ]);
    process.env.NODE_ENV = 'test';
    delete process.env.ANDROID_PACKAGENAME;
    delete process.env.ANDROID_SHA256HASH;
  });
});
