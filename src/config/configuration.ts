export default () => ({
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI:
    process.env.MONGODB_URI ||
    'mongodb+srv://algorand:<password>@fido2.ccg8rav.mongodb.net/?retryWrites=true&w=majority',
  database: {
    host: process.env.DB_HOST || 'localhost:27017',
    username: process.env.DB_USERNAME || 'algorand',
    password: process.env.DB_PASSWORD || 'algorand',
    name: process.env.DB_NAME || 'fido',
  },
});
