"use client";

import type { Trip } from "@/types";
import { MapPin, Calendar, Users, DollarSign, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-700 text-slate-300",
  confirmed: "bg-blue-900/60 text-blue-300",
  active:    "bg-green-900/60 text-green-300",
  completed: "bg-slate-700 text-slate-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft:     "Draft",
  confirmed: "Confirmed",
  active:    "Active",
  completed: "Completed",
};

export default function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const nights = differenceInDays(new Date(trip.end_date), new Date(trip.start_date));
  const destStr = trip.destinations.map((d) => d.city).join(" → ");
  const hasAlerts = trip.real_time_flags.length > 0;

  return (
    <article>
      <button
        onClick={onClick}
        className="card text-left w-full hover:border-brand-600 hover:shadow-lg hover:shadow-brand-900/20 transition-all bg-gradient-to-br from-slate-800 to-slate-900"
        aria-label={`View trip: ${trip.title}, ${destStr}, ${format(new Date(trip.start_date), "MMM d")} to ${format(new Date(trip.end_date), "MMM d yyyy")}, status: ${STATUS_LABELS[trip.status]}`}
      >
        {/* Status row */}
        <div className="flex items-start justify-between mb-3">
          <span
            className={`badge ${STATUS_COLORS[trip.status]}`}
            role="status"
            aria-label={`Status: ${STATUS_LABELS[trip.status]}`}
          >
            {trip.status}
          </span>
          {hasAlerts && (
            <AlertTriangle
              className="w-4 h-4 text-amber-400 flex-shrink-0"
              aria-label="Has alerts"
              role="img"
            />
          )}
        </div>

        <h3 className="font-bold text-lg mb-1 line-clamp-1">{trip.title}</h3>

        <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-4">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">{destStr}</span>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <dt className="sr-only">Dates</dt>
            <dd>{format(new Date(trip.start_date), "MMM d")} · {nights}n</dd>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Users className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <dt className="sr-only">Travelers</dt>
            <dd>{trip.travelers} traveler{trip.travelers > 1 ? "s" : ""}</dd>
          </div>
          {trip.budget_total && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <dt className="sr-only">Budget</dt>
              <dd>${trip.budget_total.toLocaleString()} {trip.budget_currency}</dd>
            </div>
          )}
          {trip.itinerary.length > 0 && (
            <div className="text-brand-400 font-medium">
              <dt className="sr-only">Days planned</dt>
              <dd>{trip.itinerary.length} day{trip.itinerary.length > 1 ? "s" : ""} planned</dd>
            </div>
          )}
        </dl>
      </button>
    </article>
  );
}
