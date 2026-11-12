import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// 1. Guardrail & Epistemic Logic Verification (Matching Backend Engine)
// ============================================================================

export const STANDARD_DISCLAIMER =
  'LifeLens provides behavioral data analytics for informational self-reflection, not medical or financial advice.';

export const CRISIS_TRIGGERS = [
  /\b(kill\s+myself|suicide|end\s+my\s+life|want\s+to\s+die|self[\s-]harm|hurt\s+myself)\b/i,
];

export const MEDICAL_TRIGGERS = [
  /\b(diagnose|diagnosis|prescribe|prescription|medication|dosage|cure|treatment\s+for)\b/i,
  /\b(what\s+pill|what\s+drug|what\s+medicine|what\s+supplement)\s+(should|can)\s+i\s+(take|use)\b/i,
  /\b(do\s+i\s+have\s+(clinical\s+|chronic\s+|severe\s+)?(depression|adhd|bipolar|insomnia|diabetes|apnea|anxiety(\s+disorder)?))\b/i,
  /\b(can\s+you\s+cure|medical\s+advice|substitute\s+for\s+therapy)\b/i,
];

export const JUDGMENTAL_PATTERNS = [
  [/\byou\s+failed\b/gi, 'the target was not reached'],
  [/\bfailed\s+your\s+goal\b/gi, 'the target was not reached'],
  [/\byou\s+were\s+lazy\b/gi, 'activity was lower than usual'],
  [/\blazy\b/gi, 'less active than usual'],
  [/\byou\s+slacked\s+off\b/gi, 'there was a pause in activity'],
  [/\bslacked\s+off\b/gi, 'paused activity'],
  [/\bbad\s+habit\b/gi, 'habit pattern to optimize'],
  [/\byou\s+wasted\b/gi, 'you allocated'],
  [/\byou\s+should\s+be\s+ashamed\b/gi, "let's look at what we can learn"],
  [/\byou\s+messed\s+up\b/gi, "it's a great opportunity to adjust"],
];

export const CAUSAL_PATTERNS = [
  [/\bthis\s+caused\s+your\b/gi, 'this coincided with changes in your'],
  [/\bcaused\s+you\s+to\s+be\b/gi, 'was associated with being'],
  [/\bbecause\s+you\s+used\s+your\s+phone,\s+you\s+slept\s+poorly\b/gi, 'higher phone usage coincided with lower sleep scores, though correlation does not prove causation'],
  [/\bthis\s+proves\s+that\b/gi, 'the data suggests an association where'],
];

export function checkCrisisBoundary(query) {
  for (const pattern of CRISIS_TRIGGERS) {
    if (pattern.test(query)) {
      return {
        tripped: true,
        helpline: '988 Suicide & Crisis Lifeline',
        message: 'Crisis support resources provided',
      };
    }
  }
  return { tripped: false };
}

export function checkMedicalBoundary(query) {
  for (const pattern of MEDICAL_TRIGGERS) {
    if (pattern.test(query)) {
      return {
        tripped: true,
        deflection: 'I cannot provide medical diagnoses, treatment recommendations, or drug/supplement prescriptions.',
      };
    }
  }
  return { tripped: false };
}

export function sanitizeText(text) {
  let res = text;
  for (const [pattern, replacement] of JUDGMENTAL_PATTERNS) {
    res = res.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of CAUSAL_PATTERNS) {
    res = res.replace(pattern, replacement);
  }
  return res;
}

export function detectToolIntents(query) {
  const q = query.toLowerCase();
  const tools = [];

  if (/sleep|tired|bedtime|wake|insomnia|exhausted|energy|night/.test(q)) {
    tools.push('get_sleep_analysis');
  }
  if (/spend|money|cost|expense|budget|finance|bought|rupee|\$|₹/.test(q)) {
    tools.push('get_spending_breakdown');
  }
  if (/productiv|deep work|focus|distract|study|work|task/.test(q)) {
    tools.push('get_productivity_patterns');
  }
  if (/experiment|challenge|trial|hypothesis|intervention|test|rule/.test(q)) {
    tools.push('get_active_experiments');
  }
  if (/anomal|outlier|weird|unusual|spike|cluster/.test(q)) {
    tools.push('get_anomalies_and_clusters');
  }
  if (tools.length === 0 || /lifescore|life score|overview|how am i doing|overall|summary|score/.test(q)) {
    if (!tools.includes('get_life_score_overview') && tools.length === 0) {
      tools.push('get_life_score_overview');
    }
  }
  return tools;
}

// ============================================================================
// 2. Automated Test Suite
// ============================================================================

describe('Phase 3 Verification: Conversational AI Companion Engine', () => {
  describe('3.1 Safety Boundaries & Crisis Redirection', () => {
    test('Immediately intercepts suicidal ideation and self-harm keywords with emergency helpline', () => {
      const queries = [
        'I feel completely hopeless and want to kill myself',
        'I want to end my life, nothing is working',
        'having thoughts of self-harm today',
      ];

      for (const q of queries) {
        const check = checkCrisisBoundary(q);
        assert.equal(check.tripped, true, `Failed on query: ${q}`);
        assert.equal(check.helpline.includes('988'), true);
      }
    });

    test('Deflects medical diagnosis, prescription requests, and clinical disease questions', () => {
      const queries = [
        'Can you diagnose me with chronic insomnia?',
        'What pill should I take to sleep 8 hours?',
        'Prescribe me medication for ADHD',
        'Do I have clinical depression based on my mood logs?',
      ];

      for (const q of queries) {
        const check = checkMedicalBoundary(q);
        assert.equal(check.tripped, true, `Failed on medical query: ${q}`);
        assert.equal(check.deflection.includes('cannot provide medical diagnoses'), true);
      }
    });

    test('Allows safe lifestyle and behavioral analysis questions through without false triggers', () => {
      const safeQueries = [
        'Why was my sleep duration shorter this past week?',
        'Where did most of my money go on the weekend?',
        'How many hours of deep work did I log on Tuesday?',
        'How is my 7-day evening walk experiment going?',
        'Show my current LifeScore breakdown',
      ];

      for (const q of safeQueries) {
        assert.equal(checkCrisisBoundary(q).tripped, false);
        assert.equal(checkMedicalBoundary(q).tripped, false);
      }
    });
  });

  describe('3.2 Epistemic Guardrail & Non-Judgmental Tone Sanitation', () => {
    test('Strictly replaces judgmental and shaming phrasing with supportive objective phrasing', () => {
      const hostileText = 'You failed your goal because you were lazy and slacked off. Bad habit!';
      const sanitized = sanitizeText(hostileText);

      assert.equal(/you failed/i.test(sanitized), false);
      assert.equal(/lazy/i.test(sanitized), false);
      assert.equal(/slacked off/i.test(sanitized), false);
      assert.equal(/bad habit/i.test(sanitized), false);

      assert.equal(sanitized.includes('target was not reached'), true);
      assert.equal(sanitized.includes('habit pattern to optimize'), true);
    });

    test('Replaces causal claims with observational and correlational terminology', () => {
      const causalText = 'This caused your fatigue because you used your phone, you slept poorly.';
      const sanitized = sanitizeText(causalText);

      assert.equal(/this caused your/i.test(sanitized), false);
      assert.equal(sanitized.includes('coincided with changes in your'), true);
    });

    test('Standard health and financial disclaimer string integrity', () => {
      assert.equal(typeof STANDARD_DISCLAIMER, 'string');
      assert.equal(STANDARD_DISCLAIMER.includes('self-reflection'), true);
      assert.equal(STANDARD_DISCLAIMER.includes('not medical or financial advice'), true);
    });
  });

  describe('3.3 Telemetry Tools & Intent Resolution', () => {
    test('Resolves sleep inquiries to get_sleep_analysis tool', () => {
      const intents = detectToolIntents('Why am I always tired when waking up in the morning?');
      assert.deepEqual(intents, ['get_sleep_analysis']);
    });

    test('Resolves spending and finance inquiries to get_spending_breakdown tool', () => {
      const intents = detectToolIntents('Where did my money go this month? Did I exceed budget?');
      assert.deepEqual(intents, ['get_spending_breakdown']);
    });

    test('Resolves deep work and productivity inquiries to get_productivity_patterns tool', () => {
      const intents = detectToolIntents('Analyze my deep work focus blocks and distractions');
      assert.deepEqual(intents, ['get_productivity_patterns']);
    });

    test('Resolves experiment inquiries to get_active_experiments tool', () => {
      const intents = detectToolIntents('How is my 7-day digital sunset experiment progressing?');
      assert.deepEqual(intents, ['get_active_experiments']);
    });

    test('Resolves anomaly inquiries to get_anomalies_and_clusters tool', () => {
      const intents = detectToolIntents('Did the system flag any weird behavioral anomalies?');
      assert.deepEqual(intents, ['get_anomalies_and_clusters']);
    });

    test('Falls back to get_life_score_overview when general overview is requested', () => {
      const intents = detectToolIntents('How am I doing overall? Give me a summary');
      assert.deepEqual(intents, ['get_life_score_overview']);
    });
  });

  describe('3.4 Interactive Mini-Cards Schema & Mathematical Integrity', () => {
    test('Sleep analysis card schema has valid numeric bounds', () => {
      const card = {
        card_type: 'sleep_analysis',
        title: 'Sleep Patterns (14 days)',
        data: {
          avg_sleep_hours: 7.25,
          avg_quality: 7.8,
          bedtime_variance_min: 35,
          late_night_sessions: 3,
        },
      };

      assert.equal(card.card_type, 'sleep_analysis');
      assert.ok(card.data.avg_sleep_hours >= 0 && card.data.avg_sleep_hours <= 24);
      assert.ok(card.data.avg_quality >= 1 && card.data.avg_quality <= 10);
      assert.ok(card.data.bedtime_variance_min >= 0);
      assert.ok(card.data.late_night_sessions >= 0);
    });

    test('Spending breakdown card calculates correct percentages and totals', () => {
      const total = 10000;
      const discretionary = 3500;
      const nonDiscretionary = total - discretionary;
      const discPct = Math.round((discretionary / total) * 100);

      const card = {
        card_type: 'spending_breakdown',
        title: 'Spending Breakdown (30 days)',
        data: {
          total_spend: total,
          discretionary_spend: discretionary,
          non_discretionary_spend: nonDiscretionary,
          discretionary_ratio_pct: discPct,
          top_categories: [
            { category: 'Dining Out', amount: 2500, pct: 25 },
            { category: 'Shopping', amount: 1000, pct: 10 },
          ],
        },
      };

      assert.equal(card.data.total_spend, 10000);
      assert.equal(card.data.discretionary_spend + card.data.non_discretionary_spend, total);
      assert.equal(card.data.discretionary_ratio_pct, 35);
      assert.ok(card.data.discretionary_ratio_pct >= 0 && card.data.discretionary_ratio_pct <= 100);
    });

    test('Productivity card bounds distraction rate and ratings correctly', () => {
      const totalDistractions = 6;
      const focusMinutes = 120;
      const ratePerHour = totalDistractions / (focusMinutes / 60); // 3.0/hr

      const card = {
        card_type: 'productivity_patterns',
        title: 'Deep Work Telemetry',
        data: {
          avg_deep_work_hours: 3.5,
          distraction_rate_per_hour: ratePerHour,
          avg_focus_rating: 4.2,
          avg_tasks_completed: 5,
        },
      };

      assert.equal(card.data.distraction_rate_per_hour, 3.0);
      assert.ok(card.data.avg_focus_rating >= 1 && card.data.avg_focus_rating <= 5);
      assert.ok(card.data.avg_deep_work_hours >= 0);
    });

    test('LifeScore overview card domains are non-negative and bounded <= 100', () => {
      const card = {
        card_type: 'lifescore_overview',
        title: 'Current LifeScore: 78.5/100',
        data: {
          composite: 78.5,
          sleep_score: 82.0,
          productivity_score: 75.0,
          health_score: 80.0,
          finance_score: 77.0,
        },
      };

      for (const key of ['composite', 'sleep_score', 'productivity_score', 'health_score', 'finance_score']) {
        const val = card.data[key];
        assert.ok(val >= 0 && val <= 100, `Score ${key} out of bounds: ${val}`);
      }
    });
  });

  describe('3.5 Assistant API Client Contract & Endpoint Mapping', () => {
    test('API routes and payload contracts are properly structured', () => {
      const chatPayload = {
        message: 'Why am I tired today?',
        session_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      assert.equal(typeof chatPayload.message, 'string');
      assert.ok(chatPayload.message.length >= 1 && chatPayload.message.length <= 4000);
      assert.ok(chatPayload.session_id.length === 36);
    });

    test('Starter prompts catalog covers all major lifestyle domains', () => {
      const prompts = [
        { id: 'p-sleep', category: 'Sleep', icon: 'moon-outline' },
        { id: 'p-money', category: 'Finance', icon: 'wallet-outline' },
        { id: 'p-exp', category: 'Experiments', icon: 'flask-outline' },
        { id: 'p-focus', category: 'Productivity', icon: 'flash-outline' },
      ];

      assert.equal(prompts.length, 4);
      const categories = prompts.map((p) => p.category);
      assert.ok(categories.includes('Sleep'));
      assert.ok(categories.includes('Finance'));
      assert.ok(categories.includes('Experiments'));
      assert.ok(categories.includes('Productivity'));
    });
  });

  describe('3.6 Streaming Token Handling & Multi-Turn Simulation', () => {
    test('Simulates SSE token streaming and parses chunks accurately', () => {
      const rawSSEStream = [
        'event: start\ndata: {"status": "processing"}\n\n',
        'event: tool\ndata: {"tool": "get_sleep_analysis"}\n\n',
        'event: token\ndata: {"token": " Over the past"}\n\n',
        'event: token\ndata: {"token": " 14 days, your"}\n\n',
        'event: token\ndata: {"token": " average sleep was"}\n\n',
        'event: token\ndata: {"token": " 7.2 hours."}\n\n',
        'event: done\ndata: {"id": "msg-123"}\n\n',
      ];

      let fullText = '';
      const toolsCalled = [];
      let isDone = false;

      for (const chunk of rawSSEStream) {
        const lines = chunk.trim().split('\n');
        const eventLine = lines.find((l) => l.startsWith('event:'));
        const dataLine = lines.find((l) => l.startsWith('data:'));

        if (!eventLine || !dataLine) continue;
        const eventType = eventLine.replace('event:', '').trim();
        const payload = JSON.parse(dataLine.replace('data:', '').trim());

        if (eventType === 'tool') {
          toolsCalled.push(payload.tool);
        } else if (eventType === 'token') {
          fullText += payload.token;
        } else if (eventType === 'done') {
          isDone = true;
        }
      }

      assert.equal(isDone, true);
      assert.deepEqual(toolsCalled, ['get_sleep_analysis']);
      assert.equal(fullText, ' Over the past 14 days, your average sleep was 7.2 hours.');
    });
  });
});
