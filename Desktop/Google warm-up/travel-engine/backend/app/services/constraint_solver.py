"""
Route optimizer using OR-Tools TSP solver.
Given a list of activities with lat/lng, reorders them to minimize travel distance.
"""
from math import radians, cos, sin, asin, sqrt
from typing import Optional

try:
    from ortools.constraint_solver import routing_enums_pb2, pywrapcp
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return R * 2 * asin(sqrt(a))


def optimize_daily_route(activities: list[dict]) -> list[dict]:
    """
    Reorder activities within a day to minimize total travel distance.
    Activities without lat/lng are kept in place.
    """
    if not ORTOOLS_AVAILABLE or len(activities) <= 2:
        return activities

    # Split into routable (have coords) and fixed (no coords)
    routable = [(i, a) for i, a in enumerate(activities) if a.get("lat") and a.get("lng")]
    if len(routable) <= 2:
        return activities

    locs = [(a["lat"], a["lng"]) for _, a in routable]
    n = len(locs)

    # Distance matrix
    dist_matrix = []
    for i in range(n):
        row = []
        for j in range(n):
            if i == j:
                row.append(0)
            else:
                km = haversine_km(locs[i][0], locs[i][1], locs[j][0], locs[j][1])
                row.append(int(km * 1000))  # meters as int
        dist_matrix.append(row)

    manager = pywrapcp.RoutingIndexManager(n, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_idx, to_idx):
        return dist_matrix[manager.IndexToNode(from_idx)][manager.IndexToNode(to_idx)]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    solution = routing.SolveWithParameters(search_params)
    if not solution:
        return activities

    # Extract optimized order
    index = routing.Start(0)
    optimized_indices = []
    while not routing.IsEnd(index):
        optimized_indices.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))

    optimized_routable = [routable[i][1] for i in optimized_indices]

    # Merge back with fixed activities
    result = []
    routable_iter = iter(optimized_routable)
    orig_routable_positions = {orig_i for orig_i, _ in routable}

    for i, act in enumerate(activities):
        if i in orig_routable_positions:
            result.append(next(routable_iter))
        else:
            result.append(act)

    return result


def validate_budget_constraints(itinerary: list[dict], budget_total: Optional[float]) -> list[dict]:
    """Flag activities that push over budget."""
    if not budget_total:
        return itinerary

    running_total = 0.0
    for day in itinerary:
        day_cost = day.get("estimated_cost", 0)
        running_total += day_cost
        if running_total > budget_total:
            if "real_time_flags" not in day:
                day["real_time_flags"] = []
            day["real_time_flags"].append({
                "type": "budget_warning",
                "message": f"Cumulative spend ${running_total:.0f} exceeds budget ${budget_total:.0f}"
            })
    return itinerary


def check_hard_constraints(itinerary: list[dict], constraints: list[dict]) -> list[str]:
    """Returns list of violated hard constraint descriptions."""
    violations = []
    hard = [c for c in constraints if c.get("type") == "hard"]

    for c in hard:
        if c["category"] == "budget" and c.get("value"):
            total = sum(d.get("estimated_cost", 0) for d in itinerary)
            if total > float(c["value"]):
                violations.append(f"Budget exceeded: ${total:.0f} > ${c['value']}")

    return violations
