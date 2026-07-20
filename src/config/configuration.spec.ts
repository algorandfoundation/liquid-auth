import configFactory from './configuration.js';
import configFixture from '../__fixtures__/configuration.fixture.json';

const productionSessionSecret = '01-session-5d8d64ad-e164-4cd4-987a';
const productionPairingSecret = '02-pairing-6296c079-f29c-4715-803b';

describe('configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSessionSecret = process.env.SESSION_SECRET;
  const originalPairingCredentialSecret = process.env.PAIRING_CREDENTIAL_SECRET;

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SESSION_SECRET;
    delete process.env.PAIRING_CREDENTIAL_SECRET;
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSessionSecret;
    if (originalPairingCredentialSecret === undefined) {
      delete process.env.PAIRING_CREDENTIAL_SECRET;
    } else {
      process.env.PAIRING_CREDENTIAL_SECRET = originalPairingCredentialSecret;
    }
  });

  it('should return the configuration', () => {
    expect(configFactory()).toEqual({
      ...configFixture,
      env: 'development',
      hostname: 'localhost',
      origin: 'http://localhost',
      enableIndexPage: false,
    });
  });

  it('keeps development and tests usable without configured secrets', () => {
    process.env.NODE_ENV = 'test';

    expect(configFactory()).toEqual(
      expect.objectContaining({
        session: expect.objectContaining({ secret: 'secret' }),
        pairing: expect.objectContaining({ credentialSecret: 'secret' }),
      }),
    );
  });

  it.each([
    ['missing', undefined],
    ['placeholder', 'replace-me'],
    ['template-placeholder', '<FIRST_INDEPENDENT_RANDOM_VALUE>'],
    ['weak', 'short-production-secret'],
    ['low-diversity', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
  ])('rejects a %s production session secret', (_label, value) => {
    process.env.NODE_ENV = 'production';
    if (value !== undefined) process.env.SESSION_SECRET = value;
    process.env.PAIRING_CREDENTIAL_SECRET = productionPairingSecret;

    expect(() => configFactory()).toThrow(/SESSION_SECRET/);
  });

  it.each([
    ['missing', undefined],
    ['placeholder', 'replace-with-an-independent-secret'],
    ['template-placeholder', '<SECOND_INDEPENDENT_RANDOM_VALUE>'],
    ['weak', 'short-production-secret'],
    ['low-diversity', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
  ])('rejects a %s production pairing secret', (_label, value) => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = productionSessionSecret;
    if (value !== undefined) process.env.PAIRING_CREDENTIAL_SECRET = value;

    expect(() => configFactory()).toThrow(/PAIRING_CREDENTIAL_SECRET/);
  });

  it('requires independent production session and pairing secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = productionSessionSecret;
    process.env.PAIRING_CREDENTIAL_SECRET = productionSessionSecret;

    expect(() => configFactory()).toThrow(
      'PAIRING_CREDENTIAL_SECRET must be independent from SESSION_SECRET',
    );
  });

  it('accepts strong, independent production secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = productionSessionSecret;
    process.env.PAIRING_CREDENTIAL_SECRET = productionPairingSecret;

    expect(configFactory()).toEqual(
      expect.objectContaining({
        env: 'production',
        session: expect.objectContaining({
          secret: productionSessionSecret,
        }),
        pairing: expect.objectContaining({
          credentialSecret: productionPairingSecret,
        }),
      }),
    );
  });
});
