"""
PricePilot AI - Dashboard Service
"""

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.product import Product
from app.schemas.dashboard import DashboardResponse, CategorySummary, RevenueSummary


class DashboardService:
    """Service for dashboard metrics and analytics."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_dashboard(self) -> DashboardResponse:
        """Get comprehensive dashboard data."""
        # Total products
        total_products = self.db.query(func.count(Product.id)).scalar() or 0
        
        # Categories
        category_rows = (
            self.db.query(Product.category, func.count(Product.id))
            .group_by(Product.category)
            .all()
        )
        categories = [
            CategorySummary(category=cat, product_count=count)
            for cat, count in category_rows if cat
        ]
        
        # Revenue data
        revenue_data = (
            self.db.query(
                func.coalesce(func.sum(Product.revenue), 0),
                func.coalesce(func.avg(Product.current_price), 0),
                func.coalesce(func.min(Product.current_price), 0),
                func.coalesce(func.max(Product.current_price), 0),
                func.coalesce(func.sum(Product.cost_price), 0),
            ).first()
        )
        
        total_revenue = float(revenue_data[0]) if revenue_data else 0.0
        avg_price = float(revenue_data[1]) if revenue_data else 0.0
        min_price = float(revenue_data[2]) if revenue_data else 0.0
        max_price = float(revenue_data[3]) if revenue_data else 0.0
        total_cost = float(revenue_data[4]) if revenue_data else 0.0
        margin = round(((total_revenue - total_cost) / total_revenue * 100) if total_revenue > 0 else 0, 2)
        
        revenue_summary = RevenueSummary(
            total_revenue=round(total_revenue, 2),
            average_price=round(avg_price, 2),
            min_price=round(min_price, 2),
            max_price=round(max_price, 2),
            total_cost=round(total_cost, 2),
            margin=margin,
        )
        
        active_products = self.db.query(func.count(Product.id)).filter(
            Product.status == "active"
        ).scalar() or 0
        
        return DashboardResponse(
            total_products=total_products,
            active_products=active_products,
            total_categories=len(categories),
            average_price=round(avg_price, 2),
            categories=categories,
            revenue_summary=revenue_summary,
            product_count=total_products,
        )
