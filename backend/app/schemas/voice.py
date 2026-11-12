"""
Pydantic Schemas for LifeLens Voice Assistant (Phase 4).
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

try:
    from pydantic import BaseModel, Field, ConfigDict
except ImportError:
    class BaseModel:  # type: ignore
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
    def Field(default=None, **kwargs):  # type: ignore
        return default
    def ConfigDict(**kwargs):  # type: ignore
        return kwargs


class VoiceTranscribeResponse(BaseModel):
    """Result of Speech-to-Text transcription."""
    text: str = Field(..., description="Transcribed spoken text")
    language: str = Field("en", description="Detected or requested language code")
    duration_seconds: float = Field(0.0, description="Duration of processed audio in seconds")
    confidence: Optional[float] = Field(None, description="Transcription confidence score 0.0 - 1.0")

    model_config = ConfigDict(from_attributes=True)


class VoiceSynthesizeRequest(BaseModel):
    """Payload for Text-to-Speech synthesis."""
    text: str = Field(..., min_length=1, max_length=10000, description="Text to synthesize to speech")
    voice: Optional[str] = Field("alloy", description="Voice profile (alloy, nova, shimmer, echo)")
    speed: Optional[float] = Field(1.0, ge=0.5, le=2.0, description="Playback speed multiplier")


class VoiceSynthesizeResponse(BaseModel):
    """Result of Text-to-Speech synthesis."""
    audio_base64: str = Field(..., description="Base64-encoded audio payload")
    format: str = Field("wav", description="Audio format (wav or mp3)")
    mime_type: str = Field("audio/wav", description="MIME type for browser / audio player playback")
    duration_estimate_seconds: float = Field(..., description="Estimated audio playback duration in seconds")
    cleaned_text: str = Field(..., description="Normalized text stripped of markdown for speech")

    model_config = ConfigDict(from_attributes=True)


class VoiceChatResponse(BaseModel):
    """Unified response for end-to-end hands-free voice conversation."""
    id: uuid.UUID
    session_id: uuid.UUID
    transcribed_query: str = Field(..., description="Spoken inquiry transcribed from user audio")
    reply_text: str = Field(..., description="Full analytical markdown narrative")
    spoken_text: str = Field(..., description="Spoken version of response stripped of markdown")
    audio_base64: Optional[str] = Field(None, description="Synthesized TTS speech in base64")
    format: str = Field("wav", description="Audio container format (wav or mp3)")
    tool_calls: Optional[List[Dict[str, Any]]] = None
    cards: Optional[List[Dict[str, Any]]] = None
    disclaimer: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

