"""
PricePilot AI - Access Requests Router (Admin)
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.access_request import AccessRequestResponse, ApproveAccessRequest
from app.services.access_request_service import AccessRequestService

router = APIRouter(prefix="/api/v1/access-requests", tags=["Access Requests"])


@router.get("/", response_model=List[AccessRequestResponse])
def list_access_requests(
    status: str = Query("all", description="Filter: all | pending | approved | rejected"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """List access requests (admin only)."""
    service = AccessRequestService(db)
    return service.list_requests(request_status=status, skip=skip, limit=limit)


@router.get("/pending-count", response_model=Dict)
def pending_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """Number of pending requests - drives the admin notification badge (admin only)."""
    service = AccessRequestService(db)
    return {"pending_count": service.pending_count()}


@router.post("/{request_id}/approve", response_model=AccessRequestResponse)
def approve_access_request(
    request_id: int,
    body: ApproveAccessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """Approve a pending request: activate the user and assign the role (admin only)."""
    service = AccessRequestService(db)
    return service.approve(current_user, request_id, role=body.role)


@router.post("/{request_id}/reject", response_model=AccessRequestResponse)
def reject_access_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """Reject a pending request and keep the user blocked (admin only)."""
    service = AccessRequestService(db)
    return service.reject(current_user, request_id)
