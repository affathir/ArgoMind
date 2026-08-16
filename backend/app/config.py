from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Root of the backend/ directory (one level up from app/)
BACKEND_ROOT = Path(__file__).resolve().parent.parent

# Storage paths — override via .env if needed
STORAGE_ROOT          = BACKEND_ROOT / "storage"
LLM_RESPONSES_DIR     = STORAGE_ROOT / "llm_responses"
ML_TRAINING_DATA_DIR  = STORAGE_ROOT / "ml" / "training_data"
ML_MODELS_DIR         = STORAGE_ROOT / "ml" / "models"
ML_RESULTS_DIR        = STORAGE_ROOT / "ml" / "results"

# Ensure directories exist at import time (safe for all environments)
for _dir in (LLM_RESPONSES_DIR, ML_TRAINING_DATA_DIR, ML_MODELS_DIR, ML_RESULTS_DIR):
    _dir.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/argomind"

    # MQTT
    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_TOPIC: str = "farm/sensor"
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""

    # OpenWeatherMap
    OPENWEATHER_API_KEY: str = ""

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""

    # Langflow (RAG + LLM)
    LANGFLOW_API_URL: str = "http://localhost:7860"
    LANGFLOW_FLOW_ID: str = ""   # UUID dari URL Langflow setelah import flow
    LANGFLOW_API_KEY: str = ""   # API key Langflow (opsional)

    # App
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = False

    # Thresholds for alerts
    SOIL_MOISTURE_MIN: float = 20.0   # percent
    SOIL_PH_MIN: float = 5.5
    SOIL_PH_MAX: float = 7.5
    TEMPERATURE_MAX: float = 38.0     # celsius
    HUMIDITY_MIN: float = 30.0        # percent

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
