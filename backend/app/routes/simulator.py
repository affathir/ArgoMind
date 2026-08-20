"""
simulator.py
------------
Endpoint untuk mensimulasikan pengiriman data sensor IoT tanpa hardware nyata.
Digunakan untuk demo dan testing di ArgoMind dashboard.
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
    farm_id: str = Field(..., description="Farm ID tujuan")
    soil_moisture: float = Field(..., ge=0, le=100, description="Kelembapan tanah (%)")
    soil_ph: float = Field(..., ge=0, le=14, description="pH tanah")
    temperature: float = Field(..., ge=-10, le=60, description="Suhu udara (°C)")
    humidity: float = Field(..., ge=0, le=100, description="Kelembapan udara (%)")


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


# ── Preset skenario ───────────────────────────────────────────────────────────

PRESETS = {
    "normal": {
        "label": "Kondisi Normal",
        "soil_moisture": 55.0,
        "soil_ph": 6.5,
        "temperature": 28.0,
        "humidity": 65.0,
    },
    "kekeringan": {
        "label": "Kekeringan (Kelembapan Kritis)",
        "soil_moisture": 12.0,
        "soil_ph": 6.2,
        "temperature": 37.0,
        "humidity": 28.0,
    },
    "banjir": {
        "label": "Potensi Busuk Akar (Terlalu Lembap)",
        "soil_moisture": 88.0,
        "soil_ph": 4.8,
        "temperature": 26.0,
        "humidity": 92.0,
    },
    "panas_ekstrem": {
        "label": "Suhu Ekstrem",
        "soil_moisture": 30.0,
        "soil_ph": 6.8,
        "temperature": 41.0,
        "humidity": 22.0,
    },
    "ph_tinggi": {
        "label": "pH Tanah Terlalu Tinggi",
        "soil_moisture": 50.0,
        "soil_ph": 8.2,
        "temperature": 30.0,
        "humidity": 60.0,
    },
    "ph_rendah": {
        "label": "pH Tanah Terlalu Rendah",
        "soil_moisture": 48.0,
        "soil_ph": 4.5,
        "temperature": 29.0,
        "humidity": 55.0,
    },
}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/presets", summary="Dapatkan daftar preset skenario simulasi")
def get_presets():
    """Kembalikan daftar preset skenario yang tersedia."""
    return PRESETS


@router.post(
    "/send",
    response_model=SimulatorOut,
    status_code=status.HTTP_201_CREATED,
    summary="Kirim data sensor simulasi ke farm",
)
def send_simulated_sensor(payload: SimulatorPayload, db: Session = Depends(get_db)):
    """Simpan data sensor simulasi ke database seolah-olah dikirim dari perangkat IoT."""
    farm = db.query(Farm).filter(Farm.farm_id == payload.farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm '{payload.farm_id}' tidak ditemukan. Daftarkan farm terlebih dahulu.",
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
        message="Data sensor berhasil dikirim ke dashboard.",
        sensor_id=sensor.id,
        farm_id=sensor.farm_id,
        soil_moisture=sensor.soil_moisture,
        soil_ph=sensor.soil_ph,
        temperature=sensor.temperature,
        humidity=sensor.humidity,
    )
