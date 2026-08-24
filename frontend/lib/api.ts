const API_BASE = "";

export async function fetchStations(minLon: number, minLat: number, maxLon: number, maxLat: number) {
  const params = new URLSearchParams({
    min_lon: minLon.toString(), min_lat: minLat.toString(),
    max_lon: maxLon.toString(), max_lat: maxLat.toString(),
  });
  const res = await fetch(`${API_BASE}/api/stations?${params}`);
  if (!res.ok) throw new Error("Failed to fetch stations");
  return res.json();
}

export async function fetchAllStations() {
  const res = await fetch(`${API_BASE}/api/stations/all`);
  if (!res.ok) throw new Error("Failed to fetch all stations");
  return res.json();
}

export async function fetchStationDetail(stationId: number) {
  const res = await fetch(`${API_BASE}/api/stations/${stationId}`);
  if (!res.ok) throw new Error("Failed to fetch station detail");
  return res.json();
}

/** On-demand fetch: pulls live data from OpenAQ for a specific area */
export async function fetchStationsOnDemand(lat: number, lon: number, radius = 15000) {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString(), radius: radius.toString() });
  const res = await fetch(`${API_BASE}/api/stations/fetch?${params}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch on-demand data");
  return res.json();
}

export async function fetchAlerts(limit = 50) {
  const res = await fetch(`${API_BASE}/api/alerts?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function fetchHotspots(limit = 20) {
  const res = await fetch(`${API_BASE}/api/alerts/hotspots?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch hotspots");
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export function createAlertWebSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return new WebSocket(`${protocol}//${window.location.host}/ws/alerts`);
}
