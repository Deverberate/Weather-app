"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import AlertPanel from "@/components/AlertPanel";
import StationDetail from "@/components/StationDetail";
import Legend from "@/components/Legend";
import { Station, Alert } from "@/types";
import { fetchAllStations } from "@/lib/api";

// Dynamic import for MapView (requires client-side Leaflet)
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

  // Fetch stations on mount
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
    // Refresh every 5 minutes
    const interval = setInterval(loadStations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadStations]);

  const handleStationClick = useCallback((stationId: number) => {
    setSelectedStationId(stationId);
  }, []);

  const handleAlertClick = useCallback((alert: Alert) => {
    setSelectedStationId(alert.station_id);
    setAlertPanelOpen(false);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Header */}
      <Header stationCount={stations.length} lastUpdated={lastUpdated} />

      {/* Map (full screen, behind header) */}
      <div className="absolute inset-0 pt-[52px]">
        <MapView
          stations={stations}
          onStationClick={handleStationClick}
          selectedStationId={selectedStationId}
        />
      </div>

      {/* Legend */}
      <Legend />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[996]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Fetching air quality data...</p>
            <p className="text-sm text-gray-400 mt-1">
              Connecting to OpenAQ sensors
            </p>
          </div>
        </div>
      )}

      {/* Alert Panel */}
      <AlertPanel
        isOpen={alertPanelOpen}
        onToggle={() => setAlertPanelOpen(!alertPanelOpen)}
        onAlertClick={handleAlertClick}
      />

      {/* Station Detail Modal */}
      <StationDetail
        stationId={selectedStationId}
        onClose={() => setSelectedStationId(null)}
      />
    </div>
  );
}
