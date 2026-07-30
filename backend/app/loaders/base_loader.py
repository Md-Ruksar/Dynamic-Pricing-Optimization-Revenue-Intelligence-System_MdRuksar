"""
PricePilot AI - Base CSV Loader
"""

import csv
import os
from typing import Any, List, Dict
from fastapi import HTTPException, status


def read_csv_file(filepath: str) -> List[Dict[str, Any]]:
    """Read a CSV file and return a list of dictionaries."""
    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CSV file not found: {filepath}",
        )
    
    rows = []
    with open(filepath, "r", encoding="utf-8-sig") as csvfile:
        reader = csv.DictReader(csvfile)
        headers = reader.fieldnames
        if not headers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file is empty or has no headers",
            )
        
        for row in reader:
            cleaned = {k.strip(): v.strip() if v else "" for k, v in row.items()}
            rows.append(cleaned)
    
    return rows
