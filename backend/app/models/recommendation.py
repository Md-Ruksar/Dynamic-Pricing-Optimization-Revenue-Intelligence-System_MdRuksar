"""
PricePilot AI - Recommendation Model
"""

from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class Recommendation(Base):
    """AI-generated pricing recommendations."""
    
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    recommended_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    confidence_score = Column(Float)
    expected_revenue_impact = Column(Float)
    factors_considered = Column(Text)
    status = Column(String(20), default="pending")  # pending, applied, rejected
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    product = relationship("Product")
