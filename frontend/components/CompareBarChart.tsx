"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CityData {
  name: string;
  color: string;
  aqi: number | null;
  readings: Record<string, { value: number; unit: string; display_name: string }>;
}

interface CompareBarChartProps {
  cities: CityData[];
}

export default function CompareBarChart({ cities }: CompareBarChartProps) {
  const params = ["pm25", "pm10", "no2", "o3", "so2", "co"];

  // Build chart data: one entry per pollutant
  const chartData = params
    .filter((p) => cities.some((c) => c.readings[p]))
    .map((p) => {
      const entry: Record<string, any> = { parameter: p.toUpperCase() };
      cities.forEach((c) => {
        entry[c.name] = c.readings[p]?.value ?? 0;
      });
      return entry;
    });

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">📊 Pollutant Comparison</h3>
        <p className="text-sm text-gray-400 text-center py-8">No overlapping pollutant data</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">📊 Pollutant Comparison</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="parameter" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Legend />
            {cities.map((c) => (
              <Bar key={c.name} dataKey={c.name} fill={c.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
