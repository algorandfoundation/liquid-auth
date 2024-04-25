import { AppModule, mongooseModuleFactory } from './app.module.js';
import { Test } from '@nestjs/testing';
import { SignalsGateway } from './signals/signals.gateway.js';
import { AttestationModule } from './attestation/attestation.module.js';
import { AssertionModule } from './assertion/assertion.module.js';

//@ts-ignore, required for jest
import databaseConfigFixtures from './__fixtures__/configuration.database.fixtures.json' assert { type: 'json' };
import { ConfigService } from '@nestjs/config';

describe('AppModule', () => {
  it.skip('should create the module', async () => {
    //TODO: Implement in-memory database for testing
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
    expect(module.get(SignalsGateway)).toBeInstanceOf(SignalsGateway);
    expect(module.get(AttestationModule)).toBeInstanceOf(AttestationModule);
    expect(module.get(AssertionModule)).toBeInstanceOf(AssertionModule);
  });
  it('should create the module with atlas configuration', async () => {
    databaseConfigFixtures.forEach((fixture) => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(fixture),
      } as unknown as ConfigService;
      const { name, host, username, password, atlas } = fixture;
      const prefix = atlas ? 'mongodb+srv' : 'mongodb';
      expect(mongooseModuleFactory(mockConfigService)).toEqual({
        uri: `${prefix}://${username}:${password}@${host}/${name}?authSource=admin&retryWrites=true&w=majority`,
      });
    });
  });
});
