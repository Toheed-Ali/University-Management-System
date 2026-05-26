require('dotenv').config();
const crypto = require('crypto');

function requireEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3002),

  // MySQL Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'universityPortalDB',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  // MOSS
  mossId: process.env.MOSS_ID || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '4h'
};

if (!config.jwtSecret && config.env !== 'production') {
  config.jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET not set. Generated ephemeral secret for non-production environment.');
}

if (config.env === 'production' && !config.jwtSecret) {
  throw new Error('JWT_SECRET is required in production');
}

module.exports = { config, requireEnv };
