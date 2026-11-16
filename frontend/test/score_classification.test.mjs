/**
 * Score Classification & Color-Coded Health Indicators Test Suite
 *
 * Verifies:
 * - 0 and 30 -> Healthy (#F4C542)
 * - 31 and 50 -> Moderate (#55B96B)
 * - 51 and 70 -> Unhealthy (#315A91)
 * - 71 and 100 -> Severe (#E55353)
 * - Decimal scores at boundaries
 * - Missing and invalid values (null, undefined, NaN, < 0, > 100)
 * - Range constraints: every integer 0-100 belongs to exactly one category
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getScoreClassification,
  classifyScore,
  SCORE_COLORS,
  formatScoreWithCategory,
} from '../src/utils/scoreClassification.ts';

test('Score Classification: Core Integer Ranges and Colors', async (t) => {
  await t.test('0 and 30 evaluate to Healthy with Yellow (#F4C542)', () => {
    const res0 = getScoreClassification(0);
    assert.equal(res0.category, 'Healthy');
    assert.equal(res0.name, 'Healthy');
    assert.equal(res0.color, '#F4C542');
    assert.equal(res0.minScore, 0);
    assert.equal(res0.maxScore, 30);
    assert.equal(res0.isValid, true);

    const res30 = getScoreClassification(30);
    assert.equal(res30.category, 'Healthy');
    assert.equal(res30.name, 'Healthy');
    assert.equal(res30.color, '#F4C542');
    assert.equal(res30.minScore, 0);
    assert.equal(res30.maxScore, 30);
    assert.equal(res30.isValid, true);

    // Mid-range sample (e.g. 25 from spec)
    const res25 = getScoreClassification(25);
    assert.equal(res25.category, 'Healthy');
    assert.equal(res25.color, SCORE_COLORS.HEALTHY);
  });

  await t.test('31 and 50 evaluate to Moderate with Green (#55B96B)', () => {
    const res31 = getScoreClassification(31);
    assert.equal(res31.category, 'Moderate');
    assert.equal(res31.name, 'Moderate');
    assert.equal(res31.color, '#55B96B');
    assert.equal(res31.minScore, 31);
    assert.equal(res31.maxScore, 50);
    assert.equal(res31.isValid, true);

    const res50 = getScoreClassification(50);
    assert.equal(res50.category, 'Moderate');
    assert.equal(res50.name, 'Moderate');
    assert.equal(res50.color, '#55B96B');
    assert.equal(res50.minScore, 31);
    assert.equal(res50.maxScore, 50);
    assert.equal(res50.isValid, true);

    // Mid-range sample (e.g. 45 from spec)
    const res45 = getScoreClassification(45);
    assert.equal(res45.category, 'Moderate');
    assert.equal(res45.color, SCORE_COLORS.MODERATE);
  });

  await t.test('51 and 70 evaluate to Unhealthy with Navy Blue (#315A91)', () => {
    const res51 = getScoreClassification(51);
    assert.equal(res51.category, 'Unhealthy');
    assert.equal(res51.name, 'Unhealthy');
    assert.equal(res51.color, '#315A91');
    assert.equal(res51.minScore, 51);
    assert.equal(res51.maxScore, 70);
    assert.equal(res51.isValid, true);

    const res70 = getScoreClassification(70);
    assert.equal(res70.category, 'Unhealthy');
    assert.equal(res70.name, 'Unhealthy');
    assert.equal(res70.color, '#315A91');
    assert.equal(res70.minScore, 51);
    assert.equal(res70.maxScore, 70);
    assert.equal(res70.isValid, true);

    // Mid-range sample (e.g. 65 from spec)
    const res65 = getScoreClassification(65);
    assert.equal(res65.category, 'Unhealthy');
    assert.equal(res65.color, SCORE_COLORS.UNHEALTHY);
  });

  await t.test('71 and 100 evaluate to Severe with Red (#E55353)', () => {
    const res71 = getScoreClassification(71);
    assert.equal(res71.category, 'Severe');
    assert.equal(res71.name, 'Severe');
    assert.equal(res71.color, '#E55353');
    assert.equal(res71.minScore, 71);
    assert.equal(res71.maxScore, 100);
    assert.equal(res71.isValid, true);

    const res100 = getScoreClassification(100);
    assert.equal(res100.category, 'Severe');
    assert.equal(res100.name, 'Severe');
    assert.equal(res100.color, '#E55353');
    assert.equal(res100.minScore, 71);
    assert.equal(res100.maxScore, 100);
    assert.equal(res100.isValid, true);

    // Mid-range sample (e.g. 85 from spec)
    const res85 = getScoreClassification(85);
    assert.equal(res85.category, 'Severe');
    assert.equal(res85.color, SCORE_COLORS.SEVERE);
  });

  await t.test('Every integer score from 0 to 100 belongs to exactly one category', () => {
    const validCategories = new Set(['Healthy', 'Moderate', 'Unhealthy', 'Severe']);
    for (let score = 0; score <= 100; score++) {
      const res = getScoreClassification(score);
      assert.ok(validCategories.has(res.category), `Score ${score} has invalid category ${res.category}`);
      assert.ok(res.isValid, `Score ${score} marked as invalid`);
      assert.ok(typeof res.color === 'string' && res.color.startsWith('#'), `Score ${score} has invalid color`);
    }
  });
});

test('Score Classification: Decimal Scores at Boundaries', async (t) => {
  await t.test('Decimals around 30 boundary', () => {
    assert.equal(classifyScore(29.9).category, 'Healthy');
    assert.equal(classifyScore(30.0).category, 'Healthy');
    assert.equal(classifyScore(30.4).category, 'Healthy');
    assert.equal(classifyScore(30.5).category, 'Moderate');
    assert.equal(classifyScore(31.0).category, 'Moderate');
  });

  await t.test('Decimals around 50 boundary', () => {
    assert.equal(classifyScore(49.9).category, 'Moderate');
    assert.equal(classifyScore(50.0).category, 'Moderate');
    assert.equal(classifyScore(50.4).category, 'Moderate');
    assert.equal(classifyScore(50.5).category, 'Unhealthy');
    assert.equal(classifyScore(51.0).category, 'Unhealthy');
  });

  await t.test('Decimals around 70 boundary', () => {
    assert.equal(classifyScore(69.9).category, 'Unhealthy');
    assert.equal(classifyScore(70.0).category, 'Unhealthy');
    assert.equal(classifyScore(70.4).category, 'Unhealthy');
    assert.equal(classifyScore(70.5).category, 'Severe');
    assert.equal(classifyScore(71.0).category, 'Severe');
  });

  await t.test('Decimals near 0 and 100 extremities', () => {
    assert.equal(classifyScore(0.0).category, 'Healthy');
    assert.equal(classifyScore(0.4).category, 'Healthy');
    assert.equal(classifyScore(99.6).category, 'Severe');
    assert.equal(classifyScore(100.0).category, 'Severe');
  });
});

test('Score Classification: Missing and Invalid Values', async (t) => {
  await t.test('null and undefined return Not available with category: null', () => {
    const resNull = getScoreClassification(null);
    assert.equal(resNull.category, null);
    assert.equal(resNull.name, 'Not available');
    assert.equal(resNull.isValid, false);

    const resUndef = getScoreClassification(undefined);
    assert.equal(resUndef.category, null);
    assert.equal(resUndef.name, 'Not available');
    assert.equal(resUndef.isValid, false);
  });

  await t.test('NaN and non-numeric string return Not available', () => {
    const resNaN = getScoreClassification(NaN);
    assert.equal(resNaN.category, null);
    assert.equal(resNaN.name, 'Not available');
    assert.equal(resNaN.isValid, false);

    const resStr = getScoreClassification('not-a-number');
    assert.equal(resStr.category, null);
    assert.equal(resStr.name, 'Not available');
    assert.equal(resStr.isValid, false);

    const resEmpty = getScoreClassification('');
    assert.equal(resEmpty.category, null);
    assert.equal(resEmpty.name, 'Not available');
  });

  await t.test('Scores below 0 and above 100 return Not available safely', () => {
    const resNeg = getScoreClassification(-1);
    assert.equal(resNeg.category, null);
    assert.equal(resNeg.name, 'Not available');
    assert.equal(resNeg.isValid, false);

    const resLow = getScoreClassification(-50);
    assert.equal(resLow.category, null);
    assert.equal(resLow.name, 'Not available');

    const resOver = getScoreClassification(101);
    assert.equal(resOver.category, null);
    assert.equal(resOver.name, 'Not available');
    assert.equal(resOver.isValid, false);

    const resHigh = getScoreClassification(999);
    assert.equal(resHigh.category, null);
    assert.equal(resHigh.name, 'Not available');
  });
});

test('Score Classification: formatScoreWithCategory helper', async (t) => {
  await t.test('Formats valid score with category and matching label', () => {
    assert.equal(formatScoreWithCategory(25), '25 / 100 • Healthy');
    assert.equal(formatScoreWithCategory(45), '45 / 100 • Moderate');
    assert.equal(formatScoreWithCategory(65), '65 / 100 • Unhealthy');
    assert.equal(formatScoreWithCategory(85), '85 / 100 • Severe');
  });

  await t.test('Formats missing or invalid score as Not available', () => {
    assert.equal(formatScoreWithCategory(null), '-- / 100 • Not available');
    assert.equal(formatScoreWithCategory(undefined), '-- / 100 • Not available');
    assert.equal(formatScoreWithCategory(-5), '-- / 100 • Not available');
    assert.equal(formatScoreWithCategory(150), '-- / 100 • Not available');
  });
});
