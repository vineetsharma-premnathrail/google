from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class PreferenceProfile(BaseModel):
    travel_style: list[str] = []        # adventure, luxury, budget, cultural
    pace: str = "moderate"              # relaxed, moderate, packed
    interests: list[str] = []
    dietary: list[str] = []
    accessibility: list[str] = []
    avoid: list[str] = []
    budget_range: Optional[str] = None  # budget, mid-range, luxury


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    preferences: Optional[PreferenceProfile] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    preferences: dict
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
