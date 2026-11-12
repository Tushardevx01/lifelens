from pathlib import Path
from fastapi import Request
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

_BACKEND_DIR = Path(__file__).resolve().parent.parent

db_url = settings.DATABASE_URL
if db_url.startswith("sqlite+aiosqlite:///./"):
    rel_path = db_url[len("sqlite+aiosqlite:///./"):]
    db_url = f"sqlite+aiosqlite:///{(_BACKEND_DIR / rel_path).resolve()}"
elif db_url.startswith("sqlite:///./"):
    rel_path = db_url[len("sqlite:///./"):]
    db_url = f"sqlite:///{(_BACKEND_DIR / rel_path).resolve()}"

is_sqlite = db_url.startswith("sqlite")
engine_kwargs = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
}
if not is_sqlite:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_async_engine(
    db_url,
    **engine_kwargs
)

# Bulletproof SQLite concurrency & data integrity invariants
if is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, connection_record):
        """Enforces foreign keys, WAL mode, and busy timeout on all SQLite connections."""
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys = ON;")
            cursor.execute("PRAGMA journal_mode = WAL;")
            cursor.execute("PRAGMA busy_timeout = 10000;")
        finally:
            cursor.close()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db(request: Request = None):
    """FastAPI dependency that yields an async database session.

    The session is exposed on ``request.state`` so ``CommitRoute`` can commit
    before the response is sent. The fallback commit in the cleanup path stays
    for routes that do not use ``CommitRoute`` (e.g. test dependency overrides).
    """
    async with AsyncSessionLocal() as session:
        if request is not None and hasattr(request, "state"):
            request.state.db = session
        try:
            yield session
            if session.is_active:
                await session.commit()
        except Exception:
            if session.is_active:
                await session.rollback()
            raise
        finally:
            await session.close()


async def create_db_tables():
    """Create all tables (for development only — use Alembic in production)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
