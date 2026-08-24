"""SQLite database layer for caching stations, readings, and alerts."""

import json
from typing import Optional, List

import aiosqlite
from datetime import datetime, timezone

DB_PATH: str = "pollution_monitor.db"


async def init_db(db_path: str = DB_PATH) -> None:
    """Initialize database tables."""
    global DB_PATH
    DB_PATH = db_path
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(
            """
            CREATE TABLE IF NOT EXISTS stations (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                locality TEXT,
                country_code TEXT,
                country_name TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                is_mobile INTEGER DEFAULT 0,
                is_monitor INTEGER DEFAULT 1,
                sensors_json TEXT DEFAULT '[]',
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS latest_readings (
                station_id INTEGER NOT NULL,
                sensor_id INTEGER NOT NULL,
                parameter TEXT NOT NULL,
                display_name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                last_updated TEXT,
                PRIMARY KEY (station_id, parameter)
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                station_id INTEGER NOT NULL,
                station_name TEXT NOT NULL,
                pollutant TEXT NOT NULL,
                display_name TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL,
                severity TEXT NOT NULL,
                threshold_exceeded REAL NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_stations_coords
                ON stations(latitude, longitude);
            CREATE INDEX IF NOT EXISTS idx_alerts_created
                ON alerts(created_at);
            CREATE INDEX IF NOT EXISTS idx_alerts_station_pollutant
                ON alerts(station_id, pollutant);
        """
        )
        await db.commit()


async def upsert_station(
    station_id: int,
    name: str,
    locality: Optional[str],
    country_code: Optional[str],
    country_name: Optional[str],
    latitude: float,
    longitude: float,
    is_mobile: bool,
    is_monitor: bool,
    sensors: List[dict],
) -> None:
    """Insert or update a station record."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO stations
                (id, name, locality, country_code, country_name,
                 latitude, longitude, is_mobile, is_monitor, sensors_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                locality=excluded.locality,
                country_code=excluded.country_code,
                country_name=excluded.country_name,
                latitude=excluded.latitude,
                longitude=excluded.longitude,
                is_mobile=excluded.is_mobile,
                is_monitor=excluded.is_monitor,
                sensors_json=excluded.sensors_json,
                updated_at=excluded.updated_at
            """,
            (
                station_id, name, locality, country_code, country_name,
                latitude, longitude, int(is_mobile), int(is_monitor),
                json.dumps(sensors), now,
            ),
        )
        await db.commit()


async def upsert_reading(
    station_id: int,
    sensor_id: int,
    parameter: str,
    display_name: str,
    value: float,
    unit: str,
    last_updated: Optional[str],
) -> None:
    """Insert or update a latest reading."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO latest_readings
                (station_id, sensor_id, parameter, display_name, value, unit, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(station_id, parameter) DO UPDATE SET
                sensor_id=excluded.sensor_id,
                display_name=excluded.display_name,
                value=excluded.value,
                unit=excluded.unit,
                last_updated=excluded.last_updated
            """,
            (station_id, sensor_id, parameter, display_name, value, unit, last_updated),
        )
        await db.commit()


async def get_stations_in_bbox(
    min_lon: float, min_lat: float, max_lon: float, max_lat: float
) -> List[dict]:
    """Get stations within a bounding box."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT s.*, lr.value as top_value, lr.parameter as top_parameter,
                   lr.display_name as top_display_name, lr.unit as top_unit
            FROM stations s
            LEFT JOIN latest_readings lr ON s.id = lr.station_id
            WHERE s.latitude BETWEEN ? AND ? AND s.longitude BETWEEN ? AND ?
            ORDER BY COALESCE(lr.value, 0) DESC
            """,
            (min_lat, max_lat, min_lon, max_lon),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_station_detail(station_id: int) -> Optional[dict]:
    """Get a single station with all its latest readings."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM stations WHERE id = ?", (station_id,)
        )
        station = await cursor.fetchone()
        if not station:
            return None

        cursor = await db.execute(
            "SELECT * FROM latest_readings WHERE station_id = ?",
            (station_id,),
        )
        readings = await cursor.fetchall()
        result = dict(station)
        result["readings"] = [dict(r) for r in readings]
        return result


async def get_recent_alerts(limit: int = 50) -> List[dict]:
    """Get recent alerts ordered by creation time."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def has_recent_alert(
    station_id: int, pollutant: str, within_minutes: int = 60
) -> bool:
    """Check if a similar alert was already created recently."""
    now = datetime.now(timezone.utc)
    cutoff = now.timestamp() - (within_minutes * 60)
    cutoff_iso = datetime.fromtimestamp(cutoff, tz=timezone.utc).isoformat()

    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            SELECT COUNT(*) FROM alerts
            WHERE station_id = ? AND pollutant = ? AND created_at > ?
            """,
            (station_id, pollutant, cutoff_iso),
        )
        count = await cursor.fetchone()
        return count[0] > 0


async def insert_alert(
    station_id: int,
    station_name: str,
    pollutant: str,
    display_name: str,
    value: float,
    unit: str,
    severity: str,
    threshold_exceeded: float,
    latitude: float,
    longitude: float,
) -> int:
    """Insert a new alert and return its ID."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            INSERT INTO alerts
                (station_id, station_name, pollutant, display_name, value, unit,
                 severity, threshold_exceeded, latitude, longitude, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                station_id, station_name, pollutant, display_name, value, unit,
                severity, threshold_exceeded, latitude, longitude, now,
            ),
        )
        await db.commit()
        return cursor.lastrowid


async def get_all_stations_with_readings() -> List[dict]:
    """Get all stations joined with their latest readings."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT s.id, s.name, s.locality, s.country_code,
                   s.latitude, s.longitude,
                   lr.parameter, lr.display_name, lr.value, lr.unit, lr.last_updated
            FROM stations s
            LEFT JOIN latest_readings lr ON s.id = lr.station_id
            """
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_hotspots(limit: int = 20) -> List[dict]:
    """Get the worst pollution readings across all stations."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT lr.station_id, s.name as station_name,
                   s.latitude, s.longitude,
                   lr.parameter as pollutant, lr.display_name,
                   lr.value, lr.unit
            FROM latest_readings lr
            JOIN stations s ON lr.station_id = s.id
            ORDER BY lr.value DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
