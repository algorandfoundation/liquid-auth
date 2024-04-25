import configFactory from './configuration.js';
import configFixture from '../__fixtures__/configuration.fixture.json';
describe('configuration', () => {
  it('should return the configuration', () => {
    expect(configFactory()).toEqual(configFixture);
  });
});
