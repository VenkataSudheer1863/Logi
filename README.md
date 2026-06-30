# Maersk WMS — AI-Native ERP Warehouse Management System

Enterprise-grade WMS with Agentic AI (LangChain + LangGraph), real-time operations, and full supply chain intelligence.

## Architecture

```
backend/          FastAPI + SQLAlchemy + SQLite3
  app/
    services/     Inventory, Orders, Inbound, Warehouse, Incidents, Analytics, Auth
    ai_agents/    LangGraph agents: Label Validation, Inbound Orchestrator,
                  Inventory Optimization, Incident Detection, Disruption
    common/       Config, DB, Models, Logger
    api/          WebSocket manager

frontend/         React + Vite + TailwindCSS + Zustand
  src/
    pages/        Dashboard, Inventory, Orders, Warehouse, Inbound, Incidents, AI Insights, Analytics
    components/   Layout, KPICard
    store/        authStore, wmsStore
    lib/          axios API client
```

## Quick Start

### 1. Backend

```bash
cd backend

# Copy and configure env
cp .env.example .env
# Edit .env with your Azure OpenAI credentials

# Install dependencies
pip install -r requirements.txt

# Seed database (10 warehouses, 1000 products, 50k inventory, 10k orders, 500 containers)
python seed_data.py

# Start server
uvicorn app.main:app --reload
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# UI available at http://localhost:5173
```

### 3. Docker (full stack)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env

docker-compose up --build
```

## Default Login

- Email: `admin@maersk.com`
- Password: `admin123`

## Azure OpenAI Configuration

Set these in `backend/.env`:

```
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

> The system works without Azure OpenAI — agents fall back to rule-based logic automatically.

## AI Agents (LangGraph)

| Agent | Trigger | Output |
|-------|---------|--------|
| Label Validation | POST /ai/label-validate | valid/invalid + OCR + reasoning |
| Inbound Orchestrator | POST /ai/inbound-plan | dock, labor, truck schedule + plan |
| Inventory Optimization | POST /ai/optimize-slotting | slotting recs + replenishment orders |
| Incident Detection | POST /ai/analyze-incident | severity, actions, resolution plan |
| Disruption Agent | POST /ai/disruption-analysis | rerouting plan + cost impact |
| WMS Chat | POST /ai/chat | conversational warehouse assistant |

## API Endpoints

```
GET  /api/v1/inventory/
POST /api/v1/inventory/add
POST /api/v1/inventory/move
GET  /api/v1/inventory/low-stock
GET  /api/v1/orders/
POST /api/v1/orders/create
GET  /api/v1/orders/{id}
GET  /api/v1/inbound/containers
POST /api/v1/inbound/containers
GET  /api/v1/incidents/
POST /api/v1/incidents/
GET  /api/v1/analytics/kpis
GET  /api/v1/analytics/order-trends
POST /api/v1/ai/label-validate
POST /api/v1/ai/inbound-plan
POST /api/v1/ai/optimize-slotting
POST /api/v1/ai/analyze-incident
POST /api/v1/ai/disruption-analysis
POST /api/v1/ai/chat
WS   /ws/{channel}
```

## Tech Stack

- Backend: FastAPI, SQLAlchemy, SQLite3, Alembic, Pydantic v2
- AI: LangChain, LangGraph, Azure OpenAI (GPT-4o), Scikit-learn, Prophet
- Vision: OpenCV, Tesseract OCR
- Frontend: React, Vite, TailwindCSS, Zustand, Recharts, React Flow
- Auth: JWT + bcrypt RBAC
- Realtime: WebSockets
