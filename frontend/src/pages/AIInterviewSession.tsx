import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microphone, MicrophoneSlash, Clock, ArrowsOut, X, Brain, Warning, Sparkle, Stop, ChatCircleDots, FileText, Upload, ArrowRight } from '@phosphor-icons/react';
import { interviewAPI, resumeAPI } from '../services/api';
import { toast } from 'sonner';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

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
           const val = dataArray[binIndex] / 255;
           const bell = Math.sin((i / (NUM_POINTS - 1)) * Math.PI); // 0 at edges, 1 in middle
           targetData[i] = val * 50 * bell; // Max amplitude 50px
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
          // Base idle animation
          const idleWave = Math.sin(time + (i / NUM_POINTS) * Math.PI * 2 + phaseOffset) * 4;
          
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
    <div className="w-full flex flex-col items-center gap-6 my-10">
      <div ref={containerRef} className="w-full max-w-[1200px] h-32 relative flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <span 
        className="text-xs font-black uppercase tracking-[0.3em] transition-colors duration-700 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" 
        style={{ color: ORB_STATES[state]?.color1 || '#14b8a6' }}
      >
        {ORB_STATES[state]?.label || 'Ready'}
      </span>
    </div>
  );
};


// ─── Voice-Synced Text (Time-Proportional) ────────────────────────────────────────
// Smooth rAF animation calibrated to TTS speech rate (0.95 × ~150WPM ≈ 70ms/char).
// No dependency on onboundary — works reliably across all browsers and voices.
const TypewriterText = ({ text, isSpeaking }) => {
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
    <p className="text-xl sm:text-2xl font-semibold text-white leading-relaxed max-w-3xl mx-auto drop-shadow-md tracking-wide">
      {text?.slice(0, displayLength)}
      {!isComplete && <span className="inline-block w-1.5 h-6 bg-teal-400 ml-1 rounded-sm animate-pulse" />}
    </p>
  );
};

// ─── Scorecard Component ─────────────────────────────────────────────────────
const Scorecard = ({ feedback, onBack, onRetry }) => {
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
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
            className="soft-card p-6 mb-6">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4 text-center">Performance Dimensions</h3>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }} />
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
              className="soft-card p-5">
              <h4 className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 mb-3">💪 Strengths</h4>
              <ul className="space-y-2">{feedback.strengths.map((s, i) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>{s}</li>)}</ul>
            </motion.div>
          )}
          {feedback.weaknesses?.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="soft-card p-5">
              <h4 className="font-extrabold text-sm text-amber-600 dark:text-amber-400 mb-3">⚡ Areas to Improve</h4>
              <ul className="space-y-2">{feedback.weaknesses.map((w, i) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"><span className="text-amber-500 mt-0.5">→</span>{w}</li>)}</ul>
            </motion.div>
          )}
        </div>

        {/* Per-Question Breakdown */}
        {feedback.per_question?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="soft-card p-5 mb-6">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mb-4">Question-by-Question Feedback</h4>
            <div className="space-y-3">
              {feedback.per_question.map((pq, i) => (
                <details key={i} className="group">
                  <summary className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-500/15 flex items-center justify-center text-xs font-extrabold text-teal-600 dark:text-teal-400 shrink-0">{i + 1}</span>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{pq.question}</p>
                    </div>
                    <span className={`soft-badge text-xs ml-2 shrink-0 ${ratingBgs[pq.rating] || ''} ${ratingColors[pq.rating] || 'text-slate-500'}`}>
                      {(pq.rating || 'n/a').replace('_', ' ')}
                    </span>
                  </summary>
                  <div className="px-3 pb-3 pt-2 space-y-2">
                    {pq.student_answer_summary && <p className="text-xs text-slate-500"><span className="font-bold">Your answer: </span>{pq.student_answer_summary}</p>}
                    {pq.feedback && <p className="text-sm text-slate-600 dark:text-slate-400">{pq.feedback}</p>}
                    {pq.ideal_answer_hint && (
                      <div className="bg-teal-50/50 dark:bg-teal-500/5 rounded-xl p-3 border border-teal-100 dark:border-teal-500/20">
                        <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1">💡 Ideal Answer Should Include:</p>
                        <p className="text-xs text-teal-700 dark:text-teal-300/80">{pq.ideal_answer_hint}</p>
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
            className="soft-card p-5 mb-6 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 dark:from-teal-500/5 dark:to-cyan-500/5 border-teal-200/50 dark:border-teal-500/20">
            <h4 className="font-extrabold text-sm text-teal-700 dark:text-teal-400 mb-3">🎯 Coach Tips</h4>
            <ul className="space-y-2">{feedback.improvement_tips.map((t, i) => <li key={i} className="text-sm text-teal-800 dark:text-teal-300/80 flex items-start gap-2"><Sparkle size={14} weight="fill" className="text-teal-500 mt-0.5 shrink-0" />{t}</li>)}</ul>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-3 rounded-2xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Back to War Room
          </button>
          <button onClick={onRetry} className="flex-1 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700 transition-all">
            Practice Again
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Small Bottom Audio Visualizer ─────────────────────────────────────────────
const BottomAudioVisualizer = ({ analyserRef, isListening }) => {
  const barsRef = useRef([]);
  const heightRef = useRef(new Array(12).fill(3));

  useEffect(() => {
    if (!isListening) return;
    let animationId;
    const renderLoop = () => {
      if (analyserRef?.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        for (let i = 0; i < 12; i++) {
          // dataArray has 32 bins. We take the first 12 or uniformly sample.
          const val = dataArray[i * 2] / 255; 
          const targetHeight = 3 + val * 16; // 3 to 19px
          heightRef.current[i] += (targetHeight - heightRef.current[i]) * 0.4;
          if (barsRef.current[i]) {
            barsRef.current[i].style.height = `${heightRef.current[i]}px`;
          }
        }
      }
      animationId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationId);
  }, [isListening, analyserRef]);

  if (!isListening) return null;

  return (
    <div className="flex gap-0.5 items-end h-5">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          className="w-1 bg-emerald-500/60 rounded-full"
          style={{ height: '3px' }} // Initial height
        />
      ))}
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  // ── Resume presence check on mount ──
  useEffect(() => {
    resumeAPI.latest()
      .then(res => {
        setHasResume(!!(res?.data && (res.data.id || res.data.parsed_text)));
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
      await resumeAPI.upload(formData);
      setHasResume(true);
      toast.success('Resume uploaded! You\'re good to go.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Resume upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

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
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const constraints = {
        video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
        audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
        
        // Filter out ambient noise floor (~4-6)
        const noiseFloor = 6;
        const normalizedVolume = Math.max(0, average - noiseFloor);
        
        if (normalizedVolume > 0) setHasMicSignal(true);
        if (amplitudeBarRef.current) {
           // Multiply for visual heft, hard cap at 100%
           amplitudeBarRef.current.style.width = `${Math.min(100, normalizedVolume * 4)}%`;
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();

    } catch (err) {
      console.error("Camera/Mic access denied:", err);
      toast.error('Please grant camera and microphone permissions to proceed.');
      setPermissionsGranted(false);
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
  }, [selectedVideoId, selectedAudioId]);

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Hardware Setup</h2>
          <p className="text-sm text-slate-500 mb-6 group">
            {sessionConfig?.interview_type?.charAt(0).toUpperCase() + sessionConfig?.interview_type?.slice(1)} Interview
            {sessionConfig?.target_company && ` @ ${sessionConfig.target_company}`}
            {' — '}{sessionConfig?.target_role}
          </p>
          
          {/* Camera Preview */}
          <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden mb-6 border border-slate-200 dark:border-slate-800">
            {permissionsGranted ? (
               <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover scale-x-[-1]" 
               />
            ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Warning size={32} className="mb-2 opacity-50" />
                  <span className="text-sm font-bold uppercase tracking-wider">Awaiting Permissions</span>
               </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Microphone Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Microphone</label>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50 p-3">
                <select 
                  className="w-full bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer truncate"
                  value={selectedAudioId}
                  onChange={(e) => setSelectedAudioId(e.target.value)}
                  disabled={devices.audio.length === 0}
                >
                  {devices.audio.length > 0 ? devices.audio.map(d => (
                    <option key={d.deviceId} value={d.deviceId} className="bg-white dark:bg-slate-900">{d.label || `Microphone ${d.deviceId.slice(0, 5)}`}</option>
                  )) : <option>No microphone found</option>}
                </select>
                {/* Amplitude Bar */}
                <div className="mt-3 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex items-center">
                  <div ref={amplitudeBarRef} className="h-full bg-emerald-500 w-0 transition-all duration-75" />
                </div>
              </div>
            </div>

            {/* Camera Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Camera</label>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50 p-3">
                <select 
                  className="w-full bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer truncate"
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  disabled={devices.video.length === 0}
                >
                  {devices.video.length > 0 ? devices.video.map(d => (
                    <option key={d.deviceId} value={d.deviceId} className="bg-white dark:bg-slate-900">{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                  )) : <option>No camera found</option>}
                </select>
              </div>
            </div>
          </div>

          {/* ── Resume Check ── */}
          {hasResume === false && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="mt-6 mb-6 p-5 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={22} weight="duotone" className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm text-amber-800 dark:text-amber-300 mb-1">Resume Required</h4>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mb-3 leading-relaxed">
                    Ami personalizes your interview using your resume. Upload a PDF to get started.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-60"
                  >
                    <Upload size={14} weight="bold" />
                    {isUploading ? 'Uploading...' : 'Upload Resume (PDF)'}
                  </button>
                  <p className="text-[10px] text-amber-600/50 dark:text-amber-400/40 mt-2">or drag & drop a PDF here</p>
                </div>
              </div>
            </div>
          )}
          {hasResume === true && (
            <div className="mt-6 mb-6 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <FileText size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Resume detected — Ami will personalize your interview</span>
            </div>
          )}

          {/* Action Row */}
          <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-slate-100 dark:border-slate-800/50">
            <button 
              onClick={onCancel}
              className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleStartWrapper} 
              disabled={!permissionsGranted || !hasMicSignal || hasResume === false || hasResume === null}
              className="flex-1 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasResume === null ? 'Checking resume...' : hasResume === false ? 'Resume required to start' : !permissionsGranted ? 'Waiting for permissions...' : !hasMicSignal ? 'Waiting for mic signal...' : 'Start Interview'}
              {permissionsGranted && hasMicSignal && hasResume && <ArrowsOut size={16} weight="bold" />}
            </button>
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
    // 1. Initialize Web Audio API for visualizer & restart camera
    if (!audioContextRef.current) {
      try {
        const constraints = {
          audio: sessionMicId ? { deviceId: { exact: sessionMicId } } : true,
          video: sessionVideoId ? { deviceId: { exact: sessionVideoId } } : true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = stream;
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256; // 128 bins — better frequency resolution for speech
        
        sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceNodeRef.current.connect(analyserRef.current);
      } catch (err) {
        console.error("Camera/Microphone access denied.", err);
        toast.error('Camera and Microphone access are required for the interview.');
      }
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
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
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

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

    try {
      const { data } = await interviewAPI.sendMessage(currentInterviewId, { content: answer });
      
      const onAudioStart = () => {
        setConversation(prev => [
          ...prev,
          { role: 'user', content: answer },
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
    
    if (hardwareIds?.micId) setSessionMicId(hardwareIds.micId);
    if (hardwareIds?.videoId) setSessionVideoId(hardwareIds.videoId);

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
      setConversation([{ role: 'assistant', content: data.first_question }]);

      // Speak the first question
      await speakText(data.first_question);

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

  // ── Scorecard View ──
  if (phase === 'scorecard' && feedback) {
    return (
      <Scorecard
        feedback={feedback}
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-teal-500/20 flex items-center justify-center border border-white/5 shadow-inner">
            <Sparkle size={18} weight="fill" className="text-indigo-400" />
          </div>
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

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-[1400px] mx-auto w-full">
        
        {/* Current question (typewriter) */}
        <div className="mt-4 mb-8 text-center px-4 min-h-[120px] w-full max-w-4xl mx-auto flex items-end justify-center">
          {showTranscript && currentQuestion && <TypewriterText text={currentQuestion} isSpeaking={isSpeaking} />}
        </div>

        {/* Horizontal Aura Wave (Replaces Orb) */}
        <HorizontalAuraWave state={orbState} analyserRef={analyserRef} />

        {/* Student transcript (live) */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-10 max-w-2xl w-full bg-[#111827]/80 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl px-6 py-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                </div>
                <p className="text-base font-medium text-slate-300 leading-relaxed tracking-wide">{transcript}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
          {isListening ? (
            <div className="flex items-center gap-2.5 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              <Microphone size={16} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Listening</span>
            </div>
          ) : isSpeaking ? (
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
          <BottomAudioVisualizer analyserRef={analyserRef} isListening={isListening} />
        )}
      </div>
    </div>
  );
};

export default AIInterviewSession;
