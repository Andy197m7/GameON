require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { Resend } = require('resend');
const mongoose = require('mongoose');
const logger = require('../services/logger');
const {
  matchRequestEmail, matchAcceptedEmail, matchReminderEmail,
  scorePromptEmail, weeklyEloEmail, FROM,
} = require('../services/notifications');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const resend = new Resend(process.env.RESEND_API_KEY);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gameon')
  .then(() => logger.info('Worker: MongoDB connected'));

const worker = new Worker('notifications', async (job) => {
  const { type, to, from, matchId, opponentName, scheduledAt, courtName, currentElo, eloDelta } = job.data;

  logger.info(`Processing notification: ${type} for ${to?.email}`);

  let template;
  switch (type) {
    case 'match_request':
      template = matchRequestEmail(to.name, from, matchId);
      break;
    case 'match_accepted':
      template = matchAcceptedEmail(to.name, opponentName, matchId, scheduledAt, courtName);
      break;
    case 'match_reminder':
      template = matchReminderEmail(to.name, opponentName, matchId, scheduledAt, courtName);
      break;
    case 'score_prompt':
      template = scorePromptEmail(to.name, opponentName, matchId);
      break;
    case 'weekly_elo':
      template = weeklyEloEmail(to.name, currentElo, eloDelta);
      break;
    default:
      logger.warn(`Unknown notification type: ${type}`);
      return;
  }

  if (!process.env.RESEND_API_KEY) {
    logger.warn(`[DEV] Would send "${template.subject}" to ${to.email}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: to.email,
    subject: template.subject,
    html: template.html,
  });

  logger.info(`Email sent: ${type} → ${to.email}`);
}, { connection, concurrency: 5 });

worker.on('completed', (job) => logger.debug(`Job ${job.id} completed`));
worker.on('failed', (job, err) => logger.error(`Job ${job.id} failed`, err));

logger.info('Notification worker started');
