require('dotenv').config();

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured in the environment.`);
  }
  return value;
}

const jwtSecret = required('JWT_SECRET');
if (Buffer.byteLength(jwtSecret, 'utf8') < 32 || /replace_me|changeme|your_secret|example/i.test(jwtSecret)) {
  throw new Error('JWT_SECRET must be generated secret material of at least 32 bytes.');
}

const mongoUri = required('MONGO_URI');
if (!/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) {
  throw new Error('MONGO_URI must use mongodb:// or mongodb+srv://.');
}

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

module.exports = Object.freeze({
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  host: process.env.HOST?.trim() || '127.0.0.1',
  jwtAudience: process.env.JWT_AUDIENCE?.trim() || 'db_mongo_jhuly_site',
  jwtIssuer: process.env.JWT_ISSUER?.trim() || 'db_mongo_jhuly_site',
  jwtSecret,
  mongoUri,
  port,
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
});
