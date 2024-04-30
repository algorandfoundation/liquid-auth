import configFactory from './configuration.js';
import configFixture from '../__fixtures__/configuration.fixture.json';
describe('configuration', () => {
  it('should return the configuration', () => {
    delete process.env.NODE_ENV;
    expect(configFactory()).toEqual({
      ...configFixture,
      env: 'development',
      hostname: 'localhost',
      origin: 'http://localhost',
    });
    process.env.NODE_ENV = 'test';
  });
});
