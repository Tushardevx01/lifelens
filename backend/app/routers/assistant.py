"""
LifeLens Conversational AI Companion Router (Phase 3).

Exposes:
- POST /api/assistant/chat (synchronous interactive response)
- GET /api/assistant/chat/stream (Server-Sent Events streaming token response)
- GET /api/assistant/sessions (list user conversation threads)
- POST /api/assistant/sessions (create a new thread)
- GET /api/assistant/sessions/{session_id} (fetch thread history)
- DELETE /api/assistant/sessions/{session_id} (delete a thread)
- DELETE /api/assistant/history (purge all chat history)
- GET /api/assistant/prompts (curated starter conversation prompts)
"""

import asyncio
import json
import re
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status, HTTPException, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.db_route import CommitRoute
from app.utils.security import get_current_user
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionDetailResponse,
    StarterPrompt,
)
from app.schemas.voice import (
    VoiceTranscribeResponse,
    VoiceSynthesizeRequest,
    VoiceSynthesizeResponse,
    VoiceChatResponse,
)
from app.services import assistant_service, voice_service

router = APIRouter(route_class=CommitRoute)


@router.post(
    "/chat",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a message to LifeLens AI companion and receive an analytical response",
)
async def chat_message_endpoint(
    data: ChatMessageRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Processes a user inquiry using telemetry tools, epistemological guardrails,
    and returns analytical narrative with interactive card payloads.
    """
    cleaned_msg = data.message.strip()
    if not cleaned_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty or whitespace only.",
        )

    result = await assistant_service.process_user_message(
        db=db,
        user_id=user_id,
        message=cleaned_msg,
        session_id=str(data.session_id) if data.session_id else None,
    )
    return result


@router.get(
    "/chat/stream",
    summary="Server-Sent Events (SSE) streaming chat endpoint",
)
async def chat_stream_endpoint(
    message: str = Query(..., min_length=1, max_length=4000),
    session_id: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Streams assistant response word-by-word with tool execution and card events via SSE.
    """
    cleaned_msg = message.strip()
    if not cleaned_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty or whitespace only.",
        )

    async def event_generator():
        try:
            # Yield initial connect event
            yield f"event: start\ndata: {json.dumps({'status': 'processing'})}\n\n"

            # Execute assistant process
            result = await assistant_service.process_user_message(
                db=db,
                user_id=user_id,
                message=cleaned_msg,
                session_id=session_id,
            )

            # Emit tool calls if any
            for tool_call in result.get("tool_calls", []):
                yield f"event: tool\ndata: {json.dumps({'tool': tool_call.get('tool')})}\n\n"
                await asyncio.sleep(0.02)

            # Stream content in natural token chunks while preserving exact newlines & formatting
            content_str = result.get("content", "")
            tokens = re.findall(r'\S+\s*', content_str) if content_str else []
            chunk = []
            for t in tokens:
                chunk.append(t)
                if len(chunk) >= 3:
                    yield f"event: token\ndata: {json.dumps({'token': ''.join(chunk)})}\n\n"
                    chunk = []
                    await asyncio.sleep(0.015)
            if chunk:
                yield f"event: token\ndata: {json.dumps({'token': ''.join(chunk)})}\n\n"

            # Emit cards
            for card in result.get("cards", []):
                yield f"event: card\ndata: {json.dumps(card)}\n\n"

            # Emit done
            yield f"event: done\ndata: {json.dumps({'id': str(result['id']), 'session_id': str(result['session_id'])})}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/sessions",
    response_model=List[ChatSessionResponse],
    summary="List all conversation threads for current user",
)
async def list_sessions_endpoint(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sessions = await assistant_service.get_user_sessions(
        db, user_id, page=page, page_size=page_size
    )
    return sessions


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation session",
)
async def create_session_endpoint(
    data: ChatSessionCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await assistant_service.get_or_create_session(
        db, user_id, title=data.title
    )
    await db.commit()
    return ChatSessionResponse(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        message_count=0,
        last_message=None,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionDetailResponse,
    summary="Get conversation history for a specific session",
)
async def get_session_details_endpoint(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await assistant_service.get_session_details(db, user_id, session_id)


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation session and all its messages",
)
async def delete_session_endpoint(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assistant_service.delete_session(db, user_id, session_id)
    return None


@router.delete(
    "/history",
    status_code=status.HTTP_200_OK,
    summary="Clear all conversation history for the current user",
)
async def clear_history_endpoint(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted_count = await assistant_service.clear_all_history(db, user_id)
    return {"status": "success", "deleted_sessions_count": deleted_count}


@router.get(
    "/prompts",
    response_model=List[StarterPrompt],
    summary="Get starter suggested conversation prompts",
)
async def get_starter_prompts_endpoint():
    return assistant_service.STARTER_PROMPTS


# ============================================================================
# Phase 4: Voice Experience Endpoints (STT, TTS & Voice Conversation)
# ============================================================================

@router.post(
    "/voice/transcribe",
    response_model=VoiceTranscribeResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe spoken audio into text (STT)",
)
async def voice_transcribe_endpoint(
    file: UploadFile = File(..., description="Audio recording file (m4a, mp3, wav, webm, aac)"),
    user_id: str = Depends(get_current_user),
):
    """
    Transcribes uploaded audio using Whisper or local audio pipeline.
    Validates audio format and size constraints.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio file was uploaded.",
        )

    MAX_AUDIO_BYTES = 25 * 1024 * 1024  # 25MB limit
    file_bytes = await file.read(MAX_AUDIO_BYTES + 1)
    if len(file_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file exceeds maximum allowed size of 25MB.",
        )
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty (0 bytes).",
        )

    return await voice_service.transcribe_audio(
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=file.content_type,
    )


@router.post(
    "/voice/synthesize",
    response_model=VoiceSynthesizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Synthesize text into natural spoken speech (TTS)",
)
async def voice_synthesize_endpoint(
    data: VoiceSynthesizeRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Synthesizes markdown/text into spoken audio.
    Strips markdown formatting, bullet characters, and table bars into natural spoken cadence.
    """
    cleaned_text = data.text.strip()
    if not cleaned_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text to synthesize cannot be empty.",
        )

    return await voice_service.synthesize_speech(
        text=cleaned_text,
        voice=data.voice,
        speed=data.speed,
    )


@router.post(
    "/voice/chat",
    response_model=VoiceChatResponse,
    status_code=status.HTTP_200_OK,
    summary="End-to-end hands-free voice conversation with LifeLens AI",
)
async def voice_chat_endpoint(
    file: UploadFile = File(..., description="User's spoken audio inquiry"),
    session_id: Optional[str] = Form(None, description="Optional active conversation session UUID"),
    voice: Optional[str] = Form("alloy", description="Voice profile for TTS response"),
    speed: Optional[float] = Form(1.0, description="TTS playback speed (0.5 to 2.0)"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Full hands-free voice loop:
    1. Transcribes incoming speech audio
    2. Runs conversational telemetry agent (tool calling, statistical metrics, guardrails)
    3. Synthesizes the response narrative into speech
    4. Returns unified transcript, reply text, synthesized audio, and structured data cards
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio file was uploaded.",
        )

    MAX_AUDIO_BYTES = 25 * 1024 * 1024  # 25MB limit
    file_bytes = await file.read(MAX_AUDIO_BYTES + 1)
    if len(file_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file exceeds maximum allowed size of 25MB.",
        )
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty (0 bytes).",
        )

    return await voice_service.process_voice_chat(
        db=db,
        user_id=user_id,
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=file.content_type,
        session_id=session_id,
        voice=voice,
        speed=speed,
    )
