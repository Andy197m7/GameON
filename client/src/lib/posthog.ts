import posthog from 'posthog-js';

let initialized = false;

/**
 * Initializes PostHog once, at app startup. Safe to call multiple times —
 * only the first call actually inits the client. No-ops if
 * VITE_POSTHOG_KEY isn't set (e.g. local dev without an account yet), so
 * the app never crashes for missing analytics config.
 */
export function initPosthog() {
  if (initialized) return;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) {
    console.warn('VITE_POSTHOG_KEY not set — analytics disabled');
    return;
  }

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
  });
  initialized = true;
}

export { posthog };
