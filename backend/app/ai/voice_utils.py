"""
LifeLens Voice Utilities (Phase 4).

Provides:
- Spoken text normalization (strips markdown formatting, symbols, emojis, and raw URLs
  while preserving natural speech numbers, currency, and metrics).
- Minimal valid PCM WAV audio generator for deterministic fallback/mock speech synthesis.
- Audio format validation and MIME type detection.
"""

import re
import struct
import math
from typing import Tuple, Optional


# Supported audio extensions and corresponding MIME types
SUPPORTED_AUDIO_EXTENSIONS = {
    ".m4a": "audio/m4a",
    ".mp4": "audio/mp4",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".wave": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".mp3": "audio/mpeg",
}

# Maximum allowed audio upload size (25 MB)
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024


def clean_text_for_speech(markdown_text: str) -> str:
    """
    Transforms markdown-formatted assistant response into natural, fluent text
    suitable for Text-To-Speech (TTS) reading.

    Removes:
    - Code blocks and backticks
    - Markdown headers (###, ##, #)
    - Bold and italic asterisks/underscores (**text**, *text*)
    - Markdown links [label](url) -> label
    - Raw URLs (https://...)
    - Tool execution logs and badges (e.g., "[Tool: get_sleep_analysis]")
    - Bullet characters and dashes at line start
    - Table formatting pipes (|)
    - Excessive newlines and whitespace

    Preserves:
    - Numbers, units, percentages, and currencies (e.g. "7.2 hours", "₹5,400", "24%")
    - Punctuation necessary for speech cadence (periods, commas, question marks)
    """
    if not markdown_text:
        return ""

    text = markdown_text

    # 1. Remove code blocks ```code``` and inline code `code`
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)

    # 2. Remove markdown images and links: ![alt](url) -> "" and [label](url) -> label
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\(.*?\)", r"\1", text)

    # 3. Remove raw URLs
    text = re.sub(r"https?://\S+", "", text)

    # 4. Remove tool execution tags like [Tool: ...], [LifeLens: ...]
    text = re.sub(r"\[(Tool|Analyzed|Executed|System):[^\]]+\]", "", text, flags=re.IGNORECASE)

    # 5. Remove markdown headers (e.g., # Header, ## Subheader)
    text = re.sub(r"^\s*#{1,6}\s+", "", text, flags=re.MULTILINE)

    # 6. Remove bold/italics markers: ***text***, **text**, *text*, __text__, _text_
    text = re.sub(r"\*{1,3}(.*?)\*{1,3}", r"\1", text)
    text = re.sub(r"(?<!\w)_{1,3}(.*?)_{1,3}(?!\w)", r"\1", text)

    # 7. Remove markdown table bars and separators
    text = re.sub(r"\|", " ", text)
    text = re.sub(r"^[-\s:|]{3,}$", "", text, flags=re.MULTILINE)

    # 8. Remove bullet points (-, *, +) and numbered list prefixes at start of line
    text = re.sub(r"^\s*[-*+•]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)

    # 9. Clean up common symbols / emojis for smoother speech
    text = text.replace("💡", "").replace("🔥", "").replace("✨", "").replace("⚠️", "")
    text = text.replace("✓", "").replace("✗", "").replace("★", "").replace("☆", "")

    # 10. Normalize currency symbols for better phonetic reading if desired
    # ₹5400 -> 5,400 rupees
    text = re.sub(r"₹\s*([0-9,.]+)", r"\1 rupees", text)
    # $50 -> 50 dollars
    text = re.sub(r"\$\s*([0-9,.]+)", r"\1 dollars", text)

    # 11. Normalize whitespace and newlines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned = " ".join(lines)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()

    return cleaned


def validate_audio_file(filename: str, file_size: int) -> Tuple[bool, Optional[str]]:
    """
    Validates uploaded audio file extension and size.
    Returns (is_valid, error_message).
    """
    if file_size <= 0:
        return False, "Audio file is empty (0 bytes received)."

    if file_size > MAX_AUDIO_SIZE_BYTES:
        max_mb = MAX_AUDIO_SIZE_BYTES // (1024 * 1024)
        return False, f"Audio file size exceeds maximum limit of {max_mb}MB."

    # Check extension
    dot_index = filename.rfind(".")
    if dot_index == -1:
        return False, "Audio file missing valid extension (e.g. .m4a, .wav, .mp3, .webm)."

    ext = filename[dot_index:].lower()
    if ext not in SUPPORTED_AUDIO_EXTENSIONS:
        supported = ", ".join(SUPPORTED_AUDIO_EXTENSIONS.keys())
        return False, f"Unsupported audio format '{ext}'. Supported formats: {supported}."

    return True, None


def generate_synthesized_wav(duration_seconds: float = 1.0, sample_rate: int = 16000, frequency: float = 440.0) -> bytes:
    """
    Generates a valid, minimal mono 16-bit PCM WAV audio file with a gentle sine-wave chime.
    Used for local testing, offline fallback, and verification without external cloud TTS keys.
    """
    num_samples = int(duration_seconds * sample_rate)
    num_channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
    block_align = num_channels * (bits_per_sample // 8)
    subchunk2_size = num_samples * block_align
    chunk_size = 36 + subchunk2_size

    # RIFF header
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        chunk_size,
        b"WAVE",
        b"fmt ",
        16,  # Subchunk1Size for PCM
        1,   # AudioFormat (1 = PCM)
        num_channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        subchunk2_size,
    )

    # Generate samples with an envelope (fade in / fade out to avoid clicks)
    samples = []
    fade_len = int(sample_rate * 0.05)  # 50ms fade
    for i in range(num_samples):
        # Sine wave tone
        t = float(i) / sample_rate
        val = math.sin(2.0 * math.pi * frequency * t)

        # Apply amplitude envelope
        if i < fade_len:
            amp = float(i) / fade_len
        elif i > num_samples - fade_len:
            amp = float(num_samples - i) / fade_len
        else:
            amp = 1.0

        sample_val = int(val * amp * 16000.0)
        samples.append(struct.pack("<h", sample_val))

    return header + b"".join(samples)

