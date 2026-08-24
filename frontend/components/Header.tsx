"use client";

interface HeaderProps {
  stationCount: number;
  lastUpdated: Date | null;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function Header({ stationCount, lastUpdated, darkMode, onToggleDarkMode }: HeaderProps) {
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="fixed top-0 left-0 right-0 z-[997] glass border-b border-white/20">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Animated globe icon */}
            <div className="relative">
              <span className="text-2xl animate-float">🌍</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">
                <span className="gradient-text">Pollution</span>
                <span className="text-gray-900"> Monitor</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Hyperlocal Air Quality</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* Station count badge */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full px-3 py-1.5 border border-blue-100">
            <div className="relative">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse block" />
              <span className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping" />
            </div>
            <span className="text-xs font-semibold text-blue-700">
              {stationCount} station{stationCount !== 1 ? "s" : ""}
            </span>
          </div>

          {lastUpdated && (
            <div className="text-[10px] text-gray-400 hidden sm:flex items-center gap-1 bg-gray-50 rounded-full px-2.5 py-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Updated {formatTime(lastUpdated)}
            </div>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 flex items-center justify-center transition-all duration-300 border border-gray-200 hover:border-indigo-200 hover:shadow-md"
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            <span className="text-base">{darkMode ? "☀️" : "🌙"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
