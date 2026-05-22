import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "AcadMix API"
    DEBUG_MODE: bool = False  # Must be explicitly enabled via env var in dev
    CORS_ORIGINS: str = ""
    CODE_RUNNER_URL: str = "https://acadmix-code-runner.fly.dev"
    CODE_RUNNER_TOKEN: str = "acadmix_dev_runner_token_8x19z"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/acadmix?prepared_statement_cache_size=0"
    ADMIN_DATABASE_URL: str = "" # Set in prod for direct PgBouncer bypass migrations

    # External Services
    REDIS_URL: str = "redis://localhost:6379"
    SENTRY_DSN: str = ""
    
    # Security
    JWT_SECRET: str
    PRE_ENROLL_JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"

    # Admin Defaults
    ADMIN_COLLEGE_ID: str = "A001"
    ADMIN_PASSWORD: str # MUST be set via env var. Pydantic raises if missing.
    COLLEGE_NAME: str = "Guru Nanak Institutions Technical Campus"
    SEED_ON_STARTUP: bool = False # Set True ONLY in dev/staging to seed database on startup
    SEED_DEMO_USERS: bool = False  # Set True ONLY in dev/staging to seed quick-login test accounts

    # External Integrations
    LLM_REVIEW_MODEL: str = "gemini/gemini-2.5-flash"       # Legacy fallback — kept for hot standby
    INTERVIEW_LLM_MODEL: str = "gemini/gemini-2.5-flash"     # Legacy fallback — kept for hot standby
    RESUME_LLM_MODEL: str = "gemini/gemini-2.5-flash"        # Legacy fallback — kept for hot standby
    GROQ_API_KEY: str = ""                                   # Legacy fallback — kept for hot standby
    ELEVENLABS_API_KEY: str = ""

    # ── Vertex AI (Production Single Provider) ───────────────────────
    # Google Cloud DPA available, data never used for training, SLA-backed
    VERTEX_PROJECT_ID: str = ""                  # Google Cloud project ID (empty = Vertex disabled)
    VERTEX_LOCATION: str = "asia-south1"         # Mumbai — lowest latency from India + data residency
    VERTEX_CREDENTIALS_PATH: str = ""            # Path to service account JSON (local dev)
    GOOGLE_APPLICATION_CREDENTIALS_JSON: str = "" # Full JSON string of service account (Render / ephemeral containers)
    VERTEX_CREDENTIALS_JSON: str = ""            # Legacy fallback variable name
    
    # ── Vertex AI strict model definitions ───────────────────────
    VERTEX_MODEL_INTERVIEW: str = "gemini-2.5-flash"                  # Interviews
    VERTEX_MODEL_LITE: str = "gemini-2.5-flash-lite"                  # Tools/Review/Ami/ATS
    VERTEX_MODEL_FLASH: str = "gemini-2.5-flash"                      # ERP Standard / ATS Heavy
    VERTEX_MODEL_PRO: str = "gemini-2.5-pro"                          # ERP Complex
    VERTEX_MODEL_FALLBACK: str = "gemini-2.5-pro"                     # ERP Fallback (Gemini instead of Claude)
    
    # Self-Hosted vLLM (Phase 2 — activate at 10K+ students)
    # Set VLLM_BASE_URL to enable self-hosted inference (e.g. "https://gpu.acadmix.internal/v1")
    # When empty, all routing stays on Groq API (Phase 1 behavior)
    VLLM_BASE_URL: str = ""              # vLLM OpenAI-compatible endpoint
    VLLM_API_KEY: str = "dummy"          # vLLM doesn't require auth, but LiteLLM needs a value
    VLLM_MODEL_SMALL: str = "meta-llama/Llama-3.2-3B-Instruct"    # Tier 1 — concepts
    VLLM_MODEL_LARGE: str = "meta-llama/Llama-3.3-70B-Instruct-AWQ"  # Tier 2 — debugging/code
    VLLM_HEALTH_CHECK_INTERVAL: int = 30  # Seconds between GPU health pings
    
    MOCK_INTERVIEW_MONTHLY_QUOTA: int = 5
    WHATSAPP_APP_SECRET: str = ""  # Must be set via env var in production
    WHATSAPP_VERIFY_TOKEN: str = ""  # Must be set via env var in production
    WHATSAPP_PHONE_NUMBER_ID: str = ""  # Meta Cloud API phone number ID
    WHATSAPP_ACCESS_TOKEN: str = ""  # Meta Cloud API bearer token
    WHATSAPP_MOCK_MODE: bool = True  # True = log to console instead of sending

    # IoT & Transactional Bot
    IOT_WEBHOOK_SECRET: str = ""            # Shared secret for IoT device auth headers
    WALLET_LOW_BALANCE_THRESHOLD: float = 50.0  # ₹ threshold for low-balance alerts
    ATTENDANCE_DIGEST_HOUR: int = 18        # 6 PM — daily attendance digest cron
    FEE_PORTAL_BASE_URL: str = "https://acadmix.org/fees"  # Deep-link base for payment CTAs

    # Transport Management
    TRANSPORT_SPEED_LIMIT_KMH: int = 80     # Speed violation threshold
    TRANSPORT_GEOFENCE_RADIUS_M: int = 100  # Default geofence radius (meters)
    TRANSPORT_DELAY_THRESHOLD_MIN: int = 5  # Delay alert threshold (minutes)
    FIREBASE_CREDENTIALS_PATH: str = ""     # Path to firebase-credentials.json (empty = mock mode)

    # Object Storage (Cloudflare R2 — S3-compatible)
    R2_ACCOUNT_ID: str = "a163b03744c05e628b6d500350b4a668"
    R2_ACCESS_KEY_ID: str = ""            # R2 API token access key
    R2_SECRET_ACCESS_KEY: str = ""        # R2 API token secret key
    R2_BUCKET_NAME: str = "acadmix-vault"
    R2_PUBLIC_URL: str = ""               # Public bucket URL (e.g. https://files.acadmix.org)
    STORAGE_MAX_FILE_SIZE_MB: int = 2     # Max upload size in MB
    STORAGE_MAX_RESUMES_PER_STUDENT: int = 3

    # Payments (Razorpay)
    RAZORPAY_KEY_ID: str = ""               # Razorpay key ID (empty = payments disabled)
    RAZORPAY_KEY_SECRET: str = ""           # Razorpay key secret

    # Datadog APM (Observability)
    DD_API_KEY: str = ""                    # Datadog API key (empty = Datadog disabled)
    DD_SITE: str = "us5.datadoghq.com"     # Datadog site region
    DD_SERVICE: str = "acadmix-api"        # Service name in APM dashboard
    DD_ENV: str = "development"            # Environment tag (development | staging | production)
    DD_VERSION: str = "2.0.0"             # Application version tag
    DD_TRACE_ENABLED: bool = False         # Must be explicitly enabled via env var

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

# Instantiate global settings object
settings = Settings()
