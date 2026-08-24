"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import AlertPanel from "@/components/AlertPanel";
import StationDetail from "@/components/StationDetail";
import Legend from "@/components/Legend";
import CitySearch from "@/components/CitySearch";
import { Station, Alert } from "@/types";
import { fetchAllStations } from "@/lib/api";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const mapRef = useRef<any>(null);

  const loadStations = useCallback(async () => {
    try {
      const data = await fetchAllStations();
      setStations(data.stations || []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to load stations:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStations();
    const interval = setInterval(loadStations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadStations]);

  // Dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleStationClick = useCallback((stationId: number) => {
    setSelectedStationId(stationId);
  }, []);

  const handleAlertClick = useCallback((alert: Alert) => {
    setSelectedStationId(alert.station_id);
    setAlertPanelOpen(false);
  }, []);

  const handleCitySearch = useCallback((lat: number, lon: number, name: string) => {
    setMapCenter([lat, lon]);
    setMapZoom(12);
    // Trigger a viewport-based fetch for the searched area
    fetch(`/api/stations?min_lon=${lon - 0.2}&min_lat=${lat - 0.2}&max_lon=${lon + 0.2}&max_lat=${lat + 0.2}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.stations?.length > 0) {
          setStations((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newStations = data.stations.filter((s: Station) => !existingIds.has(s.id));
            return [...prev, ...newStations];
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        setMapZoom(12);
        handleCitySearch(latitude, longitude, "My Location");
      },
      () => {
        alert("Location access denied. Please enable location permissions.");
      }
    );
  }, [handleCitySearch]);

  const handleShareLink = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("lat", mapCenter[0].toString());
    url.searchParams.set("lon", mapCenter[1].toString());
    url.searchParams.set("zoom", mapZoom.toString());
    if (selectedStationId) url.searchParams.set("station", selectedStationId.toString());
    navigator.clipboard.writeText(url.toString());
    alert("Link copied to clipboard!");
  }, [mapCenter, mapZoom, selectedStationId]);

  const handleExportCSV = useCallback(() => {
    const headers = ["id,name,locality,country_code,latitude,longitude,latest_pollutant,latest_value,latest_unit"];
    const rows = stations.map((s) =>
      [s.id, `"${s.name}"`, s.locality || "", s.country_code || "", s.latitude, s.longitude, s.latest_pollutant || "", s.latest_value ?? "", s.latest_unit || ""].join(",")
    );
    const csv = [...headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pollution_stations.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [stations]);

  return (
    <div className={`h-screen w-screen overflow-hidden relative ${darkMode ? "dark" : ""}`}>
      <Header
        stationCount={stations.length}
        lastUpdated={lastUpdated}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      <div className="absolute inset-0 pt-[52px]">
        <MapView
          stations={stations}
          onStationClick={handleStationClick}
          selectedStationId={selectedStationId}
          center={mapCenter}
          zoom={mapZoom}
        />
      </div>

      {/* City Search - top left */}
      <div className="fixed top-[60px] left-4 z-[1000] w-72">
        <CitySearch onSelect={handleCitySearch} />
      </div>

      {/* Action buttons - left side */}
      <div className="fixed top-[110px] left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleMyLocation}
          className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center gap-2"
          title="My Location"
        >
          <span>📍</span> My Location
        </button>
        <button
          onClick={handleShareLink}
          className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center gap-2"
          title="Share Link"
        >
          <span>🔗</span> Share
        </button>
        <button
          onClick={handleExportCSV}
          className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center gap-2"
          title="Export CSV"
        >
          <span>📥</span> Export
        </button>
      </div>

      <Legend />

      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[996]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Fetching air quality data...</p>
            <p className="text-sm text-gray-400 mt-1">Connecting to OpenAQ sensors</p>
          </div>
        </div>
      )}

      <AlertPanel
        isOpen={alertPanelOpen}
        onToggle={() => setAlertPanelOpen(!alertPanelOpen)}
        onAlertClick={handleAlertClick}
      />

      <StationDetail
        stationId={selectedStationId}
        onClose={() => setSelectedStationId(null)}
      />
    </div>
  );
}
