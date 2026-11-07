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
) -> str:
    """
    FastAPI dependency: extract and validate user_id from JWT token.
    Returns user_id string. Use get_current_user_verified for version-checked access.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return user_id
    except JWTError:
        raise credentials_exception


async def get_current_user_verified(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> str:
    """
    Full token validation including token_version check (P7).
    Raises 401 if the token's version doesn't match the DB — meaning the password was changed.
    """
    from app.models.user import User
    import uuid

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired. Please log in again.",
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

    # Validate version against DB
    stmt = select(User.token_version).where(User.id == uuid.UUID(user_id))
    result = await db.execute(stmt)
    db_ver = result.scalar_one_or_none()
    if db_ver is None or db_ver != token_ver:
        raise credentials_exception

    return user_id
