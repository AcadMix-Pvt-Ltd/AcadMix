import React, { useEffect, useRef, useState } from 'react';

const ORB_STATES = {
  listening: { color1: '#10b981', color2: '#34d399', label: 'Listening' },
};

// 1. Siri-style Fluid Blob (Using SVG filters)
const SiriOrb = () => {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" version="1.1">
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className="w-full h-full relative" style={{ filter: 'url(#gooey)' }}>
        <div className="absolute top-4 left-4 w-32 h-32 bg-emerald-400 rounded-full mix-blend-screen animate-[spin_4s_linear_infinite]" />
        <div className="absolute bottom-4 right-4 w-28 h-28 bg-teal-500 rounded-full mix-blend-screen animate-[spin_3s_linear_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-cyan-400 rounded-full mix-blend-screen animate-[pulse_2s_ease-in-out_infinite]" />
      </div>
      <div className="absolute -bottom-8 font-bold tracking-widest text-emerald-400 text-xs">SIRI FLUID BLOB</div>
    </div>
  );
};

// 2. OpenAI-style Liquid Blob (Using CSS border-radius morphing)
const OpenAIOrb = () => {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <div className="w-32 h-32 bg-white rounded-full relative z-10 
        animate-[morph_4s_ease-in-out_infinite] shadow-[0_0_40px_rgba(255,255,255,0.4)]"
      >
        <div className="absolute inset-0 bg-black/5 rounded-full" />
      </div>
      <style>{`
        @keyframes morph {
          0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: scale(1); }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: scale(1.1); }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: scale(1); }
        }
      `}</style>
      <div className="absolute -bottom-8 font-bold tracking-widest text-slate-300 text-xs">OPENAI SOLID BLOB</div>
    </div>
  );
};

// 3. Sci-Fi HUD Ring
const SciFiOrb = () => {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <div className="absolute w-36 h-36 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-[spin_3s_linear_infinite]" />
      <div className="absolute w-28 h-28 rounded-full border border-dashed border-teal-400/50 animate-[spin_4s_linear_infinite_reverse]" />
      <div className="absolute w-20 h-20 rounded-full bg-emerald-500/10 backdrop-blur-md flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_#10b981]">
        <div className="w-6 h-6 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_15px_#10b981]" />
      </div>
      <div className="absolute -bottom-8 font-bold tracking-widest text-emerald-400 text-xs">SCI-FI HUD</div>
    </div>
  );
};

// 4. Circular Audio Waveform
const WaveformOrb = () => {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-emerald-500/5 blur-xl animate-pulse" />
      <div className="relative w-32 h-32">
        {[...Array(24)].map((_, i) => {
          const angle = (i / 24) * 360;
          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-1 bg-emerald-400 rounded-full origin-bottom"
              style={{
                height: `${20 + Math.random() * 20}px`,
                transform: `translate(-50%, -100%) rotate(${angle}deg) translateY(-24px)`,
                animation: `pulse ${1 + Math.random()}s ease-in-out infinite alternate`
              }}
            />
          );
        })}
      </div>
      <div className="absolute w-12 h-12 bg-emerald-500 rounded-full animate-ping opacity-20" />
      <div className="absolute -bottom-8 font-bold tracking-widest text-emerald-400 text-xs">CIRCULAR WAVEFORM</div>
    </div>
  );
};


export default function OrbShowcase() {
  return (
    <div className="min-h-screen bg-[#06090e] p-12 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-white mb-16 font-sans">Orb Visualizer Showcase</h1>
      <div className="grid grid-cols-2 gap-x-32 gap-y-24">
        <SiriOrb />
        <OpenAIOrb />
        <SciFiOrb />
        <WaveformOrb />
      </div>
    </div>
  );
}
