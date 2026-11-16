/**
 * Phase 5 Verification: Automated Device Connectors & Native Ingestion
 *
 * Verifies:
 * 1. On-Device SMS Transaction Parser (UPI, HDFC, SBI, ICICI, Axis, Paytm, PhonePe, Grab, USD/SGD).
 * 2. Privacy & Security: Strict rejection of OTPs, promo spam, and pure balance inquiries.
 * 3. Categorization & Discretionary classification heuristics.
 * 4. Deterministic hash deduplication stability.
 * 5. Apple Health & Google Health Connect sleep stage coalescing, bedtime extraction, and quality math.
 * 6. Device Screen Time & App Usage package mapping and circadian late-night detection (22:00 - 05:00).
 * 7. Bank Statement CSV parser with multi-bank format support.
 * 8. Ingestion API client endpoints, headers, and sync orchestration.
 */

// Node test runner environment polyfills for AsyncStorage Web implementation
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

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isNonTransactionalMessage,
  extractReferenceNumber,
  generateDeterministicHash,
  parseSmsMessage,
  parseSmsBatch,
} from '../src/services/smsParserService.ts';

import {
  calculateSleepMetrics,
  normalizeHealthData,
  generateSimulatedHealthMetrics,
} from '../src/services/healthSyncService.ts';

import {
  resolvePackageInfo,
  isLateNightHour,
  processRawAppSessions,
} from '../src/services/deviceUsageService.ts';

import {
  parseCsvStatementText,
} from '../src/services/statementParserService.ts';

import {
  ingestionApi,
  setAccessToken,
} from '../src/services/api.ts';

// ── 1. On-Device SMS Transaction Parser ──────────────────────────────────────

test('Phase 5.1: On-Device SMS Parser — Extraction & Categorization', async (t) => {
  await t.test('Parses HDFC UPI transaction alert', () => {
    const msg = 'A/c *1234 debited for Rs 450.00 on 04-Nov-26 by UPI:swiggy@icici. Ref 1234567890. Bal: Rs 14,000.';
    const parsed = parseSmsMessage(msg, new Date('2026-11-04T13:30:00Z'));

    assert.ok(parsed);
    assert.equal(parsed.amount, 450.0);
    assert.equal(parsed.currency, 'INR');
    assert.equal(parsed.merchant, 'Swiggy');
    assert.equal(parsed.category, 'Food & Dining');
    assert.equal(parsed.is_discretionary, true);
    assert.ok(parsed.external_id);
  });

  await t.test('Parses SBI debit message with cab transportation', () => {
    const msg = 'Dear SBI User, your A/c ending 5678 debited by Rs 280.50 on 04Nov26 transfer to Uber via UPI.';
    const parsed = parseSmsMessage(msg, new Date('2026-11-04T18:00:00Z'));

    assert.ok(parsed);
    assert.equal(parsed.amount, 280.5);
    assert.equal(parsed.merchant, 'Uber');
    assert.equal(parsed.category, 'Transportation');
    assert.equal(parsed.is_discretionary, false);
  });

  await t.test('Parses ICICI card shopping spend', () => {
    const msg = 'Spent Rs.1,299.00 on ICICI Card ending 4321 at ZOMATO on 05-Nov-2026. Avail Lmt: Rs 45,000.';
    const parsed = parseSmsMessage(msg, new Date('2026-11-05T20:15:00Z'));

    assert.ok(parsed);
    assert.equal(parsed.amount, 1299.0);
    assert.equal(parsed.merchant, 'Zomato');
    assert.equal(parsed.category, 'Food & Dining');
    assert.equal(parsed.is_discretionary, true);
  });

  await t.test('Parses Axis Bank ecommerce debit', () => {
    const msg = 'INR 3,450.00 debited from A/c XX9876 on 06/11/2026. Info: Amazon India.';
    const parsed = parseSmsMessage(msg, new Date('2026-11-06T11:00:00Z'));

    assert.ok(parsed);
    assert.equal(parsed.amount, 3450.0);
    assert.equal(parsed.merchant, 'Amazon India');
    assert.equal(parsed.category, 'Shopping');
    assert.equal(parsed.is_discretionary, true);
  });

  await t.test('Parses Paytm UPI Starbucks coffee purchase', () => {
    const msg = 'Alert: Paid INR 540 to STARBUCKS using Paytm UPI. Ref: 99887766.';
    const parsed = parseSmsMessage(msg, new Date('2026-11-07T09:00:00Z'));

    assert.ok(parsed);
    assert.equal(parsed.amount, 540.0);
    assert.equal(parsed.merchant, 'Starbucks');
    assert.equal(parsed.category, 'Food & Dining');
  });

  await t.test('Parses international USD and SGD debits', () => {
    const usMsg = 'USD 45.00 charged on card ending 1122 at NETFLIX on 01-Nov-2026.';
    const usParsed = parseSmsMessage(usMsg);
    assert.ok(usParsed);
    assert.equal(usParsed.amount, 45.0);
    assert.equal(usParsed.currency, 'USD');
    assert.equal(usParsed.category, 'Entertainment');
    assert.equal(usParsed.is_discretionary, true);

    const sgMsg = 'SGD 18.50 spent at Grab on 02-Nov-2026.';
    const sgParsed = parseSmsMessage(sgMsg);
    assert.ok(sgParsed);
    assert.equal(sgParsed.amount, 18.5);
    assert.equal(sgParsed.currency, 'SGD');
  });

  await t.test('Extracts reference numbers accurately', () => {
    assert.equal(extractReferenceNumber('UPI Ref: 1234567890'), '1234567890');
    assert.equal(extractReferenceNumber('Txn Id: TXN998877'), 'TXN998877');
    assert.equal(extractReferenceNumber('No reference here'), null);
  });
});

// ── 2. Privacy & Security Rules: Reject OTP, Balance Spam & Non-Debits ───────

test('Phase 5.2: SMS Parser — Privacy & Security Verification', async (t) => {
  await t.test('Strictly rejects OTP and 2FA authentication messages', () => {
    const otpSamples = [
      'Your OTP is 482910 for transaction on ICICI Card. Do not share OTP with anyone.',
      '492019 is your One Time Password to authorize payment of Rs 1,450 to Swiggy.',
      'Security code: 819203. Valid for 10 minutes. Never share this with bank officials.',
    ];
    for (const sample of otpSamples) {
      assert.equal(isNonTransactionalMessage(sample), true);
      assert.equal(parseSmsMessage(sample), null);
    }
  });

  await t.test('Strictly rejects pure balance inquiries without debits', () => {
    const balanceSamples = [
      'Your available balance in A/c *1234 is Rs. 45,210.50 as of 07-Nov-26.',
      'Dear Customer, Bal for A/c ending 9876 is INR 12,000.00.',
    ];
    for (const sample of balanceSamples) {
      assert.equal(isNonTransactionalMessage(sample), true);
      assert.equal(parseSmsMessage(sample), null);
    }
  });

  await t.test('Strictly rejects promotional marketing and loan spam', () => {
    const spamSamples = [
      'Congrats! You have pre-approved personal loan of Rs 5,00,000. Apply now at link.',
      'Get instant loan up to 2 Lakhs with zero documentation. Click here.',
      'Congratulations! 100 cashback credited to wallet. Click to claim.',
    ];
    for (const sample of spamSamples) {
      assert.equal(isNonTransactionalMessage(sample), true);
      assert.equal(parseSmsMessage(sample), null);
    }
  });

  await t.test('Rejects credit/salary deposit messages from expense tracking', () => {
    const creditMsg = 'INR 85,000.00 credited to your A/c *1234 on 01-Nov-2026 by NEFT-Salary.';
    assert.equal(parseSmsMessage(creditMsg), null);
  });

  await t.test('Handles malformed, empty, and non-string inputs safely', () => {
    assert.equal(parseSmsMessage(''), null);
    assert.equal(parseSmsMessage(null), null);
    assert.equal(parseSmsMessage(undefined), null);
    assert.equal(parseSmsMessage('Just a random chat message: see you at 5'), null);
  });
});

// ── 3. Deterministic Deduplication Hashing ────────────────────────────────────

test('Phase 5.3: Deduplication Hash Stability', async (t) => {
  await t.test('Generates identical hash for identical transaction attributes', () => {
    const h1 = generateDeterministicHash(450.0, 'Swiggy', '2026-11-04', 'REF123');
    const h2 = generateDeterministicHash(450.0, 'swiggy', '2026-11-04', 'ref123');
    assert.equal(h1, h2);
    assert.equal(typeof h1, 'string');
    assert.equal(h1.length, 32);
  });

  await t.test('Generates distinct hashes for different amounts or merchants', () => {
    const h1 = generateDeterministicHash(450.0, 'Swiggy', '2026-11-04');
    const h2 = generateDeterministicHash(451.0, 'Swiggy', '2026-11-04');
    const h3 = generateDeterministicHash(450.0, 'Zomato', '2026-11-04');

    assert.notEqual(h1, h2);
    assert.notEqual(h1, h3);
  });

  await t.test('parseSmsBatch eliminates duplicate SMS alerts', () => {
    const batch = [
      { body: 'A/c *1234 debited for Rs 450.00 on 04-Nov-26 by UPI:swiggy@icici. Ref 123.', date: '2026-11-04T12:00:00Z' },
      { body: 'A/c *1234 debited for Rs 450.00 on 04-Nov-26 by UPI:swiggy@icici. Ref 123.', date: '2026-11-04T12:00:00Z' },
      { body: 'Spent Rs.280 at Uber on 04-Nov-2026. Ref 456.', date: '2026-11-04T14:00:00Z' },
    ];
    const parsed = parseSmsBatch(batch);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].amount, 450.0);
    assert.equal(parsed[1].amount, 280.0);
  });
});

// ── 4. Apple Health & Google Health Connect Coalescing ────────────────────────

test('Phase 5.4: HealthKit & Health Connect Normalization', async (t) => {
  await t.test('Correctly coalesces sleep stages and ignores awake/in-bed', () => {
    const samples = [
      { startDate: '2026-11-04T23:00:00Z', endDate: '2026-11-05T00:30:00Z', stage: 'CORE' }, // 90 min
      { startDate: '2026-11-05T00:30:00Z', endDate: '2026-11-05T02:00:00Z', stage: 'DEEP' }, // 90 min
      { startDate: '2026-11-05T02:00:00Z', endDate: '2026-11-05T03:30:00Z', stage: 'REM' },  // 90 min
      { startDate: '2026-11-05T03:30:00Z', endDate: '2026-11-05T03:45:00Z', stage: 'AWAKE' },// 15 min awake
      { startDate: '2026-11-05T03:45:00Z', endDate: '2026-11-05T06:45:00Z', stage: 'CORE' }, // 180 min
    ];

    const { totalSleepHours, sleepQuality, bedtime, deepRatio, remRatio } = calculateSleepMetrics(samples);

    // 90 + 90 + 90 + 180 = 450 min = 7.5 hours
    assert.equal(totalSleepHours, 7.5);
    assert.ok(bedtime !== null);
    assert.equal(deepRatio, 0.2); // 90 / 450 = 0.20
    assert.equal(remRatio, 0.2);  // 90 / 450 = 0.20
    assert.ok(sleepQuality >= 4); // High quality
  });

  await t.test('Handles empty sleep samples array safely', () => {
    const res = calculateSleepMetrics([]);
    assert.equal(res.totalSleepHours, 0);
    assert.equal(res.sleepQuality, 3);
    assert.equal(res.bedtime, null);
  });

  await t.test('normalizeHealthData formats complete payload', () => {
    const raw = generateSimulatedHealthMetrics('2026-11-04');
    const normalized = normalizeHealthData(raw, 'APPLE_HEALTH');

    assert.equal(normalized.date, '2026-11-04');
    assert.equal(normalized.source, 'APPLE_HEALTH');
    assert.ok(normalized.sleep_hours > 6.0);
    assert.ok(normalized.steps > 5000);
    assert.equal(normalized.auto_merge_daily_entry, true);
  });
});

// ── 5. Device Usage & Screen Time Bridge ──────────────────────────────────────

test('Phase 5.5: Device Usage & Circadian Late-Night Detection', async (t) => {
  await t.test('Resolves package identifiers into human names & categories', () => {
    const p1 = resolvePackageInfo('com.instagram.android');
    assert.equal(p1.appName, 'Instagram');
    assert.equal(p1.category, 'Social Media');

    const p2 = resolvePackageInfo('com.google.android.youtube');
    assert.equal(p2.appName, 'YouTube');
    assert.equal(p2.category, 'Entertainment');

    const p3 = resolvePackageInfo('com.slack');
    assert.equal(p3.appName, 'Slack');
    assert.equal(p3.category, 'Productivity');

    const p4 = resolvePackageInfo('com.whatsapp');
    assert.equal(p4.appName, 'WhatsApp');
    assert.equal(p4.category, 'Communication');
  });

  await t.test('Correctly identifies circadian late-night hours (22:00 - 05:00)', () => {
    assert.equal(isLateNightHour(new Date('2026-11-04T22:30:00')), true);
    assert.equal(isLateNightHour(new Date('2026-11-04T23:45:00')), true);
    assert.equal(isLateNightHour(new Date('2026-11-04T01:15:00')), true);
    assert.equal(isLateNightHour(new Date('2026-11-04T04:59:00')), true);

    // Daytime hours
    assert.equal(isLateNightHour(new Date('2026-11-04T10:00:00')), false);
    assert.equal(isLateNightHour(new Date('2026-11-04T14:30:00')), false);
    assert.equal(isLateNightHour(new Date('2026-11-04T21:59:00')), false);
  });

  await t.test('Aggregates total screen time and social media hours', () => {
    const raw = [
      { packageName: 'com.instagram.android', durationMinutes: 60, startTime: '2026-11-04T13:00:00' },
      { packageName: 'com.slack', durationMinutes: 120, startTime: '2026-11-04T10:00:00' },
      { packageName: 'com.instagram.android', durationMinutes: 30, startTime: '2026-11-04T23:30:00' }, // Late night
    ];

    const payload = processRawAppSessions('2026-11-04', raw, 45);

    // Total = 60 + 120 + 30 = 210 min = 3.5 hrs
    assert.equal(payload.total_screen_time_hours, 3.5);
    // Social = 60 + 30 = 90 min = 1.5 hrs
    assert.equal(payload.social_media_hours, 1.5);
    assert.equal(payload.sessions.length, 3);
    assert.equal(payload.sessions[2].is_late_night, true);
  });
});

// ── 6. Bank Statement CSV Parser ──────────────────────────────────────────────

test('Phase 5.6: Bank Statement CSV Parser', async (t) => {
  await t.test('Parses HDFC/Indian bank format with withdrawal and deposit columns', () => {
    const csv = `Date,Narration,Withdrawal Amount,Deposit Amount,Closing Balance
04/11/2026,UPI-SWIGGY-REST,450.00,,15000.00
05/11/2026,SALARY DEPOSIT,,80000.00,95000.00
06/11/2026,UBER TRIP BANGALORE,280.00,,94720.00`;

    const txs = parseCsvStatementText(csv);
    assert.equal(txs.length, 2); // only debits parsed
    assert.equal(txs[0].amount, 450.0);
    assert.equal(txs[0].category, 'Food & Dining');
    assert.equal(txs[1].amount, 280.0);
    assert.equal(txs[1].category, 'Transportation');
  });

  await t.test('Parses Chase US style format with debit/credit indicator', () => {
    const csv = `Transaction Date,Description,Type,Amount
2026-11-04,STARBUCKS STORE #124,Debit,-6.50
2026-11-05,PAYROLL CREDIT,Credit,2500.00
2026-11-06,AMAZON.COM RETAIL,Debit,-45.99`;

    const txs = parseCsvStatementText(csv, 'USD');
    assert.equal(txs.length, 2);
    assert.equal(txs[0].amount, 6.5);
    assert.equal(txs[0].currency, 'USD');
    assert.equal(txs[1].amount, 45.99);
  });

  await t.test('Safely handles empty and invalid CSV texts', () => {
    assert.deepEqual(parseCsvStatementText(''), []);
    assert.deepEqual(parseCsvStatementText('Header1,Header2\nValue1,Value2'), []);
  });

  await t.test('Skips rows with corrupted dates without corrupting historical date', () => {
    const csv = `Date,Narration,Withdrawal Amount
INVALID_DATE,CORRUPTED ROW,100.00
05/11/2026 14:30:00,VALID ROW,250.00`;
    const txs = parseCsvStatementText(csv);
    assert.equal(txs.length, 1);
    assert.equal(txs[0].amount, 250.0);
    assert.ok(txs[0].timestamp.includes('2026-11-05'));
  });

  await t.test('Verifies integer and float deterministic hash parity', () => {
    const h1 = generateDeterministicHash(500, 'Starbucks', '2026-11-08T10:00:00Z', 'REF123');
    const h2 = generateDeterministicHash(500.0, 'Starbucks', '2026-11-08T10:00:00Z', 'REF123');
    const h3 = generateDeterministicHash(500, 'Starbucks', '2026-11-08T10:00:00Z', 'OTHER-REF');
    assert.equal(h1, h2);
    // Reference numbers differ between SMS alerts and statements, so they must not
    // change the hash or the same charge would be counted twice.
    assert.equal(h1, h3);
    assert.equal(h1.length, 32);
  });
});

// ── 7. Ingestion API Client Contracts ─────────────────────────────────────────

test('Phase 5.7: Ingestion API Client Contracts', async (t) => {
  const originalFetch = globalThis.fetch;
  let lastRequest = null;

  globalThis.fetch = async (url, options = {}) => {
    lastRequest = { url, options };
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ success: true, url, method: options.method || 'GET' }),
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('ingestionApi.getConnectors calls GET /api/ingestion/connectors', async () => {
    await setAccessToken('test-connector-token');
    await ingestionApi.getConnectors();

    assert.ok(lastRequest);
    assert.match(lastRequest.url, /\/api\/ingestion\/connectors$/);
    assert.equal(lastRequest.options.method, 'GET');
    assert.equal(lastRequest.options.headers['Authorization'], 'Bearer test-connector-token');
  });

  await t.test('ingestionApi.toggleConnector sends POST to toggle', async () => {
    await ingestionApi.toggleConnector('SMS_PARSER', false);

    assert.ok(lastRequest);
    assert.match(lastRequest.url, /\/api\/ingestion\/connectors\/SMS_PARSER\/toggle$/);
    assert.equal(lastRequest.options.method, 'POST');
    assert.equal(lastRequest.options.body, JSON.stringify({ is_enabled: false }));
  });

  await t.test('ingestionApi.ingestHealth sends POST /api/ingestion/health', async () => {
    const payload = {
      date: '2026-11-04',
      source: 'APPLE_HEALTH',
      sleep_hours: 7.5,
      sleep_quality: 4,
      steps: 9200,
      auto_merge_daily_entry: true,
    };
    await ingestionApi.ingestHealth(payload);

    assert.ok(lastRequest);
    assert.match(lastRequest.url, /\/api\/ingestion\/health$/);
    assert.equal(lastRequest.options.method, 'POST');
    assert.equal(lastRequest.options.body, JSON.stringify(payload));
  });

  await t.test('ingestionApi.ingestUsage sends POST /api/ingestion/usage', async () => {
    const payload = {
      date: '2026-11-04',
      device_platform: 'ANDROID',
      total_screen_time_hours: 3.5,
      sessions: [],
      auto_merge_daily_entry: true,
    };
    await ingestionApi.ingestUsage(payload);

    assert.ok(lastRequest);
    assert.match(lastRequest.url, /\/api\/ingestion\/usage$/);
    assert.equal(lastRequest.options.method, 'POST');
  });

  await t.test('ingestionApi.ingestSms sends POST /api/ingestion/financial/sms', async () => {
    const payload = {
      transactions: [
        {
          amount: 450,
          merchant: 'Swiggy',
          category: 'Food & Dining',
          timestamp: '2026-11-04T12:00:00Z',
          is_discretionary: true,
          external_id: 'hash123',
          currency: 'INR',
        },
      ],
      device_platform: 'ANDROID',
      auto_merge_daily_entry: true,
    };
    await ingestionApi.ingestSms(payload);

    assert.ok(lastRequest);
    assert.match(lastRequest.url, /\/api\/ingestion\/financial\/sms$/);
    assert.equal(lastRequest.options.method, 'POST');
  });

  await t.test('ingestionApi.triggerSync sends POST /api/ingestion/sync', async () => {
    await ingestionApi.triggerSync();

    assert.ok(lastRequest);
    assert.match(lastRequest.url, /\/api\/ingestion\/sync$/);
    assert.equal(lastRequest.options.method, 'POST');
  });
});
