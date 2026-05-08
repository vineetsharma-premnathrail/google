import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import get_settings
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


async def _verify_google_token(id_token: str) -> dict:
    """Verify Google ID token and return payload."""
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        payload = r.json()

    # Verify audience matches our client ID (if configured)
    if settings.google_client_id and payload.get("aud") != settings.google_client_id:
        raise HTTPException(status_code=401, detail="Token audience mismatch")

    return payload


@router.post("/google", response_model=TokenResponse, status_code=200)
async def google_signin(body: dict, db: AsyncSession = Depends(get_db)):
    """Sign in or register via Google ID token."""
    id_token = body.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="id_token required")

    payload = await _verify_google_token(id_token)
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not in Google token")

    # Upsert user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            hashed_password=hash_password(id_token[:20]),  # placeholder — Google users never use password
            full_name=payload.get("name"),
            avatar_url=payload.get("picture"),
            google_id=payload.get("sub"),
            preferences={},
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.google_id:
        user.google_id = payload.get("sub")
        user.avatar_url = payload.get("picture")
        await db.commit()
        await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        preferences=payload.preferences.model_dump() if payload.preferences else {},
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))
