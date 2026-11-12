"""add_briefings_and_risk_forecasts

Revision ID: 007_add_briefings
Revises: 006_add_connectors
Create Date: 2026-11-07

Adds table for AI-synthesized briefings and weekly reviews:
  - briefings: persists daily morning recovery briefings, weekly stories,
    focus windows, risk radars, and HTML export cards.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '007_add_briefings'
down_revision = '006_add_connectors'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'briefings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('briefing_type', sa.String(30), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('recovery_score', sa.Float(), nullable=True),
        sa.Column('focus_window', sa.String(100), nullable=True),
        sa.Column('risk_factors_json', sa.Text(), nullable=True),
        sa.Column('experiment_focus', sa.Text(), nullable=True),
        sa.Column('full_narrative_markdown', sa.Text(), nullable=False),
        sa.Column('html_export', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'date', 'briefing_type', name='uq_user_date_briefing_type')
    )
    op.create_index('ix_briefings_user_id', 'briefings', ['user_id'])
    op.create_index('ix_briefings_user_date', 'briefings', ['user_id', 'date'])
    op.create_index('ix_briefings_user_type', 'briefings', ['user_id', 'briefing_type'])


def downgrade() -> None:
    op.drop_index('ix_briefings_user_type', table_name='briefings')
    op.drop_index('ix_briefings_user_date', table_name='briefings')
    op.drop_index('ix_briefings_user_id', table_name='briefings')
    op.drop_table('briefings')

