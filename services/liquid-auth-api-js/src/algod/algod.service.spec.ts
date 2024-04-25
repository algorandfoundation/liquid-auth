import { Test, TestingModule } from '@nestjs/testing';
import { AlgodService } from './algod.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';

//@ts-ignore, required for jest
import configurationFixture from '../__fixtures__/configuration.fixture.json';

describe('AlgodService', () => {
  let provider: AlgodService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => configurationFixture],
        }),
      ],
      providers: [ConfigService, AlgodService],
    }).compile();

    provider = module.get<AlgodService>(AlgodService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
