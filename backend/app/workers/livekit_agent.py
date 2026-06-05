import asyncio
import logging
import json
import os
import tempfile
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import AutoSubscribe, JobContext, AgentSession, WorkerOptions, cli, llm
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
    company = interview.company_name or "the target company"
    resume_context = interview.resume_content or "No resume context was provided."

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

    agent = Agent(
        instructions=system_prompt,
        stt=deepgram.STT(),
        llm=google.LLM(**_llm_kwargs),
        tts=cartesia.TTS(),
        vad=silero.VAD.load(),
        chat_ctx=initial_ctx,
        use_tts_aligned_transcript=True,
    )

    # Let genuine candidate speech interrupt the AI, but resume after a short false-start window.
    session = AgentSession(
        turn_handling={
            "endpointing": {
                "mode": "fixed",
                "min_delay": 2.5,
                "max_delay": 5.0,
            },
            "interruption": {
                "enabled": True,
                "min_words": 3,
                "min_duration": 0.7,
                "resume_false_interruption": True,
                "false_interruption_timeout": 3.0,
            }
        },
    )
    await session.start(
        agent=agent,
        room=ctx.room,
    )

    # Wait for the user participant to join the room
    await ctx.wait_for_participant()
    # Wait a moment for audio track subscription to stabilize
    await asyncio.sleep(2.0)
    await session.say(first_q)


# ── CLI entry ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
