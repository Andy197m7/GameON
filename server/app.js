const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const matchRoutes = require('./routes/matches');
const courtRoutes = require('./routes/courts');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');

const { errorHandler } = require('./middleware/errorHandler');
const { requireAuth, verifyClerkToken, requireAdmin } = require('./middleware/requireAuth');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Logging & parsing
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — no auth, no rate limit
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Routes
// /api/auth: token must be verified (real Clerk session) but no DB user
// exists yet on first sync, so this uses the lighter verifyClerkToken
// rather than the full requireAuth (which requires a DB user already).
app.use('/api/auth', verifyClerkToken, authRoutes);
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/matches', requireAuth, matchRoutes);
app.use('/api/courts', requireAuth, courtRoutes);
// Analytics is business/admin data (DAU/MAU, Elo distribution, etc.) —
// gated behind requireAdmin on top of requireAuth.
app.use('/api/analytics', requireAuth, requireAdmin, analyticsRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);

// Global error handler — must be last
app.use(errorHandler);

module.exports = app;
