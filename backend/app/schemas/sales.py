"""
PricePilot AI - Sales Schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SaleBase(BaseModel):
    """Base sale schema."""
    product_id: int
    quantity: int = 1
    unit_price: float
    total_amount: float
    sale_date: Optional[datetime] = None
    sale_channel: Optional[str] = None
    region: Optional[str] = None
    customer_segment: Optional[str] = None


class SaleCreate(SaleBase):
    """Schema for creating a sale."""
    pass


class SaleResponse(SaleBase):
    """Schema for sale response."""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class SalesAnalyticsResponse(BaseModel):
    """Schema for sales analytics."""
    total_sales: int
    total_revenue: float
    average_order_value: float
    top_products: list = []
    sales_by_channel: dict = {}
    sales_by_region: dict = {}
    daily_revenue: list = []
