import { mongooseModuleFactory } from './app.module.js';

import databaseConfigFixtures from './__fixtures__/configuration.database.fixtures.json';
import { ConfigService } from '@nestjs/config';

describe('AppModule', () => {
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
