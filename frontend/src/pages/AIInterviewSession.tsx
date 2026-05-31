import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microphone, MicrophoneSlash, Clock, ArrowsOut, X, Brain, Warning, Sparkle, Stop, ChatCircleDots, FileText, Upload, ArrowRight, VideoCamera, VideoCameraSlash, ArrowElbowLeftUp, LockKey } from '@phosphor-icons/react';
import { interviewAPI, resumeAPI, resumeVaultAPI } from '../services/api';
import { toast } from 'sonner';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
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
const HorizontalAuraWave = ({ state, analyserRef }) => {
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
         const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
         analyserRef.current.getByteFrequencyData(dataArray);
         
         for (let i = 0; i < NUM_POINTS; i++) {
           const binIndex = Math.floor((i / NUM_POINTS) * (dataArray.length * 0.4)); // use lower 40% of frequencies
           let val = dataArray[binIndex] / 255;
           
           // Noise floor gate: ignore ambient mic noise below 8% intensity
           val = val < 0.08 ? 0 : (val - 0.08) / 0.92; // remap 0.08–1.0 → 0–1
           
           const bell = Math.sin((i / (NUM_POINTS - 1)) * Math.PI); // 0 at edges, 1 in middle
           targetData[i] = val * 70 * bell; // Max amplitude ~70px
         }
      } else if (state === 'speaking' || state === 'evaluating') {
         // Simulated speaking waveform
         if (Math.floor(time * 30) % 4 === 0) {
           for (let i = 0; i < NUM_POINTS; i++) {
             const bell = Math.sin((i / (NUM_POINTS - 1)) * Math.PI);
             targetData[i] = Math.random() * 35 * bell;
           }
         }
      } else if (state === 'thinking') {
         // Smooth undulating wave
         for (let i = 0; i < NUM_POINTS; i++) {
           const bell = Math.sin((i / (NUM_POINTS - 1)) * Math.PI);
           targetData[i] = Math.sin(time * 2 + i * 0.1) * 12 * bell;
         }
      } else {
         for (let i = 0; i < NUM_POINTS; i++) {
           targetData[i] = 0;
         }
      }

      // Apply smoothing to transitions
      for (let i = 0; i < NUM_POINTS; i++) {
        smoothedData[i] += (targetData[i] - smoothedData[i]) * 0.15;
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
  }, [state, analyserRef]);

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
const HardwareSetupLobby = ({ sessionConfig, onStart, onCancel }) => {
  const videoRef = useRef(null);
  const amplitudeBarRef = useRef(null);
  const [devices, setDevices] = useState({ video: [], audio: [] });
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [hasMicSignal, setHasMicSignal] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [hasResume, setHasResume] = useState<boolean | null>(null); // null = loading
  const [isUploading, setIsUploading] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  // ── Resume presence check on mount ──
  useEffect(() => {
    resumeVaultAPI.getPrimary()
      .then(res => {
        setHasResume(!!res?.data);
      })
      .catch(() => {
        setHasResume(false);
      });
  }, []);

  // ── Inline resume upload handler ──
  const handleResumeUpload = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5 MB.');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await resumeVaultAPI.upload(formData);
      setHasResume(true);
      toast.success('Resume uploaded to vault! You\'re good to go.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Resume upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const isMountedRef = useRef(true);
  useEffect(() => {
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

  const requestPermissionsAndEnumerate = async () => {
    if (!navigator.mediaDevices) {
      toast.error('Hardware access blocked. Use HTTPS or localhost.');
      setPermissionsGranted(false);
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const constraints = {
        video: selectedVideoId ? { deviceId: { ideal: selectedVideoId } } : true,
        audio: selectedAudioId ? { deviceId: { ideal: selectedAudioId } } : true,
      };
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn("Failed with ideal constraints, trying default true", err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      
      if (!isMountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      setPermissionsGranted(true);
      
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }

      // Enumerate available devices safely
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      const audioDevices = allDevices.filter(d => d.kind === 'audioinput');
      
      setDevices({ video: videoDevices, audio: audioDevices });
      
      if (!selectedVideoId && videoDevices.length > 0) {
        const activeVideo = stream.getVideoTracks()[0];
        const matched = videoDevices.find(d => d.label === activeVideo?.label);
        setSelectedVideoId(matched?.deviceId || videoDevices[0].deviceId);
      }
      if (!selectedAudioId && audioDevices.length > 0) {
        const activeAudio = stream.getAudioTracks()[0];
        const matched = audioDevices.find(d => d.label === activeAudio?.label);
        setSelectedAudioId(matched?.deviceId || audioDevices[0].deviceId);
      }

      // Amplitude setup
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
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
        
        // Filter out ambient noise floor (most laptop mics sit around 15-20 when silent)
        const noiseFloor = 15;
        const normalizedVolume = Math.max(0, average - noiseFloor);
        
        if (normalizedVolume > 0) setHasMicSignal(true);
        if (amplitudeBarRef.current) {
           // Smooth the visual representation and make it less twitchy at the bottom
           const visualWidth = normalizedVolume > 0 ? Math.min(100, normalizedVolume * 3) : 0;
           amplitudeBarRef.current.style.width = `${visualWidth}%`;
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();

    } catch (err: any) {
        console.error("Camera/Mic access denied:", err);
        if (err.name === "NotReadableError") {
           toast.error("Camera or mic is currently in use by another application.");
           setPermissionsGranted(true);
        } else if (err.name === "NotFoundError") {
           toast.error("No camera or microphone found!");
           setPermissionsGranted(true);
        } else {
           toast.error(`Permissions failed: ${err.name || err.message || 'Unknown Error'}`);
           setPermissionsGranted(false);
        }
      }

      // Always enumerate devices so dropdowns work even if stream failed
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        const audioDevices = allDevices.filter(d => d.kind === 'audioinput');
        
        setDevices({ video: videoDevices, audio: audioDevices });
      } catch (e) {
        console.error("Enumerate failed", e);
      }
    };

  useEffect(() => {
    requestPermissionsAndEnumerate();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(()=>{});
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartWrapper = () => {
    // 1. Stop local tracks immediately
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    // 2. Fire Start with the confirmed hardware IDs
    onStart({ micId: selectedAudioId, videoId: selectedVideoId });
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
                  {hasResume === false && (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={onDrop}
                      className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50 backdrop-blur-md transition-colors hover:bg-indigo-100"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shrink-0 border border-indigo-100 shadow-sm">
                          <FileText size={22} weight="duotone" className="text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-sm text-indigo-700 mb-1">Resume Required</h4>
                          <p className="text-xs text-indigo-600/80 mb-3 leading-relaxed">
                            Upload a PDF for Ami to personalize your interview.
                          </p>
                          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-[0_4px_15px_rgba(79,70,229,0.2)] transition-all disabled:opacity-60 w-full justify-center"
                          >
                            <Upload size={14} weight="bold" />
                            {isUploading ? 'Uploading...' : 'Upload Resume (PDF)'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {hasResume === null && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
                      <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full shrink-0" />
                      <span className="text-xs font-bold text-slate-500">Checking resume vault...</span>
                    </div>
                  )}
                  {hasResume === true && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={16} weight="fill" className="text-indigo-600" />
                      </div>
                      <span className="text-xs font-bold text-indigo-700">Resume detected — Ami will personalize your interview</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100">
                <button
                  onClick={handleStartWrapper}
                  disabled={!permissionsGranted || !hasMicSignal || hasResume === false || hasResume === null}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-sm shadow-[0_8px_20px_rgba(15,23,42,0.25)] transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  <Sparkle size={18} weight="fill" />
                  {hasResume === null ? 'Checking resume...' : hasResume === false ? 'Resume required to start' : !permissionsGranted ? 'No devices available (or awaiting permissions)' : !hasMicSignal ? 'Waiting for mic signal...' : 'Start Interview'}
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full mt-3 px-6 py-2.5 bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Interview Session ──────────────────────────────────────────────────

const AIInterviewSession = ({ navigate, user, quizData: sessionConfig }) => {
  // If viewing a past interview
  const [viewMode, setViewMode] = useState(null);

  // Interview state
  const [phase, setPhase] = useState('setup'); // setup | active | ending | scorecard
  const [orbState, setOrbState] = useState('idle');
  const [interviewId, setInterviewId] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [maxQuestions] = useState(10);
  const [elapsed, setElapsed] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false); // Gates TypewriterText — prevents text leak in thinking mode
  const [feedback, setFeedback] = useState(null);
  const [sessionMicId, setSessionMicId] = useState('');
  const [sessionVideoId, setSessionVideoId] = useState('');
  const sessionMicIdRef = useRef('');
  const sessionVideoIdRef = useRef('');
  const dragConstraintsRef = useRef(null);

  // Refs
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const prevDisplayedRef = useRef(''); // Tracks last full displayed text (final+interim) to detect real changes
  const isSpeakingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const phaseRef = useRef('setup');
  const interviewIdRef = useRef<any>(null); // Avoids stale closure in submitAnswer
  const stopListeningAndTranscribeRef = useRef<(() => void) | null>(null);
  
  // Follow Up Timeout Refs
  const followUpCountRef = useRef(0);
  const idleTimerRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Audio Web API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const { isDark } = useTheme();

  // ── Audio Cleanup Helper ──
  const cleanupAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
  }, []);

  // ── Load past interview if viewId ──
  useEffect(() => {
    if (sessionConfig?.viewId) {
      interviewAPI.get(sessionConfig.viewId).then(res => {
        setViewMode(res.data);
        if (res.data.ai_feedback) {
          setFeedback({ ...res.data.ai_feedback, overall_score: res.data.overall_score, scores: res.data.scores });
          setPhase('scorecard');
        }
      }).catch(() => navigate('interview-warroom'));
    }
  }, [sessionConfig, navigate]);

  // ── Timer ──
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase]);

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Keep refs synced
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { interviewIdRef.current = interviewId; }, [interviewId]);

  // ── Stop Listening ──
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  // ── Speech Synthesis (AI speaks via ElevenLabs backend) ──
  const speakText = useCallback((text, onAudioStart) => {
    return new Promise<void>(async (resolve) => {
      // 1. Interrupt any active playback
      if (currentAudioRef.current) {
        try { currentAudioRef.current.pause(); } catch {}
        currentAudioRef.current = null;
      }

      setIsSpeaking(true);
      isSpeakingRef.current = true; // Sync directly
      setOrbState('speaking');
      stopListening();

      try {
        const activeId = interviewIdRef.current;
        console.log('[TTS] speakText called, activeId:', activeId, 'text length:', text?.length);
        if (!activeId) {
          console.warn('[TTS] No activeId — skipping speak. interviewIdRef is null.');
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          resolve();
          return;
        }

        // Call our premium ElevenLabs audio streaming endpoint
        const response = await interviewAPI.speak(activeId, text);
        const audioBlob = response.data; // Response type: blob
        console.log('[TTS] Response received:', {
          type: audioBlob?.constructor?.name,
          size: audioBlob?.size,
          blobType: audioBlob?.type,
        });

        if (!audioBlob || audioBlob.size === 0) {
          console.error('[TTS] Empty or invalid audio blob');
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          if (onAudioStart) onAudioStart();
          resolve();
          return;
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        let resolved = false;
        const safeResolve = () => {
          if (!resolved) {
            resolved = true;
            setIsSpeaking(false);
            isSpeakingRef.current = false; // Sync directly
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            resolve();
          }
        };

        const fallbackMs = Math.max(3000, text.length * 80 + 2000);
        const timeoutId = setTimeout(safeResolve, fallbackMs);

        audio.onended = () => {
          console.log('[TTS] Audio playback ended naturally');
          clearTimeout(timeoutId);
          safeResolve();
        };

        audio.onerror = (e) => {
          console.error('[TTS] Audio playback error:', e);
          clearTimeout(timeoutId);
          safeResolve();
        };

        await audio.play();
        console.log('[TTS] audio.play() started successfully');
        setShowTranscript(true);  // ← TEXT LEAK FIX: Only show text AFTER TTS starts
        if (onAudioStart) onAudioStart();
      } catch (err) {
        console.error('[TTS] speakText error:', err);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onAudioStart) onAudioStart();
        resolve();
      }
    });
  }, [stopListening]);

  // ── Speech Recognition & MediaRecorder (Student speaks) ──
  const startListening = useCallback(async () => {
   // 1. Acquire mic+camera stream if not already active
    if (!mediaStreamRef.current) {
      try {
        const constraints = {
          audio: sessionMicIdRef.current ? { deviceId: { ideal: sessionMicIdRef.current } } : true,
          video: sessionVideoIdRef.current ? { deviceId: { ideal: sessionVideoIdRef.current } } : true
        };
        console.log('[MIC] Requesting getUserMedia with constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMountedRef.current || (phaseRef.current !== 'active' && phaseRef.current !== 'setup' && phaseRef.current !== 'starting')) {
            console.log('[MIC] Discarding stream, component unmounted or phase inactive');
            stream.getTracks().forEach(t => t.stop());
            return;
        }
        mediaStreamRef.current = stream;
        console.log('[MIC] Stream acquired, tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}`));
      } catch (err) {
        console.error('[MIC] Camera/Microphone access denied.', err);
        toast.error('Camera and Microphone access are required for the interview.');
      }
    }

    // 2. Connect analyser to stream for visualizer (if not already wired up)
    if (mediaStreamRef.current && !analyserRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        sourceNodeRef.current.connect(analyserRef.current);
        console.log('[MIC] Analyser connected to stream. fftSize:', analyserRef.current.fftSize);
      } catch (err) {
        console.error('[MIC] Failed to connect analyser:', err);
      }
    } else if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // 2. Prepare MediaRecorder for High-Fidelity Audio capture
    if (mediaStreamRef.current) {
      try {
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        recorder.start();
      } catch (err) {
        console.error("Failed to start MediaRecorder capture:", err);
      }
    }

    // 3. Setup browser Speech Recognition ONLY for real-time visual student transcript text feedback
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { 
      // If SpeechRecognition isn't supported, we still permit recording (will transcribe purely via Scribe)
      setIsListening(true);
      setOrbState('listening');
      return; 
    }

    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false; // Disable interim results to stop words from flickering/changing
    recognition.lang = 'en-IN'; // Optimized for Indian English accents
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { setIsListening(true); setOrbState('listening'); };

    recognition.onresult = (event: any) => {
      // If AI starts speaking, interrupt it
      if (isSpeakingRef.current || currentAudioRef.current) {
        if (currentAudioRef.current) {
          try { currentAudioRef.current.pause(); } catch {}
          currentAudioRef.current = null;
        }
        setIsSpeaking(false);
        setOrbState('interrupted');
        setTimeout(() => setOrbState('listening'), 300);
      }

      let interim = '';
      let final = transcriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t + ' ';
        } else {
          interim = t;
        }
      }
      transcriptRef.current = final;
      const displayed = final + interim;
      setTranscript(displayed);

      // Only reset silence timer when the DISPLAYED text actually changed
      if (displayed !== prevDisplayedRef.current) {
        prevDisplayedRef.current = displayed;
        followUpCountRef.current = 0; // Reset follow-up counter since user spoke
        
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (transcriptRef.current.trim()) {
            stopListeningAndTranscribeRef.current?.();
          }
        }, 4000);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('Speech recognition error:', e.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still active phase and AI is not speaking
      if (phaseRef.current === 'active' && !isSpeakingRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── End Interview (defined before submitAnswer) ──
  const handleEndInterview = useCallback(async () => {
    stopListening();
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); } catch {}
      currentAudioRef.current = null;
    }
    cleanupAudio(); // Securely close audio hardware streams
    setPhase('ending');
    setOrbState('evaluating');

    try {
      const { data } = await interviewAPI.end(interviewId);
      setFeedback(data.feedback ? { ...data.feedback, overall_score: data.overall_score, scores: data.scores } : data);
      setPhase('scorecard');
      try { document.exitFullscreen(); } catch {}
    } catch (err) {
      toast.error('Failed to generate feedback');
      setPhase('active');
      setOrbState('listening');
      startListening();
    }
  }, [interviewId, stopListening, startListening]);

  // ── Submit answer to backend ──
  const submitAnswer = useCallback(async (answer) => {
    const currentInterviewId = interviewIdRef.current;
    if (!currentInterviewId || !answer.trim() || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    stopListening();
    setOrbState('thinking');
    setShowTranscript(false); // ← Hide text immediately when entering thinking mode
    setTranscript('');
    transcriptRef.current = '';
    prevDisplayedRef.current = '';

    // Immediately display the user's answer in the conversation history
    setConversation(prev => [...prev, { role: 'user', content: answer }]);

    try {
      const { data } = await interviewAPI.sendMessage(currentInterviewId, { content: answer });
      
      const onAudioStart = () => {
        setConversation(prev => [
          ...prev,
          { role: 'assistant', content: data.ai_response },
        ]);
        setQuestionNumber(data.question_number);
        setCurrentQuestion(data.ai_response);
      };

      // AI speaks the response
      await speakText(data.ai_response, onAudioStart);
      
      // Stop execution context if user clicked "End Interview" while AI was speaking
      if (phaseRef.current === 'ending') {
        isSubmittingRef.current = false;
        return;
      }

      // If final question, auto-end
      if (data.is_final || data.question_number >= maxQuestions) {
        handleEndInterview();
        isSubmittingRef.current = false;
        return;
      }

      // Start listening again
      setOrbState('listening');
      startListening();
    } catch (err) {
      toast.error('Failed to process response. Please try again.');
      setOrbState('listening');
      startListening();
    } finally {
      isSubmittingRef.current = false;
    }
  }, [stopListening, speakText, startListening, maxQuestions, handleEndInterview]);

  // ── Stop Listening and Transcribe (High-Fidelity STT) ──
  const stopListeningAndTranscribe = useCallback(async () => {
    stopListening();
    setOrbState('thinking');

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      const text = transcriptRef.current.trim();
      if (text) {
        submitAnswer(text);
      }
      return;
    }

    const audioBlobPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        resolve(blob);
      };
    });

    try {
      recorder.stop();
      const blob = await audioBlobPromise;
      
      const currentInterviewId = interviewIdRef.current;
      if (!currentInterviewId) return;

      setOrbState('thinking');
      // Transcribe via ElevenLabs Scribe STT
      const response = await interviewAPI.transcribe(currentInterviewId, blob);
      const text = response.data?.text || '';
      
      const finalAnswer = text.trim() || transcriptRef.current.trim();
      if (finalAnswer) {
        submitAnswer(finalAnswer);
      } else {
        setOrbState('listening');
        startListening();
      }
    } catch (err) {
      console.error("Transcription failed:", err);
      const finalAnswer = transcriptRef.current.trim();
      if (finalAnswer) {
        submitAnswer(finalAnswer);
      } else {
        setOrbState('listening');
        startListening();
      }
    }
  }, [stopListening, submitAnswer, startListening]);

  // Sync ref to break circular dependency
  useEffect(() => {
    stopListeningAndTranscribeRef.current = stopListeningAndTranscribe;
  }, [stopListeningAndTranscribe]);

  // ── Start Interview ──
  const handleStart = async (hardwareIds) => {
    if (!sessionConfig?.interview_type) { navigate('interview-warroom'); return; }
    
    // Ensure AudioContext is created securely during the click gesture to avoid browser suspension
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    
    if (hardwareIds?.micId) {
      setSessionMicId(hardwareIds.micId);
      sessionMicIdRef.current = hardwareIds.micId;
    }
    if (hardwareIds?.videoId) {
      setSessionVideoId(hardwareIds.videoId);
      sessionVideoIdRef.current = hardwareIds.videoId;
    }

    // Enter fullscreen
    try {
      await document.documentElement.requestFullscreen();
    } catch {}

    setPhase('active');
    setOrbState('thinking');
    setShowTranscript(false); // ← Ensure text is hidden on initial start

    try {
      const { data } = await interviewAPI.start({
        interview_type: sessionConfig.interview_type,
        target_role: sessionConfig.target_role,
        target_company: sessionConfig.target_company,
        difficulty: sessionConfig.difficulty,
      });

      setInterviewId(data.interview_id);
      interviewIdRef.current = data.interview_id; // Sync ref immediately — useEffect is async
      setQuestionNumber(1);
      setCurrentQuestion(data.first_question);

      // Speak the first question — only add to chat when audio begins to prevent text leak
      await speakText(data.first_question, () => {
        setConversation([{ role: 'assistant', content: data.first_question }]);
      });

      // Start continuous listening
      setOrbState('listening');
      startListening();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start interview');
      setPhase('setup');
      try { document.exitFullscreen(); } catch {}
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      cleanupAudio();
      if (currentAudioRef.current) {
        try { currentAudioRef.current.pause(); } catch {}
        currentAudioRef.current = null;
      }
      clearInterval(timerRef.current);
    };
  }, [stopListening, cleanupAudio]);

  // ── Follow-up Idle Timeout Logic ──
  useEffect(() => {
    if (isListening && phase === 'active') {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
         if (!transcript.trim()) {
           followUpCountRef.current += 1;
           if (followUpCountRef.current > 2) {
               toast.error("Interview ended due to inactivity.");
               handleEndInterview();
           } else {
               stopListening();
               const followUpText = "Are you still there? Take your time, but let me know when you are ready to answer.";
               speakText(followUpText, () => {
                   setConversation(prev => [...prev, { role: 'assistant', content: followUpText }]);
                   setCurrentQuestion(followUpText);
               }).then(() => {
                   if (phaseRef.current === 'active') {
                       setOrbState('listening');
                       startListening();
                   }
               });
           }
         }
      }, 20000); // 20s
    } else {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
  }, [isListening, transcript, phase, handleEndInterview, speakText, stopListening, startListening, setCurrentQuestion]);

  // ── Scorecard View ──
  if (phase === 'scorecard' && feedback) {
    return (
      <Scorecard
        feedback={feedback}
        conversation={conversation}
        onBack={() => navigate('interview-warroom')}
        onRetry={() => navigate('interview-warroom')}
      />
    );
  }

  // ── Setup Screen (pre-fullscreen) ──
  if (phase === 'setup' && !sessionConfig?.viewId) {
    return <HardwareSetupLobby sessionConfig={sessionConfig} onStart={handleStart} onCancel={() => navigate('interview-warroom')} />;
  }

  // ── Active Interview / Ending ──
  return (
    <div ref={dragConstraintsRef} className="fixed inset-0 bg-[#06090e] flex flex-col z-[9999] overflow-hidden font-sans">
      {/* Premium Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-teal-600/10 rounded-full blur-[150px] mix-blend-screen opacity-50" />
      </div>

      {/* Minimal Header */}
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
          <button onClick={handleEndInterview} disabled={phase === 'ending'}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 hover:text-red-300 transition-all disabled:opacity-50 group shadow-sm">
            <Stop size={14} weight="fill" className="group-hover:scale-110 transition-transform" /> 
            End Session
          </button>
        </div>
      </div>

      {/* Center content: Live Chat & Wave */}
      <div className="relative z-10 flex-1 flex flex-col px-4 sm:px-10 w-full max-w-5xl mx-auto overflow-hidden h-full">
        
        {/* Chat History Container */}
        <div 
          className="flex-1 w-full overflow-y-auto flex flex-col gap-6 pt-10 pb-8 [mask-image:linear-gradient(to_bottom,transparent,black_5%,black_90%,transparent)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          ref={(el) => { if (el) { el.scrollTop = el.scrollHeight; } }}
        >
           {/* Conversation History */}
           {conversation.map((msg, i) => {
             const isLast = i === conversation.length - 1;
             const isAI = msg.role === 'assistant';
             
             return (
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
                   {isLast && isAI && isSpeaking && showTranscript ? (
                      <TypewriterText 
                        text={msg.content} 
                        isSpeaking={isSpeaking} 
                        className="text-[15px] md:text-[17px] leading-relaxed whitespace-pre-wrap font-medium"
                        cursorClassName="inline-block w-1.5 h-4 ml-1.5 bg-indigo-400 animate-pulse align-middle"
                      />
                   ) : (
                      <p className={`text-[15px] md:text-[17px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'opacity-90 font-medium' : 'text-slate-200'}`}>
                        {msg.content}
                      </p>
                   )}
                 </div>
               </motion.div>
             );
           })}

           {/* Live Student Transcript Bubble */}
           <AnimatePresence>
             {transcript && (
               <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex w-full justify-end"
               >
                  <div className="max-w-[85%] md:max-w-[75%] rounded-3xl rounded-br-sm px-6 py-4 backdrop-blur-md border bg-emerald-500/10 border-emerald-500/20 text-emerald-50 flex flex-col gap-2 shadow-2xl">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                       <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 opacity-80">Listening...</span>
                    </div>
                    <p className="text-[15px] md:text-[17px] leading-relaxed whitespace-pre-wrap font-medium opacity-90">{transcript}</p>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
           <div className="h-40 shrink-0" /> {/* Bottom padding so chat scrolls above wave */}
        </div>
      </div>

      {/* Horizontal Aura Wave (Full Screen Width) */}
      <div className="absolute bottom-[56px] sm:bottom-[60px] left-0 right-0 z-0 h-48 sm:h-56 w-full flex items-center justify-center pointer-events-none opacity-90 mix-blend-screen">
         <HorizontalAuraWave state={orbState} analyserRef={analyserRef} />
      </div>

      {/* Floating Draggable Camera */}
      {mediaStreamRef.current && (
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
          <video
            ref={(node) => {
              if (node && node.srcObject !== mediaStreamRef.current) {
                node.srcObject = mediaStreamRef.current;
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1] pointer-events-none" 
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-none shadow-sm">
             <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
             <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active</span>
          </div>
        </motion.div>
      )}

      {/* Bottom status bar */}
      <div className="relative z-10 px-8 py-5 border-t border-white/[0.03] bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {orbState === 'listening' ? (
            <div className="flex items-center gap-2.5 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              <Microphone size={16} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Listening</span>
            </div>
          ) : orbState === 'speaking' ? (
            <div className="flex items-center gap-2.5 bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#06b6d4]" />
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">AI Speaking</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{phase === 'ending' ? 'Evaluating' : 'Processing'}</span>
            </div>
          )}
        </div>
        {isListening && (
          <BottomAudioVisualizer isListening={isListening} />
        )}
      </div>
    </div>
  );
};

export default AIInterviewSession;
