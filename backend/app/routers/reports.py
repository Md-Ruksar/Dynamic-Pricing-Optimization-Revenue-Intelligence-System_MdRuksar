"""
PricePilot AI - Reports Router
Generates revenue, pricing, product, user, and dataset reports with CSV / Excel / PDF export.
"""

import io
import csv

import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


def _rows_to_csv_stream(rows: list, headers: list):
    """Build a streaming CSV response."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([row.get(h, "") for h in headers])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=report.csv"},
    )


def _rows_to_excel(rows: list):
    """Build an Excel response from a list of dict rows."""
    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Report")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=report.xlsx"},
    )


def _rows_to_pdf(title: str, rows: list, headers: list):
    """Build a PDF response from rows using fpdf2."""
    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 12, title, ln=True, align="C")
    pdf.ln(4)
    pdf.set_font("helvetica", "B", 8)
    pdf.set_fill_color(37, 99, 235)
    pdf.set_text_color(255, 255, 255)
    for h in headers:
        pdf.cell(pdf.w / max(len(headers), 1), 7, str(h)[:24], border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_font("helvetica", "", 7)
    pdf.set_text_color(0, 0, 0)
    pdf.set_fill_color(248, 250, 252)
    fill = False
    for row in rows:
        for h in headers:
            val = row.get(h, "")
            if isinstance(val, float):
                val = f"{val:,.2f}"
            pdf.cell(pdf.w / max(len(headers), 1), 6, str(val)[:24], border=1, fill=fill, align="C")
        pdf.ln()
        fill = not fill
        if pdf.get_y() > 270:
            pdf.add_page()
            pdf.set_font("helvetica", "B", 8)
            pdf.set_fill_color(37, 99, 235)
            pdf.set_text_color(255, 255, 255)
            for h in headers:
                pdf.cell(pdf.w / max(len(headers), 1), 7, str(h)[:24], border=1, fill=True, align="C")
            pdf.ln()
            pdf.set_font("helvetica", "", 7)
            pdf.set_text_color(0, 0, 0)
    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={title.lower().replace(' ', '_')}.pdf"},
    )


@router.get("/revenue")
def get_revenue_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revenue analysis report data."""
    service = ReportService(db)
    return service.revenue_analysis_report()


@router.get("/pricing-performance")
def get_pricing_performance_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pricing performance report data."""
    service = ReportService(db)
    return service.pricing_performance_report()


@router.get("/product-performance")
def get_product_performance_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Product performance report data."""
    service = ReportService(db)
    return service.product_performance_report()


@router.get("/users")
def get_users_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Users summary report data."""
    from app.models.user import User as UserModel
    users = db.query(UserModel).all()
    return {
        "title": "Users Report",
        "total_users": len(users),
        "active_users": sum(1 for u in users if u.is_active),
        "inactive_users": sum(1 for u in users if not u.is_active),
        "role_breakdown": {
            "admin": sum(1 for u in users if u.role == "admin"),
            "pricing_manager": sum(1 for u in users if u.role == "pricing_manager"),
            "business_user": sum(1 for u in users if u.role == "business_user"),
        },
        "users": [
            {
                "username": u.username,
                "email": u.email,
                "full_name": u.full_name or "",
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else "",
            }
            for u in users
        ],
    }


@router.get("/datasets")
def get_datasets_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Datasets summary report data."""
    from app.models.dataset import Dataset
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    return {
        "title": "Datasets Report",
        "total_datasets": len(datasets),
        "datasets": [
            {
                "name": d.name,
                "type": d.dataset_type,
                "rows": d.rows,
                "columns": d.columns,
                "missing_values": d.missing_values,
                "duplicate_count": d.duplicate_count,
                "health_score": d.health_score,
                "status": d.status,
                "created_at": d.created_at.isoformat() if d.created_at else "",
            }
            for d in datasets
        ],
    }


@router.get("/export")
def export_report(
    report_type: str = Query(..., pattern="^(revenue|pricing|products|users|datasets)$"),
    format: str = Query(..., pattern="^(csv|xlsx|pdf)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export a report as CSV, Excel, or PDF."""
    service = ReportService(db)

    if report_type == "revenue":
        data = service.revenue_analysis_report()
        rows = [
            {"metric": "Total Revenue", "value": data["total_revenue"]},
            {"metric": "Total Transactions", "value": data["total_transactions"]},
            {"metric": "Average Transaction Value", "value": data["average_transaction_value"]},
        ]
        for cat in data.get("top_categories", []):
            rows.append({"metric": f"Revenue - {cat['category']}", "value": cat["revenue"]})
        headers = ["metric", "value"]
        title = "Revenue Analysis Report"

    elif report_type == "pricing":
        data = service.pricing_performance_report()
        rows = [
            {"metric": "Total Products", "value": data["total_products"]},
            {"metric": "Overpriced", "value": data["overpriced"]},
            {"metric": "Underpriced", "value": data["underpriced"]},
            {"metric": "Optimally Priced", "value": data["optimally_priced"]},
            {"metric": "Avg Price Deviation (%)", "value": data["avg_price_deviation"]},
        ]
        headers = ["metric", "value"]
        title = "Pricing Performance Report"

    elif report_type == "products":
        data = service.product_performance_report()
        rows = data.get("products", [])
        headers = ["name", "category", "current_price", "stock_quantity", "revenue", "margin"]
        title = "Product Performance Report"

    elif report_type == "users":
        data = get_users_report(db=db, current_user=current_user)
        rows = [
            {"username": u["username"], "email": u["email"], "full_name": u["full_name"],
             "role": u["role"], "is_active": u["is_active"]}
            for u in data["users"]
        ]
        headers = ["username", "email", "full_name", "role", "is_active"]
        title = "Users Report"

    else:  # datasets
        data = get_datasets_report(db=db, current_user=current_user)
        rows = data.get("datasets", [])
        headers = ["name", "type", "rows", "columns", "missing_values", "duplicate_count", "health_score", "status"]
        title = "Datasets Report"

    if format == "csv":
        return _rows_to_csv_stream(rows, headers)
    if format == "xlsx":
        return _rows_to_excel(rows)
    return _rows_to_pdf(title, rows, headers)
