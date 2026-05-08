export interface Destination {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface Constraint {
  type: "hard" | "soft";
  category: string;
  description: string;
  value?: unknown;
}

export interface Activity {
  id: string;
  name: string;
  category: "sightseeing" | "food" | "adventure" | "culture" | "transport" | "rest";
  location: string;
  lat?: number;
  lng?: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  cost: number;
  currency: string;
  booking_url?: string;
  notes?: string;
  weather_dependent: boolean;
}

export interface DayPlan {
  date: string;
  theme?: string;
  activities: Activity[];
  accommodation?: {
    name: string;
    address: string;
    cost_per_night: number;
    currency: string;
    type: string;
  };
  transport: {
    from: string;
    to: string;
    mode: string;
    duration_minutes: number;
    cost: number;
  }[];
  estimated_cost: number;
  tips: string[];
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  status: "draft" | "confirmed" | "active" | "completed";
  destinations: Destination[];
  start_date: string;
  end_date: string;
  travelers: number;
  budget_total?: number;
  budget_currency: string;
  budget_breakdown: Record<string, number>;
  itinerary: DayPlan[];
  constraints: Constraint[];
  real_time_flags: { type: string; message: string }[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  preferences: {
    travel_style: string[];
    pace: string;
    interests: string[];
    dietary: string[];
    accessibility: string[];
    avoid: string[];
    budget_range?: string;
  };
  created_at: string;
}
