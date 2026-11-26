/**
 * Shared chart formatting & timeframe slicing helpers for TrendCard and LifeScoreTrend.
 */

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const TREND_TIMEFRAME_DAYS: Record<string, number> = {
  '7D': 7,
  '14D': 14,
  '30D': 30,
  '90D': 90,
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
};

/**
 * Slices chronological trend points to the requested timeframe window.
 */
export function sliceTrendData<T>(data: readonly T[], timeframe: string): T[] {
  const limit = TREND_TIMEFRAME_DAYS[timeframe] ?? 30;
  return data.slice(-limit);
}

/**
 * Formats YYYY-MM-DD or MM-DD strings compactly without timezone shifts.
 */
export function formatAxisDate(raw: string, compact = false): string {
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const dayNum = parseInt(isoMatch[3], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return compact ? `${monthIdx + 1}/${dayNum}` : `${SHORT_MONTHS[monthIdx]} ${dayNum}`;
    }
  }
  const mdMatch = raw.match(/^(\d{2})-(\d{2})$/);
  if (mdMatch) {
    const monthIdx = parseInt(mdMatch[1], 10) - 1;
    const dayNum = parseInt(mdMatch[2], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return compact ? `${monthIdx + 1}/${dayNum}` : `${SHORT_MONTHS[monthIdx]} ${dayNum}`;
    }
  }
  return raw;
}

/**
 * Returns evenly spaced milestone labels (start, mid, end) for dense multi-day charts.
 */
export function getMilestoneLabels(days: readonly string[]): string[] {
  if (days.length === 0) return [];
  if (days.length === 1) return [formatAxisDate(days[0])];
  const first = formatAxisDate(days[0]);
  const last = formatAxisDate(days[days.length - 1]);
  if (days.length === 2) return [first, last];
  const mid = formatAxisDate(days[Math.floor((days.length - 1) / 2)]);
  return [first, mid, last];
}
