const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const logger = require('./utils/logger');
const { validateEnv } = require('./utils/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

validateEnv();

const app = express();
app.set('trust proxy', 1);

// Security & perf
app.use(helmet());
app.use(compression());

// CORS allowlist
const allowed = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // mobile / curl
      if (allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
  })
);

// Body parsers (limit size)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

// Rate limiting on /api
const windowMin = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX || '300', 10);
app.use(
  '/api',
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please slow down.' }
  })
);

// Static uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor-clinic';
mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    logger.info('MongoDB connected');
    app.locals.dbConnected = true;
  })
  .catch((err) => {
    logger.warn(`MongoDB not available: ${err.message}`);
    logger.warn('Running in DEMO MODE — using in-memory dummy data. No data will persist.');
    app.locals.dbConnected = false;
  });

// Demo mode routes (MUST come BEFORE real routes so they intercept when DB is unavailable)
app.use('/api', require('./routes/demo'));

// Real routes (used when MongoDB IS connected)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/labtests', require('./routes/labtests'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/ai', require('./routes/ai'));

// Health check (DB-aware)
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const demoMode = !app.locals.dbConnected;
  res.status(200).json({
    status: demoMode ? 'DEMO_MODE' : (dbState === 1 ? 'OK' : 'DEGRADED'),
    db: demoMode ? 'not-connected (demo mode active)' : (states[dbState] || 'unknown'),
    demoMode,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 + central error handler (must be last)
app.use(notFound);
app.use(errorHandler);

// Daily cron - 8 AM
cron.schedule('0 8 * * *', async () => {
  try {
    const { sendAppointmentReminders } = require('./services/whatsappService');
    await sendAppointmentReminders();
  } catch (err) {
    logger.error(`Reminder cron failed: ${err.message}`);
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => logger.info(`Doctor Clinic API running on port ${PORT}`));

// Graceful shutdown
function shutdown(signal) {
  logger.info(`${signal} received, shutting down...`);
  server.close(() => {
    mongoose.connection.close(false).then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
