"""
Real-time update service: weather, price alerts, disruption detection.
Uses background tasks + WebSocket push to connected clients.
"""
import asyncio
import json
import httpx
from typing import Optional
from app.core.config import get_settings

settings = get_settings()

# Active WebSocket connections: trip_id -> set of websockets
active_connections: dict[str, set] = {}


async def connect(trip_id: str, websocket):
    if trip_id not in active_connections:
        active_connections[trip_id] = set()
    active_connections[trip_id].add(websocket)


async def disconnect(trip_id: str, websocket):
    if trip_id in active_connections:
        active_connections[trip_id].discard(websocket)


async def broadcast(trip_id: str, event: dict):
    """Push an event to all clients watching this trip."""
    if trip_id not in active_connections:
        return
    dead = set()
    for ws in active_connections[trip_id]:
        try:
            await ws.send_text(json.dumps(event))
        except Exception:
            dead.add(ws)
    active_connections[trip_id] -= dead


async def fetch_weather(city: str, date_str: str) -> Optional[dict]:
    if not settings.openweather_api_key:
        return None
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {"q": city, "appid": settings.openweather_api_key, "units": "metric"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                # Find forecast closest to target date
                for item in data.get("list", []):
                    if date_str in item.get("dt_txt", ""):
                        return {
                            "temp": item["main"]["temp"],
                            "description": item["weather"][0]["description"],
                            "rain_probability": item.get("pop", 0) * 100,
                        }
    except Exception:
        pass
    return None


async def monitor_trip_weather(trip_id: str, itinerary: list[dict], destinations: list[dict]):
    """Background coroutine — checks weather for each day and pushes alerts."""
    alerts = []
    primary_city = destinations[0]["city"] if destinations else "London"

    for day in itinerary:
        weather = await fetch_weather(primary_city, day["date"])
        if weather and weather.get("rain_probability", 0) > 70:
            # Flag weather-dependent activities
            affected = [
                a["name"] for a in day.get("activities", [])
                if a.get("weather_dependent")
            ]
            if affected:
                alert = {
                    "type": "weather_alert",
                    "date": day["date"],
                    "weather": weather,
                    "affected_activities": affected,
                    "suggestion": "Consider rescheduling outdoor activities or swapping for indoor alternatives.",
                }
                alerts.append(alert)
                await broadcast(trip_id, {"event": "weather_alert", "data": alert})

    return alerts


async def check_price_drop(origin: str, destination: str, date_str: str) -> Optional[dict]:
    """Placeholder — real implementation calls Amadeus flight search API."""
    return None


def build_disruption_event(disruption_type: str, affected_dates: list[str], details: str) -> dict:
    return {
        "type": disruption_type,
        "affected_dates": affected_dates,
        "details": details,
        "action_required": True,
    }
