"""
ArgoMind — Smart Farming IoT Dashboard
FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.mqtt_client import start_mqtt_client, stop_mqtt_client
from app.scheduler import start_scheduler, stop_scheduler
from app.routes import farms_router, health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("=== ArgoMind starting up ===")
    init_db()
    start_mqtt_client()
    start_scheduler()
    yield
    logger.info("=== ArgoMind shutting down ===")
    stop_mqtt_client()
    stop_scheduler()


app = FastAPI(
    title="ArgoMind API",
    description="Smart Farming IoT Dashboard — Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(farms_router)


@app.get("/", include_in_schema=False)
def root():
    return {"message": "ArgoMind API is running. Visit /docs for the API documentation."}
