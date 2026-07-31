"""
PricePilot AI - Sales History Seeder
====================================
Backfills 6 months (180 days) of realistic daily sales transactions for every
product in the catalog. Used to give the dashboard revenue trend, Prophet
demand forecasts, and revenue analytics rich, real history.

Non-destructive: days that already have sales for a product are skipped, so
re-running never double-counts. Generation is deterministic (seed 42).
"""

import os
import random
import sys
from datetime import datetime, timedelta

# Make the backend package importable when run as `python scripts/seed_sales_history.py`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.sales import Sale
from app.models.product import Product

random.seed(42)

DAYS = 180

CHANNELS = ["Online", "Retail", "Marketplace", "Wholesale"]
REGIONS = ["North", "South", "East", "West", "Central"]
SEGMENTS = ["Consumer", "SMB", "Enterprise", "Government"]


def existing_dates(db: Session, product_id: int) -> set:
    """Return the set of dates that already have sales for this product."""
    rows = db.query(Sale.sale_date).filter(Sale.product_id == product_id).all()
    return {r[0].date() if r[0] else None for r in rows}


def seed_sales_for_product(db: Session, product: Product, existing: set) -> int:
    """Insert 180 days of sales for one product; returns rows added."""
    # Volume scales with popularity (stock as a proxy) and price (cheaper sells more)
    price = product.current_price or 10.0
    stock = product.stock_quantity or 50
    base_daily = max(2, min(12, int(stock / 30)))
    price_factor = max(0.6, min(2.5, 150 / max(price, 1)))
    base_units = max(1, int(base_daily * price_factor))

    batch = []
    inserted = 0
    today = datetime.utcnow().date()
    for day_offset in range(DAYS):
        date = today - timedelta(days=day_offset)
        if date in existing:
            continue
        # Weekend uplift + gentle 6-month trend (older days a bit lower)
        factor = 1.6 if date.weekday() >= 5 else 1.0
        trend = 0.8 + 0.4 * (day_offset / DAYS)  # grows toward present
        daily_units = max(1, int(base_units * factor * trend * random.uniform(0.4, 1.4)))
        for _ in range(daily_units):
            qty = random.randint(1, 3)
            unit_price = round(price * random.uniform(0.9, 1.1), 2)
            batch.append(Sale(
                product_id=product.id,
                quantity=qty,
                unit_price=unit_price,
                total_amount=round(unit_price * qty, 2),
                sale_date=datetime.combine(date, datetime.min.time())
                .replace(hour=random.randint(8, 21), minute=random.randint(0, 59)),
                sale_channel=random.choice(CHANNELS),
                region=random.choice(REGIONS),
                customer_segment=random.choice(SEGMENTS),
            ))
            if len(batch) >= 800:
                db.add_all(batch)
                db.commit()
                inserted += len(batch)
                batch = []
    if batch:
        db.add_all(batch)
        db.commit()
        inserted += len(batch)
    return inserted


def main():
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        total_rows = 0
        products_with_sales = 0
        for i, product in enumerate(products):
            existing = existing_dates(db, product.id)
            added = seed_sales_for_product(db, product, existing)
            total_rows += added
            if added > 0 or existing:
                products_with_sales += 1
            if (i + 1) % 100 == 0:
                print(f"  ...{i + 1}/{len(products)} products, {total_rows:,} rows so far")
        print(f"Seeded {total_rows:,} sales rows across {products_with_sales}/{len(products)} products")
        print(f"Total sales in table: {db.query(Sale).count():,}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
