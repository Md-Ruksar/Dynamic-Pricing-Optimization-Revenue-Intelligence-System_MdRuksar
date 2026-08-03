"""
PricePilot AI - Auth Router
"""

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Dict
import httpx

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, GoogleIdTokenRequest
from app.schemas.common import MessageResponse
from app.services.auth import AuthService
from app.services.google_oauth import GoogleOAuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=Dict, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Request access to the platform.

    Public self-registration runs through the enterprise approval workflow: a
    pending (inactive) user account plus an AccessRequest are created, and no
    JWT is issued until an administrator approves the request. The client can
    request a role (admin / data_analyst / pricing_manager) but can never
    self-assign one; admins choose the final role at approval time via the
    Access Requests page. Rejected users may re-register to submit a new
    request (re-request flow).
    """
    auth_service = AuthService(db)
    return auth_service.request_access(user_data)


@router.post("/login", response_model=Dict)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and return access + refresh tokens."""
    auth_service = AuthService(db)
    result = auth_service.login(credentials.username, credentials.password)
    return result


@router.post("/refresh", response_model=Dict)
def refresh_token(body: Dict = Body(...), db: Session = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    auth_service = AuthService(db)
    return auth_service.refresh(body["refresh_token"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    body: Dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile (name, email, notifications)."""
    auth_service = AuthService(db)
    user = auth_service.update_profile(
        current_user,
        full_name=body.get("full_name"),
        email=body.get("email"),
        notifications_enabled=body.get("notifications_enabled"),
    )
    return user


@router.post("/change-password", response_model=Dict)
def change_password(
    body: Dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change the current user's password."""
    auth_service = AuthService(db)
    return auth_service.change_password(
        current_user,
        current_password=body["current_password"],
        new_password=body["new_password"],
    )


@router.get("/google/authorize")
def google_authorize():
    """Redirect to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return {"authorization_url": f"https://accounts.google.com/o/oauth2/v2/auth?{query}"}


@router.get("/google/callback")
async def google_callback(
    code: str,
    db: Session = Depends(get_db),
):
    """Handle Google OAuth callback: exchange code, verify token, create/return JWT."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    # Exchange authorization code for tokens
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()

            # Fetch user profile
            profile_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            profile_resp.raise_for_status()
            profile = profile_resp.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")

    email = profile.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    auth_service = AuthService(db)
    result = auth_service.google_login(
        email=email,
        google_id=profile.get("sub", ""),
        name=profile.get("name") or profile.get("email", "").split("@")[0],
    )
    return result


@router.post("/google", response_model=Dict)
def google_auth(
    body: GoogleIdTokenRequest,
    db: Session = Depends(get_db),
):
    """Authenticate or register a user via a Google ID token.

    The ID token is verified server-side with Google's official verification
    (signature, audience, issuer, expiry, verified email). Claims come from the
    token itself - never from the frontend. Returns the same JWT pair as the
    username/password login.
    """
    profile = GoogleOAuthService().verify_id_token(body.id_token)
    auth_service = AuthService(db)
    result = auth_service.google_login(
        email=profile["email"],
        google_id=profile["google_id"],
        name=profile["name"],
        picture=profile["picture"],
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
