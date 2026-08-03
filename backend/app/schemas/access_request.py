"""
PricePilot AI - Access Request Schemas
"""

from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

from app.schemas.user import ROLES


class AccessRequestResponse(BaseModel):
    """Schema for an access request response."""
    id: int
    email: str
    name: Optional[str] = None
    provider: str
    requested_role: Optional[str] = None
    reason: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApproveAccessRequest(BaseModel):
    """Schema for approving an access request with a chosen role."""
    role: Optional[str] = "data_analyst"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v is None or v == "":
            return "data_analyst"  # fall back to the safe default
        if v not in ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(ROLES))}")
        return v
