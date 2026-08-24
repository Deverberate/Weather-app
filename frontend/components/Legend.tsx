"use client";

import { SEVERITY_COLORS, getSeverityLabel, SeverityLevel } from "@/types";

const levels: SeverityLevel[] = ["good", "moderate", "unhealthy", "very_unhealthy"];

export default function Legend() {
  return (
    <div className="fixed bottom-4 left-4 z-[998] glass rounded-xl shadow-lg px-4 py-3 card-hover">
      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Air Quality</p>
      <div className="space-y-1.5">
        {levels.map((level) => (
          <div key={level} className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[level] }} />
              <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-30"
                style={{ backgroundColor: SEVERITY_COLORS[level] }} />
            </div>
            <span className="text-[11px] text-gray-600 font-medium">{getSeverityLabel(level)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
