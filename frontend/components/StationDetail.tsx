"use client";

import { useEffect, useState } from "react";
import {
  StationDetail as StationDetailType,
  Reading,
} from "@/types";
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
      .then((data) => {
        setStation(data.station);
        setReadings(data.readings || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stationId]);

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
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* AQI Score */}
              <AQIScore stationId={stationId} />

              {/* Current Readings */}
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

              {/* History Chart */}
              <HistoryChart stationId={stationId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
