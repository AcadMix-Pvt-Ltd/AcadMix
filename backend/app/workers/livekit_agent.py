import asyncio
import logging
import json
import os
import tempfile

from livekit.agents import AutoSubscribe, JobContext, AgentSession, WorkerOptions, cli, llm
from livekit.agents.voice import Agent
from livekit.plugins import cartesia, silero, google

from app.core.config import settings
from app import models
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

# Set up Google Credentials for Vertex AI/STT plugins
if hasattr(settings, "VERTEX_CREDENTIALS_JSON") and settings.VERTEX_CREDENTIALS_JSON:
    _fd, _cred_path = tempfile.mkstemp(suffix=".json")
    with os.fdopen(_fd, 'w') as f:
        f.write(settings.VERTEX_CREDENTIALS_JSON)
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _cred_path

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

    # Build system instructions
    system_prompt = (
        f"You are a professional technical interviewer conducting an interview "
        f"for the {interview.target_role or 'Software Engineer'} role. "
        f"Be concise, professional, and ask focused follow-up questions. "
        f"Start by greeting the candidate and asking your first question."
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
    agent = Agent(
        instructions=system_prompt,
        stt=google.STT(),
        llm=google.LLM(model="gemini-2.5-flash"),
        tts=cartesia.TTS(),
        vad=silero.VAD.load(),
        chat_ctx=initial_ctx,
    )

    # Create session and start it in the room
    session = AgentSession()
    await session.start(
        agent=agent,
        room=ctx.room,
    )

    # Greet the candidate
    await session.say(first_q)


# ── CLI entry ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
