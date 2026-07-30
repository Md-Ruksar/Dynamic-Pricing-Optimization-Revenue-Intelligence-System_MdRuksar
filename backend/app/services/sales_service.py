"""
PricePilot AI - Sales Service
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta

from app.models.sales import Sale
from app.models.product import Product
from app.schemas.sales import SalesAnalyticsResponse


class SalesService:
    """Service for sales analytics."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_analytics(self, days: int = 30) -> SalesAnalyticsResponse:
        """Get sales analytics for the specified period."""
        since = datetime.utcnow() - timedelta(days=days)
        
        sales_query = self.db.query(Sale).filter(Sale.created_at >= since)
        total_sales = sales_query.count()
        
        revenue_data = (
            sales_query.with_entities(
                func.coalesce(func.sum(Sale.total_amount), 0)
            ).first()
        )
        total_revenue = float(revenue_data[0]) if revenue_data else 0.0
        avg_value = round(total_revenue / total_sales, 2) if total_sales > 0 else 0.0
        
        # Top products
        top_products_rows = (
            sales_query.with_entities(
                Product.name,
                func.sum(Sale.quantity).label("units"),
                func.sum(Sale.total_amount).label("revenue"),
            )
            .join(Product, Product.id == Sale.product_id)
            .group_by(Product.name)
            .order_by(func.sum(Sale.total_amount).desc())
            .limit(10)
            .all()
        )
        top_products = [
            {"name": row.name, "units": int(row.units), "revenue": float(row.revenue)}
            for row in top_products_rows
        ]
        
        # Sales by channel
        channel_rows = (
            sales_query.with_entities(
                Sale.sale_channel,
                func.coalesce(func.sum(Sale.total_amount), 0),
            )
            .filter(Sale.sale_channel.isnot(None))
            .group_by(Sale.sale_channel)
            .all()
        )
        sales_by_channel = {str(row[0]): float(row[1]) for row in channel_rows}
        
        # Sales by region
        region_rows = (
            sales_query.with_entities(
                Sale.region,
                func.coalesce(func.sum(Sale.total_amount), 0),
            )
            .filter(Sale.region.isnot(None))
            .group_by(Sale.region)
            .all()
        )
        sales_by_region = {str(row[0]): float(row[1]) for row in region_rows}
        
        # Daily revenue
        daily_rows = (
            sales_query.with_entities(
                func.date(Sale.sale_date).label("date"),
                func.coalesce(func.sum(Sale.total_amount), 0),
            )
            .group_by(func.date(Sale.sale_date))
            .order_by(func.date(Sale.sale_date))
            .all()
        )
        daily_revenue = [
            {"date": str(row.date), "revenue": float(row[1])}
            for row in daily_rows
        ]
        
        return SalesAnalyticsResponse(
            total_sales=total_sales,
            total_revenue=round(total_revenue, 2),
            average_order_value=avg_value,
            top_products=top_products,
            sales_by_channel=sales_by_channel,
            sales_by_region=sales_by_region,
            daily_revenue=daily_revenue,
        )
