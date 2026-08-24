"""Background scheduler that polls OpenAQ for new data."""

import asyncio
import logging
from typing import Any, Optional, List

from backend.services.openaq_client import OpenAQClient
from backend.services.alert_engine import check_station_readings
from backend import db

logger = logging.getLogger(__name__)

INTER_CITY_DELAY = 5.0  # seconds between city fetches


class DataScheduler:
    """Periodically fetches data from OpenAQ and updates the local cache."""

    def __init__(self, client: OpenAQClient, interval_seconds: int = 300):
        self.client = client
        self.interval = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._watched_areas: List[dict] = [
            {"name": "New Delhi", "lat": 28.6139, "lon": 77.2090, "radius": 15000},
            {"name": "London", "lat": 51.5074, "lon": -0.1278, "radius": 15000},
        ]

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info(f"Scheduler started (interval={self.interval}s, {len(self._watched_areas)} areas)")

    def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
        logger.info("Scheduler stopped")

    async def _poll_loop(self) -> None:
        while self._running:
            try:
                await self._fetch_all_areas()
            except Exception as e:
                logger.error(f"Polling error: {e}", exc_info=True)
            await asyncio.sleep(self.interval)

    async def _fetch_all_areas(self) -> None:
        preset = "who"
        try:
            from backend.config import Settings
            preset = Settings().alert_threshold_preset
        except Exception:
            pass

        for i, area in enumerate(self._watched_areas):
            try:
                await self._fetch_area(area, preset)
            except Exception as e:
                logger.error(f"Error fetching area {area['name']}: {e}")

            if i < len(self._watched_areas) - 1:
                logger.info(f"Waiting {INTER_CITY_DELAY}s before next city...")
                await asyncio.sleep(INTER_CITY_DELAY)

    async def _fetch_area(self, area: dict, preset: str) -> None:
        coords = f"{area['lat']},{area['lon']}"
        radius = area.get("radius", 15000)

        resp = await self.client.get_locations(coordinates=coords, radius=radius, limit=10)
        locations = resp.get("results", [])
        logger.info(f"Found {len(locations)} stations near {area['name']}")

        for loc_data in locations:
            parsed = self.client.parse_location(loc_data)
            if not parsed["latitude"] and not parsed["longitude"]:
                continue
            if parsed["is_mobile"]:
                continue

            # Build sensor map from location data so we can resolve parameter names
            sensor_map = self.client.build_sensor_map(loc_data)

            await db.upsert_station(
                station_id=parsed["id"],
                name=parsed["name"],
                locality=parsed["locality"],
                country_code=parsed["country_code"],
                country_name=parsed["country_name"],
                latitude=parsed["latitude"],
                longitude=parsed["longitude"],
                is_mobile=parsed["is_mobile"],
                is_monitor=parsed["is_monitor"],
                sensors=parsed["sensors"],
            )

            # Fetch latest readings
            latest_resp = await self.client.get_latest(location_id=parsed["id"])
            readings_raw = latest_resp.get("results", [])

            parsed_readings = []
            for reading in readings_raw:
                # Pass sensor_map so parameter names are resolved
                pr = self.client.parse_measurement(reading, sensor_map=sensor_map)
                parsed_readings.append(pr)

                if pr["value"] is not None:
                    await db.upsert_reading(
                        station_id=parsed["id"],
                        sensor_id=pr["sensor_id"],
                        parameter=pr["parameter"],
                        display_name=pr["display_name"],
                        value=pr["value"],
                        unit=pr["unit"],
                        last_updated=pr["last_updated"],
                    )

            if parsed_readings:
                await check_station_readings(
                    station_id=parsed["id"],
                    station_name=parsed["name"],
                    latitude=parsed["latitude"],
                    longitude=parsed["longitude"],
                    readings=parsed_readings,
                    preset=preset,
                )

    def add_area(self, name: str, lat: float, lon: float, radius: int = 15000) -> None:
        self._watched_areas.append({"name": name, "lat": lat, "lon": lon, "radius": radius})

    async def fetch_area_now(self, lat: float, lon: float, radius: int = 15000) -> list:
        coords = f"{lat},{lon}"
        resp = await self.client.get_locations(coordinates=coords, radius=radius, limit=10)
        locations = resp.get("results", [])
        parsed_stations = []

        for loc_data in locations:
            parsed = self.client.parse_location(loc_data)
            if not parsed["latitude"] and not parsed["longitude"]:
                continue

            sensor_map = self.client.build_sensor_map(loc_data)

            await db.upsert_station(
                station_id=parsed["id"],
                name=parsed["name"],
                locality=parsed["locality"],
                country_code=parsed["country_code"],
                country_name=parsed["country_name"],
                latitude=parsed["latitude"],
                longitude=parsed["longitude"],
                is_mobile=parsed["is_mobile"],
                is_monitor=parsed["is_monitor"],
                sensors=parsed["sensors"],
            )

            latest_resp = await self.client.get_latest(location_id=parsed["id"])
            readings_raw = latest_resp.get("results", [])
            parsed_readings = []
            for reading in readings_raw:
                pr = self.client.parse_measurement(reading, sensor_map=sensor_map)
                parsed_readings.append(pr)
                if pr["value"] is not None:
                    await db.upsert_reading(
                        station_id=parsed["id"],
                        sensor_id=pr["sensor_id"],
                        parameter=pr["parameter"],
                        display_name=pr["display_name"],
                        value=pr["value"],
                        unit=pr["unit"],
                        last_updated=pr["last_updated"],
                    )

            parsed["readings"] = parsed_readings
            parsed_stations.append(parsed)

        return parsed_stations
