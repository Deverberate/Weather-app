"use client";

import { useEffect, useState } from "react";

interface AQIScoreProps {
  stationId: number;
}

interface ScoreData {
  aqi: number;
  level: string;
  color: string;
  icon: string;
  advice: string;
  pollutant_aqi: Record<string, number>;
}

export default function AQIScore({ stationId }: AQIScoreProps) {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stations/${stationId}/score`)
      .then((r) => r.json())
      .then(setScore)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stationId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-1/2 mb-3" />
        <div className="h-20 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!score) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">🎯 Air Quality Score</h3>

      {/* AQI Circle */}
      <div className="flex items-center gap-4 mb-3">
        <div
          className="w-20 h-20 rounded-full flex flex-col items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: score.color }}
        >
          <span className="text-2xl font-bold leading-none">{score.aqi}</span>
          <span className="text-[10px] uppercase tracking-wide">AQI</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{score.icon}</span>
            <span className="font-semibold text-gray-900">{score.level}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1 leading-snug">{score.advice}</p>
        </div>
      </div>

      {/* Individual pollutant AQI bars */}
      {Object.keys(score.pollutant_aqi).length > 0 && (
        <div className="space-y-1.5">
          {Object.entries(score.pollutant_aqi).map(([param, aqi]) => (
            <div key={param} className="flex items-center gap-2 text-xs">
              <span className="w-10 text-gray-500 uppercase">{param}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (aqi / 300) * 100)}%`,
                    backgroundColor:
                      aqi <= 50 ? "#22c55e" : aqi <= 100 ? "#eab308" : aqi <= 150 ? "#f97316" : "#ef4444",
                  }}
                />
              </div>
              <span className="w-8 text-right font-medium">{aqi}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
