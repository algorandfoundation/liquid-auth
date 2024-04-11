import { Test, TestingModule } from '@nestjs/testing';
import { AndroidController } from './android.controller.js';

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
});
