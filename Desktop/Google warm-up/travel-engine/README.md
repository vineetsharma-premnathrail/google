# Travel Planning & Experience Engine

AI-powered trip planner with dynamic itineraries, real-time updates, and constraint solving.

## Quick Start

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your ANTHROPIC_API_KEY
cp frontend/.env.local.example frontend/.env.local
```

### 2. Run with Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 3. Run locally (without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

You'll need PostgreSQL and Redis running locally (or use Docker for just those services):
```bash
docker-compose up db redis
```

## Architecture

```
travel-engine/
├── backend/               # FastAPI + Python
│   ├── app/
│   │   ├── api/routes/    # auth, trips, websocket
│   │   ├── core/          # config, database, security
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # ai_planner, constraint_solver, realtime
│   │   └── main.py
│   └── requirements.txt
├── frontend/              # Next.js 14 + TypeScript
│   └── src/
│       ├── app/           # Next.js App Router
│       ├── components/    # AuthPage, Dashboard, TripDetail, etc.
│       ├── lib/           # api client, zustand store
│       └── types/         # TypeScript types
└── docker-compose.yml
```

## Features

| Feature | Status |
|---|---|
| AI itinerary generation (Claude) | ✅ |
| Route optimization (OR-Tools) | ✅ |
| Constraint validation (budget, hard/soft) | ✅ |
| Real-time WebSocket updates | ✅ |
| Weather monitoring & alerts | ✅ |
| Conversational AI refinement | ✅ |
| User auth (JWT) | ✅ |
| Multi-destination trips | ✅ |
| Budget tracking | ✅ |

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| POST | /api/trips/ | Create trip |
| POST | /api/trips/generate | Generate AI itinerary |
| GET | /api/trips/ | List user trips |
| GET | /api/trips/{id} | Get trip detail |
| POST | /api/trips/chat | Refine with AI chat |
| PATCH | /api/trips/{id}/status | Update trip status |
| DELETE | /api/trips/{id} | Delete trip |
| WS | /ws/trips/{id} | Real-time trip updates |
