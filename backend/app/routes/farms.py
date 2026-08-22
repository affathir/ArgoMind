"""
API route handlers for Farm, Sensor, Weather, and AI Insight endpoints.
"""
import logging
from datetime import date
from typing import List, Tuple

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Farm, SensorData, WeatherData, AIInsightHistory
from app.schemas import (
    FarmRegister, FarmOut,
    SensorDataOut, WeatherDataOut, AIInsightOut,
)
from app.services.ai_service import predict_disease, get_llm_advice

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/farms", tags=["farms"])


# ── GET /api/farms ────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=List[FarmOut],
    summary="List all registered farms",
)
def list_farms(db: Session = Depends(get_db)):
    """Return all registered farms ordered by farm_id."""
    return db.query(Farm).order_by(Farm.farm_id).all()


# ── GET /api/farms/{farm_id} ──────────────────────────────────────────────────

@router.get(
    "/{farm_id}",
    response_model=FarmOut,
    summary="Get a single farm by ID",
)
def get_farm(farm_id: str, db: Session = Depends(get_db)):
    """Return metadata for a single farm."""
    return _get_farm_or_404(farm_id, db)


# ── POST /api/farms/register ──────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=FarmOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new farm",
)
def register_farm(payload: FarmRegister, db: Session = Depends(get_db)):
    """Register a new farm. Provide either location_name (e.g. 'Bandung') or latitude+longitude."""
    existing = db.query(Farm).filter(Farm.farm_id == payload.farm_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Farm '{payload.farm_id}' is already registered.",
        )

    lat, lon = payload.latitude, payload.longitude

    # Resolve location name → coordinates if lat/lon not provided manually
    if (lat is None or lon is None) and payload.location_name:
        lat, lon = _resolve_location(payload.location_name)

    if lat is None or lon is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Isi nama lokasi (contoh: 'Bandung') atau koordinat lintang/bujur.",
        )

    farm = Farm(
        farm_id=payload.farm_id,
        crop_type=payload.crop_type,
        sowing_date=payload.sowing_date,
        latitude=lat,
        longitude=lon,
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    logger.info("Registered new farm: %s (%.4f, %.4f)", farm.farm_id, lat, lon)
    return farm


def _resolve_location(name: str) -> Tuple[float, float]:
    """Resolve a location name to (lat, lon) using OpenWeatherMap Geocoding API."""
    settings = get_settings()
    if not settings.OPENWEATHER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENWEATHER_API_KEY belum diset. Isi koordinat manual.",
        )
    try:
        r = httpx.get(
            "https://api.openweathermap.org/geo/1.0/direct",
            params={"q": name, "limit": 1, "appid": settings.OPENWEATHER_API_KEY},
            timeout=10,
        )
        r.raise_for_status()
        results = r.json()
    except httpx.HTTPError as exc:
        logger.error("Geocoding request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal menghubungi layanan geocoding. Coba lagi.",
        )

    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lokasi '{name}' tidak ditemukan. Coba nama kota yang lebih spesifik.",
        )

    loc = results[0]
    logger.info("Resolved '%s' → lat=%.4f, lon=%.4f (%s)", name, loc["lat"], loc["lon"], loc.get("country", ""))
    return loc["lat"], loc["lon"]


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
