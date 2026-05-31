"""
Voice Service — High-fidelity Text-to-Speech (TTS) and Speech-to-Text (STT) via ElevenLabs.
"""
import httpx
import logging
import random
from typing import AsyncGenerator
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger("acadmix.voice_service")

# ── Professional Interview Voice Pool (Cartesia) ──
# Curated set of clear, authoritative voices for mock interviews
INTERVIEW_VOICES = [
    {"id": "f9fc912e-52f0-448a-8bfa-47e9ca75f25a", "name": "Marilyn",  "gender": "female"},
    {"id": "42f14755-88c3-4124-aae3-5cc3a9618e8f", "name": "Jan",      "gender": "male"},
    {"id": "02aeee94-c02b-456e-be7a-659672acf82d", "name": "Benito",   "gender": "male"},
    {"id": "225ba8cf-9fc2-4371-a78c-fe38ba38898a", "name": "Anneliese","gender": "female"},
]

# Default voice (first in pool)
DEFAULT_VOICE_ID = "f9fc912e-52f0-448a-8bfa-47e9ca75f25a"


def get_random_interview_voice() -> str:
    """Pick a random professional voice for each interview session."""
    voice = random.choice(INTERVIEW_VOICES)
    logger.info(f"Selected interview voice: {voice['name']} ({voice['gender']})")
    return voice["id"]

def get_persona_voice(interview_type: str) -> str:
    """Map the interview type to a specific Cartesia voice."""
    mapping = {
        "technical": "42f14755-88c3-4124-aae3-5cc3a9618e8f", # Jan
        "hr": "f9fc912e-52f0-448a-8bfa-47e9ca75f25a",       # Marilyn
        "behavioral": "225ba8cf-9fc2-4371-a78c-fe38ba38898a", # Anneliese
        "mixed": "02aeee94-c02b-456e-be7a-659672acf82d"      # Benito
    }
    
    voice_id = mapping.get(interview_type.lower(), DEFAULT_VOICE_ID)
    logger.info(f"Assigned persona voice {voice_id} for interview type: {interview_type}")
    return voice_id


async def text_to_speech_stream(text: str, voice_id: str | None = None) -> AsyncGenerator[bytes, None]:
    """
    Convert text to speech using Cartesia and yield audio/mpeg byte chunks.
    """
    if not settings.CARTESIA_API_KEY:
        logger.error("Cartesia API Key not configured")
        raise HTTPException(status_code=500, detail="Cartesia API Key is not configured in settings")

    # Auto-select a random professional voice if none specified
    if not voice_id:
        voice_id = get_random_interview_voice()

    url = "https://api.cartesia.ai/tts/bytes"
    headers = {
        "Cartesia-Version": "2024-06-10",
        "X-API-Key": settings.CARTESIA_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "model_id": "sonic-english",
        "transcript": text,
        "voice": {
            "mode": "id",
            "id": voice_id
        },
        "output_format": {
            "container": "mp3",
            "encoding": "mp3",
            "sample_rate": 44100
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            logger.error(f"Cartesia TTS failed: {response.status_code} - {response.text[:300]}")
            raise HTTPException(status_code=response.status_code, detail=f"Voice synthesis failed: {response.text[:200]}")
        
        yield response.content

async def transcribe_audio(file_bytes: bytes, filename: str = "audio.wav", content_type: str = "audio/wav") -> str:
    """
    Transcribe audio bytes to text using ElevenLabs Scribe (scribe_v2).
    """
    if not settings.ELEVENLABS_API_KEY:
        logger.error("ElevenLabs API Key not configured")
        raise HTTPException(status_code=500, detail="ElevenLabs API Key is not configured in settings")

    url = "https://api.elevenlabs.io/v1/speech-to-text"
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
    }
    files = {
        "file": (filename, file_bytes, content_type)
    }
    data = {
        "model_id": "scribe_v2"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, data=data, files=files)
        if response.status_code != 200:
            logger.error(f"ElevenLabs STT failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Speech transcription failed: {response.text}")
        
        result = response.json()
        return result.get("text", "")
