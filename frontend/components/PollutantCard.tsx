"use client";

import { Reading, SEVERITY_COLORS, getSeverityColor, getSeverityLabel, SeverityLevel } from "@/types";

const POLLUTANT_INFO: Record<string, { description: string; unit: string; maxSafe: number }> = {
  pm25: { description: "Fine Particulate Matter", unit: "µg/m³", maxSafe: 15 },
  pm10: { description: "Coarse Particulate Matter", unit: "µg/m³", maxSafe: 45 },
  no2: { description: "Nitrogen Dioxide", unit: "µg/m³", maxSafe: 40 },
  o3: { description: "Ozone", unit: "µg/m³", maxSafe: 100 },
  so2: { description: "Sulfur Dioxide", unit: "µg/m³", maxSafe: 40 },
  co: { description: "Carbon Monoxide", unit: "µg/m³", maxSafe: 4000 },
};

export default function PollutantCard({ reading }: { reading: Reading }) {
  const severity = getSeverityColor(reading.value, reading.parameter);
  const color = SEVERITY_COLORS[severity];
  const info = POLLUTANT_INFO[reading.parameter.toLowerCase()];
  const maxDisplay = info?.maxSafe || 100;
  const percent = Math.min(100, (reading.value / maxDisplay) * 100);

  return (
    <div
      className="rounded-xl p-4 card-hover animate-slide-in-up relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}05 0%, ${color}10 100%)`,
        border: `1px solid ${color}25`,
      }}
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} />

      <div className="flex items-start justify-between mb-3 relative">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{reading.display_name}</span>
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: color }}>
              {getSeverityLabel(severity)}
            </span>
          </div>
          {info?.description && <p className="text-[10px] text-gray-400 mt-0.5">{info.description}</p>}
        </div>
        <div className="text-right">
          <span className="text-2xl font-black" style={{ color }}>{reading.value.toFixed(1)}</span>
          <span className="text-[10px] text-gray-400 ml-1 block">{reading.unit || info?.unit || ""}</span>
        </div>
      </div>

      <div className="relative">
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${percent}%`,
              background: `linear-gradient(90deg, ${color}cc, ${color})`,
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-medium">
          <span>0</span>
          <span>WHO: {maxDisplay} {info?.unit || reading.unit}</span>
        </div>
      </div>
    </div>
  );
}
