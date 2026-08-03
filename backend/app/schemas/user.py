"""
PricePilot AI - User Schemas
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

#: The only roles PricePilot AI assigns.
ROLES = ["admin", "data_analyst", "pricing_manager"]


class UserBase(BaseModel):
    """Base user schema."""
    email: str
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str
    role: Optional[str] = "data_analyst"
    reason: Optional[str] = None  # used by self-registration / re-request
    
    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v
    
    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(ROLES))}")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    google_id: Optional[str] = None
    profile_picture: Optional[str] = None
    is_google_user: Optional[bool] = False
    avatar_url: Optional[str] = None
    notifications_enabled: bool = True
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token schema."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload schema."""
    user_id: int
    role: str


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request."""
    email: str


class ResetPasswordRequest(BaseModel):
    """Schema for reset password request."""
    token: str
    new_password: str


class GoogleIdTokenRequest(BaseModel):
    """Schema for Google ID-token authentication."""
    id_token: str
