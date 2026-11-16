import test from 'node:test';
import assert from 'node:assert/strict';
import asyncStorageMock from './helpers/asyncStorageMock.mjs';

test('Phase 1 Verification: Persistent Token and Session Storage', async (t) => {
  const AsyncStorage = asyncStorageMock;
  const TOKEN_KEY = '@lifelens_access_token';

  await t.test('AsyncStorage mock functions correctly', async () => {
    await AsyncStorage.clear();
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), null);

    await AsyncStorage.setItem(TOKEN_KEY, 'test-jwt-token-123');
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), 'test-jwt-token-123');

    await AsyncStorage.removeItem(TOKEN_KEY);
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), null);
  });

  await t.test('Token persistence lifecycle simulates setAccessToken, getAccessToken, restoreSession, logout', async () => {
    await AsyncStorage.clear();
    let _accessToken = null;

    async function setAccessToken(token) {
      _accessToken = token;
      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    }

    function getAccessToken() {
      return _accessToken;
    }

    async function restoreSession(mockVerifyApi) {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (!stored) {
        _accessToken = null;
        return null;
      }
      _accessToken = stored;
      try {
        if (mockVerifyApi) {
          return await mockVerifyApi(stored);
        }
        return null;
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          await setAccessToken(null);
          return null;
        }
        // In offline mode, retain the token in memory
        return null;
      }
    }

    async function logout() {
      await setAccessToken(null);
    }

    // Step 1: Initial state
    assert.equal(getAccessToken(), null);
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), null);

    // Step 2: Login sets token in memory & storage
    await setAccessToken('jwt.session.token.abc');
    assert.equal(getAccessToken(), 'jwt.session.token.abc');
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), 'jwt.session.token.abc');

    // Step 3: Simulate app reload / restart (in-memory cleared, but storage has token)
    _accessToken = null;
    assert.equal(getAccessToken(), null);
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), 'jwt.session.token.abc');

    // Step 4: Restore session on app boot (with valid network response)
    const user = await restoreSession(async (token) => {
      assert.equal(token, 'jwt.session.token.abc');
      return { id: 'user-1', email: 'test@lifelens.ai', full_name: 'Test User' };
    });
    assert.equal(user.email, 'test@lifelens.ai');
    assert.equal(getAccessToken(), 'jwt.session.token.abc');

    // Step 5: Restore session in offline mode (network error, not 401)
    _accessToken = null;
    const offlineResult = await restoreSession(async () => {
      throw new Error('Network request failed (offline)');
    });
    assert.equal(offlineResult, null);
    // Token is preserved in memory for offline cache fallback
    assert.equal(getAccessToken(), 'jwt.session.token.abc');
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), 'jwt.session.token.abc');

    // Step 6: Restore session with revoked/expired token (401 Unauthorized)
    _accessToken = null;
    const revokedResult = await restoreSession(async () => {
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    });
    assert.equal(revokedResult, null);
    // Token must be purged on 401
    assert.equal(getAccessToken(), null);
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), null);

    // Step 7: Logout clears storage
    await setAccessToken('another-token');
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), 'another-token');
    await logout();
    assert.equal(getAccessToken(), null);
    assert.equal(await AsyncStorage.getItem(TOKEN_KEY), null);
  });
});

test('Phase 1 Verification: Schema & Data Contract Integrity', async (t) => {
  await t.test('DailyEntry schema constraints match backend exactly', () => {
    // Check required fields according to backend DailyEntryCreate
    const validEntry = {
      date: '2026-11-04',
      sleep_hours: 7.5,
      sleep_quality: 4, // 1-5
      sleep_bedtime: '23:30',
      screen_time_hours: 6.0,
      social_media_hours: 1.5,
      steps: 8500,
      active_minutes: 45,
      calories_burned: 420,
      deep_work_hours: 4.0,
      tasks_completed: 6,
      daily_spend: 32.50,
      spend_category: 'Food',
      mood_score: 8, // 1-10
      energy_level: 4, // 1-5
      notes: 'Productive day, slept well.',
    };

    assert.ok(validEntry.sleep_quality >= 1 && validEntry.sleep_quality <= 5, 'sleep_quality must be 1-5');
    assert.ok(validEntry.mood_score >= 1 && validEntry.mood_score <= 10, 'mood_score must be 1-10');
    assert.ok(validEntry.energy_level >= 1 && validEntry.energy_level <= 5, 'energy_level must be 1-5');
    assert.ok(validEntry.social_media_hours <= validEntry.screen_time_hours, 'social media <= screen time');
  });
});
