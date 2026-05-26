const express = require('express');
const router = express.Router();

// Placeholder — notifications are triggered by match routes.
// This route is for future user-facing notification preferences.

/**
 * GET /api/notifications/preferences
 */
router.get('/preferences', async (req, res) => {
  res.json({
    emailOnMatchRequest: true,
    emailOnMatchAccepted: true,
    emailReminders: true,
    weeklyEloSummary: true,
  });
});

module.exports = router;
