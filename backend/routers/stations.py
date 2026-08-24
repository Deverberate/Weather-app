"""Stations API router."""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("")
async def list_stations(
    min_lon: float = Query(-180, description="Bounding box min longitude"),
    min_lat: float = Query(-90, description="Bounding box min latitude"),
    max_lon: float = Query(180, description="Bounding box max longitude"),
    max_lat: float = Query(90, description="Bounding box max latitude"),
):
    """Get all stations within a bounding box."""
    rows = await db.get_stations_in_bbox(min_lon, min_lat, max_lon, max_lat)

    stations = []
    for row in rows:
        stations.append({
            "id": row["id"],
            "name": row["name"],
            "locality": row.get("locality"),
            "country_code": row.get("country_code"),
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "latest_pollutant": row.get("top_parameter"),
            "latest_value": row.get("top_value"),
            "latest_unit": row.get("top_unit"),
            "latest_display_name": row.get("top_display_name"),
        })

    return {"stations": stations, "count": len(stations)}


@router.get("/all")
async def list_all_stations():
    """Get all cached stations (for initial map load)."""
    rows = await db.get_all_stations_with_readings()
    stations = {}
    for row in rows:
        sid = row["id"]
        if sid not in stations:
            stations[sid] = {
                "id": sid,
                "name": row["name"],
                "locality": row.get("locality"),
                "country_code": row.get("country_code"),
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "readings": [],
                "latest_pollutant": None,
                "latest_value": None,
                "latest_unit": None,
                "latest_display_name": None,
            }
        if row.get("parameter"):
            stations[sid]["readings"].append({
                "parameter": row["parameter"],
                "display_name": row["display_name"],
                "value": row["value"],
                "unit": row["unit"],
            })

    # Pick the worst pollutant as the "latest" for map coloring
    priority_params = ["pm25", "pm10", "no2", "o3", "so2", "co"]
    for sid, station in stations.items():
        best_reading = None
        best_priority = -1
        for r in station["readings"]:
            param = r["parameter"].lower()
            if param in priority_params:
                idx = priority_params.index(param)
                if idx > best_priority:
                    best_priority = idx
                    best_reading = r
        if best_reading:
            station["latest_pollutant"] = best_reading["parameter"]
            station["latest_value"] = best_reading["value"]
            station["latest_unit"] = best_reading["unit"]
            station["latest_display_name"] = best_reading["display_name"]

    result = list(stations.values())
    return {"stations": result, "count": len(result)}


@router.get("/{station_id}")
async def get_station(station_id: int):
    """Get station detail with all latest readings."""
    detail = await db.get_station_detail(station_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Station not found")

    readings = detail.pop("readings", [])
    return {
        "station": detail,
        "readings": readings,
    }


@router.get("/{station_id}/history")
async def get_station_history(
    station_id: int,
    parameter: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
):
    """Get historical measurements for a station."""
    detail = await db.get_station_detail(station_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Station not found")

    readings = detail.get("readings", [])
    if parameter:
        readings = [r for r in readings if r.get("parameter") == parameter]

    return {
        "station_id": station_id,
        "readings": readings,
        "note": "Showing cached latest readings. Full history available via OpenAQ API.",
    }
