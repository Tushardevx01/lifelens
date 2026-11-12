import uuid
from datetime import date, datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    String, Text, Date, Boolean, DateTime,
    ForeignKey, Index, func, JSON
)
# Migration 001 creates native PostgreSQL enums for these two columns
# (insighttypeenum/severityenum), so the ORM must use native_enum=True to bind
# enum values correctly. SQLite still stores them as VARCHAR in tests.
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class InsightTypeEnum(str, PyEnum):
    CORRELATION = "CORRELATION"
    ANOMALY     = "ANOMALY"
    TREND       = "TREND"
    PREDICTION  = "PREDICTION"


class SeverityEnum(str, PyEnum):
    INFO     = "INFO"
    WARNING  = "WARNING"
    CRITICAL = "CRITICAL"


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    # Native PG enums (see migration 001); SQLite falls back to VARCHAR.
    insight_type: Mapped[InsightTypeEnum] = mapped_column(
        SAEnum(InsightTypeEnum, name="insighttypeenum"),
        nullable=False,
    )
    severity: Mapped[SeverityEnum] = mapped_column(
        SAEnum(SeverityEnum, name="severityenum"),
        nullable=False,
        default=SeverityEnum.INFO,
    )

    title:        Mapped[str]       = mapped_column(String(200), nullable=False)
    message:      Mapped[str]       = mapped_column(Text, nullable=False)
    data_payload: Mapped[dict|None] = mapped_column(
        JSON().with_variant(JSONB(none_as_null=True), "postgresql"), nullable=True
    )
    is_read:      Mapped[bool]      = mapped_column(Boolean, default=False, nullable=False)
    created_at:   Mapped[datetime]  = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="insights")

    __table_args__ = (
        Index("idx_insights_user_date",     "user_id", "date"),
        Index("idx_insights_user_severity", "user_id", "severity"),
    )

    def __repr__(self) -> str:
        return f"<Insight {self.severity.value}: {self.title[:40]}>"
