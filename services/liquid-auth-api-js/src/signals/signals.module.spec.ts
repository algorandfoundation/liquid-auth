import { SignalsModule } from './signals.module';
import { SignalsGateway } from './signals.gateway';
import { Test } from '@nestjs/testing';

describe.skip('SignalsModule', () => {
  it('should create the module', async () => {
    const module = await Test.createTestingModule({
      imports: [SignalsModule],
    }).compile();

    expect(module).toBeDefined();
    expect(module.get(SignalsGateway)).toBeInstanceOf(SignalsGateway);
  });
});
