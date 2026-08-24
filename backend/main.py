"""FastAPI application for the Pollution Monitoring Dashboard."""

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env from project root
project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")

# Ensure backend package is importable
sys.path.insert(0, str(project_root))

from typing import Optional

from backend.config import Settings
from backend import db
from backend.services.openaq_client import OpenAQClient
from backend.services.scheduler import DataScheduler
from backend.routers import stations, alerts, websocket, history, compare

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Global references
client: Optional[OpenAQClient] = None
scheduler: Optional[DataScheduler] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    global client, scheduler  # noqa: PLW0603

    settings = Settings()

    # Initialize database
    db_path = str(project_root / settings.database_path)
    await db.init_db(db_path)
    logger.info(f"Database initialized at {db_path}")

    # Initialize OpenAQ client
    client = OpenAQClient(
        api_key=settings.openaq_api_key,
        base_url=settings.openaq_base_url,
    )

    # Start background scheduler
    scheduler = DataScheduler(client, interval_seconds=settings.poll_interval_seconds)
    scheduler.start()
    logger.info("Application started")

    yield

    # Shutdown
    if scheduler:
        scheduler.stop()
    if client:
        await client.close()
    logger.info("Application shut down")


app = FastAPI(
    title="Hyperlocal Pollution Monitor",
    description="Real-time air quality monitoring dashboard using OpenAQ data",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stations.router)
app.include_router(alerts.router)
app.include_router(websocket.router)
app.include_router(history.router)
app.include_router(compare.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "pollution-monitor"}


@app.get("/api/config")
async def get_config():
    """Get public configuration (thresholds, areas)."""
    from backend.config import get_thresholds
    settings = Settings()
    thresholds = get_thresholds(settings.alert_threshold_preset)
    return {
        "preset": settings.alert_threshold_preset,
        "thresholds": {
            param: [{"value": t[0], "severity": t[1]} for t in vals]
            for param, vals in thresholds.items()
        },
        "poll_interval": settings.poll_interval_seconds,
    }
