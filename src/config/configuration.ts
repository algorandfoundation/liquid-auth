export default () => ({
  env: process.env.NODE_ENV || 'development',
  timeout: 30 * 1000 * 60,
  rpName: process.env.RP_NAME || 'Algorand Foundation FIDO2 Server',
  hostname: process.env.HOSTNAME || process.env.VERCEL_URL || 'localhost',
  origin: process.env.ORIGIN || 'http://localhost',
  //TODO: Android App
  android: { hash: process.env.ANDROID_SHA256HASH || '' },
  database: {
    host: process.env.DB_HOST || 'localhost:27017',
    username: process.env.DB_USERNAME || 'algorand',
    password: process.env.DB_PASSWORD || 'algorand',
    name: process.env.DB_NAME || 'fido',
  },
});
