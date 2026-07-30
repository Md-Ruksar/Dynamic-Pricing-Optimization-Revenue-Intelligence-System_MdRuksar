"""
PricePilot AI - Pricing Router
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.pricing import PriceUpdateRequest, PriceUpdateResponse, PriceHistoryEntry
from app.schemas.common import MessageResponse
from app.services.pricing_service import PricingService

router = APIRouter(prefix="/api/v1/pricing", tags=["Pricing"])


@router.put("/products/{product_id}/price", response_model=dict)
def update_product_price(
    product_id: int,
    data: PriceUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Update price for a specific product."""
    service = PricingService(db)
    result = service.update_price(product_id, data, current_user.id)
    return result


@router.get("/products/{product_id}/history", response_model=list)
def get_price_history(
    product_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pricing history for a product."""
    service = PricingService(db)
    return service.get_price_history(product_id, limit)
