const { verifyToken } = require('@clerk/backend');
const User = require('../models/User');
const logger = require('../services/logger');

/**
 * Pulls the Bearer token off the request and verifies it against Clerk
 * (signature + expiry + issuer, via @clerk/backend). On success attaches
 * req.clerkId. Does NOT require a matching MongoDB user — use this on
 * routes that need to know "who is this Clerk user" before a DB record
 * necessarily exists yet (e.g. first-time sync/onboarding).
 */
async function verifyClerkToken(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = header.split(' ')[1];

    if (!process.env.CLERK_SECRET_KEY) {
      logger.error('CLERK_SECRET_KEY is not set — refusing to verify tokens');
      return res.status(500).json({ error: 'Server auth misconfigured' });
    }

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      // Restrict to your own origins so a token issued for a different
      // Clerk-backed app of yours can't be replayed against this API.
      authorizedParties: (process.env.CLIENT_URL || 'http://localhost:5173').split(','),
    });

    if (!payload?.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.clerkId = payload.sub;
    req.clerkClaims = payload;
    next();
  } catch (err) {
    logger.warn('Token verification failed', { message: err.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Full auth check: verifies the Clerk token AND requires a matching
 * MongoDB User document (i.e. the user has completed /api/auth/sync).
 * Attaches req.user (Mongo doc) and req.clerkId.
 */
async function requireAuth(req, res, next) {
  verifyClerkToken(req, res, async (err) => {
    if (err) return next(err);
    if (res.headersSent) return; // verifyClerkToken already responded (401/500)

    try {
      const user = await User.findOne({ clerkId: req.clerkId });
      if (!user) {
        return res.status(401).json({ error: 'User not found — complete onboarding first' });
      }
      req.user = user;
      next();
    } catch (err) {
      logger.error('requireAuth error', err);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  });
}

/**
 * Gate for admin-only routes. Must run AFTER requireAuth (needs req.user).
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, verifyClerkToken, requireAdmin };
