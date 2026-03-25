import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

describe('AppController', () => {
  let appController: AppController;
  let configService: ConfigService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'enableIndexPage') {
                return true;
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    configService = app.get<ConfigService>(ConfigService);
  });

  describe('root', () => {
    it('should return the message when enableIndexPage is true', () => {
      expect(appController.root()).toEqual({
        message: 'TODO: inject variables into service',
      });
    });

    it('should throw NotFoundException when enableIndexPage is false', () => {
      jest.spyOn(configService, 'get').mockReturnValue(false);
      expect(() => appController.root()).toThrow(NotFoundException);
    });
  });
});
