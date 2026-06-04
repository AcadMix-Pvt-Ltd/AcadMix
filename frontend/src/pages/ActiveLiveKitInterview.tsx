import React, { useEffect, useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Stop } from '@phosphor-icons/react';
import { useVoiceAssistant, RoomAudioRenderer, useLocalParticipant, useTrackTranscription, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';
import Avatar from 'boring-avatars';

// ─── Orb State Colors ────────────────────────────────────────────────────────
const ORB_STATES = {
  idle:        { color1: '#14b8a6', color2: '#06b6d4', label: 'Ready', speed: 6 },
  thinking:    { color1: '#3b82f6', color2: '#8b5cf6', label: 'Thinking...', speed: 1.5 },
  speaking:    { color1: '#06b6d4', color2: '#14b8a6', label: 'Speaking', speed: 2 },
  listening:   { color1: '#10b981', color2: '#34d399', label: 'Listening', speed: 3 },
  interrupted: { color1: '#f59e0b', color2: '#10b981', label: 'Listening', speed: 2 },
  evaluating:  { color1: '#8b5cf6', color2: '#ec4899', label: 'Evaluating...', speed: 1 },
};

// ─── Premium Horizontal Aura Wave ──────────────────────────────────────────────
const HorizontalAuraWave = ({ state, analyserRef, ttsAnalyserRef }: { state: string, analyserRef: any, ttsAnalyserRef?: any }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    
    // High DPI Canvas setup
    const resize = () => {
      if (!containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    window.addEventListener('resize', resize);
    resize();

    const NUM_POINTS = 100;
    const smoothedData = new Array(NUM_POINTS).fill(0);
    const targetData = new Array(NUM_POINTS).fill(0);

    const render = () => {
      time += 0.03;
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 800;
      const height = rect?.height || 128;
      const centerY = height / 2;
      
      ctx.clearRect(0, 0, width, height);

      // Data collection & Smoothing
      if (state === 'listening' && analyserRef?.current) {
         let energy = 0;
         const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
         analyserRef.current.getByteFrequencyData(dataArray);
         
         let sum = 0;
         const maxIndex = Math.floor(dataArray.length * 0.5);
         for (let j = 0; j < maxIndex; j++) sum += dataArray[j];
         
         let rawEnergy = (sum / maxIndex / 255);
         rawEnergy = rawEnergy < 0.08 ? 0 : (rawEnergy - 0.08) / 0.92;
         energy = Math.min(1.0, rawEnergy * 3.0); 

         for (let i = 0; i < NUM_POINTS; i++) {
           const t = i / (NUM_POINTS - 1);
           const bell = Math.sin(t * Math.PI);
           const wave1 = Math.sin(time * 1.8 + t * Math.PI * 4) * 18;
           const wave2 = Math.sin(time * 2.5 + t * Math.PI * 6 + 1.2) * 12;
           const wave3 = Math.sin(time * 3.2 + t * Math.PI * 8 + 2.8) * 7;
           const wave4 = Math.sin(time * 1.1 + t * Math.PI * 2 + 0.5) * 22;
           const wave5 = Math.sin(time * 4.0 + t * Math.PI * 10 + 4.1) * 4;

           const breathe = 0.7 + 0.3 * Math.sin(time * 0.6);
           const amplitude = (0.15 + energy * 0.85) * breathe; 

           targetData[i] = (wave1 + wave2 + wave3 + wave4 + wave5) * bell * amplitude;
         }
      } else if (state === 'speaking' || state === 'evaluating') {
         let energy = 0.5;

         const activeAnalyser = ttsAnalyserRef?.current;
         if (activeAnalyser) {
           const dataArray = new Uint8Array(activeAnalyser.frequencyBinCount);
           activeAnalyser.getByteFrequencyData(dataArray);
           let sum = 0;
           for (let j = 0; j < dataArray.length; j++) sum += dataArray[j];
           energy = Math.min(1.0, (sum / dataArray.length / 255) * 3.5);
         }

         for (let i = 0; i < NUM_POINTS; i++) {
           const t = i / (NUM_POINTS - 1);
           const bell = Math.sin(t * Math.PI);
           const wave1 = Math.sin(time * 1.8 + t * Math.PI * 4) * 18;
           const wave2 = Math.sin(time * 2.5 + t * Math.PI * 6 + 1.2) * 12;
           const wave3 = Math.sin(time * 3.2 + t * Math.PI * 8 + 2.8) * 7;
           const wave4 = Math.sin(time * 1.1 + t * Math.PI * 2 + 0.5) * 22;
           const wave5 = Math.sin(time * 4.0 + t * Math.PI * 10 + 4.1) * 4;

           const breathe = 0.7 + 0.3 * Math.sin(time * 0.6);
           const amplitude = (0.15 + energy * 0.85) * breathe;

           targetData[i] = (wave1 + wave2 + wave3 + wave4 + wave5) * bell * amplitude;
         }
      } else if (state === 'thinking' || state === 'connecting') {
         for (let i = 0; i < NUM_POINTS; i++) {
           const t = i / (NUM_POINTS - 1);
           const bell = Math.sin(t * Math.PI);
           const wave1 = Math.sin(time * 1.5 + t * Math.PI * 3) * 8;
           const wave2 = Math.sin(time * 2.2 + t * Math.PI * 5 + 1.0) * 5;
           const breathe = 0.6 + 0.4 * Math.sin(time * 0.4);
           targetData[i] = (wave1 + wave2) * bell * breathe;
         }
      } else {
         for (let i = 0; i < NUM_POINTS; i++) {
           targetData[i] = 0;
         }
      }

      for (let i = 0; i < NUM_POINTS; i++) {
        smoothedData[i] += (targetData[i] - smoothedData[i]) * 0.12;
      }

      const orbColor1 = ORB_STATES[state === 'connecting' ? 'thinking' : state]?.color1 || '#14b8a6';
      const orbColor2 = ORB_STATES[state === 'connecting' ? 'thinking' : state]?.color2 || '#06b6d4';
      const colors = [orbColor1, orbColor2, '#ffffff'];

      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        
        for (let i = 0; i < NUM_POINTS; i++) {
          const x = (i / (NUM_POINTS - 1)) * width;
          const phaseOffset = layer * Math.PI * 0.6;
          const idleAmp = state === 'listening' ? 1.5 : 4;
          const idleWave = Math.sin(time + (i / NUM_POINTS) * Math.PI * 2 + phaseOffset) * idleAmp;
          const direction = layer === 1 ? -1 : 1;
          const amplitude = smoothedData[i] * direction * (1 - layer * 0.1); 
          const y = centerY + idleWave + amplitude;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = colors[layer];
        ctx.lineWidth = 4 - layer;
        ctx.shadowColor = colors[layer];
        ctx.shadowBlur = 12 + layer * 8;
        ctx.stroke();
      }
      animationId = requestAnimationFrame(render);
    };

    render();
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [state, analyserRef, ttsAnalyserRef]);

  return (
    <div className="w-full flex flex-col items-center pointer-events-none">
      <div ref={containerRef} className="w-full h-32 sm:h-36 relative flex items-center justify-center [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};


const normalizeTranscriptText = (value: string) =>
  String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

const NOISE_NUDGE = 'I heard some background audio. Please answer the current question when ready.';

const BRAND_NOISE_PHRASES = [
  'hdfc sky',
  'hdfc securities',
  'zerodha',
  'groww',
  'upstox',
  'angel one',
  'mutual fund',
  'stock market',
  'demat account',
];

const VALID_SHORT_RESPONSES = new Set([
  'yes',
  'yeah',
  'yep',
  'okay',
  'ok',
  'sure',
  'no',
  'nope',
  "i don't know",
  'i dont know',
  'please repeat',
  'repeat',
  'can you repeat',
  'could you repeat',
]);

const SHORT_BACKGROUND_SNIPPETS = new Set([
  'subscribe',
  'breaking news',
]);

const wordCount = (value: string) => (value.match(/[a-zA-Z0-9']+/g) || []).length;

const isBackgroundOrNoise = (value: string) => {
  const normalized = normalizeTranscriptText(value);
  if (!normalized) return true;
  if (VALID_SHORT_RESPONSES.has(normalized)) return false;
  if (SHORT_BACKGROUND_SNIPPETS.has(normalized)) return true;

  const words = wordCount(normalized);
  if (words <= 8 && BRAND_NOISE_PHRASES.some(phrase => normalized.includes(phrase))) return true;

  const adLike = ['download', 'invest', 'offer', 'ad'].some(term => normalized.includes(term));
  return words <= 10 && adLike && BRAND_NOISE_PHRASES.some(phrase => normalized.includes(phrase));
};

const turnKind = (role: 'assistant' | 'user', content: string) => {
  if (role === 'user') return 'answer';
  return normalizeTranscriptText(content) === normalizeTranscriptText(NOISE_NUDGE) ? 'nudge' : 'question';
};

const isDuplicateTurn = (existing: any, incoming: any) => {
  if (!existing || !incoming || existing.role !== incoming.role) return false;
  const existingText = normalizeTranscriptText(existing.content);
  const incomingText = normalizeTranscriptText(incoming.content);
  if (!existingText || !incomingText) return false;
  if (existingText === incomingText) return true;

  const shorter = existingText.length < incomingText.length ? existingText : incomingText;
  const longer = existingText.length >= incomingText.length ? existingText : incomingText;
  return shorter.length > 40 && longer.includes(shorter);
};

const latestLiveText = (segments: any[], role: 'assistant' | 'user', conversation: any[]) => {
  const activeSegments = segments.filter(segment => !segment.final && segment.text?.trim());
  const latest = activeSegments[activeSegments.length - 1];
  const text = latest?.text?.trim() || '';
  if (!text) return '';

  const lastFinal = [...conversation].reverse().find((msg: any) => msg.role === role);
  return isDuplicateTurn(lastFinal, { role, content: text }) ? '' : text;
};

const transcriptKey = (msg: any, index: number) =>
  msg.id || msg.segmentId || `${msg.role}-${msg.timestamp || 'turn'}-${index}`;

const TranscriptRow = ({ role, content, isLive = false }: { role: 'assistant' | 'user'; content: string; isLive?: boolean }) => {
  const isUser = role === 'user';
  const label = isUser ? 'You' : 'Ami';
  const status = isLive ? (isUser ? 'Listening' : 'Speaking') : null;

  return (
    <motion.div
      initial={isLive ? { opacity: 0, y: 6 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`w-full ${isUser ? 'max-w-[68%] ml-auto' : 'max-w-[76%] mr-auto'}`}>
        <div className={`mb-2 flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
          {status && (
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-300/80">{status}</span>
          )}
        </div>
        <div className={`rounded-lg border bg-[#0d121b]/95 px-5 py-4 ${
          isUser
            ? 'border-slate-600/40 border-r-teal-400/70 text-slate-100'
            : 'border-slate-700/60 border-l-teal-400/70 text-slate-200'
        }`}>
          <p className="text-[15px] md:text-[16px] leading-7 whitespace-pre-wrap font-medium">{content}</p>
        </div>
      </div>
    </motion.div>
  );
};

interface ActiveLiveKitInterviewProps {
  elapsed: number;
  isEnding: boolean;
  maxQuestions: number;
  questionNumber: number;
  onEnd: () => void;
  dragConstraintsRef: any;
  formatTime: (s: number) => string;
  conversation: any[];
  setConversation: React.Dispatch<React.SetStateAction<any[]>>;
  onTranscriptTurns?: (turns: any[]) => void;
}

export const ActiveLiveKitInterview = ({
  elapsed,
  isEnding,
  maxQuestions,
  questionNumber,
  onEnd,
  dragConstraintsRef,
  formatTime,
  conversation,
  setConversation,
  onTranscriptTurns
}: ActiveLiveKitInterviewProps) => {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const { cameraTrack, localParticipant } = useLocalParticipant();
  const micTrack = localParticipant?.getTrackPublication(Track.Source.Microphone)?.track;
  
  const userTrackRef = useMemo(() => {
    return micTrack && localParticipant ? { participant: localParticipant, publication: micTrack, source: Track.Source.Microphone } : undefined;
  }, [micTrack, localParticipant]);

  const { segments: userTranscriptions } = useTrackTranscription(userTrackRef);

  const seenIds = useRef<Set<string>>(new Set());
  const endedForQuestionLimitRef = useRef(false);
  const conversationRef = useRef(conversation);
  const agentStateRef = useRef(state);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const browserSpeechRecognitionRef = useRef<any>(null);
  const browserSpeechBufferRef = useRef('');
  const browserSpeechTimerRef = useRef<number | null>(null);
  const lastBrowserSpeechRef = useRef('');
  const browserSpeechSeqRef = useRef(0);
  const [browserSpeechText, setBrowserSpeechText] = useState('');

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    agentStateRef.current = state;
  }, [state]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !micTrack?.mediaStreamTrack || isEnding) return;

    const flushBrowserSpeech = () => {
      const content = browserSpeechBufferRef.current.replace(/\s+/g, ' ').trim();
      browserSpeechBufferRef.current = '';
      setBrowserSpeechText('');

      if (!content || isBackgroundOrNoise(content)) return;
      if (normalizeTranscriptText(content) === normalizeTranscriptText(lastBrowserSpeechRef.current)) return;
      if (conversationRef.current.some((existing: any) => isDuplicateTurn(existing, { role: 'user', content }))) return;

      lastBrowserSpeechRef.current = content;
      const msg = {
        id: `browser-speech-${Date.now()}-${browserSpeechSeqRef.current++}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        source: 'browser-speech',
        kind: 'answer',
      };

      setConversation((prev: any[]) => {
        if (prev.some((existing: any) => isDuplicateTurn(existing, msg))) return prev;
        const next = [...prev, msg];
        conversationRef.current = next;
        return next;
      });
      onTranscriptTurns?.([msg]);
    };

    const scheduleFlush = () => {
      if (browserSpeechTimerRef.current) window.clearTimeout(browserSpeechTimerRef.current);
      browserSpeechTimerRef.current = window.setTimeout(flushBrowserSpeech, 1400);
    };

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      if (agentStateRef.current === 'speaking') return;

      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i]?.[0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalText += `${text} `;
        } else {
          interimText += `${text} `;
        }
      }

      if (finalText.trim()) {
        browserSpeechBufferRef.current = `${browserSpeechBufferRef.current} ${finalText}`.replace(/\s+/g, ' ').trim();
        scheduleFlush();
      }

      const displayed = `${browserSpeechBufferRef.current} ${interimText}`.replace(/\s+/g, ' ').trim();
      setBrowserSpeechText(displayed && !isBackgroundOrNoise(displayed) ? displayed : '');
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Browser speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (!isEnding && micTrack?.mediaStreamTrack?.readyState === 'live') {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {}
        }, 300);
      }
    };

    browserSpeechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {}

    return () => {
      if (browserSpeechTimerRef.current) window.clearTimeout(browserSpeechTimerRef.current);
      flushBrowserSpeech();
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {}
      if (browserSpeechRecognitionRef.current === recognition) {
        browserSpeechRecognitionRef.current = null;
      }
    };
  }, [micTrack, isEnding, onTranscriptTurns, setConversation]);

  // Aggregate finalized segments into historical conversation
  useEffect(() => {
    const newMsgs: any[] = [];
    userTranscriptions.filter(s => s.final && !seenIds.current.has(s.id)).forEach(s => {
      seenIds.current.add(s.id);
      if (!isBackgroundOrNoise(s.text)) {
        newMsgs.push({
          id: s.id,
          role: 'user',
          content: s.text,
          timestamp: new Date().toISOString(),
          source: 'livekit',
          kind: 'answer',
        });
      }
    });
    agentTranscriptions.filter(s => s.final && !seenIds.current.has(s.id)).forEach(s => {
      seenIds.current.add(s.id);
      newMsgs.push({
        id: s.id,
        role: 'assistant',
        content: s.text,
        timestamp: new Date().toISOString(),
        source: 'livekit',
        kind: turnKind('assistant', s.text),
      });
    });
    if (newMsgs.length > 0) {
      const accepted = newMsgs.filter(msg => !conversationRef.current.some((existing: any) => isDuplicateTurn(existing, msg)));
      setConversation((prev: any[]) => {
        const merged = newMsgs.filter(msg => !prev.some((existing: any) => isDuplicateTurn(existing, msg)));
        return merged.length ? [...prev, ...merged] : prev;
      });
      if (accepted.length) {
        onTranscriptTurns?.(accepted);
      }
    }
  }, [userTranscriptions, agentTranscriptions, setConversation, onTranscriptTurns]);

  const currentAgentText = useMemo(
    () => latestLiveText(agentTranscriptions, 'assistant', conversation),
    [agentTranscriptions, conversation],
  );
  const currentUserText = useMemo(
    () => {
      const text = latestLiveText(userTranscriptions, 'user', conversation);
      if (text && !isBackgroundOrNoise(text)) return text;
      return browserSpeechText;
    },
    [userTranscriptions, conversation, browserSpeechText],
  );

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (!shouldStickToBottomRef.current || !bottomSentinelRef.current) return;
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      bottomSentinelRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [conversation.length, currentAgentText, currentUserText]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  const ttsAnalyserRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioTrack?.mediaStreamTrack && !ttsAnalyserRef.current) {
      try {
        const stream = new MediaStream([audioTrack.mediaStreamTrack]);
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        ttsAnalyserRef.current = analyser;
      } catch (e) { console.error("Failed to wire ttsAnalyser", e); }
    }
    
    if (micTrack?.mediaStreamTrack && !analyserRef.current) {
      try {
        const stream = new MediaStream([micTrack.mediaStreamTrack]);
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch (e) { console.error("Failed to wire analyser", e); }
    }
  }, [audioTrack, micTrack]);

  let orbState = 'idle';
  if (state === 'speaking') orbState = 'speaking';
  if (state === 'listening' || state === 'connecting') orbState = 'listening';

  const assistantQuestionCount = conversation.filter((msg: any) => (
    msg.role === 'assistant' && (msg.kind || 'question') === 'question'
  )).length;
  const currentQuestionNumber = Math.min(maxQuestions, Math.max(questionNumber || 1, assistantQuestionCount || 1));

  useEffect(() => {
    const latestTurn = conversation[conversation.length - 1];
    if (
      !endedForQuestionLimitRef.current &&
      !isEnding &&
      latestTurn?.role === 'user' &&
      assistantQuestionCount >= maxQuestions
    ) {
      endedForQuestionLimitRef.current = true;
      onEnd();
    }
  }, [assistantQuestionCount, conversation, isEnding, maxQuestions, onEnd]);

  return (
    <div ref={dragConstraintsRef} className="fixed inset-0 bg-[#06090e] flex flex-col z-[9999] overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-teal-600/10 rounded-full blur-[150px] mix-blend-screen opacity-50" />
      </div>

      <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6 border-b border-white/[0.03]">
        <div className="flex items-center gap-4">
          <Avatar size={36} name="AcadMix Intelligence" variant="beam" colors={['#6366f1', '#14b8a6', '#8b5cf6', '#06b6d4', '#34d399']} />
          <span className="text-sm font-bold text-slate-300 tracking-wider uppercase">AcadMix Intelligence</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] px-4 py-2 rounded-full backdrop-blur-md shadow-sm">
            <Clock size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-200 tabular-nums">{formatTime(elapsed)}</span>
          </div>
          <div className="flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full backdrop-blur-md shadow-sm">
            <span className="text-sm font-bold text-indigo-400">Q {currentQuestionNumber}/{maxQuestions}</span>
          </div>
          <button onClick={onEnd} disabled={isEnding}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 hover:text-red-300 transition-all disabled:opacity-50 group shadow-sm">
            <Stop size={14} weight="fill" className="group-hover:scale-110 transition-transform" /> 
            End Session
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-4 sm:px-10 w-full max-w-5xl mx-auto overflow-hidden h-full">
        <div 
          ref={chatScrollRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            shouldStickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
          }}
          className="flex-1 w-full overflow-y-auto flex flex-col gap-5 pt-10 pb-56 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
           {conversation.map((msg, i) => (
             <TranscriptRow
               key={transcriptKey(msg, i)}
               role={msg.role}
               content={msg.content}
             />
           ))}

           {currentAgentText && (
             <TranscriptRow role="assistant" content={currentAgentText} isLive />
           )}

           {currentUserText && (
             <TranscriptRow role="user" content={currentUserText} isLive />
           )}

           <div ref={bottomSentinelRef} className="h-1 shrink-0" />
        </div>
      </div>

      <div className="absolute -bottom-6 sm:-bottom-8 left-0 right-0 z-0 h-36 sm:h-40 w-full flex items-center justify-center pointer-events-none opacity-55 mix-blend-screen">
         <HorizontalAuraWave state={orbState} analyserRef={analyserRef} ttsAnalyserRef={ttsAnalyserRef} />
      </div>

      <motion.div
         drag
         dragConstraints={dragConstraintsRef}
         dragElastic={0.1}
         dragMomentum={false}
         initial={{ opacity: 0, scale: 0.8 }}
         animate={{ opacity: 1, scale: 1 }}
         className="absolute right-8 top-32 w-72 h-48 bg-slate-900 rounded-3xl overflow-hidden border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 cursor-move hover:border-white/10 transition-colors"
         style={{ touchAction: 'none' }}
      >
        {cameraTrack ? (
          <VideoTrack trackRef={{ participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }} className="w-full h-full object-cover scale-x-[-1] pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">
            Camera starting
          </div>
        )}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-none shadow-sm">
           <div className={`w-2 h-2 rounded-full ${cameraTrack ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'}`} />
           <span className={`text-[10px] font-bold uppercase tracking-widest ${cameraTrack ? 'text-emerald-400' : 'text-amber-300'}`}>
             {cameraTrack ? 'Active' : 'Starting'}
           </span>
        </div>
      </motion.div>

      <RoomAudioRenderer />
    </div>
  );
};
