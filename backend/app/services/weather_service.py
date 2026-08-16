"""
OpenWeatherMap daily weather fetcher.
Runs as a scheduled job via APScheduler.
"""
import logging
import httpx
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Farm, WeatherData
from app.database import SessionLocal

logger = logging.getLogger(__name__)
settings = get_settings()

OWM_URL = "https://api.openweathermap.org/data/2.5/forecast"


def _calculate_daily_rain(forecast_list: list) -> float:
    """Sum 3-hour rain volumes for the next 24 hours."""
    total = 0.0
    for item in forecast_list[:8]:  # 8 × 3h = 24h
        rain = item.get("rain", {}).get("3h", 0.0)
        total += rain
    return round(total, 2)


def _estimate_sunlight_hours(forecast_list: list) -> float:
    """
    Rough estimate: count 3-hour blocks with cloud cover < 50%
    during daylight (06:00–18:00 local UTC).
    """
    sunny_blocks = 0
    for item in forecast_list[:8]:
        dt = datetime.fromtimestamp(item["dt"], tz=timezone.utc)
        if 6 <= dt.hour < 18:
            clouds = item.get("clouds", {}).get("all", 100)
            if clouds < 50:
                sunny_blocks += 1
    return round(sunny_blocks * 1.5, 1)  # each block ~1.5h


def fetch_weather_for_farm(farm: Farm, db: Session) -> None:
    """Fetch today's weather forecast for a single farm and upsert into DB."""
    if not settings.OPENWEATHER_API_KEY:
        logger.warning("OPENWEATHER_API_KEY not set — skipping weather fetch")
        return

    params = {
        "lat": farm.latitude,
        "lon": farm.longitude,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
        "cnt": 8,
    }

    try:
        response = httpx.get(OWM_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        logger.error("Weather API error for farm %s: %s", farm.farm_id, exc)
        return

    forecast_list = data.get("list", [])
    today = date.today()
    rainfall = _calculate_daily_rain(forecast_list)
    sunlight = _estimate_sunlight_hours(forecast_list)

    # Upsert today's record
    record = (
        db.query(WeatherData)
        .filter(WeatherData.farm_id == farm.farm_id, WeatherData.date == today)
        .first()
    )
    if record:
        record.rainfall_mm = rainfall
        record.sunlight_hours = sunlight
    else:
        record = WeatherData(
            farm_id=farm.farm_id,
            date=today,
            rainfall_mm=rainfall,
            sunlight_hours=sunlight,
        )
        db.add(record)

    db.commit()
    logger.info(
        "Weather updated for farm %s: rain=%.2fmm sun=%.1fh",
        farm.farm_id, rainfall, sunlight,
    )


def fetch_all_farms_weather() -> None:
    """
    Scheduled job entry point.
    Iterates all registered farms and fetches weather data.
    """
    db: Session = SessionLocal()
    try:
        farms = db.query(Farm).all()
        logger.info("Weather fetch job: processing %d farm(s)", len(farms))
        for farm in farms:
            fetch_weather_for_farm(farm, db)
    finally:
        db.close()
