import pytest
from app.services.constraint_solver import (
    haversine_km,
    validate_budget_constraints,
    check_hard_constraints,
    optimize_daily_route,
)


def test_haversine_same_point():
    assert haversine_km(48.8566, 2.3522, 48.8566, 2.3522) == 0.0


def test_haversine_paris_london():
    dist = haversine_km(48.8566, 2.3522, 51.5074, -0.1278)
    assert 340 < dist < 350  # ~344 km


def test_validate_budget_no_limit():
    itinerary = [{"date": "2026-07-01", "estimated_cost": 500}]
    result = validate_budget_constraints(itinerary, None)
    assert result == itinerary  # unchanged


def test_validate_budget_within_limit():
    itinerary = [
        {"date": "2026-07-01", "estimated_cost": 100},
        {"date": "2026-07-02", "estimated_cost": 100},
    ]
    result = validate_budget_constraints(itinerary, 500)
    assert all("real_time_flags" not in day or not day["real_time_flags"] for day in result)


def test_validate_budget_exceeded():
    itinerary = [
        {"date": "2026-07-01", "estimated_cost": 300},
        {"date": "2026-07-02", "estimated_cost": 300},
    ]
    result = validate_budget_constraints(itinerary, 400)
    # Second day pushes over budget
    assert any(
        "real_time_flags" in day and day["real_time_flags"]
        for day in result
    )


def test_check_hard_constraints_budget_ok():
    itinerary = [{"estimated_cost": 100}, {"estimated_cost": 150}]
    constraints = [{"type": "hard", "category": "budget", "description": "max", "value": 500}]
    violations = check_hard_constraints(itinerary, constraints)
    assert violations == []


def test_check_hard_constraints_budget_violated():
    itinerary = [{"estimated_cost": 400}, {"estimated_cost": 400}]
    constraints = [{"type": "hard", "category": "budget", "description": "max", "value": 500}]
    violations = check_hard_constraints(itinerary, constraints)
    assert len(violations) == 1
    assert "Budget exceeded" in violations[0]


def test_check_soft_constraints_not_enforced():
    """Soft constraints should not appear in violations."""
    itinerary = [{"estimated_cost": 1000}]
    constraints = [{"type": "soft", "category": "budget", "description": "prefer cheap", "value": 200}]
    violations = check_hard_constraints(itinerary, constraints)
    assert violations == []


def test_optimize_route_no_coords():
    activities = [
        {"id": "a1", "name": "Museum", "category": "culture"},
        {"id": "a2", "name": "Restaurant", "category": "food"},
    ]
    result = optimize_daily_route(activities)
    assert len(result) == 2


def test_optimize_route_single_activity():
    activities = [{"id": "a1", "name": "Park", "lat": 48.8566, "lng": 2.3522}]
    result = optimize_daily_route(activities)
    assert len(result) == 1


def test_optimize_route_returns_all_activities():
    activities = [
        {"id": "a1", "name": "A", "lat": 48.8500, "lng": 2.3400, "category": "sightseeing"},
        {"id": "a2", "name": "B", "lat": 48.8700, "lng": 2.3700, "category": "food"},
        {"id": "a3", "name": "C", "lat": 48.8300, "lng": 2.3100, "category": "culture"},
    ]
    result = optimize_daily_route(activities)
    assert len(result) == 3
    result_names = {a["name"] for a in result}
    assert result_names == {"A", "B", "C"}
