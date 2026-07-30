"""
PricePilot AI - Auth Service
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
import secrets

from app.models.user import User
from app.schemas.user import UserCreate
from app.utils import (
    hash_password, verify_password, create_access_token,
    create_password_reset_token, verify_password_reset_token,
)


class AuthService:
    """Service for user authentication and registration."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def register(self, user_data: UserCreate) -> User:
        """Register a new user."""
        existing = (
            self.db.query(User)
            .filter((User.email == user_data.email) | (User.username == user_data.username))
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email or username already exists",
            )
        
        user = User(
            username=user_data.username,
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hash_password(user_data.password),
            role=user_data.role,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def login(self, username: str, password: str) -> dict:
        """Authenticate a user and return a JWT token."""
        user = self.db.query(User).filter(User.username == username).first()
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        
        token = create_access_token(data={"user_id": user.id, "role": user.role})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
        }
    
    def google_login(self, email: str, google_id: str, name: str) -> dict:
        """Authenticate or register a user via Google OAuth."""
        user = self.db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create a new user from Google profile
            username = email.split("@")[0]
            base_username = username
            counter = 1
            while self.db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
            
            user = User(
                username=username,
                email=email,
                full_name=name,
                hashed_password=hash_password(secrets.token_urlsafe(16)),
                role="business_user",
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        elif not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        
        token = create_access_token(data={"user_id": user.id, "role": user.role})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
        }
    
    def forgot_password(self, email: str) -> dict:
        """Generate a password reset token for the given email."""
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            # Don't reveal whether the email exists
            return {
                "message": "If an account with that email exists, a reset link has been generated.",
                "reset_token": None,
            }
        
        reset_token = create_password_reset_token(user.id, user.email)
        
        return {
            "message": "If an account with that email exists, a reset link has been generated.",
            "reset_token": reset_token,
        }
    
    def reset_password(self, token: str, new_password: str) -> dict:
        """Reset password using a valid reset token."""
        payload = verify_password_reset_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )
        
        user_id = payload.get("user_id")
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        if len(new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters",
            )
        
        user.hashed_password = hash_password(new_password)
        self.db.commit()
        
        return {"message": "Password has been reset successfully. You can now sign in."}
    
    def get_user_by_id(self, user_id: int) -> User:
        """Get a user by ID."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user
