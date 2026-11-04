"""add_anomaly_detail_columns

Revision ID: 002_add_anomaly_details
Revises: 001_initial
Create Date: 2026-05-10

Adds two columns to engineered_features that were present in the
SQLAlchemy model but missing from the initial migration:
  - anomaly_details          JSONB    (rich anomaly breakdown)
  - primary_anomaly_feature  VARCHAR(60) (top anomaly feature name)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002_add_anomaly_details'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'engineered_features',
        sa.Column('anomaly_details', postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        'engineered_features',
        sa.Column('primary_anomaly_feature', sa.String(60), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('engineered_features', 'primary_anomaly_feature')
    op.drop_column('engineered_features', 'anomaly_details')
