import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Date, JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft|confirmed|active|completed

    # Destinations stored as JSON list: [{ city, country, lat, lng }]
    destinations: Mapped[list] = mapped_column(JSON, default=list)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    travelers: Mapped[int] = mapped_column(Integer, default=1)

    budget_total: Mapped[float] = mapped_column(Float, nullable=True)
    budget_currency: Mapped[str] = mapped_column(String, default="USD")
    budget_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)

    # Full day-by-day itinerary as JSON
    itinerary: Mapped[list] = mapped_column(JSON, default=list)

    # User constraints: hard + soft
    constraints: Mapped[list] = mapped_column(JSON, default=list)

    # Live alerts from real-time monitoring
    real_time_flags: Mapped[list] = mapped_column(JSON, default=list)

    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
