# A.P. Møller Maersk WMS — Setup & Run Guide

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.11+ | |
| Node.js | 18+ | For the React frontend |
| Docker + Docker Compose | Latest | For containerised deployment (optional) |
| Groq API key | — | Free at https://console.groq.com |

## 1. Install Python Dependencies

```bash
cd "6.A.P.Moller_Maesrk\backend"
pip install -r requirements.txt
```

## 2. Install Frontend Dependencies

```bash
cd ..\frontend
npm install
cd ..
```

## 3. Configure Backend Environment

```bash
copy backend\.env.example backend\.env
```

Edit `backend/.env`:

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Auth
SECRET_KEY=change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database (SQLite by default)
DATABASE_URL=sqlite+aiosqlite:///./wms.db
SYNC_DATABASE_URL=sqlite:///./wms.db

LOG_LEVEL=INFO
```

## 4. Seed the Database

```bash
cd backend
python seed_data.py
cd ..
```

This creates sample warehouses, inventory, orders, and incidents.

## 5. Run the Backend

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: `http://localhost:8000/docs`

## 6. Run the Frontend

```bash
cd frontend
npm run dev
```

Opens at `http://localhost:5173`.

## 7. Docker Deployment (Optional)

```bash
# Create a .env file in the repo root with GROQ_API_KEY set
docker-compose up --build
```

Backend on port `8000`, frontend on port `5173`.

## 8. Usage

1. **Login** with the default credentials created by `seed_data.py`
2. **Dashboard** shows live inventory, orders, and active incidents
3. **AI Agents** are accessible via:
   - `/api/v1/ai/chat` — warehouse assistant chat
   - `/api/v1/ai/inbound-plan` — inbound container planning
   - `/api/v1/ai/optimize-slotting` — inventory slot optimisation
   - `/api/v1/ai/analyze-incident` — incident root-cause analysis
   - `/api/v1/ai/disruption-analysis` — supply chain disruption response
4. **WebSocket** at `/ws/{channel}` for real-time inventory updates

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| `AttributeError: Settings has no attribute azure_openai_*` | Pull latest code — migration is complete |
| AI agents return rule-based fallback only | Set `GROQ_API_KEY` in `backend/.env` |
| `langchain_groq` import error | Run `pip install langchain-groq` |
| Docker container exits immediately | Check that `GROQ_API_KEY` is in your root `.env` |
| Frontend cannot load dashboard | Ensure backend seed ran successfully — check for `wms.db` |
