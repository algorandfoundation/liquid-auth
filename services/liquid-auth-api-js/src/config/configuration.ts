export default () => ({
  env: process.env.NODE_ENV || 'development',
  timeout: 30 * 1000 * 60,
  rpName: process.env.RP_NAME || 'Algorand Foundation FIDO2 Server',
  hostname: process.env.HOSTNAME,
  origin: process.env.ORIGIN,
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
    atlas: process.env.DB_ATLAS === 'true'
  },
  algod: {
    token: process.env.ALGOD_TOKEN || '',
    server: process.env.ALGOD_SERVER || 'localhost',
    port: process.env.ALGOD_PORT || '4001',
  }
});
