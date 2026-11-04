from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime


class UserRegister(BaseModel):
    """Request body for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128, description="Password (min 8 chars)")
    full_name: str | None = Field(None, max_length=100)


class UserLogin(BaseModel):
    """Request body for user login (used with OAuth2PasswordRequestForm too)."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Response body for user data."""
    id: UUID
    email: str
    full_name: str | None
    timezone: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Response body for JWT token."""
    access_token: str
    token_type: str = "bearer"
