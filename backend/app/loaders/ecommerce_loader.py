"""
PricePilot AI - E-commerce Sales Dataset Loader
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
from app.loaders.retail_loader import bulk_insert_products
from app.models.user import User
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/loaders", tags=["Data Loaders"])


@router.post("/ecommerce-sales", response_model=MessageResponse)
def load_ecommerce_sales_from_file(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Load e-commerce sales dataset from CSV file on the server."""
    filepath = os.path.join(settings.DATA_DIR, "ecommerce_sales.csv")
    
    if not os.path.exists(filepath):
        filepath = os.path.join(settings.DATA_DIR, "seed_data", "ecommerce_sales.csv")
    
    rows = read_csv_file(filepath)
    return bulk_insert_products(rows, db, current_user.id)


@router.post("/ecommerce-sales/upload", response_model=MessageResponse)
async def upload_ecommerce_sales(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Upload an e-commerce sales CSV file and load it."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files accepted")
    
    content = await file.read()
    decoded = content.decode("utf-8-sig")
    
    reader = csv.DictReader(io.StringIO(decoded))
    rows = list(reader)
    
    return bulk_insert_products(rows, db, current_user.id)
