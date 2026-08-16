"""
Telegram notification service using telegram-easy.
"""
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def send_telegram_alert(telegram_id: str, message: str) -> bool:
    """
    Send an alert message to a farmer's Telegram chat.

    Args:
        telegram_id: The farmer's Telegram chat ID (numeric string).
        message: The alert text to send.

    Returns:
        True if sent successfully, False otherwise.
    """
    try:
        from telegram_easy import TelegramBot  # type: ignore
        bot = TelegramBot(token=settings.TELEGRAM_BOT_TOKEN)
        bot.send_message(chat_id=telegram_id, text=message)
        logger.info("Telegram alert sent to %s", telegram_id)
        return True
    except Exception as exc:
        logger.error("Failed to send Telegram alert to %s: %s", telegram_id, exc)
        return False


def build_alert_message(farm_id: str, issues: list[str]) -> str:
    lines = [f"⚠️  *ArgoMind Alert* — Kebun `{farm_id}`", ""]
    for issue in issues:
        lines.append(f"• {issue}")
    lines.append("")
    lines.append("Segera periksa kondisi kebun Anda.")
    return "\n".join(lines)


def check_and_notify(farm_id: str, telegram_id: str, sensor: dict) -> None:
    """
    Evaluate sensor readings against configured thresholds.
    Sends a Telegram notification if any threshold is breached.
    """
    issues: list[str] = []

    moisture = sensor.get("soil_moisture")
    ph = sensor.get("soil_ph")
    temperature = sensor.get("temperature")
    humidity = sensor.get("humidity")

    if moisture is not None and moisture < settings.SOIL_MOISTURE_MIN:
        issues.append(
            f"Kelembapan Tanah kritis: {moisture:.1f}% "
            f"(min {settings.SOIL_MOISTURE_MIN}%)"
        )

    if ph is not None and (ph < settings.SOIL_PH_MIN or ph > settings.SOIL_PH_MAX):
        issues.append(
            f"pH Tanah di luar rentang: {ph:.2f} "
            f"(normal {settings.SOIL_PH_MIN}–{settings.SOIL_PH_MAX})"
        )

    if temperature is not None and temperature > settings.TEMPERATURE_MAX:
        issues.append(
            f"Suhu terlalu tinggi: {temperature:.1f}°C "
            f"(max {settings.TEMPERATURE_MAX}°C)"
        )

    if humidity is not None and humidity < settings.HUMIDITY_MIN:
        issues.append(
            f"Kelembapan Udara rendah: {humidity:.1f}% "
            f"(min {settings.HUMIDITY_MIN}%)"
        )

    if issues:
        msg = build_alert_message(farm_id, issues)
        send_telegram_alert(telegram_id, msg)
