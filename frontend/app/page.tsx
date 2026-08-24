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
    <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #dbeafe 50%, #e0f2fe 100%)" }}>
      <div className="text-center animate-fade-in">
        <div className="text-6xl mb-4 animate-float">🌍</div>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
        <p className="text-gray-600 font-semibold">Loading map...</p>
      </div>
    </div>
  ),
});

const BUTTON_STYLE = "glass rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2 btn-glow transition-all duration-300 border border-white/30";

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
    } catch (e) { console.error("Failed to load stations:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadStations();
    const interval = setInterval(loadStations, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadStations]);

  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); }, [darkMode]);

  const handleStationClick = useCallback((id: number) => setSelectedStationId(id), []);

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
    } catch (e) { console.error("Failed to fetch area data:", e); }
    finally { setFetchingArea(false); }
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
    const stats = stations.filter((s) => s.latest_value !== null)
      .map((s) => `${s.name}: ${s.latest_display_name} = ${s.latest_value} ${s.latest_unit}`).join("\n");
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
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "pollution_stations.csv";
    a.click();
  }, [stations]);

  return (
    <div className={`h-screen w-screen overflow-hidden relative ${darkMode ? "dark" : ""}`}>
      <Header stationCount={stations.length} lastUpdated={lastUpdated} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />

      <div className="absolute inset-0 pt-[52px]">
        <MapView stations={stations} onStationClick={handleStationClick} selectedStationId={selectedStationId} center={mapCenter} zoom={mapZoom} />
      </div>

      {/* City Search */}
      <div className={`fixed top-[60px] left-4 w-72 transition-all ${searchFocused ? "z-[1100]" : "z-[1000]"}`}>
        <CitySearch onSelect={handleCitySearch} onFocusChange={setSearchFocused} />
      </div>

      {/* Action buttons */}
      <div className={`fixed top-[110px] left-4 flex flex-col gap-2 transition-all duration-300 ${searchFocused ? "z-[999] opacity-20 scale-95" : "z-[1000] opacity-100 scale-100"}`}>
        <button onClick={handleMyLocation} disabled={fetchingArea} className={`${BUTTON_STYLE} disabled:opacity-50`}>
          {fetchingArea ? (
            <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-500" /> <span className="gradient-text-blue">Fetching...</span></>
          ) : (
            <><span className="text-base">📍</span> My Location</>
          )}
        </button>
        <button onClick={() => setCompareOpen(true)} className={BUTTON_STYLE}>
          <span className="text-base">⚖️</span> Compare
        </button>
        <div className="relative">
          <button onClick={() => setShareOpen(!shareOpen)} className={BUTTON_STYLE}>
            <span className="text-base">🔗</span> Share
          </button>
          {shareOpen && (
            <div className="absolute top-full left-0 mt-2 glass rounded-xl shadow-xl z-50 w-56 overflow-hidden animate-slide-in-up">
              <button onClick={handleShareLink} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-3 transition-colors border-b border-white/50">
                <span className="text-base">🔗</span> Copy Link
              </button>
              <button onClick={handleShareStats} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-3 transition-colors">
                <span className="text-base">📊</span> Copy Stats
              </button>
            </div>
          )}
        </div>
        <button onClick={handleExportCSV} className={BUTTON_STYLE}>
          <span className="text-base">📥</span> Export
        </button>
      </div>

      {/* Fetching indicator */}
      {fetchingArea && (
        <div className="fixed top-[60px] left-80 z-[1000] glass rounded-xl px-4 py-2.5 text-sm font-medium text-indigo-700 flex items-center gap-2 animate-slide-in-up">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-500" />
          <span className="gradient-text-blue">Fetching live data from OpenAQ...</span>
        </div>
      )}

      <Legend />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-[996] animate-fade-in"
          style={{ background: "linear-gradient(135deg, rgba(224,231,255,0.9) 0%, rgba(219,234,254,0.9) 50%, rgba(224,242,254,0.9) 100%)" }}>
          <div className="text-center animate-slide-in-up">
            <div className="text-7xl mb-6 animate-float">🌍</div>
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-200 border-t-indigo-600 mx-auto mb-5" />
            <p className="text-gray-700 font-bold text-lg">Fetching air quality data</p>
            <p className="text-sm text-gray-500 mt-1">Connecting to OpenAQ sensors worldwide</p>
          </div>
        </div>
      )}

      <AlertPanel isOpen={alertPanelOpen} onToggle={() => setAlertPanelOpen(!alertPanelOpen)} onAlertClick={handleAlertClick} />
      <ComparePanel isOpen={compareOpen} onClose={() => setCompareOpen(false)} onCitySelect={(lat, lon) => handleCitySearch(lat, lon, "")} />
      <StationDetail stationId={selectedStationId} onClose={() => setSelectedStationId(null)} />
    </div>
  );
}
