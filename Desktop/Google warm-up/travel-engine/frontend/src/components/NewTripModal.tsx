"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useTripStore } from "@/lib/store";
import type { Trip } from "@/types";
import { X, Plus, Trash2 } from "lucide-react";
import { trackTripCreated, trackItineraryGenerated } from "@/lib/firebase";

interface Props {
  onClose: () => void;
}

export default function NewTripModal({ onClose }: Props) {
  const { trips, setTrips, setActiveTrip } = useTripStore();

  const [title, setTitle] = useState("");
  const [destinations, setDestinations] = useState([{ city: "", country: "" }]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const addDest = () => setDestinations([...destinations, { city: "", country: "" }]);
  const removeDest = (i: number) => setDestinations(destinations.filter((_, idx) => idx !== i));
  const updateDest = (i: number, field: string, val: string) =>
    setDestinations(destinations.map((d, idx) => (idx === i ? { ...d, [field]: val } : d)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGenerating(true);

    try {
      // 1. Create trip
      const tripData = {
        title,
        destinations: destinations.filter((d) => d.city && d.country),
        start_date: startDate,
        end_date: endDate,
        travelers,
        budget_total: budget ? parseFloat(budget) : null,
        budget_currency: currency,
        notes,
        constraints: [],
      };

      const trip = await api.trips.create(tripData) as Trip;
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
      await trackTripCreated(destinations[0]?.city ?? "Unknown", days, budget ? parseFloat(budget) : undefined);

      // 2. Generate AI itinerary immediately
      const generated = await api.trips.generate({ trip_id: trip.id }) as Trip;
      await trackItineraryGenerated(generated.id, destinations[0]?.city ?? "Unknown");

      setTrips([generated, ...trips]);
      setActiveTrip(generated);
      onClose();
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-trip-title"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 id="new-trip-title" className="text-xl font-bold">Plan a New Trip</h2>
          <button className="btn-ghost p-2" onClick={onClose} disabled={generating}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Trip Title</label>
            <input
              className="input"
              placeholder="e.g. Japan Cherry Blossom Adventure"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Destinations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Destinations</label>
              <button type="button" className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1" onClick={addDest}>
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {destinations.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input"
                    placeholder="City"
                    value={d.city}
                    onChange={(e) => updateDest(i, "city", e.target.value)}
                    required
                  />
                  <input
                    className="input"
                    placeholder="Country"
                    value={d.country}
                    onChange={(e) => updateDest(i, "country", e.target.value)}
                    required
                  />
                  {destinations.length > 1 && (
                    <button type="button" className="text-slate-500 hover:text-red-400 p-2" onClick={() => removeDest(i)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Date</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">End Date</label>
              <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>

          {/* Travelers + Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Travelers</label>
              <input
                type="number"
                min={1}
                max={20}
                className="input"
                value={travelers}
                onChange={(e) => setTravelers(parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Budget (optional)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 3000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                <select
                  className="input w-24"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {["USD", "EUR", "GBP", "INR", "JPY", "AUD"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Special Requests (optional)</label>
            <textarea
              className="input h-20 resize-none"
              placeholder="e.g. Vegetarian meals, no early morning activities, love street food…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {generating && (
            <div className="bg-brand-900/40 border border-brand-700 text-brand-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              AI is crafting your personalized itinerary…
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={generating}>
            {generating ? "Generating…" : "Generate Itinerary with AI"}
          </button>
        </form>
      </div>
    </div>
  );
}
