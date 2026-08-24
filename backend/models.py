"""Pydantic models for API schemas and data transfer."""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel


class SeverityLevel(str, Enum):
    good = "good"
    moderate = "moderate"
    unhealthy = "unhealthy"
    very_unhealthy = "very_unhealthy"
    hazardous = "hazardous"


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class SensorReading(BaseModel):
    sensor_id: int
    parameter: str
    display_name: str
    value: float
    unit: str
    last_updated: datetime


class Station(BaseModel):
    id: int
    name: str
    locality: Optional[str] = None
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    coordinates: Coordinates
    sensors: List[SensorReading] = []
    is_mobile: bool = False
    is_monitor: bool = True


class StationSummary(BaseModel):
    id: int
    name: str
    locality: Optional[str] = None
    country_code: Optional[str] = None
    coordinates: Coordinates
    severity: SeverityLevel = SeverityLevel.good
    top_pollutant: Optional[str] = None
    top_value: Optional[float] = None


class Alert(BaseModel):
    id: Optional[int] = None
    station_id: int
    station_name: str
    pollutant: str
    display_name: str
    value: float
    unit: str
    severity: SeverityLevel
    threshold_exceeded: float
    latitude: float
    longitude: float
    created_at: datetime


class AlertCreate(BaseModel):
    station_id: int
    station_name: str
    pollutant: str
    display_name: str
    value: float
    unit: str
    severity: SeverityLevel
    threshold_exceeded: float
    latitude: float
    longitude: float


class HistoryPoint(BaseModel):
    timestamp: datetime
    value: float
    parameter: str


class Hotspot(BaseModel):
    station_id: int
    station_name: str
    latitude: float
    longitude: float
    pollutant: str
    value: float
    unit: str
    severity: SeverityLevel
