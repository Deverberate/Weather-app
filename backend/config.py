"""Application configuration loaded from environment variables."""

from typing import List

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    openaq_api_key: str = Field(..., env="OPENAQ_API_KEY")
    openaq_base_url: str = Field("https://api.openaq.org/v3", env="OPENAQ_BASE_URL")
    poll_interval_seconds: int = Field(300, env="POLL_INTERVAL_SECONDS")
    database_path: str = Field("pollution_monitor.db", env="DATABASE_PATH")
    alert_threshold_preset: str = Field("who", env="ALERT_THRESHOLD_PRESET")
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = {"env_file": ".env", "extra": "ignore"}


# WHO guideline thresholds (µg/m³)
WHO_THRESHOLDS: dict[str, list[tuple[float, str]]] = {
    "pm25": [
        (55.0, "very_unhealthy"),
        (35.0, "unhealthy"),
        (15.0, "moderate"),
    ],
    "pm10": [
        (150.0, "very_unhealthy"),
        (100.0, "unhealthy"),
        (45.0, "moderate"),
    ],
    "no2": [
        (200.0, "very_unhealthy"),
        (100.0, "unhealthy"),
        (40.0, "moderate"),
    ],
    "o3": [
        (200.0, "very_unhealthy"),
        (160.0, "unhealthy"),
        (100.0, "moderate"),
    ],
    "so2": [
        (200.0, "very_unhealthy"),
        (100.0, "unhealthy"),
        (40.0, "moderate"),
    ],
    "co": [
        (10000.0, "very_unhealthy"),
        (7000.0, "unhealthy"),
        (4000.0, "moderate"),
    ],
}

# EPA thresholds (alternative)
EPA_THRESHOLDS: dict[str, list[tuple[float, str]]] = {
    "pm25": [
        (55.5, "very_unhealthy"),
        (35.5, "unhealthy"),
        (12.1, "moderate"),
    ],
    "pm10": [
        (255.0, "very_unhealthy"),
        (155.0, "unhealthy"),
        (55.0, "moderate"),
    ],
    "no2": [
        (360.0, "very_unhealthy"),
        (180.0, "unhealthy"),
        (54.0, "moderate"),
    ],
    "o3": [
        (200.0, "very_unhealthy"),
        (160.0, "unhealthy"),
        (100.0, "moderate"),
    ],
    "so2": [
        (200.0, "very_unhealthy"),
        (100.0, "unhealthy"),
        (40.0, "moderate"),
    ],
    "co": [
        (12000.0, "very_unhealthy"),
        (8000.0, "unhealthy"),
        (4400.0, "moderate"),
    ],
}


def get_thresholds(preset: str) -> dict[str, list[tuple[float, str]]]:
    """Return thresholds for the given preset."""
    if preset == "epa":
        return EPA_THRESHOLDS
    return WHO_THRESHOLDS
