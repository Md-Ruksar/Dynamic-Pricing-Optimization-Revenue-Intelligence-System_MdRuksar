"""
PricePilot AI - Pricing Router
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.recommendation import Recommendation
from app.models.pricing_history import PricingHistory
from app.models.activity_log import ActivityLog
from app.schemas.pricing import PriceUpdateRequest
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


@router.get("/recommendations")
def list_recommendations(
    status_filter: str = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List AI recommendations with product details."""
    query = db.query(Recommendation).order_by(Recommendation.created_at.desc())
    if status_filter:
        query = query.filter(Recommendation.status == status_filter)
    recs = query.limit(limit).all()

    from app.models.product import Product
    result = []
    for r in recs:
        product = db.query(Product).filter(Product.id == r.product_id).first()
        result.append({
            "id": r.id,
            "product_id": r.product_id,
            "product_name": product.name if product else f"Product #{r.product_id}",
            "current_price": r.current_price,
            "recommended_price": r.recommended_price,
            "confidence_score": r.confidence_score,
            "expected_revenue_impact": r.expected_revenue_impact,
            "factors_considered": r.factors_considered,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


@router.post("/recommendations/{recommendation_id}/approve", response_model=dict)
def approve_recommendation(
    recommendation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Approve an AI recommendation and apply the price change."""
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    if rec.status != "pending":
        raise HTTPException(status_code=400, detail=f"Recommendation already {rec.status}")

    from app.models.product import Product
    product = db.query(Product).filter(Product.id == rec.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_price = product.current_price
    product.current_price = rec.recommended_price

    db.add(PricingHistory(
        product_id=product.id,
        old_price=old_price,
        new_price=rec.recommended_price,
        ai_suggested_price=rec.recommended_price,
        change_reason="AI recommendation approved",
        changed_by=current_user.id,
    ))
    rec.status = "applied"
    db.add(ActivityLog(
        action=f"Applied AI price recommendation for '{product.name}'",
        resource_type="product",
        resource_id=product.id,
        details=f"${old_price:.2f} → ${rec.recommended_price:.2f} (confidence {rec.confidence_score:.0f}%)",
        user_id=current_user.id,
    ))
    db.commit()
    return {
        "message": "Recommendation approved and price applied",
        "product_id": product.id,
        "old_price": round(old_price, 2),
        "new_price": round(rec.recommended_price, 2),
    }


@router.post("/recommendations/{recommendation_id}/reject", response_model=dict)
def reject_recommendation(
    recommendation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Reject an AI recommendation."""
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    if rec.status != "pending":
        raise HTTPException(status_code=400, detail=f"Recommendation already {rec.status}")

    rec.status = "rejected"
    db.add(ActivityLog(
        action=f"Rejected AI price recommendation for product #{rec.product_id}",
        resource_type="product",
        resource_id=rec.product_id,
        user_id=current_user.id,
    ))
    db.commit()
    return {"message": "Recommendation rejected", "recommendation_id": recommendation_id}
