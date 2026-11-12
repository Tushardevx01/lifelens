from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.database import get_db

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, token_version: int = 0) -> str:
    """
    Create a JWT access token with user_id as subject.
    token_version is embedded so that password changes invalidate old tokens.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(user_id),
        "ver": token_version,   # P7: version field
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> str:
    """
    FastAPI dependency: extract, authenticate and fully validate user session.
    Verifies signature, expiration, user existence, active status, and token_version
    to ensure password resets, revocations, and account deletions immediately
    invalidate all previous sessions.
    """
    from app.models.user import User
    from app.cache.redis_client import redis_client, REDIS_AVAILABLE
    import uuid

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        token_ver: int = payload.get("ver", 0)
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception

    # Fast-path: Check Redis session cache if available
    cache_key = f"user_sess:{user_id}"
    if REDIS_AVAILABLE and redis_client:
        try:
            cached_val = redis_client.get(cache_key)
            if cached_val is not None:
                parts = cached_val.split(":")
                if len(parts) == 2:
                    cached_ver = int(parts[0])
                    cached_active = parts[1] == "1"
                    if cached_active and cached_ver == token_ver:
                        return user_id
                    raise credentials_exception
        except Exception:
            pass

    # Database validation of active user and token_version
    stmt = select(User.token_version, User.is_active).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user_row = result.one_or_none()
    if not user_row or not user_row[1]:  # User missing or inactive
        raise credentials_exception

    db_ver = user_row[0]
    if db_ver != token_ver:
        raise credentials_exception

    # Populate cache (5 minute TTL)
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.setex(cache_key, 300, f"{db_ver}:1")
        except Exception:
            pass

    return user_id


async def get_current_user_verified(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> str:
    """Backwards-compatible alias for get_current_user."""
    return await get_current_user(token=token, db=db)
