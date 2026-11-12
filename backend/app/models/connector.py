import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import Index
from app.database import Base


class DataConnectorType(str, Enum):
    APPLE_HEALTH = "APPLE_HEALTH"
    GOOGLE_HEALTH_CONNECT = "GOOGLE_HEALTH_CONNECT"
    DEVICE_USAGE = "DEVICE_USAGE"
    SMS_PARSER = "SMS_PARSER"
    PLAID = "PLAID"
    FINVU_AA = "FINVU_AA"
    CSV_STATEMENT = "CSV_STATEMENT"


class DataConnectorStatus(str, Enum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    SYNCING = "SYNCING"
    ERROR = "ERROR"


class SyncLogStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class DataConnector(Base):
    """
    Tracks external data source connector configuration, status, and health.
    Manages automated background ingestion from Apple Health, Google Health Connect,
    Android UsageStatsManager, local on-device SMS parser, and Plaid/Finvu AA webhooks.
    """
    __tablename__ = "data_connectors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connector_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=DataConnectorStatus.DISCONNECTED.value
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_frequency_minutes: Mapped[int] = mapped_column(Integer, default=360, nullable=False)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_records_synced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="data_connectors")
    sync_logs = relationship("ConnectorSyncLog", back_populates="connector", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "connector_type", name="uq_user_connector_type"),
        Index("ix_data_connectors_user_status", "user_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<DataConnector {self.connector_type} ({self.status})>"


class ConnectorSyncLog(Base):
    """
    Audit log of automated synchronization runs.
    Records ingested, deduplicated, and failed records for transparency and debugging.
    """
    __tablename__ = "connector_sync_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    connector_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data_connectors.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connector_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    records_ingested: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_deduplicated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    details_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="connector_sync_logs")
    connector = relationship("DataConnector", back_populates="sync_logs")

    __table_args__ = (
        Index("ix_connector_sync_logs_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<ConnectorSyncLog {self.connector_type} {self.status} ingested={self.records_ingested}>"

