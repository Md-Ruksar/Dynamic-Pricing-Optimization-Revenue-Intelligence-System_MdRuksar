"""
PricePilot AI - Pricing Schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PriceUpdateRequest(BaseModel):
    """Schema for manual price update."""
    new_price: float
    reason: Optional[str] = None


class PriceUpdateResponse(BaseModel):
    """Schema for price update response."""
    message: str
    product_id: int
    product_name: str
    old_price: float
    new_price: float
    change: float


class PriceHistoryEntry(BaseModel):
    """Schema for a single price history entry."""
    old_price: Optional[float] = None
    new_price: float
    change_reason: Optional[str] = None
    changed_by: Optional[int] = None
    created_at: datetime


class PriceOptimizationResponse(BaseModel):
    """Schema for AI price optimization result."""
    product_id: int
    product_name: str
    current_price: float
    suggested_price: float
    confidence_score: float
    expected_revenue_change: Optional[float] = None
    factors: list[str] = []
    market_position: Optional[str] = None
    recommendation: str


class BatchOptimizationResponse(BaseModel):
    """Schema for batch optimization results."""
    total_analyzed: int
    results: list[PriceOptimizationResponse]


class RevenuePredictionResponse(BaseModel):
    """Schema for revenue prediction result."""
    product_id: int
    product_name: str
    current_price: float
    suggested_price: float
    expected_units_sold: Optional[float] = None
    expected_revenue: Optional[float] = None
    current_revenue: Optional[float] = None
    revenue_change_pct: Optional[float] = None
    confidence: Optional[float] = None
