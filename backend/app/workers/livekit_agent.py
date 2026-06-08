import asyncio
import logging
import json
import os
import re
import tempfile
import base64
from dotenv import load_dotenv

load_dotenv()

from livekit import rtc
from app.services.llm_gateway import gateway
from livekit.agents import AutoSubscribe, JobContext, AgentSession, WorkerOptions, cli, llm
from livekit.agents.llm import StopResponse
from livekit.agents.voice import Agent, text_transforms
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
USER_TURN_FINALIZATION_GRACE_SECONDS = 5.0
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

_USEFUL_SHORT_INTENTS = (
    "i don't know",
    "i do not know",
    "not sure",
    "i am not sure",
    "please repeat",
    "can you repeat",
    "could you repeat",
    "repeat that",
    "say that again",
    "i missed that",
    "i am ready",
    "i'm ready",
    "yes i am ready",
    "yes i'm ready",
)


def is_meaningful_candidate_answer(text: str) -> bool:
    """Return True only if *text* looks like a real candidate answer.

    Rejects empty/near-empty turns, single filler words, and 1-2 word
    non-answers so that Gemini is not invoked on noise.
    """
    cleaned = re.sub(r"\s+", " ", (text or "")).strip().lower()
    if not cleaned:
        logger.debug("is_meaningful_candidate_answer: False (empty/none)")
        return False
    if cleaned in {"yes", "no", "yep", "nope", "sure", "ok", "okay", "correct", "fine", "no thanks", "no thank you"}:
        logger.info("is_meaningful_candidate_answer: True (exact short answer: %r)", cleaned)
        return True
    if any(intent in cleaned for intent in _USEFUL_SHORT_INTENTS):
        logger.info("is_meaningful_candidate_answer: True (useful short intent: %r)", cleaned)
        return True

    words = re.findall(r"[a-z0-9']+", cleaned)
    if not words:
        logger.debug("is_meaningful_candidate_answer: False (no words)")
        return False
    normalized_words = [w.strip("'") for w in words if w.strip("'")]
    if not normalized_words:
        logger.debug("is_meaningful_candidate_answer: False (no normalized words)")
        return False

    if all(word in _FILLER_WORDS for word in normalized_words):
        logger.info("is_meaningful_candidate_answer: False (only filler words: %r)", normalized_words)
        return False

    # Random one- or two-word fragments are usually room noise, ad snippets, or
    # incomplete starts. Preserve them in transcript, but do not invoke Gemini.
    if len(normalized_words) <= 2:
        logger.info("is_meaningful_candidate_answer: False (short fragment <= 2 words: %r)", normalized_words)
        return False

    logger.info("is_meaningful_candidate_answer: True (meaningful candidate answer: %r)", cleaned)
    return True



from typing import AsyncIterable

async def _publish_control(room, action, option_arg, agent):
    try:
        action_upper = action.upper()
        if action_upper == "SHOW_CODE_EDITOR":
            # Update active states mutually exclusively
            agent.editor_active = True
            agent.whiteboard_active = False
            
            lang = option_arg.strip() if option_arg else "python"
            test_cases = []
            if ":" in lang:
                parts = lang.split(":", 1)
                lang = parts[0].strip()
                try:
                    params = json.loads(parts[1].strip())
                    test_cases = params.get("test_cases", [])
                except Exception as pe:
                    logger.error(f"Error parsing test cases in SHOW_CODE_EDITOR: {pe}")
            payload = json.dumps({
                "action": "show_code_editor",
                "language": lang.lower(),
                "test_cases": test_cases
            })
            room.local_participant.publish_data(payload, topic="room_control")
            logger.info(f"Published control data: show_code_editor lang={lang} tc={len(test_cases)}")
        elif action_upper == "SHOW_WHITEBOARD":
            # Update active states mutually exclusively
            agent.editor_active = False
            agent.whiteboard_active = True
            
            payload = json.dumps({"action": "show_whiteboard"})
            room.local_participant.publish_data(payload, topic="room_control")
            logger.info("Published control data: show_whiteboard")
        elif action_upper == "HIDE_CODE_EDITOR":
            # Update active states mutually exclusively
            agent.editor_active = False
            agent.whiteboard_active = False
            
            payload = json.dumps({"action": "hide_code_editor"})
            room.local_participant.publish_data(payload, topic="room_control")
            logger.info("Published control data: hide_code_editor")
    except Exception as e:
        logger.error(f"Error publishing room control packet: {e}")

async def strip_tags_and_code_blocks_transform(text: AsyncIterable[str], room, agent) -> AsyncIterable[str]:
    buffer = ""
    in_code_block = False
    
    tag_pattern = re.compile(r'\[(SHOW_CODE_EDITOR|HIDE_CODE_EDITOR|SHOW_WHITEBOARD)(?::\s*([^\]]+))?\]', re.IGNORECASE)
    
    async for chunk in text:
        buffer += chunk
        
        while True:
            if not in_code_block:
                code_start_idx = buffer.find("```")
                tag_match = tag_pattern.search(buffer)
                
                if code_start_idx == -1 and not tag_match:
                    first_idx = -1
                    bracket_idx = buffer.find('[')
                    backtick_idx = buffer.find('`')
                    
                    if bracket_idx != -1 and backtick_idx != -1:
                        first_idx = min(bracket_idx, backtick_idx)
                    elif bracket_idx != -1:
                        first_idx = bracket_idx
                    elif backtick_idx != -1:
                        first_idx = backtick_idx
                        
                    if first_idx == -1:
                        yield buffer
                        buffer = ""
                    else:
                        if first_idx > 0:
                            yield buffer[:first_idx]
                            buffer = buffer[first_idx:]
                        
                        # Increased from 120 to 1000 to prevent long test case JSONs from premature yielding
                        if len(buffer) > 1000:
                            yield buffer[:1]
                            buffer = buffer[1:]
                    break
                
                if code_start_idx != -1 and tag_match:
                    tag_start, tag_end = tag_match.span()
                    if code_start_idx < tag_start:
                        yield buffer[:code_start_idx]
                        buffer = buffer[code_start_idx:]
                        in_code_block = True
                    else:
                        yield buffer[:tag_start]
                        action = tag_match.group(1).upper()
                        lang = tag_match.group(2) if tag_match.group(2) else ""
                        await _publish_control(room, action, lang, agent)
                        buffer = buffer[tag_end:]
                elif code_start_idx != -1:
                    yield buffer[:code_start_idx]
                    buffer = buffer[code_start_idx:]
                    in_code_block = True
                else:
                    tag_start, tag_end = tag_match.span()
                    yield buffer[:tag_start]
                    action = tag_match.group(1).upper()
                    lang = tag_match.group(2) if tag_match.group(2) else ""
                    await _publish_control(room, action, lang, agent)
                    buffer = buffer[tag_end:]
            else:
                code_end_idx = buffer.find("```", 3)
                if code_end_idx == -1:
                    break
                else:
                    buffer = buffer[code_end_idx + 3:]
                    in_code_block = False

    if not in_code_block and buffer:
        tag_match = tag_pattern.search(buffer)
        if tag_match:
            tag_start = tag_match.start()
            yield buffer[:tag_start]
            action = tag_match.group(1).upper()
            lang = tag_match.group(2) if tag_match.group(2) else ""
            await _publish_control(room, action, lang, agent)
            buffer = buffer[tag_match.end():]
        if buffer:
            yield buffer

def make_strip_tags_and_code_blocks(room, agent):
    async def _transform(text: AsyncIterable[str]) -> AsyncIterable[str]:
        async for chunk in strip_tags_and_code_blocks_transform(text, room, agent):
            yield chunk
    return _transform

def make_lenient_tag_cleaner():
    async def _transform(text: AsyncIterable[str]) -> AsyncIterable[str]:
        async for chunk in text:
            cleaned = re.sub(
                r'\[?\b(SHOW_CODE_EDITOR|HIDE_CODE_EDITOR|SHOW_WHITEBOARD)\b[^\w]*',
                '',
                chunk,
                flags=re.IGNORECASE
            )
            cleaned = cleaned.replace("[", "").replace("]", "")
            yield cleaned
    return _transform

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
        → If silence, speak ``NO_RESPONSE_PROMPT_1`` or a context-aware hint,
          then move to Stage 1.
    Stage 1: Wait another 15 s.
        → If silence, speak ``NO_RESPONSE_END_MESSAGE`` and shut down.

    Any *meaningful* user speech at any stage cancels/resets the flow.
    Non-meaningful fragments ("so", "hmm") restart the 15 s timer
    for the *current* stage via ``note_non_answer_fragment()``.
    """

    def __init__(self, *, session: AgentSession, ctx: JobContext, agent: "InterviewAgent"):
        self._session = session
        self._ctx = ctx
        self._agent = agent
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
        if self._session.agent_state == "speaking":
            return
        self._generation += 1
        self._cancel_task()

    def note_user_speech_stopped(self):
        """User stopped speaking – do NOT restart the timer here.

        We wait for ``on_user_turn_completed`` to verify meaningfulness.
        """
        if self._closed or not self._user_speech_active:
            return
        self._user_speech_active = False
        if self._session.agent_state == "speaking":
            return
        generation = self._generation
        self._cancel_task()
        self._task = asyncio.create_task(
            self._restart_after_unfinalized_speech(generation)
        )
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

    async def _restart_after_unfinalized_speech(self, generation: int):
        try:
            await asyncio.sleep(USER_TURN_FINALIZATION_GRACE_SECONDS)
            if not self._is_current(generation):
                return
            await self._run_reminder_flow(generation)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("No-response timer failed after unfinalized user speech")

    async def _generate_code_hint(self) -> str:
        try:
            last_q = next((msg.content for msg in reversed(self._agent.chat_ctx.messages) if msg.role == "assistant"), "")
            code_draft = self._agent.current_student_code
            lang = self._agent.current_student_language
            
            if not code_draft:
                db_ctx = await get_interview_context(self._session.room.name)
                if db_ctx and db_ctx.current_student_code:
                    code_draft = db_ctx.current_student_code
                    lang = db_ctx.current_student_language or lang
            
            prompt = (
                f"The candidate is silent while working on this coding question: '{last_q}'.\n"
                f"Here is their current code draft in {lang}:\n"
                f"```\n{code_draft}\n```\n"
                f"Write a friendly, supportive nudge or hint to help them progress. "
                f"Do not solve the problem or write code blocks. Just give a single-sentence guidance tip (max 20 words)."
            )
            
            hint = await gateway.complete(
                purpose="interview",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=64
            )
            clean_hint = hint.strip().replace("\"", "").replace("'", "")
            logger.info(f"Generated code hint for stuck candidate: {clean_hint}")
            return clean_hint
        except Exception as e:
            logger.error(f"Failed to generate code hint: {e}")
            return NO_RESPONSE_PROMPT_1

    async def _generate_whiteboard_hint(self) -> str:
        try:
            last_q = next((msg.content for msg in reversed(self._agent.chat_ctx.messages) if msg.role == "assistant"), "")
            drawing_desc = self._agent.whiteboard_description
            
            if not drawing_desc:
                db_ctx = await get_interview_context(self._session.room.name)
                if db_ctx and db_ctx.whiteboard_description:
                    drawing_desc = db_ctx.whiteboard_description
            
            prompt = (
                f"The candidate is silent while designing a system on the whiteboard for this task: '{last_q}'.\n"
                f"They have drawn: {drawing_desc}\n"
                f"Write a friendly, supportive nudge or hint to help them complete their design. "
                f"Keep it to a single sentence (max 20 words)."
            )
            
            hint = await gateway.complete(
                purpose="interview",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=64
            )
            clean_hint = hint.strip().replace("\"", "").replace("'", "")
            logger.info(f"Generated whiteboard hint for stuck candidate: {clean_hint}")
            return clean_hint
        except Exception as e:
            logger.error(f"Failed to generate whiteboard hint: {e}")
            return NO_RESPONSE_PROMPT_1

    async def _generate_hr_hint(self) -> str:
        try:
            last_q = next((msg.content for msg in reversed(self._agent.chat_ctx.messages) if msg.role == "assistant"), "")
            
            prompt = (
                f"The candidate is silent or struggling to answer this HR/behavioral question: '{last_q}'.\n"
                f"Write a friendly, supportive nudge or hint to help them answer or encourage them to speak. "
                f"Do not answer the question or give too much away. Just give a single-sentence guidance tip or nudge (max 20 words)."
            )
            
            hint = await gateway.complete(
                purpose="interview",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=64
            )
            clean_hint = hint.strip().replace("\"", "").replace("'", "")
            logger.info(f"Generated HR/behavioral hint for stuck candidate: {clean_hint}")
            return clean_hint
        except Exception as e:
            logger.error(f"Failed to generate HR hint: {e}")
            return NO_RESPONSE_PROMPT_1

    async def _run_reminder_flow(self, generation: int):
        """Execute the 2-stage no-response reminder logic."""
        try:
            is_hr_or_behavioral = self._agent.interview_type in ("hr", "behavioral")
            delay = 20.0 if is_hr_or_behavioral else NO_RESPONSE_DELAY_SECONDS

            # Fetch DB context to check dynamic fallback states
            db_ctx = await get_interview_context(self._session.room.name)
            current_stage = db_ctx.current_stage if db_ctx else "icebreaker"
            db_code = db_ctx.current_student_code if db_ctx else ""
            db_whiteboard = db_ctx.whiteboard_description if db_ctx else ""

            is_editor_active = self._agent.editor_active or (current_stage == "coding")
            is_whiteboard_active = self._agent.whiteboard_active or (current_stage == "whiteboard")

            # ── Stage 0 → wait delay then nudge ────────────────────────────
            if self._stage == 0:
                await asyncio.sleep(delay)
                if not self._is_current(generation):
                    return

                # Choose nudge message based on editor or whiteboard activity
                nudge_message = NO_RESPONSE_PROMPT_1
                if is_editor_active and (self._agent.current_student_code or db_code):
                    nudge_message = await self._generate_code_hint()
                elif is_whiteboard_active and (self._agent.whiteboard_description or db_whiteboard):
                    nudge_message = await self._generate_whiteboard_hint()
                elif is_hr_or_behavioral:
                    nudge_message = await self._generate_hr_hint()

                nudge = self._say_nudge(nudge_message)
                await nudge.wait_for_playout()
                if nudge.interrupted or not self._is_current(generation):
                    return
                self._stage = 1

            # ── Stage 1 → wait delay then close ───────────────────────────
            await asyncio.sleep(delay)
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
        self.current_student_code: str = ""
        self.current_student_language: str = "python"
        self.editor_active: bool = False
        self.whiteboard_active: bool = False
        self.whiteboard_description: str = ""
        self.interview_type: str = "technical"

    async def on_user_turn_completed(
        self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage
    ) -> None:
        user_text = new_message.text_content if new_message else ""
        logger.info("on_user_turn_completed checking user text: %r", user_text)
        if not is_meaningful_candidate_answer(user_text):
            logger.info(
                "Non-meaningful user turn suppressed: %r", user_text
            )
            if self.no_response_controller:
                self.no_response_controller.note_non_answer_fragment()
            raise StopResponse()

        logger.info("on_user_turn_completed: meaningful user turn finalized: %r", user_text)
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


async def _process_whiteboard_drawing(base64_str: str, agent: InterviewAgent):
    try:
        image_bytes = base64.b64decode(base64_str)
        prompt = (
            "The candidate is sketching their system design or visual answer on a whiteboard. "
            "Write a concise, 2-sentence description of what they have drawn. "
            "Describe the shapes, boxes, databases, servers, labels, or flow lines present in the drawing. "
            "Keep it factual and direct so the interviewer knows what is on the whiteboard."
        )
        
        # Call Gemini via LLMGateway
        description = await gateway.complete(
            purpose="interview",
            messages=[{"role": "user", "content": prompt}],
            media_bytes=image_bytes,
            mime_type="image/png"
        )
        description_clean = description.strip()
        logger.info(f"Whiteboard drawing described by Gemini: {description_clean}")
        
        agent.whiteboard_description = description_clean
        
        # Append this description directly to chat_ctx so the voice agent becomes aware of it!
        agent.chat_ctx.add_message(
            role="user",
            content=f"[Candidate submitted whiteboard design: {description_clean}]"
        )
        logger.info("Inserted whiteboard description into agent chat context")
    except Exception as e:
        logger.error(f"Failed to describe whiteboard drawing: {e}")


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

    from app.services.interview_service import get_interview_system_prompt

    # Build system instructions
    resume_section = f"CANDIDATE RESUME:\n{resume_context[:4000]}"
    company_context = f" at {company}" if company else ""
    system_prompt = get_interview_system_prompt(
        interview_type=interview_type,
        target_role=interview.target_role or "Software Engineer",
        company_context=company_context,
        current_question=1,
        max_questions=10,
        resume_section=resume_section,
        difficulty=difficulty,
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

    # Fetch locked voice ID from Redis
    voice_id = None
    try:
        from app.core.cache import _get_redis
        redis = await _get_redis()
        if redis:
            raw_voice = await redis.get(f"interview_voice:{interview_id}")
            if raw_voice:
                voice_id = raw_voice.decode("utf-8") if isinstance(raw_voice, bytes) else raw_voice
    except Exception as e:
        logger.warning(f"Could not fetch voice_id from Redis: {e}")

    tts_kwargs = {}
    if voice_id:
        tts_kwargs["voice"] = voice_id

    agent = InterviewAgent(
        instructions=system_prompt,
        stt=deepgram.STT(**_stt_options),
        llm=google.LLM(**_llm_kwargs),
        tts=cartesia.TTS(**tts_kwargs),
        vad=silero.VAD.load(),
        chat_ctx=initial_ctx,
        use_tts_aligned_transcript=True,
    )
    agent.interview_type = interview_type

    # Let genuine candidate speech interrupt the AI, but resume after a short false-start window.
    # Endpointing min_delay=3.0 gives the student a 3-second buffer to pause/think.
    # preemptive_generation=False prevents Gemini from generating before the user finishes.
    session = AgentSession(
        stt=agent.stt,
        vad=agent.vad,
        llm=agent.llm,
        tts=agent.tts,
        use_tts_aligned_transcript=True,
        tts_text_transforms=[
            make_strip_tags_and_code_blocks(ctx.room, agent),
            make_lenient_tag_cleaner(),
            text_transforms.filter_markdown,
        ],
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
            "preemptive_generation": {"enabled": False},
        },
    )
    no_response_controller = NoResponseController(session=session, ctx=ctx, agent=agent)
    agent.no_response_controller = no_response_controller

    @ctx.room.on("data_received")
    def on_data_received(packet: rtc.DataPacket):
        try:
            topic = packet.topic
            data_str = packet.data.decode("utf-8")
            logger.info(f"Received data channel packet on topic: {topic}")
            
            if topic == "code_state":
                try:
                    payload = json.loads(data_str)
                    agent.current_student_code = payload.get("code", "")
                    agent.current_student_language = payload.get("language", "python")
                    agent.editor_active = True
                    agent.whiteboard_active = False
                except Exception as pe:
                    logger.error(f"Failed to parse code_state packet: {pe}")
                    
            elif topic == "whiteboard_state":
                try:
                    payload = json.loads(data_str)
                    img_data = payload.get("image", "")
                    if img_data.startswith("data:image/png;base64,"):
                        base64_str = img_data.split(",", 1)[1]
                    else:
                        base64_str = img_data
                    
                    if base64_str:
                        agent.editor_active = False
                        agent.whiteboard_active = True
                        asyncio.create_task(_process_whiteboard_drawing(base64_str, agent))
                except Exception as pe:
                    logger.error(f"Failed to parse whiteboard_state packet: {pe}")
        except Exception as e:
            logger.error(f"Error in on_data_received handler: {e}")

    async def _close_no_response_controller(reason: str):
        no_response_controller.close()

    ctx.add_shutdown_callback(_close_no_response_controller)

    def _on_speech_created(ev):
        if no_response_controller.ignore_next_speech_event():
            return
        no_response_controller.watch_assistant_speech(ev.speech_handle)

    def _on_user_state_changed(ev):
        logger.info("User state changed to: %r", ev.new_state)
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
    await asyncio.sleep(4.0)
    logger.info("speaking initial interview question")
    first_speech = session.say(first_q, allow_interruptions=False)
    await first_speech.wait_for_playout()


# ── CLI entry ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
