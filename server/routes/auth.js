const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { analytics } = require('../services/analytics');
const { DEFAULT_ELO } = require('../services/elo');
const logger = require('../services/logger');

/**
 * POST /api/auth/sync
 * Called after Clerk login to create/update user in MongoDB.
 * Requires a verified Clerk Bearer token — req.clerkId comes from that
 * token (server/middleware/requireAuth.js#verifyClerkToken), NOT from the
 * request body, so a client can never create/overwrite a record for a
 * clerkId it doesn't actually hold a valid session for.
 * Body: { email, name, avatar }
 */
router.post('/sync', async (req, res, next) => {
  try {
    const clerkId = req.clerkId; // set by verifyClerkToken middleware
    const { email, name, avatar } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'email and name are required' });
    }

    let user = await User.findOne({ clerkId });
    const isNew = !user;

    if (isNew) {
      // Optional bootstrap: promote known admin emails on first sync.
      // Set ADMIN_EMAILS in .env as a comma-separated list.
      const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
      const role = adminEmails.includes(String(email).toLowerCase()) ? 'admin' : 'user';

      user = await User.create({
        clerkId, email, name, avatar,
        role,
        elo: DEFAULT_ELO,
        weeklyEloSnapshot: DEFAULT_ELO,
      });
      analytics.signupCompleted(clerkId, { email, name });
      logger.info(`New user created: ${email}`);
    } else {
      user.name   = name;
      user.avatar = avatar || user.avatar;
      user.lastSeen = new Date();
      await user.save();
    }

    res.json({ user, isNew });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/onboard
 * Set location, preferences after signup. clerkId comes from the
 * verified token, same as /sync above.
 */
router.post('/onboard', async (req, res, next) => {
  try {
    const clerkId = req.clerkId;
    const { zipCode, city, lat, lng, preferredSurface, preferredDistance, availability } = req.body;

    const user = await User.findOneAndUpdate(
      { clerkId },
      {
        zipCode, city,
        location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        preferredSurface: preferredSurface || 'any',
        preferredDistance: preferredDistance || 10,
        availability: availability || [],
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
