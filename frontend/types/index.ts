export type SeverityLevel =
  | "good"
  | "moderate"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Station {
  id: number;
  name: string;
  locality: string | null;
  country_code: string | null;
  latitude: number;
  longitude: number;
  latest_pollutant: string | null;
  latest_value: number | null;
  latest_unit: string | null;
  latest_display_name: string | null;
}

export interface StationDetail {
  id: number;
  name: string;
  locality: string | null;
  country_code: string | null;
  country_name: string | null;
  latitude: number;
  longitude: number;
  sensors: SensorInfo[];
}

export interface SensorInfo {
  sensor_id: number;
  parameter: string;
  display_name: string;
  unit: string;
}

export interface Reading {
  parameter: string;
  display_name: string;
  value: number;
  unit: string;
  last_updated?: string;
  sensor_id?: number;
}

export interface Alert {
  id: number | null;
  station_id: number;
  station_name: string;
  pollutant: string;
  display_name: string;
  value: number;
  unit: string;
  severity: SeverityLevel;
  threshold_exceeded: number;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Hotspot {
  station_id: number;
  station_name: string;
  latitude: number;
  longitude: number;
  pollutant: string;
  value: number;
  unit: string;
  severity: SeverityLevel;
  display_name?: string;
}

export interface ThresholdConfig {
  value: number;
  severity: string;
}

export interface AppConfig {
  preset: string;
  thresholds: Record<string, ThresholdConfig[]>;
  poll_interval: number;
}

// Map severity to color
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  good: "#22c55e",
  moderate: "#eab308",
  unhealthy: "#f97316",
  very_unhealthy: "#ef4444",
  hazardous: "#7c2d12",
};

export function getSeverityColor(value: number, parameter: string): SeverityLevel {
  // Simple thresholds for map coloring (can be refined)
  const thresholds: Record<string, { moderate: number; unhealthy: number; veryUnhealthy: number }> = {
    pm25: { moderate: 15, unhealthy: 35, veryUnhealthy: 55 },
    pm10: { moderate: 45, unhealthy: 100, veryUnhealthy: 150 },
    no2: { moderate: 40, unhealthy: 100, veryUnhealthy: 200 },
    o3: { moderate: 100, unhealthy: 160, veryUnhealthy: 200 },
    so2: { moderate: 40, unhealthy: 100, veryUnhealthy: 200 },
    co: { moderate: 4000, unhealthy: 7000, veryUnhealthy: 10000 },
  };

  const t = thresholds[parameter?.toLowerCase()];
  if (!t) return "good";
  if (value >= t.veryUnhealthy) return "very_unhealthy";
  if (value >= t.unhealthy) return "unhealthy";
  if (value >= t.moderate) return "moderate";
  return "good";
}

export function getSeverityLabel(severity: SeverityLevel): string {
  const labels: Record<SeverityLevel, string> = {
    good: "Good",
    moderate: "Moderate",
    unhealthy: "Unhealthy",
    very_unhealthy: "Very Unhealthy",
    hazardous: "Hazardous",
  };
  return labels[severity] || severity;
}
