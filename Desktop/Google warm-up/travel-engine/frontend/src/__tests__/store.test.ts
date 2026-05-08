import { act } from "react";
import type { Trip, User } from "@/types";

const mockUser: User = {
  id: "user-001",
  email: "test@test.com",
  full_name: "Test User",
  preferences: { travel_style: [], pace: "moderate", interests: [], dietary: [], accessibility: [], avoid: [] },
  created_at: "2026-01-01T00:00:00Z",
};

const mockTrip: Trip = {
  id: "trip-001",
  user_id: "user-001",
  title: "Test Trip",
  status: "draft",
  destinations: [{ city: "London", country: "UK" }],
  start_date: "2026-06-01",
  end_date: "2026-06-05",
  travelers: 1,
  budget_currency: "USD",
  budget_breakdown: {},
  itinerary: [],
  constraints: [],
  real_time_flags: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("Auth Store", () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
  });

  it("starts with no user", async () => {
    const { useAuthStore } = await import("@/lib/store");
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it("sets auth and saves token to localStorage", async () => {
    const { useAuthStore } = await import("@/lib/store");
    act(() => useAuthStore.getState().setAuth(mockUser, "jwt-token-123"));
    expect(useAuthStore.getState().user?.email).toBe("test@test.com");
    expect(localStorage.getItem("token")).toBe("jwt-token-123");
  });

  it("clears auth and removes token from localStorage", async () => {
    const { useAuthStore } = await import("@/lib/store");
    act(() => useAuthStore.getState().setAuth(mockUser, "jwt-token-123"));
    act(() => useAuthStore.getState().clearAuth());
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("Trip Store", () => {
  beforeEach(() => jest.resetModules());

  it("starts with empty trips", async () => {
    const { useTripStore } = await import("@/lib/store");
    expect(useTripStore.getState().trips).toEqual([]);
  });

  it("sets trips list", async () => {
    const { useTripStore } = await import("@/lib/store");
    act(() => useTripStore.getState().setTrips([mockTrip]));
    expect(useTripStore.getState().trips).toHaveLength(1);
    expect(useTripStore.getState().trips[0].id).toBe("trip-001");
  });

  it("updates a specific trip", async () => {
    const { useTripStore } = await import("@/lib/store");
    act(() => useTripStore.getState().setTrips([mockTrip]));
    const updated = { ...mockTrip, status: "confirmed" as const };
    act(() => useTripStore.getState().updateTrip(updated));
    expect(useTripStore.getState().trips[0].status).toBe("confirmed");
  });

  it("adds alerts up to 50", async () => {
    const { useTripStore } = await import("@/lib/store");
    for (let i = 0; i < 55; i++) {
      act(() => useTripStore.getState().addAlert("trip-001", "weather_alert", { msg: i }));
    }
    expect(useTripStore.getState().alerts.length).toBeLessThanOrEqual(50);
  });

  it("sets active trip", async () => {
    const { useTripStore } = await import("@/lib/store");
    act(() => useTripStore.getState().setActiveTrip(mockTrip));
    expect(useTripStore.getState().activeTrip?.id).toBe("trip-001");
  });

  it("clears active trip", async () => {
    const { useTripStore } = await import("@/lib/store");
    act(() => useTripStore.getState().setActiveTrip(mockTrip));
    act(() => useTripStore.getState().setActiveTrip(null));
    expect(useTripStore.getState().activeTrip).toBeNull();
  });
});
