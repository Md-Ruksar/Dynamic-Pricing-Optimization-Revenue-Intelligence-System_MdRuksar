"""
PricePilot AI - Datasets Router
"""

import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.services.dataset_service import DatasetProcessingService

router = APIRouter(prefix="/api/v1/datasets", tags=["Datasets"])


@router.get("/")
def list_datasets(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get list of processed datasets with their statistics."""
    service = DatasetProcessingService(db)
    datasets = service.list_datasets(limit=limit)
    return {
        "datasets": [
            {
                "id": d.id,
                "name": d.name,
                "dataset_type": d.dataset_type,
                "file_name": d.file_name,
                "source": d.source,
                "status": d.status,
                "rows": d.rows,
                "columns": d.columns,
                "missing_values": d.missing_values,
                "duplicate_count": d.duplicate_count,
                "category_count": d.category_count,
                "avg_price": d.avg_price,
                "total_revenue": d.total_revenue,
                "health_score": d.health_score,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in datasets
        ]
    }


@router.post("/upload")
def upload_dataset(
    file: UploadFile = File(...),
    dataset_type: str = Form("custom"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Upload a CSV or Excel dataset and process it (validate, clean, dedupe, stats)."""
    service = DatasetProcessingService(db)
    content = file.file.read()
    filename = file.filename or "upload.csv"

    # Save the source file so it can be re-imported later (unique name to avoid overwrites)
    stored_name = service.save_uploaded_file(content, filename)

    result = service.process_upload(content, filename, dataset_type, current_user.id, stored_name=stored_name)
    return {"message": "Dataset processed successfully", **result}


@router.post("/{dataset_id}/import")
def import_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pricing_manager"])),
):
    """Import a processed dataset into the product catalog."""
    service = DatasetProcessingService(db)
    return service.import_to_products(dataset_id, current_user.id)


@router.get("/{dataset_id}/preview")
def preview_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the stored preview and statistics for a processed dataset."""
    service = DatasetProcessingService(db)
    datasets = service.list_datasets(limit=200)
    dataset = next((d for d in datasets if d.id == dataset_id), None)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {
        "id": dataset.id,
        "name": dataset.name,
        "rows": dataset.rows,
        "columns": dataset.columns,
        "column_names": json.loads(dataset.column_names or "[]"),
        "pipeline_steps": json.loads(dataset.pipeline_steps or "[]"),
        "preview": json.loads(dataset.preview_rows or "[]"),
        "stats": {
            "missing_values": dataset.missing_values,
            "duplicate_count": dataset.duplicate_count,
            "category_count": dataset.category_count,
            "avg_price": dataset.avg_price,
            "total_revenue": dataset.total_revenue,
            "health_score": dataset.health_score,
        },
    }


@router.get("/stats")
def get_dataset_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dataset management summary statistics and import logs."""
    service = DatasetProcessingService(db)
    summary = service.get_summary()

    logs = service.list_import_logs(limit=20)
    return {
        **summary,
        "import_logs": [
            {
                "id": l.id,
                "action": l.action,
                "detail": l.detail,
                "rows_affected": l.rows_affected,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
    }


@router.get("/types")
def get_dataset_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get available dataset type templates."""
    return {
        "types": [
            {
                "type": "retail-pricing",
                "name": "Retail Pricing Dataset",
                "description": "Product pricing data with categories, base prices, and current prices",
                "expected_columns": ["product_name", "sku", "category", "base_price", "current_price", "cost_price", "stock_quantity"],
            },
            {
                "type": "ecommerce-sales",
                "name": "E-commerce Sales Dataset",
                "description": "Sales transactions with channel, region, and customer segments",
                "expected_columns": ["product_name", "sku", "sale_date", "unit_price", "quantity", "sale_channel", "region", "customer_segment"],
            },
            {
                "type": "custom",
                "name": "Custom Dataset",
                "description": "Any CSV/Excel with product and pricing columns",
                "expected_columns": ["name", "sku", "category", "price", "cost", "stock"],
            },
        ]
    }
