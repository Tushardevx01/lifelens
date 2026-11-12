"""add_data_connectors_and_sync_logs

Revision ID: 006_add_connectors
Revises: 005_add_assistant
Create Date: 2026-11-07

Adds automated device connectors and ingestion tables:
  - data_connectors: tracks configured sources (HealthKit, Health Connect, UsageStats, SMS, Plaid/Finvu)
  - connector_sync_logs: records synchronization audit trail, ingested vs deduplicated records
  - financial_transactions: adds external_id and source columns for deduplication
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '006_add_connectors'
down_revision = '005_add_assistant'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add external_id and source to financial_transactions
    op.add_column('financial_transactions', sa.Column('external_id', sa.String(128), nullable=True))
    op.add_column('financial_transactions', sa.Column('source', sa.String(50), server_default='MANUAL', nullable=True))
    op.create_index('ix_financial_transactions_external_id', 'financial_transactions', ['external_id'])
    op.create_index('ix_financial_transactions_user_external_id', 'financial_transactions', ['user_id', 'external_id'])

    # 2. data_connectors table
    op.create_table(
        'data_connectors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('connector_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), server_default='DISCONNECTED', nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sync_frequency_minutes', sa.Integer(), server_default='360', nullable=False),
        sa.Column('config_json', sa.Text(), nullable=True),
        sa.Column('total_records_synced', sa.Integer(), server_default='0', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'connector_type', name='uq_user_connector_type')
    )
    op.create_index('ix_data_connectors_user_id', 'data_connectors', ['user_id'])
    op.create_index('ix_data_connectors_user_status', 'data_connectors', ['user_id', 'status'])

    # 3. connector_sync_logs table
    op.create_table(
        'connector_sync_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('connector_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('data_connectors.id', ondelete='CASCADE'), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('connector_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('records_ingested', sa.Integer(), server_default='0', nullable=False),
        sa.Column('records_deduplicated', sa.Integer(), server_default='0', nullable=False),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_connector_sync_logs_connector_id', 'connector_sync_logs', ['connector_id'])
    op.create_index('ix_connector_sync_logs_user_id', 'connector_sync_logs', ['user_id'])
    op.create_index('ix_connector_sync_logs_user_created', 'connector_sync_logs', ['user_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('connector_sync_logs')
    op.drop_table('data_connectors')
    op.drop_index('ix_financial_transactions_user_external_id', table_name='financial_transactions')
    op.drop_index('ix_financial_transactions_external_id', table_name='financial_transactions')
    op.drop_column('financial_transactions', 'source')
    op.drop_column('financial_transactions', 'external_id')

