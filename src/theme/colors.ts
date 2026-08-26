/**
 * LifeLens AI – Design Token: Colors
 *
 * Premium dark color system inspired by high-end fintech / productivity apps.
 * Use these tokens everywhere; never scatter raw hex values across components.
 */

export const colors = {
  // ─── Backgrounds ─────────────────────────────────────────────
  background: '#111214',
  backgroundAlt: '#1E2023',

  // ─── Surfaces (layered elevation system) ─────────────────────
  surface: '#292C31',
  surfaceElevated: '#3A3F45',
  surfaceSoft: '#242627',
  surfaceSecondary: '#1D1F20',   // alias used in Input / Card
  surfaceHigh: '#292B2C',
  surfaceTop: '#303233',
  surfaceLight: '#FFFFFF',
  surfaceLightSecondary: '#F5F6F8',

  // ─── Text ─────────────────────────────────────────────────────
  text: '#FFFFFF',               // alias – keeps old refs working
  textPrimary: '#FFFFFF',
  textSecondary: '#A8ACAE',
  textMuted: '#6F7476',
  textDark: '#1A1A1A',
  textDarkSecondary: '#6B7280',

  // ─── Primary accent (LifeLens green) ──────────────────────────
  primary: '#B8FF3D',
  primaryMuted: 'rgba(184, 255, 61, 0.10)',
  primaryGlow: 'rgba(184, 255, 61, 0.22)',

  // ─── Semantic accents ─────────────────────────────────────────
  green: '#42D77A',
  blue: '#5DA9FF',
  cyan: '#2DD4D8',
  orange: '#FFB347',
  yellow: '#FFC857',
  red: '#FF636D',
  purple: '#A77BFF',

  // ─── Borders ──────────────────────────────────────────────────
  border: '#2A2D2F',
  borderLight: '#363A3C',

  // ─── Error state (used in Input, Button) ──────────────────────
  error: '#FF636D',

  // ─── Utility ──────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',
} as const;

export type ColorToken = keyof typeof colors;
