const isProduction = process.env.VERCEL_ENV === 'production';
const isVercel = typeof process.env.VERCEL === 'string';

const hostname = isVercel
  ? isProduction
    ? 'nest-fido2.vercel.app'
    : process.env.VERCEL_URL.replace('https://', '')
  : 'localhost';

const origin = isProduction
  ? 'https://' + hostname
  : isVercel
  ? process.env.VERCEL_URL
  : 'http://localhost';

export default () => ({
  env: process.env.NODE_ENV || 'development',
  timeout: 30 * 1000 * 60,
  rpName: process.env.RP_NAME || 'Algorand Foundation FIDO2 Server',
  hostname,
  origin,
  android: { hash: process.env.ANDROID_SHA256HASH || '' },
  database: {
    host: process.env.DB_HOST || 'localhost:27017',
    username: process.env.DB_USERNAME || 'algorand',
    password: process.env.DB_PASSWORD || 'algorand',
    name: process.env.DB_NAME || 'fido',
  },
});
