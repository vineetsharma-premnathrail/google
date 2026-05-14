import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token
from app.models.trip import Trip
from app.models.user import User
from app.schemas.trip import TripCreate, TripGenerateRequest, TripOut, ChatMessage
from app.services.ai_planner import AIPlanner
from app.services.constraint_solver import optimize_daily_route, validate_budget_constraints, check_hard_constraints
from app.services.realtime import monitor_trip_weather
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/trips", tags=["trips"])
security = HTTPBearer()
planner = AIPlanner()

# In-memory chat history per trip (production: store in Redis)
chat_histories: dict[str, list[dict]] = {}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/", response_model=TripOut, status_code=201)
async def create_trip(
    payload: TripCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = Trip(
        user_id=user.id,
        title=payload.title,
        destinations=[d.model_dump() for d in payload.destinations],
        start_date=payload.start_date,
        end_date=payload.end_date,
        travelers=payload.travelers,
        budget_total=payload.budget_total,
        budget_currency=payload.budget_currency,
        constraints=[c.model_dump() for c in payload.constraints],
        notes=payload.notes,
    )
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return TripOut.model_validate(trip)


@router.post("/generate", response_model=TripOut)
async def generate_itinerary(
    payload: TripGenerateRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == payload.trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    try:
        ai_result = await planner.generate_itinerary(
            destinations=trip.destinations,
            start_date=str(trip.start_date),
            end_date=str(trip.end_date),
            travelers=trip.travelers,
            budget_total=trip.budget_total,
            budget_currency=trip.budget_currency,
            preferences=user.preferences,
            constraints=trip.constraints,
            notes=trip.notes,
            focus=payload.focus,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI generation failed: {str(e)}")

    itinerary = ai_result.get("itinerary", [])

    # Optimize each day's route
    for day in itinerary:
        day["activities"] = optimize_daily_route(day.get("activities", []))

    # Validate budget constraints
    itinerary = validate_budget_constraints(itinerary, trip.budget_total)

    violations = check_hard_constraints(itinerary, trip.constraints)
    flags = [{"type": "constraint_violation", "message": v} for v in violations]

    trip.itinerary = itinerary
    trip.budget_breakdown = ai_result.get("budget_breakdown", {})
    trip.real_time_flags = flags
    trip.status = "draft"

    await db.commit()
    await db.refresh(trip)

    # Kick off weather monitoring in background
    background_tasks.add_task(monitor_trip_weather, trip.id, itinerary, trip.destinations)

    return TripOut.model_validate(trip)


@router.get("/", response_model=list[TripOut])
async def list_trips(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.user_id == user.id))
    return [TripOut.model_validate(t) for t in result.scalars().all()]


@router.get("/{trip_id}", response_model=TripOut)
async def get_trip(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return TripOut.model_validate(trip)


@router.post("/chat", response_model=TripOut)
async def chat_refine(
    payload: ChatMessage,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == payload.trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    history = chat_histories.get(payload.trip_id, [])

    trip_context = {
        "destinations": trip.destinations,
        "dates": f"{trip.start_date} to {trip.end_date}",
        "travelers": trip.travelers,
        "budget": trip.budget_total,
    }

    ai_result = await planner.refine_with_chat(
        current_itinerary=trip.itinerary,
        user_message=payload.message,
        preferences=user.preferences,
        trip_context=trip_context,
        conversation_history=history,
    )

    itinerary = ai_result.get("itinerary", trip.itinerary)
    for day in itinerary:
        day["activities"] = optimize_daily_route(day.get("activities", []))

    trip.itinerary = itinerary
    if ai_result.get("budget_breakdown"):
        trip.budget_breakdown = ai_result["budget_breakdown"]

    # Append to chat history
    history.append({"role": "user", "content": payload.message})
    history.append({"role": "assistant", "content": f"Updated itinerary with {len(itinerary)} days."})
    chat_histories[payload.trip_id] = history[-20:]  # keep last 20 turns

    await db.commit()
    await db.refresh(trip)
    return TripOut.model_validate(trip)


@router.patch("/{trip_id}/status")
async def update_status(
    trip_id: str,
    status: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    valid = {"draft", "confirmed", "active", "completed"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")

    trip.status = status
    await db.commit()
    return {"id": trip_id, "status": status}


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    await db.delete(trip)
    await db.commit()
