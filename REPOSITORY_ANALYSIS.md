# Repository Analysis Report
## AcadMix — B2B Multi-Tenant Academic SaaS Platform

**Analysis Date**: June 6, 2026  
**Status**: Modular Monorepo (Production-Ready)  

---

## 📊 Executive Summary

AcadMix is a multi-tenant B2B academic administration and analytics platform designed for colleges and universities. The monorepo has evolved from a monolithic prototype into a hardened, modular, and highly secure multi-tenant SaaS architecture.

Key platform features include:
1. **Multi-Tenant Routing & Isolation**: Domain/subdomain-based tenant routing resolving to strict PostgreSQL Row-Level Security (RLS) policies.
2. **Modular FastAPI Backend**: Clean separation of routes, models, schemas, and services with APM instrumentation (Datadog, Sentry, Prometheus).
3. **TypeScript React Frontend**: Vite-powered client with active TSX migration, structured around role-based dashboards (Student, Faculty, HOD, Exam Cell, TPO, Principal, Warden, etc.).
4. **Sandboxed Code Execution**: Independent resource-limited microservice supporting 10 languages for student coding questions and playgrounds.
5. **AI Analytics Edge Function**: Deno/Supabase edge function using Vertex AI (Gemini Flash/Pro) with query classification, SQL validation, and self-healing query execution.
6. **Robust Marks Revision Workflows**: Fine-grained faculty marks entry with mandatory HOD review and audit logs for revisions on approved marks.

---

## 🏛️ Monorepo Architecture Overview

The codebase is organized as a monorepo containing multiple decoupled services and applications:

```
c:/AcadMix/
├── backend/            # FastAPI API server, SQLAlchemy, Alembic migrations, ARQ workers
├── frontend/           # React + Vite client (tenant dashboards for students/faculty/staff)
├── platform-admin/     # React + Vite + Tailwind v4 platform portal for super-admins
├── website/            # React + Vite marketing and landing pages
├── marketing-test/     # TanStack Start SSR web application targeting Cloudflare Workers
├── code-runner/        # Dockerized FastAPI sandboxed code execution service
├── insights-query/     # Supabase Edge function for natural language analytics
└── k8s/                # Kubernetes manifests for backend deployment, HPA, and PgBouncer
```

### System Architecture Diagram

```
                             ┌───────────────────────────────────┐
                             │          Marketing Page           │
                             │        (website, marketing)       │
                             └───────────────────────────────────┘
                                               │
                                               ▼
┌──────────────────────────┐     HTTPS REST / JSON API (Nginx)     ┌──────────────────────────┐
│      Tenant Client       │ ◄───────────────────────────────────► │  Platform-Admin Client   │
│   (frontend / React)     │                                       │ (platform-admin / Vite)  │
│  - Role Dashboards       │                                       │  - Tenant Provisioning   │
│  - Quiz & Exam UI        │                                       │  - Global Billing        │
│  - Career & Placements   │                                       │  - Template Designer     │
└──────────┬───────────────┘                                       └─────────────┬────────────┘
           │ (Subdomain Headers)                                                 │ (Super-admin Token)
           ▼                                                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                FastAPI Backend Service (backend/)                           │
│  - Port 8000/8001, Async Uvicorn, Gunicorn                                                 │
│  - Middleware: TenantMiddleware (resolves X-Tenant to College ID), CORS, correlation ID,     │
│    Tenant Rate Limiter (Noisy Neighbor Protection), Datadog APM, Sentry                       │
│  - Role-Specific Routers (~75 modules in app/routers/ resolving permissions)                │
└──────┬──────────────────────────┬───────────────────────────────┬───────────────────────────┘
       │                          │                               │
       │ HTTP/JSON                │ Redis (ARQ/Cache)             │ Async PG (SQLAlchemy)
       ▼                          ▼                               ▼
┌──────────────┐          ┌──────────────┐          ┌─────────────────────────────────────────┐
│ Code Runner  │          │ Redis Broker │          │         PostgreSQL Database             │
│ (code-runner)│          │ (arq_worker) │          │  - Row-Level Security (RLS)             │
│  - Sandbox   │          │  - AI review │          │  - ORM-Level Soft-Delete/Tenant Filters │
│  - Docker    │          │  - Push Notif│          │  - Dual Engines:                        │
│  - Cgroups   │          │  - PDF Gen   │          │    * Tenant Engine (authenticated role) │
│  - Iptables  │          │  - Whatsapp  │          │    * Admin Engine (RLS bypass)          │
└──────────────┘          └──────────────┘          └─────────────────────────────────────────┘
                                                                  ▲
                                                                  │ RPC / Direct SELECT
                                                    ┌─────────────┴─────────────┐
                                                    │    AI Insights Engine     │
                                                    │     (insights-query)      │
                                                    │  - Supabase Edge Function │
                                                    │  - Vertex AI (Gemini Pro) │
                                                    │  - Auto-healing queries   │
                                                    └───────────────────────────┘
```

---

## 📂 Codebase Details

### 1. Backend Service (`backend/`)
- **Main App (`app/main.py`)**: Initializes lifespan hooks (seeds database defaults, verifies Redis and GPU status, starts WebSocket Redis Pub/Sub subscriber). Integrates CORS (explicit origins), correlation IDs, slowapi tenant-level rate limiters, Prometheus metrics, and mounts `/api/v1` routes.
- **Database Engine (`database.py`)**: 
  - *Tenant Engine*: Configures SQLAlchemy connection pools optimized for PgBouncer. Employs `sync_session_class` event listeners using `do_orm_execute` to inject global soft-delete criteria (`is_deleted == False`) and tenant isolation constraints dynamically. On session generation, GUC variables are set (`SET LOCAL ROLE authenticated; SELECT set_config('app.college_id', ...)`).
  - *Admin Engine*: Uses `NullPool` to bypass RLS. Includes a `SecurityHardeningError` context guard to trigger a runtime crash if an admin session is mistakenly requested inside a user-scoped tenant request context.
  - *Shadow Mode (`RLS_SHADOW_MODE`)*: Active scanning of ORM output rows to catch cross-tenant leaks, missing college IDs, or soft-delete leaks, logging violations to the audit logs via the admin engine.
- **Modular Routers (`app/routers/`)**: Contains role-segregated files matching individual permission boundaries (e.g., `student_core.py`, `faculty_core.py`, `hod_core.py`, `principal.py`, `exam_cell_core.py`, `nodal_routes.py`, `tpo.py`, `superadmin.py`).

### 2. Frontend Application (`frontend/`)
- **Routing & Guarding (`src/App.tsx`)**: Lazy-loads dashboards. Controls transitions and correlation via React Query and React Router. Provides a compatibility bridge translating old-style page navigation calls (`navigate('page-name')`) to standard React Router URLs. Implements `ProtectedRoute` role verification checks.
- **Client Configuration (`src/services/api.ts`)**: Initializes Axios clients. Extracts subdomains dynamically (e.g., `demo.localhost` -> `demo`, `aits.acadmix.org` -> `aits`) to inject `X-Tenant` headers. Handles token refresh cycles on `401` errors transparently, queuing requests until the session is re-authenticated.

### 3. Code Runner Sandbox (`code-runner/main.py`)
- Executes student coding assignments securely.
- Applies strict sandbox restrictions on Linux: drops privileges to standard user (`1001:1001`), limits execution memory (`MAX_MEMORY_BYTES`), processes/threads (`MAX_PROCESSES`), and CPU seconds (`RLIMIT_CPU`).
- Parses source code with abstract syntax trees (AST) to block malicious Python commands (`os`, `sys`, `builtins`, `eval`, `exec`) and utilizes regex match blockers for compiled languages.
- Supports Python, JavaScript, Java, C, C++, SQL (via SQLite memory DBs), Octave/MATLAB (rendering plots to SVG/PNG), Bash, Go, and C#.

### 4. Insights Query Edge Function (`insights-query/index.ts`)
- Implements a natural language data query interface for college administrators.
- Utilizes Vertex AI (Gemini 2.5 Pro, Flash, Lite) for three-tier classification:
  - `KNOWN`: Resolves to pre-computed PostgreSQL materialized views (e.g., fee collection rates, attendance, GPAs) with parameterized filter values.
  - `SIMPLE` / `COMPLEX`: Dynamically constructs PostgreSQL SELECT statements based on schema catalogs.
  - `VAGUE`: Gracefully handles off-topic questions.
- Sanitizes generated query text and validates SELECT structures (blocking DML commands).
- Implements an automated self-healing loop: if an execution fails, Gemini Pro receives the traceback error context to generate, validate, and retry a corrected SQL query.

---

## 🔄 Core Workflows & Governance

### 1. Marks Entry, Approval, and Revision Flow
- **Faculty Entry**: Faculty members enter midterm or assignments marks in a grid layout, validating that all student grades are filled before submitting. 
- **HOD Review**: Submissions are queued in `hod_core.py` and reviewed via HOD dashboards. HODs can either approve (finalizing the marks) or reject them back to faculty with remarks.
- **Revision Tracking**: If approved marks require modification (governed by `APPROVED_MARKS_EDITING_WORKFLOW.md`):
  1. HOD clicks "Edit Approved Marks" and must supply a mandatory explanation.
  2. Marks become editable; status reverts to `draft`.
  3. A history payload containing the timestamp, editor, reason, and previous metrics is recorded in the database.
  4. Modified entries are resubmitted for HOD re-approval.

### 2. Multi-Tenant Cache Hierarchy
To prevent connection pool exhaustion and database bottlenecks during traffic surges:
- `TenantMiddleware` processes slugs in order: **In-Memory TTL Cache (2 min)** ➔ **Redis Cache (5 min)** ➔ **PostgreSQL Lookup**.
- In-memory caching ensures that even if Redis fails, the PostgreSQL database is hit at most once per tenant slug per cache window.

---

## 🎨 UI/UX Design Standards

The monorepo conforms to the styling guidelines in `STYLE_GUIDE.md`:
- **Aesthetic Principles**: Curved borders (no sharp edges, `rounded-xl` or `rounded-2xl` minimums), soft shadows, pastel palettes, and glassmorphism.
- **Tab Layouts**: Pill-shaped container layouts for navigation menus.
- **Tabs Consistency**: Active tab container shape must always match the external container shape.
- **Popups & Alerts**: No generic browser `window.alert` calls are permitted. All modal overlays use the stylized, premium `AlertModal` or `PromptModal` React components.

---

## 🛠️ Tech Debt & Roadmap Recommendations

### 1. TypeScript Migration (High Priority)
- **Status**: Frontend migration is ongoing. Pages like `App.tsx`, `LoginPage.tsx`, `HodDashboard.tsx`, and `AIInterviewSession.tsx` are fully migrated.
- **Action**: Ensure any JSX file modified in the future is immediately converted to TypeScript (`.tsx`).

### 2. Procuring Real APIs (Medium Priority)
- **Status**: Several secondary routes (e.g., specific NAAC templates, IoT webhooks, complex curriculum feedback loops) rely on structured mock parameters.
- **Action**: Gradually hook endpoints to backend PG tables via Alembic migrations.

### 3. Connection and Rate Limiter Tuning (Medium Priority)
- **Status**: Local database connection timeouts are set high to accommodate cold starts from Supabase.
- **Action**: Optimize connection pooling settings and configure Redis cache policies for heavy API routers.
