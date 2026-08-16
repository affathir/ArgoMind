"""
APScheduler configuration and job registration.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.services.weather_service import fetch_all_farms_weather

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> None:
    """Start the background scheduler with daily weather fetch job."""
    global _scheduler
    _scheduler = BackgroundScheduler(timezone="UTC")

    # Run every day at 06:00 UTC
    _scheduler.add_job(
        func=fetch_all_farms_weather,
        trigger=CronTrigger(hour=6, minute=0),
        id="daily_weather_fetch",
        name="Fetch daily weather for all farms",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("APScheduler started — daily weather job registered at 06:00 UTC")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
