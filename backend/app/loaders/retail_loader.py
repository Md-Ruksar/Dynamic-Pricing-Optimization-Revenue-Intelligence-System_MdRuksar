"""
PricePilot AI - Retail Pricing Dataset Loader
"""

import os
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.loaders.base_loader import read_csv_file
from app.models.product import Product
from app.models.user import User
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/loaders", tags=["Data Loaders"])

# CSV field to product field mapping
FIELD_MAPPING = {
    "product_name": "name",
    "name": "name",
    "sku": "sku",
    "product_sku": "sku",
    "category": "category",
    "product_category": "category",
    "base_price": "base_price",
    "original_price": "base_price",
    "current_price": "current_price",
    "price": "current_price",
    "selling_price": "current_price",
    "cost_price": "cost_price",
    "cost": "cost_price",
    "description": "description",
    "stock_quantity": "stock_quantity",
    "stock": "stock_quantity",
    "quantity": "stock_quantity",
    "revenue": "revenue",
    "image_url": "image_url",
    "image": "image_url",
    "product_image": "image_url",
}


def bulk_insert_products(rows: list, db: Session, user_id: int) -> MessageResponse:
    """Insert products from parsed CSV rows, avoiding duplicate SKUs."""
    inserted = 0
    skipped = 0
    errors = 0
    
    for row in rows:
        try:
            product_data = {}
            for csv_key, product_field in FIELD_MAPPING.items():
                if csv_key in row and row[csv_key]:
                    product_data[product_field] = row[csv_key]
            
            name = product_data.get("name", "").strip()
            sku = product_data.get("sku", "").strip()
            category = product_data.get("category", "").strip() or "Uncategorized"
            
            if not name or not sku:
                skipped += 1
                continue
            
            # Parse price
            price_str = product_data.get("current_price", product_data.get("base_price", "0"))
            try:
                price = float(price_str.replace("$", "").replace(",", ""))
            except (ValueError, AttributeError):
                price = 0.0
            
            base_price_str = product_data.get("base_price", str(price))
            try:
                base_price = float(base_price_str.replace("$", "").replace(",", ""))
            except (ValueError, AttributeError):
                base_price = price
            
            # Check for existing product by SKU
            existing = db.query(Product).filter(Product.sku == sku).first()
            if existing:
                skipped += 1
                continue
            
            # Parse optional fields
            cost_price = None
            if product_data.get("cost_price"):
                try:
                    cost_price = float(str(product_data["cost_price"]).replace("$", "").replace(",", ""))
                except (ValueError, AttributeError):
                    cost_price = None
            
            description = product_data.get("description", "")
            
            stock_qty = 0
            if product_data.get("stock_quantity"):
                try:
                    stock_qty = int(float(product_data["stock_quantity"]))
                except (ValueError, AttributeError):
                    stock_qty = 0
            
            revenue = 0.0
            if product_data.get("revenue"):
                try:
                    revenue = float(str(product_data["revenue"]).replace("$", "").replace(",", ""))
                except (ValueError, AttributeError):
                    revenue = 0.0
            
            product = Product(
                name=name,
                sku=sku,
                category=category,
                base_price=base_price,
                current_price=price,
                cost_price=cost_price,
                description=description,
                stock_quantity=stock_qty,
                revenue=revenue,
            )
            db.add(product)
            inserted += 1
            
        except Exception:
            errors += 1
            continue
    
    db.commit()
    
    return MessageResponse(
        message=f"Inserted {inserted} products, skipped {skipped}, errors {errors}. Loaded products from CSV.",
        status="success",
    )


@router.post("/retail-pricing", response_model=MessageResponse)
def load_retail_pricing(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Load retail pricing dataset from CSV file."""
    filepath = os.path.join(settings.DATA_DIR, "retail_pricing.csv")
    
    if not os.path.exists(filepath):
        filepath = os.path.join(settings.DATA_DIR, "seed_data", "retail_pricing.csv")
    
    rows = read_csv_file(filepath)
    return bulk_insert_products(rows, db, current_user.id)


@router.post("/retail-pricing/upload", response_model=MessageResponse)
async def upload_retail_pricing(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Upload a retail pricing CSV file and load it."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files accepted")
    
    content = await file.read()
    decoded = content.decode("utf-8-sig")
    
    return _parse_and_insert(decoded, db, current_user.id)


def _parse_and_insert(content: str, db: Session, user_id: int) -> MessageResponse:
    """Parse CSV content and insert products."""
    csv_io = io.StringIO(content)
    reader = csv.DictReader(csv_io)
    rows = list(reader)
    return bulk_insert_products(rows, db, user_id)
