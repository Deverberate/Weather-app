"use client";

import { useEffect, useState } from "react";

interface AQIScoreProps { stationId: number; }

interface ScoreData {
  aqi: number; level: string; color: string; icon: string;
  advice: string; pollutant_aqi: Record<string, number>;
}

function AQIRing({ aqi, color }: { aqi: number; color: string }) {
  const circumference = 2 * Math.PI * 45;
  const progress = Math.min(aqi / 300, 1);
  const dashoffset = circumference * (1 - progress);

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="aqi-ring transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-gray-900 leading-none">{aqi}</span>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">AQI</span>
      </div>
    </div>
  );
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
      <div className="rounded-2xl border border-gray-100 p-5 animate-slide-in-up" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
        <div className="h-5 shimmer rounded w-1/3 mb-4" />
        <div className="flex gap-4">
          <div className="w-24 h-24 shimmer rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 shimmer rounded w-2/3" />
            <div className="h-3 shimmer rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!score) return null;

  return (
    <div
      className="rounded-2xl p-5 animate-slide-in-up card-hover overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${score.color}08 0%, ${score.color}15 100%)`,
        border: `1px solid ${score.color}20`,
      }}
    >
      {/* Decorative circle */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${score.color} 0%, transparent 70%)` }} />

      <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: score.color }} />
        Air Quality Score
      </h3>

      <div className="flex items-center gap-5 relative">
        <AQIRing aqi={score.aqi} color={score.color} />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{score.icon}</span>
            <span className="font-bold text-gray-900">{score.level}</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{score.advice}</p>
        </div>
      </div>

      {/* Pollutant bars */}
      {Object.keys(score.pollutant_aqi).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {Object.entries(score.pollutant_aqi).map(([param, aqi]) => (
            <div key={param} className="flex items-center gap-2">
              <span className="w-12 text-[10px] font-bold text-gray-400 uppercase">{param}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(100, (aqi / 300) * 100)}%`,
                    background: aqi <= 50 ? "var(--gradient-success)" : aqi <= 100 ? "linear-gradient(90deg, #eab308, #f59e0b)" : "var(--gradient-danger)",
                  }}
                />
              </div>
              <span className="w-8 text-right text-xs font-bold text-gray-600">{aqi}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
