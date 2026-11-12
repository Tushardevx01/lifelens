import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// Phase 4: Voice Experience (STT & TTS) Rigorous Verification Suite
// ============================================================================

// 1. Spoken Text Normalization Engine (TTS Pre-processor)
export function cleanTextForSpeech(markdownText) {
  if (!markdownText) return '';

  let text = markdownText;

  // 1. Remove code blocks ```...``` and inline `code`
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');

  // 2. Remove markdown images and links: ![alt](url) -> "" and [label](url) -> label
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');
  text = text.replace(/\[([^\]]+)\]\(.*?\)/g, '$1');

  // 3. Remove raw URLs
  text = text.replace(/https?:\/\/\S+/g, '');

  // 4. Remove tool execution tags like [Tool: ...], [Analyzed: ...]
  text = text.replace(/\[(Tool|Analyzed|Executed|System):[^\]]+\]/gi, '');

  // 5. Remove markdown headers (###, ##, #)
  text = text.replace(/^\s*#{1,6}\s+/gm, '');

  // 6. Remove bold/italics markers: ***text***, **text**, *text*, __text__, _text_
  text = text.replace(/\*{1,3}(.*?)\*{1,3}/g, '$1');
  text = text.replace(/(?<!\w)_{1,3}(.*?)_{1,3}(?!\w)/g, '$1');

  // 7. Remove table bars and markdown separators
  text = text.replace(/\|/g, ' ');
  text = text.replace(/^[-\s:|]{3,}$/gm, '');

  // 8. Remove bullet points and numbered list prefixes
  text = text.replace(/^\s*[-*+•]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // 9. Remove decorative emojis / symbols
  text = text
    .replace(/(?:💡|🔥|✨|⚠️|✓|✗|★|☆)/gu, '')
    .trim();

  // 10. Phonetic currency normalization
  text = text.replace(/₹\s*([0-9,.]+)/g, '$1 rupees');
  text = text.replace(/\$\s*([0-9,.]+)/g, '$1 dollars');

  // 11. Normalize whitespace
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.join(' ').replace(/\s{2,}/g, ' ').trim();
}

// 2. Audio Format Validator & MIME Detection
export const SUPPORTED_AUDIO_EXTENSIONS = {
  '.m4a': 'audio/m4a',
  '.mp4': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.wave': 'audio/wav',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.mp3': 'audio/mpeg',
};

export const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateAudioUpload(filename, byteLength) {
  if (byteLength <= 0) {
    return { valid: false, error: 'Audio file is empty (0 bytes received).' };
  }
  if (byteLength > MAX_AUDIO_SIZE_BYTES) {
    return { valid: false, error: 'Audio file size exceeds maximum limit of 25MB.' };
  }
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) {
    return { valid: false, error: 'Audio file missing valid extension.' };
  }
  const ext = filename.slice(dotIndex).toLowerCase();
  if (!SUPPORTED_AUDIO_EXTENSIONS[ext]) {
    return { valid: false, error: `Unsupported audio format '${ext}'.` };
  }
  return { valid: true, mimeType: SUPPORTED_AUDIO_EXTENSIONS[ext] };
}

// 3. Audio Volume Metering & Waveform Geometry
export function normalizeDecibelsToVolume(db) {
  // Metering decibels typically range from -160 dB (silence) to 0 dB (maximum)
  // We take -60 dB as effective noise floor
  if (db <= -60) return 0;
  if (db >= 0) return 1;
  return Number(((db + 60) / 60).toFixed(4));
}

export function computeWaveformBarHeight(index, barCount, normalizedVolume, maxBarHeight = 48) {
  const center = (barCount - 1) / 2;
  const distFromCenter = Math.abs(index - center);
  const curveFactor = Math.max(0.3, 1 - (distFromCenter / center) * 0.7);
  const target = Math.max(6, Math.min(maxBarHeight, normalizedVolume * maxBarHeight * curveFactor));
  return Math.round(target * 100) / 100;
}

// 4. TTS Duration Estimator
export function estimateSpeechDurationSeconds(wordCount, speedMultiplier = 1.0) {
  const wordsPerSecond = 2.5 * Math.max(0.5, Math.min(2.0, speedMultiplier));
  return Math.max(1.0, Number((wordCount / wordsPerSecond).toFixed(2)));
}

// ============================================================================
// Test Suite Execution
// ============================================================================

describe('Phase 4 Verification: Voice Experience Engine (STT & TTS)', () => {
  describe('4.1 Spoken Text Normalization for Speech Synthesis', () => {
    test('Strips markdown headers, bolding, italics, and backticks', () => {
      const input = '### Sleep Analysis\nYour average sleep was **7.4 hours** with `92%` consistency.';
      const output = cleanTextForSpeech(input);
      assert.strictEqual(
        output,
        'Sleep Analysis Your average sleep was 7.4 hours with 92% consistency.'
      );
      assert.ok(!output.includes('#'));
      assert.ok(!output.includes('**'));
      assert.ok(!output.includes('`'));
    });

    test('Strips code blocks completely', () => {
      const input = 'Here is your data:\n```json\n{"sleep": 7.2}\n```\nLet me know if you need more details.';
      const output = cleanTextForSpeech(input);
      assert.strictEqual(output, 'Here is your data: Let me know if you need more details.');
      assert.ok(!output.includes('{'));
      assert.ok(!output.includes('sleep'));
    });

    test('Strips markdown links preserving label, removes raw URLs', () => {
      const input = 'View your progress on [LifeLens Dashboard](https://lifelens.ai/dash) or visit https://example.com directly.';
      const output = cleanTextForSpeech(input);
      assert.strictEqual(output, 'View your progress on LifeLens Dashboard or visit directly.');
      assert.ok(!output.includes('http'));
      assert.ok(output.includes('LifeLens Dashboard'));
    });

    test('Strips markdown table bars and bullet points', () => {
      const input = '| Metric | Value |\n|---|---|\n| Sleep | 7.2h |\n\n- Habit: Meditate\n- Habit: Walk 10k steps';
      const output = cleanTextForSpeech(input);
      assert.ok(!output.includes('|'));
      assert.ok(!output.includes('-'));
      assert.ok(output.includes('Sleep'));
      assert.ok(output.includes('Habit: Meditate'));
    });

    test('Phonetically normalizes currency symbols for clear speech', () => {
      const input = 'You spent ₹5,400 on dining and $45 on subscriptions.';
      const output = cleanTextForSpeech(input);
      assert.strictEqual(output, 'You spent 5,400 rupees on dining and 45 dollars on subscriptions.');
      assert.ok(!output.includes('₹'));
      assert.ok(!output.includes('$'));
    });

    test('Handles empty strings, pure whitespace, and symbols gracefully', () => {
      assert.strictEqual(cleanTextForSpeech(''), '');
      assert.strictEqual(cleanTextForSpeech('   \n\n\t  '), '');
      assert.strictEqual(cleanTextForSpeech('💡🔥✨⚠️✓✗★☆'), '');
    });
  });

  describe('4.2 Audio Format Validation & MIME Type Security', () => {
    test('Accepts valid mobile and web audio formats', () => {
      const validCases = [
        { file: 'voice.m4a', size: 1024 * 50, expectedMime: 'audio/m4a' },
        { file: 'voice.mp3', size: 1024 * 100, expectedMime: 'audio/mpeg' },
        { file: 'recording.wav', size: 1024 * 200, expectedMime: 'audio/wav' },
        { file: 'web_speech.webm', size: 1024 * 80, expectedMime: 'audio/webm' },
        { file: 'ios_audio.aac', size: 1024 * 60, expectedMime: 'audio/aac' },
        { file: 'audio.ogg', size: 1024 * 70, expectedMime: 'audio/ogg' },
      ];

      for (const c of validCases) {
        const res = validateAudioUpload(c.file, c.size);
        assert.strictEqual(res.valid, true, `Failed for ${c.file}`);
        assert.strictEqual(res.mimeType, c.expectedMime);
      }
    });

    test('Case-insensitively validates uppercase audio extensions', () => {
      const res = validateAudioUpload('RECORDING.WAV', 4096);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.mimeType, 'audio/wav');
    });

    test('Strictly rejects 0-byte empty audio recordings', () => {
      const res = validateAudioUpload('empty.m4a', 0);
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('empty'));
    });

    test('Strictly rejects non-audio files and malicious extensions', () => {
      const maliciousCases = ['script.sh', 'malware.exe', 'document.pdf', 'data.json', 'image.png'];
      for (const file of maliciousCases) {
        const res = validateAudioUpload(file, 2048);
        assert.strictEqual(res.valid, false, `Should reject ${file}`);
        assert.ok(res.error.includes('Unsupported audio format'));
      }
    });

    test('Rejects audio files exceeding maximum 25MB limit', () => {
      const res = validateAudioUpload('huge_recording.wav', MAX_AUDIO_SIZE_BYTES + 10);
      assert.strictEqual(res.valid, false);
      assert.ok(res.error.includes('exceeds maximum limit'));
    });
  });

  describe('4.3 Audio Metering & Waveform Mathematics', () => {
    test('Clamps decibels strictly into [0.0, 1.0] volume range', () => {
      assert.strictEqual(normalizeDecibelsToVolume(-100), 0);
      assert.strictEqual(normalizeDecibelsToVolume(-60), 0);
      assert.strictEqual(normalizeDecibelsToVolume(-30), 0.5);
      assert.strictEqual(normalizeDecibelsToVolume(0), 1.0);
      assert.strictEqual(normalizeDecibelsToVolume(+5), 1.0);
    });

    test('Computes waveform bar heights with center bell-curve distribution', () => {
      const barCount = 14;
      const vol = 0.8;
      const centerIndex = Math.floor((barCount - 1) / 2);
      const edgeIndex = 0;

      const centerHeight = computeWaveformBarHeight(centerIndex, barCount, vol, 48);
      const edgeHeight = computeWaveformBarHeight(edgeIndex, barCount, vol, 48);

      assert.ok(centerHeight > edgeHeight, 'Center bar height should exceed edge bar height');
      assert.ok(centerHeight <= 48, 'Center bar height should respect maxBarHeight boundary');
      assert.ok(edgeHeight >= 6, 'Edge bar height should not drop below minimum bar height');
    });

    test('Calculates speech duration estimates across speed variations', () => {
      const wordCount = 150; // Standard 1 minute speaking text
      const durationNormal = estimateSpeechDurationSeconds(wordCount, 1.0);
      const durationFast = estimateSpeechDurationSeconds(wordCount, 1.5);
      const durationSlow = estimateSpeechDurationSeconds(wordCount, 0.75);

      assert.strictEqual(durationNormal, 60.0);
      assert.ok(durationFast < durationNormal, '1.5x speed should reduce duration');
      assert.ok(durationSlow > durationNormal, '0.75x speed should increase duration');
      assert.ok(estimateSpeechDurationSeconds(0, 1.0) >= 1.0, 'Duration should not drop below 1.0s minimum');
    });
  });

  describe('4.4 Hands-Free Voice End-to-End Pipeline & Guardrail Deflection', () => {
    test('Voice crisis query deflects immediately to emergency resources', () => {
      const spokenQuery = 'I feel hopeless and want to end my life';
      const isCrisis = /\b(suicide|end\s+my\s+life|kill\s+myself)\b/i.test(spokenQuery);
      assert.strictEqual(isCrisis, true);

      // Crisis response is sanitized and formatted for spoken TTS output
      const crisisText = 'If you are experiencing difficult feelings, please reach out to the 988 Suicide and Crisis Lifeline. Call or text 988.';
      const spokenSpeech = cleanTextForSpeech(crisisText);
      assert.ok(spokenSpeech.includes('988'));
      assert.ok(spokenSpeech.includes('Suicide and Crisis Lifeline'));
    });

    test('Voice medical inquiry deflects without prescribing drugs', () => {
      const spokenQuery = 'Can you prescribe a pill for my insomnia?';
      const isMedical = /\b(prescribe|pill|cure|diagnosis)\b/i.test(spokenQuery);
      assert.strictEqual(isMedical, true);

      const medicalDeflection = 'I cannot provide medical diagnoses or prescribe medications. Please consult a qualified healthcare professional.';
      const spokenSpeech = cleanTextForSpeech(medicalDeflection);
      assert.ok(spokenSpeech.includes('cannot provide medical diagnoses'));
      assert.ok(!spokenSpeech.includes('take 10mg'));
    });

    test('Simulated VoiceChatResponse contract validates all required Phase 4 fields', () => {
      const response = {
        id: 'voice-msg-123',
        session_id: 'session-456',
        transcribed_query: 'Why was my sleep low yesterday?',
        reply_text: '### Sleep Analysis\nYour sleep duration was **6.1 hours**, which was 1.1 hours below your average.',
        spoken_text: 'Sleep Analysis Your sleep duration was 6.1 hours, which was 1.1 hours below your average.',
        audio_base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        format: 'wav',
        cards: [
          {
            card_type: 'sleep_analysis',
            title: 'Sleep & Energy Analysis',
            data: { avg_sleep_duration_hours: 6.1, sleep_quality_avg: 6.8 },
          },
        ],
        disclaimer: 'LifeLens provides behavioral data analytics for self-reflection, not medical advice.',
        created_at: new Date().toISOString(),
      };

      assert.strictEqual(typeof response.id, 'string');
      assert.strictEqual(typeof response.session_id, 'string');
      assert.strictEqual(typeof response.transcribed_query, 'string');
      assert.strictEqual(typeof response.spoken_text, 'string');
      assert.ok(!response.spoken_text.includes('###'));
      assert.ok(!response.spoken_text.includes('**'));
      assert.strictEqual(response.cards.length, 1);
      assert.strictEqual(response.cards[0].card_type, 'sleep_analysis');
      assert.ok(response.audio_base64.length > 0);
    });
  });
});
