"use client";

import { useState, useRef, useEffect } from "react";

interface CitySearchProps {
  onSelect: (lat: number, lon: number, name: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const PRESET_CITIES = [
  { name: "New Delhi", lat: 28.6139, lon: 77.2090, flag: "🇮🇳" },
  { name: "London", lat: 51.5074, lon: -0.1278, flag: "🇬🇧" },
  { name: "Beijing", lat: 39.9042, lon: 116.4074, flag: "🇨🇳" },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437, flag: "🇺🇸" },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, flag: "🇯🇵" },
  { name: "Paris", lat: 48.8566, lon: 2.3522, flag: "🇫🇷" },
  { name: "Mumbai", lat: 19.076, lon: 72.8777, flag: "🇮🇳" },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, flag: "🇪🇬" },
  { name: "Accra", lat: 5.6037, lon: -0.1870, flag: "🇬🇭" },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, flag: "🇦🇺" },
  { name: "San Francisco", lat: 37.7749, lon: -122.4194, flag: "🇺🇸" },
  { name: "Dubai", lat: 25.2048, lon: 55.2708, flag: "🇦🇪" },
];

export default function CitySearch({ onSelect, onFocusChange }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const filteredPresets = query.length === 0
    ? PRESET_CITIES
    : PRESET_CITIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  const showDropdown = focused && (filteredPresets.length > 0 || results.length > 0 || query.length >= 3);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`, {
        headers: { "User-Agent": "PollutionMonitor/1.0" },
      })
        .then((r) => r.json())
        .then((data) => setResults(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = (lat: number, lon: number, name: string) => {
    onSelect(lat, lon, name);
    setQuery(name);
    setResults([]);
    setFocused(false);
    onFocusChange?.(false);
  };

  const handleFocus = () => { setFocused(true); onFocusChange?.(true); };
  const handleBlur = () => { setTimeout(() => { setFocused(false); onFocusChange?.(false); }, 200); };

  return (
    <div className="relative">
      <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 gap-2 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-200 transition-all">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search city or location..."
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
        />
        {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />}
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {filteredPresets.length > 0 && (
            <div>
              {query.length === 0 && (
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">Popular Cities</div>
              )}
              {filteredPresets.map((city) => (
                <button key={city.name}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2 border-b border-gray-50 last:border-0 transition-colors"
                  onMouseDown={() => handleSelect(city.lat, city.lon, city.name)}>
                  <span className="text-lg">{city.flag}</span>
                  <div>
                    <div className="font-medium">{city.name}</div>
                    <div className="text-[10px] text-gray-400">{city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {results.length > 0 && (
            <div>
              {filteredPresets.length > 0 && (
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">Search Results</div>
              )}
              {results.map((r, i) => (
                <button key={i}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
                  onMouseDown={() => handleSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(",")[0])}>
                  <div className="font-medium">{r.display_name.split(",")[0]}</div>
                  <div className="text-xs text-gray-400 truncate">{r.display_name}</div>
                </button>
              ))}
            </div>
          )}
          {query.length >= 3 && !loading && results.length === 0 && filteredPresets.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-gray-400">No results for &quot;{query}&quot;</div>
          )}
        </div>
      )}
    </div>
  );
}
