"""
PricePilot AI - Common Schemas
"""

from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Standard message response."""
    message: str
    status: str = "success"
