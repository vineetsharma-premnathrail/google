import { render, screen, fireEvent } from "@testing-library/react";
import TripCard from "@/components/TripCard";
import type { Trip } from "@/types";

const mockTrip: Trip = {
  id: "trip-001",
  user_id: "user-001",
  title: "Paris Adventure",
  status: "draft",
  destinations: [{ city: "Paris", country: "France", lat: 48.8566, lng: 2.3522 }],
  start_date: "2026-07-01",
  end_date: "2026-07-05",
  travelers: 2,
  budget_total: 2000,
  budget_currency: "USD",
  budget_breakdown: { accommodation: 800, food: 400, activities: 500, transport: 300 },
  itinerary: [{ date: "2026-07-01", activities: [], transport: [], estimated_cost: 200, tips: [] }],
  constraints: [],
  real_time_flags: [],
  notes: null,
  created_at: "2026-05-01T10:00:00Z",
  updated_at: "2026-05-01T10:00:00Z",
};

describe("TripCard", () => {
  it("renders trip title", () => {
    render(<TripCard trip={mockTrip} onClick={() => {}} />);
    expect(screen.getByText("Paris Adventure")).toBeInTheDocument();
  });

  it("renders destination", () => {
    render(<TripCard trip={mockTrip} onClick={() => {}} />);
    expect(screen.getByText(/Paris/)).toBeInTheDocument();
  });

  it("shows traveler count", () => {
    render(<TripCard trip={mockTrip} onClick={() => {}} />);
    expect(screen.getByText(/2 traveler/i)).toBeInTheDocument();
  });

  it("shows budget", () => {
    render(<TripCard trip={mockTrip} onClick={() => {}} />);
    expect(screen.getByText(/2,000/)).toBeInTheDocument();
  });

  it("shows status badge", () => {
    render(<TripCard trip={mockTrip} onClick={() => {}} />);
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("shows itinerary day count", () => {
    render(<TripCard trip={mockTrip} onClick={() => {}} />);
    expect(screen.getByText(/1 day/i)).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = jest.fn();
    render(<TripCard trip={mockTrip} onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("shows alert icon when real_time_flags present", () => {
    const tripWithFlags = {
      ...mockTrip,
      real_time_flags: [{ type: "budget_warning", message: "Over budget" }],
    };
    render(<TripCard trip={tripWithFlags} onClick={() => {}} />);
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("renders confirmed status correctly", () => {
    const confirmedTrip = { ...mockTrip, status: "confirmed" as const };
    render(<TripCard trip={confirmedTrip} onClick={() => {}} />);
    expect(screen.getByText("confirmed")).toBeInTheDocument();
  });

  it("handles multi-destination display", () => {
    const multiDest = {
      ...mockTrip,
      destinations: [
        { city: "Paris", country: "France" },
        { city: "Lyon", country: "France" },
      ],
    };
    render(<TripCard trip={multiDest} onClick={() => {}} />);
    expect(screen.getByText(/Paris.*Lyon|Lyon.*Paris/)).toBeInTheDocument();
  });
});
