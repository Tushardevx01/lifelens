import uuid
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.auth import UserRegister, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token
from app.cache.redis_client import invalidate_user_cache, redis_client, REDIS_AVAILABLE


async def register_user(db: AsyncSession, data: UserRegister) -> TokenResponse:
    """Register a new user. Raises 409 if email already exists."""
    # Check if email already exists
    stmt = select(User).where(User.email == data.email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    # Create user (token_version defaults to 0)
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    try:
        await db.commit()  # Persist user immediately
    except IntegrityError:
        # Another request created this email between the check and the insert.
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )
    await db.refresh(user)

    # Generate token with version=0
    token = create_access_token(str(user.id), token_version=user.token_version)
    return TokenResponse(access_token=token, user_id=user.id)


async def authenticate_user(db: AsyncSession, email: str, password: str) -> TokenResponse:
    """Authenticate a user by email and password. Raises 401 on failure."""
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Embed current token_version so the JWT can be invalidated on password change (P7)
    token = create_access_token(str(user.id), token_version=user.token_version)
    return TokenResponse(access_token=token, user_id=user.id)


async def get_user_by_id(db: AsyncSession, user_id: str) -> User:
    """Get a user by their UUID. Raises 404 if not found."""
    stmt = select(User).where(User.id == uuid.UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    return user


async def change_password(
    db: AsyncSession,
    user_id: str,
    current_password: str,
    new_password: str,
) -> None:
    """
    Change a user's password and bump token_version (P7).
    Bumping token_version immediately invalidates all existing JWTs for this user.
    """
    user = await get_user_by_id(db, user_id)

    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 8 characters.",
        )

    user.password_hash = hash_password(new_password)
    # P7: Increment version to invalidate all existing sessions
    user.token_version = (user.token_version or 0) + 1
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.delete(f"user_sess:{user_id}")
        except Exception:
            pass
    invalidate_user_cache(user_id)


async def delete_user(db: AsyncSession, user_id: str) -> None:
    """
    Permanently delete a user account and all associated data (P1).
    Cascade deletion handles: daily_entries, insights, telemetry, and experiments.
    """
    user = await get_user_by_id(db, user_id)
    await db.delete(user)
    await db.flush()
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.delete(f"user_sess:{user_id}")
        except Exception:
            pass
    invalidate_user_cache(user_id)
