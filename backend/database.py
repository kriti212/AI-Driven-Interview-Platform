import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL, SQLITE_URL, USE_SQLITE_FALLBACK

logger = logging.getLogger("uvicorn")

Base = declarative_base()

def get_engine_and_session():
    """
    Tries to connect to MySQL database as configured in DATABASE_URL.
    If MySQL connection fails or USE_SQLITE_FALLBACK is True, falls back gracefully to SQLite.
    """
    db_url = DATABASE_URL
    if USE_SQLITE_FALLBACK:
        db_url = SQLITE_URL
        logger.info(f"Using SQLite database fallback: {db_url}")

    try:
        if db_url.startswith("sqlite"):
            engine = create_engine(db_url, connect_args={"check_same_thread": False})
        else:
            # MySQL connection engine
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=5,
                max_overflow=10,
            )
            # Test connection
            with engine.connect() as conn:
                pass
            logger.info("Successfully connected to MySQL database.")
    except Exception as exc:
        logger.warning(f"Could not connect to MySQL using '{db_url}': {exc}")
        logger.info(f"Falling back to local SQLite database: {SQLITE_URL}")
        db_url = SQLITE_URL
        engine = create_engine(db_url, connect_args={"check_same_thread": False})

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine, SessionLocal

engine, SessionLocal = get_engine_and_session()

def init_db():
    """Create tables if they do not exist and ensure schema compatibility."""
    Base.metadata.create_all(bind=engine)
    try:
        if not str(engine.url).startswith("sqlite"):
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE interview_logs MODIFY COLUMN question_id INT NULL;"))
                conn.commit()
    except Exception as e:
        logger.warning(f"Could not execute schema update for question_id: {e}")

def get_db():
    """FastAPI Dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

