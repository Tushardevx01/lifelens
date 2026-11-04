/**
 * Central app configuration.
 * EXPO_PUBLIC_* variables are inlined at build time by Expo.
 * Set EXPO_PUBLIC_API_URL in your .env file.
 */
export const CONFIG = {
  APP_NAME: 'LifeLens',
  VERSION: '1.0.0',
  /**
   * Base URL for the FastAPI backend.
   * Falls back to localhost:8000 for local development.
   */
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
} as const;
