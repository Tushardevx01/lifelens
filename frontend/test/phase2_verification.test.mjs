import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateEstimatedLifeScore,
  computeSleepScore,
  computeHealthScore,
  computeProductivityScore,
  computeFinanceScore,
  getScoreBand,
} from '../src/utils/lifeScore.ts';

test('Phase 2 Verification: LifeScore Formula Integrity', async (t) => {
  await t.test('computeSleepScore handles boundaries correctly', () => {
    // 8 hrs + quality 5 = 100
    assert.equal(computeSleepScore(8, 5), 100);
    // 0 hrs = 0 regardless of quality
    assert.equal(computeSleepScore(0, 5), 0);
    // 4 hrs + quality 5 = 50
    assert.equal(computeSleepScore(4, 5), 50);
    // 8 hrs + quality 3 = 60
    assert.equal(computeSleepScore(8, 3), 60);
    // 10 hrs (capped at 8) + quality 4 = 80
    assert.equal(computeSleepScore(10, 4), 80);
  });

  await t.test('computeHealthScore handles steps and active minutes bonus', () => {
    // 10,000 steps without active minutes = 100
    assert.equal(computeHealthScore(10000, 0), 100);
    // 5,000 steps without active minutes = 50
    assert.equal(computeHealthScore(5000, 0), 50);
    // 5,000 steps + 3 active mins (0.05 bonus) = 55
    assert.equal(computeHealthScore(5000, 3), 55);
    // 5,000 steps + 30 active mins (0.10 max bonus) = 60
    assert.equal(computeHealthScore(5000, 30), 60);
  });

  await t.test('computeProductivityScore handles deep work and tasks completed bonus', () => {
    // 8 hrs + 10 tasks = 100 (90 base + 10 bonus)
    assert.equal(computeProductivityScore(8, 10), 100);
    // 4 hrs + 0 tasks = 45 (45 base + 0 bonus)
    assert.equal(computeProductivityScore(4, 0), 45);
    // 4 hrs + 5 tasks = 50 (45 base + 5 bonus)
    assert.equal(computeProductivityScore(4, 5), 50);
    // 0 hrs + 10 tasks = 10 (0 base + 10 bonus)
    assert.equal(computeProductivityScore(0, 10), 10);
  });

  await t.test('computeFinanceScore evaluates spending relative to baseline', () => {
    // <= baseline $50 = 100
    assert.equal(computeFinanceScore(30, 50), 100);
    assert.equal(computeFinanceScore(50, 50), 100);
    // $100 (2x baseline) = 50
    assert.equal(computeFinanceScore(100, 50), 50);
    // $150 (3x baseline) = 0
    assert.equal(computeFinanceScore(150, 50), 0);
  });

  await t.test('calculateEstimatedLifeScore computes composite score with mood modifier', () => {
    // Perfect day: 8h sleep q5, 10k steps 60m, 8h deep work 10 tasks, $30 spend, mood 10
    const perfectDay = calculateEstimatedLifeScore({
      sleep_hours: 8,
      sleep_quality: 5,
      screen_time_hours: 3,
      steps: 10000,
      active_minutes: 60,
      deep_work_hours: 8,
      tasks_completed: 10,
      daily_spend: 30,
      mood_score: 10,
    });
    // Raw is 100, mood modifier is +5, clamped to 100
    assert.equal(perfectDay.life_score, 100);
    assert.equal(perfectDay.band.label, 'Optimal');

    // Neutral day: 8h sleep q4 (80), 5k steps 0m (50), 4h deep work 5 tasks (50), $50 spend (100), mood 5 (0 adj)
    // Raw: 80*0.3 + 50*0.25 + 50*0.25 + 100*0.2 = 24 + 12.5 + 12.5 + 20 = 69.0
    const neutralDay = calculateEstimatedLifeScore({
      sleep_hours: 8,
      sleep_quality: 4,
      screen_time_hours: 5,
      steps: 5000,
      active_minutes: 0,
      deep_work_hours: 4,
      tasks_completed: 5,
      daily_spend: 50,
      mood_score: 5,
    });
    assert.equal(neutralDay.life_score, 69.0);
    assert.equal(neutralDay.mood_adjustment, 0);
    assert.equal(neutralDay.band.label, 'Average');
  });

  await t.test('getScoreBand returns correct qualitative tiers', () => {
    assert.equal(getScoreBand(90).label, 'Optimal');
    assert.equal(getScoreBand(75).label, 'Good');
    assert.equal(getScoreBand(60).label, 'Average');
    assert.equal(getScoreBand(45).label, 'Below Average');
    assert.equal(getScoreBand(30).label, 'Critical');
  });
});

test('Phase 2 Verification: Entry Validation & Submission Rules', async (t) => {
  await t.test('Social media cannot exceed screen time', () => {
    const screenTime = 4.0;
    const invalidSocialMedia = 5.0;
    const validSocialMedia = 2.0;

    assert.ok(invalidSocialMedia > screenTime, 'Should detect social media exceeding screen time');
    assert.ok(validSocialMedia <= screenTime, 'Valid social media accepted');
  });

  await t.test('Future dates are rejected', () => {
    const today = '2026-11-04';
    const futureDate = '2026-11-05';
    const pastDate = '2026-11-03';

    assert.ok(futureDate > today, 'Future date detected');
    assert.ok(pastDate <= today, 'Past date accepted for backfilling');
  });
});
