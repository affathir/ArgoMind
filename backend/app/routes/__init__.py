from app.routes.farms import router as farms_router
from app.routes.health import router as health_router
from app.routes.simulator import router as simulator_router

__all__ = ["farms_router", "health_router", "simulator_router"]
