"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


# ── Farm ──────────────────────────────────────────────────────────────────────

class FarmRegister(BaseModel):
    farm_id: str = Field(..., min_length=1, max_length=64)
    crop_type: Optional[str] = None
    sowing_date: Optional[date] = None
    location_name: Optional[str] = None          # "Bandung" → resolved to lat/lon by backend
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class FarmOut(BaseModel):
    farm_id: str
    crop_type: Optional[str]
    sowing_date: Optional[date]
    latitude: float
    longitude: float

    class Config:
        from_attributes = True


# ── Sensor ────────────────────────────────────────────────────────────────────

class SensorDataOut(BaseModel):
    id: int
    farm_id: str
    timestamp: datetime
    soil_moisture: Optional[float]
    soil_ph: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]

    class Config:
        from_attributes = True


# ── Weather ───────────────────────────────────────────────────────────────────

class WeatherDataOut(BaseModel):
    id: int
    farm_id: str
    date: date
    rainfall_mm: Optional[float]
    sunlight_hours: Optional[float]

    class Config:
        from_attributes = True


# ── AI Insight ────────────────────────────────────────────────────────────────

class AIInsightOut(BaseModel):
    id: int
    farm_id: str
    timestamp: datetime
    ml_disease_prediction: Optional[str]
    llm_advice: Optional[str]

    class Config:
        from_attributes = True
