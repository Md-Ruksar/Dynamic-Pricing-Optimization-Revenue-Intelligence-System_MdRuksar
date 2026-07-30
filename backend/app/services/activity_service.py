"""
PricePilot AI - Activity Service
"""

from sqlalchemy.orm import Session
from typing import Optional

from app.models.activity_log import ActivityLog


class ActivityService:
    """Service for logging and retrieving user activities."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def log(self, user_id: int, action: str, resource_type: Optional[str] = None,
            resource_id: Optional[int] = None, details: Optional[str] = None,
            ip_address: Optional[str] = None):
        """Log a user activity."""
        log_entry = ActivityLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        self.db.add(log_entry)
        self.db.commit()
        self.db.refresh(log_entry)
        return log_entry
    
    def get_logs(self, skip: int = 0, limit: int = 50):
        """Get recent activity logs."""
        return (
            self.db.query(ActivityLog)
            .order_by(ActivityLog.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
