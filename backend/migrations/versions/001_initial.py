"""initial_schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-04-18

Creates all 5 tables with enums, check constraints, indexes, and partial
unique index for ml_model_metadata.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Enums ────────────────────────────────────────────────────────────
    severity_enum = postgresql.ENUM(
        'INFO', 'WARNING', 'CRITICAL',
        name='severityenum', create_type=True
    )
    insight_type_enum = postgresql.ENUM(
        'TREND', 'CORRELATION', 'ANOMALY', 'PREDICTION',
        name='insighttypeenum', create_type=True
    )
    severity_enum.create(op.get_bind(), checkfirst=True)
    insight_type_enum.create(op.get_bind(), checkfirst=True)

    # ── users ─────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('password_hash', sa.String(200), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='UTC'),
        sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )
    op.create_index('idx_users_email', 'users', ['email'])

    # ── daily_entries ─────────────────────────────────────────────────
    op.create_table(
        'daily_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('sleep_hours', sa.Numeric(4, 2), nullable=False),
        sa.Column('sleep_quality', sa.SmallInteger(), nullable=False),
        sa.Column('sleep_bedtime', sa.Time(), nullable=True),
        sa.Column('screen_time_hours', sa.Numeric(4, 2), nullable=False),
        sa.Column('social_media_hours', sa.Numeric(4, 2), nullable=True),
        sa.Column('steps', sa.Integer(), nullable=False),
        sa.Column('active_minutes', sa.Integer(), nullable=True),
        sa.Column('calories_burned', sa.Integer(), nullable=True),
        sa.Column('deep_work_hours', sa.Numeric(4, 2), nullable=False),
        sa.Column('tasks_completed', sa.SmallInteger(), nullable=True),
        sa.Column('daily_spend', sa.Numeric(10, 2), nullable=False),
        sa.Column('spend_category', sa.String(50), nullable=True),
        sa.Column('mood_score', sa.SmallInteger(), nullable=True),
        sa.Column('energy_level', sa.SmallInteger(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'date', name='uq_daily_entries_user_date'),
        sa.CheckConstraint('sleep_hours >= 0 AND sleep_hours <= 24', name='ck_sleep_hours_range'),
        sa.CheckConstraint('sleep_quality >= 1 AND sleep_quality <= 5', name='ck_sleep_quality_range'),
        sa.CheckConstraint('screen_time_hours >= 0', name='ck_screen_time_positive'),
        sa.CheckConstraint('steps >= 0', name='ck_steps_positive'),
        sa.CheckConstraint('deep_work_hours >= 0 AND deep_work_hours <= 24', name='ck_deep_work_range'),
        sa.CheckConstraint('daily_spend >= 0', name='ck_daily_spend_positive'),
        sa.CheckConstraint(
            'mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 10)',
            name='ck_mood_score_range'
        ),
        sa.CheckConstraint(
            'energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 5)',
            name='ck_energy_level_range'
        ),
    )
    op.create_index('idx_daily_entries_user_date', 'daily_entries', ['user_id', 'date'])

    # ── engineered_features ───────────────────────────────────────────
    op.create_table(
        'engineered_features',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('date', sa.Date(), primary_key=True),
        sa.Column('sleep_score', sa.Float(), nullable=True),
        sa.Column('distraction_level', sa.Float(), nullable=True),
        sa.Column('activity_index', sa.Float(), nullable=True),
        sa.Column('productivity_score', sa.Float(), nullable=True),
        sa.Column('finance_score', sa.Float(), nullable=True),
        sa.Column('spend_ratio', sa.Float(), nullable=True),
        sa.Column('sleep_7d_avg', sa.Float(), nullable=True),
        sa.Column('sleep_7d_std', sa.Float(), nullable=True),
        sa.Column('productivity_7d_avg', sa.Float(), nullable=True),
        sa.Column('distraction_7d_avg', sa.Float(), nullable=True),
        sa.Column('steps_7d_avg', sa.Float(), nullable=True),
        sa.Column('sleep_score_lag1', sa.Float(), nullable=True),
        sa.Column('screen_time_lag1', sa.Float(), nullable=True),
        sa.Column('activity_index_lag1', sa.Float(), nullable=True),
        sa.Column('mood_score_lag1', sa.Float(), nullable=True),
        sa.Column('productivity_score_lag1', sa.Float(), nullable=True),
        sa.Column('cluster_label', sa.SmallInteger(), nullable=True),
        sa.Column('cluster_name', sa.String(50), nullable=True),
        sa.Column('anomaly_score', sa.Float(), nullable=True),
        sa.Column('is_anomaly', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('predicted_productivity', sa.Float(), nullable=True),
        sa.Column('pred_confidence_lower', sa.Float(), nullable=True),
        sa.Column('pred_confidence_upper', sa.Float(), nullable=True),
        sa.Column('life_score', sa.Float(), nullable=True),
        sa.Column('life_score_sleep', sa.Float(), nullable=True),
        sa.Column('life_score_productivity', sa.Float(), nullable=True),
        sa.Column('life_score_health', sa.Float(), nullable=True),
        sa.Column('life_score_finance', sa.Float(), nullable=True),
        sa.Column('computed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_features_user_date', 'engineered_features', ['user_id', 'date'])

    # ── insights ──────────────────────────────────────────────────────
    op.create_table(
        'insights',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('insight_type', sa.Enum('TREND', 'CORRELATION', 'ANOMALY', 'PREDICTION',
                                          name='insighttypeenum', create_type=False), nullable=False),
        sa.Column('severity', sa.Enum('INFO', 'WARNING', 'CRITICAL',
                                      name='severityenum', create_type=False), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('data_payload', postgresql.JSONB(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_insights_user_date', 'insights', ['user_id', 'date'])
    op.create_index('idx_insights_user_severity', 'insights', ['user_id', 'severity'])

    # ── ml_model_metadata ─────────────────────────────────────────────
    op.create_table(
        'ml_model_metadata',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('model_type', sa.String(50), nullable=False),
        sa.Column('trained_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('n_samples', sa.Integer(), nullable=True),
        sa.Column('metrics', postgresql.JSONB(), nullable=True),
        sa.Column('parameters', postgresql.JSONB(), nullable=True),
        sa.Column('model_path', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    # Partial unique index: at most one active model per user per type
    op.execute("""
        CREATE UNIQUE INDEX uq_active_model_per_user_type
        ON ml_model_metadata (user_id, model_type)
        WHERE is_active = true
    """)


def downgrade() -> None:
    op.drop_table('ml_model_metadata')
    op.drop_table('insights')
    op.drop_table('engineered_features')
    op.drop_table('daily_entries')
    op.drop_table('users')

    op.execute("DROP TYPE IF EXISTS severityenum")
    op.execute("DROP TYPE IF EXISTS insighttypeenum")
