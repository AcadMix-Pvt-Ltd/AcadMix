import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microphone, Clock, Stop, VideoCamera, VideoCameraSlash } from '@phosphor-icons/react';
import { LiveKitRoom, useVoiceAssistant, RoomAudioRenderer, useLocalParticipant, useConnectionState, useTrackTranscription, VideoTrack, useRemoteParticipants } from '@livekit/components-react';
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
      <div ref={containerRef} className="w-full h-48 sm:h-56 relative flex items-center justify-center [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};


const TypewriterText = ({ text, isSpeaking, className, cursorClassName }: { text: string, isSpeaking: boolean, className?: string, cursorClassName?: string }) => {
  const [displayLength, setDisplayLength] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const MS_PER_CHAR = 72;

  useEffect(() => {
    if (isSpeaking && text) {
      startTimeRef.current = performance.now();
      setDisplayLength(0);
      const animate = () => {
        if (!startTimeRef.current) return;
        const elapsed = performance.now() - startTimeRef.current;
        const chars = Math.floor(elapsed / MS_PER_CHAR);
        setDisplayLength(Math.min(chars, text.length));
        if (chars < text.length) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isSpeaking, text]);

  useEffect(() => {
    if (!isSpeaking && text) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setDisplayLength(text.length);
    }
  }, [isSpeaking, text]);

  const isComplete = displayLength >= (text?.length || 0);

  return (
    <motion.p className={className || "text-2xl sm:text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 tracking-tight leading-tight"}>
      {text?.slice(0, displayLength)}
      {!isComplete && <span className={cursorClassName || "inline-block w-1.5 h-6 bg-teal-400 ml-1 rounded-sm animate-pulse"} />}
    </motion.p>
  );
};

// ─── Session Entry Overlay (3-step transition) ─────────────────────────────
// Step 1: "Connecting to Interviewer..." (while room connects)
// Step 2: "Interviewer joined. Session will begin in a moment" (2.5s after connected)
// Step 3: Overlay fades out → interview begins
const SessionEntryOverlay = ({ connectionState }: { connectionState: string }) => {
  const [phase, setPhase] = useState<'connecting' | 'joined' | 'done'>('connecting');

  useEffect(() => {
    if (connectionState === 'connected' && phase === 'connecting') {
      setPhase('joined');
      const timer = setTimeout(() => setPhase('done'), 2500);
      return () => clearTimeout(timer);
    }
  }, [connectionState, phase]);

  // Auto-dismiss after 8s even if connection state never becomes 'connected'
  useEffect(() => {
    const fallback = setTimeout(() => setPhase('done'), 8000);
    return () => clearTimeout(fallback);
  }, []);

  if (phase === 'done') return null;

  return (
    <AnimatePresence>
      <motion.div
        key="session-entry"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 bg-[#06090e] flex flex-col z-[99999] overflow-hidden font-sans"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen opacity-50" />
          <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-teal-600/10 rounded-full blur-[150px] mix-blend-screen opacity-50" />
        </div>

        <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6 border-b border-white/[0.03]">
          <div className="flex items-center gap-4">
            <Avatar size={36} name="AcadMix Intelligence" variant="beam" colors={['#6366f1', '#14b8a6', '#8b5cf6', '#06b6d4', '#34d399']} />
            <span className="text-sm font-bold text-slate-300 tracking-wider uppercase">AcadMix Intelligence</span>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-10 w-full max-w-5xl mx-auto overflow-hidden h-full">
          <AnimatePresence mode="wait">
            {phase === 'connecting' && (
              <motion.div key="connecting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin mb-6" />
                <h2 className="text-2xl font-black text-slate-200 uppercase tracking-widest">Connecting...</h2>
                <p className="text-slate-400 mt-3 font-medium tracking-wide">Connecting to Interviewer</p>
              </motion.div>
            )}
            {phase === 'joined' && (
              <motion.div key="joined" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-black text-emerald-300 uppercase tracking-widest">Interviewer Joined</h2>
                <p className="text-slate-400 mt-3 font-medium tracking-wide">Session will begin in a moment</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const ActiveLiveKitInterview = ({ elapsed, isEnding, maxQuestions, questionNumber, onEnd, dragConstraintsRef, formatTime }) => {
  const { state, audioTrack, agentTranscriptions, agent } = useVoiceAssistant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();
  const { cameraTrack, localParticipant } = useLocalParticipant();
  const micTrack = localParticipant?.getTrackPublication(Track.Source.Microphone)?.track;
  
  const userTrackRef = useMemo(() => {
    return micTrack && localParticipant ? { participant: localParticipant, publication: micTrack, source: Track.Source.Microphone } : undefined;
  }, [micTrack, localParticipant]);

  const { segments: userTranscriptions } = useTrackTranscription(userTrackRef);

  const [conversation, setConversation] = useState([]);
  const seenIds = useRef(new Set());

  // Aggregate finalized segments into historical conversation
  useEffect(() => {
    let newMsgs = [];
    userTranscriptions.filter(s => s.final && !seenIds.current.has(s.id)).forEach(s => {
      seenIds.current.add(s.id);
      newMsgs.push({ role: 'user', content: s.text });
    });
    agentTranscriptions.filter(s => s.final && !seenIds.current.has(s.id)).forEach(s => {
      seenIds.current.add(s.id);
      newMsgs.push({ role: 'assistant', content: s.text });
    });
    if (newMsgs.length > 0) {
      setConversation(prev => [...prev, ...newMsgs]);
    }
  }, [userTranscriptions, agentTranscriptions]);

  const currentAgentText = agentTranscriptions.filter(s => !s.final).map(s => s.text).join(' ');
  const currentUserText = userTranscriptions.filter(s => !s.final).map(s => s.text).join(' ');

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

  return (
    <div ref={dragConstraintsRef} className="fixed inset-0 bg-[#06090e] flex flex-col z-[9999] overflow-hidden font-sans">
      <SessionEntryOverlay connectionState={connectionState} />
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
            <span className="text-sm font-bold text-indigo-400">Q {questionNumber}/{maxQuestions}</span>
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
          className="flex-1 w-full overflow-y-auto flex flex-col gap-6 pt-10 pb-8 [mask-image:linear-gradient(to_bottom,transparent,black_5%,black_90%,transparent)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          ref={(el) => { if (el) { el.scrollTop = el.scrollHeight; } }}
        >
           {conversation.map((msg, i) => (
             <motion.div 
               key={i} 
               initial={{ opacity: 0, y: 10, scale: 0.98 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
             >
               <div className={`max-w-[85%] md:max-w-[75%] rounded-3xl px-6 py-4 backdrop-blur-md border shadow-2xl ${
                 msg.role === 'user'
                   ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-50 rounded-br-sm'
                   : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-50 rounded-bl-sm'
               }`}>
                  <p className={`text-[15px] md:text-[17px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'opacity-90 font-medium' : 'text-slate-200'}`}>
                    {msg.content}
                  </p>
               </div>
             </motion.div>
           ))}

           {/* Live AI Transcript Bubble */}
           <AnimatePresence>
             {currentAgentText && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full justify-start">
                  <div className="max-w-[85%] md:max-w-[75%] rounded-3xl rounded-bl-sm px-6 py-4 backdrop-blur-md border bg-indigo-500/10 border-indigo-500/20 text-indigo-50 flex flex-col gap-2 shadow-2xl">
                    <TypewriterText text={currentAgentText} isSpeaking={true} className="text-[15px] md:text-[17px] leading-relaxed whitespace-pre-wrap font-medium" />
                  </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Live Student Transcript Bubble */}
           <AnimatePresence>
             {currentUserText && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full justify-end">
                  <div className="max-w-[85%] md:max-w-[75%] rounded-3xl rounded-br-sm px-6 py-4 backdrop-blur-md border bg-emerald-500/10 border-emerald-500/20 text-emerald-50 flex flex-col gap-2 shadow-2xl">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                       <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 opacity-80">Listening...</span>
                    </div>
                    <p className="text-[15px] md:text-[17px] leading-relaxed whitespace-pre-wrap font-medium opacity-90">{currentUserText}</p>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
           
           <div className="h-40 shrink-0" />
        </div>
      </div>

      <div className="absolute bottom-[56px] sm:bottom-[60px] left-0 right-0 z-0 h-48 sm:h-56 w-full flex items-center justify-center pointer-events-none opacity-90 mix-blend-screen">
         <HorizontalAuraWave state={orbState} analyserRef={analyserRef} ttsAnalyserRef={ttsAnalyserRef} />
      </div>

      {cameraTrack && (
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
          <VideoTrack trackRef={{ participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }} className="w-full h-full object-cover scale-x-[-1] pointer-events-none" />
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-none shadow-sm">
             <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
             <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active</span>
          </div>
        </motion.div>
      )}

      <RoomAudioRenderer />
    </div>
  );
};
