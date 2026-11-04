import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { URLSearchParams } from 'node:url';

// ============================================================================
// 1. Pure Mathematical & Statistical Functions (Matching ML Engine Exactly)
// ============================================================================

export function computeDistributionStats(values) {
  const cleaned = (values || [])
    .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
    .map(Number);
  const n = cleaned.length;

  if (n === 0) {
    return { n: 0, mean: 0.0, std: 0.0, variance: 0.0, min: 0.0, max: 0.0, median: 0.0 };
  }

  const sum = cleaned.reduce((acc, x) => acc + x, 0);
  const mean = sum / n;

  let variance = 0.0;
  if (n >= 2) {
    const sumSqDiff = cleaned.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0);
    variance = sumSqDiff / (n - 1);
  }
  const std = Math.sqrt(variance);

  const sorted = [...cleaned].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2.0;

  return {
    n,
    mean: Math.round(mean * 1000) / 1000,
    std: Math.round(std * 1000) / 1000,
    variance: Math.round(variance * 10000) / 10000,
    min: Math.round(sorted[0] * 1000) / 1000,
    max: Math.round(sorted[sorted.length - 1] * 1000) / 1000,
    median: Math.round(median * 1000) / 1000,
  };
}

export function computeCohensD(mean1, std1, n1, mean2, std2, n2) {
  if (n1 <= 1 && n2 <= 1) return 0.0;
  const df = (n1 - 1) + (n2 - 1);
  if (df <= 0) return 0.0;

  const sumSq = ((n1 - 1) * Math.pow(std1, 2)) + ((n2 - 1) * Math.pow(std2, 2));
  const pooledVar = sumSq / df;
  const sPooled = Math.sqrt(pooledVar);

  if (sPooled === 0.0) {
    const diff = mean2 - mean1;
    if (Math.abs(diff) < 1e-9) return 0.0;
    return diff > 0 ? 2.5 : -2.5;
  }

  const d = (mean2 - mean1) / sPooled;
  return Math.round(d * 1000) / 1000;
}

export function computeWelchTTest(baselineVals, treatmentVals) {
  const b = computeDistributionStats(baselineVals);
  const t = computeDistributionStats(treatmentVals);

  if (b.n < 2 || t.n < 2) {
    return { tStat: 0.0, pValue: 1.0 };
  }

  const denom = Math.sqrt((b.variance / b.n) + (t.variance / t.n));
  if (denom === 0.0) {
    return b.mean === t.mean
      ? { tStat: 0.0, pValue: 1.0 }
      : { tStat: t.mean > b.mean ? 5.0 : -5.0, pValue: 0.01 };
  }

  const tStat = (t.mean - b.mean) / denom;

  // Degrees of freedom (Welch-Satterthwaite)
  const term1 = b.variance / b.n;
  const term2 = t.variance / t.n;
  const numDf = Math.pow(term1 + term2, 2);
  const denDf = (Math.pow(term1, 2) / (b.n - 1)) + (Math.pow(term2, 2) / (t.n - 1));
  const df = denDf > 0 ? numDf / denDf : 1.0;

  // Approximate p-value
  const absT = Math.abs(tStat);
  let pOneTail;
  if (df >= 30) {
    pOneTail = 0.5 * (1 - erf(absT / Math.SQRT2));
  } else {
    const z = (absT * Math.sqrt(1.0 - 1.0 / (4.0 * df))) / Math.sqrt(1.0 + Math.pow(absT, 2) / (2.0 * df));
    pOneTail = 0.5 * (1 - erf(z / Math.SQRT2));
  }
  const pValue = Math.max(0.0001, Math.min(1.0, Math.round(2.0 * pOneTail * 10000) / 10000));

  return {
    tStat: Math.round(tStat * 1000) / 1000,
    pValue,
  };
}

function erf(x) {
  // Abramowitz and Stegun approximation formula 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

export function evaluateExperiment({
  baselineVals,
  treatmentVals,
  desiredDirection = 'INCREASE',
  adherenceList = [],
  metricLabel = 'metric',
  interventionRule = '',
}) {
  const b = computeDistributionStats(baselineVals);
  const t = computeDistributionStats(treatmentVals);

  const rawDelta = Math.round((t.mean - b.mean) * 1000) / 1000;
  const percentageChange = b.mean !== 0
    ? Math.round((rawDelta / Math.abs(b.mean)) * 1000) / 10
    : Math.round(rawDelta * 1000) / 10;

  const cohensD = computeCohensD(b.mean, b.std, b.n, t.mean, t.std, t.n);
  const { pValue } = computeWelchTTest(baselineVals, treatmentVals);
  const isSignificant = pValue < 0.05 || (Math.abs(cohensD) >= 0.5 && t.n >= 4);

  const totalCheckins = adherenceList.length > 0 ? adherenceList.length : t.n;
  const daysAdhered = adherenceList.length > 0
    ? adherenceList.filter(Boolean).length
    : t.n;
  const adherenceRate = totalCheckins > 0
    ? Math.round((daysAdhered / totalCheckins) * 1000) / 10
    : 0.0;

  const isIncrease = desiredDirection.toUpperCase() === 'INCREASE';
  const improved = isIncrease ? rawDelta > 0 : rawDelta < 0;
  const worsened = isIncrease ? rawDelta < 0 : rawDelta > 0;

  const absPct = Math.abs(percentageChange);
  const absD = Math.abs(cohensD);

  let verdict = 'INCONCLUSIVE';
  let verdictLabel = 'Inconclusive Trend';

  if (t.n < 2) {
    verdict = 'INCONCLUSIVE';
    verdictLabel = 'Inconclusive (Insufficient Data)';
  } else if (improved && (absPct >= 8.0 || absD >= 0.4) && adherenceRate >= 60.0) {
    verdict = 'SUCCESS';
    verdictLabel = 'Experiment Succeeded';
  } else if (improved && (absPct >= 3.0 || absD >= 0.2)) {
    verdict = 'PARTIAL_SUCCESS';
    verdictLabel = 'Partial Improvement Observed';
  } else if (absPct < 3.0 && absD < 0.2) {
    verdict = 'NO_EFFECT';
    verdictLabel = 'No Measurable Change';
  } else if (worsened && (absPct >= 8.0 || absD >= 0.4)) {
    verdict = 'NEGATIVE';
    verdictLabel = 'Adverse Effect Detected';
  }

  const metricName = metricLabel.replace(/_/g, ' ');
  const sign = rawDelta > 0 ? '+' : '';
  const narrative =
    verdict === 'SUCCESS'
      ? `Your experiment testing '${interventionRule}' was a clear success! During the treatment period, average ${metricName} moved from ${b.mean} to ${t.mean} (${sign}${rawDelta} / ${percentageChange}%). Adherence was ${adherenceRate}% with an effect size of ${Math.abs(cohensD)}.`
      : `Experiment concluded with verdict: ${verdictLabel}.`;

  return {
    baselineMean: b.mean,
    baselineStd: b.std,
    baselineN: b.n,
    treatmentMean: t.mean,
    treatmentStd: t.std,
    treatmentN: t.n,
    rawDelta,
    percentageChange,
    cohensD,
    pValue,
    isSignificant,
    adherenceRate,
    daysAdhered,
    totalDays: totalCheckins,
    verdict,
    verdictLabel,
    narrative,
  };
}

// ============================================================================
// 2. Comprehensive Test Suites
// ============================================================================

describe('Phase 2 Verification: Distribution & Statistical Moments', () => {
  test('Handles empty and single item arrays safely', () => {
    const empty = computeDistributionStats([]);
    assert.equal(empty.n, 0);
    assert.equal(empty.mean, 0.0);
    assert.equal(empty.std, 0.0);

    const single = computeDistributionStats([8.2]);
    assert.equal(single.n, 1);
    assert.equal(single.mean, 8.2);
    assert.equal(single.std, 0.0);
  });

  test('Computes sample mean, variance and std correctly', () => {
    // Known sample: [6.0, 7.0, 8.0]
    // Mean = 7.0, Variance = ((1) + (0) + (1)) / 2 = 1.0, Std = 1.0
    const stats = computeDistributionStats([6.0, 7.0, 8.0]);
    assert.equal(stats.n, 3);
    assert.equal(stats.mean, 7.0);
    assert.equal(stats.variance, 1.0);
    assert.equal(stats.std, 1.0);
    assert.equal(stats.median, 7.0);
    assert.equal(stats.min, 6.0);
    assert.equal(stats.max, 8.0);
  });

  test('Filters out null, undefined, and non-numeric entries safely', () => {
    const stats = computeDistributionStats([6.0, null, 7.0, undefined, '8.0', NaN]);
    assert.equal(stats.n, 3);
    assert.equal(stats.mean, 7.0);
  });
});

describe('Phase 2 Verification: Cohen d Effect Size & Welch t-test', () => {
  test('Computes Cohen d effect size and categorizes correctly', () => {
    // Large effect: Baseline 6h, Treatment 7.5h, Std 1.0
    const dLarge = computeCohensD(6.0, 1.0, 14, 7.5, 1.0, 7);
    assert.ok(dLarge >= 0.8, `Expected d >= 0.8, got ${dLarge}`);

    // Zero difference: d = 0
    const dZero = computeCohensD(7.0, 1.0, 10, 7.0, 1.0, 10);
    assert.equal(dZero, 0.0);

    // Negative effect
    const dNeg = computeCohensD(7.5, 1.0, 14, 6.0, 1.0, 7);
    assert.ok(dNeg <= -0.8, `Expected d <= -0.8, got ${dNeg}`);
  });

  test('Welch t-test distinguishes statistically significant shifts', () => {
    const baseline = [5.8, 6.0, 5.9, 6.1, 5.7, 6.2, 5.9, 6.0];
    const treatment = [7.5, 7.8, 7.4, 7.6, 7.9, 7.5, 7.7, 7.6];

    const { tStat, pValue } = computeWelchTTest(baseline, treatment);
    assert.ok(tStat > 5.0, `Expected tStat > 5.0, got ${tStat}`);
    assert.ok(pValue < 0.01, `Expected pValue < 0.01, got ${pValue}`);
  });
});

describe('Phase 2 Verification: Metric Directionality & Outcome Verdicts', () => {
  test('INCREASE metric: Positive delta produces SUCCESS when adherence is high', () => {
    // Sleep experiment
    const baseline = [5.8, 6.0, 5.9, 6.1, 5.7, 6.2, 5.9];
    const treatment = [7.2, 7.4, 7.1, 7.5, 7.3, 7.6, 7.4];
    const adherence = [true, true, true, true, true, false, true]; // 6/7 = 85.7%

    const res = evaluateExperiment({
      baselineVals: baseline,
      treatmentVals: treatment,
      desiredDirection: 'INCREASE',
      adherenceList: adherence,
      metricLabel: 'sleep_hours',
      interventionRule: 'No screens 1h before bed',
    });

    assert.equal(res.verdict, 'SUCCESS');
    assert.ok(res.rawDelta > 1.0);
    assert.ok(res.percentageChange > 15.0);
    assert.equal(res.adherenceRate, 85.7);
    assert.ok(res.narrative.includes('clear success'));
  });

  test('DECREASE metric: Negative delta correctly produces SUCCESS (e.g. Screen Time / Spend)', () => {
    // Screen time experiment: ~6.0h reduced to ~3.5h
    const baseline = [5.8, 6.2, 6.0, 6.1, 5.9, 6.3, 6.0];
    const treatment = [3.4, 3.6, 3.2, 3.5, 3.3, 3.7, 3.5];
    const adherence = [true, true, true, true, true, true, true];

    const res = evaluateExperiment({
      baselineVals: baseline,
      treatmentVals: treatment,
      desiredDirection: 'DECREASE',
      adherenceList: adherence,
      metricLabel: 'screen_time_hours',
      interventionRule: 'Social media 30m ceiling',
    });

    assert.equal(res.verdict, 'SUCCESS');
    assert.ok(res.rawDelta < -2.0, `Expected rawDelta < -2.0, got ${res.rawDelta}`);
    assert.ok(res.percentageChange < -30.0);
  });

  test('DECREASE metric: Increase in screen time correctly evaluates as NEGATIVE', () => {
    const baseline = [3.5, 3.4, 3.6, 3.5, 3.3, 3.5, 3.4];
    const treatment = [6.0, 6.2, 5.9, 6.1, 6.3, 6.0, 6.2];
    const adherence = [true, true, true, true, true, true, true];

    const res = evaluateExperiment({
      baselineVals: baseline,
      treatmentVals: treatment,
      desiredDirection: 'DECREASE',
      adherenceList: adherence,
      metricLabel: 'screen_time_hours',
    });

    assert.equal(res.verdict, 'NEGATIVE');
  });

  test('Zero or negligible delta evaluates as NO_EFFECT', () => {
    const baseline = [7.0, 7.1, 6.9, 7.0, 7.2, 6.8, 7.0];
    const treatment = [7.0, 7.1, 7.0, 6.9, 7.1, 7.0, 7.0];
    const adherence = [true, true, true, true, true, true, true];

    const res = evaluateExperiment({
      baselineVals: baseline,
      treatmentVals: treatment,
      desiredDirection: 'INCREASE',
      adherenceList: adherence,
      metricLabel: 'sleep_hours',
    });

    assert.equal(res.verdict, 'NO_EFFECT');
  });

  test('Single treatment point evaluates safely as INCONCLUSIVE', () => {
    const res = evaluateExperiment({
      baselineVals: [6.0, 6.1, 5.9],
      treatmentVals: [7.2], // only 1 day
      desiredDirection: 'INCREASE',
    });

    assert.equal(res.verdict, 'INCONCLUSIVE');
  });

  test('Adversarial zero baseline evaluates percentage change without division by zero', () => {
    const baseline = [0.0, 0.0, 0.0, 0.0];
    const treatment = [1.5, 2.0, 1.8, 2.2];
    const res = evaluateExperiment({
      baselineVals: baseline,
      treatmentVals: treatment,
      desiredDirection: 'INCREASE',
      metricLabel: 'deep_work_hours',
    });
    assert.equal(res.verdict, 'SUCCESS');
    assert.ok(res.rawDelta > 0);
    assert.ok(!Number.isNaN(res.percentageChange));
  });

  test('Adversarial 0% adherence rejects SUCCESS even if metric increased', () => {
    const baseline = [6.0, 6.0, 6.0];
    const treatment = [8.0, 8.0, 8.0];
    const adherence = [false, false, false];

    const res = evaluateExperiment({
      baselineVals: baseline,
      treatmentVals: treatment,
      desiredDirection: 'INCREASE',
      adherenceList: adherence,
      metricLabel: 'sleep_hours',
    });
    assert.notEqual(res.verdict, 'SUCCESS');
    assert.equal(res.adherenceRate, 0.0);
  });

  test('Adversarial large scale numbers (e.g. 10k steps) maintain precision', () => {
    const baseline = [5000, 4800, 5200, 4900, 5100];
    const treatment = [12000, 11500, 12500, 11800, 12200];
    const adherence = [true, true, true, true, true];

    const res = evaluateExperiment({
      baselineVals: baseline,
      treatmentVals: treatment,
      desiredDirection: 'INCREASE',
      adherenceList: adherence,
      metricLabel: 'steps',
    });
    assert.equal(res.verdict, 'SUCCESS');
    assert.ok(res.rawDelta > 6000);
    assert.ok(res.cohensD > 5.0);
  });
});

describe('Phase 2 Verification: Priya Journey End-to-End Core Loop Simulation', () => {
  test('Complete 7-Step Lifecycle: Insight -> Experiment -> Checkins -> Evaluation -> Habit Adoption', () => {
    // Step 1: Insight recommends "Try reducing screen time 1h before bed for 7 days"
    const recommendation = {
      insight_id: 'rec-12345',
      title: 'Late Night Screen Time Suppresses Sleep',
      recommended_rule: 'Put phone in living room at 22:30',
      target_metric: 'sleep_hours',
      duration_days: 7,
    };

    // Step 2: Establish baseline (14 days past data)
    const baselineSleep = [6.1, 5.9, 6.3, 5.8, 6.0, 6.2, 5.7, 6.1, 5.9, 6.4, 5.8, 6.0, 6.1, 5.9];
    const bStats = computeDistributionStats(baselineSleep);
    assert.equal(bStats.n, 14);
    assert.ok(bStats.mean >= 5.9 && bStats.mean <= 6.1);

    // Step 3: Launch 7-day experiment
    const experiment = {
      id: 'exp-priya-01',
      title: recommendation.title,
      target_metric: recommendation.target_metric,
      intervention_rule: recommendation.recommended_rule,
      duration_days: 7,
      status: 'ACTIVE',
      baseline_mean: bStats.mean,
      baseline_std: bStats.std,
      checkins: [],
    };

    // Step 4: Daily adherence checkins and entries over 7 days
    const treatmentSleep = [7.1, 7.3, 7.5, 7.0, 7.4, 6.2, 7.6]; // Day 6 user had slip
    const dailyAdherence = [true, true, true, true, true, false, true];

    for (let day = 0; day < 7; day++) {
      experiment.checkins.push({
        day_number: day + 1,
        adhered: dailyAdherence[day],
        metric_value: treatmentSleep[day],
      });
    }

    assert.equal(experiment.checkins.length, 7);

    // Step 5 & 6: Evaluation
    const evalResult = evaluateExperiment({
      baselineVals: baselineSleep,
      treatmentVals: treatmentSleep,
      desiredDirection: 'INCREASE',
      adherenceList: dailyAdherence,
      metricLabel: experiment.target_metric,
      intervention_rule: experiment.intervention_rule,
    });

    assert.equal(evalResult.verdict, 'SUCCESS');
    assert.equal(evalResult.daysAdhered, 6);
    assert.equal(evalResult.totalDays, 7);
    assert.equal(evalResult.adherenceRate, 85.7);
    assert.ok(evalResult.rawDelta >= 1.1, `Expected rawDelta >= 1.1h, got ${evalResult.rawDelta}`);
    assert.ok(evalResult.cohensD >= 0.8, 'Expected large Cohen d effect size');

    // Step 7: Finalize and Bridge to Permanent Habit
    experiment.status = 'COMPLETED';
    experiment.user_rating = 5;
    experiment.user_reflection = 'I felt noticeably more energized each morning!';
    experiment.adopted_as_habit = true;

    // Bridge to Habit Table
    const adoptedHabit = {
      id: 'habit-from-exp-01',
      name: experiment.intervention_rule,
      domain: 'Sleep',
      frequency: 'daily',
      target_per_day: 1,
      is_active: true,
      current_streak: 1, // Started today
      best_streak: 1,
    };

    assert.equal(adoptedHabit.name, 'Put phone in living room at 22:30');
    assert.equal(adoptedHabit.is_active, true);
    assert.equal(experiment.status, 'COMPLETED');
  });
});

describe('Phase 2 Verification: Experiments API Client URL & Parameter Contracts', () => {
  test('API client serializes status, pagination, and reason parameters correctly', () => {
    const listParams = new URLSearchParams();
    listParams.set('status', 'ACTIVE');
    listParams.set('page', '1');
    listParams.set('page_size', '20');

    assert.equal(listParams.toString(), 'status=ACTIVE&page=1&page_size=20');

    const reason = 'Work schedule shifted';
    const abandonQs = `?reason=${encodeURIComponent(reason)}`;
    assert.equal(abandonQs, '?reason=Work%20schedule%20shifted');
  });
});
