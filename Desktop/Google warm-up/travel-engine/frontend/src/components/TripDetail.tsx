"use client";

import { useEffect, useRef, useState } from "react";
import type { Trip, DayPlan, Activity } from "@/types";
import { api, createWebSocket } from "@/lib/api";
import { useTripStore } from "@/lib/store";
import { format } from "date-fns";
import {
  ArrowLeft, Zap, MessageSquare, AlertTriangle, DollarSign,
  MapPin, Clock, Send, RefreshCw, Check
} from "lucide-react";

const ACTIVITY_COLORS: Record<string, string> = {
  sightseeing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  food: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  adventure: "bg-green-500/20 text-green-300 border-green-500/30",
  culture: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  transport: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  rest: "bg-pink-500/20 text-pink-300 border-pink-500/30",
};

export default function TripDetail({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const { updateTrip, addAlert } = useTripStore();
  const [activeDay, setActiveDay] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!trip.itinerary.length) return;
    const ws = createWebSocket(trip.id);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        addAlert(trip.id, event.event, event.data);
      } catch { }
    };

    const ping = setInterval(() => ws.readyState === 1 && ws.send("ping"), 30000);
    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [trip.id, trip.itinerary.length, addAlert]);

  const sendChat = async () => {
    if (!chatMsg.trim() || chatLoading) return;
    const msg = chatMsg;
    setChatMsg("");
    setChatLoading(true);
    try {
      const updated = await api.trips.chat({ trip_id: trip.id, message: msg }) as Trip;
      updateTrip(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const updated = await api.trips.generate({ trip_id: trip.id, regenerate: true }) as Trip;
      updateTrip(updated);
    } finally {
      setRegenerating(false);
    }
  };

  const confirmTrip = async () => {
    const updated = await api.trips.updateStatus(trip.id, "confirmed") as { status: string };
    updateTrip({ ...trip, status: updated.status as Trip["status"] });
  };

  const day: DayPlan | undefined = trip.itinerary[activeDay];
  const totalCost = trip.itinerary.reduce((s, d) => s + (d.estimated_cost ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="btn-ghost p-2" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">{trip.title}</h1>
            <p className="text-sm text-slate-400">
              {trip.destinations.map((d) => d.city).join(" → ")} ·{" "}
              {format(new Date(trip.start_date), "MMM d")} –{" "}
              {format(new Date(trip.end_date), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trip.status === "draft" && trip.itinerary.length > 0 && (
            <button className="btn-primary flex items-center gap-1.5" onClick={confirmTrip}>
              <Check className="w-4 h-4" /> Confirm Trip
            </button>
          )}
          <button className="btn-ghost flex items-center gap-1.5" onClick={regenerate} disabled={regenerating}>
            <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
            Regenerate
          </button>
          <button
            className={`btn-ghost flex items-center gap-1.5 ${chatOpen ? "bg-brand-900/40 text-brand-300" : ""}`}
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageSquare className="w-4 h-4" /> AI Chat
          </button>
        </div>
      </div>

      {/* Alerts */}
      {trip.real_time_flags.length > 0 && (
        <div className="bg-amber-900/20 border-b border-amber-800/50 px-6 py-3">
          {trip.real_time_flags.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {f.message}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Left: Day nav + detail */}
        <div className="flex-1 min-w-0">
          {/* Budget bar */}
          {trip.budget_total && (
            <div className="card mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> Budget
                </span>
                <span className={totalCost > trip.budget_total ? "text-red-400" : "text-green-400"}>
                  ${totalCost.toLocaleString()} / ${trip.budget_total.toLocaleString()} {trip.budget_currency}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${totalCost > trip.budget_total ? "bg-red-500" : "bg-brand-500"}`}
                  style={{ width: `${Math.min((totalCost / trip.budget_total) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {trip.itinerary.length === 0 ? (
            <div className="card text-center py-16">
              <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No itinerary yet. Generate one to get started.</p>
            </div>
          ) : (
            <>
              {/* Day tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                {trip.itinerary.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDay(i)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      activeDay === i
                        ? "bg-brand-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {format(new Date(d.date), "EEE MMM d")}
                  </button>
                ))}
              </div>

              {/* Day detail */}
              {day && (
                <div>
                  {day.theme && (
                    <h2 className="text-xl font-bold mb-4">{day.theme}</h2>
                  )}

                  <div className="space-y-3">
                    {day.activities.map((act: Activity) => (
                      <div
                        key={act.id}
                        className={`card border ${ACTIVITY_COLORS[act.category] ?? "border-slate-700"} flex gap-4`}
                      >
                        <div className="flex-shrink-0 text-center w-16">
                          <div className="text-xs text-slate-400">{act.start_time}</div>
                          <div className="text-xs text-slate-600 mt-0.5">↓</div>
                          <div className="text-xs text-slate-400">{act.end_time}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold">{act.name}</h3>
                            {act.cost > 0 && (
                              <span className="text-sm text-slate-300 flex-shrink-0">
                                ${act.cost}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {act.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {act.duration_minutes}m
                            </span>
                          </div>
                          {act.notes && (
                            <p className="text-xs text-slate-500 mt-1">{act.notes}</p>
                          )}
                        </div>
                        <span className={`badge self-start ${ACTIVITY_COLORS[act.category]}`}>
                          {act.category}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day tips */}
                  {day.tips?.length > 0 && (
                    <div className="mt-4 bg-brand-900/20 border border-brand-800/50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-brand-300 mb-2">Local Tips</p>
                      <ul className="space-y-1">
                        {day.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-slate-300">• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Day cost summary */}
                  <div className="mt-4 flex justify-end">
                    <span className="text-sm text-slate-400">
                      Day total: <span className="text-white font-semibold">${day.estimated_cost}</span>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: AI Chat panel */}
        {chatOpen && (
          <div className="w-80 flex-shrink-0">
            <div className="card h-full flex flex-col" style={{ minHeight: "500px" }}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" />
                AI Trip Assistant
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Ask me to modify your itinerary. Try: "Swap dinner on day 2 to a rooftop restaurant" or "Add a spa morning on day 3".
              </p>

              <div className="flex-1" />

              {chatLoading && (
                <div className="flex items-center gap-2 text-brand-300 text-sm mb-3">
                  <div className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  Updating your itinerary…
                </div>
              )}

              <div className="flex gap-2 mt-auto">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Modify your trip…"
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  disabled={chatLoading}
                />
                <button
                  className="btn-primary px-3"
                  onClick={sendChat}
                  disabled={chatLoading || !chatMsg.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
