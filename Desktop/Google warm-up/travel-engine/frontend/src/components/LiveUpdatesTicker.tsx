"use client";

import { useEffect, useRef } from "react";
import { createWebSocket } from "@/lib/api";
import { useTripStore } from "@/lib/store";
import { CloudRain, AlertTriangle, DollarSign, X } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  weather_alert: <CloudRain className="w-4 h-4 text-blue-400 flex-shrink-0" />,
  budget_warning: <DollarSign className="w-4 h-4 text-amber-400 flex-shrink-0" />,
  constraint_violation: <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />,
};

export default function LiveUpdatesTicker({ tripId }: { tripId: string }) {
  const { alerts, addAlert } = useTripStore();
  const wsRef = useRef<WebSocket | null>(null);
  const tripAlerts = alerts.filter((a) => a.tripId === tripId).slice(-5);

  useEffect(() => {
    const ws = createWebSocket(tripId);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.event && event.data) {
          addAlert(tripId, event.event, event.data);
        }
      } catch { }
    };

    const ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send("ping"), 25000);
    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [tripId, addAlert]);

  if (!tripAlerts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 max-w-sm">
      {tripAlerts.map((alert, i) => {
        const data = alert.data as any;
        const icon = ICONS[alert.event] ?? <AlertTriangle className="w-4 h-4 text-slate-400 flex-shrink-0" />;
        let message = "";

        if (alert.event === "weather_alert") {
          message = `Rain ${Math.round(data.weather?.rain_probability ?? 0)}% on ${data.date} — ${data.affected_activities?.join(", ")} may be affected`;
        } else if (data?.message) {
          message = data.message;
        } else {
          message = alert.event.replace(/_/g, " ");
        }

        return (
          <div
            key={i}
            className="flex items-start gap-3 bg-slate-900/95 border border-slate-700 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg animate-in slide-in-from-right"
          >
            {icon}
            <p className="text-sm text-slate-200 leading-snug">{message}</p>
          </div>
        );
      })}
    </div>
  );
}
