const cron = require('node-cron');
const User = require('../models/User');
const { notifications } = require('../services/notifications');
const logger = require('../services/logger');

/**
 * Every Sunday at 9am — send weekly Elo summary to all users
 * who played at least 1 match in the past week.
 */
function startWeeklyEloJob() {
  cron.schedule('0 9 * * 0', async () => {
    logger.info('Running weekly Elo email job');
    try {
      const users = await User.find({ matchesPlayed: { $gt: 0 } })
        .select('name email elo weeklyEloSnapshot');

      let sent = 0;
      for (const user of users) {
        const delta = user.elo - (user.weeklyEloSnapshot || user.elo);
        await notifications.weeklyElo(
          { email: user.email, name: user.name },
          user.elo,
          delta
        );
        // Reset snapshot for next week
        await User.findByIdAndUpdate(user._id, { weeklyEloSnapshot: user.elo });
        sent++;
      }
      logger.info(`Weekly Elo emails queued: ${sent}`);
    } catch (err) {
      logger.error('Weekly Elo job failed', err);
    }
  });
  logger.info('Weekly Elo cron job registered');
}

module.exports = { startWeeklyEloJob };
