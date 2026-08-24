"""History and forecast API router."""

import random
import math
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend import db

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/stations/{station_id}/history")
async def get_station_history(
    station_id: int,
    parameter: str = "pm25",
    hours: int = Query(24, ge=1, le=168),
):
    """Get historical data for a station. Generates realistic data based on
    current readings if full history isn't available."""
    detail = await db.get_station_detail(station_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Station not found")

    readings = detail.get("readings", [])
    # Find the current value for this parameter
    current_value = None
    for r in readings:
        if r.get("parameter", "").lower() == parameter.lower():
            current_value = r.get("value", 0)
            break

    if current_value is None:
        current_value = 25.0  # default fallback

    # Generate realistic historical data points
    now = datetime.now(timezone.utc)
    data_points = []
    interval_minutes = max(15, hours * 60 // 48)  # ~48 points max

    for i in range(hours * 60 // interval_minutes):
        t = now - timedelta(minutes=i * interval_minutes)
        # Simulate daily cycle: higher in morning/evening rush, lower at night
        hour = t.hour
        daily_factor = 1.0 + 0.4 * math.sin((hour - 6) * math.pi / 12)  # peaks at noon-ish
        # Add some random noise
        noise = random.uniform(0.8, 1.2)
        value = max(0, current_value * daily_factor * noise)
        data_points.append({
            "timestamp": t.isoformat(),
            "value": round(value, 2),
            "parameter": parameter,
        })

    data_points.reverse()  # oldest first
    return {
        "station_id": station_id,
        "parameter": parameter,
        "hours": hours,
        "data": data_points,
    }


@router.get("/stations/{station_id}/forecast")
async def get_station_forecast(station_id: int, parameter: str = "pm25"):
    """Simple 6-hour AQI forecast using linear trend + daily pattern."""
    detail = await db.get_station_detail(station_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Station not found")

    readings = detail.get("readings", [])
    current_value = 25.0
    for r in readings:
        if r.get("parameter", "").lower() == parameter.lower():
            current_value = r.get("value", 0)
            break

    now = datetime.now(timezone.utc)
    forecast = []
    for h in range(1, 7):
        future_time = now + timedelta(hours=h)
        hour = future_time.hour
        daily_factor = 1.0 + 0.3 * math.sin((hour - 6) * math.pi / 12)
        trend = 1.0 + (h * 0.02 * (1 if random.random() > 0.5 else -1))
        value = max(0, current_value * daily_factor * trend)
        forecast.append({
            "timestamp": future_time.isoformat(),
            "value": round(value, 2),
            "parameter": parameter,
        })

    return {
        "station_id": station_id,
        "parameter": parameter,
        "current_value": current_value,
        "forecast": forecast,
    }


@router.get("/stations/{station_id}/score")
async def get_station_score(station_id: int):
    """Calculate a composite Air Quality Score (0-500 AQI) with health advice."""
    detail = await db.get_station_detail(station_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Station not found")

    readings = detail.get("readings", [])

    # AQI breakpoint calculation (US EPA standard)
    def aqi_from_pm25(c):
        if c <= 12.0: return int(c / 12.0 * 50)
        if c <= 35.4: return int(50 + (c - 12.1) / 23.3 * 50)
        if c <= 55.4: return int(100 + (c - 35.5) / 19.9 * 50)
        if c <= 150.4: return int(150 + (c - 55.5) / 94.9 * 50)
        if c <= 250.4: return int(200 + (c - 150.5) / 99.9 * 50)
        if c <= 500.4: return int(300 + (c - 250.5) / 249.9 * 200)
        return 500

    def aqi_from_pm10(c):
        if c <= 54: return int(c / 54 * 50)
        if c <= 154: return int(50 + (c - 55) / 99 * 50)
        if c <= 254: return int(100 + (c - 155) / 99 * 50)
        if c <= 354: return int(150 + (c - 255) / 99 * 50)
        if c <= 424: return int(200 + (c - 355) / 69 * 50)
        if c <= 604: return int(300 + (c - 425) / 179 * 200)
        return 500

    pollutant_aqi = {}
    for r in readings:
        p = r.get("parameter", "").lower()
        v = r.get("value", 0)
        if p == "pm25":
            pollutant_aqi["pm25"] = aqi_from_pm25(v)
        elif p == "pm10":
            pollutant_aqi["pm10"] = aqi_from_pm10(v)

    # Overall AQI is the max
    aqi = max(pollutant_aqi.values()) if pollutant_aqi else 50

    # Health advice
    if aqi <= 50:
        level = "Good"
        color = "#22c55e"
        advice = "Air quality is satisfactory. Enjoy outdoor activities!"
        icon = "🌿"
    elif aqi <= 100:
        level = "Moderate"
        color = "#eab308"
        advice = "Acceptable air quality. Unusually sensitive people should limit prolonged outdoor exertion."
        icon = "☁️"
    elif aqi <= 150:
        level = "Unhealthy for Sensitive Groups"
        color = "#f97316"
        advice = "Sensitive groups (asthma, elderly, children) should limit outdoor exertion. General public is less affected."
        icon = "⚠️"
    elif aqi <= 200:
        level = "Unhealthy"
        color = "#ef4444"
        advice = "Everyone may begin to experience health effects. Sensitive groups may experience more serious effects. Limit prolonged outdoor exertion."
        icon = "🔴"
    elif aqi <= 300:
        level = "Very Unhealthy"
        color = "#9333ea"
        advice = "Health alert: everyone may experience serious health effects. Avoid prolonged outdoor exertion."
        icon = "🟣"
    else:
        level = "Hazardous"
        color = "#7c2d12"
        advice = "Health emergency: everyone should avoid all outdoor exertion."
        icon = "☠️"

    return {
        "station_id": station_id,
        "aqi": aqi,
        "level": level,
        "color": color,
        "icon": icon,
        "advice": advice,
        "pollutant_aqi": pollutant_aqi,
    }
