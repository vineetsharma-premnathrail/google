from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime


class Destination(BaseModel):
    city: str
    country: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class Constraint(BaseModel):
    type: str           # hard | soft
    category: str       # budget, time, accessibility, preference
    description: str
    value: Optional[Any] = None


class Activity(BaseModel):
    id: str
    name: str
    category: str       # sightseeing, food, adventure, culture, transport
    location: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    start_time: str
    end_time: str
    duration_minutes: int
    cost: float = 0.0
    currency: str = "USD"
    booking_url: Optional[str] = None
    notes: Optional[str] = None
    weather_dependent: bool = False


class DayPlan(BaseModel):
    date: str
    theme: Optional[str] = None
    activities: list[Activity] = []
    accommodation: Optional[dict] = None
    transport: list[dict] = []
    estimated_cost: float = 0.0
    tips: list[str] = []


class TripCreate(BaseModel):
    title: str
    destinations: list[Destination]
    start_date: date
    end_date: date
    travelers: int = 1
    budget_total: Optional[float] = None
    budget_currency: str = "USD"
    constraints: list[Constraint] = []
    notes: Optional[str] = None


class TripGenerateRequest(BaseModel):
    trip_id: str
    regenerate: bool = False
    focus: Optional[str] = None     # "budget", "adventure", "food", etc.


class TripOut(BaseModel):
    id: str
    user_id: str
    title: str
    status: str
    destinations: list
    start_date: date
    end_date: date
    travelers: int
    budget_total: Optional[float]
    budget_currency: str
    budget_breakdown: dict
    itinerary: list
    constraints: list
    real_time_flags: list
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    trip_id: str
    message: str
