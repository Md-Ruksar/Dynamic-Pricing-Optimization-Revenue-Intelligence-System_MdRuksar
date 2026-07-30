"""
PricePilot AI - AI Pricing Engine Router (Future Module)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.pricing import (
    PriceOptimizationResponse,
    BatchOptimizationResponse,
    RevenuePredictionResponse,
)
from app.services.ml_service import PricingMLService

router = APIRouter(prefix="/api/v1/ai", tags=["AI Pricing Engine (Future)"])


@router.get("/optimize/{product_id}", response_model=PriceOptimizationResponse)
def optimize_product_price(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Get AI-powered price optimization for a product. Future: Will be part of AI Pricing Engine."""
    try:
        service = PricingMLService(db)
        result = service.analyze_product(product_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/batch-optimize", response_model=BatchOptimizationResponse)
def batch_optimize_prices(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Batch optimize prices. Future: Will be part of AI Pricing Engine."""
    service = PricingMLService(db)
    results = service.batch_analyze(category)
    return BatchOptimizationResponse(total_analyzed=len(results), results=results)


@router.post("/predict-revenue/{product_id}", response_model=RevenuePredictionResponse)
def predict_revenue_impact(
    product_id: int,
    new_price: float = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Predict revenue impact of a price change. Future: Will be part of AI Pricing Engine."""
    try:
        service = PricingMLService(db)
        result = service.get_revenue_prediction(product_id, new_price)
        return RevenuePredictionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
