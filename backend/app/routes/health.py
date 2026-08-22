"""
Health-check endpoint + manual weather trigger.
"""
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["health"])


@router.get("/health", summary="Service health check")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.post("/api/weather/refresh", summary="Manually trigger weather fetch for all farms")
def refresh_weather():
    """Fetch today's weather for all farms immediately (bypasses scheduler)."""
    from app.services.weather_service import fetch_all_farms_weather
    try:
        fetch_all_farms_weather()
        return {"status": "ok", "message": "Weather data refreshed for all farms"}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
