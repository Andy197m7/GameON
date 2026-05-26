const { PostHog } = require('posthog-node');
const logger = require('./logger');

let client;

function getPostHog() {
  if (!client) {
    client = new PostHog(process.env.POSTHOG_API_KEY || 'phc_placeholder', {
      host: 'https://app.posthog.com',
      flushAt: 20,
      flushInterval: 10000,
    });
  }
  return client;
}

/**
 * Track a server-side event.
 * @param {string} userId
 * @param {string} event
 * @param {object} properties
 */
function track(userId, event, properties = {}) {
  if (!process.env.POSTHOG_API_KEY) return; // skip in dev without key
  try {
    getPostHog().capture({ distinctId: userId, event, properties });
  } catch (err) {
    logger.warn('PostHog track error', err);
  }
}

// Named event helpers — enforces consistent event names across the codebase
const analytics = {
  matchRequested:  (userId, props) => track(userId, 'match_requested',  props),
  matchAccepted:   (userId, props) => track(userId, 'match_accepted',   props),
  matchDeclined:   (userId, props) => track(userId, 'match_declined',   props),
  matchCompleted:  (userId, props) => track(userId, 'match_completed',  props),
  messageSent:     (userId, props) => track(userId, 'message_sent',     props),
  profileViewed:   (userId, props) => track(userId, 'profile_viewed',   props),
  courtSelected:   (userId, props) => track(userId, 'court_selected',   props),
  eloUpdated:      (userId, props) => track(userId, 'elo_updated',      props),
  signupCompleted: (userId, props) => track(userId, 'signup_completed', props),
};

module.exports = { analytics };
