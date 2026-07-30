"""
PricePilot AI - MongoDB Configuration
"""

from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

from app.config import settings


class MongoDB:
    """MongoDB connection manager."""
    
    client: Optional[AsyncIOMotorClient] = None
    db = None
    
    @classmethod
    async def connect(cls):
        """Connect to MongoDB."""
        mongo_url = settings.MONGODB_URL
        cls.client = AsyncIOMotorClient(mongo_url)
        cls.db = cls.client[settings.MONGODB_DB_NAME]
    
    @classmethod
    async def close(cls):
        """Close MongoDB connection."""
        if cls.client:
            cls.client.close()
    
    @classmethod
    def get_collection(cls, name):
        """Get a MongoDB collection by name."""
        if cls.db is None:
            raise RuntimeError("MongoDB not connected")
        return cls.db[name]


mongo_db = MongoDB()
