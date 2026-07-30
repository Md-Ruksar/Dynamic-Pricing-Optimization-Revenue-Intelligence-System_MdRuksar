"""
PricePilot AI - Seed Data Script
Populates the database with realistic sample products for Milestone 1.
Uses curated Unsplash photos that visually match each product.
"""

from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.pricing_history import PricingHistory
from app.models.activity_log import ActivityLog

SAMPLE_PRODUCTS = [
    {
        "name": "Wireless Noise-Cancelling Headphones Pro",
        "sku": "AUD-001",
        "description": "Premium over-ear headphones with active noise cancellation, 30-hour battery life, and Hi-Res audio support. Features comfortable memory foam ear cushions and foldable design.",
        "category": "Electronics",
        "base_price": 249.99,
        "current_price": 199.99,
        "cost_price": 145.00,
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 145,
        "revenue": 28998.55,
    },
    {
        "name": "Organic Cotton Casual Shirt",
        "sku": "APP-001",
        "description": "Sustainably sourced 100% organic cotton shirt. Breathable fabric with a modern slim fit. Available in multiple colors. Machine washable.",
        "category": "Clothing",
        "base_price": 49.99,
        "current_price": 39.99,
        "cost_price": 22.00,
        "image_url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 320,
        "revenue": 12796.80,
    },
    {
        "name": "Smart Fitness Watch Ultra",
        "sku": "ELC-002",
        "description": "Advanced fitness tracker with GPS, heart rate monitoring, blood oxygen sensor, and 7-day battery life. Water resistant to 50 meters.",
        "category": "Electronics",
        "base_price": 299.99,
        "current_price": 279.99,
        "cost_price": 178.00,
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 89,
        "revenue": 24919.11,
    },
    {
        "name": "Professional Chef's Knife Set",
        "sku": "KIT-001",
        "description": "8-piece stainless steel knife set with ergonomic handles. Includes chef's knife, bread knife, utility knife, paring knife, and sharpening rod.",
        "category": "Home & Kitchen",
        "base_price": 129.99,
        "current_price": 89.99,
        "cost_price": 55.00,
        "image_url": "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 67,
        "revenue": 6029.33,
    },
    {
        "name": "Ergonomic Office Chair Pro",
        "sku": "FUR-001",
        "description": "Fully adjustable ergonomic mesh chair with lumbar support, adjustable armrests, tilt lock, and breathable mesh back. Supports up to 300 lbs.",
        "category": "Furniture",
        "base_price": 449.99,
        "current_price": 399.99,
        "cost_price": 260.00,
        "image_url": "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 34,
        "revenue": 13599.66,
    },
    {
        "name": "Stainless Steel Water Bottle 32oz",
        "sku": "OUT-001",
        "description": "Double-wall vacuum insulated water bottle. Keeps drinks cold 24hrs or hot 12hrs. BPA-free, leak-proof lid with carrying loop.",
        "category": "Sports & Outdoors",
        "base_price": 34.99,
        "current_price": 29.99,
        "cost_price": 14.00,
        "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 512,
        "revenue": 15358.88,
    },
    {
        "name": "Bluetooth Portable Speaker Boom",
        "sku": "AUD-002",
        "description": "Waterproof portable speaker with 360° sound, 20-hour battery, built-in microphone, and USB-C charging. IP67 rated for outdoor use.",
        "category": "Electronics",
        "base_price": 79.99,
        "current_price": 69.99,
        "cost_price": 38.00,
        "image_url": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 203,
        "revenue": 14207.97,
    },
    {
        "name": "Bamboo Cutting Board Set",
        "sku": "KIT-002",
        "description": "Set of 3 organic bamboo cutting boards in different sizes. Knife-friendly surface, natural anti-bacterial properties, with juice grooves.",
        "category": "Home & Kitchen",
        "base_price": 44.99,
        "current_price": 34.99,
        "cost_price": 18.00,
        "image_url": "https://images.unsplash.com/photo-1594226801341-41427b4e5c3d?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 178,
        "revenue": 6228.22,
    },
    {
        "name": "Ultralight Running Shoes",
        "sku": "APP-002",
        "description": "Breathable knit upper running shoes with responsive cushioning and anti-slip rubber outsole. Weighs only 8.5 oz. Ideal for daily training.",
        "category": "Clothing",
        "base_price": 119.99,
        "current_price": 89.99,
        "cost_price": 52.00,
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 156,
        "revenue": 14038.44,
    },
    {
        "name": "Smart LED Desk Lamp",
        "sku": "ELC-003",
        "description": "Touch-controlled LED desk lamp with 5 brightness levels, 3 color temperatures, USB charging port, and adjustable gooseneck. Eye-care technology.",
        "category": "Electronics",
        "base_price": 59.99,
        "current_price": 49.99,
        "cost_price": 28.00,
        "image_url": "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 234,
        "revenue": 11697.66,
    },
    {
        "name": "Premium Yoga Mat",
        "sku": "SPO-001",
        "description": "Extra thick 6mm eco-friendly TPE yoga mat with alignment lines. Non-slip surface, moisture resistant, includes carrying strap.",
        "category": "Sports & Outdoors",
        "base_price": 39.99,
        "current_price": 34.99,
        "cost_price": 16.00,
        "image_url": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 289,
        "revenue": 10112.11,
    },
    {
        "name": "French Press Coffee Maker",
        "sku": "KIT-003",
        "description": "34oz borosilicate glass French press with stainless steel plunger and mesh filter. Makes 8 cups. Dishwasher safe components.",
        "category": "Home & Kitchen",
        "base_price": 39.99,
        "current_price": 32.99,
        "cost_price": 16.00,
        "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 167,
        "revenue": 5509.33,
    },
    {
        "name": "Minimalist Leather Wallet",
        "sku": "ACC-001",
        "description": "Slim RFID-blocking bifold wallet crafted from full-grain leather. Holds up to 8 cards and cash. Available in brown and black.",
        "category": "Accessories",
        "base_price": 54.99,
        "current_price": 44.99,
        "cost_price": 25.00,
        "image_url": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 198,
        "revenue": 8908.02,
    },
    {
        "name": "Mechanical Gaming Keyboard RGB",
        "sku": "ELC-004",
        "description": "Full-size mechanical keyboard with Cherry MX Blue switches, per-key RGB lighting, aircraft-grade aluminum frame, and detachable USB-C cable.",
        "category": "Electronics",
        "base_price": 149.99,
        "current_price": 129.99,
        "cost_price": 78.00,
        "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 92,
        "revenue": 11959.08,
    },
    {
        "name": "Himalayan Salt Lamp",
        "sku": "HOM-001",
        "description": "Hand-carved Himalayan crystal salt lamp with natural wooden base. Features dimmer switch and warm amber glow. Creates a relaxing ambiance.",
        "category": "Home & Kitchen",
        "base_price": 29.99,
        "current_price": 24.99,
        "cost_price": 11.00,
        "image_url": "https://images.unsplash.com/photo-1544636330-e8c0f24493e4?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 412,
        "revenue": 10295.88,
    },
    {
        "name": "Canvas Backpack Travel Pro",
        "sku": "ACC-002",
        "description": "Vintage style waxed canvas backpack with padded laptop compartment (fits 15\"), multiple organizer pockets, and genuine leather accents.",
        "category": "Accessories",
        "base_price": 89.99,
        "current_price": 74.99,
        "cost_price": 42.00,
        "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center",
        "stock_quantity": 123,
        "revenue": 9223.77,
    },
]


def seed_database(db: Session):
    """Seed the database with sample products if empty."""
    existing_count = db.query(Product).count()
    if existing_count > 0:
        print(f"Database already has {existing_count} products, skipping seed.")
        return

    print("Seeding database with sample products...")

    for i, product_data in enumerate(SAMPLE_PRODUCTS):
        product = Product(**product_data)
        db.add(product)
        db.flush()

        # Add pricing history entry
        history = PricingHistory(
            product_id=product.id,
            old_price=product.base_price,
            new_price=product.current_price,
            change_reason="Initial pricing setup",
            changed_by=None,
        )
        db.add(history)

        # Add activity log
        activity = ActivityLog(
            action=f"Product '{product.name}' created",
            resource_type="product",
            resource_id=product.id,
            details=f"Seeded with initial price ${product.current_price:.2f}",
            user_id=None,
        )
        db.add(activity)

    db.commit()
    print(f"Successfully seeded {len(SAMPLE_PRODUCTS)} products into the database!")
