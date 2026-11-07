/**
 * LifeScore computation utility for client-side preview.
 * Matches backend app/ml/life_score.py and app/ml/feature_engineering.py.
 */

export interface LifeScoreInput {
  sleep_hours: number;
  sleep_quality: number; // 1-5
  screen_time_hours: number;
  steps: number;
  active_minutes?: number | null;
  deep_work_hours: number;
  tasks_completed?: number | null;
  daily_spend: number;
  mood_score?: number | null; // 1-10
}

export interface LifeScoreBreakdown {
  life_score: number;
  sleep_score: number;
  productivity_score: number;
  health_score: number;
  finance_score: number;
  mood_adjustment: number;
  band: {
    label: string;
    color: string;
  };
}

export const WEIGHTS = {
  sleep: 0.3,
  productivity: 0.25,
  health: 0.25,
  finance: 0.2,
};

export const MOOD_MODIFIER_MAX = 5.0;

export function computeSleepScore(sleepHours: number, sleepQuality: number): number {
  if (sleepHours <= 0) return 0;
  const hoursFactor = Math.min(sleepHours / 8.0, 1.0);
  const qualityFactor = Math.max(1, Math.min(sleepQuality, 5)) / 5.0;
  return Math.round(hoursFactor * qualityFactor * 100 * 10) / 10;
}

export function computeActivityIndex(steps: number, activeMinutes?: number | null): number {
  const base = Math.min(Math.max(0, steps) / 10000, 1.0);
  const bonus = activeMinutes != null ? Math.min(Math.max(0, activeMinutes) / 60, 0.1) : 0;
  return Math.min(base + bonus, 1.0);
}

export function computeHealthScore(steps: number, activeMinutes?: number | null): number {
  const index = computeActivityIndex(steps, activeMinutes);
  return Math.round(index * 100 * 10) / 10;
}

export function computeProductivityScore(
  deepWorkHours: number,
  tasksCompleted?: number | null
): number {
  const base = Math.min(Math.max(0, deepWorkHours) / 8.0, 1.0) * 90;
  const bonus =
    tasksCompleted != null ? Math.min(Math.max(0, tasksCompleted) / 10, 1.0) * 10 : 0;
  return Math.round(Math.min(base + bonus, 100) * 10) / 10;
}

export function computeFinanceScore(dailySpend: number, baselineSpend = 50.0): number {
  if (dailySpend <= 0) return 100.0;
  if (dailySpend <= baselineSpend) return 100.0;
  const ratio = dailySpend / baselineSpend;
  const score = Math.max(0.0, 100.0 - (ratio - 1.0) * 50.0);
  return Math.round(score * 10) / 10;
}

export function getScoreBand(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Optimal', color: '#00D4AA' };
  if (score >= 70) return { label: 'Good', color: '#4A9EFF' };
  if (score >= 55) return { label: 'Average', color: '#FFD166' };
  if (score >= 40) return { label: 'Below Average', color: '#FF9F43' };
  return { label: 'Critical', color: '#FF4444' };
}

export function calculateEstimatedLifeScore(input: LifeScoreInput): LifeScoreBreakdown {
  const sleep_score = computeSleepScore(input.sleep_hours, input.sleep_quality);
  const productivity_score = computeProductivityScore(
    input.deep_work_hours,
    input.tasks_completed
  );
  const health_score = computeHealthScore(input.steps, input.active_minutes);
  const finance_score = computeFinanceScore(input.daily_spend);

  const raw =
    sleep_score * WEIGHTS.sleep +
    productivity_score * WEIGHTS.productivity +
    health_score * WEIGHTS.health +
    finance_score * WEIGHTS.finance;

  let mood_adjustment = 0.0;
  if (input.mood_score != null) {
    mood_adjustment = ((input.mood_score - 5.0) / 5.0) * MOOD_MODIFIER_MAX;
  }

  const life_score = Math.round(Math.min(100.0, Math.max(0.0, raw + mood_adjustment)) * 10) / 10;

  return {
    life_score,
    sleep_score,
    productivity_score,
    health_score,
    finance_score,
    mood_adjustment: Math.round(mood_adjustment * 10) / 10,
    band: getScoreBand(life_score),
  };
}

