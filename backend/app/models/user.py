import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    """
    User ORM model.

    NOTE: get_current_user returns the user_id as `str` (UUID string).
    Callers needing the full User object must call get_user_by_id(db, user_id).

    token_version: incremented on every password change so old JWTs are invalidated.
    """
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(
        String(200), nullable=False   # bcrypt produces 60-char; 200 is safe headroom
    )
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    timezone: Mapped[str] = mapped_column(
        String(50), nullable=False, default="UTC"
    )
    # P7: Token version — incremented on password change to invalidate old JWTs
    token_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    daily_entries = relationship("DailyEntry", back_populates="user", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="user", cascade="all, delete-orphan")
    financial_transactions = relationship("FinancialTransaction", back_populates="user", cascade="all, delete-orphan")
    app_usage_sessions = relationship("AppUsageSession", back_populates="user", cascade="all, delete-orphan")
    focus_study_sessions = relationship("FocusStudySession", back_populates="user", cascade="all, delete-orphan")
    habits = relationship("Habit", back_populates="user", cascade="all, delete-orphan")
    habit_logs = relationship("HabitLog", back_populates="user", cascade="all, delete-orphan")
    experiments = relationship("Experiment", back_populates="user", cascade="all, delete-orphan")
    experiment_checkins = relationship("ExperimentCheckin", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User {self.email}>"
