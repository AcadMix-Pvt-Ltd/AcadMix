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

# ── Professional Interview Voice Pool ──
# Curated set of clear, authoritative, professional ElevenLabs voices
# suitable for mock interview scenarios (mix of male & female).
INTERVIEW_VOICES = [
    {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella",   "gender": "female"},  # Confident, clear
    {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni",  "gender": "male"},    # Authoritative
    {"id": "VR6AewLTigWG4xSOukaG", "name": "Arnold",  "gender": "male"},    # Deep, commanding
    {"id": "pNInz6obpgDQGcFmaJgB", "name": "Adam",    "gender": "male"},    # Professional, neutral
]

# Default voice (first in pool)
DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"


def get_random_interview_voice() -> str:
    """Pick a random professional voice for each interview session."""
    voice = random.choice(INTERVIEW_VOICES)
    logger.info(f"Selected interview voice: {voice['name']} ({voice['gender']})")
    return voice["id"]


async def text_to_speech_stream(text: str, voice_id: str | None = None) -> AsyncGenerator[bytes, None]:
    """
    Convert text to speech using ElevenLabs and yield audio/mpeg byte chunks as they arrive.
    """
    if not settings.ELEVENLABS_API_KEY:
        logger.error("ElevenLabs API Key not configured")
        raise HTTPException(status_code=500, detail="ElevenLabs API Key is not configured in settings")

    # Auto-select a random professional voice if none specified
    if not voice_id:
        voice_id = get_random_interview_voice()

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "accept": "audio/mpeg"
    }
    payload = {
        "text": text,
        "model_id": "eleven_flash_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code != 200:
                error_body = await response.aread()
                logger.error(f"ElevenLabs TTS failed: {response.status_code} - {error_body.decode(errors='ignore')}")
                raise HTTPException(status_code=response.status_code, detail=f"Voice synthesis failed: {error_body.decode(errors='ignore')}")
            
            async for chunk in response.iter_bytes(chunk_size=4096):
                yield chunk

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
