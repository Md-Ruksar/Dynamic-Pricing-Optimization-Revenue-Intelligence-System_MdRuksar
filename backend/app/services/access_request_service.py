"""
PricePilot AI - Access Request Service
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.access_request import AccessRequest
from app.models.user import User
from app.schemas.user import ROLES
from app.services.activity_service import ActivityService
from app.services.email_service import EmailService


class AccessRequestService:
    """Service for the admin approval workflow."""

    def __init__(self, db: Session):
        self.db = db

    def list_requests(self, request_status: Optional[str] = None,
                      skip: int = 0, limit: int = 100) -> List[AccessRequest]:
        """List access requests, optionally filtered by status (newest first)."""
        query = self.db.query(AccessRequest)
        if request_status and request_status.lower() != "all":
            query = query.filter(AccessRequest.status == request_status.capitalize())
        return (
            query.order_by(AccessRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def pending_count(self) -> int:
        """Number of requests awaiting review (used for the admin badge)."""
        return (
            self.db.query(AccessRequest)
            .filter(AccessRequest.status == "Pending")
            .count()
        )

    def _get_request(self, request_id: int) -> AccessRequest:
        access_request = self.db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
        if not access_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access request not found",
            )
        return access_request

    def approve(self, admin: User, request_id: int, role: str = "data_analyst") -> AccessRequest:
        """Approve a pending request: activate the matching user and grant role.

        The user row is created at registration / Google sign-in time, so it
        normally already exists in ``pending`` state. If it is missing (e.g. a
        request created before the workflow), a user is created on the spot.
        """
        access_request = self._get_request(request_id)
        if access_request.status != "Pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This request has already been reviewed",
            )

        user = self.db.query(User).filter(User.email == access_request.email).first()
        if not user:
            # Defensive path: create the user row with no password (Google-style).
            # The new user can then use "Forgot password" or sign in with Google.
            username = access_request.email.split("@")[0]
            base_username = username
            counter = 1
            while self.db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
            user = User(
                username=username,
                email=access_request.email,
                full_name=access_request.name,
                hashed_password=None,
                role=role,
                is_active=True,
                approval_status="approved",
                is_google_user=(access_request.provider == "google"),
            )
            self.db.add(user)
        else:
            user.role = role
            user.is_active = True
            user.approval_status = "approved"

        access_request.status = "Approved"
        access_request.reviewed_by = admin.id
        access_request.reviewed_at = datetime.utcnow()

        ActivityService(self.db).log(
            user_id=admin.id,
            action=f"Approved access request for {access_request.email}",
            resource_type="access_request",
            resource_id=access_request.id,
            details=f"Granted {role} role",
        )
        self.db.commit()
        self.db.refresh(access_request)

        # Notify the user by email (best effort - never blocks the approval)
        try:
            EmailService().send_access_approved(
                to_email=access_request.email,
                name=access_request.name or "there",
                role=role,
            )
        except Exception as e:
            print(f"Approval email skipped: {e}")
        return access_request

    def reject(self, admin: User, request_id: int) -> AccessRequest:
        """Reject a pending request and keep the matching user blocked."""
        access_request = self._get_request(request_id)
        if access_request.status != "Pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This request has already been reviewed",
            )

        access_request.status = "Rejected"
        access_request.reviewed_by = admin.id
        access_request.reviewed_at = datetime.utcnow()

        user = self.db.query(User).filter(User.email == access_request.email).first()
        if user and user.approval_status != "approved":
            user.approval_status = "rejected"
            user.is_active = False  # keep blocked

        ActivityService(self.db).log(
            user_id=admin.id,
            action=f"Rejected access request for {access_request.email}",
            resource_type="access_request",
            resource_id=access_request.id,
            details="Request denied",
        )
        self.db.commit()
        self.db.refresh(access_request)

        # Notify the user by email (best effort - never blocks the rejection)
        try:
            EmailService().send_access_rejected(
                to_email=access_request.email,
                name=access_request.name or "there",
            )
        except Exception as e:
            print(f"Rejection email skipped: {e}")
        return access_request
