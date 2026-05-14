from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.database import init_db
from app.api.routes import auth, trips, websocket


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Travel Planning & Experience Engine",
    description="AI-powered dynamic trip planner with real-time updates",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(trips.router, prefix="/api")
app.include_router(websocket.router)


@app.exception_handler(Exception)
async def global_exception_handler(_request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.get("/")
async def root():
    return {"message": "Travel Engine API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
