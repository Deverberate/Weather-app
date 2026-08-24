"use client";

interface CityData {
  name: string;
  color: string;
  aqi: number | null;
  severity: string;
  station_name: string | null;
  distance_km: number | null;
  readings: Record<string, { value: number; unit: string; display_name: string }>;
  available: boolean;
}

interface CompareRankingProps {
  cities: CityData[];
}

const SEVERITY_BG: Record<string, string> = {
  good: "#dcfce7",
  moderate: "#fef9c3",
  unhealthy: "#fed7aa",
  very_unhealthy: "#fecaca",
};

const SEVERITY_TEXT: Record<string, string> = {
  good: "#166534",
  moderate: "#854d0e",
  unhealthy: "#9a3412",
  very_unhealthy: "#991b1b",
};

export default function CompareRanking({ cities }: CompareRankingProps) {
  const params = ["pm25", "pm10", "no2", "o3"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">🏆 City Ranking</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">#</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">City</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-gray-500">AQI</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-gray-500">Level</th>
              {params.map((p) => (
                <th key={p} className="text-right py-2 px-2 text-xs font-medium text-gray-500">{p.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cities.map((c, i) => (
              <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 px-2">
                  <span className="font-bold" style={{ color: c.color }}>
                    {i + 1}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <div>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      {c.station_name && (
                        <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{c.station_name}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2 px-2 text-center">
                  <span className="font-bold text-gray-900">
                    {c.aqi !== null ? c.aqi : "—"}
                  </span>
                </td>
                <td className="py-2 px-2 text-center">
                  {c.available ? (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                      style={{
                        backgroundColor: SEVERITY_BG[c.severity] || "#f3f4f6",
                        color: SEVERITY_TEXT[c.severity] || "#6b7280",
                      }}
                    >
                      {c.severity.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">No data</span>
                  )}
                </td>
                {params.map((p) => (
                  <td key={p} className="py-2 px-2 text-right text-xs text-gray-600">
                    {c.readings[p] ? (
                      <span>{c.readings[p].value.toFixed(1)}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
