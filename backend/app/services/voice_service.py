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
INTERVIEW_VOICES = [
    {"id": "f9fc912e-52f0-448a-8bfa-47e9ca75f25a", "name": "Marilyn",  "gender": "female"}
]

DEFAULT_VOICE_ID = "f9fc912e-52f0-448a-8bfa-47e9ca75f25a"

def get_random_interview_voice() -> str:
    return DEFAULT_VOICE_ID

def get_persona_voice(interview_type: str) -> str:
    return DEFAULT_VOICE_ID


async def text_to_speech(text: str, voice_id: str | None = None) -> bytes:
    """
    Convert text to speech using Cartesia API and return audio/mpeg bytes.
    """
    if not settings.CARTESIA_API_KEY:
        logger.error("Cartesia API Key not configured")
        raise HTTPException(status_code=500, detail="Cartesia API Key is not configured in settings")

    # Use default Cartesia voice if none provided, or if an old ElevenLabs ID is stuck in the session
    if not voice_id or len(voice_id) == 20:
        # A standard professional Cartesia voice ID
        voice_id = "f9fc912e-52f0-448a-8bfa-47e9ca75f25a"

    url = "https://api.cartesia.ai/tts/bytes"
    headers = {
        "X-API-Key": settings.CARTESIA_API_KEY,
        "Cartesia-Version": "2025-04-16",
        "Content-Type": "application/json"
    }
    payload = {
        "model_id": "sonic-2",
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
        
        return response.content

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
