## 1. Green Room UI Updates
- [ ] 1.1 Remove `hasMicSignal` requirement from the "Start Interview" button in `HardwareSetupLobby.tsx`
- [ ] 1.2 Add a glowing badge prompt asking the user to say "Hello" to test their microphone

## 2. WebRTC UI Polish
- [ ] 2.1 Add a toast notification indicating when the AI has joined the room in `ActiveLiveKitInterview.tsx`

## 3. Backend Agent Fixes
- [ ] 3.1 Configure `min_silence_duration` on `silero.VAD` in `livekit_agent.py` to prevent lockups on interruption
- [ ] 3.2 Refactor `livekit_agent.py` to fire the first greeting asynchronously or speed up TTS initialization
