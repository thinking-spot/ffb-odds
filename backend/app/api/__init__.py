from fastapi import APIRouter
from .leagues import router as leagues_router
from .matchups import router as matchups_router
from .odds import router as odds_router
from .efficiency import router as efficiency_router

# Create main API router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(leagues_router, prefix="/leagues", tags=["leagues"])
api_router.include_router(matchups_router, prefix="/matchups", tags=["matchups"])
api_router.include_router(odds_router, prefix="/odds", tags=["odds"])
api_router.include_router(efficiency_router, prefix="/efficiency", tags=["efficiency"])

__all__ = ["api_router"]
