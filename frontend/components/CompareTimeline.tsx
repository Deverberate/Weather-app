"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CityInput {
  name: string;
  lat: number;
  lon: number;
}

interface CompareTimelineProps {
  cities: CityInput[];
  parameter?: string;
  hours?: number;
}

export default function CompareTimeline({ cities, parameter = "pm25", hours = 24 }: CompareTimelineProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParam, setSelectedParam] = useState(parameter);

  useEffect(() => {
    if (cities.length < 2) return;
    setLoading(true);
    const citiesParam = cities.map((c) => `${c.lat},${c.lon},${c.name}`).join("|");
    fetch(`/api/compare/history?cities=${encodeURIComponent(citiesParam)}&parameter=${selectedParam}&hours=${hours}`)
      .then((r) => r.json())
      .then((d) => {
        // Merge all city data into one array keyed by time
        if (!d.cities || d.cities.length === 0) return;
        const timeMap = new Map<string, any>();
        d.cities.forEach((city: any) => {
          city.data.forEach((pt: any) => {
            if (!timeMap.has(pt.time)) {
              timeMap.set(pt.time, { time: pt.time });
            }
            timeMap.get(pt.time)![city.name] = pt.value;
          });
        });
        setData(Array.from(timeMap.values()));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cities, selectedParam, hours]);

  const params = ["pm25", "pm10", "no2", "o3", "so2", "co"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">📈 Trend Overlay</h3>
        <select
          value={selectedParam}
          onChange={(e) => setSelectedParam(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50"
        >
          {params.map((p) => (
            <option key={p} value={p}>{p.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
          Add at least 2 cities to compare trends
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              <Legend />
              {cities.map((c, i) => (
                <Line
                  key={c.name}
                  type="monotone"
                  dataKey={c.name}
                  stroke={["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"][i % 4]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
