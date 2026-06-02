"""
Interview War Room — AI Mock Interview Router (thin layer).

All business logic lives in app.services.interview_service.
This router handles: HTTP interface, auth guards, DB session injection.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import require_role
from app.services import interview_service, voice_service

router = APIRouter()

# Per-session voice lock: ensures the same random voice is used throughout one interview
_session_voices: dict[str, str] = {}


@router.get("/interview/quota")
async def get_interview_quota(
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Returns the student's remaining mock interview quota for the current month."""
    return await interview_service.get_quota(user, session)


@router.post("/interview/start")
async def start_interview(
    req: dict,
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Start a new mock interview session."""
    result = await interview_service.start_interview(req, user, session)
    # Lock the specific persona voice provided by the frontend for this session
    interview_id = result.get("interview_id") if isinstance(result, dict) else None
    if interview_id:
        voice_id = req.get("voice_id")
        if voice_id:
            _session_voices[interview_id] = voice_id
        else:
            interview_type = req.get("interview_type", "technical")
            _session_voices[interview_id] = voice_service.get_persona_voice(interview_type)
    return result


@router.post("/interview/{interview_id}/message")
async def send_message(
    interview_id: str,
    req: dict,
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Send the student's response and get the AI's next question."""
    content = req.get("content", "")
    return await interview_service.send_message(interview_id, content, user, session)


@router.post("/interview/{interview_id}/end")
async def end_interview(
    interview_id: str,
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """End the interview session and queue AI feedback generation."""
    # Clean up session voice lock
    _session_voices.pop(interview_id, None)
    return await interview_service.end_interview(interview_id, user, session)


@router.get("/interview/history")
async def get_interview_history(
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """List past interview sessions with scores."""
    return await interview_service.get_history(user, session)


@router.get("/interview/readiness")
async def get_interview_readiness(
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Calculate aggregate interview readiness score."""
    return await interview_service.get_readiness(user, session)


@router.get("/interview/{interview_id}")
async def get_interview_detail(
    interview_id: str,
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Get full transcript + feedback for a specific interview session."""
    return await interview_service.get_detail(interview_id, user, session)


@router.post("/interview/{interview_id}/speak")
async def speak_text(
    interview_id: str,
    req: dict,
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Convert text to speech using ElevenLabs."""
    text = req.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    # Use the session's locked voice if available
    voice_id = _session_voices.get(interview_id)
    
    audio_bytes = await voice_service.text_to_speech(text, voice_id)
    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.post("/interview/{interview_id}/transcribe")
async def transcribe_audio(
    interview_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_role("student")),
):
    """Transcribe recorded speech using ElevenLabs Scribe STT."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Audio file cannot be empty")
    text = await voice_service.transcribe_audio(
        content,
        filename=file.filename or "recording.wav",
        content_type=file.content_type or "audio/wav"
    )
    return {"text": text}
