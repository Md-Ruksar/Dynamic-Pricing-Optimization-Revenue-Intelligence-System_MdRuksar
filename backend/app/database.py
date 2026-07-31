"""
PricePilot AI - Database Configuration
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings

DATABASE_URL = settings.DATABASE_URL

# SQLite needs check_same_thread=False for FastAPI's threaded access
_connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    _connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_schema():
    """Non-destructive startup migration.
    Adds columns to existing tables that were introduced after the schema was first
    created (create_all only creates missing tables, never missing columns).
    """
    if not DATABASE_URL.startswith("sqlite"):
        return
    try:
        import sqlite3
        db_path = DATABASE_URL.replace("sqlite:///", "")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Users table new columns
        users_cols = {row[1] for row in cur.execute("PRAGMA table_info(users)").fetchall()}
        user_additions = {
            "google_id": "VARCHAR(100)",
            "avatar_url": "VARCHAR(500)",
            "notifications_enabled": "BOOLEAN DEFAULT 1",
        }
        for col, ddl in user_additions.items():
            if col not in users_cols:
                cur.execute(f"ALTER TABLE users ADD COLUMN {col} {ddl}")

        # Datasets / import_logs tables (create_all handles them, but ensure they exist)
        existing = {row[0] for row in cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
        if "datasets" not in existing:
            cur.execute("""CREATE TABLE datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(200) NOT NULL,
                dataset_type VARCHAR(50) NOT NULL DEFAULT 'custom',
                file_name VARCHAR(255),
                source VARCHAR(20) DEFAULT 'upload',
                status VARCHAR(20) DEFAULT 'processed',
                rows INTEGER DEFAULT 0,
                columns INTEGER DEFAULT 0,
                missing_values INTEGER DEFAULT 0,
                duplicate_count INTEGER DEFAULT 0,
                category_count INTEGER DEFAULT 0,
                avg_price FLOAT DEFAULT 0,
                total_revenue FLOAT DEFAULT 0,
                health_score FLOAT DEFAULT 0,
                column_names TEXT DEFAULT '[]',
                pipeline_steps TEXT DEFAULT '[]',
                preview_rows TEXT DEFAULT '[]',
                error_message TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Schema migration skipped: {e}")
