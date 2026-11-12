/**
 * LifeLens Native Activity & Movement Service
 *
 * Standalone on-device physical activity tracker that does NOT require Google Fit or Apple HealthKit.
 *
 * Capabilities:
 * - Logs workout sessions across multiple activity disciplines.
 * - MET-based physiological active calorie expenditure calculation.
 * - Cadence-based step estimation for locomotion activities.
 * - Workout streak tracking & rest-day adherence calculation.
 * - Queries and computes workout skip vulnerability risk.
 * - Dispatches sessions to `/api/telemetry/workouts` and rolls up to DailyEntry.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { telemetryApi, entriesApi } from '@/src/services/api';
import type {
  WorkoutSession,
  WorkoutSessionCreate,
  WorkoutConsistencyResponse,
} from '@/src/types/api.types';

export interface ActivityProfile {
  name: string;
  met: number;          // Metabolic Equivalent of Task
  cadenceStepsPerMin: number;
  category: 'cardio' | 'strength' | 'flexibility' | 'sports';
}

export const ACTIVITY_PROFILES: Record<string, ActivityProfile> = {
  running: { name: 'Running', met: 9.8, cadenceStepsPerMin: 160, category: 'cardio' },
  walking: { name: 'Walking', met: 3.5, cadenceStepsPerMin: 110, category: 'cardio' },
  cycling: { name: 'Cycling', met: 7.5, cadenceStepsPerMin: 0, category: 'cardio' },
  hiit: { name: 'HIIT & Circuit', met: 8.5, cadenceStepsPerMin: 85, category: 'cardio' },
  strength: { name: 'Strength Training', met: 5.0, cadenceStepsPerMin: 0, category: 'strength' },
  yoga: { name: 'Yoga & Mobility', met: 2.8, cadenceStepsPerMin: 0, category: 'flexibility' },
  swimming: { name: 'Swimming', met: 8.0, cadenceStepsPerMin: 0, category: 'cardio' },
  sports: { name: 'Sports (Football/Tennis)', met: 7.0, cadenceStepsPerMin: 120, category: 'sports' },
};

/**
 * Calculates active calories burned using standard MET formula:
 * Calories = MET * bodyWeightKg * (durationMinutes / 60)
 * Uses standard adult default of 70kg if weight is not specified.
 */
export function calculateMetCalories(
  activityType: string,
  durationMinutes: number,
  bodyWeightKg = 70
): number {
  const normalizedKey = activityType.toLowerCase().replace(/[^a-z]/g, '');
  const profile = ACTIVITY_PROFILES[normalizedKey] || { met: 5.0 };
  const hours = durationMinutes / 60;
  return Math.round(profile.met * bodyWeightKg * hours);
}

/**
 * Estimates steps walked/run from duration and cadence profile.
 */
export function estimateActivitySteps(
  activityType: string,
  durationMinutes: number
): number {
  const normalizedKey = activityType.toLowerCase().replace(/[^a-z]/g, '');
  const profile = ACTIVITY_PROFILES[normalizedKey];
  if (!profile || profile.cadenceStepsPerMin <= 0) return 0;
  return Math.round(profile.cadenceStepsPerMin * durationMinutes);
}

export interface WorkoutInput {
  activityType: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  durationMinutes?: number;
  caloriesBurned?: number;
  intensity?: 'low' | 'moderate' | 'vigorous';
  notes?: string;
  dateStr?: string;  // YYYY-MM-DD
}

const STORAGE_KEY_PREFIX = '@lifelens_workouts_';

export async function recordNativeWorkout(input: WorkoutInput): Promise<{
  workout: WorkoutSession;
  caloriesBurned: number;
  estimatedSteps: number;
  consistency?: WorkoutConsistencyResponse;
}> {
  const start = new Date(input.startTime).getTime();
  const end = new Date(input.endTime).getTime();
  const durationMins = input.durationMinutes ?? Math.max(1, Math.round((end - start) / 60000));

  const calories = input.caloriesBurned ?? calculateMetCalories(input.activityType, durationMins);
  const steps = estimateActivitySteps(input.activityType, durationMins);

  const payload: WorkoutSessionCreate = {
    activity_type: input.activityType,
    start_time: input.startTime,
    end_time: input.endTime,
    duration_minutes: durationMins,
    calories_burned: calories,
    intensity: input.intensity ?? 'moderate',
    notes: input.notes,
  };

  // 1. Dispatch workout to backend telemetry
  let session: WorkoutSession;
  let backendDispatched = false;
  try {
    session = await telemetryApi.workouts.create(payload);
    backendDispatched = true;
  } catch {
    session = {
      id: `local_workout_${Date.now()}`,
      user_id: 'local_user',
      activity_type: input.activityType,
      start_time: input.startTime,
      end_time: input.endTime,
      duration_minutes: durationMins,
      calories_burned: calories,
      steps,
      intensity: input.intensity ?? 'moderate',
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
    };
  }

  // 2. Cache locally on device
  const dateStr = input.dateStr || (input.startTime ? input.startTime.split('T')[0] : new Date().toISOString().split('T')[0]);
  try {
    const existingRaw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${dateStr}`);
    const existingList: WorkoutSession[] = existingRaw ? JSON.parse(existingRaw) : [];
    existingList.push(session);
    await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${dateStr}`, JSON.stringify(existingList));
  } catch (err) {
    console.warn('[nativeActivityService] Local cache failed:', err);
  }

  // 3. Rollup to DailyEntry only if offline (when backend did not already rollup)
  if (!backendDispatched) {
    try {
      const existingEntry = await entriesApi.getByDate(dateStr);
      const updatedActive = (existingEntry.active_minutes || 0) + durationMins;
      const updatedCals = (existingEntry.calories_burned || 0) + calories;
      const updatedSteps = Math.max(existingEntry.steps || 0, (existingEntry.steps || 0) + steps);

      await entriesApi.update(dateStr, {
        active_minutes: updatedActive,
        calories_burned: updatedCals,
        steps: updatedSteps,
      });
    } catch {
      try {
        await entriesApi.create({
          date: dateStr,
          sleep_hours: 0,
          sleep_quality: 3,
          screen_time_hours: 0,
          steps: steps,
          active_minutes: durationMins,
          calories_burned: calories,
          deep_work_hours: 0,
          daily_spend: 0,
        });
      } catch {
        // silent
      }
    }
  }

  // 4. Fetch consistency & skip vulnerability
  let consistency: WorkoutConsistencyResponse | undefined;
  try {
    consistency = await telemetryApi.workouts.getConsistency(dateStr);
  } catch {
    // fallback
  }

  return {
    workout: session,
    caloriesBurned: calories,
    estimatedSteps: steps,
    consistency,
  };
}

export const nativeActivityService = {
  ACTIVITY_PROFILES,
  calculateMetCalories,
  estimateActivitySteps,
  recordNativeWorkout,
};
