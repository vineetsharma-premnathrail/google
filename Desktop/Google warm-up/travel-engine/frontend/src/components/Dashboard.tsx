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

  const tripAlerts = alerts.length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Accessible navigation landmark */}
      <header role="banner">
        <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between" aria-label="Main navigation">
          <div className="flex items-center gap-3" role="heading" aria-level={1}>
            <Plane className="w-6 h-6 text-brand-500" aria-hidden="true" />
            <span className="font-bold text-lg">Travel Engine</span>
          </div>

          <div className="flex items-center gap-3" role="toolbar" aria-label="User controls">
            {tripAlerts > 0 && (
              <button
                aria-label={`${tripAlerts} active alert${tripAlerts > 1 ? "s" : ""}`}
                className="relative p-1"
              >
                <Bell className="w-5 h-5 text-amber-400" aria-hidden="true" />
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-xs flex items-center justify-center text-black font-bold"
                  aria-hidden="true"
                >
                  {tripAlerts}
                </span>
              </button>
            )}
            <span className="text-slate-400 text-sm hidden sm:block" aria-label="Logged in as">
              {user?.full_name ?? user?.email}
            </span>
            <button className="btn-ghost" onClick={clearAuth} aria-label="Sign out">
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        </nav>
      </header>

      <main id="main-content" role="main">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-bold mb-1">
                {user?.full_name ? `Hey, ${user.full_name.split(" ")[0]}` : "My Trips"}
              </h2>
              <p className="text-slate-400" aria-live="polite">
                {loading
                  ? "Loading your trips…"
                  : trips.length === 0
                  ? "Create your first AI-powered trip"
                  : `${trips.length} trip${trips.length > 1 ? "s" : ""} planned`}
              </p>
            </div>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setShowNew(true)}
              aria-label="Create a new trip"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              New Trip
            </button>
          </div>

          {/* Stats strip */}
          {trips.length > 0 && (
            <section aria-label="Trip statistics" className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {[
                { label: "Total Trips", value: trips.length },
                { label: "Destinations", value: new Set(trips.flatMap((t) => t.destinations.map((d) => d.city))).size },
                { label: "Active", value: trips.filter((t) => t.status === "active").length },
                { label: "Completed", value: trips.filter((t) => t.status === "completed").length },
              ].map((s) => (
                <div key={s.label} className="card text-center" role="figure" aria-label={`${s.label}: ${s.value}`}>
                  <div className="text-2xl font-bold text-brand-400" aria-hidden="true">{s.value}</div>
                  <div className="text-sm text-slate-400 mt-1">{s.label}</div>
                </div>
              ))}
            </section>
          )}

          {/* Trips grid */}
          <section aria-label="Your trips" aria-live="polite" aria-busy={loading}>
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="Loading trips">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card h-48 animate-pulse bg-slate-800" aria-hidden="true" />
                ))}
              </div>
            ) : trips.length === 0 ? (
              <div className="card text-center py-20">
                <Map className="w-12 h-12 text-slate-600 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl font-semibold mb-2">No trips yet</h3>
                <p className="text-slate-400 mb-6">Let AI plan your perfect adventure</p>
                <button className="btn-primary" onClick={() => setShowNew(true)}>
                  Plan your first trip
                </button>
              </div>
            ) : (
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
                {trips.map((trip) => (
                  <li key={trip.id} role="listitem">
                    <TripCard trip={trip} onClick={() => setActiveTrip(trip)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      {showNew && (
        <NewTripModal onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}
