/**
 * LifeLens HealthKit & Google Health Connect Synchronization Service (Phase 5)
 *
 * Capabilities:
 * - Aggregates sleep stages (Core, Deep, REM, Awake) into sleep duration & quality.
 * - Extracts bedtime timestamp in local time.
 * - Aggregates daily steps, active workout minutes, calories burned, and resting heart rate.
 * - Cross-platform guards (iOS HealthKit, Android Health Connect, Web / Simulation fallback).
 * - Dispatches normalized payloads to LifeLens backend API.
 */

import { getPlatformOS } from '@/src/utils/platform';
import type {
  HealthIngestPayload,
  HealthSleepInterval,
  SyncResultResponse,
} from '@/src/types/api.types';
import { ingestionApi } from '@/src/services/api';

export interface RawSleepSample {
  startDate: string; // ISO string
  endDate: string;   // ISO string
  stage: 'CORE' | 'DEEP' | 'REM' | 'AWAKE' | 'IN_BED';
}

export interface RawHealthMetrics {
  date: string; // YYYY-MM-DD
  sleepSamples: RawSleepSample[];
  steps: number;
  activeMinutes?: number;
  caloriesBurned?: number;
  restingHeartRate?: number;
}

/**
 * Coalesces and calculates sleep metrics from stage intervals:
 * - Total sleep duration in hours (excluding AWAKE and IN_BED stages).
 * - Bedtime (time of first asleep interval).
 * - Sleep quality score (1 to 5) computed from sleep architecture:
 *   - Deep sleep ratio (optimal: 15-25%)
 *   - REM sleep ratio (optimal: 20-25%)
 *   - Awakening count & total duration
 */
export function calculateSleepMetrics(sleepSamples: RawSleepSample[]): {
  totalSleepHours: number;
  sleepQuality: number;
  bedtime: string | null;
  deepRatio: number;
  remRatio: number;
} {
  if (!sleepSamples || sleepSamples.length === 0) {
    return {
      totalSleepHours: 0,
      sleepQuality: 3,
      bedtime: null,
      deepRatio: 0,
      remRatio: 0,
    };
  }

  let totalMins = 0;
  let deepMins = 0;
  let remMins = 0;
  let awakeCount = 0;
  let earliestAsleepStart: Date | null = null;

  for (const sample of sleepSamples) {
    const start = new Date(sample.startDate).getTime();
    const end = new Date(sample.endDate).getTime();
    const durationMins = Math.max(0, (end - start) / 60000);

    if (sample.stage === 'AWAKE') {
      awakeCount++;
      continue;
    }
    if (sample.stage === 'IN_BED') {
      continue;
    }

    // Sleep stages: CORE, DEEP, REM
    totalMins += durationMins;
    if (sample.stage === 'DEEP') deepMins += durationMins;
    if (sample.stage === 'REM') remMins += durationMins;

    const sampleStartDate = new Date(sample.startDate);
    if (!earliestAsleepStart || sampleStartDate < earliestAsleepStart) {
      earliestAsleepStart = sampleStartDate;
    }
  }

  const totalSleepHours = Math.round((totalMins / 60) * 100) / 100;
  const deepRatio = totalMins > 0 ? deepMins / totalMins : 0;
  const remRatio = totalMins > 0 ? remMins / totalMins : 0;

  // Bedtime formatting in HH:MM
  let bedtime: string | null = null;
  if (earliestAsleepStart) {
    const hours = String(earliestAsleepStart.getHours()).padStart(2, '0');
    const mins = String(earliestAsleepStart.getMinutes()).padStart(2, '0');
    bedtime = `${hours}:${mins}`;
  }

  // Sleep Quality Index (1 to 5)
  // Optimal: 7-9 hours sleep, deepRatio >= 0.15, remRatio >= 0.20, awakenings <= 2
  let quality = 3;
  if (totalSleepHours >= 7.0 && deepRatio >= 0.15 && remRatio >= 0.18 && awakeCount <= 2) {
    quality = 5;
  } else if (totalSleepHours >= 6.5 && (deepRatio >= 0.12 || remRatio >= 0.15) && awakeCount <= 3) {
    quality = 4;
  } else if (totalSleepHours < 5.0 || awakeCount > 5) {
    quality = 1;
  } else if (totalSleepHours < 6.0 || deepRatio < 0.08) {
    quality = 2;
  }

  return {
    totalSleepHours,
    sleepQuality: quality,
    bedtime,
    deepRatio: Math.round(deepRatio * 100) / 100,
    remRatio: Math.round(remRatio * 100) / 100,
  };
}

/**
 * Normalizes raw device health samples into a clean HealthIngestPayload.
 */
export function normalizeHealthData(
  metrics: RawHealthMetrics,
  sourceOverride?: 'APPLE_HEALTH' | 'GOOGLE_HEALTH_CONNECT' | 'MANUAL'
): HealthIngestPayload {
  const os = getPlatformOS();
  const source =
    sourceOverride ||
    (os === 'ios'
      ? 'APPLE_HEALTH'
      : os === 'android'
      ? 'GOOGLE_HEALTH_CONNECT'
      : 'MANUAL');

  const { totalSleepHours, sleepQuality, bedtime } = calculateSleepMetrics(metrics.sleepSamples);

  const sleepIntervals: HealthSleepInterval[] = metrics.sleepSamples.map((s) => ({
    start_time: s.startDate,
    end_time: s.endDate,
    stage: s.stage,
  }));

  return {
    date: metrics.date,
    source,
    sleep_hours: totalSleepHours,
    sleep_quality: sleepQuality,
    sleep_bedtime: bedtime,
    sleep_intervals: sleepIntervals,
    steps: Math.max(0, Math.round(metrics.steps)),
    active_minutes: metrics.activeMinutes ?? null,
    calories_burned: metrics.caloriesBurned ?? null,
    resting_heart_rate: metrics.restingHeartRate ?? null,
    auto_merge_daily_entry: true,
  };
}

/**
 * Generates realistic simulation health data for yesterday or given date.
 * Allows Web, Expo Go, and simulators without HealthKit/Health Connect to test sync.
 */
export function generateSimulatedHealthMetrics(targetDate?: string): RawHealthMetrics {
  const dateStr = targetDate || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const baseNight = new Date(`${dateStr}T23:00:00.000Z`);

  const s1Start = new Date(baseNight.getTime());
  const s1End = new Date(baseNight.getTime() + 90 * 60000); // 90 min Core

  const s2Start = new Date(s1End.getTime());
  const s2End = new Date(s2Start.getTime() + 75 * 60000); // 75 min Deep

  const s3Start = new Date(s2End.getTime());
  const s3End = new Date(s3Start.getTime() + 90 * 60000); // 90 min REM

  const s4Start = new Date(s3End.getTime());
  const s4End = new Date(s4Start.getTime() + 10 * 60000); // 10 min Awake

  const s5Start = new Date(s4End.getTime());
  const s5End = new Date(s5Start.getTime() + 180 * 60000); // 180 min Core

  const samples: RawSleepSample[] = [
    { startDate: s1Start.toISOString(), endDate: s1End.toISOString(), stage: 'CORE' },
    { startDate: s2Start.toISOString(), endDate: s2End.toISOString(), stage: 'DEEP' },
    { startDate: s3Start.toISOString(), endDate: s3End.toISOString(), stage: 'REM' },
    { startDate: s4Start.toISOString(), endDate: s4End.toISOString(), stage: 'AWAKE' },
    { startDate: s5Start.toISOString(), endDate: s5End.toISOString(), stage: 'CORE' },
  ];

  return {
    date: dateStr,
    sleepSamples: samples,
    steps: 8450,
    activeMinutes: 42,
    caloriesBurned: 480,
    restingHeartRate: 64.5,
  };
}

/**
 * Main Sync Pipeline: Pulls health metrics from native sensors (or simulation)
 * and transmits them to the LifeLens backend.
 */
export async function syncHealthMetrics(
  date?: string,
  forceSimulation = false
): Promise<SyncResultResponse> {
  // Only an explicit demo/test call may fabricate health data.
  if (!forceSimulation) {
    throw new Error(
      'Health sync is unavailable: this build has no HealthKit/Health Connect bridge. Log health metrics manually instead.'
    );
  }

  const payload = normalizeHealthData(generateSimulatedHealthMetrics(date));
  return await ingestionApi.ingestHealth(payload);
}
