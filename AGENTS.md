# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

AcadMix is a B2B multi-tenant academic SaaS platform. The monorepo contains a Python/FastAPI backend, multiple React frontends, a TanStack Start SSR hub, and a sandboxed code execution service.

## Repository Layout

- `backend/` — FastAPI API (port 8000). PostgreSQL + Redis + ARQ workers. In local dev the backend is often exposed via ngrok.
- `frontend/` — React + Vite (port 3000). College tenant dashboard for students/faculty. Served per-college as `<college>.acadmix.org` (prod) or `<college>.localhost:3000` (dev). Also builds the Capacitor Android app.
- `platform-admin/` — React + Vite + Tailwind v4 (port 5174). AcadMix platform admin panel.
- `website/` — React + Vite marketing/landing page for `acadmix.org`.
- `marketing-test/` — TanStack Start full-stack SSR app targeting Cloudflare Workers (just a test marketing page).
- `code-runner/` — Separate FastAPI sandbox for executing student code (Python, C/C++, Java, Go, Node, C#, Octave, etc.) with cgroups/iptables isolation.
- `insights-query/` — Edge function for analytics queries.
- `k8s/` — Kubernetes manifests (backend deployment, HPA, PgBouncer).

## Common Commands

### Backend

- Install deps: `cd backend && pip install -r requirements.txt`
- Run dev server: `cd backend && python server.py` (uvicorn reload on 8000)
- Run tests: `cd backend && python -m pytest tests/ -v --tb=short -x`
- Run single test: `cd backend && python -m pytest tests/test_api.py -v --tb=short -x`
- Lint: `cd backend && ruff check app/ --select E,F,W --ignore E501,E402,F401`
- Format: `cd backend && ruff format app/`
- Migration generate: `cd backend && alembic revision --autogenerate -m "description"`
- Migration apply: `cd backend && alembic upgrade head`
- Worker: `cd backend && python -m arq app.workers.arq_worker.WorkerSettings`

### Frontend (student/faculty)

- Dev: `cd frontend && npm run dev` (port 3000, proxies `/api` → `127.0.0.1:8000`). In production each college accesses this at `<college>.acadmix.org`.
- Build: `cd frontend && npm run build`

### Platform-Admin

- Dev: `cd platform-admin && npm run dev` (port 5174, proxies `/api` → `localhost:8000`)
- Build: `cd platform-admin && npm run build`
- Lint: `cd platform-admin && npm run lint`

### Website

- Dev: `cd website && npm run dev`
- Build: `cd website && npm run build`

### Marketing Test (TanStack Start)

- Dev: `cd marketing-test && npm run dev`
- Build: `cd marketing-test && npm run build`

## Architecture Notes

### Multi-Tenancy

The backend is multi-tenant via the `X-Tenant` header. The `TenantMiddleware` (`app/core/tenant_middleware.py`) resolves tenants through a 3-tier cache: in-memory TTL → Redis (`tenant:{slug}`) → PostgreSQL `colleges` table. Unknown tenants are rejected with 400.

`database.py` maintains **two engines**:
- Tenant engine — used by all request handlers. Applies Row-Level Security (RLS).
- Admin engine — bypasses RLS, intended only for migrations/admin scripts. A runtime `SecurityHardeningError` is raised if the admin engine is used inside a tenant-scoped request to prevent accidental RLS bypass.

### API Response Contract

All outbound API responses use a standardized envelope defined in `app/core/response.py`:

```json
{
  "data": <payload>,
  "error": null | "message",
  "meta": { "request_id": "...", ... }
}
```

Routers should return `success(payload)` or `error(message, status_code)` rather than raw FastAPI responses.

### Role-Based Routing

The backend does not use a generic user router. It has ~50 role-specific router modules under `app/routers/` (e.g., `student_core.py`, `faculty_core.py`, `hod_core.py`, `principal.py`, `exam_cell_core.py`, `tpo.py`, `admin_core.py`). Each corresponds to a dashboard and permission set. When adding a feature, determine which academic role owns it and add endpoints to the matching router. Shared business logic belongs in `app/services/`.

### Background Jobs

Heavy or async work is offloaded to ARQ workers (`app/workers/arq_worker.py`). Key tasks include AI code review, interview feedback generation, PDF generation, WhatsApp message dispatch, and push notifications. The worker reads the same `DATABASE_URL` and `REDIS_URL` as the API.

### Code Execution

Student code submission is executed by the separate `code-runner/` service, not the main backend. It is a Dockerized FastAPI app with per-language resource limits (memory, CPU time, process count, file size) and network isolation via iptables. The backend calls it over HTTP using `CODE_RUNNER_URL` and `CODE_RUNNER_TOKEN`.

### LLM Provider

Production uses **Vertex AI** (`VERTEX_PROJECT_ID`, `VERTEX_LOCATION`). Groq/Gemini API keys exist as legacy hot-standby fallbacks. The production router is `app/services/llm_gateway.py`.

### Datadog APM

`app/main.py` initializes Datadog tracing **before** any other imports when `DD_TRACE_ENABLED=true` and `DD_API_KEY` is present. It auto-patches FastAPI, SQLAlchemy, Redis, httpx, and asyncio. Do not add imports above the Datadog block unless they are safe to instrument.

## Code Style

### Python (Backend)

- Ruff config is in `backend/ruff.toml`:
  - Line length: 120
  - Lint rules: `E`, `F`, `I` (isort)
  - Ignore: `E501`
  - Format: double quotes, spaces
- The backend is fully async: use `async`/`await` for DB operations, HTTP clients, and Redis.

### Frontend

- `frontend/` is migrating from JSX to TypeScript. `tsconfig.json` has `allowJs: true` and `strict: true`. When touching any `.jsx` file in `frontend/`, convert it to `.tsx`.
- `platform-admin/` uses Tailwind CSS v4 and the new `@tailwindcss/vite` plugin.
- Do not use generic `window.alert`. Use the project's existing alert/popup components.

## Environment

The backend requires `.env` at `backend/.env`. Key required variables:
- `DATABASE_URL`
- `JWT_SECRET`
- `REDIS_URL`
- `ADMIN_PASSWORD`
- `ADMIN_COLLEGE_ID`

See `backend/.env.example` for the full template. Do not commit `.env`.

## Testing

- Backend tests use `pytest-asyncio` with async fixtures in `tests/conftest.py`.
- The test database is PostgreSQL (`acadmix_test`). Each test runs inside a transaction that rolls back on completion.
- CI runs `cd backend && python -m pytest tests/ -v --tb=short -x`.

## Agent-Specific Rules

- Push to git after making code changes.
- Ask for permission before changing the tech stack or AI models.
- Use `aits.localhost:3000` or `aits.acadmix.org` for browser testing only when explicitly asked.
