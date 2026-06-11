import { Test, TestingModule } from '@nestjs/testing';
import { IosController } from './ios.controller.js';

import uaChromeFixtures from '../__fixtures__/user-agent.chrome.fixtures.json';

describe('IosController', () => {
  let controller: IosController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IosController],
    }).compile();

    controller = module.get<IosController>(IosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return apple-app-site-association with webcredentials', () => {
    uaChromeFixtures.forEach((ua) => {
      const result = controller.appleAppSiteAssociation({
        headers: { 'user-agent': ua } as unknown as Headers,
      } as Request);
      expect(result).toHaveProperty('webcredentials');
      expect(Array.isArray(result.webcredentials.apps)).toBe(true);
      expect(result.webcredentials.apps.length).toBeGreaterThan(0);
    });
  });

  it('should include the IOS_APP_ID in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.IOS_APP_ID = '6ZUHDS4HVT.com.example.dev';
    const result = controller.appleAppSiteAssociation({
      headers: { 'user-agent': uaChromeFixtures[0] } as unknown as Headers,
    } as Request);
    expect(result.webcredentials.apps).toContain('6ZUHDS4HVT.com.example.dev');
    process.env.NODE_ENV = 'test';
    delete process.env.IOS_APP_ID;
  });
});
