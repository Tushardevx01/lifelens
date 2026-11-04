from contextlib import asynccontextmanager
import logging
import uuid

from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import create_db_tables, get_db
from app.cache.redis_client import REDIS_AVAILABLE, redis_client
from app.routers import auth, entries, analytics, telemetry, experiments

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — runs on startup and shutdown."""
    # Startup: create tables if they don't exist (dev only)
    if settings.ENVIRONMENT == "development":
        await create_db_tables()
    yield
    # Shutdown: cleanup


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered personal life analytics API. "
                "Collects behavioral data, runs ML models, and generates actionable insights.",
    version=settings.API_VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:8081",    # Expo web dev server
        "http://localhost:19006",   # Expo web (older SDK)
        "http://localhost:8000",    # Local backend self-calls
        "http://127.0.0.1:8081",    # Alternative localhost
        "http://127.0.0.1:19006",
        # Android/iOS native HTTP requests have no CORS origin; some WebViews send null
        "null",
        # Expo dev server can also run on these ports
        "http://localhost:8082",
        "http://localhost:19000",
        "http://localhost:19001",
        "http://localhost:19002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(entries.router, prefix="/api/entries", tags=["Daily Entries"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(telemetry.router, prefix="/api/telemetry", tags=["Granular Telemetry"])
app.include_router(experiments.router, prefix="/api/experiments", tags=["Behavioral Experiments"])


logger = logging.getLogger("lifelens.api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())
    logger.exception(f"Unhandled error [{error_id}] on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected internal server error occurred.",
            "error_id": error_id,
        },
    )


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.API_VERSION,
        "status": "running",
    }


@app.get("/health", tags=["Health"])
async def health_check(db: AsyncSession = Depends(get_db)):
    """Liveness & Readiness probe: checks database and Redis availability."""
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    redis_status = "disabled"
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.ping()
            redis_status = "healthy"
        except Exception:
            redis_status = "unhealthy"

    is_healthy = db_status == "healthy"
    status_code = 200 if is_healthy else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if is_healthy else "degraded",
            "database": db_status,
            "redis": redis_status,
            "version": settings.API_VERSION,
        },
    )
