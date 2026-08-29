"""
simulator.py
------------
Endpoint for simulating IoT sensor data transmission without actual hardware.
Used for demo and testing in the ArgoMind dashboard.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Farm, SensorData

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/simulator", tags=["simulator"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SimulatorPayload(BaseModel):
    farm_id: str = Field(..., description="Target Farm ID")
    soil_moisture: float = Field(..., ge=0, le=100, description="Soil moisture (%)")
    soil_ph: float = Field(..., ge=0, le=14, description="Soil pH")
    temperature: float = Field(..., ge=-10, le=60, description="Air temperature (°C)")
    humidity: float = Field(..., ge=0, le=100, description="Air humidity (%)")


class SimulatorOut(BaseModel):
    success: bool
    message: str
    sensor_id: int
    farm_id: str
    soil_moisture: float
    soil_ph: float
    temperature: float
    humidity: float

    class Config:
        from_attributes = True


# ── Preset scenarios ──────────────────────────────────────────────────────────

PRESETS = {
    "normal": {
        "label": "Normal Conditions",
        "soil_moisture": 55.0,
        "soil_ph": 6.5,
        "temperature": 28.0,
        "humidity": 65.0,
    },
    "drought": {
        "label": "Drought (Critical Moisture)",
        "soil_moisture": 12.0,
        "soil_ph": 6.2,
        "temperature": 37.0,
        "humidity": 28.0,
    },
    "flood_risk": {
        "label": "Root Rot Risk (Too Wet)",
        "soil_moisture": 88.0,
        "soil_ph": 4.8,
        "temperature": 26.0,
        "humidity": 92.0,
    },
    "extreme_heat": {
        "label": "Extreme Heat",
        "soil_moisture": 30.0,
        "soil_ph": 6.8,
        "temperature": 41.0,
        "humidity": 22.0,
    },
    "high_ph": {
        "label": "Soil pH Too High",
        "soil_moisture": 50.0,
        "soil_ph": 8.2,
        "temperature": 30.0,
        "humidity": 60.0,
    },
    "low_ph": {
        "label": "Soil pH Too Low",
        "soil_moisture": 48.0,
        "soil_ph": 4.5,
        "temperature": 29.0,
        "humidity": 55.0,
    },
}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/presets", summary="Get list of simulation scenario presets")
def get_presets():
    """Return list of available simulation scenario presets."""
    return PRESETS


@router.post(
    "/send",
    response_model=SimulatorOut,
    status_code=status.HTTP_201_CREATED,
    summary="Send simulated sensor data to farm",
)
def send_simulated_sensor(payload: SimulatorPayload, db: Session = Depends(get_db)):
    """Save simulated sensor data to database as if sent from an IoT device."""
    farm = db.query(Farm).filter(Farm.farm_id == payload.farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm '{payload.farm_id}' not found. Please register the farm first.",
        )

    sensor = SensorData(
        farm_id=payload.farm_id,
        soil_moisture=payload.soil_moisture,
        soil_ph=payload.soil_ph,
        temperature=payload.temperature,
        humidity=payload.humidity,
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)

    logger.info(
        "Simulated sensor — farm=%s moisture=%.1f ph=%.1f temp=%.1f humidity=%.1f",
        payload.farm_id, payload.soil_moisture, payload.soil_ph,
        payload.temperature, payload.humidity,
    )

    return SimulatorOut(
        success=True,
        message="Sensor data successfully sent to dashboard.",
        sensor_id=sensor.id,
        farm_id=sensor.farm_id,
        soil_moisture=sensor.soil_moisture,
        soil_ph=sensor.soil_ph,
        temperature=sensor.temperature,
        humidity=sensor.humidity,
    )
