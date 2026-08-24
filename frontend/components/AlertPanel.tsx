"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Alert, SeverityLevel, SEVERITY_COLORS, getSeverityLabel } from "@/types";
import { createAlertWebSocket, fetchAlerts } from "@/lib/api";

interface AlertPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onAlertClick: (alert: Alert) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AlertPanel({ isOpen, onToggle, onAlertClick }: AlertPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = createAlertWebSocket();
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "alert") setAlerts((prev) => [msg.data, ...prev].slice(0, 100));
          else if (msg.type === "initial" && Array.isArray(msg.data)) setAlerts(msg.data);
        } catch {}
      };
      ws.onclose = () => { setConnected(false); reconnectTimerRef.current = setTimeout(connectWebSocket, 5000); };
      ws.onerror = () => setConnected(false);
    } catch {
      reconnectTimerRef.current = setTimeout(connectWebSocket, 5000);
    }
  }, []);

  useEffect(() => {
    connectWebSocket();
    fetchAlerts(50).then((data) => setAlerts(data.alerts || [])).catch(() => {});
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ action: "ping" }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Bell icon only — no text */}
      <button onClick={onToggle}
        className="fixed top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200 relative">
        <span className="text-lg">🔔</span>
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center animate-pulse-alert">
            {Math.min(alerts.length, 99)}
          </span>
        )}
        <div className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`} />
      </button>

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-[999] transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pollution Alerts</h2>
            <p className="text-xs text-gray-500">{alerts.length} alert{alerts.length !== 1 ? "s" : ""} · WHO thresholds</p>
          </div>
          <button onClick={onToggle} className="p-1 hover:bg-gray-200 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-64px)] custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-4xl mb-3">🌿</span>
              <p className="text-sm">No alerts yet</p>
              <p className="text-xs mt-1">Alerts appear when readings exceed WHO thresholds</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {alerts.map((alert, i) => (
                <button key={`${alert.id || i}-${alert.created_at}`}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  onClick={() => onAlertClick(alert)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}>
                          {getSeverityLabel(alert.severity)}
                        </span>
                        <span className="text-xs text-gray-500">{timeAgo(alert.created_at)}</span>
                      </div>
                      <p className="font-medium text-sm text-gray-900 truncate">{alert.station_name}</p>
                      <p className="text-sm text-gray-600">{alert.display_name}: <span className="font-semibold">{alert.value} {alert.unit}</span></p>
                    </div>
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
