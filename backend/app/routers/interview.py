"""
Interview War Room — AI Mock Interview Router (thin layer).

All business logic lives in app.services.interview_service.
This router handles: HTTP interface, auth guards, DB session injection.
"""
import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import require_role
from app.services import interview_service, voice_service
from app.core.cache import _get_redis
from app.core.config import settings
from app import models
from livekit import api

router = APIRouter()



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
        if not voice_id:
            interview_type = req.get("interview_type", "technical")
            voice_id = voice_service.get_persona_voice(interview_type)
            
        redis = await _get_redis()
        if redis:
            await redis.set(f"interview_voice:{interview_id}", voice_id, ex=3600)
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


@router.post("/interview/{interview_id}/conversation")
async def append_conversation_turns(
    interview_id: str,
    req: dict,
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Persist finalized LiveKit transcript turns for scoring and history."""
    return await interview_service.append_conversation_turns(interview_id, req, user, session)


@router.post("/interview/{interview_id}/end")
async def end_interview(
    interview_id: str,
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """End the interview session and queue AI feedback generation."""
    # Clean up session voice lock from Redis
    redis = await _get_redis()
    if redis:
        await redis.delete(f"interview_voice:{interview_id}")
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
        
    # Fetch the session's locked voice from Redis if available
    redis = await _get_redis()
    voice_id = None
    if redis:
        raw_voice = await redis.get(f"interview_voice:{interview_id}")
        if raw_voice:
            voice_id = raw_voice.decode("utf-8") if isinstance(raw_voice, bytes) else raw_voice
    
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


@router.post("/interview/{interview_id}/token")
async def get_livekit_token(
    interview_id: str,
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Generate a LiveKit WebRTC access token for the student to join the interview room."""
    # Note: Access check is done inside the token logic to ensure the student owns this interview
    from sqlalchemy.future import select
    stmt = select(models.MockInterview).where(
        models.MockInterview.id == interview_id,
        models.MockInterview.student_id == user["id"],
        models.MockInterview.college_id == user["college_id"],
        models.MockInterview.status == "in_progress",
    )
    result = await session.execute(stmt)
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found or already completed")

    if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
        raise HTTPException(status_code=500, detail="LiveKit keys not configured")

    lk = api.LiveKitAPI(settings.LIVEKIT_URL, settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    try:
        rooms = await lk.room.list_rooms(api.ListRoomsRequest(names=[interview_id]))
        if not rooms.rooms:
            await lk.room.create_room(api.CreateRoomRequest(
                name=interview_id,
                empty_timeout=300,
                max_participants=4,
            ))

        existing_dispatches = await lk.agent_dispatch.list_dispatch(interview_id)
        if not existing_dispatches:
            await lk.agent_dispatch.create_dispatch(api.CreateAgentDispatchRequest(
                room=interview_id,
                metadata=json.dumps({
                    "interview_id": interview_id,
                    "student_id": str(user["id"]),
                    "college_id": str(user["college_id"]),
                }),
            ))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="AI interviewer is not available. Please try again.") from exc
    finally:
        await lk.aclose()

    token = api.AccessToken(
        settings.LIVEKIT_API_KEY,
        settings.LIVEKIT_API_SECRET,
    ).with_identity(str(user["id"])).with_name(user.get("full_name", "Student")).with_grants(api.VideoGrants(room_join=True, room=interview_id))

    return {
        "token": token.to_jwt(), 
        "url": settings.LIVEKIT_URL
    }


@router.post("/interview/{interview_id}/audio_eval")
async def evaluate_audio(
    interview_id: str,
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Asynchronously evaluate the final audio recording using Assembly AI."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Audio file cannot be empty")
    
    base_url = str(request.base_url)
    # We pass this to the interview service which will handle the AssemblyAI call and DB update
    return await interview_service.process_audio_evaluation(interview_id, content, file.content_type, user, session, base_url)



@router.post("/interview/assemblyai_webhook")
async def assemblyai_webhook(request: Request, session: AsyncSession = Depends(get_db)):
    """Handle async callbacks from AssemblyAI for audio evaluation."""
    payload = await request.json()
    return await interview_service.handle_assemblyai_webhook(payload, session, request.query_params.get("token"))


@router.post("/interview/{interview_id}/sync-state")
async def sync_state(
    interview_id: str,
    req: dict,
    user: dict = Depends(require_role("student")),
    session: AsyncSession = Depends(get_db),
):
    """Fallback HTTP state sync when WebRTC data channels are closed/failed."""
    from sqlalchemy.future import select
    from sqlalchemy.orm.attributes import flag_modified
    stmt = select(models.MockInterview).where(
        models.MockInterview.id == interview_id,
        models.MockInterview.student_id == user["id"],
        models.MockInterview.college_id == user["college_id"],
    )
    result = await session.execute(stmt)
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if "code" in req:
        interview.current_student_code = req["code"]
        flag_modified(interview, "current_student_code")
    if "language" in req:
        interview.current_student_language = req["language"]
        flag_modified(interview, "current_student_language")
    if "whiteboard_description" in req:
        interview.whiteboard_description = req["whiteboard_description"]
        flag_modified(interview, "whiteboard_description")
    elif "whiteboard_image" in req:
        try:
            import base64
            from app.services.llm_gateway import gateway
            img_data = req["whiteboard_image"]
            if img_data.startswith("data:image/png;base64,"):
                base64_str = img_data.split(",", 1)[1]
            else:
                base64_str = img_data
            
            image_bytes = base64.b64decode(base64_str)
            prompt = (
                "The candidate is sketching their system design or visual answer on a whiteboard. "
                "Write a concise, 2-sentence description of what they have drawn. "
                "Describe the shapes, boxes, databases, servers, labels, or flow lines present in the drawing. "
                "Keep it factual and direct so the interviewer knows what is on the whiteboard."
            )
            description = await gateway.complete(
                purpose="interview",
                messages=[{"role": "user", "content": prompt}],
                media_bytes=image_bytes,
                mime_type="image/png"
            )
            interview.whiteboard_description = description.strip()
            flag_modified(interview, "whiteboard_description")
        except Exception as ve:
            print(f"Failed to process whiteboard image in sync-state: {ve}")
            
    if "current_stage" in req:
        interview.current_stage = req["current_stage"]
        flag_modified(interview, "current_stage")

    await session.commit()
    return {"status": "success"}
