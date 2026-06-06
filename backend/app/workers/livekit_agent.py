import asyncio
import logging
import json
import os
import re
import tempfile
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import AutoSubscribe, JobContext, AgentSession, WorkerOptions, cli, llm
from livekit.agents.llm import StopResponse
from livekit.agents.voice import Agent
from livekit.plugins import cartesia, google, deepgram, silero

from app.core.config import settings
from app import models
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

# Parse Google credentials for STT (Cloud Speech API uses service account)
_vertex_creds_info = None
_vertex_creds_file = None
if hasattr(settings, "VERTEX_CREDENTIALS_JSON") and settings.VERTEX_CREDENTIALS_JSON:
    try:
        _vertex_creds_info = json.loads(settings.VERTEX_CREDENTIALS_JSON)
    except json.JSONDecodeError:
        pass
    # Also write to file for GOOGLE_APPLICATION_CREDENTIALS fallback
    _fd, _vertex_creds_file = tempfile.mkstemp(suffix=".json")
    with os.fdopen(_fd, 'w') as f:
        f.write(settings.VERTEX_CREDENTIALS_JSON)
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _vertex_creds_file

# Gemini API key for the LLM plugin (loaded by dotenv but not in Settings model)
_gemini_api_key = os.environ.get("GEMINI_API_KEY", "")

logger = logging.getLogger("acadmix.livekit_agent")

NO_RESPONSE_DELAY_SECONDS = 15.0
NO_RESPONSE_PROMPT_1 = "I am still listening. Please answer when you are ready."
NO_RESPONSE_END_MESSAGE = (
    "I still have not heard a response, so I will end the mock interview now. "
    "You can start another session when you are ready."
)

# Filler / non-answer fragments that should NOT trigger Gemini
_FILLER_WORDS = frozenset({
    "so", "ok", "okay", "hmm", "hm", "um", "uh", "yeah", "yes", "no",
    "yep", "nope", "right", "sure", "ah", "oh", "like", "well", "and",
    "but", "mm", "mhm", "mmm", "huh", "alright", "actually", "basically",
})


def is_meaningful_candidate_answer(text: str) -> bool:
    """Return True only if *text* looks like a real candidate answer.

    Rejects empty/near-empty turns, single filler words, and 1-2 word
    non-answers so that Gemini is not invoked on noise.
    """
    cleaned = re.sub(r"\s+", " ", (text or "")).strip().lower()
    if not cleaned:
        return False
    words = cleaned.split()
    if len(words) <= 2 and all(w.strip(".,!?") in _FILLER_WORDS for w in words):
        return False
    return True


MAX_DEEPGRAM_KEYTERMS = 80
COMMON_DEEPGRAM_KEYTERMS = (
    "AcadMix",
    "SDE",
    "SDE-1",
    "software developer",
    "software engineering",
    "data structures",
    "algorithms",
    "object oriented programming",
    "OOP",
    "operating system",
    "DBMS",
    "database management system",
    "computer networks",
    "REST API",
    "CI/CD",
    "GitHub",
    "Git",
    "Docker",
    "Kubernetes",
    "OpenCV",
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "FastAPI",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "SQL",
    "NoSQL",
    "machine learning",
    "artificial intelligence",
    "computer vision",
    "Vertex AI",
    "Gemini",
    "LLM",
    "STT",
    "TTS",
    "VAD",
    "LiveKit",
    "Deepgram",
    "Cartesia",
    "Silero",
)
KEYTERM_STOPWORDS = {
    "and",
    "are",
    "for",
    "from",
    "with",
    "this",
    "that",
    "the",
    "was",
    "were",
    "your",
    "resume",
    "project",
    "projects",
    "experience",
    "education",
    "skills",
    "college",
    "university",
}
KEYTERM_PATTERN = re.compile(
    r"\b(?:[A-Z][A-Za-z0-9+#./-]{1,}(?:\s+[A-Z][A-Za-z0-9+#./-]{1,}){0,3}|"
    r"[A-Za-z]+(?:\+\+|#)|[A-Za-z0-9]+(?:[./-][A-Za-z0-9]+)+)\b"
)


def _clean_keyterm(value: str) -> str | None:
    cleaned = re.sub(r"\s+", " ", str(value or "")).strip(" \t\r\n,.;:()[]{}<>|")
    if len(cleaned) < 2 or len(cleaned) > 64:
        return None
    if cleaned.lower() in KEYTERM_STOPWORDS or cleaned.isdigit():
        return None
    return cleaned


def build_deepgram_keyterms(
    *,
    target_role: str | None,
    company: str,
    interview_type: str,
    resume_context: str,
) -> list[str]:
    keyterms: list[str] = []
    seen: set[str] = set()

    def add(value: str):
        if len(keyterms) >= MAX_DEEPGRAM_KEYTERMS:
            return
        cleaned = _clean_keyterm(value)
        if not cleaned:
            return
        normalized = cleaned.lower()
        if normalized in seen:
            return
        seen.add(normalized)
        keyterms.append(cleaned)

    for value in (target_role, company, interview_type):
        if value:
            add(value)

    # 1. Guarantee all COMMON core terms are included first (takes ~46 slots)
    for term in COMMON_DEEPGRAM_KEYTERMS:
        add(term)

    # 2. Extract specific technical terms from the resume to fill remaining slots (up to 80)
    resume_sample = (resume_context or "")[:6000]
    from collections import Counter
    resume_terms = []
    for match in KEYTERM_PATTERN.finditer(resume_sample):
        cleaned = _clean_keyterm(match.group(0))
        if cleaned:
            resume_terms.append(cleaned)
            
    # Add most frequent resume terms first
    term_counts = Counter(resume_terms)
    for term, _ in term_counts.most_common():
        if len(keyterms) >= MAX_DEEPGRAM_KEYTERMS:
            break
        add(term)

    return keyterms


class NoResponseController:
    """Manages the 2-stage no-response flow.

    Stage 0 (default): After assistant speech finishes playing, wait 15 s.
        → If silence, speak ``NO_RESPONSE_PROMPT_1`` ("I am still listening…"),
          then move to Stage 1.
    Stage 1: Wait another 15 s.
        → If silence, speak ``NO_RESPONSE_END_MESSAGE`` and shut down.

    Any *meaningful* user speech at any stage cancels/resets the flow.
    Non-meaningful fragments ("so", "hmm") restart the 15 s timer
    for the *current* stage via ``note_non_answer_fragment()``.
    """

    def __init__(self, *, session: AgentSession, ctx: JobContext):
        self._session = session
        self._ctx = ctx
        self._task: asyncio.Task | None = None
        self._generation = 0
        self._stage = 0  # 0 = first wait, 1 = after first nudge
        self._speaking_nudge = False  # True while a nudge is being spoken
        self._ignore_next_speech_events = 0
        self._closed = False
        self._user_speech_active = False

    # ── public API ────────────────────────────────────────────────────────

    def ignore_next_speech_event(self) -> bool:
        if self._ignore_next_speech_events <= 0:
            return False
        self._ignore_next_speech_events -= 1
        return True

    def watch_assistant_speech(self, speech_handle):
        """Called when a *real* assistant turn (not a nudge) starts."""
        if self._closed or self._speaking_nudge:
            return
        self._generation += 1
        self._stage = 0
        generation = self._generation
        self._cancel_task()
        self._task = asyncio.create_task(
            self._start_after_playout(speech_handle, generation)
        )

    def note_user_speech_started(self):
        """User started speaking – cancel any pending reminder."""
        if self._closed:
            return
        self._user_speech_active = True
        self._generation += 1
        self._cancel_task()

    def note_user_speech_stopped(self):
        """User stopped speaking – do NOT restart the timer here.

        We wait for ``on_user_turn_completed`` to verify meaningfulness.
        """
        if self._closed or not self._user_speech_active:
            return
        self._user_speech_active = False
        # Intentionally do NOT restart the reminder flow here.
        # The timer will restart from ``note_user_turn_completed``
        # (meaningful answer → reset to stage 0) or
        # ``note_non_answer_fragment`` (filler → restart current stage).

    def note_user_turn_completed(self):
        """Called when a *meaningful* user turn is finalized.

        Resets the stage to 0 and cancels any pending task so that the
        next assistant response re-arms the flow via ``watch_assistant_speech``.
        """
        if self._closed:
            return
        self._user_speech_active = False
        self._stage = 0
        self._generation += 1
        self._cancel_task()

    def note_non_answer_fragment(self):
        """Called when the user uttered a filler / non-meaningful fragment.

        Restarts the 15 s timer for the *current* stage so that the flow
        is not permanently stalled by fillers.
        """
        if self._closed:
            return
        self._user_speech_active = False
        self._generation += 1
        generation = self._generation
        self._cancel_task()
        self._task = asyncio.create_task(
            self._run_reminder_flow(generation)
        )

    def close(self):
        self._closed = True
        self._generation += 1
        self._cancel_task()

    # ── internals ─────────────────────────────────────────────────────────

    def _cancel_task(self):
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = None

    async def _start_after_playout(self, speech_handle, generation: int):
        """Wait for the assistant speech to finish, then start the timer."""
        try:
            await speech_handle.wait_for_playout()
            if speech_handle.interrupted or not self._is_current(generation):
                return
            await self._run_reminder_flow(generation)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("No-response timer failed after assistant speech")

    async def _run_reminder_flow(self, generation: int):
        """Execute the 2-stage no-response reminder logic."""
        try:
            # ── Stage 0 → wait 15 s then nudge ────────────────────────────
            if self._stage == 0:
                await asyncio.sleep(NO_RESPONSE_DELAY_SECONDS)
                if not self._is_current(generation):
                    return

                nudge = self._say_nudge(NO_RESPONSE_PROMPT_1)
                await nudge.wait_for_playout()
                if nudge.interrupted or not self._is_current(generation):
                    return
                self._stage = 1

            # ── Stage 1 → wait 15 s then close ───────────────────────────
            await asyncio.sleep(NO_RESPONSE_DELAY_SECONDS)
            if not self._is_current(generation):
                return

            end_msg = self._say_nudge(NO_RESPONSE_END_MESSAGE)
            await end_msg.wait_for_playout()
            if end_msg.interrupted or not self._is_current(generation):
                return

            self._closed = True
            self._ctx.shutdown(
                "mock interview ended – no response after reminder"
            )
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("No-response reminder flow failed")

    def _say_nudge(self, message: str):
        """Speak a nudge/closure message without re-triggering watch."""
        self._speaking_nudge = True
        self._ignore_next_speech_events += 1
        handle = self._session.say(message, allow_interruptions=True)
        # Reset the flag after the event loop has processed the speech_created event
        asyncio.get_event_loop().call_soon(self._clear_nudge_flag)
        return handle

    def _clear_nudge_flag(self):
        self._speaking_nudge = False

    def _is_current(self, generation: int) -> bool:
        return (
            not self._closed
            and generation == self._generation
            and not self._user_speech_active
        )


class InterviewAgent(Agent):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.no_response_controller: NoResponseController | None = None

    async def on_user_turn_completed(
        self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage
    ) -> None:
        user_text = new_message.text_content if new_message else ""
        if not is_meaningful_candidate_answer(user_text):
            logger.info(
                "Non-meaningful user turn suppressed: %r", user_text
            )
            if self.no_response_controller:
                self.no_response_controller.note_non_answer_fragment()
            raise StopResponse()

        # Meaningful answer – reset the no-response flow
        if self.no_response_controller:
            self.no_response_controller.note_user_turn_completed()


# ── Database helpers (use NullPool to avoid asyncio cross-loop issues) ────────

def _make_session():
    """Create a fresh async session scoped to the current event loop."""
    from database import DATABASE_URL
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    return async_sessionmaker(bind=engine)()


async def get_interview_context(interview_id: str):
    async with _make_session() as session:
        stmt = select(models.MockInterview).where(models.MockInterview.id == interview_id)
        result = await session.execute(stmt)
        return result.scalars().first()


# ── Entrypoint ────────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext):
    # Connect to the LiveKit room (audio only)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    interview_id = ctx.room.name
    interview = await get_interview_context(interview_id)

    if not interview:
        logger.error(f"Interview {interview_id} not found in DB")
        return

    interview_type = interview.interview_type or "technical"
    difficulty = interview.difficulty or "medium"
    company = interview.target_company or "the target company"
    resume_context = interview.resume_context or "No resume context was provided."

    # Build system instructions
    system_prompt = (
        "You are AcadMix Intelligence, a professional AI mock interviewer. "
        f"Conduct a {difficulty} {interview_type} interview for the "
        f"{interview.target_role or 'Software Engineer'} role at {company}. "
        "Start with a brief introduction, then ask one clear question at a time. "
        "Use the candidate's answers to ask focused follow-up questions. "
        "If the candidate's response is unclear, unrelated, too fragmented, or does not answer the current question, "
        "ask one brief clarification that keeps them on the same topic. Do not treat random phrases as useful interview content, "
        "and do not jump to a new topic until the current question has a meaningful answer. "
        "For example, if the candidate says 'HDFC Sky' while answering why they chose software development, say: "
        "'I did not quite understand how that connects to your answer. Could you continue with what drew you to software development?' "
        "Keep the conversation natural and concise; do not monologue. "
        "Soft-wrap the interview after 8 interviewer questions and never exceed 10 interviewer questions. "
        "When the interview is complete, thank the candidate and tell them their feedback is being prepared. "
        f"Candidate resume context:\n{resume_context[:4000]}"
    )

    # Build the initial chat context
    initial_ctx = llm.ChatContext()
    initial_ctx.add_message(role="system", content=system_prompt)

    # Determine the first greeting
    first_q = "Hello! I am your AI interviewer today. Are you ready to begin?"
    if interview.conversation and len(interview.conversation) > 0:
        first_msg = interview.conversation[0]
        if isinstance(first_msg, dict) and first_msg.get("content"):
            first_q = first_msg["content"]

    # Create the voice agent (v1.5 API)
    _stt_kwargs = {}
    if _vertex_creds_info:
        _stt_kwargs["credentials_info"] = _vertex_creds_info
    elif _vertex_creds_file:
        _stt_kwargs["credentials_file"] = _vertex_creds_file

    _llm_kwargs = {"model": "gemini-2.5-flash"}
    if _gemini_api_key:
        _llm_kwargs["api_key"] = _gemini_api_key

    deepgram_keyterms = build_deepgram_keyterms(
        target_role=interview.target_role,
        company=company,
        interview_type=interview_type,
        resume_context=resume_context,
    )
    _stt_options = {
        "model": "nova-3",
        "language": "en-IN",
        "interim_results": True,
        "punctuate": True,
        "smart_format": True,
        "filler_words": True,
        "vad_events": True,
    }
    if deepgram_keyterms:
        _stt_options["keyterm"] = deepgram_keyterms

    agent = InterviewAgent(
        instructions=system_prompt,
        stt=deepgram.STT(**_stt_options),
        llm=google.LLM(**_llm_kwargs),
        tts=cartesia.TTS(),
        vad=silero.VAD.load(),
        chat_ctx=initial_ctx,
        use_tts_aligned_transcript=True,
    )

    # Let genuine candidate speech interrupt the AI, but resume after a short false-start window.
    # Endpointing min_delay=3.0 gives the student a 3-second buffer to pause/think.
    # preemptive_generation=False prevents Gemini from generating before the user finishes.
    session = AgentSession(
        turn_handling={
            "endpointing": {
                "mode": "fixed",
                "min_delay": 3.0,
                "max_delay": 6.0,
            },
            "interruption": {
                "enabled": True,
                "min_words": 3,
                "min_duration": 0.7,
                "resume_false_interruption": True,
                "false_interruption_timeout": 3.0,
            },
            "preemptive_generation": False,
        },
    )
    no_response_controller = NoResponseController(session=session, ctx=ctx)
    agent.no_response_controller = no_response_controller

    async def _close_no_response_controller(reason: str):
        no_response_controller.close()

    ctx.add_shutdown_callback(_close_no_response_controller)

    def _on_speech_created(ev):
        if no_response_controller.ignore_next_speech_event():
            return
        no_response_controller.watch_assistant_speech(ev.speech_handle)

    def _on_user_state_changed(ev):
        if ev.new_state == "speaking":
            no_response_controller.note_user_speech_started()
        elif ev.new_state == "listening":
            no_response_controller.note_user_speech_stopped()

    session.on("speech_created", _on_speech_created)
    session.on("user_state_changed", _on_user_state_changed)

    await session.start(
        agent=agent,
        room=ctx.room,
    )

    # Wait for the user participant to join the room
    await ctx.wait_for_participant()
    # Wait a moment for audio track subscription to stabilize
    await asyncio.sleep(2.0)
    logger.info("speaking initial interview question")
    first_speech = session.say(first_q, allow_interruptions=True)
    await first_speech.wait_for_playout()


# ── CLI entry ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
