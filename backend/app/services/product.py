"""
PricePilot AI - Product Service
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    """Service for product CRUD operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, data: ProductCreate, user_id: int) -> Product:
        """Create a new product."""
        existing = self.db.query(Product).filter(Product.sku == data.sku).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Product with this SKU already exists",
            )
        
        product = Product(
            name=data.name,
            sku=data.sku,
            category=data.category,
            base_price=data.base_price,
            current_price=data.current_price,
            cost_price=data.cost_price,
            description=data.description,
            stock_quantity=data.stock_quantity,
            revenue=data.revenue or 0.0,
        )
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product
    
    def get_by_id(self, product_id: int) -> Product:
        """Get a product by ID."""
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )
        return product
    
    def list_all(self, skip: int = 0, limit: int = 20,
                 category: Optional[str] = None,
                 search: Optional[str] = None) -> tuple:
        """List products with pagination, filtering, and search."""
        query = self.db.query(Product)
        
        if category:
            query = query.filter(Product.category == category)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Product.name.ilike(search_pattern)) |
                (Product.sku.ilike(search_pattern))
            )
        
        total = query.count()
        products = (
            query.order_by(Product.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return total, products
    
    def update(self, product_id: int, data: ProductUpdate) -> Product:
        """Update a product."""
        product = self.get_by_id(product_id)
        update_data = data.model_dump(exclude_unset=True)
        
        if "sku" in update_data:
            existing = (
                self.db.query(Product)
                .filter(Product.sku == update_data["sku"], Product.id != product_id)
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="SKU already in use by another product",
                )
        
        for field, value in update_data.items():
            setattr(product, field, value)
        
        self.db.commit()
        self.db.refresh(product)
        return product
    
    def delete(self, product_id: int):
        """Delete a product."""
        product = self.get_by_id(product_id)
        self.db.delete(product)
        self.db.commit()
    
    def get_categories(self) -> list:
        """Get all distinct product categories."""
        results = self.db.query(Product.category).distinct().all()
        return [r[0] for r in results if r[0]]
