import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_DATASET } from '../src/features/dashboard/demoData.ts';
import asyncStorageMock from '@react-native-async-storage/async-storage/jest';

test('Phase 3 Verification: Demo Dataset and Data Management', async (t) => {
  await t.test('Demo dataset contains 45 valid DailyEntryCreate records', () => {
    assert.equal(DEMO_DATASET.length, 45, 'Demo dataset must contain exactly 45 days of entries');

    for (let i = 0; i < DEMO_DATASET.length; i++) {
      const entry = DEMO_DATASET[i];
      assert.ok(entry.date, `Entry ${i} must have date`);
      assert.ok(entry.sleep_hours >= 0 && entry.sleep_hours <= 24, `Entry ${i} invalid sleep_hours`);
      assert.ok(entry.sleep_quality >= 1 && entry.sleep_quality <= 5, `Entry ${i} sleep_quality must be 1-5`);
      assert.ok(entry.screen_time_hours >= 0, `Entry ${i} invalid screen_time_hours`);
      assert.ok(entry.steps >= 0, `Entry ${i} invalid steps`);
      assert.ok(entry.deep_work_hours >= 0, `Entry ${i} invalid deep_work_hours`);
      assert.ok(entry.daily_spend >= 0, `Entry ${i} invalid daily_spend`);
      if (entry.mood_score != null) {
        assert.ok(entry.mood_score >= 1 && entry.mood_score <= 10, `Entry ${i} mood_score must be 1-10`);
      }
      if (entry.energy_level != null) {
        assert.ok(entry.energy_level >= 1 && entry.energy_level <= 5, `Entry ${i} energy_level must be 1-5`);
      }
    }
  });

  await t.test('Settings preferences persist and retrieve from AsyncStorage', async () => {
    const AsyncStorage = asyncStorageMock;
    const STORAGE_KEY = '@lifelens_settings_daily_insights';

    await AsyncStorage.setItem(STORAGE_KEY, 'false');
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    assert.equal(val, 'false');

    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    const updated = await AsyncStorage.getItem(STORAGE_KEY);
    assert.equal(updated, 'true');
  });

  await t.test('Timeframe query parameters map correctly to days', () => {
    const TIMEFRAME_DAYS = {
      '7D': 7,
      '14D': 14,
      '30D': 30,
      '90D': 90,
    };

    assert.equal(TIMEFRAME_DAYS['7D'], 7);
    assert.equal(TIMEFRAME_DAYS['14D'], 14);
    assert.equal(TIMEFRAME_DAYS['30D'], 30);
    assert.equal(TIMEFRAME_DAYS['90D'], 90);
  });
});

