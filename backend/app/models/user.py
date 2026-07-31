"""
PricePilot AI - User Model
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(100))
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="business_user")
    is_active = Column(Boolean, default=True)
    google_id = Column(String(100), index=True)
    avatar_url = Column(String(500))
    notifications_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    activity_logs = relationship("ActivityLog", back_populates="user")
    price_changes = relationship("PricingHistory", back_populates="changed_by_user")
