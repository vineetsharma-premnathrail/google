"use client";

import { useState } from "react";
import type { Trip, DayPlan, Activity } from "@/types";
import { api } from "@/lib/api";
import { useTripStore } from "@/lib/store";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import {
  ArrowLeft, Zap, MessageSquare, AlertTriangle, DollarSign,
  MapPin, Clock, Send, RefreshCw, Check, Settings, Star,
  Map, List,
} from "lucide-react";
import PreferencesPanel from "./PreferencesPanel";
import LiveUpdatesTicker from "./LiveUpdatesTicker";
import { trackMapView, trackChatMessage } from "@/lib/firebase";

// Load map only on client (uses window.google)
const TripMap = dynamic(() => import("./TripMap"), { ssr: false });

const MAPS_API_KEY = process.env.NEXT_PUBLIC_MAPS_API_KEY ?? "";

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  food:        "bg-orange-500/20 text-orange-300 border-orange-500/30",
  adventure:   "bg-green-500/20 text-green-300 border-green-500/30",
  culture:     "bg-purple-500/20 text-purple-300 border-purple-500/30",
  transport:   "bg-slate-500/20 text-slate-300 border-slate-500/30",
  rest:        "bg-pink-500/20 text-pink-300 border-pink-500/30",
};

export default function TripDetail({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const { updateTrip } = useTripStore();
  const [activeDay, setActiveDay] = useState(0);
  const [view, setView] = useState<"list" | "map">("list");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const day: DayPlan | undefined = trip.itinerary[activeDay];
  const totalCost = trip.itinerary.reduce((s, d) => s + (d.estimated_cost ?? 0), 0);

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

  const sendChat = async () => {
    if (!chatMsg.trim() || chatLoading) return;
    const msg = chatMsg;
    setChatMsg("");
    setChatHistory((h) => [...h, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      await trackChatMessage(trip.id);
      const updated = await api.trips.chat({ trip_id: trip.id, message: msg }) as Trip;
      updateTrip(updated);
      setChatHistory((h) => [...h, { role: "ai", text: "Done! Your itinerary has been updated." }]);
    } catch (err: any) {
      setChatHistory((h) => [...h, { role: "ai", text: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button className="btn-ghost p-2 flex-shrink-0" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">{trip.title}</h1>
            <p className="text-xs text-slate-400 truncate">
              {trip.destinations.map((d) => d.city).join(" → ")} ·{" "}
              {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {trip.status === "draft" && trip.itinerary.length > 0 && (
            <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={confirmTrip}>
              <Check className="w-3.5 h-3.5" /> Confirm
            </button>
          )}
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => setShowPrefs(true)}>
            <Settings className="w-4 h-4" /> Preferences
          </button>
          <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={regenerate} disabled={regenerating}>
            <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Generating…" : "Regenerate"}
          </button>
          <button
            className={`btn-ghost flex items-center gap-1.5 text-sm ${chatOpen ? "bg-brand-900/40 text-brand-300" : ""}`}
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageSquare className="w-4 h-4" /> AI Chat
          </button>
        </div>
      </div>

      {/* Constraint/alert bar */}
      {trip.real_time_flags.length > 0 && (
        <div className="bg-amber-900/20 border-b border-amber-800/40 px-6 py-2 flex flex-wrap gap-3">
          {trip.real_time_flags.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-amber-300 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> {f.message}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {/* Budget bar */}
            {trip.budget_total && (
              <div className="card mb-5">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Budget</span>
                  <span className={totalCost > trip.budget_total ? "text-red-400 font-semibold" : "text-green-400 font-semibold"}>
                    ${totalCost.toLocaleString()} / ${trip.budget_total.toLocaleString()} {trip.budget_currency}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${totalCost > trip.budget_total ? "bg-red-500" : "bg-brand-500"}`}
                    style={{ width: `${Math.min((totalCost / trip.budget_total) * 100, 100)}%` }}
                  />
                </div>
                {trip.budget_breakdown && Object.keys(trip.budget_breakdown).length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
                    {Object.entries(trip.budget_breakdown)
                      .filter(([k]) => k !== "total" && k !== "currency")
                      .map(([k, v]) => (
                        <span key={k} className="capitalize">{k}: <span className="text-slate-300">${Number(v).toLocaleString()}</span></span>
                      ))}
                  </div>
                )}
              </div>
            )}

            {trip.itinerary.length === 0 ? (
              <div className="card text-center py-16">
                <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">No itinerary yet.</p>
                <button className="btn-primary" onClick={regenerate} disabled={regenerating}>
                  {regenerating ? "Generating…" : "Generate with AI"}
                </button>
              </div>
            ) : (
              <>
                {/* Day tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
                  {trip.itinerary.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveDay(i)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        activeDay === i ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {format(new Date(d.date), "EEE d")}
                    </button>
                  ))}
                </div>

                {/* List / Map toggle */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setView("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${view === "list" ? "bg-brand-600 text-white" : "btn-ghost"}`}
                  >
                    <List className="w-4 h-4" /> Itinerary
                  </button>
                  <button
                    onClick={() => { setView("map"); trackMapView(trip.id, activeDay); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${view === "map" ? "bg-brand-600 text-white" : "btn-ghost"}`}
                  >
                    <Map className="w-4 h-4" /> Map
                  </button>
                  {day?.theme && <span className="text-slate-400 text-sm ml-2">— {day.theme}</span>}
                </div>

                {day && (
                  <>
                    {view === "map" ? (
                      <div className="h-[500px] rounded-2xl overflow-hidden">
                        {MAPS_API_KEY ? (
                          <TripMap day={day} apiKey={MAPS_API_KEY} />
                        ) : (
                          <div className="h-full card flex items-center justify-center text-slate-500">
                            Map unavailable — set NEXT_PUBLIC_MAPS_API_KEY
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {day.activities.map((act: Activity, idx: number) => (
                          <div
                            key={act.id}
                            className={`card border ${CATEGORY_COLORS[act.category] ?? "border-slate-700"} flex gap-4`}
                          >
                            {/* Time column */}
                            <div className="flex-shrink-0 text-center w-14">
                              <div className="w-7 h-7 rounded-full bg-slate-700 text-xs font-bold flex items-center justify-center mx-auto mb-1 text-slate-200">
                                {idx + 1}
                              </div>
                              <div className="text-xs text-slate-400">{act.start_time}</div>
                              <div className="text-xs text-slate-600">↓</div>
                              <div className="text-xs text-slate-400">{act.end_time}</div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold">{act.name}</h3>
                                {act.cost > 0 && (
                                  <span className="text-sm text-slate-300 flex-shrink-0">${act.cost}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400 mt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {act.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {act.duration_minutes}m
                                </span>
                                {(act as any).rating && (
                                  <span className="flex items-center gap-1 text-amber-400">
                                    <Star className="w-3 h-3" /> {(act as any).rating}
                                  </span>
                                )}
                                {(act as any).open_now === false && (
                                  <span className="text-red-400 text-xs">Currently closed</span>
                                )}
                              </div>
                              {act.notes && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{act.notes}</p>
                              )}
                            </div>

                            <span className={`badge self-start flex-shrink-0 border ${CATEGORY_COLORS[act.category]}`}>
                              {act.category}
                            </span>
                          </div>
                        ))}

                        {/* Tips */}
                        {day.tips?.length > 0 && (
                          <div className="bg-brand-900/20 border border-brand-800/40 rounded-xl p-4 mt-2">
                            <p className="text-sm font-semibold text-brand-300 mb-2">📍 Local Tips</p>
                            <ul className="space-y-1">
                              {day.tips.map((tip, i) => (
                                <li key={i} className="text-sm text-slate-300">• {tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex justify-end mt-2">
                          <span className="text-sm text-slate-400">
                            Day total: <span className="text-white font-semibold">${day.estimated_cost}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* AI Chat sidebar */}
        {chatOpen && (
          <div className="w-80 flex-shrink-0 border-l border-slate-800 flex flex-col bg-slate-900">
            <div className="p-4 border-b border-slate-800">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" /> AI Planner Chat
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                "Swap day 2 dinner to rooftop" · "Add a spa morning" · "Make it more budget-friendly"
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatHistory.length === 0 && (
                <p className="text-xs text-slate-600 text-center mt-8">
                  Ask me to change anything about this itinerary
                </p>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] px-3 py-2 rounded-xl text-sm ${
                    msg.role === "user"
                      ? "bg-brand-700 text-white ml-auto"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {chatLoading && (
                <div className="bg-slate-800 text-slate-400 px-3 py-2 rounded-xl text-sm flex items-center gap-2 max-w-[90%]">
                  <div className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  Updating itinerary…
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Modify your trip…"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                disabled={chatLoading}
              />
              <button className="btn-primary px-3" onClick={sendChat} disabled={chatLoading || !chatMsg.trim()}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preferences modal */}
      {showPrefs && (
        <PreferencesPanel
          trip={trip}
          onClose={() => setShowPrefs(false)}
          onRegenerate={regenerate}
        />
      )}

      {/* Live WebSocket alert ticker */}
      <LiveUpdatesTicker tripId={trip.id} />
    </div>
  );
}
