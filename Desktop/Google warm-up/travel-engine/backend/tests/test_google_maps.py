import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_geocode_success():
    from app.services.google_maps import geocode
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "status": "OK",
        "results": [{
            "geometry": {"location": {"lat": 48.8566, "lng": 2.3522}},
            "formatted_address": "Paris, France",
        }]
    }
    with patch("httpx.AsyncClient") as MockClient:
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response
        MockClient.return_value = mock_client

        result = await geocode("Paris, France")

    assert result["lat"] == 48.8566
    assert result["lng"] == 2.3522


@pytest.mark.asyncio
async def test_geocode_no_results():
    from app.services.google_maps import geocode
    mock_response = MagicMock()
    mock_response.json.return_value = {"status": "ZERO_RESULTS", "results": []}
    with patch("httpx.AsyncClient") as MockClient:
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response
        MockClient.return_value = mock_client

        result = await geocode("Nonexistent Place XYZ")

    assert result is None


@pytest.mark.asyncio
async def test_get_directions_success():
    from app.services.google_maps import get_directions
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "status": "OK",
        "routes": [{
            "overview_polyline": {"points": "encoded_polyline_string"},
            "legs": [{
                "distance": {"value": 1500, "text": "1.5 km"},
                "duration": {"value": 1200, "text": "20 mins"},
                "steps": [],
            }]
        }]
    }
    with patch("httpx.AsyncClient") as MockClient:
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response
        MockClient.return_value = mock_client

        result = await get_directions(48.8566, 2.3522, 48.8606, 2.3376)

    assert result["distance_m"] == 1500
    assert result["duration_sec"] == 1200
    assert result["polyline"] == "encoded_polyline_string"


@pytest.mark.asyncio
async def test_get_directions_no_route():
    from app.services.google_maps import get_directions
    mock_response = MagicMock()
    mock_response.json.return_value = {"status": "ZERO_RESULTS", "routes": []}
    with patch("httpx.AsyncClient") as MockClient:
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.get.return_value = mock_response
        MockClient.return_value = mock_client

        result = await get_directions(0, 0, 0, 0)

    assert result is None


@pytest.mark.asyncio
async def test_enrich_activities_skips_when_coords_exist():
    from app.services.google_maps import enrich_activities_with_places
    activities = [{"id": "a1", "name": "Eiffel", "lat": 48.8584, "lng": 2.2945}]
    result = await enrich_activities_with_places(activities, 48.8566, 2.3522)
    assert result[0]["lat"] == 48.8584  # unchanged


@pytest.mark.asyncio
async def test_get_route_for_day_insufficient_locations():
    from app.services.google_maps import get_route_for_day
    activities = [{"id": "a1", "name": "Only One", "lat": 48.8566, "lng": 2.3522}]
    result = await get_route_for_day(activities)
    assert result is None


@pytest.mark.asyncio
async def test_get_route_for_day_no_coordinates():
    from app.services.google_maps import get_route_for_day
    activities = [
        {"id": "a1", "name": "No Coords 1"},
        {"id": "a2", "name": "No Coords 2"},
    ]
    result = await get_route_for_day(activities)
    assert result is None
