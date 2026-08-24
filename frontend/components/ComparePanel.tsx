"use client";

import { useState, useEffect } from "react";
import CitySearch from "./CitySearch";
import CompareBarChart from "./CompareBarChart";
import CompareTimeline from "./CompareTimeline";
import CompareRanking from "./CompareRanking";

interface CompareCity {
  name: string;
  lat: number;
  lon: number;
}

interface CityApiData {
  name: string;
  color: string;
  aqi: number | null;
  severity: string;
  station_name: string | null;
  distance_km: number | null;
  readings: Record<string, { value: number; unit: string; display_name: string }>;
  available: boolean;
}

interface ComparePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect: (lat: number, lon: number) => void;
}

const PRESET_CITIES: CompareCity[] = [
  { name: "New Delhi", lat: 28.6139, lon: 77.2090 },
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "Beijing", lat: 39.9042, lon: 116.4074 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Paris", lat: 48.8566, lon: 2.3522 },
];

export default function ComparePanel({ isOpen, onClose, onCitySelect }: ComparePanelProps) {
  const [selectedCities, setSelectedCities] = useState<CompareCity[]>([]);
  const [cityData, setCityData] = useState<CityApiData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComparison = async (cities: CompareCity[]) => {
    if (cities.length === 0) {
      setCityData([]);
      return;
    }
    setLoading(true);
    const citiesParam = cities.map((c) => `${c.lat},${c.lon},${c.name}`).join("|");
    try {
      const res = await fetch(`/api/compare?cities=${encodeURIComponent(citiesParam)}`);
      const data = await res.json();
      setCityData(data.cities || []);
    } catch {
      setCityData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison(selectedCities);
  }, [selectedCities]);

  const addCity = (city: CompareCity) => {
    if (selectedCities.length >= 4) return;
    if (selectedCities.some((c) => c.name === city.name)) return;
    const updated = [...selectedCities, city];
    setSelectedCities(updated);
    onCitySelect(city.lat, city.lon);
  };

  const removeCity = (name: string) => {
    setSelectedCities((prev) => prev.filter((c) => c.name !== name));
  };

  const addPreset = (preset: CompareCity) => {
    addCity(preset);
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[520px] bg-white shadow-2xl z-[1001] transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-900">⚖️ City Comparison</h2>
          <p className="text-xs text-gray-500">Compare air quality across {selectedCities.length}/4 cities</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto h-[calc(100%-72px)] px-5 py-4 space-y-4">
        {/* City selector */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Add Cities</p>

          {/* Selected city chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedCities.map((c, i) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"][i % 4] }}
              >
                {c.name}
                <button
                  onClick={() => removeCity(c.name)}
                  className="ml-1 hover:bg-white/30 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </span>
            ))}
            {selectedCities.length === 0 && (
              <span className="text-xs text-gray-400 py-1">No cities selected</span>
            )}
          </div>

          {/* Search */}
          {selectedCities.length < 4 && (
            <div className="mb-3">
              <CitySearch
                onSelect={(lat, lon, name) => addCity({ name, lat, lon })}
              />
            </div>
          )}

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_CITIES.filter((p) => !selectedCities.some((c) => c.name === p.name)).map((p) => (
              <button
                key={p.name}
                onClick={() => addPreset(p)}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}

        {/* Results */}
        {!loading && cityData.length > 0 && (
          <>
            <CompareRanking cities={cityData} />
            <CompareBarChart cities={cityData} />
            <CompareTimeline cities={selectedCities} />
          </>
        )}

        {/* Empty state */}
        {!loading && selectedCities.length < 2 && (
          <div className="text-center py-8 text-gray-400">
            <span className="text-4xl">⚖️</span>
            <p className="mt-2 text-sm">Add at least 2 cities to compare</p>
          </div>
        )}
      </div>
    </div>
  );
}
