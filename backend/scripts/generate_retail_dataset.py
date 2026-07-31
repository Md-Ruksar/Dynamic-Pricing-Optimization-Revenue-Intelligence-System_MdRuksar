"""
PricePilot AI - Retail Pricing Dataset Generator
=================================================
Generates a realistic 520-product retail pricing dataset (CSV) that can be
loaded through the standard dataset pipeline (upload -> validate -> clean ->
dedupe -> stats -> import).

Columns match the pipeline's accepted aliases:
  name, sku, category, base_price, current_price, cost_price,
  stock_quantity, revenue, description, image_url

Generation is deterministic (fixed seed) so re-runs produce identical output.
"""

import csv
import random
import os

random.seed(42)

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data_uploaded", "retail_catalog_520.csv")
OUT_PATH = os.path.normpath(OUT_PATH)

# ---------------------------------------------------------------------------
# Category templates: (category, prefix, [brands], [product types], price band)
# ---------------------------------------------------------------------------
CATEGORY_TEMPLATES = [
    ("Electronics", "ELC", ["NovaTech", "VoltEdge", "PulseCore", "Apex Digital", "Skyline Audio"],
     ["Wireless Earbuds", "Bluetooth Speaker", "Smartwatch", "4K Action Camera", "LED Monitor",
      "USB-C Hub", "Mechanical Keyboard", "Wireless Mouse", "Smart Plug", "Wi-Fi Router",
      "Power Bank", "Webcam", "External SSD", "E-Reader", "Digital Photo Frame"],
     (19.99, 899.99)),
    ("Clothing", "APP", ["UrbanFit", "CottonLab", "Nordic Threads", "Aurora Wear", "Stride Apparel"],
     ["Cotton T-Shirt", "Denim Jacket", "Running Leggings", "Hoodie", "Chino Pants",
      "Polo Shirt", "Windbreaker", "Sweater", "Puffer Vest", "Socks 6-Pack"],
     (9.99, 149.99)),
    ("Home & Kitchen", "KIT", ["HomeCraft", "ChefSelect", "KitchenPro", "Nest & Co", "Ironwood"],
     ["Nonstick Pan Set", "Chef's Knife", "Blender", "Air Fryer", "Coffee Maker",
      "Cutting Board Set", "Mixing Bowl Set", "Slow Cooker", "Toaster", "Kettle"],
     (14.99, 399.99)),
    ("Furniture", "FUR", ["Solid Oak", "ModernNest", "ComfortLine", "UrbanWood", "ErgoLiving"],
     ["Office Chair", "Standing Desk", "Bookshelf", "Nightstand", "Dining Table",
      "Sofa Bed", "Desk Lamp", "Rug 5x7", "Storage Ottoman", "Floating Shelf Set"],
     (49.99, 1499.99)),
    ("Sports & Outdoors", "SPO", ["TrailBlazer", "PeakForce", "SummitGear", "FlexMotion", "OutdoorPro"],
     ["Yoga Mat", "Resistance Bands", "Hiking Backpack", "Camping Tent", "Insulated Bottle",
      "Dumbbell Set", "Fitness Tracker", "Sleeping Bag", "Jump Rope", "Cooler 24L"],
     (9.99, 349.99)),
    ("Accessories", "ACC", ["MetroStyle", "LeatherWorks", "UrbanCase", "SilverLine", "CraftLeather"],
     ["Leather Wallet", "Canvas Backpack", "Sunglasses", "Watch Band", "Keychain Set",
      "Phone Case", "Laptop Sleeve", "Belt", "Scarf", "Cap"],
     (7.99, 129.99)),
    ("Beauty & Personal Care", "BPC", ["PureGlow", "VelvetSkin", "AromaEssence", "LuxeCare", "BotanicBloom"],
     ["Facial Serum", "Moisturizer", "Shampoo Set", "Perfume", "Hair Dryer",
      "Electric Toothbrush", "Face Roller", "Bath Set", "Sunscreen SPF50", "Lip Balm Set"],
     (6.99, 199.99)),
    ("Toys & Games", "TOY", ["PlayWorld", "FunFactory", "BrightKids", "GameCraft", "ToyTrove"],
     ["Building Blocks", "Remote Car", "Board Game", "Plush Bear", "Puzzle 1000pc",
      "Action Figure", "RC Drone", "Art Set", "Robot Kit", "Chess Set"],
     (8.99, 249.99)),
    ("Automotive", "AUT", ["DrivePro", "AutoMax", "RoadMate", "GearHead", "Turbofix"],
     ["Car Vacuum", "Jump Starter", "Dash Cam", "Tire Inflator", "Seat Cover Set",
      "Car Phone Mount", "Floor Mats", "LED Headlights", "Interior Cleaner Kit", "Roof Rack"],
     (12.99, 599.99)),
    ("Office Supplies", "OFF", ["WorkWise", "DeskPro", "PaperTrail", "EfficientOffice", "StaplerPro"],
     ["Ergonomic Mouse Pad", "Desk Organizer", "Notebook Set", "Pen 12-Pack", "Stapler",
      "Paper Shredder", "Whiteboard", "File Folders", "Calculator", "Desk Tray"],
     (3.99, 189.99)),
    ("Books & Media", "MED", ["PageTurner", "StoryHouse", "AudioWorld", "CanvasPress", "MindGrow"],
     ["Fiction Novel", "Self-Help Guide", "Cookbook", "Audio Book", "Hardcover Classic",
      "Coloring Book", "Planner 2026", "Photography Book", "Children's Book", "Business Book"],
     (5.99, 89.99)),
    ("Pet Supplies", "PET", ["PetHaven", "FurryFriend", "Paws&Co", "PetLife", "HappyTail"],
     ["Dog Bed", "Cat Tree", "Pet Food 5kg", "Leash & Collar", "Litter Box",
      "Pet Water Fountain", "Grooming Kit", "Dog Toy Set", "Pet Carrier", "Automatic Feeder"],
     (6.99, 279.99)),
    ("Health & Wellness", "HLT", ["VitalCare", "PureHealth", "LifePulse", "WellNest", "CarePlus"],
     ["Blood Pressure Monitor", "Massage Gun", "Humidifier", "Sleep Mask", "Posture Corrector",
      "Electric Heated Blanket", "Thermometer", "Air Purifier", "Back Massager", "Scale"],
     (9.99, 329.99)),
    ("Tools & Hardware", "TLT", ["IronGrip", "ToolMaster", "BuildRight", "FixFast", "PrecisionPro"],
     ["Cordless Drill", "Screwdriver Set", "Measuring Tape", "Hammer", "Toolbox",
      "Level Set", "Work Gloves", "Drill Bit Set", "Utility Knife", "Clamp Set"],
     (4.99, 259.99)),
]

BRAND_MODELS = {
    "Electronics": ["Pro", "Max", "Air", "Ultra", "Lite", "Elite", "Smart", "One"],
    "Clothing": ["Classic", "Slim", "Relaxed", "Premium", "Essential", "Flex"],
    "Home & Kitchen": ["Pro", "Deluxe", "Compact", "Heavy-Duty", "Elite"],
    "Furniture": ["Deluxe", "Compact", "Ergonomic", "Modern", "Classic"],
    "Sports & Outdoors": ["Pro", "Flex", "Trail", "Extreme", "Compact"],
    "Accessories": ["Classic", "Slim", "Vintage", "Premium", "Minimal"],
    "Beauty & Personal Care": ["Daily", "Pro", "Gentle", "Intense", "Hydrating"],
    "Toys & Games": ["Classic", "Pro", "Deluxe", "Junior", "Mega"],
    "Automotive": ["Pro", "Heavy-Duty", "Compact", "Max", "Universal"],
    "Office Supplies": ["Heavy-Duty", "Compact", "Premium", "Standard"],
    "Books & Media": ["Deluxe", "Pocket", "Hardcover", "Collector"],
    "Pet Supplies": ["Comfort", "Deluxe", "Pro", "Large", "Standard"],
    "Health & Wellness": ["Pro", "Deluxe", "Portable", "Smart", "Comfort"],
    "Tools & Hardware": ["Pro", "Heavy-Duty", "Compact", "Precision", "Cordless"],
}


def discount_for(category: str) -> float:
    """Typical discount depth per category (current/base ratio)."""
    bands = {
        "Electronics": (0.72, 0.92),
        "Clothing": (0.55, 0.85),
        "Home & Kitchen": (0.65, 0.90),
        "Furniture": (0.70, 0.95),
        "Sports & Outdoors": (0.60, 0.88),
        "Accessories": (0.55, 0.85),
        "Beauty & Personal Care": (0.60, 0.85),
        "Toys & Games": (0.65, 0.90),
        "Automotive": (0.70, 0.92),
        "Office Supplies": (0.60, 0.85),
        "Books & Media": (0.50, 0.80),
        "Pet Supplies": (0.65, 0.90),
        "Health & Wellness": (0.68, 0.90),
        "Tools & Hardware": (0.62, 0.88),
    }
    lo, hi = bands.get(category, (0.65, 0.9))
    return random.uniform(lo, hi)


def build_description(name: str, category: str, base_price: float, stock: int) -> str:
    stock_note = "In stock and ready to ship." if stock > 0 else "Currently out of stock - backorder available."
    quality = random.choice(["Premium-quality", "Durable", "Compact", "Lightweight", "Ergonomic"])
    return (
        f"{quality} {name} from the {category} range. "
        f"{random.choice(['Designed for daily use', 'Built to last with premium materials', 'A customer favorite', 'Perfect for professionals'])}. "
        f"Retails at ${base_price:.2f}. {stock_note}"
    )


def generate_rows(target_count: int = 520):
    rows = []
    per_category = max(6, target_count // len(CATEGORY_TEMPLATES))
    sku_index = {}

    for category, prefix, brands, types, (lo, hi) in CATEGORY_TEMPLATES:
        count = per_category + (1 if category == "Electronics" else 0)
        models = BRAND_MODELS[category]
        for i in range(count):
            brand = random.choice(brands)
            product_type = random.choice(types)
            model = random.choice(models)
            # Keep SKUs unique and stable per category. Start at a 100+ offset
            # so they never collide with existing catalog SKUs (seeded AUD-001..
            # and the earlier retail_pricing.csv imports ELC-005.. etc.), which
            # the import pipeline would otherwise skip as duplicates.
            idx = sku_index.get(prefix, 0) + 1
            sku_index[prefix] = idx
            sku = f"{prefix}-{100 + idx:03d}"

            base_price = round(random.uniform(lo, hi), 2)
            discount = discount_for(category)
            current_price = round(base_price * discount, 2)
            cost_price = round(current_price * random.uniform(0.45, 0.75), 2)

            # Some items out of stock; larger stock for low-price categories
            if random.random() < 0.08:
                stock = 0
            else:
                stock = int(random.lognormvariate(4.2, 1.1))
            stock = min(stock, 2500)

            # 6-month revenue estimate: units sold * current price
            units_sold = int(random.lognormvariate(6.0, 1.0)) if stock > 0 else int(random.uniform(5, 60))
            revenue = round(units_sold * current_price, 2)

            name = f"{brand} {product_type} {model}"
            rows.append({
                "name": name,
                "sku": sku,
                "category": category,
                "base_price": base_price,
                "current_price": current_price,
                "cost_price": cost_price,
                "stock_quantity": stock,
                "revenue": revenue,
                "description": build_description(name, category, base_price, stock),
                # Leave image blank: the catalog uses small thumbnails with a
                # graceful fallback rather than requiring remote images.
                "image_url": "",
            })
    return rows


def main():
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    rows = generate_rows()
    with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    cats = {}
    for r in rows:
        cats[r["category"]] = cats.get(r["category"], 0) + 1
    prices = [r["current_price"] for r in rows]
    print(f"Wrote {len(rows)} products -> {OUT_PATH}")
    print(f"Categories: {len(cats)}")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n}")
    print(f"Price range: ${min(prices):.2f} - ${max(prices):.2f}")
    print(f"Avg current price: ${sum(prices)/len(prices):.2f}")
    print(f"Out of stock: {sum(1 for r in rows if r['stock_quantity'] == 0)}")


if __name__ == "__main__":
    main()
