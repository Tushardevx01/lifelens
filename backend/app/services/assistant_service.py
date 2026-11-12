"""
LifeLens Conversational Assistant Service Layer (Phase 3).

Manages conversation sessions, message history persistence, tool execution,
and session title auto-generation.
"""

from __future__ import annotations
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

try:
    import sqlalchemy as sa
    from sqlalchemy import select, func, desc, and_
    from sqlalchemy.orm import selectinload
    from sqlalchemy.ext.asyncio import AsyncSession
except ImportError:
    sa = None  # type: ignore
    select = func = desc = and_ = selectinload = None  # type: ignore
    AsyncSession = Any  # type: ignore

try:
    from fastapi import HTTPException, status
except ImportError:
    class HTTPException(Exception):  # type: ignore
        def __init__(self, status_code=500, detail=""):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail
    class status:  # type: ignore
        HTTP_400_BAD_REQUEST = 400
        HTTP_404_NOT_FOUND = 404

try:
    from app.models.chat import ChatSession, ChatMessage
except ImportError:
    ChatSession = ChatMessage = None  # type: ignore

from app.schemas.chat import (
    ChatMessageResponse,
    ChatSessionDetailResponse,
    StarterPrompt,
)
from app.ai.agent import run_conversational_agent


STARTER_PROMPTS = [
    StarterPrompt(
        id="prompt-sleep-tired",
        label="Why am I tired today?",
        prompt="Why am I tired today? Can you analyze my recent sleep duration, bedtime variance, and screen time?",
        category="Sleep & Energy",
        icon="moon-outline",
    ),
    StarterPrompt(
        id="prompt-spend-breakdown",
        label="Where did my money go?",
        prompt="Where did most of my money go this month? Show me my discretionary vs non-discretionary spending.",
        category="Finances",
        icon="wallet-outline",
    ),
    StarterPrompt(
        id="prompt-active-experiment",
        label="How is my experiment going?",
        prompt="How is my active behavioral experiment doing? What is my current adherence rate and interim delta?",
        category="Experiments",
        icon="flask-outline",
    ),
    StarterPrompt(
        id="prompt-deep-work",
        label="Analyze my deep work",
        prompt="What are my peak focus hours and average distraction rate during deep work sessions?",
        category="Productivity",
        icon="flash-outline",
    ),
    StarterPrompt(
        id="prompt-lifescore-overview",
        label="My LifeScore overview",
        prompt="Give me a comprehensive LifeScore overview and breakdown across sleep, productivity, health, and finance.",
        category="Overview",
        icon="trending-up-outline",
    ),
]


def generate_session_title(first_query: str) -> str:
    """
    Generates a concise, informative title for a conversation session.
    """
    q = first_query.strip().lower()
    if any(k in q for k in ["sleep", "tired", "bedtime", "wake", "insomnia"]):
        return "Sleep & Energy Analysis"
    if any(k in q for k in ["spend", "money", "budget", "cost", "expense", "purchase"]):
        return "Spending & Budget Breakdown"
    if any(k in q for k in ["productiv", "deep work", "focus", "study", "distract"]):
        return "Deep Work & Focus Patterns"
    if any(k in q for k in ["experiment", "challenge", "trial", "habit"]):
        return "Behavioral Experiment Review"
    if any(k in q for k in ["anomal", "outlier", "weird", "unusual"]):
        return "Behavioral Pattern Audit"

    # Truncate clean first words
    words = first_query.split()
    return " ".join(words[:5]).capitalize()[:60] or "Conversation"


def _to_uuid(uid_val: Any) -> uuid.UUID:
    if isinstance(uid_val, uuid.UUID):
        return uid_val
    return uuid.UUID(str(uid_val))


async def get_or_create_session(
    db: AsyncSession,
    user_id: str,
    session_id: Optional[str] = None,
    title: Optional[str] = None,
) -> ChatSession:
    """
    Resolves existing session or creates a new one.
    """
    u_uuid = _to_uuid(user_id)
    if session_id:
        try:
            s_uuid = uuid.UUID(str(session_id))
            stmt = select(ChatSession).where(
                and_(ChatSession.id == s_uuid, ChatSession.user_id == u_uuid)
            )
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing:
                return existing
        except ValueError:
            pass

    # Create new session
    new_session = ChatSession(
        id=uuid.uuid4(),
        user_id=u_uuid,
        title=title or "New Conversation",
    )
    db.add(new_session)
    await db.flush()
    return new_session


async def get_user_sessions(
    db: AsyncSession,
    user_id: str,
    page: int = 1,
    page_size: int = 20,
) -> List[Dict[str, Any]]:
    """
    Lists conversation sessions with message count and last message.
    Optimized to eliminate N+1 queries by fetching counts and last messages in batches.
    """
    u_uuid = _to_uuid(user_id)
    offset = (page - 1) * page_size
    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == u_uuid)
        .order_by(desc(ChatSession.updated_at))
        .offset(offset)
        .limit(page_size)
    )
    res = await db.execute(stmt)
    sessions = list(res.scalars().all())
    if not sessions:
        return []

    session_ids = [s.id for s in sessions]

    # Batch message count query
    counts_stmt = (
        select(ChatMessage.session_id, func.count(ChatMessage.id))
        .where(ChatMessage.session_id.in_(session_ids))
        .group_by(ChatMessage.session_id)
    )
    counts_res = await db.execute(counts_stmt)
    counts_map = dict(counts_res.all())

    # Batch recent message query
    recent_stmt = (
        select(ChatMessage.session_id, ChatMessage.content)
        .where(ChatMessage.session_id.in_(session_ids))
        .order_by(ChatMessage.session_id, desc(ChatMessage.created_at))
    )
    recent_res = await db.execute(recent_stmt)
    last_msg_map: Dict[uuid.UUID, str] = {}
    for s_id, content in recent_res.all():
        if s_id not in last_msg_map:
            last_msg_map[s_id] = content

    results = []
    for s in sessions:
        count = counts_map.get(s.id, 0)
        last_msg = last_msg_map.get(s.id)
        if last_msg and len(last_msg) > 90:
            last_msg = last_msg[:87] + "..."

        results.append({
            "id": s.id,
            "user_id": s.user_id,
            "title": s.title,
            "message_count": count,
            "last_message": last_msg,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        })

    return results


async def get_session_details(
    db: AsyncSession,
    user_id: str,
    session_id: str,
) -> ChatSessionDetailResponse:
    """
    Fetches session and its full message history.
    """
    u_uuid = _to_uuid(user_id)
    try:
        s_uuid = uuid.UUID(str(session_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session UUID")

    stmt = (
        select(ChatSession)
        .where(and_(ChatSession.id == s_uuid, ChatSession.user_id == u_uuid))
        .options(selectinload(ChatSession.messages))
    )
    res = await db.execute(stmt)
    sess = res.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    messages_out = []
    for m in sess.messages:
        tool_calls = json.loads(m.tool_calls_json) if m.tool_calls_json else None
        cards = json.loads(m.cards_json) if m.cards_json else None
        messages_out.append(
            ChatMessageResponse(
                id=m.id,
                session_id=m.session_id,
                sender=m.sender,
                content=m.content,
                tool_calls=tool_calls,
                cards=cards,
                disclaimer="LifeLens provides behavioral data analytics for informational self-reflection, not medical or financial advice.",
                created_at=m.created_at,
            )
        )

    return ChatSessionDetailResponse(
        id=sess.id,
        user_id=sess.user_id,
        title=sess.title,
        messages=messages_out,
        created_at=sess.created_at,
        updated_at=sess.updated_at,
    )


async def delete_session(
    db: AsyncSession,
    user_id: str,
    session_id: str,
) -> bool:
    """
    Deletes a conversation session and cascades message deletion.
    """
    u_uuid = _to_uuid(user_id)
    try:
        s_uuid = uuid.UUID(str(session_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session UUID")

    stmt = select(ChatSession).where(
        and_(ChatSession.id == s_uuid, ChatSession.user_id == u_uuid)
    )
    res = await db.execute(stmt)
    sess = res.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    await db.delete(sess)
    await db.commit()
    return True


async def clear_all_history(
    db: AsyncSession,
    user_id: str,
) -> int:
    """
    Deletes all chat sessions and messages for the user.
    """
    u_uuid = _to_uuid(user_id)
    stmt = select(ChatSession).where(ChatSession.user_id == u_uuid)
    res = await db.execute(stmt)
    sessions = list(res.scalars().all())
    count = len(sessions)
    for s in sessions:
        await db.delete(s)
    await db.commit()
    return count


async def process_user_message(
    db: AsyncSession,
    user_id: str,
    message: str,
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main flow:
    1. Resolve or create chat session.
    2. Persist user message.
    3. Update session title if first message.
    4. Run LifeLens AI conversational agent (tool execution + synthesis + guardrails).
    5. Persist assistant response with tool calls and cards payload.
    6. Return response payload.
    """
    session = await get_or_create_session(db, user_id, session_id=session_id)

    # Check if first message to update title
    if session.title == "New Conversation":
        session.title = generate_session_title(message)

    # 1. Save user message
    user_msg_id = uuid.uuid4()
    user_chat_msg = ChatMessage(
        id=user_msg_id,
        session_id=session.id,
        sender="USER",
        content=message.strip(),
    )
    db.add(user_chat_msg)
    await db.flush()

    # 2. Run LifeLens AI Agent
    ai_result = await run_conversational_agent(
        db=db,
        user_id=user_id,
        user_message=message,
    )

    # 3. Save assistant message
    asst_msg_id = uuid.uuid4()
    tool_calls_str = json.dumps(ai_result.get("tool_calls")) if ai_result.get("tool_calls") else None
    cards_str = json.dumps(ai_result.get("cards")) if ai_result.get("cards") else None

    asst_chat_msg = ChatMessage(
        id=asst_msg_id,
        session_id=session.id,
        sender="ASSISTANT",
        content=ai_result.get("content", ""),
        tool_calls_json=tool_calls_str,
        cards_json=cards_str,
    )
    db.add(asst_chat_msg)
    session.updated_at = datetime.now()
    await db.commit()

    return {
        "id": asst_msg_id,
        "session_id": session.id,
        "sender": "ASSISTANT",
        "content": ai_result.get("content", ""),
        "tool_calls": ai_result.get("tool_calls", []),
        "cards": ai_result.get("cards", []),
        "disclaimer": ai_result.get("disclaimer"),
        "created_at": asst_chat_msg.created_at or datetime.now(),
    }
