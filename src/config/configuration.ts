import * as process from 'node:process';

const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;

function productionSecret(name: string): string {
  const value = process.env[name];
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  if (!value?.trim()) {
    throw new Error(`${name} must be explicitly configured in production`);
  }
  if (
    value.includes('<') ||
    value.includes('>') ||
    normalized === 'secret' ||
    normalized === 'password' ||
    normalized === 'default' ||
    normalized === 'development' ||
    normalized === 'test' ||
    normalized === 'session-secret' ||
    normalized === 'pairing-credential-secret' ||
    normalized?.includes('changeme') ||
    normalized?.includes('password') ||
    normalized?.includes('your-secret') ||
    normalized?.includes('example') ||
    normalized?.startsWith('replace-') ||
    normalized?.startsWith('change-me') ||
    normalized?.includes('placeholder')
  ) {
    throw new Error(`${name} must not use a placeholder value in production`);
  }
  if (
    value.length < MINIMUM_PRODUCTION_SECRET_LENGTH ||
    new Set(value).size < 8
  ) {
    throw new Error(
      `${name} must be a strong secret of at least ${MINIMUM_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  }
  return value;
}

function secrets(environment: string): {
  sessionSecret: string;
  pairingCredentialSecret: string;
} {
  if (environment !== 'production') {
    const sessionSecret = process.env.SESSION_SECRET || 'secret';
    return {
      sessionSecret,
      pairingCredentialSecret:
        process.env.PAIRING_CREDENTIAL_SECRET || sessionSecret,
    };
  }

  const sessionSecret = productionSecret('SESSION_SECRET');
  const pairingCredentialSecret = productionSecret('PAIRING_CREDENTIAL_SECRET');
  if (pairingCredentialSecret === sessionSecret) {
    throw new Error(
      'PAIRING_CREDENTIAL_SECRET must be independent from SESSION_SECRET in production',
    );
  }
  return { sessionSecret, pairingCredentialSecret };
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function corsOrigins(): string[] {
  const configured =
    process.env.CORS_ORIGINS || process.env.ORIGIN || 'http://localhost';
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default () => {
  const environment = process.env.NODE_ENV || 'development';
  const { sessionSecret, pairingCredentialSecret } = secrets(environment);

  return {
    env: environment,
    timeout: 30 * 1000 * 60,
    rpName: process.env.RP_NAME || 'Algorand Foundation FIDO2 Server',
    hostname: process.env.HOSTNAME || 'localhost',
    origin: process.env.ORIGIN || 'http://localhost',
    enableIndexPage: process.env.ENABLE_INDEX_PAGE === 'true',
    session: {
      secure: process.env.SESSION_SECURE === 'true',
      secret: sessionSecret,
      ttlSeconds: positiveInteger(process.env.SESSION_TTL_SECONDS, 20000),
      cookieMaxAgeMs: positiveInteger(
        process.env.SESSION_COOKIE_MAX_AGE_MS,
        20000 * 1000,
      ),
      sameSite: process.env.SESSION_SAME_SITE || 'lax',
      trustProxy: process.env.TRUST_PROXY === 'true',
    },
    cors: {
      origins: corsOrigins(),
    },
    pairing: {
      credentialSecret: pairingCredentialSecret,
      invitationTtlSeconds: positiveInteger(
        process.env.PAIRING_INVITATION_TTL_SECONDS,
        900,
      ),
    },
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD || '',
    },
    database: {
      host: process.env.DB_HOST || 'localhost:27017',
      username: process.env.DB_USERNAME || 'algorand',
      password: process.env.DB_PASSWORD || 'algorand',
      name: process.env.DB_NAME || 'fido',
      atlas: process.env.DB_ATLAS === 'true',
    },
    algod: {
      token: process.env.ALGOD_TOKEN || '',
      server: process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
      port: process.env.ALGOD_PORT || '443',
    },
  };
};
