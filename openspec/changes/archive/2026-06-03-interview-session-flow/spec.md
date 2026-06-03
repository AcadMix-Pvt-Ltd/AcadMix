# Change: Interview Session Flow

## Overview
Implement fixes and polishes to the real-time AI Interview session flow.

## Requirements
1. **Green Room Mic Check**: Display a "Say 'Hello' to test your microphone" prompt when no mic signal is detected, to explicitly inform the user how to activate the start button.
2. **VAD Interruption Timeout**: Configure `min_silence_duration` on the backend Silero VAD to ensure the agent recovers gracefully within 2-3 seconds if interrupted by silence.
3. **First Speech Latency**: Optimize the python worker initialization by decoupling the TTS synthesis from blocking the thread, so the first greeting is spoken almost instantly.
4. **UI Notification**: Add a toast notification "Interviewer has joined the session" when the LiveKit room connects successfully in `ActiveLiveKitInterview.tsx`.

## Technical Implementation
- Update `AIInterviewSession.tsx` -> `HardwareSetupLobby` UI state for mic prompts.
- Update `livekit_agent.py` -> Add `silero.VAD.load(min_silence_duration=0.5)` and refactor `session.start` to not block.
- Update `ActiveLiveKitInterview.tsx` -> Add `useEffect` on `connectionState === 'connected'` to trigger toast.
