"use client";

import { SEVERITY_COLORS, getSeverityLabel, SeverityLevel } from "@/types";

const levels: SeverityLevel[] = [
  "good",
  "moderate",
  "unhealthy",
  "very_unhealthy",
];

export default function Legend() {
  return (
    <div className="fixed bottom-4 left-4 z-[998] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 border border-gray-200">
      <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        Air Quality
      </p>
      <div className="space-y-1">
        {levels.map((level) => (
          <div key={level} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: SEVERITY_COLORS[level] }}
            />
            <span className="text-[11px] text-gray-600">
              {getSeverityLabel(level)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
