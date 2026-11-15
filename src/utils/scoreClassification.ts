/**
 * LifeLens AI – Score Classification & Color-Coded Health Indicators
 *
 * Implements a consistent score classification system across LifeLens AI.
 *
 * Exact Classification Rules (0–100 scale):
 * - 0–30:   Healthy    Yellow    #F4C542
 * - 31–50:  Moderate   Green     #55B96B
 * - 51–70:  Unhealthy  Navy Blue #315A91
 * - 71–100: Severe     Red       #E55353
 *
 * Every integer from 0 to 100 belongs to exactly one category.
 * Missing or invalid values display "Not available" without assigning a category.
 */

export type ScoreCategoryName = 'Healthy' | 'Moderate' | 'Unhealthy' | 'Severe';

export interface ScoreClassification {
  /** Category name or null when missing/invalid */
  category: ScoreCategoryName | null;
  /** Display name ('Healthy' | 'Moderate' | 'Unhealthy' | 'Severe' | 'Not available') */
  name: ScoreCategoryName | 'Not available';
  /** Display label alias */
  label: ScoreCategoryName | 'Not available';
  /** Corresponding indicator hex color */
  color: string;
  /** Minimum score bound for category */
  minScore: number | null;
  /** Maximum score bound for category */
  maxScore: number | null;
  /** True only if input was a valid 0–100 score */
  isValid: boolean;
}

export const SCORE_COLORS = {
  HEALTHY: '#F4C542',
  MODERATE: '#55B96B',
  UNHEALTHY: '#315A91',
  SEVERE: '#E55353',
  NOT_AVAILABLE: '#8E8E93',
} as const;

export const SCORE_CATEGORIES = {
  HEALTHY: {
    category: 'Healthy' as const,
    name: 'Healthy' as const,
    label: 'Healthy' as const,
    color: SCORE_COLORS.HEALTHY,
    minScore: 0,
    maxScore: 30,
    isValid: true,
  },
  MODERATE: {
    category: 'Moderate' as const,
    name: 'Moderate' as const,
    label: 'Moderate' as const,
    color: SCORE_COLORS.MODERATE,
    minScore: 31,
    maxScore: 50,
    isValid: true,
  },
  UNHEALTHY: {
    category: 'Unhealthy' as const,
    name: 'Unhealthy' as const,
    label: 'Unhealthy' as const,
    color: SCORE_COLORS.UNHEALTHY,
    minScore: 51,
    maxScore: 70,
    isValid: true,
  },
  SEVERE: {
    category: 'Severe' as const,
    name: 'Severe' as const,
    label: 'Severe' as const,
    color: SCORE_COLORS.SEVERE,
    minScore: 71,
    maxScore: 100,
    isValid: true,
  },
  NOT_AVAILABLE: {
    category: null,
    name: 'Not available' as const,
    label: 'Not available' as const,
    color: SCORE_COLORS.NOT_AVAILABLE,
    minScore: null,
    maxScore: null,
    isValid: false,
  },
} as const;

/**
 * Returns score classification for any score on a 0–100 scale.
 *
 * Rules:
 * - 0–30:   Healthy   (#F4C542)
 * - 31–50:  Moderate  (#55B96B)
 * - 51–70:  Unhealthy (#315A91)
 * - 71–100: Severe    (#E55353)
 *
 * Decimal scores at boundaries:
 * Decimals are resolved to their nearest integer bucket (Math.round).
 * For example:
 * - 30.0 -> Healthy, 30.4 -> Healthy, 30.5 -> Moderate
 * - 50.0 -> Moderate, 50.4 -> Moderate, 50.5 -> Unhealthy
 * - 70.0 -> Unhealthy, 70.4 -> Unhealthy, 70.5 -> Severe
 *
 * Missing / Invalid scores:
 * - null, undefined, NaN, empty strings -> returns "Not available", category: null, isValid: false.
 * - Below 0 or above 100 -> returns "Not available", category: null, isValid: false.
 */
export function getScoreClassification(score: unknown): ScoreClassification {
  if (score === null || score === undefined || score === '') {
    return SCORE_CATEGORIES.NOT_AVAILABLE;
  }

  const num = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return SCORE_CATEGORIES.NOT_AVAILABLE;
  }

  // Handle invalid values safely: below 0 or above 100
  if (num < 0 || num > 100) {
    return SCORE_CATEGORIES.NOT_AVAILABLE;
  }

  const rounded = Math.round(num);

  if (rounded >= 0 && rounded <= 30) {
    return SCORE_CATEGORIES.HEALTHY;
  }
  if (rounded >= 31 && rounded <= 50) {
    return SCORE_CATEGORIES.MODERATE;
  }
  if (rounded >= 51 && rounded <= 70) {
    return SCORE_CATEGORIES.UNHEALTHY;
  }
  if (rounded >= 71 && rounded <= 100) {
    return SCORE_CATEGORIES.SEVERE;
  }

  return SCORE_CATEGORIES.NOT_AVAILABLE;
}

/** Single reusable utility alias for score classification */
export const classifyScore = getScoreClassification;

/**
 * Format helper: returns formatted string like "25 / 100 • Healthy" or "-- / 100 • Not available"
 */
export function formatScoreWithCategory(
  score: number | null | undefined,
  decimals = 0
): string {
  const classification = getScoreClassification(score);
  if (!classification.isValid || score === null || score === undefined) {
    return '-- / 100 • Not available';
  }
  const formattedScore = decimals > 0 ? Number(score).toFixed(decimals) : Math.round(Number(score));
  return `${formattedScore} / 100 • ${classification.name}`;
}

/**
 * Helper to compute a soft tinted background color from an indicator hex color
 */
export function getCategoryBadgeBg(color: string, alpha = 0.15): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `${color}20`;
}
