import React, { useState, useEffect, useRef } from 'react';
import { WaveSine, SpeakerHigh, SpeakerSlash, Play, Pause, Pulse, CornersIn, CornersOut } from '@phosphor-icons/react';

export default function FunctionGenerator({
  isFullScreen,
  onExitFullScreen,
  onRequestFullScreen,
}: {
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
}) {
  const [f1, setF1] = useState(250);
  const [f2, setF2] = useState(257);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [zoom, setZoom] = useState(0.05);
  const [overlayWaves, setOverlayWaves] = useState(false);
  
  // Audio context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  // Initialize Audio
  useEffect(() => {
    if (isAudioEnabled && !audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.connect(audioCtxRef.current.destination);
      gainNodeRef.current.gain.value = 0; // Start muted until "Play"

      osc1Ref.current = audioCtxRef.current.createOscillator();
      osc2Ref.current = audioCtxRef.current.createOscillator();
      
      osc1Ref.current.connect(gainNodeRef.current);
      osc2Ref.current.connect(gainNodeRef.current);
      
      osc1Ref.current.start();
      osc2Ref.current.start();
    }
    
    return () => {
      if (audioCtxRef.current) {
        osc1Ref.current?.stop();
        osc2Ref.current?.stop();
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [isAudioEnabled]);

  // Update frequencies
  useEffect(() => {
    if (osc1Ref.current) osc1Ref.current.frequency.setValueAtTime(f1, audioCtxRef.current?.currentTime || 0);
    if (osc2Ref.current) osc2Ref.current.frequency.setValueAtTime(f2, audioCtxRef.current?.currentTime || 0);
  }, [f1, f2]);

  // Toggle Play/Pause (Volume)
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      // Smooth transition to avoid audio clicks
      gainNodeRef.current.gain.setTargetAtTime(isPlaying ? 0.15 : 0, audioCtxRef.current.currentTime, 0.05);
    }
    
    if (isPlaying) {
      lastTimeRef.current = performance.now();
    }
  }, [isPlaying]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (now: number) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Grid & Time Referencing
      const BOTTOM_MARGIN = 80;
      const drawH = height - BOTTOM_MARGIN;
      
      ctx.strokeStyle = '#1e293b'; 
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const TIME_WINDOW = zoom;
      
      for (let i = 0; i < width; i += 100) { 
        ctx.moveTo(i, 0); 
        ctx.lineTo(i, drawH); 
      }
      for (let i = 0; i < drawH; i += 100) { 
        ctx.moveTo(0, i); 
        ctx.lineTo(width, i); 
      }
      ctx.stroke();

      // Time Axis Line
      ctx.beginPath();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.moveTo(0, drawH);
      ctx.lineTo(width, drawH);
      ctx.stroke();

      // Ticks and Labels
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = '500 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      for (let i = 0; i <= width; i += 200) {
        if (i === 0 || i === width) continue;
        
        // Draw tick mark
        ctx.beginPath();
        ctx.strokeStyle = '#475569';
        ctx.moveTo(i, drawH);
        ctx.lineTo(i, drawH + 8);
        ctx.stroke();

        const timeVal = (i / width) * TIME_WINDOW;
        const label = TIME_WINDOW < 0.1 
          ? `${(timeVal * 1000).toFixed(1)}` 
          : `${timeVal.toFixed(3)}`;
        ctx.fillText(label, i, drawH + 12);
      }

      // Axis Title
      ctx.fillStyle = '#cbd5e1'; // slate-300
      ctx.font = 'bold 18px sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.fillText(TIME_WINDOW < 0.1 ? "Time in milliseconds" : "Time in seconds", width / 2, height - 10);

      // Delta time for wave movement
      if (isPlaying) {
        const dt = (now - lastTimeRef.current) / 1000; // seconds
        // Slow down visual time progression so high frequency waves don't look chaotic
        timeRef.current += dt * 0.02;
      }
      lastTimeRef.current = now;

      // Draw mathematical waves
      const drawWave = (freq: number, color: string, yOffset: number, amplitude: number) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        
        const TIME_WINDOW = zoom; 

        for (let x = 0; x < width; x++) {
          const localT = (x / width) * TIME_WINDOW;
          const globalT = localT + timeRef.current;
          
          const y = yOffset - Math.sin(2 * Math.PI * freq * globalT) * amplitude;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      const drawSuperposition = (yOffset: number, amplitude: number) => {
        ctx.beginPath();
        ctx.strokeStyle = '#a855f7'; 
        ctx.lineWidth = 5;
        
        const TIME_WINDOW = zoom;

        for (let x = 0; x < width; x++) {
          const localT = (x / width) * TIME_WINDOW;
          const globalT = localT + timeRef.current;
          
          const y1 = Math.sin(2 * Math.PI * f1 * globalT);
          const y2 = Math.sin(2 * Math.PI * f2 * globalT);
          const y = yOffset - (y1 + y2) * (amplitude / 2);
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      if (overlayWaves) {
        // Top half: f1 and f2 overlaid
        drawWave(f1, 'rgba(59,130,246,0.6)', drawH * 0.33, 100); 
        drawWave(f2, 'rgba(239,68,68,0.6)', drawH * 0.33, 100); 
        // Bottom half: Superposition
        drawSuperposition(drawH * 0.75, 200);
      } else {
        // Layout heights: 20%, 50%, 80% relative to drawH
        drawWave(f1, '#3b82f6', drawH * 0.20, 80); 
        drawWave(f2, '#ef4444', drawH * 0.50, 80); 
        drawSuperposition(drawH * 0.80, 160);
      }

      animationRef.current = requestAnimationFrame(render);
    };
    
    animationRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationRef.current);
  }, [f1, f2, isPlaying, zoom, overlayWaves]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#0B0C10] text-white rounded-xl overflow-hidden p-4 gap-4 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Pulse size={24} weight="bold" className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100">Wave Interference & Beat Frequency</h2>
            <p className="text-xs font-medium text-slate-400">Native Dual-Channel Function Generator & Oscilloscope</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {(onExitFullScreen || onRequestFullScreen) && (
            <button
              type="button"
              onClick={() => (isFullScreen ? onExitFullScreen?.() : onRequestFullScreen?.())}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100"
            >
              {isFullScreen ? <CornersIn size={16} weight="bold" /> : <CornersOut size={16} weight="bold" />}
            </button>
          )}
          <button 
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isAudioEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
          >
            {isAudioEnabled ? <SpeakerHigh weight="fill" /> : <SpeakerSlash weight="fill" />}
            {isAudioEnabled ? 'Audio Connected' : 'Audio Disconnected'}
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg hover:scale-105 active:scale-95 ${isPlaying ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/25'}`}
          >
            {isPlaying ? <Pause weight="fill" size={18} /> : <Play weight="fill" size={18} />}
            {isPlaying ? 'PAUSE' : 'SIMULATE'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 min-h-0">
        
        {/* Oscilloscope Canvas */}
        <div className="flex-1 bg-slate-900 rounded-2xl border-2 border-slate-800 relative overflow-hidden shadow-inner">
           <canvas 
             ref={canvasRef} 
             width={1600} 
             height={1000} 
             className="w-full h-full object-fill opacity-90 mix-blend-screen"
           />
           {/* Labels */}
           <div className={`absolute left-6 transition-all duration-500 ${overlayWaves ? 'top-[22%]' : 'top-[8%]'} flex items-center gap-2 text-sm font-bold text-blue-400 bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 shadow-md`}>
             <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div> Channel 1 (f1)
           </div>
           <div className={`absolute left-6 transition-all duration-500 ${overlayWaves ? 'top-[28%]' : 'top-[36%]'} flex items-center gap-2 text-sm font-bold text-red-400 bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 shadow-md`}>
             <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div> Channel 2 (f2)
           </div>
           <div className={`absolute left-6 transition-all duration-500 ${overlayWaves ? 'top-[54%]' : 'top-[58%]'} flex items-center gap-2 text-sm font-bold text-purple-400 bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 shadow-md`}>
             <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div> Superposition (Interference)
           </div>
        </div>

        {/* Controls Sidebar */}
        <div className="w-80 bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 flex flex-col gap-5 overflow-y-auto shadow-inner backdrop-blur-xl">
          
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <WaveSine size={18} className="text-blue-400" /> Oscillator 1
            </h3>
            
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="flex justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400">Frequency (f1)</span>
                <span className="text-sm font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{f1} Hz</span>
              </div>
              <input 
                type="range" min="100" max="800" step="1" value={f1} onChange={(e) => setF1(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between mt-1 px-1">
                <span className="text-[10px] text-slate-500 font-mono">100Hz</span>
                <span className="text-[10px] text-slate-500 font-mono">800Hz</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <WaveSine size={18} className="text-red-400" /> Oscillator 2
            </h3>
            
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="flex justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400">Frequency (f2)</span>
                <span className="text-sm font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{f2} Hz</span>
              </div>
              <input 
                type="range" min="100" max="800" step="1" value={f2} onChange={(e) => setF2(Number(e.target.value))}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between mt-1 px-1">
                <span className="text-[10px] text-slate-500 font-mono">100Hz</span>
                <span className="text-[10px] text-slate-500 font-mono">800Hz</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <Pulse size={18} className="text-emerald-400" /> Visualization
            </h3>
            
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
              <div>
                <div className="flex justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">Zoom (Time Window)</span>
                  <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{(zoom * 1000).toFixed(0)} ms</span>
                </div>
                <input 
                  type="range" min="0.01" max="0.2" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="overlay-toggle"
                  checked={overlayWaves} 
                  onChange={(e) => setOverlayWaves(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
                />
                <label htmlFor="overlay-toggle" className="text-sm font-bold text-slate-300 cursor-pointer select-none">
                  Overlay waves
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex-1"></div>
          
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-5 shadow-lg">
             <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
               <Pulse weight="bold" /> Beat Frequency
             </h4>
             <p className="text-4xl font-black font-mono text-white text-center drop-shadow-md">
               {Math.abs(f1 - f2)} <span className="text-lg text-indigo-400">Hz</span>
             </p>
             <p className="text-xs text-slate-400 text-center mt-3 leading-relaxed font-medium">
               The interference pattern creates an audible "beat" pulsing exactly <strong className="text-slate-200">{Math.abs(f1 - f2)}</strong> times per second.
             </p>
          </div>

        </div>

      </div>
    </div>
  );
}
