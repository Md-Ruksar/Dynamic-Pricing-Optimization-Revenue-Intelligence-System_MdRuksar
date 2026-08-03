"""
PricePilot AI - Access Request Model

Tracks requests from users whose accounts are pending administrator approval
before they can sign in to PricePilot AI.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class AccessRequest(Base):
    """Access request awaiting administrator review."""

    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), nullable=False, index=True)
    name = Column(String(100), nullable=True)
    provider = Column(String(20), nullable=False, default="local")  # google | local
    requested_role = Column(String(20), nullable=True, default="data_analyst")
    reason = Column(Text, nullable=True)  # optional note (e.g. on re-request)
    status = Column(String(20), nullable=False, default="Pending")  # Pending | Approved | Rejected
    created_at = Column(DateTime, server_default=func.now())
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    reviewer = relationship("User", foreign_keys=[reviewed_by])
