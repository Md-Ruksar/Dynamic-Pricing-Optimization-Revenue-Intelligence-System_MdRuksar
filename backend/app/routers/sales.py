"""
PricePilot AI - Sales Router (Future Module)
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.sales import SalesAnalyticsResponse
from app.services.sales_service import SalesService

router = APIRouter(prefix="/api/v1/sales", tags=["Sales (Future)"])


@router.get("/analytics", response_model=SalesAnalyticsResponse)
def get_sales_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get sales analytics. Future: Will be part of Advanced Analytics module."""
    service = SalesService(db)
    return service.get_analytics(days)
