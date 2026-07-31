"""
PricePilot AI - Dashboard Schemas
"""

from pydantic import BaseModel
from typing import Optional, List


class CategorySummary(BaseModel):
    """Category statistics for dashboard."""
    category: str
    product_count: int


class RevenueSummary(BaseModel):
    """Revenue summary for dashboard."""
    total_revenue: float
    average_price: float
    min_price: float
    max_price: float
    total_cost: float
    margin: float


class DashboardResponse(BaseModel):
    """Complete dashboard response."""
    total_products: int
    active_products: int
    total_categories: int
    average_price: float
    categories: List[CategorySummary]
    revenue_summary: RevenueSummary
    dataset_loaded: bool = False
    dataset_status: str = "No dataset loaded"
    recent_activity: list = []
    product_count: int = 0

    # Enterprise KPIs
    in_stock: int = 0
    out_of_stock: int = 0
    total_revenue: float = 0.0
    total_datasets: int = 0
    ai_status: str = "Not ready"

    # Chart data
    category_distribution: list = []
    price_distribution: list = []
    revenue_trend: list = []
    recent_imports: list = []
