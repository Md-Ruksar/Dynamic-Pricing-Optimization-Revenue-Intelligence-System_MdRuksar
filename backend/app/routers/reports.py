"""
PricePilot AI - Reports Router (Future Module)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/v1/reports", tags=["Reports (Future)"])


@router.get("/pricing-performance")
def get_pricing_performance_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate pricing performance report. Future: Will be part of Reports module."""
    service = ReportService(db)
    return service.pricing_performance_report()


@router.get("/revenue-analysis")
def get_revenue_analysis_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate revenue analysis report. Future: Will be part of Reports module."""
    service = ReportService(db)
    return service.revenue_analysis_report()


@router.get("/product-performance")
def get_product_performance_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate product performance report. Future: Will be part of Reports module."""
    service = ReportService(db)
    return service.product_performance_report()
