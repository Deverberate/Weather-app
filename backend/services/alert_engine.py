"""Alert engine: detects threshold violations and creates alerts."""

import logging
from datetime import datetime, timezone
from typing import Optional, Tuple, List

from backend.config import get_thresholds
from backend import db
from backend.models import SeverityLevel

logger = logging.getLogger(__name__)


def classify_severity(value: float, thresholds: List[Tuple[float, str]]) -> Tuple[Optional[str], float]:
    """Classify a pollutant value against a threshold list.

    Returns (severity_or_None, threshold_value_exceeded).
    Thresholds are ordered from highest to lowest.
    """
    for threshold, severity in thresholds:
        if value >= threshold:
            return severity, threshold
    return None, 0.0


async def check_station_readings(
    station_id: int,
    station_name: str,
    latitude: float,
    longitude: float,
    readings: List[dict],
    preset: str = "who",
) -> List[dict]:
    """Check a station's readings against thresholds.

    Returns a list of new alerts created.
    """
    thresholds = get_thresholds(preset)
    new_alerts = []

    for reading in readings:
        parameter = reading.get("parameter", "").lower()
        value = reading.get("value", 0)
        display_name = reading.get("display_name", parameter)
        unit = reading.get("unit", "")

        if parameter not in thresholds or value <= 0:
            continue

        severity, threshold_value = classify_severity(value, thresholds[parameter])
        if severity is None:
            continue

        # Check for duplicate alerts within the last hour
        already_alerted = await db.has_recent_alert(station_id, parameter, within_minutes=60)
        if already_alerted:
            continue

        # Create the alert
        alert_id = await db.insert_alert(
            station_id=station_id,
            station_name=station_name,
            pollutant=parameter,
            display_name=display_name,
            value=value,
            unit=unit,
            severity=severity,
            threshold_exceeded=threshold_value,
            latitude=latitude,
            longitude=longitude,
        )

        alert = {
            "id": alert_id,
            "station_id": station_id,
            "station_name": station_name,
            "pollutant": parameter,
            "display_name": display_name,
            "value": value,
            "unit": unit,
            "severity": severity,
            "threshold_exceeded": threshold_value,
            "latitude": latitude,
            "longitude": longitude,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        new_alerts.append(alert)
        logger.info(
            f"Alert: {severity} {display_name}={value}{unit} "
            f"at station {station_name} (threshold={threshold_value})"
        )

    return new_alerts


async def get_station_severity(readings: List[dict], preset: str = "who") -> Tuple[str, Optional[str], Optional[float]]:
    """Determine overall severity for a station from its readings.

    Returns (severity, top_pollutant, top_value).
    """
    thresholds = get_thresholds(preset)
    worst_severity = SeverityLevel.good.value
    severity_order = ["good", "moderate", "unhealthy", "very_unhealthy", "hazardous"]
    top_pollutant = None
    top_value = None

    for reading in readings:
        parameter = reading.get("parameter", "").lower()
        value = reading.get("value", 0)

        if parameter not in thresholds or value <= 0:
            continue

        severity, _ = classify_severity(value, thresholds[parameter])
        if severity and severity_order.index(severity) > severity_order.index(worst_severity):
            worst_severity = severity
            top_pollutant = reading.get("display_name", parameter)
            top_value = value

    return worst_severity, top_pollutant, top_value
