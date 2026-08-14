const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');

/**
 * GET /api/analytics/overview
 * Returns DAU/WAU/MAU, match funnel stats, Elo distribution.
 */
router.get('/overview', async (req, res, next) => {
  try {
    const now = new Date();
    const day7  = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const day30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const day1  = new Date(now - 24 * 60 * 60 * 1000);

    const [
      totalUsers, activeDay, activeWeek, activeMonth,
      totalMatches, pendingMatches, acceptedMatches, completedMatches,
      eloData,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastSeen: { $gte: day1 } }),
      User.countDocuments({ lastSeen: { $gte: day7 } }),
      User.countDocuments({ lastSeen: { $gte: day30 } }),
      Match.countDocuments(),
      Match.countDocuments({ status: 'pending' }),
      Match.countDocuments({ status: 'accepted' }),
      Match.countDocuments({ status: 'completed' }),
      User.aggregate([
        { $bucket: {
          groupBy: '$elo',
          boundaries: [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600],
          default: '1600+',
          output: { count: { $sum: 1 } },
        }},
      ]),
    ]);

    const acceptanceRate = totalMatches > 0
      ? Math.round(((acceptedMatches + completedMatches) / totalMatches) * 100)
      : 0;
    const completionRate = (acceptedMatches + completedMatches) > 0
      ? Math.round((completedMatches / (acceptedMatches + completedMatches)) * 100)
      : 0;

    res.json({
      users: { total: totalUsers, dau: activeDay, wau: activeWeek, mau: activeMonth },
      matches: { total: totalMatches, pending: pendingMatches, accepted: acceptedMatches, completed: completedMatches },
      funnel: { acceptanceRate, completionRate },
      eloDistribution: eloData,
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/analytics/matches/weekly
 * Match volume over the last 8 weeks.
 */
router.get('/matches/weekly', async (req, res, next) => {
  try {
    const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
    const data = await Match.aggregate([
      { $match: { createdAt: { $gte: eightWeeksAgo } } },
      { $group: {
        _id: { $week: '$createdAt' },
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
    ]);
    res.json({ data });
  } catch (err) { next(err); }
});

module.exports = router;
