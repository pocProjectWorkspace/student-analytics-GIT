"""
Database initialization script for Student Analytics PoC
-------------------------------------------------------
This script creates all necessary database tables.
"""

from app.database.database import engine
from app.database.models import Base

def init_db():
    """Initialize the database by creating all tables"""
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Creating database tables...")
    init_db()
    print("Database initialization complete.")