"""
PricePilot AI - Dataset Model
Stores processed datasets with statistics and import metadata.
"""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Dataset(Base):
    """Processed dataset metadata with statistics."""

    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    dataset_type = Column(String(50), nullable=False, default="custom")  # retail-pricing, ecommerce-sales, custom
    file_name = Column(String(255))
    source = Column(String(20), default="upload")  # upload, server, seed
    status = Column(String(20), default="processed")  # uploaded, processing, processed, failed

    # Statistics
    rows = Column(Integer, default=0)
    columns = Column(Integer, default=0)
    missing_values = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    category_count = Column(Integer, default=0)
    avg_price = Column(Float, default=0.0)
    total_revenue = Column(Float, default=0.0)
    health_score = Column(Float, default=0.0)  # 0-100
    column_names = Column(Text, default="[]")  # JSON list of column names

    # Processing pipeline state (JSON)
    pipeline_steps = Column(Text, default="[]")  # JSON list of processing steps executed
    preview_rows = Column(Text, default="[]")  # JSON preview of first rows
    error_message = Column(Text)

    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User")


class ImportLog(Base):
    """Log of dataset import events."""

    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"))
    action = Column(String(50), nullable=False)  # uploaded, validated, cleaned, deduplicated, processed, imported, failed
    detail = Column(Text)
    rows_affected = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    dataset = relationship("Dataset")
    user = relationship("User")
