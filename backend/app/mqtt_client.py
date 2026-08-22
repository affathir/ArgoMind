"""
MQTT subscriber that ingests sensor data from IoT devices.

Topic format:  farm/sensor
Payload (JSON):
{
    "farm_id": "farm-001",
    "soil_moisture": 45.2,
    "soil_ph": 6.5,
    "temperature": 28.1,
    "humidity": 65.0
}
"""
import json
import logging
import threading
from typing import Optional

import paho.mqtt.client as mqtt  # type: ignore

from app.config import get_settings
from app.models import Farm, SensorData
from app.database import SessionLocal

logger = logging.getLogger(__name__)
settings = get_settings()

_mqtt_client: Optional[mqtt.Client] = None


def _on_connect(client: mqtt.Client, userdata, flags, rc: int) -> None:
    if rc == 0:
        logger.info("MQTT connected — subscribing to '%s'", settings.MQTT_TOPIC)
        client.subscribe(settings.MQTT_TOPIC)
    else:
        logger.error("MQTT connection failed with code %d", rc)


def _on_message(client: mqtt.Client, userdata, msg: mqtt.MQTTMessage) -> None:
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning("Invalid MQTT payload: %s", exc)
        return

    farm_id = payload.get("farm_id")
    if not farm_id:
        logger.warning("MQTT message missing 'farm_id' — ignored")
        return

    db = SessionLocal()
    try:
        farm: Optional[Farm] = db.query(Farm).filter(Farm.farm_id == farm_id).first()
        if not farm:
            logger.warning("Unknown farm_id '%s' — data discarded", farm_id)
            return

        sensor = SensorData(
            farm_id=farm_id,
            soil_moisture=payload.get("soil_moisture"),
            soil_ph=payload.get("soil_ph"),
            temperature=payload.get("temperature"),
            humidity=payload.get("humidity"),
        )
        db.add(sensor)
        db.commit()
        logger.debug("Sensor data saved for farm %s", farm_id)
    except Exception as exc:
        db.rollback()
        logger.error("Error saving sensor data for farm %s: %s", farm_id, exc)
    finally:
        db.close()


def _on_disconnect(client: mqtt.Client, userdata, rc: int) -> None:
    if rc != 0:
        logger.warning("MQTT unexpectedly disconnected (rc=%d) — will auto-reconnect", rc)


def start_mqtt_client() -> None:
    """
    Create and start the MQTT client in a background daemon thread.
    The loop_start() call handles reconnection automatically.
    """
    global _mqtt_client

    client = mqtt.Client(client_id="argomind-backend", clean_session=True)
    client.on_connect = _on_connect
    client.on_message = _on_message
    client.on_disconnect = _on_disconnect

    if settings.MQTT_USERNAME:
        client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

    try:
        client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
    except Exception as exc:
        logger.error("Cannot connect to MQTT broker: %s", exc)
        return

    client.loop_start()
    _mqtt_client = client
    logger.info(
        "MQTT client started — broker=%s:%d",
        settings.MQTT_BROKER,
        settings.MQTT_PORT,
    )


def stop_mqtt_client() -> None:
    global _mqtt_client
    if _mqtt_client:
        _mqtt_client.loop_stop()
        _mqtt_client.disconnect()
        _mqtt_client = None
        logger.info("MQTT client stopped")
