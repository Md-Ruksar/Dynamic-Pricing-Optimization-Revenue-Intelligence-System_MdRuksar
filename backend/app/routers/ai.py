"""
PricePilot AI - AI Pricing Engine Router
Real ML-powered price optimization using Random Forest, XGBoost, and Linear Regression.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Optional, Dict

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.services.ml_service import PricingMLService
from app.services.forecast_service import ForecastService

router = APIRouter(prefix="/api/v1/ai", tags=["AI Pricing Engine"])


@router.get("/status")
def get_ai_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI engine status: data availability, models, recommendation counts."""
    service = PricingMLService(db)
    return service.get_model_status()


@router.get("/forecast")
def forecast_portfolio(
    horizon: int = Query(30, ge=7, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quick demand outlook across the whole catalog (fast trend analysis)."""
    service = ForecastService(db)
    return service.portfolio_summary(horizon)


@router.get("/forecast/{product_id}")
def forecast_product_demand(
    product_id: int,
    horizon: int = Query(30, ge=7, le=180),
    force: bool = Query(False, description="Re-train the Prophet model, ignoring the cache"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Prophet demand forecast for one product with 80% confidence intervals.

    Returns forecast points (yhat / yhat_lower / yhat_upper), the historical
    daily revenue series, and growth metrics. Cached for 6 hours per horizon.
    """
    try:
        service = ForecastService(db)
        return service.forecast_product(product_id, horizon, force, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/optimize/{product_id}")
def optimize_product_price(
    product_id: int,
    include_forecast: bool = Query(False, description="Fold the demand forecast into the recommendation"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Get AI-powered price optimization for a product using real trained models.

    When ``include_forecast=true`` the Prophet demand signal is folded into the
    suggested price (conservative in declining demand, room to test higher in
    rising demand).
    """
    try:
        service = PricingMLService(db)
        result = service.analyze_product(product_id, include_forecast=include_forecast)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/optimize/{product_id}/save")
def save_recommendation(
    product_id: int,
    body: Dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Persist an AI recommendation to the approval workflow."""
    service = PricingMLService(db)
    analysis = service.analyze_product(product_id)
    if analysis.get("insufficient_data"):
        raise HTTPException(status_code=400, detail=analysis["recommendation"])
    rec = service.save_recommendation(analysis, current_user.id)
    return {
        "message": "Recommendation saved for approval",
        "recommendation_id": rec.id,
        "status": rec.status,
        "recommended_price": rec.recommended_price,
        "confidence_score": rec.confidence_score,
    }


@router.get("/batch-optimize")
def batch_optimize_prices(
    category: Optional[str] = Query(None),
    include_forecast: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Batch analyze all products (optionally filtered by category)."""
    service = PricingMLService(db)
    results = service.batch_analyze(category, include_forecast=include_forecast)
    return {"total_analyzed": len(results), "results": results}


@router.post("/predict-revenue/{product_id}")
def predict_revenue_impact(
    product_id: int,
    new_price: float = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Predict revenue impact of a price change using the trained model."""
    try:
        service = PricingMLService(db)
        result = service.get_revenue_prediction(product_id, new_price)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
