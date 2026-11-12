"""
LifeLens Personal Life Briefings & Weekly Reviews ORM Models (Phase 6).

Persists AI-synthesized morning focus/recovery briefings and
Sunday evening weekly review narratives.
"""

from __future__ import annotations
import uuid
from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    String, Date, Text, DateTime, ForeignKey,
    Boolean, Float, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import Index
from app.database import Base


class BriefingType(str, PyEnum):
    DAILY_MORNING = "DAILY_MORNING"
    WEEKLY_REVIEW = "WEEKLY_REVIEW"


class Briefing(Base):
    __tablename__ = "briefings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    briefing_type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)

    # Granular components
    recovery_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    focus_window: Mapped[str | None] = mapped_column(String(100), nullable=True)
    risk_factors_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    experiment_focus: Mapped[str | None] = mapped_column(Text, nullable=True)
    full_narrative_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    html_export: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Full response payload for cache hits, so no field is reconstructed from guesses.
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_read: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", backref="briefings")

    __table_args__ = (
        UniqueConstraint("user_id", "date", "briefing_type", name="uq_user_date_briefing_type"),
        Index("ix_briefings_user_id", "user_id"),
        Index("ix_briefings_user_date", "user_id", "date"),
        Index("ix_briefings_user_type", "user_id", "briefing_type"),
    )

