# AcadMix Architecture Diagram

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AcadMulti-Tenant SaaS Platform                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │Platform-Admin│    │   Website    │    │Marketing-Test│  │
│  │  (React/Vite)│    │(React/Vite)  │    │(React/Vite)  │    │(TanStack Start)│  │
│  │   Port 3000  │    │  Port 5174   │    │              │    │  Cloudflare   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │                   │          │
│         └───────────────────┼───────────────────┼───────────────────┘          │
│                             │                   │                              │
│                    ┌────────▼───────────────────▼────────┐                     │
│                    │         Backend (FastAPI)           │                     │
│                    │            Port 8000                │                     │
│                    │  ┌──────────────────────────────┐  │                     │
│                    │  │   Tenant Middleware          │  │                     │
│                    │  │   (X-Tenant header → RLS)    │  │                     │
│                    │  └───────────┬──────────────────┘  │                     │
│                    │              │                     │                     │
│                    │  ┌───────────▼──────────────────┐  │                     │
│                    │  │   Role-Specific Routers      │  │                     │
│                    │  │   (~50 routers)              │  │                     │
│                    │  │   - student_core.py          │  │                     │
│                    │  │   - faculty_core.py          │  │                     │
│                    │  │   - hod_core.py              │  │                     │
│                    │  │   - principal.py             │  │                     │
│                    │  │   - exam_cell_core.py        │  │                     │
│                    │  │   - tpo.py                   │  │                     │
│                    │  │   - admin_core.py            │  │                     │
│                    │  │   - ... (40+ more)           │  │                     │
│                    │  └───────────┬──────────────────┘  │                     │
│                    │              │                     │                     │
│                    │  ┌───────────▼──────────────────┐  │                     │
│                    │  │   Services Layer             │  │                     │
│                    │  │   (Business Logic)           │  │                     │
│                    │  │   - ai_service.py            │  │                     │
│                    │  │   - career_service.py        │  │                     │
│                    │  │   - marks_service.py         │  │                     │
│                    │  │   - attendance_service.py    │  │                     │
│                    │  │   - whatsapp_bot.py          │  │                     │
│                    │  │   - ... (50+ services)       │  │                     │
│                    │  └───────────┬──────────────────┘  │                     │
│                    │              │                     │                     │
│                    │  ┌───────────▼──────────────────┐  │                     │
│                    │  │   Database Layer             │  │                     │
│                    │  │   (SQLAlchemy ORM)           │  │                     │
│                    │  └───────────┬──────────────────┘  │                     │
│                    └──────────────┼─────────────────────┘                     │
│                                   │                                            │
│         ┌─────────────────────────┼─────────────────────────┐                 │
│         │                         │                         │                 │
│  ┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐              │
│  │ PostgreSQL  │          │    Redis    │          │Code Runner  │              │
│  │  (Supabase) │          │   Cache     │          │  (FastAPI)  │              │
│  │             │          │             │          │  Sandboxed  │              │
│  │ - RLS       │          │ - Tenant    │          │  Execution │              │
│  │ - Multi-    │          │   Config    │          │             │              │
│  │   tenant    │          │ - Sessions  │          │ - Python    │              │
│  │ - Data      │          │ - Queue     │          │ - C/C++     │              │
│  │             │          │             │          │ - Java      │              │
│  └─────────────┘          └─────────────┘          │ - Go        │              │
│                                                     │ - Node.js   │              │
│                                                     │ - C#        │              │
│                                                     │ - Octave    │              │
│                                                     └─────────────┘              │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        Background Workers (ARQ)                           │  │
│  │  - AI code review     - Interview feedback generation                     │  │
│  │  - PDF generation     - WhatsApp message dispatch                         │  │
│  │  - Push notifications - Analytics queries                                 │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multi-Tenancy Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Request arrives with X-Tenant header                        │
│     (e.g., "college-a" or "college-b")                          │
│                                                                 │
│  2. TenantMiddleware resolves tenant via 3-tier cache:         │
│                                                                 │
│     ┌────────────┐    ┌────────────┐    ┌────────────┐         │
│     │ In-Memory  │ →  │   Redis    │ →  │ PostgreSQL  │         │
│     │ Cache      │    │   Cache    │    │ colleges    │         │
│     │ (2 min TTL)│    │ (5 min TTL)│    │   table     │         │
│     └────────────┘    └────────────┘    └────────────┘         │
│                                                                 │
│  3. TenantContext attached to request.state:                    │
│     - slug: "college-a"                                         │
│     - college_id: "uuid-123"                                    │
│     - name: "College A"                                         │
│     - plan: "starter/pro/enterprise"                            │
│                                                                 │
│  4. Database session gets RLS GUC variables:                   │
│     - SET LOCAL app.college_id = 'uuid-123'                     │
│     - SET LOCAL ROLE authenticated                              │
│                                                                 │
│  5. PostgreSQL RLS policies enforce isolation:                  │
│     CREATE POLICY tenant_isolation                              │
│     USING (college_id = current_setting('app.college_id'))     │
│                                                                 │
│  6. ORM-level filtering (safety net):                           │
│     - Soft delete: is_deleted = False                          │
│     - Tenant filter: college_id = context.college_id             │
│                                                                 │
│  7. Shadow mode validation (optional):                          │
│     - Validates returned rows match tenant                       │
│     - Logs violations to rls_shadow_logs table                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Database Layer                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Two SQLAlchemy Engines:                                        │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐         │
│  │   Tenant Engine      │    │   Admin Engine       │         │
│  │   (request handlers) │    │   (migrations/admin)  │         │
│  └──────────┬───────────┘    └──────────┬───────────┘         │
│             │                            │                      │
│             │                            │                      │
│  ┌──────────▼──────────┐    ┌──────────▼──────────┐           │
│  │ - Sets RLS GUC      │    │ - Bypasses RLS       │           │
│  │ - Applies RLS       │    │ - BYPASSRLS role     │           │
│  │ - ORM filtering     │    │ - No event listeners │           │
│  │ - Security guard    │    │ - For migrations     │           │
│  └─────────────────────┘    └─────────────────────┘           │
│                                                                 │
│  Connection Pooling:                                            │
│  - Pool size: 5 (configurable)                                  │
│  - Max overflow: 10                                             │
│  - PgBouncer mode: optional                                     │
│  - Pool timeout: 45s                                            │
│  - Pool recycle: 180s                                           │
│                                                                 │
│  Row-Level Security (RLS):                                      │
│  - All tenant tables have college_id column                     │
│  - RLS policies enforce tenant isolation                        │
│  - Exempt tables: users, colleges, coding_challenges            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Router Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Role-Based Routing                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Backend does NOT use generic user router. Instead, it has      │
│  ~50 role-specific router modules under app/routers/:           │
│                                                                 │
│  Academic Roles:                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ student_core.py │  │ faculty_core.py│  │ hod_core.py     │  │
│  │ - Dashboard    │  │ - Dashboard    │  │ - Dashboard    │  │
│  │ - Assignments  │  │ - Teaching     │  │ - Department    │  │
│  │ - Quizzes      │  │ - Marks Entry  │  │ - Faculty Mgmt  │  │
│  │ - Attendance   │  │ - Attendance   │  │ - Approvals     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ principal.py    │  │ exam_cell_core  │  │ admin_core.py   │  │
│  │ - Dashboard     │  │ - Exam Mgmt     │  │ - User Mgmt     │  │
│  │ - Reports       │  │ - Hall Tickets  │  │ - College Mgmt  │  │
│  │ - Approvals     │  │ - Results       │  │ - Settings     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  Specialized Roles:                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ tpo.py          │  │ librarian.py    │  │ warden.py       │  │
│  │ - Placements    │  │ - Library       │  │ - Hostel        │  │
│  │ - Career Prep   │  │ - Books         │  │ - Rooms         │  │
│  │ - Companies     │  │ - Issues        │  │ - Attendance   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ alumni.py       │  │ parent.py       │  │ nodal_routes.py │  │
│  │ - Alumni Portal │  │ - Parent View   │  │ - Multi-college │  │
│  │ - Networking    │  │ - Child Progress│  │ - Jurisdiction  │  │
│  │ - Events        │  │ - Fees          │  │ - Analytics     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  Feature Modules:                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ quizzes.py      │  │ assignments.py  │  │ attendance.py   │  │
│  │ - Quiz Builder  │  │ - Assignment    │  │ - Attendance    │  │
│  │ - Quiz Attempts │  │ - Submission    │  │ - Reports       │  │
│  │ - Results       │  │ - Grading       │  │ - Calendar      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ code_execution  │  │ interview.py    │  │ whatsapp_bot.py │  │
│  │ - Code Runner   │  │ - AI Interviews │  │ - WA Flows      │  │
│  │ - Playground    │  │ - Mock Rounds   │  │ - Notifications │  │
│  │ - Challenges    │  │ - Feedback      │  │ - Interactive   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Code Runner Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Code Runner Service                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Separate FastAPI service for executing student code             │
│  (Dockerized with resource limits)                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Security Layer                         │  │
│  │  - Pattern-based blocking (AST parsing for Python)       │  │
│  │  - Blocked imports: os, sys, subprocess, socket, etc.    │  │
│  │  - Blocked functions: eval, exec, open, globals, etc.    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                 Resource Limits (Linux)                  │  │
│  │  - Memory: 768MB max                                      │  │
│  │  - File size: 100MB max                                    │  │
│  │  - Processes: 128 max                                     │  │
│  │  - CPU time: 60s compile, 10s execute                     │  │
│  │  - Network isolation via iptables                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Supported Languages:                                           │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ Python   │ C/C++    │ Java     │ Go       │ Node.js  │      │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┤      │
│  │ C#       │ Octave   │ SQL      │ Bash     │ MATLAB   │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                                                                 │
│  Integration:                                                   │
│  - Backend calls Code Runner via HTTP                           │
│  - Uses CODE_RUNNER_URL and CODE_RUNNER_TOKEN                   │
│  - Returns: stdout, stderr, exit_code, execution_time          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Background Job Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQ Background Workers                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Heavy/async tasks offloaded to ARQ workers                      │
│  (app/workers/arq_worker.py)                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Job Queue                            │  │
│  │  - Redis-backed queue                                   │  │
│  │  - Multiple worker processes                            │  │
│  │  - Retry logic with exponential backoff                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Job Types:                                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  AI/ML Tasks:                                            │  │
│  │  - AI code review                                        │  │
│  │  - Interview feedback generation                         │  │
│  │  - Resume ATS scoring                                    │  │
│  │  - Career recommendations                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Document Generation:                                     │  │
│  │  - PDF generation (reports, hall tickets)                │  │
│  │  - Certificate generation                                │  │
│  │  - Mark sheets                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Communication:                                          │  │
│  │  - WhatsApp message dispatch                            │  │
│  │  - Push notifications (FCM/APNs)                         │  │
│  │  - Email notifications                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Analytics:                                              │  │
│  │  - Insights query execution                             │  │
│  │  - Report generation                                     │  │
│  │  - Data aggregation                                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Applications                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Frontend (React + Vite) - Port 3000                         │
│     - Student/Faculty dashboard                                 │
│     - Multi-tenant: <college>.acadmix.org (prod)                 │
│     - Single-tenant: <college>.localhost:3000 (dev)              │
│     - Proxies /api → 127.0.0.1:8000                              │
│     - Capacitor for Android app                                  │
│     - Migrating from JSX to TypeScript                          │
│                                                                 │
│     Key Pages:                                                   │
│     - StudentDashboard, FacultyDashboard, HODDashboard          │
│     - PrincipalDashboard, ExamCellDashboard, TPODashboard       │
│     - CodePlayground, QuizBuilder, QuizAttempt                   │
│     - AIInterviewSession, CareerToolkit, Placements              │
│     - MarksEntry, Attendance, Timetable                          │
│                                                                 │
│  2. Platform-Admin (React + Vite + Tailwind v4) - Port 5174     │
│     - AcadMix platform admin panel                               │
│     - Proxies /api → localhost:8000                              │
│     - Tenant management, billing, analytics                      │
│                                                                 │
│  3. Website (React + Vite)                                      │
│     - Marketing/landing page for acadmix.org                    │
│                                                                 │
│  4. Marketing-Test (TanStack Start SSR)                          │
│     - Full-stack SSR app targeting Cloudflare Workers            │
│     - Test marketing page                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Response Contract

```
┌─────────────────────────────────────────────────────────────────┐
│                    Standard API Response                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  All outbound API responses use standardized envelope:          │
│                                                                 │
│  {                                                              │
│    "data": <payload>,                                           │
│    "error": null | "message",                                   │
│    "meta": {                                                    │
│      "request_id": "...",                                       │
│      ...                                                        │
│    }                                                            │
│  }                                                              │
│                                                                 │
│  Routers should return:                                         │
│  - success(payload)                                             │
│  - error(message, status_code)                                  │
│                                                                 │
│  Defined in: app/core/response.py                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Datadog APM:                                                   │
│  - Initialized before other imports (app/main.py)               │
│  - Auto-instruments: FastAPI, SQLAlchemy, Redis, httpx, asyncio  │
│  - Agentless mode (sends traces directly to Datadog)              │
│  - Injects trace IDs into log records                           │
│                                                                 │
│  Sentry:                                                        │
│  - Error tracking and exception monitoring                      │
│  - FastAPI integration                                          │
│                                                                 │
│  Logging:                                                       │
│  - Structured logging with trace IDs                            │
│  - RLS shadow mode logs violations                              │
│                                                                 │
│  Health Endpoints:                                              │
│  - /api/health - Basic health check                              │
│  - /api/health/db - Database pool status                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Deployment                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Kubernetes (k8s/):                                             │
│  - Backend deployment manifests                                 │
│  - Horizontal Pod Autoscaler (HPA)                              │
│  - PgBouncer for connection pooling                              │
│                                                                 │
│  Cloudflare Workers:                                            │
│  - Marketing-test app (TanStack Start SSR)                       │
│  - Insights-query edge function                                 │
│                                                                 │
│  Development:                                                   │
│  - Backend: uvicorn with reload (port 8000)                     │
│  - Frontend: Vite dev server (port 3000)                        │
│  - Platform-Admin: Vite dev server (port 5174)                  │
│  - Backend exposed via ngrok in local dev                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Technologies

```
┌─────────────────────────────────────────────────────────────────┐
│                    Technology Stack                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Backend:                                                       │
│  - FastAPI (Python async web framework)                          │
│  - SQLAlchemy (ORM)                                              │
│  - PostgreSQL (database with RLS)                                │
│  - Redis (cache, queue, sessions)                               │
│  - ARQ (async job queue)                                        │
│  - Alembic (database migrations)                                │
│                                                                 │
│  Frontend:                                                      │
│  - React + Vite                                                 │
│  - TypeScript (migrating from JSX)                              │
│  - Tailwind CSS v4 (platform-admin)                             │
│  - Capacitor (Android app)                                      │
│  - TanStack Start (SSR for marketing)                           │
│                                                                 │
│  AI/ML:                                                         │
│  - Vertex AI (production LLM provider)                           │
│  - Groq/Gemini (legacy fallbacks)                                │
│  - Custom LLM gateway (app/services/llm_gateway.py)             │
│                                                                 │
│  Infrastructure:                                                │
│  - Docker (containerization)                                    │
│  - Kubernetes (orchestration)                                   │
│  - Cloudflare Workers (edge functions)                          │
│  - Supabase (PostgreSQL hosting)                                │
│                                                                 │
│  Monitoring:                                                    │
│  - Datadog APM                                                  │
│  - Sentry (error tracking)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Layers                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Multi-Tenancy Isolation:                                    │
│     - X-Tenant header required for tenant requests               │
│     - 3-tier cache (memory → Redis → DB)                         │
│     - PostgreSQL RLS policies                                    │
│     - ORM-level filtering (safety net)                           │
│     - Shadow mode validation                                     │
│                                                                 │
│  2. Database Security:                                          │
│     - Two engines: tenant (RLS) vs admin (bypass)               │
│     - Security guard prevents admin engine in tenant requests   │
│     - Soft delete pattern (is_deleted flag)                      │
│                                                                 │
│  3. Code Execution Security:                                    │
│     - Separate sandboxed service                                 │
│     - Pattern-based code blocking                                │
│     - Resource limits (memory, CPU, processes)                   │
│     - Network isolation via iptables                             │
│                                                                 │
│  4. API Security:                                               │
│     - JWT authentication                                         │
│     - Rate limiting (slowapi)                                   │
│     - CORS (explicit origins only, no wildcards)                 │
│     - Role-based routing                                         │
│                                                                 │
│  5. Monitoring:                                                 │
│     - Datadog APM tracing                                       │
│     - Sentry error tracking                                      │
│     - RLS shadow mode logs violations                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
