"""
PricePilot AI - Datasets Router
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/datasets", tags=["Datasets"])


@router.get("/")
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get list of available datasets and their status."""
    return {
        "datasets": [
            {
                "name": "Retail Pricing Dataset",
                "type": "retail-pricing",
                "status": "available",
                "description": "Retail pricing data with product categories, base prices, and current pricing",
            },
            {
                "name": "E-commerce Sales Dataset",
                "type": "ecommerce-sales",
                "status": "available",
                "description": "E-commerce sales transactions with channel, region, and customer segments",
            },
        ]
    }


@router.get("/stats")
def get_dataset_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dataset statistics and import logs."""
    from app.models.product import Product
    
    total_products = db.query(Product).count()
    categories = db.query(Product.category).distinct().count()
    
    return {
        "total_products": total_products,
        "total_categories": categories,
        "total_records": total_products,
        "last_import": None,
        "import_logs": [],
        "status": "No dataset loaded" if total_products == 0 else f"{total_products} products loaded",
    }
