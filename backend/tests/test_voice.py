"""
Unit tests for LifeLens Voice Assistant (Phase 4).
Tests:
- Spoken text normalization (markdown stripping, currency/metric preservation)
- Audio format validation (MIME types, size limits, empty file checks)
- Minimal PCM WAV audio synthesis
- Speech-to-Text transcription handling
- Text-to-Speech synthesis handling
- Full hands-free voice chat orchestration
"""

import unittest
import base64
from app.ai.voice_utils import (
    clean_text_for_speech,
    validate_audio_file,
    generate_synthesized_wav,
    MAX_AUDIO_SIZE_BYTES,
)
from app.schemas.voice import (
    VoiceTranscribeResponse,
    VoiceSynthesizeResponse,
)
from app.services.voice_service import (
    transcribe_audio,
    synthesize_speech,
)


class TestVoiceUtils(unittest.TestCase):
    def test_markdown_stripping_preserves_metrics(self):
        markdown_sample = (
            "### Sleep Analysis Overview\n"
            "Over the past **14 days**, your average sleep was **7.2 hours** with a quality rating of **8.1/10**.\n"
            "- Late-night screen time: `45 minutes`\n"
            "- Discretionary spending: ₹5,400 (which is 24% of your total budget)\n"
            "Check [LifeLens Docs](https://lifelens.ai) for more tips! 💡\n"
            "```python\ndef test(): pass\n```\n"
            "| Metric | Value |\n| Sleep | 7.2h |"
        )
        cleaned = clean_text_for_speech(markdown_sample)

        # Markdown artifacts stripped
        self.assertNotIn("###", cleaned)
        self.assertNotIn("**", cleaned)
        self.assertNotIn("`", cleaned)
        self.assertNotIn("https://", cleaned)
        self.assertNotIn("```", cleaned)
        self.assertNotIn("|", cleaned)
        self.assertNotIn("💡", cleaned)

        # Numbers, metrics, and content preserved
        self.assertIn("14 days", cleaned)
        self.assertIn("7.2 hours", cleaned)
        self.assertIn("5,400 rupees", cleaned)
        self.assertIn("24%", cleaned)
        self.assertIn("Late-night screen time: 45 minutes", cleaned)
        self.assertIn("LifeLens Docs", cleaned)

    def test_audio_format_validation(self):
        # Valid extensions
        for ext in [".m4a", ".mp3", ".wav", ".webm", ".aac", ".ogg"]:
            valid, err = validate_audio_file(f"test{ext}", 1024)
            self.assertTrue(valid, f"Expected {ext} to be valid, got: {err}")
            self.assertIsNone(err)

        # Rejects empty file
        valid, err = validate_audio_file("recording.m4a", 0)
        self.assertFalse(valid)
        self.assertIn("empty", err.lower())

        # Rejects file without extension
        valid, err = validate_audio_file("recording", 1024)
        self.assertFalse(valid)
        self.assertIn("extension", err.lower())

        # Rejects unsupported format
        valid, err = validate_audio_file("recording.txt", 1024)
        self.assertFalse(valid)
        self.assertIn("unsupported", err.lower())

        # Rejects oversized audio
        valid, err = validate_audio_file("large.wav", MAX_AUDIO_SIZE_BYTES + 1)
        self.assertFalse(valid)
        self.assertIn("exceeds", err.lower())

    def test_synthesized_wav_header_and_data(self):
        duration = 0.5  # 500ms
        sample_rate = 16000
        wav_bytes = generate_synthesized_wav(duration_seconds=duration, sample_rate=sample_rate)

        # Check RIFF header
        self.assertTrue(wav_bytes.startswith(b"RIFF"))
        self.assertIn(b"WAVE", wav_bytes[:16])
        self.assertIn(b"fmt ", wav_bytes[:24])
        self.assertIn(b"data", wav_bytes)

        # Duration math check: header (44 bytes) + 16000 samples * 0.5 sec * 2 bytes = 44 + 16000 = 16044 bytes
        expected_len = 44 + int(duration * sample_rate * 2)
        self.assertEqual(len(wav_bytes), expected_len)


class TestVoiceService(unittest.IsolatedAsyncioTestCase):
    async def test_transcribe_audio_validation_and_fallback(self):
        # Empty audio raises error
        with self.assertRaises(Exception):
            await transcribe_audio(file_bytes=b"", filename="empty.m4a")

        # Valid audio payload returns transcription
        sample_wav = generate_synthesized_wav(duration_seconds=1.0)
        res = await transcribe_audio(
            file_bytes=sample_wav,
            filename="user_voice.wav",
            content_type="audio/wav",
            mock_transcript="Why am I tired today? Can you analyze my recent sleep?",
        )
        self.assertIsInstance(res, VoiceTranscribeResponse)
        self.assertEqual(res.text, "Why am I tired today? Can you analyze my recent sleep?")
        self.assertEqual(res.language, "en")
        self.assertGreater(res.duration_seconds, 0)
        self.assertGreater(res.confidence, 0.9)

    async def test_synthesize_speech_normalization_and_audio(self):
        markdown_input = (
            "## Telemetry Report\n"
            "Your average sleep was **7.5 hours** and you spent ₹1,200 on groceries."
        )
        res = await synthesize_speech(text=markdown_input, voice="nova", speed=1.0)
        self.assertIsInstance(res, VoiceSynthesizeResponse)
        self.assertIn("7.5 hours", res.cleaned_text)
        self.assertIn("1,200 rupees", res.cleaned_text)
        self.assertNotIn("##", res.cleaned_text)
        self.assertNotIn("**", res.cleaned_text)
        self.assertGreater(res.duration_estimate_seconds, 0)

        # Verify base64 decoded audio is valid WAV
        decoded = base64.b64decode(res.audio_base64)
        self.assertTrue(decoded.startswith(b"RIFF") or res.format == "mp3")

    async def test_synthesize_speech_speed_variations(self):
        sample_text = "This is a test of voice synthesis speed calculation across different rate parameters."
        res_normal = await synthesize_speech(text=sample_text, speed=1.0)
        res_fast = await synthesize_speech(text=sample_text, speed=2.0)
        res_slow = await synthesize_speech(text=sample_text, speed=0.5)

        self.assertLess(res_fast.duration_estimate_seconds, res_normal.duration_estimate_seconds)
        self.assertGreater(res_slow.duration_estimate_seconds, res_normal.duration_estimate_seconds)

    def test_audio_format_validation_edge_cases(self):
        # Case insensitivity (e.g., .WAV, .M4A)
        valid, err = validate_audio_file("MY_RECORDING.WAV", 5000)
        self.assertTrue(valid)

        valid, err = validate_audio_file("VOICE.M4A", 8000)
        self.assertTrue(valid)

        # Tricky filename with multiple dots
        valid, err = validate_audio_file("backup.2026.11.05.ogg", 2048)
        self.assertTrue(valid)

        # Empty string / null text cleaning
        self.assertEqual(clean_text_for_speech(""), "")
        self.assertEqual(clean_text_for_speech("   \n\n  "), "")


if __name__ == "__main__":
    unittest.main()
