"""
PricePilot AI - Pricing History Model
"""

from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class PricingHistory(Base):
    """Track all pricing changes for audit and analysis."""
    
    __tablename__ = "pricing_history"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    old_price = Column(Float)
    new_price = Column(Float, nullable=False)
    ai_suggested_price = Column(Float)
    change_reason = Column(String(200))
    changed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="pricing_history")
    changed_by_user = relationship("User", back_populates="price_changes")
