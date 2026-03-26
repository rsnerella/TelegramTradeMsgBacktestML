"""
Database setup and session management
Using SQLAlchemy ORM with SQLite
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path

# Get the backend directory
BACKEND_DIR = Path(__file__).parent.parent
DB_PATH = BACKEND_DIR / "telegram_backtest.db"

# Create database URL
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine with connection pooling for SQLite
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Allow multi-threaded access
    echo=False  # Set to True for SQL logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db():
    """
    Dependency for FastAPI to get database session
    Yields a session and ensures it's closed after use
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database by creating all tables
    Call this on application startup
    """
    from models import Channel, Signal, BacktestResult, RawMessage
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized: {DB_PATH}")


def drop_db():
    """
    Drop all tables (for testing/reset)
    WARNING: This will delete all data
    """
    from models import Channel, Signal, BacktestResult, RawMessage
    Base.metadata.drop_all(bind=engine)
    print(f"Database dropped: {DB_PATH}")


if __name__ == "__main__":
    # Initialize database when run directly
    init_db()
