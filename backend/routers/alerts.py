"""Alerts API router."""

from fastapi import APIRouter, Query
from backend import db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(limit: int = Query(50, ge=1, le=200)):
    """Get recent alerts."""
    alerts = await db.get_recent_alerts(limit=limit)
    return {"alerts": alerts, "count": len(alerts)}


@router.get("/hotspots")
async def list_hotspots(limit: int = Query(20, ge=1, le=100)):
    """Get worst pollution readings across all stations."""
    hotspots = await db.get_hotspots(limit=limit)
    return {"hotspots": hotspots, "count": len(hotspots)}
