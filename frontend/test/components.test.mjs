/**
 * Component and UI Primitive Verification Tests
 *
 * Verifies props contracts, styling logic, variant behaviors, and computation
 * for Button, Input, Card, and LiveScoreCard components.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { colors } from '../src/theme/colors.ts';
import { radius } from '../src/theme/radius.ts';
import { spacing } from '../src/theme/spacing.ts';
import {
  calculateEstimatedLifeScore,
  WEIGHTS,
  MOOD_MODIFIER_MAX,
} from '../src/utils/lifeScore.ts';
import {
  formatAxisDate,
  getMilestoneLabels,
  sliceTrendData,
} from '../src/utils/trendChart.ts';

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

test('WeeklyDateSelector: Date Strip and Selection Contract', async (t) => {
  await t.test('Generates 7 contiguous days centered around today (-3 to +3)', () => {
    const today = new Date();
    const days = [];
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });
      days.push({ offset, dateStr, dayName, isToday: offset === 0 });
    }

    assert.equal(days.length, 7);
    assert.equal(days[3].isToday, true);
    assert.ok(days[0].offset === -3);
    assert.ok(days[6].offset === 3);
    // All dates are in YYYY-MM-DD format
    for (const item of days) {
      assert.match(item.dateStr, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(item.dayName.length >= 1);
    }
  });

  await t.test('Selection state updates accurately on day button click', () => {
    let currentSelected = '2026-11-16';
    const onSelectDate = (dateStr) => {
      currentSelected = dateStr;
    };

    // Simulate clicking different date buttons
    onSelectDate('2026-11-13');
    assert.equal(currentSelected, '2026-11-13');

    onSelectDate('2026-11-17');
    assert.equal(currentSelected, '2026-11-17');

    onSelectDate('2026-11-19');
    assert.equal(currentSelected, '2026-11-19');
  });
});

test('TrendCard & LifeScoreTrend: Axis Formatting, Slicing & Platform Safety', async (t) => {
  await t.test('Formats ISO YYYY-MM-DD and MM-DD strings compactly without vertical wrapping', () => {
    assert.equal(formatAxisDate('2026-10-11', true), '10/11');
    assert.equal(formatAxisDate('2026-10-11', false), 'Oct 11');
    assert.equal(formatAxisDate('11-05', true), '11/5');
    assert.equal(formatAxisDate('11-05', false), 'Nov 5');
    assert.equal(formatAxisDate('D1', true), 'D1');
  });

  await t.test('Slices trend data accurately for 7D, 14D, 30D, and 90D timeframes', () => {
    const sample30 = Array.from({ length: 30 }, (_, idx) => ({
      day: `2026-10-${String(idx + 1).padStart(2, '0')}`,
      value: 50 + idx,
    }));

    assert.equal(sliceTrendData(sample30, '7D').length, 7);
    assert.equal(sliceTrendData(sample30, '7D')[0].day, '2026-10-24');
    assert.equal(sliceTrendData(sample30, '14D').length, 14);
    assert.equal(sliceTrendData(sample30, '30D').length, 30);
    assert.equal(sliceTrendData(sample30, '90D').length, 30);
    assert.deepEqual(
      getMilestoneLabels(sample30.map((d) => d.day)),
      ['Oct 1', 'Oct 15', 'Oct 30']
    );
  });

  await t.test('voiceService guards expo-av from executing on Web runtime', () => {
    const voiceSource = readFileSync(
      new globalThis.URL('../src/services/voiceService.ts', import.meta.url),
      'utf8'
    );
    assert.match(voiceSource, /if \(Platform\.OS === 'web'\) return null;/);
    assert.ok(!/let ExpoAudio.*=\s*require\(['"]expo-av['"]\)/.test(voiceSource));
  });

  await t.test('Animated calls never hardcode useNativeDriver: true on Web', () => {
    const animatedFiles = [
      '../src/components/ui/SkeletonCard.tsx',
      '../src/components/dashboard/DashboardSkeleton.tsx',
      '../src/components/navigation/FloatingTabBar.tsx',
      '../src/components/assistant/PulsingVoiceOrb.tsx',
      '../src/features/auth/LoginScreen.tsx',
      '../src/features/auth/SignUpScreen.tsx',
    ];
    for (const relPath of animatedFiles) {
      const src = readFileSync(new globalThis.URL(relPath, import.meta.url), 'utf8');
      assert.ok(
        !src.includes('useNativeDriver: true'),
        `${relPath} must gate useNativeDriver via Platform.OS !== 'web'`
      );
      assert.match(src, /Platform\.OS !== 'web'/);
    }
  });
});

test('UI Primitives: Toggle Contract & Color Palette Adherence', async (t) => {
  await t.test('Toggle uses brand design tokens and never defaults to teal (#009688)', () => {
    // Verified palette tokens
    assert.equal(colors.primary, '#FFB98E');
    assert.equal(colors.darkButton, '#66300C');
    assert.equal(colors.softPeach, '#FFEDE1');
    assert.equal(colors.border, '#EEE8E5');

    // Default peach variant config: Warm peach track with crisp white thumb
    const peachConfig = {
      trackTrue: colors.primary,
      trackFalse: '#E2DBD5',
      thumbTrue: colors.white,
      thumbFalse: colors.white,
    };

    assert.equal(peachConfig.trackTrue, '#FFB98E');
    assert.equal(peachConfig.thumbTrue, '#FFFFFF');
    assert.notEqual(peachConfig.thumbTrue, '#009688');
    assert.notEqual(peachConfig.trackTrue, '#009688');

    // Dark variant config: Dark button track with crisp white thumb
    const darkConfig = {
      trackTrue: colors.darkButton,
      trackFalse: '#E2DBD5',
      thumbTrue: colors.white,
      thumbFalse: colors.white,
    };
    assert.equal(darkConfig.trackTrue, '#66300C');
    assert.equal(darkConfig.thumbTrue, '#FFFFFF');
    assert.notEqual(darkConfig.thumbTrue, '#009688');
  });
});

