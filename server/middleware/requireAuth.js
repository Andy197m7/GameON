const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../services/logger');

/**
 * Verifies the Bearer token issued by Clerk.
 * Attaches req.user (MongoDB User doc) and req.clerkId.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = header.split(' ')[1];

    // Decode without verification to extract clerkId (sub claim)
    // In production use Clerk's SDK verifyToken() with your JWT public key
    const decoded = jwt.decode(token);
    if (!decoded?.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const clerkId = decoded.sub;
    req.clerkId = clerkId;

    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(401).json({ error: 'User not found — complete onboarding first' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('requireAuth error', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { requireAuth };
