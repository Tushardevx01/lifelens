/**
 * LifeLens AI – Design Token: Typography
 *
 * Premium editorial hierarchy:
 *   Display → Hero Number → Screen Title → Section Title →
 *   Card Title → Body → Secondary → Micro Label
 *
 * All sizes are expressed in px (React Native logical pixels).
 * Prefer these named styles; do not hard-code font sizes in components.
 */

import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  // ─── Display ────────────────────────────────────────────────
  display: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -2,
    lineHeight: 60,
  },

  // ─── Hero Number (Life Score, big metric) ───────────────────
  heroNumber: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1.5,
    lineHeight: 56,
  },

  heroUnit: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: -0.3,
  },

  // ─── Metric Number (smaller cards) ──────────────────────────
  metricNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },

  metricNumberSm: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },

  // ─── Screen / Section Titles ─────────────────────────────────
  h1: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 36,
  },

  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 28,
  },

  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 24,
  },

  // ─── Card Title ───────────────────────────────────────────────
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },

  // ─── Body ─────────────────────────────────────────────────────
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 22,
  },

  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 19,
  },

  // ─── Secondary / Support ─────────────────────────────────────
  secondary: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
    lineHeight: 18,
  },

  // ─── Labels ───────────────────────────────────────────────────
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },

  labelCaps: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },

  // ─── Micro Label ──────────────────────────────────────────────
  caption: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    lineHeight: 14,
    letterSpacing: 0.3,
  },

  // ─── Buttons ──────────────────────────────────────────────────
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  buttonLarge: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
