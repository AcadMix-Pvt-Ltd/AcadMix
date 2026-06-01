"""
AcadMix — B2B Multi-Tenant Academic SaaS Platform
Main FastAPI application entry point.
"""

from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(ROOT_DIR / ".env")

# ═══════════════════════════════════════════════════════════════════════════════
# DATADOG APM — Must be initialized BEFORE other imports
# Auto-patches: FastAPI, SQLAlchemy, Redis, httpx, asyncio
# ═══════════════════════════════════════════════════════════════════════════════
import os as _os
if _os.getenv("DD_TRACE_ENABLED", "").lower() == "true" and _os.getenv("DD_API_KEY"):
    try:
        # Agentless mode: send traces directly to Datadog intake (no local agent needed)
        _dd_site = _os.getenv("DD_SITE", "us5.datadoghq.com")
        if not _os.getenv("DD_TRACE_AGENT_URL"):
            _os.environ["DD_TRACE_AGENT_URL"] = f"https://trace.agent.{_dd_site}"
        _os.environ.setdefault("DD_API_KEY", _os.getenv("DD_API_KEY", ""))

        from ddtrace import config as dd_config, patch_all, tracer
        dd_config.env = _os.getenv("DD_ENV", "development")
        dd_config.service = _os.getenv("DD_SERVICE", "acadmix-api")
        dd_config.version = _os.getenv("DD_VERSION", "2.0.0")
        # Auto-instrument all supported libraries
        patch_all(
            fastapi=True,
            sqlalchemy=True,
            redis=True,
            httpx=True,
            asyncio=True,
            logging=True,   # Inject trace IDs into log records
        )
        import logging as _log
        _log.getLogger("acadmix.main").info(
            "[datadog] APM initialized — agentless mode (service=%s, env=%s, site=%s)",
            dd_config.service, dd_config.env, _dd_site
        )
    except ImportError:
        import logging as _log
        _log.getLogger("acadmix.main").warning("[datadog] ddtrace not installed — APM disabled")


import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import redis as pyredis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import AsyncSessionLocal
from app import models
from app.core.exceptions import DomainException
from app.core.security import hash_password

logger = logging.getLogger("acadmix.main")

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_GRADE_SCALE = [
    {"min_pct": 90, "grade": "O", "points": 10},
    {"min_pct": 80, "grade": "A+", "points": 9},
    {"min_pct": 70, "grade": "A", "points": 8},
    {"min_pct": 60, "grade": "B+", "points": 7},
    {"min_pct": 50, "grade": "B", "points": 6},
    {"min_pct": 45, "grade": "C", "points": 5},
    {"min_pct": 40, "grade": "D", "points": 4},
    {"min_pct": 0, "grade": "F", "points": 0},
]

from app.core.config import settings

JWT_SECRET = settings.JWT_SECRET

cors_origins_env = settings.CORS_ORIGINS
if not cors_origins_env:
    raise ValueError("CORS_ORIGINS must be explicitly set (no wildcard allowed)")

origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
if "*" in origins:
    raise ValueError("CORS_ORIGINS cannot contain wildcard '*'. List origins explicitly.")
if os.getenv("ENVIRONMENT") == "production":
    for origin in origins:
        if not origin.startswith("https://"):
            raise ValueError(f"CORS origin '{origin}' must use HTTPS in production")


# ═══════════════════════════════════════════════════════════════════════════════
# SENTRY
# ═══════════════════════════════════════════════════════════════════════════════

def _scrub_pii(event, hint):
    """Aggressively strip PII from the event before it's sent to Sentry"""
    if "request" in event and "data" in event["request"]:
        data = event["request"]["data"]
        if isinstance(data, dict):
            for pii_key in ["email", "password", "name", "college_id"]:
                if pii_key in data:
                    data[pii_key] = "[FILTERED]"
    return event

sentry_dsn = settings.SENTRY_DSN
if sentry_dsn:
    _env = os.getenv("ENVIRONMENT", "development")
    _traces_rate = 0.02 if _env == "production" else 1.0
    sentry_sdk.init(
        dsn=sentry_dsn,
        enable_tracing=True,
        traces_sample_rate=_traces_rate,
        send_default_pii=False,
        before_send=_scrub_pii,
        integrations=[FastApiIntegration()],
        environment=_env,
    )
    logger.info("Sentry initialized (env=%s, traces=%.0f%%)", _env, _traces_rate * 100)


# ═══════════════════════════════════════════════════════════════════════════════
# STARTUP / SHUTDOWN LIFECYCLE
# ═══════════════════════════════════════════════════════════════════════════════

async def _seed_db():
    """PostgreSQL startup: schema is managed by Alembic migrations.
    Seed order matters:
      1. Upsert College (GNI) → get college.id UUID
      2. Upsert default Departments linked to college.id
      3. Upsert Admin user with college_id = college.id
    """
    async with AsyncSessionLocal() as session:
        admin_college_id_str = settings.ADMIN_COLLEGE_ID
        admin_pwd = settings.ADMIN_PASSWORD
        college_name = settings.COLLEGE_NAME

        # 1. Upsert College
        college_r = await session.execute(
            select(models.College).where(models.College.name == college_name)
        )
        college = college_r.scalars().first()
        if not college:
            college = models.College(name=college_name, domain="gnitc.ac.in")
            session.add(college)
            await session.commit()
            await session.refresh(college)
            logger.info("[startup] College '%s' seeded with id=%s", college_name, college.id)
        else:
            logger.info("[startup] College '%s' already exists (id=%s)", college_name, college.id)

        # 2. Upsert default Departments
        default_depts = [
            {"name": "Electronics & Telematics", "code": "ET"},
            {"name": "Computer Science & Engineering", "code": "CSE"},
            {"name": "Electrical & Electronics Engineering", "code": "EEE"},
            {"name": "Mechanical Engineering", "code": "ME"},
            {"name": "Civil Engineering", "code": "CE"},
            {"name": "Information Technology", "code": "IT"},
        ]
        for dept in default_depts:
            dept_r = await session.execute(
                select(models.Department).where(
                    models.Department.college_id == college.id,
                    models.Department.code == dept["code"],
                )
            )
            if not dept_r.scalars().first():
                session.add(models.Department(college_id=college.id, name=dept["name"], code=dept["code"]))
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            logger.info("[startup] Department seed race detected. Another worker handled it.")
        logger.info("[startup] Default departments ensured for %s", college_name)

        # 3. Upsert Admin user with real college FK
        if not admin_pwd:
            logger.warning("[startup] ADMIN_PASSWORD is empty — skipping admin user seed. Set it via env var.")
        else:
            result = await session.execute(
                select(models.User).where(
                    models.User.email == "admin@gni.edu"
                )
            )
            existing = result.scalars().first()
            if not existing:
                admin = models.User(
                    name="GNI Admin",
                    email="admin@gni.edu",
                    password_hash=hash_password(admin_pwd),
                    role="admin",
                    college_id=college.id,
                )
                try:
                    session.add(admin)
                    await session.flush()

                    admin_profile = models.UserProfile(
                        user_id=admin.id,
                        college_id=college.id,
                        department="Administration",
                    )
                    session.add(admin_profile)
                    await session.commit()
                    logger.info("[startup] Admin user 'admin@gni.edu' seeded with college_id=%s", college.id)
                except IntegrityError:
                    await session.rollback()
                    logger.info("[startup] Admin 'admin@gni.edu' was seeded by another worker. Skipping.")
            else:
                if existing.college_id is None:
                    existing.college_id = college.id
                    await session.commit()
                    logger.info("[startup] Fixed admin college_id: None → %s", college.id)
                else:
                    logger.info("[startup] Admin 'admin@gni.edu' already exists. Skipping seed.")

        # 4. Seed default Room Templates (global — available to all colleges)
        from app.models.hostel import RoomTemplate
        tpl_r = await session.execute(
            select(RoomTemplate).where(RoomTemplate.college_id == None)
        )
        if not tpl_r.scalars().first():
            default_templates = [
                {
                    "name": "Standard 2-Seater",
                    "total_capacity": 2,
                    "grid_rows": 1,
                    "grid_cols": 2,
                    "bed_layout": [
                        {"identifier": "A1", "row": 1, "col": 1, "category": "Window (Premium)", "is_premium": True, "base_fee": 500.00},
                        {"identifier": "A2", "row": 1, "col": 2, "category": "Door Side (Standard)", "is_premium": False, "base_fee": 0.00},
                    ],
                },
                {
                    "name": "Standard 4-Seater",
                    "total_capacity": 4,
                    "grid_rows": 2,
                    "grid_cols": 2,
                    "bed_layout": [
                        {"identifier": "A1", "row": 1, "col": 1, "category": "Window-Upper (Premium)", "is_premium": True, "base_fee": 500.00},
                        {"identifier": "A2", "row": 1, "col": 2, "category": "Aisle-Upper (Standard)", "is_premium": False, "base_fee": 0.00},
                        {"identifier": "B1", "row": 2, "col": 1, "category": "Window-Lower (Premium)", "is_premium": True, "base_fee": 500.00},
                        {"identifier": "B2", "row": 2, "col": 2, "category": "Aisle-Lower (Standard)", "is_premium": False, "base_fee": 0.00},
                    ],
                },
                {
                    "name": "6-Seater Dorm",
                    "total_capacity": 6,
                    "grid_rows": 3,
                    "grid_cols": 2,
                    "bed_layout": [
                        {"identifier": "A1", "row": 1, "col": 1, "category": "Window-Top (Premium)", "is_premium": True, "base_fee": 750.00},
                        {"identifier": "A2", "row": 1, "col": 2, "category": "Aisle-Top (Standard)", "is_premium": False, "base_fee": 0.00},
                        {"identifier": "B1", "row": 2, "col": 1, "category": "Window-Mid (Premium)", "is_premium": True, "base_fee": 500.00},
                        {"identifier": "B2", "row": 2, "col": 2, "category": "Aisle-Mid (Standard)", "is_premium": False, "base_fee": 0.00},
                        {"identifier": "C1", "row": 3, "col": 1, "category": "Window-Ground", "is_premium": False, "base_fee": 200.00},
                        {"identifier": "C2", "row": 3, "col": 2, "category": "Aisle-Ground", "is_premium": False, "base_fee": 0.00},
                    ],
                },
            ]
            for tpl in default_templates:
                session.add(RoomTemplate(
                    college_id=None,  # Global template
                    name=tpl["name"],
                    total_capacity=tpl["total_capacity"],
                    grid_rows=tpl["grid_rows"],
                    grid_cols=tpl["grid_cols"],
                    bed_layout=tpl["bed_layout"],
                ))
            try:
                await session.commit()
                logger.info("[startup] Seeded %d default room templates", len(default_templates))
            except IntegrityError:
                await session.rollback()
                logger.info("[startup] Room template seed race detected. Another worker handled it.")

        # ── Demo / Quick-Login Users ──────────────────────────────────────────
        # These are ONLY created when SEED_DEMO_USERS=true (dev/staging).
        # In production, this flag must remain False to prevent trivial-password
        # test accounts from existing.
        if not settings.SEED_DEMO_USERS:
            logger.info("[startup] SEED_DEMO_USERS=false — skipping demo account seeding.")
        else:
            logger.warning("[startup] SEED_DEMO_USERS=true — seeding demo accounts. DO NOT use in production!")

            # 5. Seed Warden user for quick-login demo
            warden_r = await session.execute(
                select(models.User).where(models.User.email == "WARDEN001")
            )
            if not warden_r.scalars().first():
                warden = models.User(
                    name="Rajesh Kumar",
                    email="WARDEN001",
                    password_hash=hash_password("warden123"),
                    role="warden",
                    college_id=college.id,
                )
                try:
                    session.add(warden)
                    await session.flush()
                    warden_profile = models.UserProfile(
                        user_id=warden.id,
                        college_id=college.id,
                        department="Hostel Administration",
                    )
                    session.add(warden_profile)
                    await session.commit()
                    logger.info("[startup] Warden user 'WARDEN001' seeded with college_id=%s", college.id)
                except IntegrityError:
                    await session.rollback()
                    logger.info("[startup] Warden 'WARDEN001' was seeded by another worker. Skipping.")
            else:
                logger.info("[startup] Warden 'WARDEN001' already exists. Skipping seed.")

            # 6. Seed mock Hostels, Rooms & Beds for testing
            from app.models.hostel import Hostel, Room, Bed
            hostel_check = await session.execute(
                select(Hostel).where(Hostel.college_id == college.id).limit(1)
            )
            if not hostel_check.scalars().first():
                # Re-fetch warden
                warden_q = await session.execute(
                    select(models.User).where(models.User.email == "WARDEN001")
                )
                warden_user = warden_q.scalars().first()
                warden_id = warden_user.id if warden_user else None

                # Fetch templates for bed layout
                tpl_q = await session.execute(
                    select(RoomTemplate).where(RoomTemplate.college_id == None).order_by(RoomTemplate.total_capacity)
                )
                all_templates = tpl_q.scalars().all()
                tpl_2 = next((t for t in all_templates if t.total_capacity == 2), None)
                tpl_4 = next((t for t in all_templates if t.total_capacity == 4), None)
                tpl_6 = next((t for t in all_templates if t.total_capacity == 6), None)

                mock_hostels = [
                    {"name": "Boys Block-A", "gender_type": "male", "total_floors": 3, "template": tpl_4},
                    {"name": "Girls Block-B", "gender_type": "female", "total_floors": 2, "template": tpl_2},
                ]

                total_beds_created = 0
                for h_data in mock_hostels:
                    tpl = h_data["template"]
                    if not tpl:
                        continue

                    hostel = Hostel(
                        college_id=college.id,
                        name=h_data["name"],
                        gender_type=h_data["gender_type"],
                        total_floors=h_data["total_floors"],
                        warden_id=warden_id,
                    )
                    session.add(hostel)
                    await session.flush()

                    beds_in_hostel = 0
                    for floor_num in range(1, h_data["total_floors"] + 1):
                        for room_idx in range(1, 4):  # 3 rooms per floor
                            room_number = f"{h_data['name'][0]}{floor_num}{room_idx:02d}"  # B101, B102, G101...
                            room = Room(
                                college_id=college.id,
                                hostel_id=hostel.id,
                                template_id=tpl.id,
                                room_number=room_number,
                                floor=floor_num,
                                capacity=tpl.total_capacity,
                            )
                            session.add(room)
                            await session.flush()

                            for bed_def in tpl.bed_layout:
                                bed = Bed(
                                    college_id=college.id,
                                    room_id=room.id,
                                    bed_identifier=bed_def["identifier"],
                                    grid_row=bed_def["row"],
                                    grid_col=bed_def["col"],
                                    category=bed_def.get("category", "Standard"),
                                    is_premium=bed_def.get("is_premium", False),
                                    selection_fee=bed_def.get("base_fee", 0.0),
                                    status="AVAILABLE",
                                )
                                session.add(bed)
                                beds_in_hostel += 1

                    hostel.total_capacity = beds_in_hostel
                    total_beds_created += beds_in_hostel

                try:
                    await session.commit()
                    logger.info("[startup] Seeded %d mock hostels with %d total beds", len(mock_hostels), total_beds_created)
                except IntegrityError:
                    await session.rollback()
                    logger.info("[startup] Mock hostel seed race detected. Skipping.")
            else:
                logger.info("[startup] Hostels already exist. Skipping mock seed.")

            # 7. Seed Transport Admin user for quick-login demo
            transport_r = await session.execute(
                select(models.User).where(models.User.email == "TRANSPORT001")
            )
            if not transport_r.scalars().first():
                transport_user = models.User(
                    name="Suresh Reddy",
                    email="TRANSPORT001",
                    password_hash=hash_password("transport123"),
                    role="transport_admin",
                    college_id=college.id,
                )
                try:
                    session.add(transport_user)
                    await session.flush()
                    transport_profile = models.UserProfile(
                        user_id=transport_user.id,
                        college_id=college.id,
                        department="Transport Administration",
                    )
                    session.add(transport_profile)
                    await session.commit()
                    logger.info("[startup] Transport Admin user 'TRANSPORT001' seeded with college_id=%s", college.id)
                except IntegrityError:
                    await session.rollback()
                    logger.info("[startup] Transport Admin 'TRANSPORT001' was seeded by another worker. Skipping.")
            else:
                logger.info("[startup] Transport Admin 'TRANSPORT001' already exists. Skipping seed.")

            # 8. Seed Librarian user for quick-login demo
            librarian_r = await session.execute(
                select(models.User).where(models.User.email == "LIBRARIAN001")
            )
            if not librarian_r.scalars().first():
                librarian_user = models.User(
                    name="Meena Sharma",
                    email="LIBRARIAN001",
                    password_hash=hash_password("librarian123"),
                    role="librarian",
                    college_id=college.id,
                )
                try:
                    session.add(librarian_user)
                    await session.flush()
                    librarian_profile = models.UserProfile(
                        user_id=librarian_user.id,
                        college_id=college.id,
                        department="Library",
                    )
                    session.add(librarian_profile)
                    await session.commit()
                    logger.info("[startup] Librarian user 'LIBRARIAN001' seeded with college_id=%s", college.id)
                except IntegrityError:
                    await session.rollback()
                    logger.info("[startup] Librarian 'LIBRARIAN001' was seeded by another worker. Skipping.")
            else:
                logger.info("[startup] Librarian 'LIBRARIAN001' already exists. Skipping seed.")

            # 9. Seed Security Guard user for quick-login demo
            security_r = await session.execute(
                select(models.User).where(models.User.email == "SECURITY001")
            )
            if not security_r.scalars().first():
                security_user = models.User(
                    name="Ravi Shankar",
                    email="SECURITY001",
                    password_hash=hash_password("security123"),
                    role="security",
                    college_id=college.id,
                )
                try:
                    session.add(security_user)
                    await session.flush()
                    security_profile = models.UserProfile(
                        user_id=security_user.id,
                        college_id=college.id,
                        department="Campus Security",
                    )
                    session.add(security_profile)
                    await session.commit()
                    logger.info("[startup] Security user 'SECURITY001' seeded with college_id=%s", college.id)
                except IntegrityError:
                    await session.rollback()
                    logger.info("[startup] Security 'SECURITY001' was seeded by another worker. Skipping.")
            else:
                logger.info("[startup] Security 'SECURITY001' already exists. Skipping seed.")

            # 10. Seed Finance Office users for quick-login demo
            finance_demo_users = [
                {
                    "email": "CASHIER001",
                    "name": "Anita Rao",
                    "password": "cashier123",
                    "role": "cashier",
                    "department": "Accounts - Cash Counter",
                },
                {
                    "email": "FINANCE001",
                    "name": "Vikram Mehta",
                    "password": "finance123",
                    "role": "finance_officer",
                    "department": "Finance Office",
                },
            ]
            for demo in finance_demo_users:
                finance_r = await session.execute(
                    select(models.User).where(models.User.email == demo["email"])
                )
                if not finance_r.scalars().first():
                    finance_user = models.User(
                        name=demo["name"],
                        email=demo["email"],
                        password_hash=hash_password(demo["password"]),
                        role=demo["role"],
                        college_id=college.id,
                    )
                    try:
                        session.add(finance_user)
                        await session.flush()
                        finance_profile = models.UserProfile(
                            user_id=finance_user.id,
                            college_id=college.id,
                            department=demo["department"],
                        )
                        session.add(finance_profile)
                        await session.commit()
                        logger.info("[startup] Finance demo user '%s' seeded with college_id=%s", demo["email"], college.id)
                    except IntegrityError:
                        await session.rollback()
                        logger.info("[startup] Finance demo user '%s' was seeded by another worker. Skipping.", demo["email"])
                else:
                    logger.info("[startup] Finance demo user '%s' already exists. Skipping seed.", demo["email"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler (replaces deprecated @app.on_event)."""
    import asyncio
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            if settings.SEED_ON_STARTUP:
                await _seed_db()
            else:
                logger.info("[startup] SEED_ON_STARTUP=False — bypassing database seed step.")
            break
        except Exception as e:
            if attempt == max_retries:
                logger.critical("[startup] FATAL: Could not connect to database after %d attempts: %s", max_retries, e)
                raise
            wait = 2 ** attempt
            logger.warning("[startup] DB connection failed (attempt %d/%d), retrying in %ds... (%s)", attempt, max_retries, wait, e)
            await asyncio.sleep(wait)
    
    # ── Redis Health Check ────────────────────────────────────────────────
    import app.core.security as sec
    if sec.redis_client:
        try:
            await sec.redis_client.ping()
            logger.info("[startup] Redis connected successfully.")
        except Exception as e:
            logger.warning("[startup] Redis unavailable (%s). Disabling Redis globally to prevent API latency.", e)
            sec.redis_client = None

    # ── GPU Health Checker (Phase 2 — self-hosted vLLM) ───────────────────
    from app.services.ai_service import gpu_health
    await gpu_health.start_background_loop()

    # ── WebSocket Redis Pub/Sub Subscriber ────────────────────────────────
    # Must start here (at worker boot), NOT lazily on first WS connection.
    # This ensures every Gunicorn/Uvicorn worker subscribes to Redis
    # immediately, so broadcasts reach all workers even if some have zero
    # WebSocket clients connected at the time of the broadcast.
    from app.routers.websocket import manager as ws_manager
    await ws_manager.start_subscriber()
    
    yield
    # ── Shutdown cleanup ──────────────────────────────────────────────────
    import app.core.security as sec
    if sec.redis_client:
        try:
            await sec.redis_client.aclose()
            logger.info("[shutdown] Redis client closed")
        except Exception as e:
            logger.warning("[shutdown] Failed to close Redis client: %s", e)
            
    # Stop WebSocket Redis subscriber
    await ws_manager.stop_subscriber()
    logger.info("[shutdown] WebSocket Redis subscriber stopped")
    # Stop GPU health checker
    gpu_health.stop()
    logger.info("[shutdown] GPU health checker stopped")
    # Close global HTTP clients to prevent connection leaks
    try:
        from app.routers.code_execution import _http_client as code_http
        await code_http.aclose()
        logger.info("[shutdown] code_execution HTTP client closed")
    except Exception as e:
        logger.warning("[shutdown] Failed to close code_execution HTTP client: %s", e)
    try:
        from app.routers.challenges import _http_client as challenge_http
        await challenge_http.aclose()
        logger.info("[shutdown] challenges HTTP client closed")
    except Exception as e:
        logger.warning("[shutdown] Failed to close challenges HTTP client: %s", e)


# ═══════════════════════════════════════════════════════════════════════════════
# APPLICATION FACTORY
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AcadMix API",
    description="Multi-Tenant Academic Management SaaS Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "ngrok-skip-browser-warning", "X-Tenant"],
    max_age=3600,
)

# ─── Request ID Correlation ───────────────────────────────────────────────────────
from app.core.response import RequestIdMiddleware, ResponseEnvelopeMiddleware  # noqa: E402
app.add_middleware(RequestIdMiddleware)

# ─── Response Envelope (Phase 2) ──────────────────────────────────────────────
# Wraps flat JSON responses in {"data": <payload>, "error": null}.
# Bucket A routers set X-Envelope-Applied header to skip wrapping.
# Bucket C paths (health, ws, webhooks) excluded by prefix.
app.add_middleware(ResponseEnvelopeMiddleware)

# ─── Prometheus Metrics ───────────────────────────────────────────────────────
from app.core.metrics import PrometheusMiddleware, metrics_endpoint  # noqa: E402
app.add_middleware(PrometheusMiddleware)
app.add_route("/metrics", metrics_endpoint)

# ─── Tenant Middleware ──────────────────────────────────────────────────────────
from app.core.tenant_middleware import TenantMiddleware  # noqa: E402
app.add_middleware(TenantMiddleware)

# ─── Rate Limiter ─────────────────────────────────────────────────────────────
from app.core.limiter import limiter, TenantRateLimitMiddleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Tenant-Level Rate Limiter (Noisy Neighbor Protection) ────────────────────
app.add_middleware(TenantRateLimitMiddleware)

# ─── Domain Exception Handler ────────────────────────────────────────────────────
@app.exception_handler(DomainException)
async def domain_exception_handler(request: Request, exc: DomainException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "data": None,
            "error": exc.message,
            "meta": {"details": exc.details} if exc.details else {},
        },
    )

# ─── API Router ───────────────────────────────────────────────────────────────
import os
os.makedirs("uploads/proctoring", exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

from app.api.v1.router import api_router  # noqa: E402

# Mount at /api/v1 (canonical) + /api (backwards-compatible alias)
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")
# Touch for reload
