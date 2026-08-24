"""Async client for the OpenAQ v3 API with rate limiting."""

import asyncio
import logging
import time
from typing import Any, Optional, Dict

import aiohttp

logger = logging.getLogger(__name__)


class OpenAQClient:
    """Async HTTP client for OpenAQ v3 API with built-in rate limiting."""

    MIN_REQUEST_INTERVAL = 1.5  # seconds between requests
    MAX_RETRIES = 3

    def __init__(self, api_key: str, base_url: str = "https://api.openaq.org/v3"):
        self.base_url = base_url.rstrip("/")
        self.headers = {"X-API-Key": api_key}
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_request_time: float = 0
        self._lock = asyncio.Lock()

    async def _get_session(self) -> 'aiohttp.ClientSession':
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers=self.headers,
                timeout=aiohttp.ClientTimeout(total=30),
            )
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def _rate_limit(self) -> None:
        """Enforce minimum interval between requests."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_request_time
            if elapsed < self.MIN_REQUEST_INTERVAL:
                await asyncio.sleep(self.MIN_REQUEST_INTERVAL - elapsed)
            self._last_request_time = time.monotonic()

    async def _request(self, method: str, endpoint: str, params: Optional[dict] = None) -> dict:
        """Make a request to the OpenAQ API with retry on rate limit."""
        for attempt in range(self.MAX_RETRIES):
            await self._rate_limit()
            session = await self._get_session()
            url = f"{self.base_url}/{endpoint.lstrip('/')}"
            try:
                async with session.request(method, url, params=params) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    elif resp.status == 429:
                        retry_after = int(resp.headers.get("Retry-After", 3))
                        wait = max(retry_after, 2 ** (attempt + 1))
                        logger.warning(f"Rate limited on {endpoint}, attempt {attempt+1}/{self.MAX_RETRIES}, waiting {wait}s")
                        await asyncio.sleep(wait)
                        continue
                    else:
                        text = await resp.text()
                        logger.error(f"OpenAQ API error {resp.status}: {text}")
                        return {"meta": {"found": 0}, "results": []}
            except aiohttp.ClientError as e:
                logger.error(f"OpenAQ request failed: {e}")
                return {"meta": {"found": 0}, "results": []}

        logger.error(f"OpenAQ request to {endpoint} failed after {self.MAX_RETRIES} retries")
        return {"meta": {"found": 0}, "results": []}

    async def get_locations(
        self,
        bbox: Optional[str] = None,
        coordinates: Optional[str] = None,
        radius: Optional[int] = None,
        limit: int = 10,
        page: int = 1,
        order: str = "id",
    ) -> dict:
        """Fetch monitoring locations."""
        params: dict = {"limit": min(limit, 1000), "page": page, "order": order}
        if bbox:
            params["bbox"] = bbox
        elif coordinates and radius:
            params["coordinates"] = coordinates
            params["radius"] = min(radius, 25000)
        return await self._request("GET", "locations", params=params)

    async def get_location_detail(self, location_id: int) -> dict:
        """Fetch a single location by ID."""
        return await self._request("GET", f"locations/{location_id}")

    async def get_latest(self, location_id: Optional[int] = None) -> dict:
        """Fetch latest readings, optionally for a specific location."""
        if location_id:
            return await self._request("GET", f"locations/{location_id}/latest")
        return await self._request("GET", "latest")

    async def get_measurements(
        self,
        location_id: int,
        parameter: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 100,
    ) -> dict:
        """Fetch historical measurements for a location."""
        params: dict = {"limit": min(limit, 1000)}
        if parameter:
            params["parameter"] = parameter
        if date_from:
            params["date_from"] = date_from
        if date_to:
            params["date_to"] = date_to
        return await self._request("GET", f"locations/{location_id}/measurements", params=params)

    def parse_location(self, data: dict) -> dict:
        """Parse an OpenAQ location response into our format."""
        coords = data.get("coordinates", {})
        sensors = []
        for sensor in data.get("sensors", []):
            param = sensor.get("parameter", {})
            sensors.append({
                "sensor_id": sensor.get("id", 0),
                "parameter": param.get("name", "unknown"),
                "display_name": param.get("displayName", param.get("name", "Unknown")),
                "unit": param.get("units", ""),
            })

        country = data.get("country", {})
        return {
            "id": data.get("id", 0),
            "name": data.get("name", "Unknown"),
            "locality": data.get("locality"),
            "country_code": country.get("code"),
            "country_name": country.get("name"),
            "latitude": coords.get("latitude", 0),
            "longitude": coords.get("longitude", 0),
            "is_mobile": data.get("isMobile", False),
            "is_monitor": data.get("isMonitor", True),
            "sensors": sensors,
        }

    def build_sensor_map(self, location_data: dict) -> Dict[int, dict]:
        """Build a lookup map from sensor_id -> parameter info for a location."""
        sensor_map = {}
        for sensor in location_data.get("sensors", []):
            param = sensor.get("parameter", {})
            sensor_map[sensor.get("id", 0)] = {
                "parameter": param.get("name", "unknown"),
                "display_name": param.get("displayName", param.get("name", "Unknown")),
                "unit": param.get("units", ""),
            }
        return sensor_map

    def parse_measurement(self, data: dict, sensor_map: Optional[Dict[int, dict]] = None) -> dict:
        """Parse an OpenAQ measurement/reading into our format.

        The /latest endpoint only returns sensorsId and value, no parameter info.
        Use sensor_map (from build_sensor_map) to look up parameter names.
        """
        coords = data.get("coordinates", {})
        sensor_id = data.get("sensorsId", 0)

        # Look up parameter info from sensor map
        param_info = {}
        if sensor_map and sensor_id in sensor_map:
            param_info = sensor_map[sensor_id]

        return {
            "sensor_id": sensor_id,
            "parameter": param_info.get("parameter", "unknown"),
            "display_name": param_info.get("display_name", "Unknown"),
            "value": data.get("value", 0),
            "unit": param_info.get("unit", ""),
            "last_updated": data.get("datetime", {}).get("utc"),
            "latitude": coords.get("latitude"),
            "longitude": coords.get("longitude"),
            "location_id": data.get("locationsId"),
            "location_name": data.get("location"),
        }
