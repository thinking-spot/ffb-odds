from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from .api import api_router
from .db import db
from .scheduler import start_scheduler, stop_scheduler

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    print("🚀 Starting Fantasy Football Vegas Odds API...")

    # Initialize database
    await db.connect()
    await db.initialize_schema()
    print("✅ Database connected and schema initialized")

    # Start scheduler for daily updates
    start_scheduler()
    print("✅ Scheduler started for daily updates at 10am ET")

    yield

    # Shutdown
    print("🛑 Shutting down...")
    stop_scheduler()
    await db.disconnect()
    print("✅ Cleanup complete")


# Create FastAPI app
app = FastAPI(
    title="Fantasy Football Vegas Odds API",
    description="API for fantasy football projections, odds, and efficiency ratings based on Vegas odds",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Fantasy Football Vegas Odds API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "leagues": "/api/v1/leagues",
            "matchups": "/api/v1/matchups",
            "odds": "/api/v1/odds",
            "efficiency": "/api/v1/efficiency"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected" if db.connection else "disconnected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
