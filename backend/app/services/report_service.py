"""
PricePilot AI - Report Service
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Any

from app.models.product import Product
from app.models.sales import Sale
from app.models.pricing_history import PricingHistory


class ReportService:
    """Service for generating business reports."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def pricing_performance_report(self) -> dict:
        """Generate pricing performance analysis report."""
        products = self.db.query(Product).all()
        total = len(products)
        overpriced = sum(1 for p in products if p.current_price > p.base_price * 1.2)
        underpriced = sum(1 for p in products if p.current_price < p.base_price * 0.8)
        optimally_priced = total - overpriced - underpriced
        
        return {
            "title": "Pricing Performance Report",
            "total_products": total,
            "overpriced": overpriced,
            "underpriced": underpriced,
            "optimally_priced": optimally_priced,
            "avg_price_deviation": round(
                sum(abs(p.current_price - p.base_price) / p.base_price * 100 for p in products) / total, 2
            ) if total > 0 else 0,
        }
    
    def revenue_analysis_report(self) -> dict:
        """Generate revenue analysis report."""
        revenue_data = (
            self.db.query(
                func.coalesce(func.sum(Sale.total_amount), 0),
                func.count(Sale.id),
                func.coalesce(func.avg(Sale.total_amount), 0),
            ).first()
        )
        
        top_categories = (
            self.db.query(
                Product.category,
                func.coalesce(func.sum(Sale.total_amount), 0).label("revenue"),
            )
            .join(Sale, Sale.product_id == Product.id)
            .group_by(Product.category)
            .order_by(func.sum(Sale.total_amount).desc())
            .all()
        )
        
        return {
            "title": "Revenue Analysis Report",
            "total_revenue": round(float(revenue_data[0]), 2) if revenue_data else 0,
            "total_transactions": revenue_data[1] if revenue_data else 0,
            "average_transaction_value": round(float(revenue_data[2]), 2) if revenue_data else 0,
            "top_categories": [
                {"category": r[0], "revenue": round(float(r[1]), 2)}
                for r in top_categories if r[0]
            ],
        }
    
    def product_performance_report(self) -> dict:
        """Generate product performance report."""
        products = (
            self.db.query(Product)
            .order_by(Product.revenue.desc())
            .limit(20)
            .all()
        )
        
        return {
            "title": "Product Performance Report",
            "products": [
                {
                    "id": p.id,
                    "name": p.name,
                    "category": p.category,
                    "current_price": round(p.current_price, 2),
                    "stock_quantity": p.stock_quantity,
                    "revenue": round(p.revenue or 0, 2),
                    "margin": round(
                        ((p.current_price - p.cost_price) / p.current_price * 100), 2
                    ) if p.cost_price and p.cost_price > 0 else 0,
                }
                for p in products
            ],
        }
