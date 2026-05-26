const { Queue, Worker } = require('bullmq');
const { Resend } = require('resend');
const IORedis = require('ioredis');
const logger = require('./logger');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const notificationQueue = new Queue('notifications', { connection });
const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder_key_replace_in_env');

const FROM = 'GameOn <notifications@gameon.app>';

// ── Email templates ────────────────────────────────────────────────────────────

function matchRequestEmail(toName, fromName, matchId) {
  return {
    subject: `${fromName} wants to play tennis with you`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#16a34a">New Match Request 🎾</h2>
        <p>Hey ${toName},</p>
        <p><strong>${fromName}</strong> has sent you a match request on GameOn.</p>
        <a href="${process.env.CLIENT_URL}/matches/${matchId}"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          View Request
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px">GameOn — Find your next match</p>
      </div>
    `,
  };
}

function matchAcceptedEmail(toName, opponentName, matchId, scheduledAt, courtName) {
  const date = scheduledAt ? new Date(scheduledAt).toLocaleString() : 'TBD';
  return {
    subject: `${opponentName} accepted your match request!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#16a34a">Match Confirmed ✅</h2>
        <p>Hey ${toName},</p>
        <p><strong>${opponentName}</strong> accepted your match request.</p>
        <p><strong>📅 When:</strong> ${date}</p>
        ${courtName ? `<p><strong>📍 Where:</strong> ${courtName}</p>` : ''}
        <a href="${process.env.CLIENT_URL}/matches/${matchId}"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          View Match
        </a>
      </div>
    `,
  };
}

function matchReminderEmail(toName, opponentName, matchId, scheduledAt, courtName) {
  const date = new Date(scheduledAt).toLocaleString();
  return {
    subject: `Reminder: Match with ${opponentName} in 2 hours`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#16a34a">Match Reminder ⏰</h2>
        <p>Hey ${toName},</p>
        <p>Your match with <strong>${opponentName}</strong> is in 2 hours.</p>
        <p><strong>📅 When:</strong> ${date}</p>
        ${courtName ? `<p><strong>📍 Where:</strong> ${courtName}</p>` : ''}
        <a href="${process.env.CLIENT_URL}/matches/${matchId}"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          View Match
        </a>
      </div>
    `,
  };
}

function scorePromptEmail(toName, opponentName, matchId) {
  return {
    subject: `How did your match with ${opponentName} go?`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#16a34a">Submit Your Score 🏆</h2>
        <p>Hey ${toName},</p>
        <p>Your match with <strong>${opponentName}</strong> should be done. Submit the score so your Elo updates!</p>
        <a href="${process.env.CLIENT_URL}/matches/${matchId}/score"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Submit Score
        </a>
      </div>
    `,
  };
}

function weeklyEloEmail(toName, currentElo, eloDelta) {
  const direction = eloDelta >= 0 ? 'increased' : 'decreased';
  const abs = Math.abs(eloDelta);
  const emoji = eloDelta >= 0 ? '📈' : '📉';
  return {
    subject: `Your weekly Elo update: ${eloDelta >= 0 ? '+' : ''}${eloDelta} points ${emoji}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#16a34a">Weekly Elo Update ${emoji}</h2>
        <p>Hey ${toName},</p>
        <p>Your rating <strong>${direction} by ${abs} points</strong> this week.</p>
        <p style="font-size:32px;font-weight:700;color:#16a34a">${currentElo}</p>
        <a href="${process.env.CLIENT_URL}/profile"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          View Profile
        </a>
      </div>
    `,
  };
}

// ── Queue helpers ──────────────────────────────────────────────────────────────

async function enqueueNotification(type, data, opts = {}) {
  await notificationQueue.add(type, { type, ...data }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
    ...opts,
  });
}

// Convenience methods used by route handlers
const notifications = {
  matchRequest: (to, from, matchId) =>
    enqueueNotification('match_request', { to, from, matchId }),

  matchAccepted: (to, opponentName, matchId, scheduledAt, courtName) =>
    enqueueNotification('match_accepted', { to, opponentName, matchId, scheduledAt, courtName }),

  matchReminder: (to, opponentName, matchId, scheduledAt, courtName) =>
    enqueueNotification('match_reminder', { to, opponentName, matchId, scheduledAt, courtName },
      { delay: Math.max(0, new Date(scheduledAt) - Date.now() - 2 * 60 * 60 * 1000) }),

  scorePrompt: (to, opponentName, matchId, scheduledAt) =>
    enqueueNotification('score_prompt', { to, opponentName, matchId },
      { delay: Math.max(0, new Date(scheduledAt) - Date.now() + 2 * 60 * 60 * 1000) }),

  weeklyElo: (to, currentElo, eloDelta) =>
    enqueueNotification('weekly_elo', { to, currentElo, eloDelta }),
};

module.exports = { notificationQueue, connection, notifications, resend, FROM,
  matchRequestEmail, matchAcceptedEmail, matchReminderEmail, scorePromptEmail, weeklyEloEmail };
