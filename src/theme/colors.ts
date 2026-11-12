/**
 * LifeLens AI – Design Token: Colors
 *
 * Warm, minimal, premium aesthetic inspired by soft editorial & wellness design:
 * Soft off-white canvas, light cream/beige surfaces, warm peach accents,
 * and dark charcoal typography.
 */

export const colors = {
  // ─── Canvas & Backgrounds ─────────────────────────────────────
  background: '#F7F1EF',              // Soft warm off-white canvas
  backgroundAlt: '#F1E8E3',           // Light cream & subtle beige surface
  canvas: '#F7F1EF',                  // Canvas background alias
  secondary: '#F1E8E3',               // Secondary surface alias

  // ─── Surfaces (Layered Elevation) ─────────────────────────────
  surface: '#FFFFFF',                 // Primary card surface
  surfaceElevated: '#FFFFFF',         // Elevated cards with subtle border
  surfaceSoft: '#F1E8E3',             // Subtle beige inset / pill track
  surfaceSecondary: '#F1E8E3',        // Secondary card background
  surfaceHigh: '#FFFFFF',             // Inset card surface
  surfaceTop: '#FFFFFF',              // Floating modals & sheets
  surfaceLight: '#FFFFFF',
  surfaceLightSecondary: '#F1E8E3',

  // ─── Typography (Dark Charcoal & Warm Grays) ──────────────────
  text: '#242424',                    // Primary text alias
  textPrimary: '#242424',             // Dark charcoal for high contrast
  textSecondary: '#85817F',           // Warm medium gray
  textMuted: '#AAA4A1',               // Soft muted gray
  textDark: '#242424',
  textDarkSecondary: '#85817F',
  textLight: '#FFFFFF',
  primaryText: '#242424',             // Primary typography alias
  secondaryText: '#85817F',           // Secondary typography alias

  // ─── Primary & Action Accents ──────────────────────────────────
  primary: '#FFB98E',                 // Warm peach primary accent
  primaryAccent: '#FFB98E',
  secondaryAccent: '#F5DCA6',         // Warm pastel yellow
  darkButton: '#66300C',              // Signature warm dark button
  darkButtonText: '#FFFFFF',
  primaryMuted: 'rgba(255, 185, 142, 0.18)',
  primaryGlow: 'rgba(255, 185, 142, 0.35)',

  // ─── Pastel Accent Cards & Pills ──────────────────────────────
  softGreen: '#DCE9B5',               // Soft wellness green
  softPink: '#F4D9E9',                // Soft pastel pink
  softPurple: '#E8DDF4',              // Soft lilac / lavender
  softYellow: '#F5DCA6',              // Warm buttercup yellow
  softPeach: '#FFEDE1',               // Inset warm peach
  softCream: '#FBF7F4',               // Lightest cream tint

  // ─── Semantic Accents ──────────────────────────────────────────
  green: '#8FB351',                   // Movement / health
  success: '#8FB351',                 // Success alias
  blue: '#6E93B3',                    // Deep work / focus
  cyan: '#6CAFA3',                    // Sleep / circadian
  orange: '#FFB98E',                  // Expenses / finance
  warning: '#E5C070',                 // Warning alias
  yellow: '#E5C070',                  // Streaks / warnings
  red: '#E05D5D',                     // Errors / limits
  error: '#E05D5D',
  purple: '#A692BF',                  // Insights / reflections

  // ─── Borders & Dividers ────────────────────────────────────────
  border: '#EEE8E5',                  // Subtle off-white card border
  borderLight: '#F5EFEA',             // Featherlight divider

  // ─── Utilities ─────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  shadowWarm: 'rgba(102, 48, 12, 0.08)',
  overlay: 'rgba(36, 36, 36, 0.45)', // Soft darkened backdrop
} as const;

export type ColorToken = keyof typeof colors;
