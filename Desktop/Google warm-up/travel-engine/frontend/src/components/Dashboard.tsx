"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore, useTripStore } from "@/lib/store";
import type { Trip } from "@/types";
import TripCard from "./TripCard";
import NewTripModal from "./NewTripModal";
import TripDetail from "./TripDetail";
import { Plane, Plus, LogOut, Bell, Map } from "lucide-react";

export default function Dashboard() {
  const { user, clearAuth } = useAuthStore();
  const { trips, setTrips, activeTrip, setActiveTrip, alerts } = useTripStore();
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.trips.list().then((data) => {
      setTrips(data as Trip[]);
      setLoading(false);
    });
  }, [setTrips]);

  if (activeTrip) return <TripDetail trip={activeTrip} onBack={() => setActiveTrip(null)} />;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plane className="w-6 h-6 text-brand-500" />
          <span className="font-bold text-lg">Travel Engine</span>
        </div>

        <div className="flex items-center gap-3">
          {alerts.length > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-amber-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-xs flex items-center justify-center text-black font-bold">
                {alerts.length}
              </span>
            </div>
          )}
          <span className="text-slate-400 text-sm hidden sm:block">
            {user?.full_name ?? user?.email}
          </span>
          <button className="btn-ghost" onClick={clearAuth}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              {user?.full_name ? `Hey, ${user.full_name.split(" ")[0]} 👋` : "My Trips"}
            </h1>
            <p className="text-slate-400">
              {trips.length === 0
                ? "Create your first AI-powered trip"
                : `${trips.length} trip${trips.length > 1 ? "s" : ""} planned`}
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4" />
            New Trip
          </button>
        </div>

        {/* Stats strip */}
        {trips.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Total Trips", value: trips.length },
              { label: "Destinations", value: new Set(trips.flatMap((t) => t.destinations.map((d) => d.city))).size },
              { label: "Active", value: trips.filter((t) => t.status === "active").length },
              { label: "Completed", value: trips.filter((t) => t.status === "completed").length },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <div className="text-2xl font-bold text-brand-400">{s.value}</div>
                <div className="text-sm text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Trips grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-48 animate-pulse bg-slate-800" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="card text-center py-20">
            <Map className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No trips yet</h3>
            <p className="text-slate-400 mb-6">Let AI plan your perfect adventure</p>
            <button className="btn-primary" onClick={() => setShowNew(true)}>
              Plan your first trip
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onClick={() => setActiveTrip(trip)} />
            ))}
          </div>
        )}
      </main>

      {showNew && <NewTripModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
