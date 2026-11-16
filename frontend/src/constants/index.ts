/**
 * LifeLens Application Constants
 */

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@lifelens_access_token',
  USER_ID: '@lifelens_user_id',
  OFFLINE_QUEUE: '@lifelens_offline_queue',
  THEME_PREFERENCE: '@lifelens_theme_preference',
} as const;

export const TELEMETRY_DEFAULTS = {
  STEP_GOAL: 10000,
  SLEEP_HOURS_GOAL: 8.0,
  FOCUS_MINUTES_GOAL: 120,
  DAILY_SPEND_BASELINE: 50.0,
} as const;
