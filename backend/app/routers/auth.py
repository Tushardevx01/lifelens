from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets
import uuid

from app.database import get_db
from app.utils.db_route import CommitRoute
from app.schemas.auth import UserRegister, UserResponse, TokenResponse
from app.services.auth_service import (
    register_user, authenticate_user, get_user_by_id, change_password, delete_user
)
from app.utils.security import get_current_user, hash_password
from app.models.user import User
from app.config import get_settings

# P6: Redis-backed reset tokens (falls back to bounded in-memory dict with TTL if Redis unavailable)
from app.cache.redis_client import redis_client, REDIS_AVAILABLE, invalidate_user_cache
import time

router = APIRouter(route_class=CommitRoute)
settings = get_settings()

# Fallback in-memory store used only when Redis is unavailable (bounded, TTL-protected)
_mem_reset_tokens: dict[str, tuple[str, float]] = {}  # token -> (user_id, expires_at)
_MAX_MEM_RESET_TOKENS = 1000
RESET_TOKEN_TTL = 900  # 15 minutes


def _store_reset_token(token: str, user_id: str) -> None:
    """Store reset token → user_id mapping with 15-min TTL. Redis-first, memory fallback."""
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.setex(f"pwd_reset:{token}", RESET_TOKEN_TTL, user_id)
            return
        except Exception:
            pass
    now = time.monotonic()
    # Evict expired tokens to prevent memory growth
    expired = [k for k, (_, exp) in _mem_reset_tokens.items() if exp < now]
    for k in expired:
        _mem_reset_tokens.pop(k, None)
    if len(_mem_reset_tokens) >= _MAX_MEM_RESET_TOKENS:
        # Evict oldest entry
        oldest = min(_mem_reset_tokens, key=lambda k: _mem_reset_tokens[k][1])
        _mem_reset_tokens.pop(oldest, None)
    _mem_reset_tokens[token] = (user_id, now + RESET_TOKEN_TTL)


def _consume_reset_token(token: str) -> str | None:
    """Pop a reset token and return the user_id. Returns None if invalid/expired."""
    if REDIS_AVAILABLE and redis_client:
        try:
            key = f"pwd_reset:{token}"
            user_id = redis_client.get(key)
            if user_id:
                redis_client.delete(key)
                return user_id
            return None
        except Exception:
            pass
    entry = _mem_reset_tokens.pop(token, None)
    if not entry:
        return None
    user_id, exp = entry
    if exp < time.monotonic():
        return None
    return user_id


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user account and return a JWT token."""
    return await register_user(db, data)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password using OAuth2 password flow."""
    return await authenticate_user(db, form_data.username, form_data.password)


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current authenticated user's profile."""
    return await get_user_by_id(db, user_id)


@router.patch("/password", status_code=status.HTTP_200_OK)
async def update_password(
    body: ChangePasswordRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change the authenticated user's password.
    P7: Also increments token_version so all existing sessions are invalidated.
    """
    await change_password(db, user_id, body.current_password, body.new_password)
    return {"message": "Password updated successfully. Please log in again on all devices."}


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_account(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    P1: Permanently delete the authenticated user's account and ALL associated data.
    This action is irreversible. Cascade deletion removes entries, insights, etc.
    """
    await delete_user(db, user_id)
    return {"message": "Your account and all data have been permanently deleted."}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    body: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Request a password reset token.
    P6: Token is stored in Redis with 15-min TTL (falls back to in-memory if Redis down).
    Dev mode: returns the token directly in the response body.
    Production: would send an email instead.
    """
    stmt = select(User).where(User.email == body.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Always return 200 to avoid email enumeration attacks
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}

    token = secrets.token_urlsafe(32)
    _store_reset_token(token, str(user.id))   # P6: Redis with TTL

    if settings.ENVIRONMENT == "development":
        return {
            "message": "Password reset token generated (dev mode).",
            "reset_token": token,
        }

    # Production: send email here
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    body: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm a password reset using the token from forgot-password.
    P6: Consumes the token from Redis (one-time use, 15-min expiry).
    P7: Also bumps token_version to invalidate all existing sessions.
    """
    user_id = _consume_reset_token(body.token)  # P6: Redis pop
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token. Please request a new one.",
        )

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters.",
        )

    stmt = select(User).where(User.id == uuid.UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.password_hash = hash_password(body.new_password)
    # P7: Bump token_version to invalidate any existing sessions
    user.token_version = (user.token_version or 0) + 1
    await db.commit()
    await db.refresh(user)
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.delete(f"user_sess:{user_id}")
        except Exception:
            pass
    invalidate_user_cache(user_id)
    return {"message": "Password reset successfully. You can now log in."}
