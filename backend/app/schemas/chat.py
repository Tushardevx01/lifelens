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


class ToolCallRecord(BaseModel):
    tool_name: str
    args: Dict[str, Any] = Field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None


class ChatCardPayload(BaseModel):
    card_type: str  # sleep_analysis, spending_breakdown, productivity_patterns, active_experiment, lifescore_overview, health_disclaimer
    title: str
    data: Dict[str, Any] = Field(default_factory=dict)


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="The user's query or message")
    session_id: Optional[uuid.UUID] = Field(None, description="Optional conversation session ID to continue")


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    sender: str
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    cards: Optional[List[Dict[str, Any]]] = None
    disclaimer: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionCreate(BaseModel):
    title: Optional[str] = Field("New Conversation", max_length=200)


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message_count: int = 0
    last_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionDetailResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    messages: List[ChatMessageResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StarterPrompt(BaseModel):
    id: str
    label: str
    prompt: str
    category: str
    icon: str
