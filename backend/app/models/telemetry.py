import uuid
from datetime import date, datetime
from sqlalchemy import (
    String, Date, Numeric, SmallInteger, Integer, Text, Boolean,
    DateTime, ForeignKey, UniqueConstraint, CheckConstraint, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import Index
from app.database import Base


class FinancialTransaction(Base):
    """
    Granular financial transaction record.
    Captures individual purchases with category, merchant, timestamp, and discretionary flag.
    """
    __tablename__ = "financial_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    merchant: Mapped[str] = mapped_column(String(100), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_discretionary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    source: Mapped[str | None] = mapped_column(String(50), nullable=True, default="MANUAL")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="financial_transactions")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_financial_transaction_positive_amount"),
        Index("ix_financial_transactions_user_timestamp", "user_id", "timestamp"),
        Index("ix_financial_transactions_user_external_id", "user_id", "external_id"),
        UniqueConstraint(
            "user_id", "external_id",
            name="uq_financial_transaction_user_external",
        ),
    )

    def __repr__(self) -> str:
        return f"<FinancialTransaction {self.merchant} {self.amount} {self.category}>"


class AppUsageSession(Base):
    """
    Granular app usage record.
    Tracks foreground duration for individual apps, categorised and tagged with late-night status.
    """
    __tablename__ = "app_usage_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    app_name: Mapped[str] = mapped_column(String(100), nullable=False)
    app_category: Mapped[str] = mapped_column(String(50), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_late_night: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="app_usage_sessions")

    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_app_usage_positive_duration"),
        Index("ix_app_usage_user_start_time", "user_id", "start_time"),
    )

    def __repr__(self) -> str:
        return f"<AppUsageSession {self.app_name} {self.duration_minutes}m>"


class FocusStudySession(Base):
    """
    Granular focus or study interval.
    Captures deep work blocks, self-reported concentration ratings, and distraction events.
    """
    __tablename__ = "focus_study_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_or_task: Mapped[str] = mapped_column(String(150), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    self_reported_focus: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    distraction_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="focus_study_sessions")

    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_focus_session_positive_duration"),
        CheckConstraint(
            "self_reported_focus >= 1 AND self_reported_focus <= 5",
            name="ck_focus_session_focus_range"
        ),
        CheckConstraint(
            "distraction_count >= 0",
            name="ck_focus_session_distraction_non_negative"
        ),
        Index("ix_focus_study_sessions_user_start", "user_id", "start_time"),
    )

    def __repr__(self) -> str:
        return f"<FocusStudySession {self.subject_or_task} {self.duration_minutes}m (focus={self.self_reported_focus})>"


class Habit(Base):
    """
    User habit definition.
    Supports specific domains, recurrence frequencies, and active tracking state.
    """
    __tablename__ = "habits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    domain: Mapped[str] = mapped_column(String(50), nullable=False, default="General")
    frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="daily")
    target_per_day: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="habits")
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("target_per_day >= 1", name="ck_habit_target_positive"),
        Index("ix_habits_user_active", "user_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Habit {self.name} ({self.domain})>"


class HabitLog(Base):
    """
    Daily log entry for a specific habit.
    Enforces unique completion records per habit per date.
    """
    __tablename__ = "habit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    habit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("habits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    value: Mapped[float] = mapped_column(Numeric(10, 2), default=1.0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    habit = relationship("Habit", back_populates="logs")
    user = relationship("User", back_populates="habit_logs")

    __table_args__ = (
        UniqueConstraint("habit_id", "date", name="uq_habit_log_habit_date"),
        Index("ix_habit_logs_user_date", "user_id", "date"),
    )

    def __repr__(self) -> str:
        return f"<HabitLog habit={self.habit_id} date={self.date} completed={self.completed}>"


class SleepInterval(Base):
    """
    Granular sleep stage interval record.
    Captures stage (CORE, DEEP, REM, AWAKE, IN_BED), timestamps, and duration.
    """
    __tablename__ = "sleep_intervals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)  # CORE, DEEP, REM, AWAKE, IN_BED
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="sleep_intervals")

    __table_args__ = (
        CheckConstraint("duration_minutes >= 0", name="ck_sleep_interval_duration"),
        Index("ix_sleep_intervals_user_date", "user_id", "date"),
        UniqueConstraint(
            "user_id", "start_time", "end_time", "stage",
            name="uq_sleep_interval_user_window_stage",
        ),
    )

    def __repr__(self) -> str:
        return f"<SleepInterval {self.stage} {self.duration_minutes}m on {self.date}>"


class WorkoutSession(Base):
    """
    Granular physical workout / exercise interval record.
    Tracks activity type, duration, calories burned, estimated steps, and intensity.
    """
    __tablename__ = "workout_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    calories_burned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    steps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    intensity: Mapped[str | None] = mapped_column(String(20), nullable=True, default="MODERATE")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="workout_sessions")

    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_workout_duration_positive"),
        Index("ix_workout_sessions_user_start", "user_id", "start_time"),
    )

    def __repr__(self) -> str:
        return f"<WorkoutSession {self.activity_type} {self.duration_minutes}m ({self.intensity})>"
