"""
PricePilot AI - Auth Router
"""

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Dict

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.schemas.common import MessageResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    auth_service = AuthService(db)
    user = auth_service.register(user_data)
    return user


@router.post("/login", response_model=Dict)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and return JWT token."""
    auth_service = AuthService(db)
    result = auth_service.login(credentials.username, credentials.password)
    return result


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.post("/google-login", response_model=Dict)
def google_login(
    body: Dict = Body(...),
    db: Session = Depends(get_db),
):
    """Authenticate or register via Google OAuth.
    Accepts { "email": "...", "google_id": "...", "name": "..." }
    """
    auth_service = AuthService(db)
    result = auth_service.google_login(
        email=body["email"],
        google_id=body.get("google_id", ""),
        name=body.get("name", body["email"].split("@")[0]),
    )
    return result


@router.post("/forgot-password", response_model=Dict)
def forgot_password(
    body: Dict = Body(...),
    db: Session = Depends(get_db),
):
    """Request a password reset token."""
    auth_service = AuthService(db)
    result = auth_service.forgot_password(email=body["email"])
    return result


@router.post("/reset-password", response_model=Dict)
def reset_password(
    body: Dict = Body(...),
    db: Session = Depends(get_db),
):
    """Reset password using a valid reset token."""
    auth_service = AuthService(db)
    result = auth_service.reset_password(
        token=body["token"],
        new_password=body["new_password"],
    )
    return result
