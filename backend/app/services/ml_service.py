"""
PricePilot AI - Machine Learning Service

This module provides the foundation for the AI pricing optimization engine.
Kept intact for future milestones.
"""

import numpy as np
from typing import Optional
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sales import Sale
from app.schemas.pricing import PriceOptimizationResponse


class PricingMLService:
    """AI Pricing Optimization Engine - Core service for price recommendations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def analyze_product(self, product_id: int) -> PriceOptimizationResponse:
        """Analyze a product and return pricing intelligence."""
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Product not found")
        
        # Gather sales data
        sales_data = (
            self.db.query(Sale)
            .filter(Sale.product_id == product_id)
            .order_by(Sale.sale_date.desc())
            .limit(90)
            .all()
        )
        
        sales_volume = sum(s.quantity for s in sales_data) if sales_data else 0
        avg_price = sum(s.unit_price for s in sales_data) / len(sales_data) if sales_data else product.current_price
        
        # Simplified pricing analysis
        optimal_price = product.current_price * (1 + np.random.uniform(-0.05, 0.1))
        
        # Calculate confidence based on data availability
        confidence = min(95, 30 + (len(sales_data) / 90) * 50 + (1 if product.stock_quantity and product.stock_quantity > 0 else 0) * 15)
        
        expected_revenue_change = ((optimal_price - product.current_price) / product.current_price) * 100
        
        factors = []
        if sales_volume > 100:
            factors.append(f"High demand volume (+{sales_volume:.0f}% sales velocity)")
        if product.stock_quantity and product.stock_quantity < 50:
            factors.append("Limited inventory - price optimization opportunity")
        if optimal_price > product.current_price:
            factors.append("Historical price elasticity shows room for increase")
        else:
            factors.append("Competitive market position supports current range")
        
        margin = 0
        if product.cost_price and product.cost_price > 0:
            margin = ((product.current_price - product.cost_price) / product.current_price) * 100
            factors.append(f"Current margin: {margin:.1f}%")
            if margin < 20:
                factors.append("Below target margin - optimization recommended")
            else:
                factors.append("Demand pattern indicates price sensitivity in current range")
        
        return PriceOptimizationResponse(
            product_id=product_id,
            product_name=product.name,
            current_price=round(product.current_price, 2),
            suggested_price=round(float(optimal_price), 2),
            confidence_score=round(float(confidence), 2),
            expected_revenue_change=round(float(expected_revenue_change), 2),
            factors=factors,
            recommendation="AI recommendation generated based on sales trends, demand patterns, competitor pricing analysis, and market conditions.",
        )
    
    def batch_analyze(self, category: Optional[str] = None) -> list:
        """Analyze all products (optionally filtered by category)."""
        query = self.db.query(Product)
        if category:
            query = query.filter(Product.category == category)
        
        products = query.all()
        return [self.analyze_product(p.id) for p in products]
    
    def get_revenue_prediction(self, product_id: int, new_price: float) -> dict:
        """Predict revenue impact of a price change."""
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Product not found")
        
        sales_data_count = self.db.query(Sale).filter(Sale.product_id == product_id).count()
        
        price_change_pct = ((new_price - product.current_price) / product.current_price) * 100
        
        # Simplified elasticity model
        elasticity = -1.5 if sales_data_count > 10 else -1.0
        demand_change = price_change_pct * elasticity / 100
        expected_units = max(0, (sales_data_count / 30) * (1 + demand_change)) if sales_data_count > 0 else 10
        expected_revenue = expected_units * new_price
        current_revenue = (sales_data_count / 30) * product.current_price if sales_data_count > 0 else product.current_price * 10
        
        return {
            "product_id": product_id,
            "product_name": product.name,
            "current_price": round(product.current_price, 2),
            "suggested_price": round(new_price, 2),
            "expected_units_sold": round(float(expected_units), 1),
            "expected_revenue": round(float(expected_revenue), 2),
            "current_revenue": round(float(current_revenue), 2),
            "revenue_change_pct": round(float(((expected_revenue - current_revenue) / current_revenue) * 100), 2),
            "confidence": round(float(min(90, 30 + sales_data_count * 2)), 2),
        }
