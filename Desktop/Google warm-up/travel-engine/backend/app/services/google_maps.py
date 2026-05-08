"""
Google Maps service: Places search, Directions (real travel times), Geocoding.
"""
import httpx
from typing import Optional
from app.core.config import get_settings

settings = get_settings()
MAPS_BASE = "https://maps.googleapis.com/maps/api"


async def geocode(address: str) -> Optional[dict]:
    """Return lat/lng for a city or address string."""
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{MAPS_BASE}/geocode/json", params={
            "address": address,
            "key": settings.google_maps_api_key,
        })
        data = r.json()
        if data.get("status") == "OK":
            loc = data["results"][0]["geometry"]["location"]
            return {"lat": loc["lat"], "lng": loc["lng"],
                    "formatted": data["results"][0]["formatted_address"]}
    return None


async def search_places(
    query: str,
    lat: float,
    lng: float,
    radius_m: int = 5000,
    place_type: Optional[str] = None,
) -> list[dict]:
    """
    Nearby places search via Places API.
    Returns list of {name, address, lat, lng, rating, place_id, photo_ref}.
    """
    params = {
        "location": f"{lat},{lng}",
        "radius": radius_m,
        "keyword": query,
        "key": settings.google_maps_api_key,
    }
    if place_type:
        params["type"] = place_type

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{MAPS_BASE}/place/nearbysearch/json", params=params)
        data = r.json()

    results = []
    for p in data.get("results", [])[:10]:
        loc = p["geometry"]["location"]
        results.append({
            "name": p.get("name"),
            "address": p.get("vicinity"),
            "lat": loc["lat"],
            "lng": loc["lng"],
            "rating": p.get("rating"),
            "user_ratings_total": p.get("user_ratings_total", 0),
            "place_id": p.get("place_id"),
            "types": p.get("types", []),
            "photo_ref": (p.get("photos") or [{}])[0].get("photo_reference"),
            "open_now": p.get("opening_hours", {}).get("open_now"),
            "price_level": p.get("price_level"),
        })
    return results


async def get_directions(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str = "walking",
    waypoints: Optional[list[dict]] = None,
) -> Optional[dict]:
    """
    Get directions between two points.
    Returns {distance_m, duration_sec, polyline, steps}.
    """
    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "mode": mode,
        "key": settings.google_maps_api_key,
    }
    if waypoints:
        wp_str = "|".join(f"{w['lat']},{w['lng']}" for w in waypoints)
        params["waypoints"] = wp_str

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{MAPS_BASE}/directions/json", params=params)
        data = r.json()

    if data.get("status") != "OK" or not data.get("routes"):
        return None

    route = data["routes"][0]
    leg = route["legs"][0]
    return {
        "distance_m": leg["distance"]["value"],
        "distance_text": leg["distance"]["text"],
        "duration_sec": leg["duration"]["value"],
        "duration_text": leg["duration"]["text"],
        "polyline": route["overview_polyline"]["points"],
        "steps": [
            {
                "instruction": s["html_instructions"],
                "distance_m": s["distance"]["value"],
                "duration_sec": s["duration"]["value"],
                "travel_mode": s.get("travel_mode"),
            }
            for s in leg.get("steps", [])
        ],
    }


async def get_route_for_day(activities: list[dict]) -> Optional[dict]:
    """Build a full-day route through all activity locations."""
    located = [a for a in activities if a.get("lat") and a.get("lng")]
    if len(located) < 2:
        return None

    origin = located[0]
    dest = located[-1]
    waypoints = located[1:-1] if len(located) > 2 else None

    directions = await get_directions(
        origin["lat"], origin["lng"],
        dest["lat"], dest["lng"],
        mode="walking",
        waypoints=waypoints,
    )
    if not directions:
        return None

    return {
        "polyline": directions["polyline"],
        "total_distance_text": directions["distance_text"],
        "total_duration_text": directions["duration_text"],
        "steps": directions["steps"],
    }


async def enrich_activities_with_places(
    activities: list[dict],
    city_lat: float,
    city_lng: float,
) -> list[dict]:
    """
    For each activity missing lat/lng, look it up via Places API.
    Also fetch real ratings and open status.
    """
    enriched = []
    for act in activities:
        if act.get("lat") and act.get("lng"):
            enriched.append(act)
            continue

        places = await search_places(
            query=act.get("name", act.get("location", "")),
            lat=city_lat,
            lng=city_lng,
            radius_m=10000,
        )
        if places:
            p = places[0]
            act = {
                **act,
                "lat": p["lat"],
                "lng": p["lng"],
                "rating": p.get("rating"),
                "place_id": p.get("place_id"),
                "open_now": p.get("open_now"),
            }
        enriched.append(act)
    return enriched
