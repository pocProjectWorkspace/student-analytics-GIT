"""
Database configuration for Student Analytics PoC
-----------------------------------------------
This module sets up the SQLAlchemy engine and session management.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment or use SQLite default for PoC
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./student_analytics.db")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base model
Base = declarative_base()

# Dependency to get DB session
def get_db():
    """Dependency for FastAPI to get a database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()