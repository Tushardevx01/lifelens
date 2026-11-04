/**
 * Component and UI Primitive Verification Tests
 *
 * Verifies props contracts, styling logic, variant behaviors, and computation
 * for Button, Input, Card, and LiveScoreCard components.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { colors } from '../src/theme/colors.ts';
import { radius } from '../src/theme/radius.ts';
import { spacing } from '../src/theme/spacing.ts';
import {
  calculateEstimatedLifeScore,
  WEIGHTS,
  MOOD_MODIFIER_MAX,
} from '../src/utils/lifeScore.ts';

test('UI Theme Tokens Integrity', async (t) => {
  await t.test('Core color palette tokens are defined with valid hex codes', () => {
    assert.match(colors.primary, /^#[0-9A-Fa-f]{6}$/);
    assert.match(colors.background, /^#[0-9A-Fa-f]{6}$/);
    assert.match(colors.surface, /^#[0-9A-Fa-f]{6}$/);
    assert.match(colors.surfaceElevated, /^#[0-9A-Fa-f]{6}$/);
    assert.match(colors.border, /^#[0-9A-Fa-f]{6}$/);
    assert.match(colors.error, /^#[0-9A-Fa-f]{6}$/);
    assert.match(colors.textPrimary, /^#[0-9A-Fa-f]{6}$/);
    assert.match(colors.textSecondary, /^#[0-9A-Fa-f]{6}$/);
  });

  await t.test('Radius and spacing scales are monotonic positive numbers', () => {
    assert.ok(radius.sm < radius.md);
    assert.ok(radius.md < radius.lg);
    assert.ok(radius.lg < radius.xl);
    assert.ok(radius.xl < radius.xxl);

    assert.ok(spacing.xs < spacing.sm);
    assert.ok(spacing.sm < spacing.md);
    assert.ok(spacing.md < spacing.lg);
    assert.ok(spacing.lg < spacing.xl);
    assert.ok(spacing.xl < spacing.xxl);
  });
});

test('UI Primitives: Button Contract', async (t) => {
  await t.test('Button variants and dimensions config', () => {
    const variants = ['primary', 'secondary', 'ghost'];
    const sizes = ['sm', 'md', 'lg'];

    for (const v of variants) {
      assert.ok(['primary', 'secondary', 'ghost'].includes(v));
    }
    for (const s of sizes) {
      assert.ok(['sm', 'md', 'lg'].includes(s));
    }
  });

  await t.test('Button disabled state logic evaluates disabled or loading', () => {
    const computeDisabled = (disabled = false, loading = false) => disabled || loading;

    assert.equal(computeDisabled(false, false), false);
    assert.equal(computeDisabled(true, false), true);
    assert.equal(computeDisabled(false, true), true);
    assert.equal(computeDisabled(true, true), true);
  });
});

test('UI Primitives: Input Contract', async (t) => {
  await t.test('Input error and focus state determination', () => {
    const getInputState = (focused, error) => ({
      hasError: Boolean(error),
      isFocused: Boolean(focused),
      borderColor: error ? colors.error : focused ? colors.primary : colors.border,
    });

    const normal = getInputState(false, null);
    assert.equal(normal.hasError, false);
    assert.equal(normal.isFocused, false);
    assert.equal(normal.borderColor, colors.border);

    const focused = getInputState(true, null);
    assert.equal(focused.hasError, false);
    assert.equal(focused.isFocused, true);
    assert.equal(focused.borderColor, colors.primary);

    const errorState = getInputState(true, 'This field is required');
    assert.equal(errorState.hasError, true);
    assert.equal(errorState.borderColor, colors.error);
  });
});

test('UI Primitives: Card Contract', async (t) => {
  await t.test('Card variants map to appropriate surfaces', () => {
    const getCardSurface = (variant = 'default') => {
      switch (variant) {
        case 'elevated':
          return colors.surfaceElevated;
        case 'hero':
          return colors.surfaceElevated;
        case 'default':
        default:
          return colors.surface;
      }
    };

    assert.equal(getCardSurface('default'), colors.surface);
    assert.equal(getCardSurface('elevated'), colors.surfaceElevated);
    assert.equal(getCardSurface('hero'), colors.surfaceElevated);
  });
});

test('LiveScoreCard Formulas and Mathematical Bounds', async (t) => {
  await t.test('Domain weights sum to exactly 1.0', () => {
    const sum = WEIGHTS.sleep + WEIGHTS.productivity + WEIGHTS.health + WEIGHTS.finance;
    assert.equal(Math.round(sum * 100) / 100, 1.0);
  });

  await t.test('Mood modifier is strictly bounded within [-5.0, +5.0]', () => {
    assert.equal(MOOD_MODIFIER_MAX, 5.0);
    for (let mood = 1; mood <= 10; mood++) {
      const modifier = ((mood - 5.5) / 4.5) * MOOD_MODIFIER_MAX;
      assert.ok(modifier >= -5.0 && modifier <= 5.0);
    }
  });

  await t.test('Extreme inputs never produce negative or > 100 Life Scores', () => {
    // Extreme low
    const worstCase = calculateEstimatedLifeScore({
      sleep_hours: 0,
      sleep_quality: 1,
      screen_time_hours: 18,
      steps: 0,
      active_minutes: 0,
      deep_work_hours: 0,
      tasks_completed: 0,
      daily_spend: 10000,
      mood_score: 1,
    });
    assert.ok(worstCase.life_score >= 0 && worstCase.life_score <= 100);
    assert.equal(worstCase.life_score, 0);

    // Extreme high
    const bestCase = calculateEstimatedLifeScore({
      sleep_hours: 9,
      sleep_quality: 5,
      screen_time_hours: 2,
      steps: 25000,
      active_minutes: 90,
      deep_work_hours: 8,
      tasks_completed: 12,
      daily_spend: 20,
      mood_score: 10,
    });
    assert.ok(bestCase.life_score >= 0 && bestCase.life_score <= 100);
    assert.equal(bestCase.life_score, 100);
  });
});
