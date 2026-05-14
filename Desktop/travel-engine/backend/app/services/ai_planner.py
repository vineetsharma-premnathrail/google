import json
import uuid
from typing import Optional
import google.generativeai as genai
from app.core.config import get_settings

settings = get_settings()

SYSTEM_PROMPT = """You are an expert travel planner with decades of experience crafting personalized itineraries.
Your job is to generate detailed, realistic, day-by-day travel itineraries in strict JSON format.

Rules:
- Always respect hard constraints (budget caps, visa, accessibility, dietary).
- Prefer local hidden gems over tourist traps when travel_style includes "cultural" or "adventure".
- Balance activities: mix sightseeing, food, rest, and transport realistically.
- Allocate travel time between locations (15-60 min gaps as needed).
- Keep daily costs within per-day budget if provided.
- Return ONLY valid JSON — no markdown, no explanation outside JSON.

Output schema (strict):
{
  "itinerary": [
    {
      "date": "YYYY-MM-DD",
      "theme": "string (optional day theme)",
      "activities": [
        {
          "id": "uuid",
          "name": "string",
          "category": "sightseeing|food|adventure|culture|transport|rest",
          "location": "string",
          "lat": number,
          "lng": number,
          "start_time": "HH:MM",
          "end_time": "HH:MM",
          "duration_minutes": number,
          "cost": number,
          "currency": "USD",
          "booking_url": null,
          "notes": "string",
          "weather_dependent": boolean
        }
      ],
      "accommodation": {
        "name": "string",
        "address": "string",
        "cost_per_night": number,
        "currency": "USD",
        "type": "hotel|hostel|airbnb|resort"
      },
      "transport": [
        {
          "from": "string",
          "to": "string",
          "mode": "walk|taxi|metro|bus|flight|train",
          "duration_minutes": number,
          "cost": number
        }
      ],
      "estimated_cost": number,
      "tips": ["string"]
    }
  ],
  "budget_breakdown": {
    "accommodation": number,
    "activities": number,
    "food": number,
    "transport": number,
    "total": number,
    "currency": "USD"
  },
  "trip_highlights": ["string"],
  "packing_suggestions": ["string"],
  "visa_notes": "string"
}"""


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


class AIPlanner:
    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )

    async def generate_itinerary(
        self,
        destinations: list[dict],
        start_date: str,
        end_date: str,
        travelers: int,
        budget_total: Optional[float],
        budget_currency: str,
        preferences: dict,
        constraints: list[dict],
        notes: Optional[str] = None,
        focus: Optional[str] = None,
    ) -> dict:
        prompt = self._build_prompt(
            destinations, start_date, end_date, travelers,
            budget_total, budget_currency, preferences, constraints, notes, focus
        )
        response = self.model.generate_content(prompt)
        return json.loads(_strip_fences(response.text))

    async def refine_with_chat(
        self,
        current_itinerary: list[dict],
        user_message: str,
        preferences: dict,
        trip_context: dict,
        conversation_history: list[dict],  # noqa: ARG002
    ) -> dict:
        history_ctx = ""
        if conversation_history:
            history_ctx = f"\nPrevious conversation:\n{json.dumps(conversation_history[-4:], indent=2)}\n"
        prompt = f"""Current itinerary: {json.dumps(current_itinerary, indent=2)}{history_ctx}

Trip context: {json.dumps(trip_context)}
User preferences: {json.dumps(preferences)}

User request: {user_message}

Apply the user's requested changes and return the full updated itinerary in the same JSON schema."""
        response = self.model.generate_content(prompt)
        return json.loads(_strip_fences(response.text))

    async def handle_disruption(
        self,
        current_itinerary: list[dict],
        disruption: dict,
        preferences: dict,
    ) -> dict:
        prompt = f"""A disruption has occurred that requires replanning:

Disruption: {json.dumps(disruption)}
Affected dates: {disruption.get('affected_dates', [])}
Current itinerary: {json.dumps(current_itinerary, indent=2)}
User preferences: {json.dumps(preferences)}

Replan ONLY the affected days. Keep all other days unchanged.
Return the complete updated itinerary JSON."""
        response = self.model.generate_content(prompt)
        return json.loads(_strip_fences(response.text))

    def _build_prompt(
        self,
        destinations, start_date, end_date, travelers,
        budget_total, budget_currency, preferences, constraints, notes, focus
    ) -> str:
        dest_str = ", ".join(f"{d['city']}, {d['country']}" for d in destinations)
        budget_str = f"${budget_total:,.0f} {budget_currency} total" if budget_total else "no strict budget limit"
        hard = [c for c in constraints if c.get("type") == "hard"]
        soft = [c for c in constraints if c.get("type") == "soft"]

        return f"""Plan a trip with these details:

Destination(s): {dest_str}
Dates: {start_date} → {end_date}
Travelers: {travelers}
Budget: {budget_str}

Traveler Profile:
- Travel style: {', '.join(preferences.get('travel_style', ['balanced']))}
- Pace: {preferences.get('pace', 'moderate')}
- Interests: {', '.join(preferences.get('interests', []))}
- Dietary requirements: {', '.join(preferences.get('dietary', []))}
- Accessibility needs: {', '.join(preferences.get('accessibility', []))}
- Things to avoid: {', '.join(preferences.get('avoid', []))}

Hard constraints (must follow): {json.dumps(hard)}
Soft preferences (best effort): {json.dumps(soft)}

{f'Special focus for this trip: {focus}' if focus else ''}
{f'Additional notes: {notes}' if notes else ''}

Generate a complete day-by-day itinerary. Assign a unique uuid to each activity id."""
