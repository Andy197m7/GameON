const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { eloMatchBand } = require('../services/elo');
const { analytics } = require('../services/analytics');

/**
 * GET /api/users/me
 */
router.get('/me', async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (err) { next(err); }
});

/**
 * PUT /api/users/me
 * Update profile fields.
 */
router.put('/me', async (req, res, next) => {
  try {
    const allowed = ['name', 'avatar', 'phone', 'preferredSurface', 'preferredDistance',
                     'availability', 'isAvailable', 'city', 'zipCode'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.lat && req.body.lng) {
      updates.location = { type: 'Point', coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)] };
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) { next(err); }
});

/**
 * GET /api/users/:id
 * View another player's profile.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id)
      .select('-clerkId -email -phone -weeklyEloSnapshot');
    if (!target) return res.status(404).json({ error: 'User not found' });

    analytics.profileViewed(req.user.clerkId, {
      viewedUserId: target._id.toString(),
      viewedElo: target.elo,
    });

    res.json({ user: target });
  } catch (err) { next(err); }
});

/**
 * GET /api/users/search/nearby
 * Find available players near me within Elo band.
 * Query: ?attempt=0&maxDistanceMiles=10
 */
router.get('/search/nearby', async (req, res, next) => {
  try {
    const me = req.user;
    const attempt = parseInt(req.query.attempt) || 0;
    const maxMiles = parseFloat(req.query.maxDistanceMiles) || me.preferredDistance || 10;
    const maxMeters = maxMiles * 1609.34;
    const band = eloMatchBand(attempt);

    const players = await User.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: me.location.coordinates },
          distanceField: 'distanceMeters',
          maxDistance: maxMeters,
          spherical: true,
          query: {
            _id:         { $ne: me._id },
            isAvailable: true,
            elo:         { $gte: me.elo - band, $lte: me.elo + band },
          },
        },
      },
      { $limit: 20 },
      {
        $project: {
          name: 1, avatar: 1, elo: 1, matchesPlayed: 1, wins: 1, losses: 1,
          city: 1, preferredSurface: 1, distanceMeters: 1,
          // Anonymize to neighborhood — drop exact coordinates
          location: 0,
        },
      },
    ]);

    res.json({ players, band, attempt });
  } catch (err) { next(err); }
});

module.exports = router;
