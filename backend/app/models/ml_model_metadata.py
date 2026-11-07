import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Boolean, DateTime, Index,
    ForeignKey, func, text, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class MLModelMetadata(Base):
    __tablename__ = "ml_model_metadata"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    model_type: Mapped[str] = mapped_column(
        String(50), nullable=False
        # Values: 'kmeans', 'rf_regressor', 'isolation_forest', 'arima'
    )
    trained_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    n_samples: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metrics: Mapped[dict | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    parameters: Mapped[dict | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    model_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        # FIX: partial unique index — only one ACTIVE model per user per type.
        # UniqueConstraint(is_active=True, user_id, model_type) isn't expressible
        # as a standard constraint, so we use a PostgreSQL partial unique index.
        # SQLAlchemy expresses this via postgresql_where=.
        Index(
            "uq_active_model_per_user_type",
            "user_id", "model_type",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )

    def __repr__(self) -> str:
        return f"<MLModelMetadata {self.model_type} user={self.user_id} active={self.is_active}>"
