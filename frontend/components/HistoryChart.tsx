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
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";

interface HistoryChartProps {
  stationId: number;
  parameter?: string;
  hours?: number;
}

export default function HistoryChart({
  stationId,
  parameter = "pm25",
  hours = 24,
}: HistoryChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParam, setSelectedParam] = useState(parameter);
  const [selectedHours, setSelectedHours] = useState(hours);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(
        `/api/stations/${stationId}/history?parameter=${selectedParam}&hours=${selectedHours}`
      ).then((r) => r.json()),
      fetch(
        `/api/stations/${stationId}/forecast?parameter=${selectedParam}`
      ).then((r) => r.json()),
    ])
      .then(([histData, forecastData]) => {
        const formatted = (histData.data || []).map((d: any) => ({
          ...d,
          time: new Date(d.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        setData(formatted);

        const fFormatted = (forecastData.forecast || []).map((d: any) => ({
          ...d,
          time: new Date(d.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isForecast: true,
        }));
        setForecast(fFormatted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stationId, selectedParam, selectedHours]);

  const allData = [...data, ...forecast];
  const params = ["pm25", "pm10", "no2", "o3", "so2", "co"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">📈 Trend & Forecast</h3>
        <div className="flex gap-1">
          <select
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50"
          >
            {params.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={selectedHours}
            onChange={(e) => setSelectedHours(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50"
          >
            <option value={6}>6h</option>
            <option value={12}>12h</option>
            <option value={24}>24h</option>
            <option value={48}>48h</option>
            <option value={168}>7d</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : allData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={allData}>
              <defs>
                <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                stroke="#94a3b8"
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              {data.length > 0 && (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="url(#colorHist)"
                  strokeWidth={2}
                  dot={false}
                  name="Actual"
                />
              )}
              {forecast.length > 0 && (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f59e0b"
                  fill="url(#colorForecast)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Forecast"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-blue-500 rounded" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-amber-500 rounded border-dashed" style={{ borderTop: "2px dashed #f59e0b" }} />
          <span>6h Forecast</span>
        </div>
      </div>
    </div>
  );
}
