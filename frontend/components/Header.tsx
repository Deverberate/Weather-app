"use client";

interface HeaderProps {
  stationCount: number;
  lastUpdated: Date | null;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function Header({ stationCount, lastUpdated, darkMode, onToggleDarkMode }: HeaderProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[997] bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌍</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Pollution Monitor</h1>
              <p className="text-xs text-gray-500">Hyperlocal Air Quality Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs">
              {stationCount} station{stationCount !== 1 ? "s" : ""} monitored
            </span>
          </div>
          {lastUpdated && (
            <div className="text-xs text-gray-400 hidden sm:block">
              Updated {formatTime(lastUpdated)}
            </div>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-lg"
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  );
}
