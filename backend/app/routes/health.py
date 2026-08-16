"""
Health-check endpoint.
"""
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["health"])


@router.get("/health", summary="Service health check")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
