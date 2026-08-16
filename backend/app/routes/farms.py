"""
API route handlers for Farm, Sensor, Weather, and AI Insight endpoints.
"""
import logging
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Farm, SensorData, WeatherData, AIInsightHistory
from app.schemas import (
    FarmRegister, FarmOut,
    SensorDataOut, WeatherDataOut, AIInsightOut,
)
from app.services.ai_service import predict_disease, get_llm_advice

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/farms", tags=["farms"])


# ── POST /api/farms/register ──────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=FarmOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new farm",
)
def register_farm(payload: FarmRegister, db: Session = Depends(get_db)):
    """Register a new farm with its coordinates and Telegram ID."""
    existing = db.query(Farm).filter(Farm.farm_id == payload.farm_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Farm '{payload.farm_id}' is already registered.",
        )

    farm = Farm(**payload.model_dump())
    db.add(farm)
    db.commit()
    db.refresh(farm)
    logger.info("Registered new farm: %s", farm.farm_id)
    return farm


# ── GET /api/farms/{farm_id}/sensors ─────────────────────────────────────────

@router.get(
    "/{farm_id}/sensors",
    response_model=List[SensorDataOut],
    summary="Get latest sensor readings for a farm",
)
def get_sensors(
    farm_id: str,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Return the most recent sensor readings for the given farm."""
    _get_farm_or_404(farm_id, db)
    rows = (
        db.query(SensorData)
        .filter(SensorData.farm_id == farm_id)
        .order_by(SensorData.timestamp.desc())
        .limit(limit)
        .all()
    )
    return rows


# ── GET /api/farms/{farm_id}/weather ─────────────────────────────────────────

@router.get(
    "/{farm_id}/weather",
    response_model=WeatherDataOut,
    summary="Get today's weather data for a farm",
)
def get_weather(farm_id: str, db: Session = Depends(get_db)):
    """Return today's weather record for the given farm."""
    _get_farm_or_404(farm_id, db)
    record = (
        db.query(WeatherData)
        .filter(WeatherData.farm_id == farm_id, WeatherData.date == date.today())
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No weather data available for today. Scheduler may not have run yet.",
        )
    return record


# ── GET /api/farms/{farm_id}/insight ─────────────────────────────────────────

@router.get(
    "/{farm_id}/insight",
    response_model=AIInsightOut,
    summary="Get AI insight (ML prediction + LLM advice)",
)
def get_insight(farm_id: str, db: Session = Depends(get_db)):
    """
    Calls ML and LLM placeholder functions, persists the result,
    and returns the latest AI insight for the given farm.
    """
    farm = _get_farm_or_404(farm_id, db)

    # Gather latest sensor snapshot
    latest_sensor = (
        db.query(SensorData)
        .filter(SensorData.farm_id == farm_id)
        .order_by(SensorData.timestamp.desc())
        .first()
    )
    sensor_dict = {
        "soil_moisture": latest_sensor.soil_moisture if latest_sensor else None,
        "soil_ph": latest_sensor.soil_ph if latest_sensor else None,
        "temperature": latest_sensor.temperature if latest_sensor else None,
        "humidity": latest_sensor.humidity if latest_sensor else None,
    }

    # Gather latest weather snapshot
    latest_weather = (
        db.query(WeatherData)
        .filter(WeatherData.farm_id == farm_id, WeatherData.date == date.today())
        .first()
    )
    context = {
        "farm_id": farm_id,
        "crop_type": farm.crop_type,
        **sensor_dict,
        "rainfall_mm": latest_weather.rainfall_mm if latest_weather else None,
        "sunlight_hours": latest_weather.sunlight_hours if latest_weather else None,
    }

    # Call placeholders
    ml_prediction = predict_disease(sensor_dict)
    llm_advice = get_llm_advice(context)

    # Persist
    record = AIInsightHistory(
        farm_id=farm_id,
        ml_disease_prediction=ml_prediction,
        llm_advice=llm_advice,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info("AI insight generated and saved for farm %s", farm_id)
    return record


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_farm_or_404(farm_id: str, db: Session) -> Farm:
    farm = db.query(Farm).filter(Farm.farm_id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm '{farm_id}' not found.",
        )
    return farm
