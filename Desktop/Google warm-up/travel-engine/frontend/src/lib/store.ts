import { create } from "zustand";
import type { Trip, User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    set({ user, token });
  },
  clearAuth: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
}));

interface TripState {
  trips: Trip[];
  activeTrip: Trip | null;
  setTrips: (trips: Trip[]) => void;
  setActiveTrip: (trip: Trip | null) => void;
  updateTrip: (trip: Trip) => void;
  alerts: { tripId: string; event: string; data: unknown }[];
  addAlert: (tripId: string, event: string, data: unknown) => void;
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  activeTrip: null,
  alerts: [],
  setTrips: (trips) => set({ trips }),
  setActiveTrip: (trip) => set({ activeTrip: trip }),
  updateTrip: (trip) =>
    set((s) => ({
      trips: s.trips.map((t) => (t.id === trip.id ? trip : t)),
      activeTrip: s.activeTrip?.id === trip.id ? trip : s.activeTrip,
    })),
  addAlert: (tripId, event, data) =>
    set((s) => ({ alerts: [...s.alerts.slice(-49), { tripId, event, data }] })),
}));
