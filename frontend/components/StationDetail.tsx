"use client";

import { useEffect, useState } from "react";
import { StationDetail as StationDetailType, Reading } from "@/types";
import { fetchStationDetail } from "@/lib/api";
import PollutantCard from "./PollutantCard";
import HistoryChart from "./HistoryChart";
import AQIScore from "./AQIScore";

interface StationDetailProps {
  stationId: number | null;
  onClose: () => void;
}

export default function StationDetail({ stationId, onClose }: StationDetailProps) {
  const [station, setStation] = useState<StationDetailType | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    fetchStationDetail(stationId)
      .then((data) => { setStation(data.station); setReadings(data.readings || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stationId]);

  const handleDownload = () => {
    if (!station) return;
    const lines = [
      `Station: ${station.name}`,
      `Location: ${station.latitude}, ${station.longitude}`,
      `Country: ${station.country_name || station.country_code || "N/A"}`,
      "",
      "Readings:",
      ...readings.map((r) => `  ${r.display_name}: ${r.value} ${r.unit}`),
      "",
      `Downloaded: ${new Date().toLocaleString()}`,
      "Data from OpenAQ",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${station.name.replace(/[^a-zA-Z0-9]/g, "_")}_stats.txt`;
    a.click();
  };

  if (!stationId) return null;

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {loading ? "Loading..." : station?.name || "Unknown Station"}
              </h2>
              {(station?.locality || station?.country_name) && (
                <p className="text-sm text-gray-500">
                  {[station?.locality, station?.country_name].filter(Boolean).join(", ")}
                </p>
              )}
              {station?.latitude != null && station?.longitude != null && (
                <p className="text-xs text-gray-400 mt-0.5">
                  📍 {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Download button */}
              {!loading && station && (
                <button onClick={handleDownload}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                  title="Download station stats">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg" />)}
            </div>
          ) : (
            <>
              <AQIScore stationId={stationId} />
              {readings.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current Readings</p>
                  <div className="space-y-2">
                    {readings.map((reading, i) => (
                      <PollutantCard key={`${reading.parameter}-${i}`} reading={reading} />
                    ))}
                  </div>
                </div>
              )}
              <HistoryChart stationId={stationId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
