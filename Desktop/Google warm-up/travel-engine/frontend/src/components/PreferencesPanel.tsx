"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useTripStore, useAuthStore } from "@/lib/store";
import type { Trip } from "@/types";
import { Settings, X, RefreshCw } from "lucide-react";

const TRAVEL_STYLES = ["adventure", "luxury", "budget", "cultural", "relaxed", "family", "solo", "romantic"];
const INTERESTS = ["museums", "food", "hiking", "beaches", "nightlife", "shopping", "history", "art", "wildlife", "photography"];
const DIETARY = ["vegetarian", "vegan", "halal", "kosher", "gluten-free", "no restrictions"];
const PACE_OPTIONS = ["relaxed", "moderate", "packed"];
const AVOID = ["crowds", "tourist traps", "extreme heat", "late nights", "long walks", "flights of stairs"];

interface Props {
  trip: Trip;
  onClose: () => void;
  onRegenerate: () => void;
}

export default function PreferencesPanel({ trip, onClose, onRegenerate }: Props) {
  const { user } = useAuthStore();
  const { updateTrip } = useTripStore();

  const prefs = (user?.preferences ?? {}) as Record<string, any>;
  const [style, setStyle] = useState<string[]>(prefs["travel_style"] ?? []);
  const [pace, setPace] = useState<string>(prefs["pace"] ?? "moderate");
  const [interests, setInterests] = useState<string[]>(prefs["interests"] ?? []);
  const [dietary, setDietary] = useState<string[]>(prefs["dietary"] ?? []);
  const [avoid, setAvoid] = useState<string[]>(prefs["avoid"] ?? []);
  const [budget, setBudget] = useState(trip.budget_total?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const Chip = ({
    label, active, onClick,
  }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
        active
          ? "bg-brand-600 border-brand-500 text-white"
          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-brand-600"
      }`}
    >
      {label}
    </button>
  );

  const save = async (andRegenerate = false) => {
    setSaving(true);
    try {
      await api.trips.updatePreferences(trip.id, {
        preferences: { travel_style: style, pace, interests, dietary, avoid },
        constraints: budget
          ? [{ type: "hard", category: "budget", description: "Max budget", value: parseFloat(budget) }]
          : trip.constraints,
      });
      if (andRegenerate) {
        onClose();
        onRegenerate();
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-400" />
            <h2 className="font-bold text-lg">Preferences & Constraints</h2>
          </div>
          <button className="btn-ghost p-2" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Travel style */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Travel Style</label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map((s) => (
                <Chip key={s} label={s} active={style.includes(s)} onClick={() => toggle(style, s, setStyle)} />
              ))}
            </div>
          </div>

          {/* Pace */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Trip Pace</label>
            <div className="flex gap-3">
              {PACE_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPace(p)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                    pace === p
                      ? "bg-brand-600 border-brand-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-brand-600"
                  }`}
                >
                  {p === "relaxed" ? "🧘 Relaxed" : p === "moderate" ? "🚶 Moderate" : "⚡ Packed"}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip key={i} label={i} active={interests.includes(i)} onClick={() => toggle(interests, i, setInterests)} />
              ))}
            </div>
          </div>

          {/* Dietary */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Dietary Requirements</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY.map((d) => (
                <Chip key={d} label={d} active={dietary.includes(d)} onClick={() => toggle(dietary, d, setDietary)} />
              ))}
            </div>
          </div>

          {/* Avoid */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Things to Avoid</label>
            <div className="flex flex-wrap gap-2">
              {AVOID.map((a) => (
                <Chip key={a} label={a} active={avoid.includes(a)} onClick={() => toggle(avoid, a, setAvoid)} />
              ))}
            </div>
          </div>

          {/* Budget constraint */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Budget Cap (hard constraint)</label>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">$</span>
              <input
                type="number"
                className="input max-w-xs"
                placeholder={trip.budget_total?.toString() ?? "No limit"}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <span className="text-slate-400 text-sm">{trip.budget_currency}</span>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-800 flex gap-3">
          <button className="btn-ghost flex-1" onClick={() => save(false)} disabled={saving}>
            Save Only
          </button>
          <button
            className="btn-primary flex-1 flex items-center justify-center gap-2"
            onClick={() => save(true)}
            disabled={saving}
          >
            <RefreshCw className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
            Save & Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
