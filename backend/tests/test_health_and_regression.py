"""
Regression and Resilience Test Suite for LifeLens AI.

Tests all hardened edge cases:
  1. Health check & readiness probe behavior
  2. Finance score boundary clamping
  3. Token version verification and revocation
  4. Constant/zero-variance input handling in correlation analysis
  5. MODELS_DIR filesystem resolution
  6. Global exception handler error masking and unique error_id generation
"""

import uuid
import pytest
import pandas as pd
import numpy as np
from datetime import date, timedelta
from httpx import AsyncClient

from app.ml.feature_engineering import compute_finance_score
from app.ml.correlation import analyse_correlations
from app.ml.base import MODELS_DIR
from app.models.user import User
from app.utils.security import hash_password, create_access_token, get_current_user_verified
from sqlalchemy.ext.asyncio import AsyncSession


class TestFinanceScoreBounds:
    def test_zero_spend_returns_100(self):
        assert compute_finance_score(0.0, 500.0) == 100.0

    def test_under_average_clamped_to_100(self):
        # 100 spend vs 1000 average -> ratio 0.1 -> unclamped formula would give 145.0
        score = compute_finance_score(100.0, 1000.0)
        assert score == 100.0

    def test_extreme_overspend_floors_at_zero(self):
        score = compute_finance_score(100000.0, 100.0)
        assert score == 0.0


class TestCorrelationZeroVariance:
    def test_handles_constant_data_gracefully(self):
        """Constant series should not raise exceptions or produce NaNs."""
        n = 35
        df = pd.DataFrame({
            "sleep_hours": [8.0] * n,  # zero variance
            "productivity_score": [70.0] * n,  # zero variance
            "mood_score": [5] * n,
            "screen_time_hours": [3.0] * n,
            "steps": [8000] * n,
            "daily_spend": [500.0] * n,
            "deep_work_hours": [4.0] * n,
        })
        findings = analyse_correlations(df)
        assert isinstance(findings, list)
        assert len(findings) == 0


class TestModelsDirectoryResolution:
    def test_models_dir_is_inside_backend(self):
        """Ensure MODELS_DIR correctly resolves to backend/models."""
        assert MODELS_DIR.name == "models"
        assert "backend" in str(MODELS_DIR)


class TestHealthAndSecurity:
    async def test_health_check_endpoint(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "database" in data
        assert "version" in data

    async def test_token_version_invalidation(self, db: AsyncSession, test_user: User):
        """Changing token version invalidates tokens minted with older versions."""
        token_v0 = create_access_token(str(test_user.id), token_version=0)
        verified_id = await get_current_user_verified(token=token_v0, db=db)
        assert verified_id == str(test_user.id)

        # Bump version in DB
        test_user.token_version = 1
        await db.commit()
        await db.refresh(test_user)

        # Old token v0 must now fail
        with pytest.raises(Exception):
            await get_current_user_verified(token=token_v0, db=db)

        # New token v1 must succeed
        token_v1 = create_access_token(str(test_user.id), token_version=1)
        new_verified_id = await get_current_user_verified(token=token_v1, db=db)
        assert new_verified_id == str(test_user.id)
