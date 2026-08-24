"use client";

import {
  Reading,
  SEVERITY_COLORS,
  getSeverityColor,
  getSeverityLabel,
  SeverityLevel,
} from "@/types";

// WHO guidelines for individual pollutant descriptions
const POLLUTANT_INFO: Record<
  string,
  { description: string; unit: string; maxSafe: number }
> = {
  pm25: {
    description: "Fine Particulate Matter",
    unit: "µg/m³",
    maxSafe: 15,
  },
  pm10: {
    description: "Coarse Particulate Matter",
    unit: "µg/m³",
    maxSafe: 45,
  },
  no2: {
    description: "Nitrogen Dioxide",
    unit: "µg/m³",
    maxSafe: 40,
  },
  o3: {
    description: "Ozone",
    unit: "µg/m³",
    maxSafe: 100,
  },
  so2: {
    description: "Sulfur Dioxide",
    unit: "µg/m³",
    maxSafe: 40,
  },
  co: {
    description: "Carbon Monoxide",
    unit: "µg/m³",
    maxSafe: 4000,
  },
};

interface PollutantCardProps {
  reading: Reading;
}

export default function PollutantCard({ reading }: PollutantCardProps) {
  const severity = getSeverityColor(reading.value, reading.parameter);
  const color = SEVERITY_COLORS[severity];
  const info = POLLUTANT_INFO[reading.parameter.toLowerCase()];
  const maxDisplay = info?.maxSafe || 100;

  // Calculate percentage for progress bar (capped at 100%)
  const percent = Math.min(100, (reading.value / maxDisplay) * 100);

  return (
    <div
      className="rounded-xl border p-4 transition-all hover:shadow-md"
      style={{ borderColor: color + "40" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">
              {reading.display_name}
            </span>
            <span
              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{ backgroundColor: color + "20", color }}
            >
              {getSeverityLabel(severity)}
            </span>
          </div>
          {info?.description && (
            <p className="text-xs text-gray-400">{info.description}</p>
          )}
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold" style={{ color }}>
            {reading.value.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500 ml-1">
            {reading.unit || info?.unit || ""}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>0</span>
        <span>WHO safe: {maxDisplay} {info?.unit || reading.unit}</span>
      </div>
    </div>
  );
}
