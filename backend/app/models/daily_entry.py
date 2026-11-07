import uuid
from datetime import date, time, datetime
from sqlalchemy import (
    String, Date, Time, Numeric, SmallInteger, Integer, Text,
    DateTime, ForeignKey, UniqueConstraint, CheckConstraint, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import Index
from app.database import Base


class DailyEntry(Base):
    __tablename__ = "daily_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    # --- Sleep ---
    sleep_hours: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False)
    sleep_quality: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    sleep_bedtime: Mapped[time | None] = mapped_column(Time, nullable=True)

    # --- Phone & Digital ---
    screen_time_hours: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False)
    social_media_hours: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)

    # --- Health ---
    steps: Mapped[int] = mapped_column(Integer, nullable=False)
    active_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories_burned: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # --- Productivity ---
    deep_work_hours: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False)
    tasks_completed: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # --- Finance ---
    daily_spend: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    spend_category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # --- Subjective ---
    mood_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    energy_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Metadata ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="daily_entries")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_daily_entries_user_date"),
        # FIX: use string column name "date" not the Python date class
        Index("idx_daily_entries_user_date", "user_id", "date"),
        CheckConstraint("sleep_hours >= 0 AND sleep_hours <= 24", name="ck_sleep_hours_range"),
        CheckConstraint("sleep_quality >= 1 AND sleep_quality <= 5", name="ck_sleep_quality_range"),
        CheckConstraint("screen_time_hours >= 0", name="ck_screen_time_positive"),
        CheckConstraint("steps >= 0", name="ck_steps_positive"),
        CheckConstraint("deep_work_hours >= 0 AND deep_work_hours <= 24", name="ck_deep_work_range"),
        CheckConstraint("daily_spend >= 0", name="ck_daily_spend_positive"),
        CheckConstraint(
            "mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 10)",
            name="ck_mood_score_range"
        ),
        CheckConstraint(
            "energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 5)",
            name="ck_energy_level_range"
        ),
    )

    def __repr__(self) -> str:
        return f"<DailyEntry user={self.user_id} date={self.date}>"
