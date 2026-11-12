"""
Shared pytest fixtures for LifeLens AI tests.

Uses SQLite in-memory via aiosqlite for fast, isolated, dependency-free tests.
Each test function gets a fresh database (function scope).
"""

import uuid
import pytest_asyncio
from datetime import date, timedelta
from typing import AsyncGenerator

from httpx import AsyncClient, ASGITransport
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.utils.security import hash_password, create_access_token


# ── In-memory SQLite engine shared per test session ────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(
    test_engine, expire_on_commit=False, class_=AsyncSession
)


@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Clean DB for each test: create all tables, yield session, drop all."""
    async with test_engine.begin() as conn:
        # SQLite doesn't support PostgreSQL enums — register enum columns as VARCHAR
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client wired to the test DB."""
    async def _override_db(request: Request):
        # Mirror production get_db so CommitRoute can commit before responding.
        request.state.db = db
        yield db

    app.dependency_overrides[get_db] = _override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


TEST_PASSWORD_HASH = hash_password("TestPass1!")


@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> User:
    """Create and commit a test user. Password is TestPass1!"""
    user = User(
        id=uuid.uuid4(),
        email="test@lifelens.ai",
        full_name="Test User",
        password_hash=TEST_PASSWORD_HASH,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict:
    """Return Bearer Authorization header for the test user."""
    # FIX: create_access_token takes str user_id, not a dict
    token = create_access_token(str(test_user.id))
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def sample_entry_data() -> dict:
    """Minimal valid daily entry payload for yesterday (avoids future-date validation)."""
    return {
        "date":               str(date.today() - timedelta(days=1)),
        "sleep_hours":        7.5,
        "sleep_quality":      4,
        "screen_time_hours":  3.0,
        "steps":              8500,
        "deep_work_hours":    4.0,
        "daily_spend":        500.0,
        "mood_score":         7,
        "energy_level":       3,
    }
