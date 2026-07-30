"""
PricePilot AI - Dynamic Pricing & Revenue Intelligence System
Main Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.mongodb import mongo_db

# Core routers (Milestone 1)
from app.routers import auth
from app.routers import products
from app.routers import dashboard
from app.routers import pricing
from app.routers import datasets
from app.routers import users

# Future modules (code kept intact, routes hidden from UI until Milestone 2+)
from app.routers import ai
from app.routers import reports
from app.routers import sales
from app.routers import activity

# Data loaders
from app.loaders.retail_loader import router as retail_router
from app.loaders.ecommerce_loader import router as ecommerce_router
from app.seed_data import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Create database tables on startup
    Base.metadata.create_all(bind=engine)
    
    # Seed sample products if database is empty
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        print(f"Seeding skipped: {e}")
    finally:
        db.close()
    
    # Connect to MongoDB
    try:
        await mongo_db.connect()
    except Exception as e:
        print(f"MongoDB connection skipped: {e}")
    
    yield
    
    # Cleanup on shutdown
    await mongo_db.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes - Milestone 1 (Active)
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(dashboard.router)
app.include_router(pricing.router)
app.include_router(datasets.router)
app.include_router(users.router)

# API Routes - Future Modules (Backend APIs kept intact)
# These routes exist but are hidden from UI until their milestone is enabled
app.include_router(ai.router)
app.include_router(reports.router)
app.include_router(sales.router)
app.include_router(activity.router)

# Data Loaders
app.include_router(retail_router)
app.include_router(ecommerce_router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "name": settings.APP_NAME,
    }
