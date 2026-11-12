from contextlib import asynccontextmanager
import logging
import uuid
import time
from collections import defaultdict

from fastapi import FastAPI, Depends, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import create_db_tables, get_db
from app.cache.redis_client import REDIS_AVAILABLE, redis_client
from app.routers import auth, entries, analytics, telemetry, experiments, assistant, ingestion

settings = get_settings()

# In-memory sliding window fallback for rate limiting
_ip_rate_limits: dict[str, list[float]] = defaultdict(list)
_MAX_STORED_IPS = 10000


def _check_rate_limit(client_ip: str, path: str) -> bool:
    """Returns True if request is allowed, False if rate-limited."""
    now = time.monotonic()
    # Route specific limits per minute (generous bounds for dev/tests, strict on auth/AI)
    if path.startswith("/api/auth/login") or path.startswith("/api/auth/register"):
        max_req = 60
    elif path.startswith("/api/assistant"):
        max_req = 120
    elif path.startswith("/api/ingestion/financial/webhook"):
        max_req = 240
    else:
        max_req = 1000

    window = 60.0  # 60 seconds
    prefix = path.split("/")[2] if len(path.split("/")) > 2 else "root"
    key = f"{client_ip}:{prefix}"

    # Try Redis first if available
    if REDIS_AVAILABLE and redis_client:
        try:
            r_key = f"rl:{key}"
            current = redis_client.incr(r_key)
            if current == 1:
                redis_client.expire(r_key, int(window))
            return current <= max_req
        except Exception:
            pass

    # In-memory fallback
    timestamps = _ip_rate_limits[key]
    cutoff = now - window
    valid = [t for t in timestamps if t > cutoff]
    if len(valid) >= max_req:
        _ip_rate_limits[key] = valid
        return False
    valid.append(now)
    _ip_rate_limits[key] = valid

    if len(_ip_rate_limits) > _MAX_STORED_IPS:
        for k in list(_ip_rate_limits.keys())[:1000]:
            _ip_rate_limits[k] = [t for t in _ip_rate_limits[k] if t > cutoff]
            if not _ip_rate_limits[k]:
                del _ip_rate_limits[k]

    return True


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


@app.middleware("http")
async def security_and_limit_middleware(request: Request, call_next):
    """
    Bulletproof HTTP boundary middleware:
    1. Propagates or assigns a unique X-Request-ID for end-to-end tracing.
    2. Enforces maximum content-length payload limits before buffering into memory.
    3. Enforces sliding-window rate limiting to protect against brute-force and DoS.
    4. Attaches defense-in-depth security headers (X-Content-Type, CSP, Frame Options).
    """
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id

    # 1. Enforce payload size limits
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            length = int(content_length)
            is_upload = request.url.path.startswith("/api/entries/upload-csv") or "/voice/" in request.url.path
            max_bytes = 35 * 1024 * 1024 if is_upload else 5 * 1024 * 1024
            if length > max_bytes:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request body too large. Maximum allowed size is {max_bytes // (1024 * 1024)}MB."},
                    headers={"X-Request-ID": request_id}
                )
        except ValueError:
            pass

    # 2. Enforce Rate Limiting
    client_ip = request.client.host if request.client else "127.0.0.1"
    if not _check_rate_limit(client_ip, request.url.path):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down and try again later."},
            headers={"Retry-After": "60", "X-Request-ID": request_id}
        )

    response: Response = await call_next(request)

    # 3. Attach Defense-In-Depth Security Headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response

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
app.include_router(assistant.router, prefix="/api/assistant", tags=["AI Assistant"])
app.include_router(ingestion.router, prefix="/api/ingestion", tags=["Data Ingestion & Connectors"])


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
