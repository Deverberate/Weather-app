"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import AlertPanel from "@/components/AlertPanel";
import StationDetail from "@/components/StationDetail";
import Legend from "@/components/Legend";
import CitySearch from "@/components/CitySearch";
import ComparePanel from "@/components/ComparePanel";
import { Station, Alert } from "@/types";
import { fetchAllStations, fetchStationsOnDemand } from "@/lib/api";

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
  const [compareOpen, setCompareOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingArea, setFetchingArea] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const [searchFocused, setSearchFocused] = useState(false);

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
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadStations, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadStations]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleStationClick = useCallback((stationId: number) => {
    setSelectedStationId(stationId);
  }, []);

  const handleAlertClick = useCallback((alert: Alert) => {
    setSelectedStationId(alert.station_id);
    setAlertPanelOpen(false);
  }, []);

  const handleCitySearch = useCallback(async (lat: number, lon: number, name: string) => {
    setMapCenter([lat, lon]);
    setMapZoom(12);
    setFetchingArea(true);
    try {
      await fetchStationsOnDemand(lat, lon, 15000);
      const data = await fetchAllStations();
      setStations(data.stations || []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to fetch area data:", e);
    } finally {
      setFetchingArea(false);
    }
  }, []);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => handleCitySearch(pos.coords.latitude, pos.coords.longitude, "My Location"),
      () => alert("Location access denied.")
    );
  }, [handleCitySearch]);

  const handleShareLink = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("lat", mapCenter[0].toString());
    url.searchParams.set("lon", mapCenter[1].toString());
    url.searchParams.set("zoom", mapZoom.toString());
    if (selectedStationId) url.searchParams.set("station", selectedStationId.toString());
    navigator.clipboard.writeText(url.toString());
    setShareOpen(false);
    alert("Link copied to clipboard!");
  }, [mapCenter, mapZoom, selectedStationId]);

  const handleShareStats = useCallback(() => {
    const stats = stations
      .filter((s) => s.latest_value !== null)
      .map((s) => `${s.name}: ${s.latest_display_name} = ${s.latest_value} ${s.latest_unit}`)
      .join("\n");
    const text = `🌍 Pollution Monitor Stats\n${"─".repeat(30)}\n${stats}\n${"─".repeat(30)}\nData from OpenAQ · ${new Date().toLocaleString()}`;
    navigator.clipboard.writeText(text);
    setShareOpen(false);
    alert("Stats copied to clipboard!");
  }, [stations]);

  const handleExportCSV = useCallback(() => {
    const headers = ["id,name,locality,country_code,latitude,longitude,latest_pollutant,latest_value,latest_unit"];
    const rows = stations.map((s) =>
      [s.id, `"${s.name}"`, s.locality || "", s.country_code || "", s.latitude, s.longitude, s.latest_pollutant || "", s.latest_value ?? "", s.latest_unit || ""].join(",")
    );
    const csv = [...headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pollution_stations.csv";
    a.click();
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

      {/* City Search — higher z-index when focused */}
      <div className={`fixed top-[60px] left-4 w-72 transition-all ${searchFocused ? "z-[1100]" : "z-[1000]"}`}>
        <CitySearch onSelect={handleCitySearch} onFocusChange={setSearchFocused} />
      </div>

      {/* Action buttons — hidden behind search dropdown when focused */}
      <div className={`fixed top-[110px] left-4 flex flex-col gap-2 transition-all ${searchFocused ? "z-[999] opacity-30" : "z-[1000]"}`}>
        <button onClick={handleMyLocation} disabled={fetchingArea}
          className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center gap-2 disabled:opacity-50">
          {fetchingArea ? (
            <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" /> Fetching...</>
          ) : (
            <><span>📍</span> My Location</>
          )}
        </button>
        <button onClick={() => setCompareOpen(true)}
          className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center gap-2">
          <span>⚖️</span> Compare
        </button>
        <div className="relative">
          <button onClick={() => setShareOpen(!shareOpen)}
            className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center gap-2">
            <span>🔗</span> Share
          </button>
          {shareOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-56">
              <button onClick={handleShareLink}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-50">
                <span>🔗</span> Copy Link
              </button>
              <button onClick={handleShareStats}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2">
                <span>📊</span> Copy Stats
              </button>
            </div>
          )}
        </div>
        <button onClick={handleExportCSV}
          className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center gap-2">
          <span>📥</span> Export
        </button>
      </div>

      {fetchingArea && (
        <div className="fixed top-[60px] left-80 z-[1000] bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700 flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
          Fetching live data from OpenAQ...
        </div>
      )}

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

      <ComparePanel
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        onCitySelect={(lat, lon) => handleCitySearch(lat, lon, "")}
      />

      <StationDetail
        stationId={selectedStationId}
        onClose={() => setSelectedStationId(null)}
      />
    </div>
  );
}
