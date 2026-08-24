"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Station,
  SEVERITY_COLORS,
  getSeverityColor,
  SeverityLevel,
} from "@/types";

// Fix Leaflet default icon issue in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface MapViewProps {
  stations: Station[];
  onStationClick: (stationId: number) => void;
  selectedStationId: number | null;
}

function getMarkerColor(station: Station): string {
  if (station.latest_value !== null && station.latest_pollutant) {
    const severity = getSeverityColor(
      station.latest_value,
      station.latest_pollutant
    );
    return SEVERITY_COLORS[severity];
  }
  return SEVERITY_COLORS.good;
}

function getMarkerRadius(station: Station): number {
  if (station.latest_value !== null) {
    // Scale radius between 6 and 18 based on value
    return Math.min(18, Math.max(6, Math.sqrt(station.latest_value) * 1.5));
  }
  return 6;
}

export default function MapView({
  stations,
  onStationClick,
  selectedStationId,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    setIsClient(true);

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when stations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    stations.forEach((station) => {
      if (!station.latitude || !station.longitude) return;

      const color = getMarkerColor(station);
      const radius = getMarkerRadius(station);

      const marker = L.circleMarker([station.latitude, station.longitude], {
        radius,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });

      // Popup content
      const valueText =
        station.latest_value !== null
          ? `<strong>${station.latest_display_name || station.latest_pollutant}:</strong> ${station.latest_value} ${station.latest_unit || ""}`
          : "<em>No readings</em>";

      marker.bindPopup(`
        <div style="min-width: 180px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${station.name}</div>
          ${station.locality ? `<div style="color: #64748b; font-size: 12px;">${station.locality}</div>` : ""}
          <div style="margin-top: 6px;">${valueText}</div>
          <div style="margin-top: 8px;">
            <button
              onclick="window.__stationClick && window.__stationClick(${station.id})"
              style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px;"
            >
              View Details
            </button>
          </div>
        </div>
      `);

      marker.on("click", () => {
        onStationClick(station.id);
      });

      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Fit bounds if we have stations
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations
          .filter((s) => s.latitude && s.longitude)
          .map((s) => [s.latitude, s.longitude] as [number, number])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [stations, onStationClick]);

  // Global handler for popup button clicks
  useEffect(() => {
    (window as any).__stationClick = onStationClick;
    return () => {
      delete (window as any).__stationClick;
    };
  }, [onStationClick]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: "400px" }}
    />
  );
}
