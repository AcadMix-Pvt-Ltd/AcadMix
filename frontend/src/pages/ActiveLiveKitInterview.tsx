import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Stop } from '@phosphor-icons/react';
import { useVoiceAssistant, RoomAudioRenderer, useLocalParticipant, useTrackTranscription, VideoTrack, useRoomContext, useChat } from '@livekit/components-react';
import { api } from '../services/api';
import Editor from '@monaco-editor/react';
import { Track } from 'livekit-client';
import Avatar from 'boring-avatars';
import { toast } from 'sonner';

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

      const stateKey = (state === 'connecting' ? 'thinking' : state) as keyof typeof ORB_STATES;
      const orbColor1 = ORB_STATES[stateKey]?.color1 || '#14b8a6';
      const orbColor2 = ORB_STATES[stateKey]?.color2 || '#06b6d4';
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

const isRepeatRequest = (text: string): boolean => {
  const normalized = normalizeTranscriptText(text);
  if (!normalized) return false;
  return [
    'repeat',
    'say that again',
    'say it again',
    'come again',
    'pardon',
    'one more time',
    'could you repeat',
    'can you repeat',
    'please repeat',
    'what did you say',
    'sorry what',
    'i missed that',
  ].some(phrase => normalized.includes(phrase));
};

const isClarificationTurn = (content: string): boolean => {
  const normalized = normalizeTranscriptText(content);
  if (!normalized) return false;
  const directClarification = [
    'i did not quite understand',
    "i didn't quite understand",
    'i do not understand',
    "i don't understand",
    'not quite sure how',
    'not sure how',
    'how that connects',
    'how this connects',
    'how that relates',
    'how this relates',
    'could you clarify',
    'can you clarify',
    'please clarify',
    'clarify what you mean',
    'what do you mean by',
    'could you continue',
    'please continue',
    'could you answer',
    'continue your answer',
    'complete your answer',
  ].some(phrase => normalized.includes(phrase));

  const mentionedClarification =
    normalized.includes('you mentioned') &&
    [
      'could you elaborate',
      'can you elaborate',
      'could you clarify',
      'can you clarify',
      'could you explain what you mean',
      'can you explain what you mean',
      'could you continue',
      'can you continue',
    ].some(phrase => normalized.includes(phrase));

  return directClarification || mentionedClarification;
};

const isNoResponseNudge = (content: string): boolean => {
  const normalized = normalizeTranscriptText(content);
  if (!normalized) return false;
  return [
    'i am still listening',
    'i still have not heard your response',
    'i still have not heard a response',
  ].some(phrase => normalized.includes(phrase));
};

const turnKind = (role: 'assistant' | 'user', content: string): string => {
  if (role === 'user') return 'answer';
  if (isNoResponseNudge(content)) return 'nudge';
  if (isClarificationTurn(content) || isRepeatRequest(content)) return 'clarification';
  return 'question';
};

const USER_TURN_FINALIZE_DELAY_MS = 2800;

const mergeUserTurnText = (existing: string, incoming: string) => {
  const current = String(existing || '').trim();
  const next = String(incoming || '').trim();
  if (!current) return next;
  if (!next) return current;

  const currentNorm = normalizeTranscriptText(current);
  const nextNorm = normalizeTranscriptText(next);
  if (currentNorm === nextNorm) return next.length > current.length ? next : current;
  if (nextNorm.includes(currentNorm)) return next;
  if (currentNorm.includes(nextNorm)) return current;
  return `${current} ${next}`.replace(/\s+/g, ' ').trim();
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

const WhiteboardPanel = ({
  room,
  localParticipant,
  onClose
}: {
  room: any;
  localParticipant: any;
  onClose: () => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#14b8a6');
  const [brushSize, setBrushSize] = useState(5);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) tempCtx.drawImage(canvas, 0, 0);
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }
    
    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    toast.success("Whiteboard cleared");
  };
  
  const submitDesign = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const imgData = canvas.toDataURL('image/png');
    try {
      const payload = JSON.stringify({ image: imgData });
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      if (localParticipant) {
        localParticipant.publishData(data, { topic: 'whiteboard_state' });
        toast.success("Whiteboard architecture submitted successfully!");
      }
    } catch (err) {
      console.error("Failed to publish whiteboard data:", err);
      toast.error("Failed to submit whiteboard design");
    }

    try {
      await api.post(`/interview/${room.name}/sync-state`, {
        whiteboard_image: imgData,
        current_stage: 'whiteboard'
      });
      console.log("Synced whiteboard image to backend via fallback HTTP");
    } catch (err) {
      console.error("Failed to sync whiteboard to backend via HTTP fallback:", err);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0e14]">
      <div className="px-6 py-4 border-b border-white/[0.03] flex items-center justify-between shrink-0 bg-[#0d111b]/80">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-200 uppercase tracking-widest text-indigo-400">Whiteboard Sketchpad</span>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900 border border-white/5 p-0.5 rounded-full">
          <button
            onClick={() => setMode('draw')}
            className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all ${
              mode === 'draw' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Draw
          </button>
          <button
            onClick={() => setMode('erase')}
            className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all ${
              mode === 'erase' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Eraser
          </button>
        </div>
      </div>
      
      <div className="px-6 py-2 border-b border-white/[0.03] flex items-center justify-between gap-4 bg-[#090d15]/50 text-xs shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Color:</span>
          <div className="flex gap-2">
            {[
              { val: '#14b8a6', name: 'Teal' },
              { val: '#6366f1', name: 'Indigo' },
              { val: '#ffffff', name: 'White' }
            ].map((col) => (
              <button
                key={col.val}
                disabled={mode === 'erase'}
                onClick={() => setColor(col.val)}
                className={`w-6 h-6 rounded-full border transition-all ${
                  color === col.val && mode === 'draw'
                    ? 'border-white scale-110 shadow-sm'
                    : 'border-white/10 hover:scale-105'
                }`}
                style={{ backgroundColor: col.val }}
                title={col.name}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Pen Size:</span>
          <div className="flex bg-slate-900 border border-white/5 p-0.5 rounded-full">
            {[
              { val: 2, label: 'Fine' },
              { val: 5, label: 'Medium' },
              { val: 10, label: 'Thick' }
            ].map((size) => (
              <button
                key={size.val}
                onClick={() => setBrushSize(size.val)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                  brushSize === size.val
                    ? 'bg-slate-800 text-teal-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={clearCanvas}
          className="px-3 py-1 border border-white/5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors font-bold uppercase tracking-wider text-[9px]"
        >
          Clear Board
        </button>
      </div>
      
      <div ref={containerRef} className="flex-1 min-h-0 relative cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 bg-[#06090e]"
        />
      </div>
      
      <div className="p-4 border-t border-white/[0.05] flex items-center justify-between gap-4 bg-[#0d111b]/80 shrink-0">
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-full border border-white/5 text-slate-400 text-xs font-bold hover:bg-white/5 hover:text-slate-200 transition-colors"
        >
          Close Whiteboard
        </button>
        <button
          onClick={submitDesign}
          className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold hover:from-indigo-400 hover:to-purple-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
        >
          Submit Design
        </button>
      </div>
    </div>
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

  const room = useRoomContext();
  const { send: sendChatMessage } = useChat();

  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  // Advanced Technical Round state
  const [rightPanelMode, setRightPanelMode] = useState<'sandbox' | 'whiteboard'>('sandbox');
  const [testCases, setTestCases] = useState<any[]>([]);
  const [consoleTab, setConsoleTab] = useState<'console' | 'tests'>('console');

  // Listen for Room Data Channel packets (editor show/hide controls)
  useEffect(() => {
    const handleDataReceived = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
      if (topic && topic !== 'room_control') return;
      const decoder = new TextDecoder();
      const text = decoder.decode(payload);
      try {
        const data = JSON.parse(text);
        if (data.action === 'show_code_editor') {
          setShowCodeEditor(true);
          setRightPanelMode('sandbox');
          if (data.language) {
            setEditorLanguage(data.language.toLowerCase());
          }
          if (data.test_cases && Array.isArray(data.test_cases)) {
            setTestCases(data.test_cases.map((tc: any) => ({
              ...tc,
              actual_output: '',
              status: 'not_run'
            })));
          } else {
            setTestCases([]);
          }
          setConsoleTab('console');
        } else if (data.action === 'show_whiteboard') {
          setShowCodeEditor(true);
          setRightPanelMode('whiteboard');
        } else if (data.action === 'hide_code_editor') {
          setShowCodeEditor(false);
        }
      } catch (e) {
        // Not room control JSON, ignore
      }
    };
    room.on('dataReceived', handleDataReceived);
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  // Helper to extract code blocks from assistant message
  const extractCodeBlock = (text: string): { code: string; language: string } | null => {
    const match = text.match(/```(\w*)\n([\s\S]*?)```/);
    if (match) {
      return {
        language: match[1] || 'python',
        code: match[2].trim()
      };
    }
    return null;
  };

  // Pre-populate editor when opening
  useEffect(() => {
    if (showCodeEditor && conversation.length > 0) {
      const lastAssistant = [...conversation].reverse().find(msg => msg.role === 'assistant');
      if (lastAssistant) {
        const block = extractCodeBlock(lastAssistant.content);
        if (block) {
          setEditorLanguage(block.language);
          setCode(block.code);
        } else {
          // Default empty template
          if (!code) {
            if (editorLanguage === 'sql') {
              setCode('-- Write your SQL query here\n');
            } else if (editorLanguage === 'text') {
              setCode('# Design / Sketchpad\n- Describe your approach here\n');
            } else {
              setCode(`# Write your ${editorLanguage} code here\n`);
            }
          }
        }
      }
    }
  }, [showCodeEditor, conversation, editorLanguage]);

  // Debounced background code state sync to the voice agent
  useEffect(() => {
    if (!showCodeEditor || rightPanelMode !== 'sandbox' || !code || !localParticipant) return;
    const timer = setTimeout(async () => {
      try {
        const payload = JSON.stringify({ code, language: editorLanguage });
        const encoder = new TextEncoder();
        const data = encoder.encode(payload);
        localParticipant.publishData(data, { topic: 'code_state' });
        console.log("Synced code to agent over data channel");
      } catch (e) {
        console.error("Failed to sync code state:", e);
      }

      try {
        await api.post(`/interview/${room.name}/sync-state`, {
          code,
          language: editorLanguage,
          current_stage: 'coding'
        });
        console.log("Synced code to backend via fallback HTTP");
      } catch (err) {
        console.error("Failed to sync code to backend via HTTP fallback:", err);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [code, editorLanguage, showCodeEditor, rightPanelMode, localParticipant, room]);

  const handleRun = async () => {
    if (!code.trim() || running) return;
    setRunning(true);
    setOutput('Running code in sandbox...\n');
    setTestCases(prev => prev.map(tc => ({ ...tc, actual_output: '', status: 'not_run' })));
    
    try {
      const res = await api.post('/challenges/run', {
        challenge_id: 'sandbox',
        code: code,
        language: editorLanguage,
        test_cases: testCases.map(tc => ({ input_data: tc.input_data, expected_output: tc.expected_output }))
      });
      const runData = res as any;
      if (runData.error) {
        setOutput(`Error:\n${runData.error}\n`);
      } else {
        const consoleOutput = runData.output || '';
        setOutput(consoleOutput);
        
        if (testCases.length > 0 && consoleOutput.includes('___ACADMIX_START_TESTS___')) {
          const startIdx = consoleOutput.indexOf('___ACADMIX_START_TESTS___');
          const endIdx = consoleOutput.indexOf('___ACADMIX_END___');
          const testsPart = consoleOutput.substring(
            startIdx + '___ACADMIX_START_TESTS___'.length,
            endIdx !== -1 ? endIdx : undefined
          );
          const segments = testsPart.split('___ACADMIX_SEP___');
          
          setTestCases(prev => prev.map((tc, idx) => {
            const segment = segments[idx] || '';
            const passed = segment.includes('___ACADMIX_STATUS_PASS___');
            const failed = segment.includes('___ACADMIX_STATUS_FAIL___');
            
            const actual = segment
              .replace('___ACADMIX_STATUS_PASS___', '')
              .replace('___ACADMIX_STATUS_FAIL___', '')
              .trim();
              
            return {
              ...tc,
              actual_output: actual,
              status: passed ? 'passed' : failed ? 'failed' : 'failed'
            };
          }));
          setConsoleTab('tests');
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || 'Unknown error occurred.';
      setOutput(`Failed to run code:\n${errMsg}\n`);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    const formattedCode = `\`\`\`${editorLanguage}\n${code}\n\`\`\``;
    try {
      await sendChatMessage(formattedCode);
      setShowCodeEditor(false);
      // Append to local state immediately
      const localMsg = {
        id: `user-code-${Date.now()}`,
        role: 'user',
        content: formattedCode,
        timestamp: new Date().toISOString(),
        source: 'editor',
        kind: 'answer',
      };
      setConversation((prev: any[]) => [...prev, localMsg]);
    } catch (err) {
      console.error("Failed to submit code:", err);
    }
  };
  
  const userTrackRef = useMemo(() => {
    return micTrack && localParticipant ? { participant: localParticipant, publication: micTrack, source: Track.Source.Microphone } : undefined;
  }, [micTrack, localParticipant]);

  const { segments: userTranscriptions } = useTrackTranscription(userTrackRef as any);

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
  const pendingUserTurnRef = useRef<any | null>(null);
  const pendingUserTimerRef = useRef<number | null>(null);
  const [pendingUserText, setPendingUserText] = useState('');

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    agentStateRef.current = state;
  }, [state]);

  const clearPendingUserTimer = useCallback(() => {
    if (pendingUserTimerRef.current) {
      window.clearTimeout(pendingUserTimerRef.current);
      pendingUserTimerRef.current = null;
    }
  }, []);

  const flushPendingUserTurn = useCallback(() => {
    clearPendingUserTimer();

    const pending = pendingUserTurnRef.current;
    pendingUserTurnRef.current = null;
    setPendingUserText('');

    const content = (pending?.content || '').trim();
    if (!content) return [];

    const msg = {
      id: pending.id,
      role: 'user',
      content,
      timestamp: pending.timestamp || new Date().toISOString(),
      source: pending.source || 'livekit',
      kind: 'answer',
    };

    if (conversationRef.current.some((existing: any) => isDuplicateTurn(existing, msg))) {
      return [];
    }

    const lastTurn = conversationRef.current[conversationRef.current.length - 1];
    if (lastTurn?.role === 'user') {
      const mergedMsg = {
        ...lastTurn,
        content: mergeUserTurnText(lastTurn.content, msg.content),
        timestamp: msg.timestamp,
        kind: 'answer',
      };
      conversationRef.current = [
        ...conversationRef.current.slice(0, -1),
        mergedMsg,
      ];
      setConversation((prev: any[]) => {
        const last = prev[prev.length - 1];
        if (last?.role !== 'user') return prev;
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            content: mergeUserTurnText(last.content, msg.content),
            timestamp: msg.timestamp,
            kind: 'answer',
          },
        ];
      });
      return [];
    }

    conversationRef.current = [...conversationRef.current, msg];
    setConversation((prev: any[]) => {
      if (prev.some((existing: any) => isDuplicateTurn(existing, msg))) return prev;
      return [...prev, msg];
    });
    onTranscriptTurns?.([msg]);
    return [msg];
  }, [clearPendingUserTimer, onTranscriptTurns, setConversation]);

  const schedulePendingUserFlush = useCallback(() => {
    clearPendingUserTimer();
    pendingUserTimerRef.current = window.setTimeout(() => {
      flushPendingUserTurn();
    }, USER_TURN_FINALIZE_DELAY_MS);
  }, [clearPendingUserTimer, flushPendingUserTurn]);

  const bufferUserSegment = useCallback((segment: any) => {
    const text = (segment?.text || '').trim();
    if (!text) return;

    const pending = pendingUserTurnRef.current;
    const content = mergeUserTurnText(pending?.content || '', text);
    pendingUserTurnRef.current = {
      id: pending?.id || segment.id || `user-turn-${Date.now()}`,
      role: 'user',
      content,
      timestamp: pending?.timestamp || new Date().toISOString(),
      source: segment.source || 'livekit',
      kind: 'answer',
    };
    setPendingUserText(content);
    schedulePendingUserFlush();
  }, [schedulePendingUserFlush]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !micTrack?.mediaStreamTrack || isEnding) return;

    const flushBrowserSpeech = () => {
      const content = browserSpeechBufferRef.current.replace(/\s+/g, ' ').trim();
      browserSpeechBufferRef.current = '';
      setBrowserSpeechText('');

      if (!content) return;
      if (normalizeTranscriptText(content) === normalizeTranscriptText(lastBrowserSpeechRef.current)) return;

      lastBrowserSpeechRef.current = content;
      bufferUserSegment({
        id: `browser-speech-${Date.now()}-${browserSpeechSeqRef.current++}`,
        text: content,
        source: 'browser-speech',
      });
      flushPendingUserTurn();
    };

    const scheduleFlush = () => {
      if (browserSpeechTimerRef.current) window.clearTimeout(browserSpeechTimerRef.current);
      browserSpeechTimerRef.current = window.setTimeout(flushBrowserSpeech, USER_TURN_FINALIZE_DELAY_MS);
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
      setBrowserSpeechText(displayed);
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
  }, [micTrack, isEnding, bufferUserSegment, flushPendingUserTurn]);

  // Aggregate finalized segments into historical conversation
  useEffect(() => {
    const newMsgs: any[] = [];
    userTranscriptions.filter(s => s.final && !seenIds.current.has(s.id)).forEach(s => {
      seenIds.current.add(s.id);
      bufferUserSegment(s);
    });
    agentTranscriptions.filter(s => s.final && !seenIds.current.has(s.id)).forEach(s => {
      seenIds.current.add(s.id);
      flushPendingUserTurn();
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
  }, [userTranscriptions, agentTranscriptions, bufferUserSegment, flushPendingUserTurn, setConversation, onTranscriptTurns]);

  const currentAgentText = useMemo(
    () => latestLiveText(agentTranscriptions, 'assistant', conversation),
    [agentTranscriptions, conversation],
  );
  const currentUserText = useMemo(
    () => {
      const text = latestLiveText(userTranscriptions, 'user', conversation);
      return mergeUserTurnText(pendingUserText, text || browserSpeechText);
    },
    [userTranscriptions, conversation, browserSpeechText, pendingUserText],
  );
  const lastConversationTurn = conversation[conversation.length - 1];
  const shouldMergeLiveUserIntoLastTurn = Boolean(currentUserText && lastConversationTurn?.role === 'user');
  const visibleConversation = useMemo(() => {
    if (!shouldMergeLiveUserIntoLastTurn) return conversation;

    const lastTurn = conversation[conversation.length - 1];
    const mergedContent = mergeUserTurnText(lastTurn.content, currentUserText);
    return [
      ...conversation.slice(0, -1),
      {
        ...lastTurn,
        content: mergedContent,
      },
    ];
  }, [conversation, currentUserText, shouldMergeLiveUserIntoLastTurn]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (!shouldStickToBottomRef.current || !bottomSentinelRef.current) return;
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      bottomSentinelRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [visibleConversation.length, currentAgentText, currentUserText]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
      clearPendingUserTimer();
    };
  }, [clearPendingUserTimer]);

  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if ((audioTrack as any)?.mediaStreamTrack && !ttsAnalyserRef.current) {
      try {
        const stream = new MediaStream([(audioTrack as any).mediaStreamTrack]);
        const source = audioCtxRef.current!.createMediaStreamSource(stream);
        const analyser = audioCtxRef.current!.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        ttsAnalyserRef.current = analyser;
      } catch (e) { console.error("Failed to wire ttsAnalyser", e); }
    }
    
    if ((micTrack as any)?.mediaStreamTrack && !analyserRef.current) {
      try {
        const stream = new MediaStream([(micTrack as any).mediaStreamTrack]);
        const source = audioCtxRef.current!.createMediaStreamSource(stream);
        const analyser = audioCtxRef.current!.createAnalyser();
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

      <div className="relative z-10 flex-1 min-h-0 flex flex-row overflow-hidden w-full">
        {/* Left Panel: Conversation Chat */}
        <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${showCodeEditor ? 'w-[50%]' : 'w-full'}`}>
          <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-10 w-full overflow-hidden">
            <div
              ref={chatScrollRef}
              onScroll={(event) => {
                const el = event.currentTarget;
                shouldStickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
              }}
              className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col gap-5 pt-10 pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
               {visibleConversation.map((msg, i) => (
                 <TranscriptRow
                   key={transcriptKey(msg, i)}
                   role={msg.role}
                   content={msg.content}
                 />
               ))}

               {currentAgentText && (
                 <TranscriptRow role="assistant" content={currentAgentText} isLive />
               )}

               {currentUserText && !shouldMergeLiveUserIntoLastTurn && (
                 <TranscriptRow role="user" content={currentUserText} isLive />
               )}

               <div ref={bottomSentinelRef} className="h-1 shrink-0" />
            </div>
          </div>

          <div className="relative z-0 h-36 sm:h-40 shrink-0 w-full overflow-hidden pointer-events-none opacity-55 mix-blend-screen">
            <div className="absolute inset-x-0 bottom-0 h-full flex items-center justify-center">
              <HorizontalAuraWave state={orbState} analyserRef={analyserRef} ttsAnalyserRef={ttsAnalyserRef} />
            </div>
          </div>
        </div>

        {/* Right Panel: Code Sandbox or Whiteboard */}
        {showCodeEditor && (
          <div className="w-[50%] border-l border-white/[0.05] bg-[#0b0e14] flex flex-col h-full overflow-hidden">
            {/* Header tab selector (pill shaped tab container) */}
            <div className="px-6 py-3 border-b border-white/[0.03] flex items-center justify-between shrink-0 bg-[#0d111b]/80">
              <div className="flex bg-slate-900 border border-white/5 p-0.5 rounded-full shadow-inner select-none">
                <button
                  onClick={() => setRightPanelMode('sandbox')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    rightPanelMode === 'sandbox'
                      ? 'bg-slate-800 text-teal-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Coding Sandbox
                </button>
                <button
                  onClick={() => setRightPanelMode('whiteboard')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    rightPanelMode === 'whiteboard'
                      ? 'bg-slate-800 text-teal-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Whiteboard
                </button>
              </div>
              <button
                onClick={() => setShowCodeEditor(false)}
                className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300 font-bold transition-colors"
              >
                Hide Panel
              </button>
            </div>

            {/* Content Switcher */}
            {rightPanelMode === 'whiteboard' ? (
              <WhiteboardPanel
                room={room}
                localParticipant={localParticipant}
                onClose={() => setShowCodeEditor(false)}
              />
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Editor Header: Sub-Header */}
                <div className="px-6 py-2 border-b border-white/[0.03] flex items-center justify-between shrink-0 bg-[#0d111b]/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Language Configuration
                  </span>
                  <select
                    value={editorLanguage}
                    onChange={(e) => setEditorLanguage(e.target.value)}
                    className="bg-slate-800 text-slate-200 border border-slate-700/60 rounded-full px-3.5 py-1 text-xs font-bold focus:outline-none focus:border-indigo-500 hover:bg-slate-700 transition-colors shadow-sm"
                  >
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                    <option value="c">C</option>
                    <option value="sql">SQL</option>
                    <option value="text">Plain Text</option>
                  </select>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 min-h-0 relative">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={editorLanguage === 'text' ? 'plaintext' : editorLanguage.toLowerCase()}
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    options={{
                      fontSize: 14,
                      fontFamily: 'JetBrains Mono, Fira Code, monospace',
                      minimap: { enabled: false },
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 12, bottom: 12 },
                      background: '#0b0e14',
                    }}
                  />
                </div>

                {/* Console Output Panel */}
                <div className="h-56 border-t border-white/[0.05] bg-[#070a0f] flex flex-col shrink-0 overflow-hidden">
                  <div className="px-5 py-2 border-b border-white/[0.03] flex items-center justify-between bg-[#090d15]/50 shrink-0">
                    <div className="flex bg-slate-900 border border-white/5 p-0.5 rounded-full">
                      <button
                        onClick={() => setConsoleTab('console')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                          consoleTab === 'console'
                            ? 'bg-slate-800 text-teal-400 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Console Output
                      </button>
                      {testCases.length > 0 && (
                        <button
                          onClick={() => setConsoleTab('tests')}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                            consoleTab === 'tests'
                              ? 'bg-slate-800 text-teal-400 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Test Cases ({testCases.filter(t => t.status === 'passed').length}/{testCases.length})
                        </button>
                      )}
                    </div>
                    {running && <span className="text-[10px] text-teal-400 font-bold animate-pulse">Executing...</span>}
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden bg-[#070a0f]">
                    {consoleTab === 'console' ? (
                      <div className="h-full p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                        {output || 'Click "Run Code" to execute compilation. Output will be displayed here.'}
                      </div>
                    ) : (
                      <div className="h-full p-4 overflow-y-auto flex flex-col gap-3 bg-[#070a0f] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {testCases.map((tc, index) => (
                          <div key={index} className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex flex-col gap-2 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Test Case #{index + 1}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                tc.status === 'passed'
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                  : tc.status === 'failed'
                                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                  : 'bg-slate-800 border border-slate-700/60 text-slate-400'
                              }`}>
                                {tc.status === 'passed' ? 'Passed' : tc.status === 'failed' ? 'Failed' : 'Not Run'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                              <div>
                                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Input:</span>
                                <div className="p-2 bg-black/45 rounded-lg border border-white/5 text-slate-300 max-h-16 overflow-y-auto select-text">{tc.input_data}</div>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Expected:</span>
                                <div className="p-2 bg-black/45 rounded-lg border border-white/5 text-slate-300 max-h-16 overflow-y-auto select-text">{tc.expected_output}</div>
                              </div>
                            </div>
                            {tc.actual_output && (
                              <div className="text-xs font-mono mt-1">
                                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Actual Output:</span>
                                <div className={`p-2 bg-black/45 rounded-lg border text-slate-300 max-h-20 overflow-y-auto select-text ${
                                  tc.status === 'passed' ? 'border-emerald-500/20' : 'border-red-500/20'
                                }`}>{tc.actual_output}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Bar (Pill shaped container for buttons) */}
                <div className="p-4 border-t border-white/[0.05] flex items-center justify-between gap-4 bg-[#0d111b]/80 shrink-0">
                  <button
                    onClick={() => setShowCodeEditor(false)}
                    className="px-5 py-2 rounded-full border border-white/5 text-slate-400 text-xs font-bold hover:bg-white/5 hover:text-slate-200 transition-colors"
                  >
                    Close Editor
                  </button>
                  <div className="flex items-center gap-3">
                    {editorLanguage !== 'text' && (
                      <button
                        onClick={handleRun}
                        disabled={running}
                        className="px-5 py-2 rounded-full bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-bold hover:bg-slate-700 active:scale-95 transition-all shadow-sm flex items-center gap-2"
                      >
                        Run Code
                      </button>
                    )}
                    <button
                      onClick={handleSubmit}
                      className="px-5 py-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-bold hover:from-teal-400 hover:to-cyan-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(20,184,166,0.2)]"
                    >
                      Submit Solution
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
          <VideoTrack trackRef={{ participant: localParticipant as any, publication: cameraTrack as any, source: Track.Source.Camera }} className="w-full h-full object-cover scale-x-[-1] pointer-events-none" />
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
