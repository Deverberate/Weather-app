"""Stations API router."""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend import db
from backend.config import Settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("")
async def list_stations(
    min_lon: float = Query(-180),
    min_lat: float = Query(-90),
    max_lon: float = Query(180),
    max_lat: float = Query(90),
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
                "id": sid, "name": row["name"],
                "locality": row.get("locality"),
                "country_code": row.get("country_code"),
                "latitude": row["latitude"], "longitude": row["longitude"],
                "readings": [],
                "latest_pollutant": None, "latest_value": None,
                "latest_unit": None, "latest_display_name": None,
            }
        if row.get("parameter"):
            stations[sid]["readings"].append({
                "parameter": row["parameter"],
                "display_name": row["display_name"],
                "value": row["value"], "unit": row["unit"],
            })

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


@router.post("/fetch")
async def fetch_stations_on_demand(
    lat: float = Query(...),
    lon: float = Query(...),
    radius: int = Query(15000, le=25000),
):
    """Fetch live data from OpenAQ for a specific area and cache it.

    This is called when the user searches for a city or uses My Location
    to ensure fresh data is available.
    """
    from backend.services.openaq_client import OpenAQClient
    from backend.services.alert_engine import check_station_readings

    settings = Settings()
    client = OpenAQClient(settings.openaq_api_key)

    try:
        coords = f"{lat},{lon}"
        resp = await client.get_locations(coordinates=coords, radius=radius, limit=10)
        locations = resp.get("results", [])
        logger.info(f"On-demand fetch: found {len(locations)} stations near ({lat}, {lon})")

        created_stations = []
        for loc_data in locations:
            parsed = client.parse_location(loc_data)
            if not parsed["latitude"] and not parsed["longitude"]:
                continue
            if parsed["is_mobile"]:
                continue

            sensor_map = client.build_sensor_map(loc_data)

            await db.upsert_station(
                station_id=parsed["id"], name=parsed["name"],
                locality=parsed["locality"],
                country_code=parsed["country_code"],
                country_name=parsed["country_name"],
                latitude=parsed["latitude"], longitude=parsed["longitude"],
                is_mobile=parsed["is_mobile"], is_monitor=parsed["is_monitor"],
                sensors=parsed["sensors"],
            )

            latest_resp = await client.get_latest(location_id=parsed["id"])
            readings_raw = latest_resp.get("results", [])
            parsed_readings = []
            for reading in readings_raw:
                pr = client.parse_measurement(reading, sensor_map=sensor_map)
                parsed_readings.append(pr)
                if pr["value"] is not None:
                    await db.upsert_reading(
                        station_id=parsed["id"],
                        sensor_id=pr["sensor_id"],
                        parameter=pr["parameter"],
                        display_name=pr["display_name"],
                        value=pr["value"], unit=pr["unit"],
                        last_updated=pr["last_updated"],
                    )

            if parsed_readings:
                await check_station_readings(
                    station_id=parsed["id"],
                    station_name=parsed["name"],
                    latitude=parsed["latitude"],
                    longitude=parsed["longitude"],
                    readings=parsed_readings,
                    preset=settings.alert_threshold_preset,
                )

            created_stations.append(parsed["id"])

        return {
            "ok": True,
            "stations_found": len(locations),
            "stations_cached": len(created_stations),
            "station_ids": created_stations,
        }
    except Exception as e:
        logger.error(f"On-demand fetch failed: {e}")
        return {"ok": False, "error": str(e), "stations_found": 0}
    finally:
        await client.close()


@router.get("/{station_id}")
async def get_station(station_id: int):
    """Get station detail with all latest readings."""
    detail = await db.get_station_detail(station_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Station not found")
    readings = detail.pop("readings", [])
    return {"station": detail, "readings": readings}
