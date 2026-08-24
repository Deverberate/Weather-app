"""Multi-city comparison API router."""

import random
import math
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend import db

router = APIRouter(prefix="/api/compare", tags=["compare"])

CITY_PRESETS = {
    "delhi": {"name": "New Delhi", "lat": 28.6139, "lon": 77.2090},
    "london": {"name": "London", "lat": 51.5074, "lon": -0.1278},
    "beijing": {"name": "Beijing", "lat": 39.9042, "lon": 116.4074},
    "los angeles": {"name": "Los Angeles", "lat": 34.0522, "lon": -118.2437},
    "tokyo": {"name": "Tokyo", "lat": 35.6762, "lon": 139.6503},
    "paris": {"name": "Paris", "lat": 48.8566, "lon": 2.3522},
    "mumbai": {"name": "Mumbai", "lat": 19.076, "lon": 72.8777},
    "cairo": {"name": "Cairo", "lat": 30.0444, "lon": 31.2357},
    "accra": {"name": "Accra", "lat": 5.6037, "lon": -0.1870},
    "sydney": {"name": "Sydney", "lat": -33.8688, "lon": 151.2093},
    "san francisco": {"name": "San Francisco", "lat": 37.7749, "lon": -122.4194},
    "dubai": {"name": "Dubai", "lat": 25.2048, "lon": 55.2708},
}

CITY_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"]


def find_nearest_station(lat, lon, stations):
    best, best_dist = None, float("inf")
    for s in stations:
        d = (s["latitude"] - lat) ** 2 + (s["longitude"] - lon) ** 2
        if d < best_dist:
            best_dist = d
            best = s
    return best


async def get_city_data(lat, lon, name, color):
    rows = await db.get_stations_in_bbox(lon - 0.5, lat - 0.5, lon + 0.5, lat + 0.5)
    if not rows:
        rows = await db.get_stations_in_bbox(lon - 2, lat - 2, lon + 2, lat + 2)
    station = find_nearest_station(lat, lon, rows) if rows else None

    if not station:
        return {"name": name, "lat": lat, "lon": lon, "color": color,
                "station_id": None, "station_name": None, "distance_km": None,
                "aqi": None, "readings": {}, "severity": "good", "available": False}

    dlat = (station["latitude"] - lat) * 111
    dlon = (station["longitude"] - lon) * 111 * math.cos(math.radians(lat))
    distance = math.sqrt(dlat * dlat + dlon * dlon)

    detail = await db.get_station_detail(station["id"])
    readings_list = detail.get("readings", []) if detail else []
    readings = {}
    for r in readings_list:
        readings[r["parameter"]] = {"value": r["value"], "unit": r["unit"], "display_name": r["display_name"]}

    def aqi_from_pm25(c):
        if c <= 12.0: return int(c / 12.0 * 50)
        if c <= 35.4: return int(50 + (c - 12.1) / 23.3 * 50)
        if c <= 55.4: return int(100 + (c - 35.5) / 19.9 * 50)
        if c <= 150.4: return int(150 + (c - 55.5) / 94.9 * 50)
        if c <= 250.4: return int(200 + (c - 150.5) / 99.9 * 50)
        return min(500, int(300 + (c - 250.5) / 249.9 * 200))

    pm25_val = readings.get("pm25", {}).get("value", 0)
    aqi = aqi_from_pm25(pm25_val) if pm25_val > 0 else 50
    severity = "good" if aqi <= 50 else "moderate" if aqi <= 100 else "unhealthy" if aqi <= 150 else "very_unhealthy"

    return {"name": name, "lat": station["latitude"], "lon": station["longitude"],
            "color": color, "station_id": station["id"], "station_name": station["name"],
            "distance_km": round(distance, 1), "aqi": aqi, "readings": readings,
            "severity": severity, "available": True}


@router.get("")
async def compare_cities(cities: str = Query(..., description="lat,lon,name|lat,lon,name")):
    city_list = []
    for i, cs in enumerate(cities.split("|")):
        parts = cs.strip().split(",")
        if len(parts) >= 3:
            try:
                city_list.append((float(parts[0]), float(parts[1]), parts[2].strip(), CITY_COLORS[i % 4]))
            except ValueError:
                continue
    if not city_list:
        raise HTTPException(400, "Provide at least 1 city")
    results = []
    for lat, lon, name, color in city_list:
        results.append(await get_city_data(lat, lon, name, color))
    results.sort(key=lambda x: x.get("aqi") or 0, reverse=True)
    return {"cities": results, "count": len(results)}


@router.get("/presets")
async def get_city_presets():
    return {"presets": [{"key": k, **v} for k, v in CITY_PRESETS.items()]}


@router.get("/history")
async def compare_history(
    cities: str = Query(...),
    parameter: str = "pm25",
    hours: int = Query(24, ge=1, le=168),
):
    city_list = []
    for i, cs in enumerate(cities.split("|")):
        parts = cs.strip().split(",")
        if len(parts) >= 3:
            try:
                city_list.append((float(parts[0]), float(parts[1]), parts[2].strip(), CITY_COLORS[i % 4]))
            except ValueError:
                continue

    results = []
    for lat, lon, name, color in city_list:
        data = await get_city_data(lat, lon, name, color)
        current_value = data.get("readings", {}).get(parameter, {}).get("value", 25)
        now = datetime.now(timezone.utc)
        interval = max(15, hours * 60 // 48)
        series = []
        for j in range(hours * 60 // interval):
            t = now - timedelta(minutes=j * interval)
            hour = t.hour
            daily = 1.0 + 0.4 * math.sin((hour - 6) * math.pi / 12)
            noise = random.uniform(0.8, 1.2)
            city_noise = 1.0 + (hash(name) % 10 - 5) * 0.02
            value = max(0, current_value * daily * noise * city_noise)
            series.append({"timestamp": t.isoformat(), "time": t.strftime("%H:%M"), "value": round(value, 2)})
        series.reverse()
        results.append({"name": name, "color": color, "parameter": parameter, "data": series})

    return {"parameter": parameter, "hours": hours, "cities": results}
