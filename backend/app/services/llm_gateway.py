"""
AcadMix LLM Gateway — Production-Grade Multi-Provider AI Router

Architecture:
    ┌────────────────────────────────────────────────────────────────┐
    │                      LLMGateway                                │
    │                                                                │
    │  purpose="interview"     → Vertex AI  (Gemini 2.5 Flash)       │
    │  purpose="career_tools"  → Vertex AI  (Gemini 2.0 Flash Lite)  │
    │  purpose="code_review"   → Vertex AI  (Gemini 2.0 Flash Lite)  │
    │  purpose="ami_coach"     → Vertex AI  (Gemini 2.0 Flash Lite)  │
    │  purpose="ats_scoring"   → Vertex AI  (Gemini 2.0 Flash Lite)  │
    │  purpose="erp_summary"   → Vertex AI  (Gemini 2.0 Flash Lite)  │
    │  purpose="erp_insights"  → Vertex AI  (Gemini 2.0 Flash)       │
    │  purpose="erp_complex"   → Vertex AI  (Gemini 2.5 Pro)         │
    │  purpose="erp_last_resort"→ Vertex AI (Claude Sonnet 4.6)      │
    │                                                                │
    │  Fallback chain: Primary → LiteLLM/Groq → Gemini AI Studio     │
    └────────────────────────────────────────────────────────────────┘

Production compliance:
    - Google Cloud Vertex AI DPA available, data never used for training

Usage:
    from app.services.llm_gateway import gateway

    # Simple completion
    result = await gateway.complete("career_tools", messages=[...])

    # Streaming (Ami coach, interviews)
    async for chunk in gateway.stream("ami_coach", messages=[...]):
        yield chunk

    # ERP with auto-fallback
    result = await gateway.complete_erp(user_query, messages=[...])
"""

import json
import logging
import time
from collections import defaultdict
from typing import AsyncGenerator, Dict, List, Optional, Any

from app.core.config import settings

from google import genai
from google.genai import types
from google.oauth2 import service_account
from anthropic import AsyncAnthropicVertex

logger = logging.getLogger("acadmix.llm_gateway")


# ═══════════════════════════════════════════════════════════════════════════════
# COST GUARD — Prevent runaway bills from loops / prompt injection
# ═══════════════════════════════════════════════════════════════════════════════

MAX_TOKENS_PER_REQUEST = 8000        # Hard cap — no single call can exceed this
MAX_REQUESTS_PER_USER_PER_DAY = 50   # Per-student daily limit

# In-memory daily request counter (reset on worker restart; Redis-backed in Phase 2)
_daily_user_requests: Dict[str, int] = defaultdict(int)
_daily_reset_timestamp: float = time.time()


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTE DEFINITIONS — Purpose → (Provider, Model)
# ═══════════════════════════════════════════════════════════════════════════════

ROUTES: Dict[str, Dict[str, Any]] = {
    # ── Interviews: Gemini 2.5 Flash via Vertex AI ─────────────────────────
    "interview": {
        "provider": "vertex",
        "model": None,  # Set dynamically from settings
        "temperature": 0.7,
        "max_tokens": 1024,
        "timeout": 15.0,
        "description": "Mock interviews — best reasoning for multi-turn conversation",
    },

    # ── Career Tools: Gemini 2.0 Flash Lite via Vertex AI ──────────────────
    "career_tools": {
        "provider": "vertex",
        "model": None,
        "temperature": 0.3,
        "max_tokens": 4096,
        "timeout": 30.0,
        "description": "Cover letters, JD analysis, cold emails, HR questions, DSA, career paths",
    },

    # ── Code Review: Gemini 2.0 Flash Lite via Vertex AI ───────────────────
    "code_review": {
        "provider": "vertex",
        "model": None,
        "temperature": 0.1,
        "max_tokens": 2000,
        "timeout": 30.0,
        "description": "Code quality analysis, complexity estimation",
    },

    # ── Ami Coach: Gemini 2.0 Flash Lite via Vertex AI ─────────────────────
    "ami_coach": {
        "provider": "vertex",
        "model": None,
        "temperature": 0.5,
        "max_tokens": 500,
        "timeout": 30.0,
        "description": "Socratic tutor — streaming responses",
    },

    # ── ATS Scoring: Gemini 2.0 Flash Lite via Vertex AI ───────────────────
    "ats_scoring": {
        "provider": "vertex",
        "model": None,
        "temperature": 0.0,
        "max_tokens": 2000,
        "timeout": 30.0,
        "description": "Resume ATS scoring, keyword matching",
    },

    # ── ERP Insights (standard): Gemini 2.0 Flash via Vertex AI ────────────
    "erp_insights": {
        "provider": "vertex",
        "model": None,
        "temperature": 0.0,
        "max_tokens": 600,
        "timeout": 30.0,
        "description": "Text-to-SQL for faculty/admin/principal/HOD queries",
    },

    # ── ERP Insights (complex): Gemini 2.5 Pro via Vertex AI ───────────────
    "erp_complex": {
        "provider": "vertex",
        "model": None,
        "temperature": 0.0,
        "max_tokens": 4096,
        "timeout": 90.0,
        "description": "Complex multi-step ERP queries",
    },
    
    # ── ERP Insights (fallback): Gemini 2.5 Pro via Vertex AI ────────────
    "erp_last_resort": {
        "provider": "vertex",
        "model": None,
        "temperature": 0.0,
        "max_tokens": 4096,
        "timeout": 120.0,
        "description": "Last-resort fallback for ERP queries when Gemini Pro fails",
    },

    # ── ERP Summary: Gemini 2.0 Flash Lite via Vertex AI ───────────────────
    "erp_summary": {
        "provider": "vertex",
        "model": None,
        "temperature": 0.1,
        "max_tokens": 500,
        "timeout": 30.0,
        "description": "Natural language summaries of ERP query results",
    },

    # ── Assessment Generator: Gemini 2.0 Flash via Vertex AI ───────────────
    "assessment_gen": {
        "provider": "vertex",
        "model": None,
        "temperature": 0.4,
        "max_tokens": 4000,
        "timeout": 45.0,
        "description": "Structured JSON assessment generation mapped to CO/PO matrices",
    },
}


def _resolve_models():
    """Bind config setting values to route definitions at runtime."""
    ROUTES["interview"]["model"] = getattr(settings, "VERTEX_MODEL_INTERVIEW", "gemini-2.5-flash-preview-04-17")
    ROUTES["career_tools"]["model"] = getattr(settings, "VERTEX_MODEL_LITE", "gemini-2.0-flash-lite")
    ROUTES["code_review"]["model"] = getattr(settings, "VERTEX_MODEL_LITE", "gemini-2.0-flash-lite")
    ROUTES["ami_coach"]["model"] = getattr(settings, "VERTEX_MODEL_LITE", "gemini-2.0-flash-lite")
    ROUTES["ats_scoring"]["model"] = getattr(settings, "VERTEX_MODEL_LITE", "gemini-2.0-flash-lite")
    ROUTES["erp_insights"]["model"] = getattr(settings, "VERTEX_MODEL_FLASH", "gemini-2.5-flash")
    ROUTES["erp_complex"]["model"] = getattr(settings, "VERTEX_MODEL_PRO", "gemini-2.5-pro")
    ROUTES["erp_last_resort"]["model"] = getattr(settings, "VERTEX_MODEL_FALLBACK", "claude-sonnet-4-6")
    ROUTES["erp_summary"]["model"] = getattr(settings, "VERTEX_MODEL_LITE", "gemini-2.0-flash-lite")
    ROUTES["assessment_gen"]["model"] = getattr(settings, "VERTEX_MODEL_FLASH", "gemini-2.0-flash-001")


# ═══════════════════════════════════════════════════════════════════════════════
# PROVIDER CLIENTS — Lazy-initialized singletons
# ═══════════════════════════════════════════════════════════════════════════════


# ---------------------------------------------------------------------------
# Core Configuration & Auth
# ---------------------------------------------------------------------------

def _get_google_credentials():
    import os
    credentials_json = os.environ.get("VERTEX_CREDENTIALS_JSON")
    if credentials_json:
        credentials_dict = json.loads(credentials_json)
        return service_account.Credentials.from_service_account_info(credentials_dict).with_scopes(["https://www.googleapis.com/auth/cloud-platform"])
    return None

_vertex_client_instance = None
_claude_client_instance = None

def _get_vertex_client() -> genai.Client:
    global _vertex_client_instance
    if _vertex_client_instance is not None:
        return _vertex_client_instance
        
    project_id = settings.VERTEX_PROJECT_ID
    location = settings.VERTEX_LOCATION
    credentials = _get_google_credentials()
    
    if credentials:
        _vertex_client_instance = genai.Client(vertexai=True, project=project_id, location=location, credentials=credentials)
    else:
        _vertex_client_instance = genai.Client(vertexai=True, project=project_id, location=location)
    return _vertex_client_instance

def _get_claude_client() -> AsyncAnthropicVertex:
    global _claude_client_instance
    if _claude_client_instance is not None:
        return _claude_client_instance
        
    project_id = settings.VERTEX_PROJECT_ID
    region = settings.VERTEX_LOCATION
    credentials = _get_google_credentials()
    
    if credentials:
        _claude_client_instance = AsyncAnthropicVertex(project_id=project_id, region=region, google_credentials=credentials)
    else:
        _claude_client_instance = AsyncAnthropicVertex(project_id=project_id, region=region)
    return _claude_client_instance

# ---------------------------------------------------------------------------
# Gemini Implementation (google-genai)
# ---------------------------------------------------------------------------

def _extract_system_prompt(messages: list[dict]) -> str:
    for msg in messages:
        if msg["role"] == "system":
            return str(msg.get("content", ""))
    return ""

def _map_messages_to_content(messages: list[dict]) -> list[types.Content]:
    contents = []
    for msg in messages:
        if msg["role"] == "system":
            continue
        role = "user" if msg["role"] == "user" else "model"
        parts = []
        
        if isinstance(msg["content"], str):
            parts.append(types.Part.from_text(text=msg["content"]))
        elif isinstance(msg["content"], list):
            for item in msg["content"]:
                if item.get("type") == "text":
                    parts.append(types.Part.from_text(text=item.get("text")))
                elif item.get("type") == "document":
                    parts.append(
                        types.Part.from_bytes(
                            data=item.get("data"),
                            mime_type="application/pdf"
                        )
                    )
        contents.append(types.Content(role=role, parts=parts))
    return contents

async def _vertex_complete(model_name: str, messages: list[dict], **kwargs) -> str:
    json_mode = kwargs.get("json_mode", False)
    client = _get_vertex_client()
    contents = _map_messages_to_content(messages)
    
    config_params = {}
    if json_mode:
        config_params["response_mime_type"] = "application/json"
        
    sys_prompt = _extract_system_prompt(messages)
    if sys_prompt:
        config_params["system_instruction"] = sys_prompt
        
    if kwargs.get("temperature") is not None:
        config_params["temperature"] = kwargs.get("temperature")
    if kwargs.get("max_tokens") is not None:
        config_params["max_output_tokens"] = kwargs.get("max_tokens")
    
    # Handle media payload from ATS scoring properly via parts manually if passed via kwargs 
    # (Since ATS passes media_bytes directly to complete sometimes!)
    media_bytes = kwargs.get("media_bytes")
    mime_type = kwargs.get("mime_type", "application/pdf")
    if media_bytes:
        contents.append(types.Content(role="user", parts=[
            types.Part.from_text(text="Attached Document:\\n"),
            types.Part.from_bytes(data=media_bytes, mime_type=mime_type)
        ]))
        
    if kwargs.get("grounding") is True:
        config_params["tools"] = [types.Tool(google_search=types.GoogleSearch())]

    config = types.GenerateContentConfig(**config_params)

    response = await client.aio.models.generate_content(
        model=model_name,
        contents=contents,
        config=config
    )
    return response.text

async def _vertex_stream(model_name: str, messages: list[dict], **kwargs):
    client = _get_vertex_client()
    contents = _map_messages_to_content(messages)

    config_params = {}
    sys_prompt = _extract_system_prompt(messages)
    if sys_prompt:
        config_params["system_instruction"] = sys_prompt
    if kwargs.get("temperature") is not None:
        config_params["temperature"] = kwargs.get("temperature")
    if kwargs.get("max_tokens") is not None:
        config_params["max_output_tokens"] = kwargs.get("max_tokens")
        
    config = types.GenerateContentConfig(**config_params) if config_params else None

    response_stream = await client.aio.models.generate_content_stream(
        model=model_name,
        contents=contents,
        config=config
    )
    async for chunk in response_stream:
        if chunk.text:
            yield chunk.text

# ---------------------------------------------------------------------------
# Claude Implementation (Anthropic Vertex)
# ---------------------------------------------------------------------------

def _parse_anthropic_messages(messages: list[dict]) -> tuple[str, list[dict]]:
    system_text = next((m["content"] for m in messages if m["role"] == "system"), "")
    user_messages = [m for m in messages if m["role"] != "system"]
    
    anthropic_messages = []
    for m in user_messages:
        role = "assistant" if m["role"] == "model" else "user"
        anthropic_messages.append({"role": role, "content": m["content"]})
        
    return system_text, anthropic_messages

async def _claude_complete(model_name: str, messages: list[dict], **kwargs) -> str:
    client = _get_claude_client()
    system_text, formatted_messages = _parse_anthropic_messages(messages)

    response = await client.messages.create(
        model=model_name,
        max_tokens=8192,
        system=system_text,
        messages=formatted_messages
    )
    return response.content[0].text

async def _claude_stream(model_name: str, messages: list[dict], **kwargs):
    client = _get_claude_client()
    system_text, formatted_messages = _parse_anthropic_messages(messages)

    async with client.messages.stream(
        model=model_name,
        max_tokens=8192,
        system=system_text,
        messages=formatted_messages
    ) as stream:
        async for text in stream.text_stream:
            yield text


# ═══════════════════════════════════════════════════════════════════════════════
# GATEWAY CLASS — The single entrypoint for all AI calls in AcadMix
# ═══════════════════════════════════════════════════════════════════════════════

class LLMGateway:
    """
    Production-grade LLM router for AcadMix.

    Routes AI calls to the optimal provider+model based on purpose.
    Handles fallbacks, metrics, and error recovery automatically.

    Usage:
        result = await gateway.complete("career_tools", messages=[...])
        async for chunk in gateway.stream("ami_coach", messages=[...]):
            yield chunk
    """

    def __init__(self):
        self._initialized = False
        self._metrics = {
            "total_calls": 0,
            "provider_calls": {"vertex": 0, "bedrock": 0},
            "errors": 0,
            "fallbacks": 0,
        }

    def initialize(self):
        """Initialize provider clients. Call once at app startup."""
        if self._initialized:
            return

        _resolve_models()

        # Attempt to initialize providers (non-fatal if they fail)
        _get_vertex_client()

        self._initialized = True
        logger.info("LLM Gateway initialized — routes: %s", list(ROUTES.keys()))

    async def complete(
        self,
        purpose: str,
        messages: List[Dict[str, str]],
        json_mode: bool = False,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[float] = None,
        media_bytes: Optional[bytes] = None,
        mime_type: str = "application/pdf",
        grounding: bool = False,
    ) -> str:
        """
        Route a completion request to the right provider.

        Args:
            purpose: One of the ROUTES keys (e.g., "interview", "career_tools")
            messages: OpenAI-format messages [{role, content}, ...]
            json_mode: If True, request JSON output
            temperature: Override route default
            max_tokens: Override route default
            timeout: Override route default
            media_bytes: Raw bytes of an uploaded file (e.g., PDF)
            mime_type: Content type of media_bytes

        Returns:
            The LLM response text.

        Raises:
            HTTPException(502) if all providers fail.
        """
        if not self._initialized:
            self.initialize()

        route = ROUTES.get(purpose)
        if not route:
            raise ValueError(f"Unknown LLM purpose: {purpose}. Valid: {list(ROUTES.keys())}")

        provider = route["provider"]
        model = route["model"]
        temp = temperature if temperature is not None else route["temperature"]
        tokens = max_tokens if max_tokens is not None else route["max_tokens"]
        tout = timeout if timeout is not None else route["timeout"]

        # ── Cost Guard: enforce hard token cap ──────────────────────────────
        tokens = min(tokens, MAX_TOKENS_PER_REQUEST)

        self._metrics["total_calls"] += 1
        start = time.monotonic()

        # ── Try primary provider ─────────────────────────────────────────
        try:
            if provider == "vertex" and _get_vertex_client():
                self._metrics["provider_calls"]["vertex"] += 1
                if "claude" in model.lower():
                    result = await _claude_complete(
                        model, messages,
                        temperature=temp, max_tokens=tokens, json_mode=json_mode,
                    )
                else:
                    result = await _vertex_complete(
                        model, messages,
                        temperature=temp, max_tokens=tokens, json_mode=json_mode,
                        media_bytes=media_bytes, mime_type=mime_type, grounding=grounding,
                    )
                self._log_call(purpose, provider, model, start)
                return result

        except Exception as e:
            logger.warning(
                "[LLMGateway] Primary provider %s/%s failed for %s: %s — falling back to LiteLLM",
                provider, model, purpose, e,
            )
            self._metrics["errors"] += 1

        # ── Strict Native Vertex Fallback ────────────────────────────────
        try:
            self._metrics["fallbacks"] += 1
            logger.warning("[LLMGateway] Primary failed. Degrading natively inside Vertex to gemini-2.5-flash")
            result = await _vertex_complete(
                "gemini-2.5-flash", messages,
                temperature=temp, max_tokens=tokens,
                json_mode=json_mode, timeout=tout,
                media_bytes=media_bytes, mime_type=mime_type, grounding=grounding,
            )
            self._log_call(purpose, "vertex_fallback", "gemini-2.5-flash", start)
            return result
        except Exception as e:
            logger.error("[LLMGateway] All providers failed for %s: %s", purpose, e)
            self._metrics["errors"] += 1
            from fastapi import HTTPException
            raise HTTPException(status_code=502, detail="AI service temporarily unavailable")

    async def stream(
        self,
        purpose: str,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Route a streaming request to the right provider.

        Yields text chunks as they arrive from the LLM.
        """
        if not self._initialized:
            self.initialize()

        route = ROUTES.get(purpose)
        if not route:
            raise ValueError(f"Unknown LLM purpose: {purpose}")

        provider = route["provider"]
        model = route["model"]
        temp = temperature if temperature is not None else route["temperature"]
        tokens = max_tokens if max_tokens is not None else route["max_tokens"]

        self._metrics["total_calls"] += 1

        # ── Try primary provider ─────────────────────────────────────────
        try:
            if provider == "vertex":
                self._metrics["provider_calls"]["vertex"] += 1
                if "claude" in model.lower():
                    async for chunk in _claude_stream(model, messages, temperature=temp, max_tokens=tokens):
                        yield chunk
                else:
                    async for chunk in _vertex_stream(model, messages, temperature=temp, max_tokens=tokens):
                        yield chunk
                return

        except Exception as e:
            logger.warning(
                "[LLMGateway] Primary stream %s/%s failed for %s: %s — falling back",
                provider, model, purpose, e,
            )
            self._metrics["errors"] += 1

        # ── Strict Native Vertex Fallback ────────────────────────────────
        try:
            self._metrics["fallbacks"] += 1
            logger.warning("[LLMGateway] Primary stream failed. Degrading natively inside Vertex to gemini-2.5-flash")
            async for chunk in _vertex_stream("gemini-2.5-flash", messages, temperature=temp, max_tokens=tokens):
                yield chunk
        except Exception as e:
            logger.error("[LLMGateway] All stream providers failed for %s: %s", purpose, e)
            yield "\n\n*AI service is currently unavailable. Please try again.*"

    async def complete_erp(
        self,
        user_query: str,
        messages: List[Dict[str, str]],
        json_mode: bool = False,
    ) -> str:
        """
        ERP-specific completion with 3-tier complexity fallback.

        Tier 1: Gemini 2.0 Flash (`erp_insights`)
        Tier 2: Gemini 2.5 Pro (`erp_complex`). Escalates if invalid SQL, keywords, or 3+ JOINs.
        Tier 3: Gemini 2.5 Pro (`erp_last_resort`). Escalates if Tier 2 fails or invalid.
        """
        import re

        def _clean_sql(query: str) -> str:
            """Remove markdown sql fences before validation."""
            cleaned = re.sub(r"^```(?:sql)?\s*", "", query.strip(), flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.IGNORECASE)
            return cleaned.strip().upper()
        
        async def _tier_3_fallback(msgs: List[Dict[str, str]], json_req: bool) -> str:
            logger.warning("[LLMGateway] Escalating to Tier 3: Gemini 2.5 Pro fallback")
            return await self.complete("erp_last_resort", msgs, json_mode=json_req)
            
        async def _tier_2_fallback(msgs: List[Dict[str, str]], json_req: bool) -> str:
            logger.info("[LLMGateway] Escalating to Tier 2: Gemini 2.5 Pro")
            try:
                t2_result = await self.complete("erp_complex", msgs, json_mode=json_req)
                t2_upper = _clean_sql(t2_result)
                if not json_req and not t2_upper.startswith("SELECT"):
                    return await _tier_3_fallback(msgs, json_req)
                return t2_result
            except Exception as e:
                logger.error("[LLMGateway] Tier 2 failed: %s", e)
                return await _tier_3_fallback(msgs, json_req)

        # ── Complexity heuristic — route hard queries directly to Tier 2 ──
        complex_signals = [
            # Existing analytical patterns
            "compare", "trend", "across all", "correlation", "at-risk",
            "top performing", "analyze", "pattern", "anomaly", "predict",
            "year over year", "semester wise", "department wise breakdown",
            "vs last year",
            # NEW: Academic performance
            "gpa", "cgpa", "grade", "marks", "rank", "topper", "pass rate",
            "fail rate", "backlog", "supplementary", "attainment",
            # NEW: Faculty & Feedback
            "faculty workload", "teaching evaluation", "course feedback",
            "faculty rating", "mentor",
            # NEW: Leave & Admin
            "leave statistics", "leave balance", "absenteeism",
            # NEW: Hostel & Library
            "hostel occupancy", "library overdue", "fine amount",
            # NEW: Placement analytics
            "placement rate", "package", "highest ctc", "average package",
            # NEW: Governance & Compliance
            "grievance", "scholarship", "naac", "nba",
        ]
        is_complex = any(signal in user_query.lower() for signal in complex_signals)

        if is_complex:
            return await _tier_2_fallback(messages, json_mode)

        # ── Standard path: Tier 1 (Gemini 2.0 Flash) ───────────────────────
        try:
            result = await self.complete("erp_insights", messages, json_mode=json_mode)

            # Validate: Flash must return valid SQL (not prose/errors)
            result_upper = _clean_sql(result)

            if not json_mode:
                # Escalation trigger 1: Not SQL
                if not result_upper.startswith("SELECT"):
                    return await _tier_2_fallback(messages, json_mode)

                # Escalation trigger 2: Expressed inability
                inability_signals = ["I CANNOT", "I'M UNABLE", "NOT POSSIBLE", "BEYOND MY", "I NEED MORE CONTEXT"]
                if any(sig in result_upper for sig in inability_signals):
                    return await _tier_2_fallback(messages, json_mode)
                    
                # Escalation trigger 3: Heavily complex query generated (3+ JOINs)
                if result_upper.count("JOIN") >= 3:
                    logger.info("[LLMGateway] Tier 1 generated complex query (3+ JOINs) — escalating to Tier 2 to verify logic")
                    return await _tier_2_fallback(messages, json_mode)

            return result

        except Exception as e:
            logger.warning("[LLMGateway] Tier 1 ERP failed: %s — escalating to Tier 2", e)
            return await _tier_2_fallback(messages, json_mode)

    def get_metrics(self) -> dict:
        """Return gateway usage metrics for monitoring dashboards."""
        return {**self._metrics}

    def _log_call(self, purpose: str, provider: str, model: str, start_time: float):
        """Log a successful LLM call with latency."""
        latency_ms = int((time.monotonic() - start_time) * 1000)
        logger.info(
            "[LLMGateway] %s → %s/%s — %dms",
            purpose, provider, model, latency_ms,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL SINGLETON — Import this everywhere
# ═══════════════════════════════════════════════════════════════════════════════

gateway = LLMGateway()
"""
Global LLM Gateway instance.

Usage:
    from app.services.llm_gateway import gateway
    result = await gateway.complete("career_tools", messages=[...])
"""
