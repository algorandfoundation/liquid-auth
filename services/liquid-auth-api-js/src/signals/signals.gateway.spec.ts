import { Test, TestingModule } from '@nestjs/testing';
import { SignalsGateway } from './signals.gateway';

describe('SignalsGateway', () => {
  let gateway: SignalsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignalsGateway],
    }).compile();

    gateway = module.get<SignalsGateway>(SignalsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
