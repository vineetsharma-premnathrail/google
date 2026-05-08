import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient


MOCK_AI_RESULT = {
    "itinerary": [
        {
            "date": "2026-07-01",
            "theme": "Arrival & Explore",
            "activities": [
                {
                    "id": "act-001",
                    "name": "Eiffel Tower Visit",
                    "category": "sightseeing",
                    "location": "Champ de Mars, Paris",
                    "lat": 48.8584,
                    "lng": 2.2945,
                    "start_time": "10:00",
                    "end_time": "12:00",
                    "duration_minutes": 120,
                    "cost": 25.0,
                    "currency": "USD",
                    "notes": "Book tickets in advance",
                    "weather_dependent": False,
                },
                {
                    "id": "act-002",
                    "name": "Lunch at Le Marais",
                    "category": "food",
                    "location": "Le Marais, Paris",
                    "lat": 48.8566,
                    "lng": 2.3522,
                    "start_time": "12:30",
                    "end_time": "14:00",
                    "duration_minutes": 90,
                    "cost": 30.0,
                    "currency": "USD",
                    "notes": "Try crêpes",
                    "weather_dependent": False,
                },
            ],
            "accommodation": {
                "name": "Hotel de Paris",
                "address": "1 Rue de Rivoli",
                "cost_per_night": 120,
                "currency": "USD",
                "type": "hotel",
            },
            "transport": [],
            "estimated_cost": 175.0,
            "tips": ["Buy metro day pass", "Visit at night for lights"],
        }
    ],
    "budget_breakdown": {
        "accommodation": 120,
        "activities": 55,
        "food": 60,
        "transport": 20,
        "total": 255,
        "currency": "USD",
    },
    "trip_highlights": ["Eiffel Tower at night"],
    "packing_suggestions": ["Comfortable shoes"],
    "visa_notes": "Schengen visa required",
}


@pytest.mark.asyncio
async def test_create_trip(client: AsyncClient, auth_headers: dict):
    with patch("app.services.google_maps.geocode", new_callable=AsyncMock) as mock_geo:
        mock_geo.return_value = {"lat": 48.8566, "lng": 2.3522, "formatted": "Paris, France"}
        resp = await client.post("/api/trips/", json={
            "title": "Paris Dream Trip",
            "destinations": [{"city": "Paris", "country": "France"}],
            "start_date": "2026-07-01",
            "end_date": "2026-07-05",
            "travelers": 2,
            "budget_total": 2000,
            "budget_currency": "USD",
            "constraints": [],
        }, headers=auth_headers)

    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Paris Dream Trip"
    assert data["status"] == "draft"
    assert data["travelers"] == 2
    assert data["budget_total"] == 2000
    return data["id"]


@pytest.mark.asyncio
async def test_list_trips_empty_for_new_user(client: AsyncClient):
    # Register a fresh user
    reg = await client.post("/api/auth/register", json={
        "email": "freshtrips@travel.com",
        "password": "pass123",
    })
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    resp = await client.get("/api/trips/", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_trips_returns_created(client: AsyncClient, auth_headers: dict):
    with patch("app.services.google_maps.geocode", new_callable=AsyncMock) as mock_geo:
        mock_geo.return_value = None
        await client.post("/api/trips/", json={
            "title": "Listed Trip",
            "destinations": [{"city": "Tokyo", "country": "Japan"}],
            "start_date": "2026-08-01",
            "end_date": "2026-08-07",
            "travelers": 1,
            "constraints": [],
        }, headers=auth_headers)

    resp = await client.get("/api/trips/", headers=auth_headers)
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert "Listed Trip" in titles


@pytest.mark.asyncio
async def test_generate_itinerary(client: AsyncClient, auth_headers: dict):
    with patch("app.services.google_maps.geocode", new_callable=AsyncMock) as mock_geo:
        mock_geo.return_value = {"lat": 48.8566, "lng": 2.3522, "formatted": "Paris, France"}
        create_resp = await client.post("/api/trips/", json={
            "title": "Generated Trip",
            "destinations": [{"city": "Paris", "country": "France"}],
            "start_date": "2026-07-01",
            "end_date": "2026-07-01",
            "travelers": 1,
            "constraints": [],
        }, headers=auth_headers)

    trip_id = create_resp.json()["id"]

    with patch("app.services.ai_planner.AIPlanner.generate_itinerary", new_callable=AsyncMock) as mock_ai, \
         patch("app.services.google_maps.enrich_activities_with_places", new_callable=AsyncMock) as mock_enrich, \
         patch("app.services.google_maps.get_route_for_day", new_callable=AsyncMock) as mock_route, \
         patch("app.services.google_maps.geocode", new_callable=AsyncMock) as mock_geo:

        mock_ai.return_value = MOCK_AI_RESULT
        mock_enrich.side_effect = lambda activities, *a, **kw: activities
        mock_route.return_value = None
        mock_geo.return_value = {"lat": 48.8566, "lng": 2.3522, "formatted": "Paris, France"}

        resp = await client.post("/api/trips/generate", json={
            "trip_id": trip_id,
        }, headers=auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["itinerary"]) == 1
    assert data["itinerary"][0]["date"] == "2026-07-01"
    assert len(data["itinerary"][0]["activities"]) == 2
    assert data["budget_breakdown"]["total"] == 255


@pytest.mark.asyncio
async def test_generate_requires_auth(client: AsyncClient):
    resp = await client.post("/api/trips/generate", json={"trip_id": "fake"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_trip_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/trips/nonexistent-id", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_status(client: AsyncClient, auth_headers: dict):
    with patch("app.services.google_maps.geocode", new_callable=AsyncMock) as mock_geo:
        mock_geo.return_value = None
        create_resp = await client.post("/api/trips/", json={
            "title": "Status Trip",
            "destinations": [{"city": "Rome", "country": "Italy"}],
            "start_date": "2026-09-01",
            "end_date": "2026-09-03",
            "travelers": 1,
            "constraints": [],
        }, headers=auth_headers)

    trip_id = create_resp.json()["id"]
    resp = await client.patch(f"/api/trips/{trip_id}/status?status=confirmed", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "confirmed"


@pytest.mark.asyncio
async def test_update_status_invalid(client: AsyncClient, auth_headers: dict):
    with patch("app.services.google_maps.geocode", new_callable=AsyncMock) as mock_geo:
        mock_geo.return_value = None
        create_resp = await client.post("/api/trips/", json={
            "title": "Status Trip 2",
            "destinations": [{"city": "Berlin", "country": "Germany"}],
            "start_date": "2026-10-01",
            "end_date": "2026-10-03",
            "travelers": 1,
            "constraints": [],
        }, headers=auth_headers)

    trip_id = create_resp.json()["id"]
    resp = await client.patch(f"/api/trips/{trip_id}/status?status=flying", headers=auth_headers)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_delete_trip(client: AsyncClient, auth_headers: dict):
    with patch("app.services.google_maps.geocode", new_callable=AsyncMock) as mock_geo:
        mock_geo.return_value = None
        create_resp = await client.post("/api/trips/", json={
            "title": "Delete Me",
            "destinations": [{"city": "Madrid", "country": "Spain"}],
            "start_date": "2026-11-01",
            "end_date": "2026-11-02",
            "travelers": 1,
            "constraints": [],
        }, headers=auth_headers)

    trip_id = create_resp.json()["id"]
    del_resp = await client.delete(f"/api/trips/{trip_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    get_resp = await client.get(f"/api/trips/{trip_id}", headers=auth_headers)
    assert get_resp.status_code == 404
