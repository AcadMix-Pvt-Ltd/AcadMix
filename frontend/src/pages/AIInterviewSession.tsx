import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microphone, MicrophoneSlash, Clock, ArrowsOut, X, Brain, Warning, Sparkle, Stop, ChatCircleDots, FileText, Upload, ArrowRight, VideoCamera, VideoCameraSlash, ArrowElbowLeftUp, LockKey } from '@phosphor-icons/react';
import { interviewAPI, resumeAPI, resumeVaultAPI } from '../services/api';
import { toast } from 'sonner';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import Avatar from 'boring-avatars';
import { LiveKitRoom, useVoiceAssistant, BarVisualizer, RoomAudioRenderer, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';

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
         // Calculate overall energy from the lower half of frequencies (human voice range)
         const maxIndex = Math.floor(dataArray.length * 0.5);
         for (let j = 0; j < maxIndex; j++) sum += dataArray[j];
         
         // Normalize and apply noise gate
         let rawEnergy = (sum / maxIndex / 255);
         rawEnergy = rawEnergy < 0.08 ? 0 : (rawEnergy - 0.08) / 0.92;
         energy = Math.min(1.0, rawEnergy * 3.0); // Boosted 0->1

         for (let i = 0; i < NUM_POINTS; i++) {
           const t = i / (NUM_POINTS - 1);
           const bell = Math.sin(t * Math.PI);

           // Multi-frequency flowing sine waves
           const wave1 = Math.sin(time * 1.8 + t * Math.PI * 4) * 18;
           const wave2 = Math.sin(time * 2.5 + t * Math.PI * 6 + 1.2) * 12;
           const wave3 = Math.sin(time * 3.2 + t * Math.PI * 8 + 2.8) * 7;
           const wave4 = Math.sin(time * 1.1 + t * Math.PI * 2 + 0.5) * 22;
           const wave5 = Math.sin(time * 4.0 + t * Math.PI * 10 + 4.1) * 4;

           // Breathing + real mic energy modulation
           const breathe = 0.7 + 0.3 * Math.sin(time * 0.6);
           const amplitude = (0.15 + energy * 0.85) * breathe; // minimum 15% even in silence

           targetData[i] = (wave1 + wave2 + wave3 + wave4 + wave5) * bell * amplitude;
         }
      } else if (state === 'speaking' || state === 'evaluating') {
         // Smooth Siri-style waves modulated by real audio energy
         let energy = 0.5; // default baseline when no analyser

         const activeAnalyser = ttsAnalyserRef?.current;
         if (activeAnalyser) {
           // Extract RMS energy from real audio output
           const dataArray = new Uint8Array(activeAnalyser.frequencyBinCount);
           activeAnalyser.getByteFrequencyData(dataArray);
           let sum = 0;
           for (let j = 0; j < dataArray.length; j++) sum += dataArray[j];
           energy = Math.min(1.0, (sum / dataArray.length / 255) * 3.5); // normalized 0→1, boosted
         }

         for (let i = 0; i < NUM_POINTS; i++) {
           const t = i / (NUM_POINTS - 1);
           const bell = Math.sin(t * Math.PI);

           // Multi-frequency flowing sine waves
           const wave1 = Math.sin(time * 1.8 + t * Math.PI * 4) * 18;
           const wave2 = Math.sin(time * 2.5 + t * Math.PI * 6 + 1.2) * 12;
           const wave3 = Math.sin(time * 3.2 + t * Math.PI * 8 + 2.8) * 7;
           const wave4 = Math.sin(time * 1.1 + t * Math.PI * 2 + 0.5) * 22;
           const wave5 = Math.sin(time * 4.0 + t * Math.PI * 10 + 4.1) * 4;

           // Breathing + real audio energy modulation
           const breathe = 0.7 + 0.3 * Math.sin(time * 0.6);
           const amplitude = (0.15 + energy * 0.85) * breathe; // minimum 15% even in silence

           targetData[i] = (wave1 + wave2 + wave3 + wave4 + wave5) * bell * amplitude;
         }
      } else if (state === 'thinking') {
         // Gentle undulating wave — slower, subtler
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

      // Apply smoothing to transitions
      for (let i = 0; i < NUM_POINTS; i++) {
        smoothedData[i] += (targetData[i] - smoothedData[i]) * 0.12;
      }

      const orbColor1 = ORB_STATES[state]?.color1 || '#14b8a6';
      const orbColor2 = ORB_STATES[state]?.color2 || '#06b6d4';
      const colors = [orbColor1, orbColor2, '#ffffff'];

      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw 3 layers of overlapping fluid lines
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        
        for (let i = 0; i < NUM_POINTS; i++) {
          const x = (i / (NUM_POINTS - 1)) * width;
          const phaseOffset = layer * Math.PI * 0.6;
          // Base idle animation — very subtle breathing when silent, more visible when not listening
          const idleAmp = state === 'listening' ? 1.5 : 4;
          const idleWave = Math.sin(time + (i / NUM_POINTS) * Math.PI * 2 + phaseOffset) * idleAmp;
          
          // Apply audio amplitude. Layer 1 is inverted for a mirroring effect.
          const direction = layer === 1 ? -1 : 1;
          const amplitude = smoothedData[i] * direction * (1 - layer * 0.1); // Slightly reduce amplitude per layer
          const y = centerY + idleWave + amplitude;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = colors[layer];
        ctx.lineWidth = 4 - layer; // Inner lines are thinner
        ctx.shadowColor = colors[layer];
        ctx.shadowBlur = 12 + layer * 8; // Inner lines have wider glow
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


// ─── Voice-Synced Text (Time-Proportional) ────────────────────────────────────────
// Smooth rAF animation calibrated to TTS speech rate (0.95 × ~150WPM ≈ 70ms/char).
// No dependency on onboundary — works reliably across all browsers and voices.
const TypewriterText = ({ text, isSpeaking, className, cursorClassName }: { text: string, isSpeaking: boolean, className?: string, cursorClassName?: string }) => {
  const [displayLength, setDisplayLength] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Calibrated to match Chrome TTS at rate=0.95
  // ~150 WPM × 0.95 = ~142 WPM × 5.5 avg chars/word = ~781 chars/min = ~13 chars/sec = ~77ms/char
  const MS_PER_CHAR = 72;

  // Start animation when isSpeaking becomes true
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

  // Force-complete when speech ends
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

// ─── Scorecard Component ─────────────────────────────────────────────────────
const Scorecard = ({ feedback, conversation, onBack, onRetry }) => {
  const { isDark } = useTheme();
  if (!feedback) return null;

  const radarData = feedback.scores ? Object.entries(feedback.scores).map(([key, val]) => ({
    subject: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    score: val,
    fullMark: 100,
  })) : [];

  const ratingColors = { strong: 'text-emerald-500', average: 'text-amber-500', needs_work: 'text-red-500' };
  const ratingBgs = { strong: 'bg-emerald-50 dark:bg-emerald-500/15', average: 'bg-amber-50 dark:bg-amber-500/15', needs_work: 'bg-red-50 dark:bg-red-500/15' };

  return (
    <div className="min-h-screen bg-[#06090e] p-4 sm:p-8 overflow-y-auto relative font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-1/4 w-[800px] h-[800px] bg-teal-600/10 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute top-1/2 -right-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px] mix-blend-screen opacity-50" />
      </div>
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Hero Score */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Overall Score</p>
          <div className="relative inline-block">
            <span className="text-7xl sm:text-8xl font-extrabold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
              {Math.round(feedback.overall_score || 0)}
            </span>
            <span className="text-2xl font-bold text-slate-400 ml-1">/100</span>
          </div>
          {feedback.overall_comment && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-md mx-auto">{feedback.overall_comment}</p>
          )}
        </motion.div>

        {/* Radar Chart */}
        {radarData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-[#111827]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-6 mb-6">
            <h3 className="text-sm font-extrabold text-white mb-4 text-center">Performance Dimensions</h3>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="score" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {feedback.strengths?.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="bg-[#111827]/80 backdrop-blur-xl border border-emerald-500/10 shadow-2xl rounded-3xl p-5">
              <h4 className="font-extrabold text-sm text-emerald-400 mb-3">💪 Strengths</h4>
              <ul className="space-y-2">{feedback.strengths.map((s, i) => <li key={i} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>{s}</li>)}</ul>
            </motion.div>
          )}
          {feedback.weaknesses?.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="bg-[#111827]/80 backdrop-blur-xl border border-amber-500/10 shadow-2xl rounded-3xl p-5">
              <h4 className="font-extrabold text-sm text-amber-400 mb-3">⚡ Areas to Improve</h4>
              <ul className="space-y-2">{feedback.weaknesses.map((w, i) => <li key={i} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-amber-500 mt-0.5">→</span>{w}</li>)}</ul>
            </motion.div>
          )}
        </div>

        {/* Per-Question Breakdown */}
        {feedback.per_question?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-[#111827]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-5 mb-6">
            <h4 className="font-extrabold text-sm text-white mb-4">Question-by-Question Feedback</h4>
            <div className="space-y-3">
              {feedback.per_question.map((pq, i) => (
                <details key={i} className="group">
                  <summary className="flex items-center justify-between p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors border border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center text-xs font-extrabold text-teal-400 shrink-0">{i + 1}</span>
                      <p className="text-sm font-bold text-slate-200 truncate">{pq.question}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider ml-2 shrink-0 ${pq.rating === 'strong' ? 'bg-emerald-500/20 text-emerald-400' : pq.rating === 'average' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      {(pq.rating || 'n/a').replace('_', ' ')}
                    </span>
                  </summary>
                  <div className="px-3 pb-3 pt-3 space-y-3 border-x border-b border-white/5 rounded-b-xl -mt-2 bg-black/20">
                    {pq.student_answer_summary && <p className="text-xs text-slate-400"><span className="font-bold text-slate-300">Your answer: </span>{pq.student_answer_summary}</p>}
                    {pq.feedback && <p className="text-sm text-slate-300 leading-relaxed">{pq.feedback}</p>}
                    {pq.ideal_answer_hint && (
                      <div className="bg-teal-500/10 rounded-xl p-3 border border-teal-500/20">
                        <p className="text-xs font-bold text-teal-400 mb-1">💡 Ideal Answer Should Include:</p>
                        <p className="text-xs text-teal-300/80 leading-relaxed">{pq.ideal_answer_hint}</p>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </motion.div>
        )}

        {/* Improvement Tips */}
        {feedback.improvement_tips?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-[#111827]/80 backdrop-blur-xl p-5 mb-6 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-3xl shadow-2xl">
            <h4 className="font-extrabold text-sm text-teal-400 mb-3">🎯 Coach Tips</h4>
            <ul className="space-y-2">{feedback.improvement_tips.map((t, i) => <li key={i} className="text-sm text-teal-300/90 flex items-start gap-2 leading-relaxed"><Sparkle size={14} weight="fill" className="text-teal-400 mt-0.5 shrink-0" />{t}</li>)}</ul>
          </motion.div>
        )}

        {/* Full Conversation History */}
        {conversation?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-[#111827]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-5 mb-6">
            <h4 className="font-extrabold text-sm text-white mb-4">Conversation History</h4>
            <div className="space-y-4">
              {conversation.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${msg.role === 'user' ? 'text-emerald-500' : 'text-indigo-400'}`}>
                    {msg.role === 'user' ? 'You' : 'Ami'}
                  </span>
                  <div className={`text-sm px-4 py-3 rounded-2xl max-w-[90%] leading-relaxed ${
                    msg.role === 'user' ? 'bg-emerald-500/10 text-emerald-50 border border-emerald-500/20 rounded-br-sm' : 'bg-indigo-500/10 text-indigo-50 border border-indigo-500/20 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-8 mb-12">
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm font-bold transition-colors">
            ← Exit
          </button>
          <button onClick={onRetry} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:from-teal-400 hover:to-cyan-400 transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)]">
            Retry Session
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Small Bottom Audio Visualizer ─────────────────────────────────────────────
const BottomAudioVisualizer = ({ isListening }) => {
  if (!isListening) return null;

  return (
    <div className="flex gap-2 items-center h-5">
      <style>{`
        @keyframes gemini-wave {
          0%, 100% { transform: scale(0.7); opacity: 0.2; }
          50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 6px rgba(16,185,129,0.8); }
        }
        .gemini-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #10b981;
          animation: gemini-wave 1.5s infinite ease-in-out;
          will-change: transform, opacity;
        }
      `}</style>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="gemini-dot"
          style={{ animationDelay: (i * 0.1) + 's' }}
        />
      ))}
    </div>
  );
};

// ─── Custom Animated Dropdown ────────────────────────────────────────────────
const HardwareDropdown = ({ icon: Icon, label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o: any) => o.deviceId === value) || options[0];

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-800"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Icon className="text-slate-500 shrink-0" size={18} />
          <span className="text-sm font-bold truncate">{selectedOption?.label || label}</span>
        </div>
        <div className="shrink-0 ml-2 text-slate-400 text-xs">▼</div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 mt-2 min-w-full w-max max-w-sm bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1"
          >
            <div className="max-h-60 overflow-y-auto">
              {options.length > 0 ? options.map((opt: any) => (
                <button
                  key={opt.deviceId}
                  onClick={() => { onChange(opt.deviceId); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors rounded-xl ${
                    value === opt.deviceId ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label || `Device ${opt.deviceId.slice(0, 5)}`}
                </button>
              )) : (
                <div className="px-4 py-3 text-sm text-slate-400 font-bold">No devices available (or awaiting permissions)</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Hardware Setup Lobby ──────────────────────────────────────────────────────
const HardwareSetupLobby = ({ sessionConfig, isStarting, onStart, onCancel }) => {
  const videoRef = useRef(null);
  const amplitudeBarRef = useRef(null);
  const [devices, setDevices] = useState({ video: [], audio: [] });
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [hasMicSignal, setHasMicSignal] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [hardwareError, setHardwareError] = useState('');
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [vaultResumes, setVaultResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showReplacePrompt, setShowReplacePrompt] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  // ── Resume presence check on mount ──
  useEffect(() => {
    resumeVaultAPI.list()
      .then(res => {
        const resumes = res.data || [];
        setVaultResumes(resumes);
        if (resumes.length > 0) {
          const primary = resumes.find((r: any) => r.is_primary) || resumes[0];
          setSelectedResumeId(primary.id);
          setHasResume(true);
        } else {
          setHasResume(false);
        }
      })
      .catch(() => setHasResume(false));
  }, []);

  const handleResumeUpload = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5 MB.');
      return;
    }
    setStagedFile(file);
    setShowSavePrompt(true);
  };

  const processUpload = async (saveToVault: boolean) => {
    if (!stagedFile) return;
    setIsUploading(true);
    setShowSavePrompt(false);
    try {
      const formData = new FormData();
      formData.append('file', stagedFile);
      
      let newResumeId = '';
      if (saveToVault) {
        const res = await resumeVaultAPI.upload(formData);
        newResumeId = res.data.id;
        toast.success('Resume saved to vault and ready!');
        const listRes = await resumeVaultAPI.list();
        setVaultResumes(listRes.data || []);
      } else {
        const res = await resumeAPI.upload(formData);
        newResumeId = res.data.id;
        toast.success('Resume ready for this interview!');
        // Add temporary resume to the list for visual feedback
        setVaultResumes(prev => [
          { id: newResumeId, filename: `${stagedFile.name} (Just for now)`, is_primary: false },
          ...prev
        ]);
      }
      
      setSelectedResumeId(newResumeId);
      setHasResume(true);
      setStagedFile(null);
    } catch (err: any) {
      if (saveToVault && err?.response?.data?.detail?.includes('Maximum 5')) {
        setShowReplacePrompt(true);
      } else {
        toast.error(err?.response?.data?.detail || 'Resume upload failed. Please try again.');
        setStagedFile(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const replaceResume = async (oldResumeId: string) => {
     setIsUploading(true);
     setShowReplacePrompt(false);
     try {
       await resumeVaultAPI.remove(oldResumeId);
       await processUpload(true);
     } catch(err) {
       toast.error('Failed to replace resume');
       setIsUploading(false);
     }
  };

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleResumeUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleResumeUpload(file);
  };

  const requestInProgressRef = useRef(false);
  const requestPermissionsAndEnumerate = async () => {
    if (requestInProgressRef.current) return;
    requestInProgressRef.current = true;
    try {
      setHardwareError('');
      if (!navigator.mediaDevices) {
        toast.error('Hardware access blocked. Use HTTPS or localhost.');
        setHardwareError('Hardware access blocked. Ensure you are using HTTPS or localhost.');
        setPermissionsGranted(false);
        return;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      let stream;
      const constraints: any = {
        audio: selectedAudioId ? { deviceId: { ideal: selectedAudioId } } : true,
        video: selectedVideoId ? { deviceId: { ideal: selectedVideoId } } : true,
      };
      
      try {
        // Try audio+video first with a timeout
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia(constraints),
          new Promise((_, reject) => setTimeout(() => {
             const err = new Error("Hardware timeout");
             err.name = "TimeoutError";
             reject(err);
          }, 5000))
        ]);
      } catch (err: any) {
        // If video failed, fallback to audio-only
        if (err.name === "NotFoundError" || err.name === "NotReadableError" || err.name === "TimeoutError") {
          console.warn("Video failed, falling back to audio-only:", err.name);
          try {
            stream = await Promise.race([
              navigator.mediaDevices.getUserMedia({ audio: selectedAudioId ? { deviceId: { ideal: selectedAudioId } } : true, video: false }),
              new Promise((_, reject) => setTimeout(() => {
                const e = new Error("Audio timeout");
                e.name = "TimeoutError";
                reject(e);
              }, 3000))
            ]);
          } catch (audioErr: any) {
            throw audioErr;
          }
        } else {
          throw err;
        }
      }
      
      if (!isMountedRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }
      
      streamRef.current = stream;
      setPermissionsGranted(true);
      setHardwareError('');
      
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }

      // Enumerate all devices now that permissions are granted
      try {
         const updatedDevices = await navigator.mediaDevices.enumerateDevices();
         const videoDevices = updatedDevices.filter(d => d.kind === 'videoinput');
         const audioDevices = updatedDevices.filter(d => d.kind === 'audioinput');
         setDevices({ video: videoDevices, audio: audioDevices });
         if (!selectedAudioId && audioDevices.length > 0) {
            setSelectedAudioId(audioDevices[0].deviceId);
         }
         if (!selectedVideoId && videoDevices.length > 0) {
            setSelectedVideoId(videoDevices[0].deviceId);
         }
      } catch(e) {}

      // Amplitude setup
      try {
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current.state === 'suspended') {
           audioContextRef.current.resume();
        }
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!streamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const average = sum / bufferLength;
          
          const noiseFloor = 15;
          const normalizedVolume = Math.max(0, average - noiseFloor);
          
          if (normalizedVolume > 0) setHasMicSignal(true);
          if (amplitudeBarRef.current) {
             const visualWidth = normalizedVolume > 0 ? Math.min(100, normalizedVolume * 3) : 0;
             amplitudeBarRef.current.style.width = `${visualWidth}%`;
          }
          animationFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (ampErr) {
        console.warn("Could not setup audio amplitude meter:", ampErr);
        setHasMicSignal(true);
      }

    } catch (err: any) {
      console.error("Camera/Mic access denied:", err);
      if (err.name === "NotReadableError") {
         setHardwareError("Microphone is in use by another application (like Zoom or Teams). Close them and refresh.");
         toast.error("Microphone is currently in use by another application.");
         setPermissionsGranted(false);
      } else if (err.name === "NotFoundError") {
         setHardwareError("No microphone found! Please plug in a microphone.");
         toast.error("No microphone found!");
         setPermissionsGranted(true);
      } else if (err.name === "TimeoutError") {
         setHardwareError("Hardware deadlocked. Your Windows audio driver is unresponsive.");
         toast.error("Hardware took too long to respond.");
         setPermissionsGranted(false);
      } else {
         setHardwareError(`${err.name}: ${err.message}`);
         toast.error(`Permissions failed: ${err.name || err.message || 'Unknown Error'}`);
         setPermissionsGranted(false);
      }
    } finally {
      requestInProgressRef.current = false;
    }
  };

  useEffect(() => {
    // Reset refs for React 18 StrictMode remount — without this,
    // the second mount is permanently locked out by stale ref values
    isMountedRef.current = true;
    requestInProgressRef.current = false;
    requestPermissionsAndEnumerate();
    const handleBeforeUnload = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(()=>{});
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioId, selectedVideoId]);

  const handleStartWrapper = () => {
    // 1. Stop local tracks immediately
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    // 2. Fire Start with the confirmed hardware IDs
    onStart({ micId: selectedAudioId, videoId: selectedVideoId, resumeId: selectedResumeId });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-multiply opacity-50" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[150px] mix-blend-multiply opacity-50" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 max-w-4xl w-full bg-white/90 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/60">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
             <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-slate-200/60 shadow-inner shrink-0 overflow-hidden p-0.5">
               <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${sessionConfig?.target_role || 'Ami'}&backgroundColor=transparent`} alt="Avatar" className="w-full h-full object-contain drop-shadow-sm" />
             </div>
             <div>
               <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide">Green Room Setup</h2>
               <p className="text-sm text-slate-500">
                 {sessionConfig?.interview_type ? sessionConfig.interview_type.charAt(0).toUpperCase() + sessionConfig.interview_type.slice(1) : 'Mock'} Interview
                 {sessionConfig?.target_company && ` @ ${sessionConfig.target_company}`}
                 {' — '}{sessionConfig?.target_role}
               </p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Camera Preview */}
            <div className="flex flex-col gap-4">
              <div className="relative w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/60 shadow-inner flex items-center justify-center">
                {permissionsGranted ? (
                   <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                ) : showTroubleshooter ? (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center text-center p-6 w-full h-full bg-indigo-50/50">
                     <motion.div 
                       animate={{ y: [-10, 0, -10], x: [-10, 0, -10] }} 
                       transition={{ repeat: Infinity, duration: 1.5 }}
                       className="absolute top-6 left-6 text-indigo-500 drop-shadow-md"
                     >
                       <ArrowElbowLeftUp size={48} weight="duotone" />
                     </motion.div>
                     <div className="space-y-5 max-w-sm mt-4">
                       <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-sm font-bold text-slate-700">
                         1. Look up! Click the <LockKey size={18} weight="fill" className="inline text-slate-400 -mt-1 mx-1"/> lock icon near the URL bar.
                       </motion.p>
                       <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="text-sm font-bold text-slate-700">
                         2. Switch Camera & Microphone to <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">'Allow'</span>.
                       </motion.p>
                       <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} className="text-sm font-bold text-indigo-600">
                         3. Reload the page and let's go!
                       </motion.p>
                     </div>
                   </motion.div>
                ) : (
                   <div className="flex flex-col items-center text-slate-400">
                     <VideoCameraSlash size={48} weight="thin" className="mb-3 opacity-50 text-indigo-400" />
                     <span className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Awaiting Permissions</span>
                       {hardwareError && <div className="text-red-600 font-bold mb-4 p-4 bg-red-50 rounded-xl text-sm max-w-[90%] text-center border border-red-200 shadow-sm">{hardwareError}</div>}
                     <button 
                       onClick={() => {
                         requestPermissionsAndEnumerate();
                         setShowTroubleshooter(true);
                       }}
                       className="px-5 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-colors shadow-sm"
                     >
                       Fix Permissions
                     </button>
                   </div>
                )}
                {/* Overlay status */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className={`p-2 rounded-full backdrop-blur-md border border-white/20 shadow-sm ${hasMicSignal ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                    {hasMicSignal ? <Microphone size={20} weight="fill" /> : <MicrophoneSlash size={20} weight="fill" />}
                  </div>
                  <div className={`p-2 rounded-full backdrop-blur-md border border-white/20 shadow-sm ${permissionsGranted ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                    {permissionsGranted ? <VideoCamera size={20} weight="fill" /> : <VideoCameraSlash size={20} weight="fill" />}
                  </div>
                </div>
              </div>
              
              {/* Mic Input Level / Volume Meter */}
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                <div className="flex justify-between text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">
                  <span>Mic Input Level</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex items-center border border-slate-200/60 shadow-inner">
                  <div ref={amplitudeBarRef} className="h-full bg-indigo-500 w-0 transition-all duration-75 shadow-[0_0_10px_#6366f1]" />
                </div>
              </div>
            </div>

            {/* Right Column: Checklists & Resume */}
            <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">Pre-flight Checklist</h3>
                
                {/* Microphone Selector */}
                <div>
                  <HardwareDropdown icon={Microphone} label="Select Microphone" value={selectedAudioId} options={devices.audio} onChange={setSelectedAudioId} />
                </div>
                {/* Camera Selector */}
                <div>
                  <HardwareDropdown icon={VideoCamera} label="Select Camera" value={selectedVideoId} options={devices.video} onChange={setSelectedVideoId} />
                </div>

                {/* Resume Check */}
                <div className="pt-2">
                  <div className="p-5 rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-colors hover:border-indigo-300">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${hasResume ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                           <FileText size={22} weight={hasResume ? 'fill' : 'duotone'} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-extrabold text-sm text-slate-800 mb-1">Resume Selection</h4>
                           {hasResume === null ? (
                             <p className="text-xs text-slate-500 flex items-center gap-2"><span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"/> Checking vault...</p>
                           ) : vaultResumes.length > 0 ? (
                             <select
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:outline-none focus:ring-0 focus:border-indigo-500 cursor-pointer appearance-none pr-8"
                               value={selectedResumeId}
                               onChange={(e) => setSelectedResumeId(e.target.value)}
                               style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                             >
                               {vaultResumes.map((r: any) => (
                                 <option key={r.id} value={r.id}>{r.filename} {r.is_primary ? '(Primary)' : ''}</option>
                               ))}
                             </select>
                           ) : (
                             <p className="text-xs text-rose-500 font-bold">No resume found. Required to start.</p>
                           )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2" onDragOver={onDrop} onDrop={onDrop}>
                        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex-1 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all disabled:opacity-60 justify-center"
                        >
                          <Upload size={14} weight="bold" />
                          {isUploading ? 'Processing...' : vaultResumes.length > 0 ? 'Upload New PDF' : 'Upload Resume (PDF)'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100">
                <button
                  onClick={handleStartWrapper}
                  disabled={isStarting || !permissionsGranted || !hasMicSignal || hasResume === false || hasResume === null}
                  className={`group relative w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-extrabold text-sm transition-all duration-300 overflow-hidden ${
                    permissionsGranted && hasMicSignal && hasResume === true && !isStarting
                      ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-[0_8px_30px_rgba(99,102,241,0.4)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.55)] hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {permissionsGranted && hasMicSignal && hasResume === true && !isStarting && (
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  )}
                  {isStarting ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Sparkle size={18} weight="fill" className={permissionsGranted && hasMicSignal && hasResume === true ? 'animate-pulse' : ''} />}
                  {isStarting ? 'Starting Session...' : hasResume === null ? 'Checking resume...' : hasResume === false ? 'Resume required to start' : !permissionsGranted ? 'Awaiting permissions...' : !hasMicSignal ? 'Waiting for mic signal...' : 'Start Interview'}
                </button>
                <button 
                  onClick={onCancel}
                  disabled={isStarting}
                  className="w-full mt-3 px-6 py-2.5 bg-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-xs transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save Prompt Modal */}
      <AnimatePresence>
        {showSavePrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowSavePrompt(false); setStagedFile(null); }} />
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                 <FileText size={24} weight="duotone" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 mb-2">Save to Resume Vault?</h3>
              <p className="text-sm text-slate-500 mb-6">Would you like to save this resume to your vault for future one-click applications?</p>
              <div className="flex gap-3">
                <button onClick={() => processUpload(false)} disabled={isUploading} className="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">No, just for now</button>
                <button onClick={() => processUpload(true)} disabled={isUploading} className="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_4px_12px_rgba(79,70,229,0.25)] transition-colors">Yes, save it</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Replace Prompt Modal */}
      <AnimatePresence>
        {showReplacePrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowReplacePrompt(false); setStagedFile(null); }} />
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-extrabold text-slate-800 mb-2">Resume Vault is Full</h3>
              <p className="text-sm text-slate-500 mb-5">You have reached the maximum limit of 5 resumes. Please select one to replace.</p>
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                {vaultResumes.map((r: any) => (
                  <button key={r.id} onClick={() => replaceResume(r.id)} disabled={isUploading} className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 flex justify-between items-center group transition-colors">
                    <span className="text-sm font-bold text-slate-700 group-hover:text-red-700 truncate">{r.filename}</span>
                    <span className="text-xs text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Replace</span>
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowReplacePrompt(false); setStagedFile(null); }} className="w-full py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Interview Session ──────────────────────────────────────────────────


const ActiveLiveKitInterview = ({ interviewId, token, url, handleEndInterview }) => {
  const { state, audioTrack } = useVoiceAssistant();
  const localParticipant = useLocalParticipant();
  const [showTranscript, setShowTranscript] = useState(false);

  let orbState = 'idle';
  if (state === 'listening') orbState = 'listening';
  if (state === 'speaking') orbState = 'speaking';
  if (state === 'thinking') orbState = 'evaluating';

  return (
    <div className="fixed inset-0 bg-[#06090e] flex flex-col z-[9999] overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-teal-600/10 rounded-full blur-[150px] mix-blend-screen opacity-50" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6 border-b border-white/[0.03]">
        <div className="flex items-center gap-4">
          <Avatar size={36} name="AcadMix Intelligence" variant="beam" colors={['#6366f1', '#14b8a6', '#8b5cf6', '#06b6d4', '#34d399']} />
          <span className="text-sm font-bold text-slate-300 tracking-wider uppercase">AcadMix Intelligence</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleEndInterview}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 hover:text-red-300 transition-all shadow-sm">
            <Stop size={14} weight="fill" /> 
            End Session
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-10 w-full max-w-5xl mx-auto">
         <div className="w-full flex items-center justify-center mb-12">
            <BarVisualizer state={state} barCount={7} trackRef={audioTrack} className="w-64 h-32" />
         </div>
         <p className="text-slate-400 font-medium text-lg mt-8 text-center max-w-2xl">
            {state === 'connecting' ? "Connecting to AI..." : 
             state === 'listening' ? "Listening..." :
             state === 'thinking' ? "Thinking..." : "AI Speaking"}
         </p>
      </div>

      <RoomAudioRenderer />
    </div>
  );
};

const AIInterviewSession = ({ navigate, user, quizData: sessionConfig }) => {
  const [phase, setPhase] = useState('setup');
  const [isStarting, setIsStarting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [liveKitToken, setLiveKitToken] = useState(null);
  const [liveKitUrl, setLiveKitUrl] = useState(null);
  const [interviewId, setInterviewId] = useState(null);
  
  // Audio recording for AssemblyAI
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleStart = async (config) => {
    setIsStarting(true);
    try {
      // 1. Create interview in backend
      const res = await interviewAPI.start({
        interview_type: sessionConfig.viewId === 'resume_interview' ? 'resume_deep_dive' : 'general',
        target_role: sessionConfig.targetRole || 'Software Engineer',
        target_company: sessionConfig.targetCompany || 'Tech Corp',
        difficulty: 'Medium',
        resume_id: config.resumeId || sessionConfig.resumeId || null
      });
      const newInterviewId = res.data.interview_id;
      setInterviewId(newInterviewId);

      // 2. Fetch LiveKit Token
      const tokenRes = await fetch(`/api/interview/${newInterviewId}/token`, {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      }).then(r => r.json());
      
      setLiveKitToken(tokenRes.data?.token || tokenRes.token);
      setLiveKitUrl(tokenRes.data?.url || tokenRes.url);

      // 3. Start Local MediaRecorder for AssemblyAI Final Grading
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: config.micId ? { exact: config.micId } : undefined } });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorder.ondataavailable = (e) => {
         if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      setPhase('active');
    } catch (err) {
      console.error(err);
      setIsStarting(false);
      toast.error("Failed to start session.");
    }
  };

  const handleEndInterview = async () => {
    setPhase('ending');
    try {
      // Stop local recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
         mediaRecorderRef.current.stop();
         mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
         
         await new Promise(resolve => {
            mediaRecorderRef.current.onstop = () => resolve();
         });
      }

      // Create blob for AssemblyAI
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'interview_audio.webm');

      // Async process audio
      fetch(`/api/interview/${interviewId}/audio_eval`, {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
         body: formData
      }).catch(console.error);

      // Mark Complete to get feedback
      const res = await interviewAPI.end(interviewId);
      setFeedback(res.data);
      setPhase('scorecard');
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit interview");
      navigate('interview-warroom');
    }
  };

  if (phase === 'scorecard' && feedback) {
    return <Scorecard feedback={feedback} conversation={[]} onBack={() => navigate('interview-warroom')} onRetry={() => navigate('interview-warroom')} />;
  }

  if (phase === 'setup' && !sessionConfig?.viewId) {
    return <HardwareSetupLobby sessionConfig={sessionConfig} isStarting={isStarting} onStart={handleStart} onCancel={() => navigate('interview-warroom')} />;
  }

  if (phase === 'active' && liveKitToken && liveKitUrl) {
    return (
       <LiveKitRoom
          video={false}
          audio={true}
          token={liveKitToken}
          serverUrl={liveKitUrl}
          connect={true}
       >
          <ActiveLiveKitInterview interviewId={interviewId} handleEndInterview={handleEndInterview} />
       </LiveKitRoom>
    );
  }

  return (
     <div className="fixed inset-0 bg-[#06090e] flex items-center justify-center">
       <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
     </div>
  );
};

export default AIInterviewSession;
