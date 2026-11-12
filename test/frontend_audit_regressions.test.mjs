/**
 * Frontend audit regressions:
 * - offline mutations stuck IN_PROGRESS are recovered
 * - offline entry updates recreate missing entries instead of 404-looping
 * - entry listing drains every page (clear/export/history are not capped at 30)
 * - SMS hashes do not depend on reference numbers (cross-channel dedupe)
 * - health/usage sync never fabricates data unless explicitly asked to simulate
 */

// Node test runner polyfill for AsyncStorage's web implementation
if (typeof globalThis.window === 'undefined') {
  const memStore = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (memStore.has(key) ? memStore.get(key) : null),
      setItem: (key, val) => memStore.set(key, String(val)),
      removeItem: (key) => memStore.delete(key),
      clear: () => memStore.clear(),
      get length() {
        return memStore.size;
      },
      key: (i) => Array.from(memStore.keys())[i] ?? null,
    },
  };
  globalThis.localStorage = globalThis.window.localStorage;
}

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  entriesApi,
  authApi,
  setAccessToken,
  syncOfflineMutations,
  offlineSyncService,
} from '../src/services/api.ts';
import {
  generateDeterministicHash,
  parseSmsMessage,
} from '../src/services/smsParserService.ts';
import { syncHealthMetrics } from '../src/services/healthSyncService.ts';
import { syncDeviceUsage } from '../src/services/deviceUsageService.ts';

const realFetch = globalThis.fetch;

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  };
}

afterEach(async () => {
  globalThis.fetch = realFetch;
  await setAccessToken(null);
  offlineSyncService.setOnlineStatus(true);
  await offlineSyncService.clearAll();
});

describe('Offline outbox crash recovery', () => {
  it('retries mutations left IN_PROGRESS by a previous process', async () => {
    await offlineSyncService.clearAll();
    const mut = await offlineSyncService.enqueueMutation(
      '/api/telemetry/transactions',
      'POST',
      { amount: 120, merchant: 'Cafe' },
      'user-1'
    );
    await offlineSyncService.updateMutationStatus(mut.id, 'IN_PROGRESS');

    const pending = await offlineSyncService.getPendingMutations('user-1');
    assert.ok(pending.some((m) => m.id === mut.id), 'IN_PROGRESS must be retried');

    let sent = 0;
    const result = await offlineSyncService.reconcilePendingMutations(async () => {
      sent += 1;
      return true;
    }, 'user-1');

    assert.equal(sent, 1);
    assert.equal(result.succeeded, 1);
  });
});

describe('Offline entry update reconciliation', () => {
  it('recreates a missing entry with update fields instead of looping on 404', async () => {
    globalThis.fetch = async (url) => {
      const path = new globalThis.URL(String(url)).pathname;
      if (path === '/api/auth/me') {
        return jsonResponse({ id: 'user-1', email: 'user@example.com' });
      }
      return jsonResponse({}, 200);
    };
    await setAccessToken('test-token');
    await authApi.me();

    await offlineSyncService.clearAll();
    await setAccessToken('test-token');
    await offlineSyncService.enqueueMutation(
      '/api/entries/2026-11-04',
      'PUT',
      { screen_time_hours: 2.5, social_media_hours: 0.5 },
      'user-1'
    );

    let createdBody = null;
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
      const u = new globalThis.URL(String(url));
      calls.push(`${options.method} ${u.pathname}`);
      if (options.method === 'PUT') return jsonResponse({}, 404);
      if (options.method === 'POST' && u.pathname === '/api/entries/') {
        createdBody = JSON.parse(String(options.body));
        return jsonResponse({ entry_id: 'entry-1' }, 201);
      }
      return jsonResponse({}, 500);
    };

    const result = await syncOfflineMutations();
    assert.equal(result.succeeded, 1);
    assert.deepEqual(calls, ['PUT /api/entries/2026-11-04', 'POST /api/entries/']);

    assert.ok(createdBody);
    assert.equal(createdBody.date, '2026-11-04');
    assert.equal(createdBody.screen_time_hours, 2.5);
    assert.equal(createdBody.social_media_hours, 0.5);
    assert.equal(createdBody.sleep_hours, 0, 'required fields must get defaults');
    assert.equal(createdBody.sleep_quality, 3);
    assert.equal(createdBody.daily_spend, 0);
  });

  it('treats a 404 delete as already reconciled', async () => {
    globalThis.fetch = async (url) => {
      if (new globalThis.URL(String(url)).pathname === '/api/auth/me') {
        return jsonResponse({ id: 'user-1', email: 'user@example.com' });
      }
      return jsonResponse({}, 404);
    };
    await setAccessToken('test-token');
    await authApi.me();

    await offlineSyncService.clearAll();
    await setAccessToken('test-token');
    await offlineSyncService.enqueueMutation('/api/entries/2026-11-01', 'DELETE', {}, 'user-1');

    const result = await syncOfflineMutations();
    assert.equal(result.succeeded, 1);
  });
});

describe('Entry listing pagination', () => {
  it('drains every page instead of returning only the first 30 rows', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      const u = new globalThis.URL(String(url));
      urls.push(u);
      const page = Number(u.searchParams.get('page') || 1);
      const pageSize = Number(u.searchParams.get('page_size') || 30);
      const total = 105;
      const start = (page - 1) * pageSize;
      const count = Math.max(0, Math.min(pageSize, total - start));
      return jsonResponse(
        Array.from({ length: count }, (_, i) => ({ id: start + i, date: `2026-01-${start + i + 1}` }))
      );
    };

    const all = await entriesApi.listAll();
    assert.equal(all.length, 105);
    assert.equal(urls.length, 2);
    assert.equal(urls[0].searchParams.get('page'), '1');
    assert.equal(urls[0].searchParams.get('page_size'), '100');
    assert.equal(urls[1].searchParams.get('page'), '2');
  });
});

describe('Cross-channel transaction hashing', () => {
  it('ignores reference numbers so SMS and statements can dedupe the same charge', () => {
    const msgA =
      'A/c *1234 debited for Rs 450.00 on 04-Nov-26 by UPI:swiggy@icici. Ref 1111111111.';
    const msgB =
      'A/c *1234 debited for Rs 450.00 on 04-Nov-26 by UPI:swiggy@icici. Ref 2222222222.';
    const a = parseSmsMessage(msgA, new Date('2026-11-04T13:30:00Z'));
    const b = parseSmsMessage(msgB, new Date('2026-11-04T13:30:00Z'));

    assert.ok(a && b);
    assert.equal(a.external_id, b.external_id);
    assert.equal(
      generateDeterministicHash(450, 'Swiggy', '2026-11-04', 'REF123'),
      generateDeterministicHash(450, 'Swiggy', '2026-11-04')
    );
  });
});

describe('Honest device sync', () => {
  it('refuses to fake health data without an explicit simulation request', async () => {
    await assert.rejects(() => syncHealthMetrics(), /unavailable/i);
  });

  it('refuses to fake device usage without an explicit simulation request', async () => {
    await assert.rejects(() => syncDeviceUsage(), /unavailable/i);
  });
});

describe('Honest web voice capture', () => {
  it('never falls back to a simulated waveform or dummy audio buffer', () => {
    const source = readFileSync(
      new globalThis.URL('../src/services/voiceService.ts', import.meta.url),
      'utf8'
    );
    assert.ok(!source.includes('simulateWebVolume'), 'simulated metering must not return');
    assert.ok(!source.includes('new Uint8Array(1024)'), 'dummy audio buffer must not return');
    assert.ok(source.includes('No audio was captured'));
  });
});
