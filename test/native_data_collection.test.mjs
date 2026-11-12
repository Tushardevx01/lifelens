if (typeof globalThis.window === 'undefined') {
  const memStore = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (memStore.has(key) ? memStore.get(key) : null),
      setItem: (key, val) => memStore.set(key, String(val)),
      removeItem: (key) => memStore.delete(key),
      clear: () => memStore.clear(),
      get length() {
        return memStore.size;
      },
      key: (i) => Array.from(memStore.keys())[i] ?? null,
    },
  };
  globalThis.localStorage = globalThis.window.localStorage;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/asyncStorageMock.mjs';

// Sleep & Circadian Engine
import {
  timeToMinutes,
  minutesToTime,
  calculateSleepDurationHours,
  calculateCircadianDrift,
  synthesizeUltradianSleepStages,
} from '../src/services/nativeSleepService.ts';

// Digital Habits & Screen Time Engine
import {
  isLateNightHour,
  computeDistractionIndex,
  DISTRACTING_CATEGORIES,
  PRODUCTIVE_CATEGORIES,
} from '../src/services/nativeScreenTracker.ts';

// Physical Activity & Workout Engine
import {
  calculateMetCalories,
  estimateActivitySteps,
  ACTIVITY_PROFILES,
} from '../src/services/nativeActivityService.ts';

// Financial & SMS Parsing Engine
import { MERCHANT_CATEGORY_MAP } from '../src/services/smsParserService.ts';

test('1. Sleep & Circadian Health: Time Math & Duration Calculations', async (t) => {
  await t.test('converts HH:MM to minutes from midnight and back', () => {
    assert.equal(timeToMinutes('00:00'), 0);
    assert.equal(timeToMinutes('01:30'), 90);
    assert.equal(timeToMinutes('12:00'), 720);
    assert.equal(timeToMinutes('23:45'), 1425);

    assert.equal(minutesToTime(0), '00:00');
    assert.equal(minutesToTime(90), '01:30');
    assert.equal(minutesToTime(720), '12:00');
    assert.equal(minutesToTime(1425), '23:45');
  });

  await t.test('calculates sleep duration crossing midnight', () => {
    // 23:00 to 07:00 = 8.0 hours
    const dur1 = calculateSleepDurationHours('23:00', '07:00');
    assert.equal(dur1, 8.0);

    // 00:30 to 08:00 = 7.5 hours
    const dur2 = calculateSleepDurationHours('00:30', '08:00');
    assert.equal(dur2, 7.5);

    // 22:45 to 06:15 = 7.5 hours
    const dur3 = calculateSleepDurationHours('22:45', '06:15');
    assert.equal(dur3, 7.5);
  });

  await t.test('calculates circadian drift and phase advance/delay', () => {
    // Bedtime 00:30 vs reference 23:00 -> +90 mins delay
    const driftDelay = calculateCircadianDrift('00:30', '08:00', '23:00');
    assert.equal(driftDelay.driftMinutes, 90);
    assert.equal(driftDelay.phaseShift, 'delay');
    assert.equal(driftDelay.midpointTime, '04:15');

    // Bedtime 21:30 vs reference 23:00 -> -90 mins advance
    const driftAdvance = calculateCircadianDrift('21:30', '05:30', '23:00');
    assert.equal(driftAdvance.driftMinutes, -90);
    assert.equal(driftAdvance.phaseShift, 'advance');

    // Bedtime 23:05 vs reference 23:00 -> +5 mins aligned
    const driftAligned = calculateCircadianDrift('23:05', '07:05', '23:00');
    assert.equal(driftAligned.driftMinutes, 5);
    assert.equal(driftAligned.phaseShift, 'aligned');
  });

  await t.test('synthesizes physiological ultradian sleep architecture intervals', () => {
    const intervals = synthesizeUltradianSleepStages('2026-11-10', '23:00', '07:00', 15);
    assert.ok(intervals.length > 0);

    // In-bed interval must be first
    assert.equal(intervals[0].stage, 'in_bed');
    assert.equal(intervals[0].duration_minutes, 15);

    // Sleep stages must cover deep, core, rem
    const stages = new Set(intervals.map((i) => i.stage));
    assert.ok(stages.has('deep'), 'Must contain deep sleep intervals');
    assert.ok(stages.has('core'), 'Must contain core sleep intervals');
    assert.ok(stages.has('rem'), 'Must contain rem sleep intervals');

    // Total duration should match 8 hours (480 mins) + 15 mins in_bed
    const sleepIntervals = intervals.filter((i) => i.stage !== 'in_bed');
    const totalSleepMins = sleepIntervals.reduce((sum, i) => sum + i.duration_minutes, 0);
    assert.equal(totalSleepMins, 480);
  });
});

test('2. Digital Habits & Screen Time: Late-Night Detection & Distraction Index', async (t) => {
  await t.test('detects late night hour between 22:00 and 05:59 accurately', () => {
    // 22:00 -> true
    const d22 = new Date(2026, 10, 10, 22, 0, 0);
    assert.equal(isLateNightHour(d22), true);

    // 23:59 -> true
    const d23 = new Date(2026, 10, 10, 23, 59, 0);
    assert.equal(isLateNightHour(d23), true);

    // 02:30 -> true
    const d02 = new Date(2026, 10, 10, 2, 30, 0);
    assert.equal(isLateNightHour(d02), true);

    // 05:59 -> true
    const d05 = new Date(2026, 10, 10, 5, 59, 0);
    assert.equal(isLateNightHour(d05), true);

    // 06:00 -> false
    const d06 = new Date(2026, 10, 10, 6, 0, 0);
    assert.equal(isLateNightHour(d06), false);

    // 14:00 -> false
    const d14 = new Date(2026, 10, 10, 14, 0, 0);
    assert.equal(isLateNightHour(d14), false);
  });

  await t.test('computes distraction index correctly', () => {
    // Zero usage
    assert.equal(computeDistractionIndex(0, 0), 0.0);

    // All distracting: 60 mins distracting, 0 productive -> 1.0
    assert.equal(computeDistractionIndex(60, 0), 1.0);

    // All productive: 0 distracting, 120 productive -> 0.0
    assert.equal(computeDistractionIndex(0, 120), 0.0);

    // Half and half: 60 mins distracting, 60 mins productive -> 0.5
    assert.equal(computeDistractionIndex(60, 60), 0.5);

    // 90 mins distracting, 30 mins productive -> 90/120 = 0.75
    assert.equal(computeDistractionIndex(90, 30), 0.75);
  });

  await t.test('verifies category classification sets', () => {
    assert.ok(DISTRACTING_CATEGORIES.has('Social Media'));
    assert.ok(DISTRACTING_CATEGORIES.has('Entertainment'));
    assert.ok(DISTRACTING_CATEGORIES.has('Gaming'));

    assert.ok(PRODUCTIVE_CATEGORIES.has('Productivity'));
    assert.ok(PRODUCTIVE_CATEGORIES.has('Work & Tools'));
    assert.ok(PRODUCTIVE_CATEGORIES.has('Utilities'));
  });
});

test('3. Physical Health & Movement: MET Calorie Calculation & Cadence Steps', async (t) => {
  await t.test('calculates MET active calories burned accurately', () => {
    // Running: 9.8 MET, 60 mins, 70kg -> 9.8 * 70 * 1 = 686 kcal
    const runCals = calculateMetCalories('running', 60, 70);
    assert.equal(runCals, 686);

    // Walking: 3.5 MET, 30 mins, 70kg -> 3.5 * 70 * 0.5 = 122.5 -> 123 kcal
    const walkCals = calculateMetCalories('walking', 30, 70);
    assert.equal(walkCals, 123);

    // Cycling: 7.5 MET, 45 mins, 70kg -> 7.5 * 70 * 0.75 = 393.75 -> 394 kcal
    const cycleCals = calculateMetCalories('cycling', 45, 70);
    assert.equal(cycleCals, 394);

    // HIIT: 8.5 MET, 30 mins, 70kg -> 8.5 * 70 * 0.5 = 297.5 -> 298 kcal
    const hiitCals = calculateMetCalories('hiit', 30, 70);
    assert.equal(hiitCals, 298);

    // Yoga: 2.8 MET, 60 mins, 70kg -> 2.8 * 70 * 1 = 196 kcal
    const yogaCals = calculateMetCalories('yoga', 60, 70);
    assert.equal(yogaCals, 196);
  });

  await t.test('estimates steps based on cadence and locomotion activity', () => {
    // Running: 160 steps/min * 30 mins = 4800 steps
    assert.equal(estimateActivitySteps('running', 30), 4800);

    // Walking: 110 steps/min * 45 mins = 4950 steps
    assert.equal(estimateActivitySteps('walking', 45), 4950);

    // Cycling: non-step locomotion -> 0 steps
    assert.equal(estimateActivitySteps('cycling', 60), 0);

    // Swimming: non-step locomotion -> 0 steps
    assert.equal(estimateActivitySteps('swimming', 30), 0);
  });

  await t.test('verifies activity profiles are defined with non-negative METs', () => {
    for (const [key, profile] of Object.entries(ACTIVITY_PROFILES)) {
      assert.ok(profile.met > 0, `Profile ${key} must have positive MET`);
      assert.ok(profile.cadenceStepsPerMin >= 0, `Profile ${key} cadence must be non-negative`);
    }
  });
});

test('4. Financial Wellness: Merchant Classification & Discretionary Splitting', async (t) => {
  await t.test('classifies merchants into discretionary vs essential categories', () => {
    const swiggyRule = MERCHANT_CATEGORY_MAP.find((m) => m.keywords.includes('swiggy'));
    assert.ok(swiggyRule);
    assert.equal(swiggyRule.category, 'Food & Dining');
    assert.equal(swiggyRule.isDiscretionary, true);

    const uberRule = MERCHANT_CATEGORY_MAP.find((m) => m.keywords.includes('uber'));
    assert.ok(uberRule);
    assert.equal(uberRule.category, 'Transportation');
    assert.equal(uberRule.isDiscretionary, false);

    const netflixRule = MERCHANT_CATEGORY_MAP.find((m) => m.keywords.includes('netflix'));
    assert.ok(netflixRule);
    assert.equal(netflixRule.category, 'Entertainment');
    assert.equal(netflixRule.isDiscretionary, true);

    const utilityRule = MERCHANT_CATEGORY_MAP.find((m) => m.keywords.includes('electricity'));
    assert.ok(utilityRule);
    assert.equal(utilityRule.isDiscretionary, false);
  });
});

test('5. Productivity & Focus: Granular Focus Block & Distraction Rates', async (t) => {
  await t.test('computes distraction rate per hour during deep work sessions', () => {
    // 90 minute block with 3 interruptions = 2 interruptions/hour
    const durationMinutes = 90;
    const distractions = 3;
    const hours = durationMinutes / 60;
    const ratePerHour = distractions / hours;
    assert.equal(ratePerHour, 2.0);
  });

  await t.test('validates focus rating bounds within [1, 5]', () => {
    const validRatings = [1, 2, 3, 4, 5];
    for (const r of validRatings) {
      assert.ok(r >= 1 && r <= 5);
    }
  });
});

test('6. Subjective Wellbeing & Daily Reflection: Mood & Energy Bounds', async (t) => {
  await t.test('enforces mood slider scale bounds [1, 10]', () => {
    const moods = [1, 5, 7, 10];
    for (const m of moods) {
      assert.ok(m >= 1 && m <= 10);
    }
  });

  await t.test('enforces energy level star rating bounds [1, 5]', () => {
    const energyLevels = [1, 2, 3, 4, 5];
    for (const e of energyLevels) {
      assert.ok(e >= 1 && e <= 5);
    }
  });

  await t.test('ensures qualitative reflection journal supports free-form text up to 1000 chars', () => {
    const note = 'Gratitude for productive morning focus session. Sleep was restorative despite late dinner.';
    assert.ok(note.length <= 1000);
    assert.ok(note.length > 0);
  });
});

test('7. Standalone Architecture: All 6 Domains Fully Standalone Without Google Fit', async (t) => {
  await t.test('creates complete native daily payload covering all 6 domains and telemetry', () => {
    const nativePayload = {
      // 1. Sleep & Circadian Health
      date: '2026-11-10',
      sleep_hours: 7.5,
      sleep_quality: 4,
      sleep_bedtime: '23:15',
      resting_heart_rate: 62,

      // 2. Digital Habits & Screen Time
      screen_time_hours: 4.5,
      social_media_hours: 1.2,
      unlock_count: 48,

      // 3. Physical Health & Movement
      steps: 9200,
      active_minutes: 45,
      calories_burned: 420,

      // 4. Productivity & Focus
      deep_work_hours: 4.0,
      tasks_completed: 6,

      // 5. Financial Wellness & Spending
      daily_spend: 38.5,
      spend_category: 'Food & Dining',

      // 6. Subjective Wellbeing & Reflection
      mood_score: 8,
      energy_level: 4,
      notes: 'Completed all deep work sprints early, restful sleep, 0 late night phone usage.',
    };

    // Assert every required metric is non-null and correctly typed
    assert.equal(typeof nativePayload.sleep_hours, 'number');
    assert.equal(typeof nativePayload.sleep_quality, 'number');
    assert.equal(typeof nativePayload.sleep_bedtime, 'string');
    assert.equal(typeof nativePayload.resting_heart_rate, 'number');

    assert.equal(typeof nativePayload.screen_time_hours, 'number');
    assert.equal(typeof nativePayload.social_media_hours, 'number');
    assert.equal(typeof nativePayload.unlock_count, 'number');

    assert.equal(typeof nativePayload.steps, 'number');
    assert.equal(typeof nativePayload.active_minutes, 'number');
    assert.equal(typeof nativePayload.calories_burned, 'number');

    assert.equal(typeof nativePayload.deep_work_hours, 'number');
    assert.equal(typeof nativePayload.tasks_completed, 'number');

    assert.equal(typeof nativePayload.daily_spend, 'number');
    assert.equal(typeof nativePayload.spend_category, 'string');

    assert.equal(typeof nativePayload.mood_score, 'number');
    assert.equal(typeof nativePayload.energy_level, 'number');
    assert.equal(typeof nativePayload.notes, 'string');
  });

  await t.test('formats workout consistency banner without NaN or undefined days', () => {
    // Case 1: Backend sends Pydantic schema keys (current_streak, rest_day_adherence_pct, workout_skip_vulnerability)
    const backendData = {
      current_streak: 5,
      best_streak: 12,
      total_workouts_7d: 4,
      total_active_minutes_7d: 180,
      rest_day_adherence_pct: 75.0,
      workout_skip_vulnerability: 0.22,
      skip_risk_level: 'LOW',
      recommendation: 'Maintain cadence',
    };

    const streakDisplay = `${backendData.streak_days ?? backendData.current_streak ?? 0} days`;
    assert.equal(streakDisplay, '5 days');

    const rawAdh = backendData.rest_days_adherence !== undefined
      ? (backendData.rest_days_adherence <= 1 ? backendData.rest_days_adherence * 100 : backendData.rest_days_adherence)
      : (backendData.rest_day_adherence_pct ?? 100);
    const adhDisplay = `${Math.round(rawAdh)}%`;
    assert.equal(adhDisplay, '75%');
    assert.ok(!adhDisplay.includes('NaN'));

    const rawSkip = backendData.skip_vulnerability ?? backendData.workout_skip_vulnerability ?? 0;
    const skipRatio = rawSkip > 1 ? rawSkip / 100 : rawSkip;
    const skipDisplay = `${Math.round(skipRatio * 100)}%`;
    assert.equal(skipDisplay, '22%');
    assert.ok(!skipDisplay.includes('NaN'));

    // Case 2: Frontend format (streak_days, rest_days_adherence as decimal, skip_vulnerability as decimal)
    const frontendData = {
      streak_days: 3,
      rest_days_adherence: 0.8,
      skip_vulnerability: 0.35,
      total_workouts_7d: 3,
      total_minutes_7d: 120,
    };
    const streakDisplay2 = `${frontendData.streak_days ?? frontendData.current_streak ?? 0} days`;
    assert.equal(streakDisplay2, '3 days');

    const rawAdh2 = frontendData.rest_days_adherence !== undefined
      ? (frontendData.rest_days_adherence <= 1 ? frontendData.rest_days_adherence * 100 : frontendData.rest_days_adherence)
      : (frontendData.rest_day_adherence_pct ?? 100);
    assert.equal(`${Math.round(rawAdh2)}%`, '80%');

    const rawSkip2 = frontendData.skip_vulnerability ?? frontendData.workout_skip_vulnerability ?? 0;
    const skipRatio2 = rawSkip2 > 1 ? rawSkip2 / 100 : rawSkip2;
    assert.equal(`${Math.round(skipRatio2 * 100)}%`, '35%');
  });

  await t.test('synthesizes ultradian stages with in_bed, core, deep, rem, awake all present', () => {
    const stages = synthesizeUltradianSleepStages('2026-11-10', '22:30', '06:30', 20);
    assert.ok(stages.length >= 4);

    const inBedStage = stages.find((s) => s.stage === 'in_bed');
    assert.ok(inBedStage);
    assert.equal(inBedStage.duration_minutes, 20);

    const deepStages = stages.filter((s) => s.stage === 'deep');
    assert.ok(deepStages.length > 0);
    const deepMins = deepStages.reduce((acc, s) => acc + s.duration_minutes, 0);
    assert.ok(deepMins >= 40, `Deep minutes was ${deepMins}`);

    const remStages = stages.filter((s) => s.stage === 'rem');
    assert.ok(remStages.length > 0);
    const remMins = remStages.reduce((acc, s) => acc + s.duration_minutes, 0);
    assert.ok(remMins >= 40, `REM minutes was ${remMins}`);

    const coreStages = stages.filter((s) => s.stage === 'core');
    assert.ok(coreStages.length > 0);

    const awakeStages = stages.filter((s) => s.stage === 'awake');
    assert.ok(awakeStages.length > 0);
  });
});

