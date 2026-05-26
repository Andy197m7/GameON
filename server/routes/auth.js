const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { analytics } = require('../services/analytics');
const { DEFAULT_ELO } = require('../services/elo');
const logger = require('../services/logger');

/**
 * POST /api/auth/sync
 * Called after Clerk login to create/update user in MongoDB.
 * Body: { clerkId, email, name, avatar }
 */
router.post('/sync', async (req, res, next) => {
  try {
    const { clerkId, email, name, avatar } = req.body;
    if (!clerkId || !email || !name) {
      return res.status(400).json({ error: 'clerkId, email, and name are required' });
    }

    let user = await User.findOne({ clerkId });
    const isNew = !user;

    if (isNew) {
      user = await User.create({
        clerkId, email, name, avatar,
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
 * Set location, preferences after signup.
 */
router.post('/onboard', async (req, res, next) => {
  try {
    const { clerkId, zipCode, city, lat, lng, preferredSurface, preferredDistance, availability } = req.body;
    if (!clerkId) return res.status(400).json({ error: 'clerkId required' });

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
