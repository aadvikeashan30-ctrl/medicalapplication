const logger = require('./logger');

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    logger.warn('====================================================================');
    logger.warn(`Missing env vars: ${missing.join(', ')}`);
    logger.warn('Running in DEMO MODE — you can log in with demo@docclinic.com / demo1234');
    logger.warn('To use real data, set these in backend/.env and restart.');
    logger.warn('====================================================================');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    logger.warn('JWT_SECRET is short (<16 chars). Use a long random string in production.');
  }
}

module.exports = { validateEnv };
