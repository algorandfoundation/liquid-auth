import { Test, TestingModule } from '@nestjs/testing';
import { AssertionService } from './assertion.service.js';
import { ConfigService } from '@nestjs/config';
import { AppService } from '../app.service.js';

describe('AssertionService', () => {
  let provider: AssertionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService, AppService, AssertionService],
    }).compile();

    provider = module.get<AssertionService>(AssertionService);
  });
  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
