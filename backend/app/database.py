from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import get_settings
from app.models import Base

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


DEMO_FARM_ID = "demo-farm"

def init_db() -> None:
    """Create all tables and seed the demo farm if it doesn't exist yet."""
    Base.metadata.create_all(bind=engine)
    _seed_demo_farm()


def _seed_demo_farm() -> None:
    """Ensure the built-in demo farm always exists."""
    from app.models import Farm
    db: Session = SessionLocal()
    try:
        if not db.query(Farm).filter(Farm.farm_id == DEMO_FARM_ID).first():
            db.add(Farm(
                farm_id=DEMO_FARM_ID,
                crop_type="Demo",
                latitude=-6.9175,
                longitude=107.6191,
            ))
            db.commit()
    finally:
        db.close()


def get_db():
    """FastAPI dependency: yields a database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
