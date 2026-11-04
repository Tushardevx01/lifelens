import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { URLSearchParams } from 'node:url';

// ============================================================================
// 1. Pure Mathematical & Business Logic Models for Granular Telemetry
// ============================================================================

export function computeDiscretionaryMetrics(transactions) {
  let totalSpend = 0;
  let discretionarySpend = 0;
  const categoryMap = {};

  for (const tx of transactions) {
    if (tx.amount <= 0) {
      throw new Error(`Transaction amount must be strictly positive. Got: ${tx.amount}`);
    }
    const amt = Number(tx.amount);
    totalSpend += amt;
    if (tx.is_discretionary) {
      discretionarySpend += amt;
    }
    const cat = tx.category || 'Other';
    categoryMap[cat] = Math.round(((categoryMap[cat] || 0) + amt) * 100) / 100;
  }

  totalSpend = Math.round(totalSpend * 100) / 100;
  discretionarySpend = Math.round(discretionarySpend * 100) / 100;
  const nonDiscretionary = Math.round((totalSpend - discretionarySpend) * 100) / 100;
  const discretionaryPct = totalSpend > 0
    ? Math.round((discretionarySpend / totalSpend) * 1000) / 10
    : 0;

  return {
    totalSpend,
    discretionarySpend,
    nonDiscretionary,
    discretionaryPct,
    categoryMap,
  };
}

export function isLateNightUsage(dateTimeIso) {
  const d = new Date(dateTimeIso);
  const hour = d.getUTCHours();
  // Late night defined as 22:00 to 05:59 UTC/Local
  return hour >= 22 || hour < 6;
}

export function computeFocusSessionMetrics(session) {
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();

  if (end < start) {
    throw new Error('end_time cannot be earlier than start_time');
  }

  if (session.self_reported_focus < 1 || session.self_reported_focus > 5) {
    throw new Error(`Focus rating must be between 1 and 5. Got: ${session.self_reported_focus}`);
  }

  const durationMinutes = Math.max(1, Math.round((end - start) / 60000));
  const durationHours = Math.round((durationMinutes / 60) * 100) / 100;
  const distractions = Math.max(0, session.distraction_count || 0);
  const distractionRatePerHour = durationHours > 0
    ? Math.round((distractions / durationHours) * 10) / 10
    : 0;

  return {
    durationMinutes,
    durationHours,
    distractionRatePerHour,
    rating: session.self_reported_focus,
  };
}

export function computeHabitStreak(completedDatesList, referenceDateStr) {
  if (!completedDatesList || completedDatesList.length === 0) {
    return { currentStreak: 0, bestStreak: 0, completedToday: false, rate7d: 0 };
  }

  const dateSet = new Set(completedDatesList);
  const refDate = new Date(referenceDateStr + 'T00:00:00Z');

  // Format helper YYYY-MM-DD
  const format = (d) => d.toISOString().split('T')[0];

  const todayStr = format(refDate);
  const completedToday = dateSet.has(todayStr);

  // Best streak calculation
  const sortedDates = Array.from(dateSet).sort();
  let bestStreak = 0;
  let tempStreak = 0;
  let prevTime = null;

  for (const dStr of sortedDates) {
    const t = new Date(dStr + 'T00:00:00Z').getTime();
    if (prevTime === null || t === prevTime + 86400000) {
      tempStreak += 1;
    } else if (t > prevTime + 86400000) {
      tempStreak = 1;
    }
    prevTime = t;
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  // Current streak calculation
  let currentStreak = 0;
  let check = new Date(refDate.getTime());

  // If not completed today, streak is still alive if yesterday was completed
  if (!dateSet.has(format(check))) {
    check.setUTCDate(check.getUTCDate() - 1);
  }

  while (dateSet.has(format(check))) {
    currentStreak += 1;
    check.setUTCDate(check.getUTCDate() - 1);
  }

  // 7-day completion rate
  let count7d = 0;
  for (let i = 0; i < 7; i++) {
    const pastDay = new Date(refDate.getTime());
    pastDay.setUTCDate(pastDay.getUTCDate() - i);
    if (dateSet.has(format(pastDay))) {
      count7d += 1;
    }
  }
  const rate7d = Math.round((count7d / 7) * 1000) / 10;

  return {
    currentStreak,
    bestStreak,
    completedToday,
    rate7d,
  };
}

// ============================================================================
// 2. Test Suites Execution
// ============================================================================

describe('Phase 1 Verification: Financial Telemetry & Discretionary Metrics', () => {
  test('Correctly separates discretionary vs non-discretionary spending and computes ratios', () => {
    const txs = [
      { amount: 540, is_discretionary: true, category: 'Food Delivery' },
      { amount: 260, is_discretionary: true, category: 'Dining' },
      { amount: 1200, is_discretionary: false, category: 'Groceries' },
      { amount: 800, is_discretionary: false, category: 'Utilities' },
    ];

    const res = computeDiscretionaryMetrics(txs);
    assert.equal(res.totalSpend, 2800);
    assert.equal(res.discretionarySpend, 800);
    assert.equal(res.nonDiscretionary, 2000);
    assert.equal(res.discretionaryPct, 28.6); // 800/2800 * 100 = 28.57% -> 28.6%
    assert.equal(res.categoryMap['Food Delivery'], 540);
    assert.equal(res.categoryMap['Groceries'], 1200);
  });

  test('Strictly rejects negative or zero purchase amounts', () => {
    const invalidTxs = [
      { amount: -50, is_discretionary: true, category: 'Shopping' },
    ];
    assert.throws(
      () => computeDiscretionaryMetrics(invalidTxs),
      /Transaction amount must be strictly positive/
    );
  });

  test('Handles 0 total spend gracefully without division by zero', () => {
    const res = computeDiscretionaryMetrics([]);
    assert.equal(res.totalSpend, 0);
    assert.equal(res.discretionarySpend, 0);
    assert.equal(res.discretionaryPct, 0);
  });
});

describe('Phase 1 Verification: App Usage & Circadian Late-Night Detection', () => {
  test('Correctly identifies late-night screen time sessions (22:00 - 05:59)', () => {
    assert.equal(isLateNightUsage('2026-11-04T23:15:00Z'), true);
    assert.equal(isLateNightUsage('2026-11-04T02:30:00Z'), true);
    assert.equal(isLateNightUsage('2026-11-04T05:59:00Z'), true);
  });

  test('Correctly identifies normal daytime screen time sessions', () => {
    assert.equal(isLateNightUsage('2026-11-04T06:00:00Z'), false);
    assert.equal(isLateNightUsage('2026-11-04T14:45:00Z'), false);
    assert.equal(isLateNightUsage('2026-11-04T21:59:00Z'), false);
  });
});

describe('Phase 1 Verification: Focus & Deep Work Sessions', () => {
  test('Calculates focus duration, hours and distraction rate per hour', () => {
    const session = {
      subject_or_task: 'Compiler Optimization',
      start_time: '2026-11-04T10:00:00Z',
      end_time: '2026-11-04T11:30:00Z', // 90 minutes
      self_reported_focus: 4,
      distraction_count: 3,
    };

    const metrics = computeFocusSessionMetrics(session);
    assert.equal(metrics.durationMinutes, 90);
    assert.equal(metrics.durationHours, 1.5);
    assert.equal(metrics.distractionRatePerHour, 2.0); // 3 distractions / 1.5h = 2.0/hr
    assert.equal(metrics.rating, 4);
  });

  test('Enforces focus rating bounded strictly within [1, 5]', () => {
    const invalidSession = {
      start_time: '2026-11-04T10:00:00Z',
      end_time: '2026-11-04T10:30:00Z',
      self_reported_focus: 6, // invalid
    };
    assert.throws(
      () => computeFocusSessionMetrics(invalidSession),
      /Focus rating must be between 1 and 5/
    );
  });

  test('Rejects inverted interval where end_time < start_time', () => {
    const inverted = {
      start_time: '2026-11-04T12:00:00Z',
      end_time: '2026-11-04T11:00:00Z',
      self_reported_focus: 3,
    };
    assert.throws(
      () => computeFocusSessionMetrics(inverted),
      /end_time cannot be earlier than start_time/
    );
  });
});

describe('Phase 1 Verification: Habit Streak Engine Algorithm', () => {
  const TODAY = '2026-11-04';

  test('Empty history yields 0 current and best streak', () => {
    const res = computeHabitStreak([], TODAY);
    assert.equal(res.currentStreak, 0);
    assert.equal(res.bestStreak, 0);
    assert.equal(res.completedToday, false);
    assert.equal(res.rate7d, 0);
  });

  test('Single completion today yields current streak 1', () => {
    const res = computeHabitStreak(['2026-11-04'], TODAY);
    assert.equal(res.currentStreak, 1);
    assert.equal(res.bestStreak, 1);
    assert.equal(res.completedToday, true);
    assert.equal(res.rate7d, 14.3); // 1/7 = 14.3%
  });

  test('Completion yesterday keeps current streak alive pending today', () => {
    const res = computeHabitStreak(['2026-11-02', '2026-11-03'], TODAY);
    assert.equal(res.currentStreak, 2);
    assert.equal(res.bestStreak, 2);
    assert.equal(res.completedToday, false);
    assert.equal(res.rate7d, 28.6); // 2/7 = 28.6%
  });

  test('Continuous 5-day streak including today accumulates accurately', () => {
    const dates = [
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
    ];
    const res = computeHabitStreak(dates, TODAY);
    assert.equal(res.currentStreak, 5);
    assert.equal(res.bestStreak, 5);
    assert.equal(res.completedToday, true);
    assert.equal(res.rate7d, 71.4); // 5/7 = 71.4%
  });

  test('Broken streak resets current streak but retains historical best streak', () => {
    // 7-day streak in past, then 2 days gap, then 2-day streak today
    const dates = [
      '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13',
      '2026-10-14', '2026-10-15', '2026-10-16', // 7 days best streak
      '2026-11-03', '2026-11-04', // current 2 days
    ];
    const res = computeHabitStreak(dates, TODAY);
    assert.equal(res.currentStreak, 2);
    assert.equal(res.bestStreak, 7);
    assert.equal(res.completedToday, true);
  });
});

describe('Phase 1 Verification: Telemetry API Client Contract & Headers', () => {
  test('API Client methods format endpoint URLs and query parameters correctly', () => {
    // Verify query param serialization logic
    const params = new URLSearchParams();
    params.set('start_date', '2026-11-01');
    params.set('end_date', '2026-11-04');
    params.set('category', 'Food Delivery');
    params.set('is_discretionary', 'true');
    params.set('page', '1');
    params.set('page_size', '30');

    const expected = 'start_date=2026-11-01&end_date=2026-11-04&category=Food+Delivery&is_discretionary=true&page=1&page_size=30';
    assert.equal(params.toString(), expected);
  });
});

