"""
PricePilot AI - Google OAuth Verification Service
==================================================
Verifies Google ID tokens server-side using Google's official `google-auth`
library. The backend never trusts client-supplied email/name/picture data:
every claim is extracted from the cryptographically verified ID token.

Rejects:
  - Expired / malformed / invalidly signed tokens
  - Tokens with the wrong audience (not issued for this app's client ID)
  - Tokens from an unexpected issuer
  - Tokens without a verified email address
"""

from fastapi import HTTPException, status
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.config import settings


class GoogleOAuthService:
    """Server-side verification of Google ID tokens."""

    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID

    def _ensure_configured(self) -> None:
        """Raise 503 if Google OAuth is not configured."""
        if not self.client_id:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID in the backend environment.",
            )

    def verify_id_token(self, id_token: str) -> dict:
        """Verify a Google ID token and return validated profile claims.

        Returns:
            {
                "google_id": str,   # Google 'sub' claim
                "email": str,       # verified email (lowercased)
                "name": str,
                "picture": str,     # profile picture URL (may be "")
            }

        Raises:
            HTTPException 400/401/503 on any invalid-token or config problem.
        """
        self._ensure_configured()

        if not id_token or not isinstance(id_token, str) or len(id_token) > 16384:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID token",
            )

        try:
            request = google_requests.Request()
            info = google_id_token.verify_oauth2_token(
                id_token,
                request,
                audience=self.client_id,
            )
        except ValueError as exc:
            # Raised by google-auth for invalid signature, expired token,
            # or audience mismatch.
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Google token: {str(exc)}",
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not verify Google token. Please try again.",
            )

        # Defense in depth: explicitly validate audience and issuer.
        if info.get("aud") != self.client_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google token audience mismatch",
            )
        if info.get("iss") not in (
            "accounts.google.com",
            "https://accounts.google.com",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token issuer",
            )

        email = info.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account has no email address",
            )
        if not info.get("email_verified", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google email is not verified",
            )

        return {
            "google_id": str(info.get("sub", "")),
            "email": email.lower(),
            "name": info.get("name") or email.split("@")[0],
            "picture": info.get("picture") or "",
        }
