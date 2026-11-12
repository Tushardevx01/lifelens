import uuid
from datetime import datetime
from sqlalchemy import (
    String, Text, DateTime, ForeignKey, func, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ChatSession(Base):
    """
    ChatSession ORM model.
    Represents an ongoing or historical conversation thread between the user and LifeLens AI.
    """
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="New Conversation")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )

    __table_args__ = (
        Index("ix_chat_sessions_user_updated", "user_id", "updated_at"),
    )

    def __repr__(self) -> str:
        return f"<ChatSession {self.id} title={self.title!r}>"


class ChatMessage(Base):
    """
    ChatMessage ORM model.
    Stores user queries and LifeLens AI responses, including tool calls and rendered interactive cards.
    """
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender: Mapped[str] = mapped_column(String(20), nullable=False)  # USER, ASSISTANT, SYSTEM
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tool_calls_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON serialized tool invocations
    cards_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON serialized data cards
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relationships
    session = relationship("ChatSession", back_populates="messages")

    __table_args__ = (
        Index("ix_chat_messages_session_created", "session_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<ChatMessage {self.id} sender={self.sender} session={self.session_id}>"

