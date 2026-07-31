"""
PricePilot AI - Forecast Model
Stores Prophet-based demand forecast runs per product so forecasts can be
cached, re-served quickly, and fed into price optimization without retraining.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class ForecastRun(Base):
    """A cached Prophet forecast run for a single product."""

    __tablename__ = "forecast_runs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    horizon = Column(Integer, nullable=False, default=30)

    # JSON payloads
    points = Column(Text, default="[]")     # [{date, yhat, yhat_lower, yhat_upper}] forecast points
    history = Column(Text, default="[]")    # [{date, actual}] historical daily revenue
    metrics = Column(Text, default="{}")    # {growth_pct, avg_daily, forecast_total, last_actual, ...}

    model_info = Column(String(200), default="Prophet")
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    product = relationship("Product")
