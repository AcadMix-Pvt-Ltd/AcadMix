import React, { useState, useMemo } from 'react';
import { ArrowsDownUp, Stack, Calculator, Download, Info, CornersIn, CornersOut } from '@phosphor-icons/react';

interface SoilParams {
  thickness: number;          // H (m)
  voidRatio: number;          // e0
  compressionIndex: number;   // Cc
  recompressionIndex: number; // Cr
  initialStress: number;      // sigma_0 (kPa)
  preconsolidation: number;   // sigma_c (kPa)
  stressIncrement: number;    // delta_sigma (kPa)
}

export default function SettlementCalculator({
  isFullScreen,
  onExitFullScreen,
  onRequestFullScreen,
}: {
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
}) {
  const [params, setParams] = useState<SoilParams>({
    thickness: 5.0,
    voidRatio: 0.85,
    compressionIndex: 0.32,
    recompressionIndex: 0.05,
    initialStress: 100,
    preconsolidation: 120,
    stressIncrement: 50,
  });

  const handleParamChange = (field: keyof SoilParams, value: number) => {
    setParams(prev => ({ ...prev, [field]: value }));
  };

  const results = useMemo(() => {
    const {
      thickness: H,
      voidRatio: e0,
      compressionIndex: Cc,
      recompressionIndex: Cr,
      initialStress: s0,
      preconsolidation: sc,
      stressIncrement: ds
    } = params;

    const sf = s0 + ds; // Final stress

    let Sc = 0;
    let state = '';

    if (s0 >= sc) {
      // Normally Consolidated
      state = 'Normally Consolidated (NC)';
      Sc = (Cc * H) / (1 + e0) * Math.log10(sf / s0);
    } else {
      // Overconsolidated
      if (sf <= sc) {
        state = 'Overconsolidated (Final stress < Preconsolidation)';
        Sc = (Cr * H) / (1 + e0) * Math.log10(sf / s0);
      } else {
        state = 'Overconsolidated (Final stress > Preconsolidation)';
        Sc = ((Cr * H) / (1 + e0) * Math.log10(sc / s0)) +
             ((Cc * H) / (1 + e0) * Math.log10(sf / sc));
      }
    }

    return {
      Sc_meters: Sc,
      Sc_mm: Sc * 1000,
      state,
      finalStress: sf
    };
  }, [params]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#0B0C10] text-gray-300 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-[#1F2833]/50">
        <div className="flex items-center min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mr-4 shrink-0">
            <Stack size={24} className="text-amber-400" weight="duotone" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white tracking-wide truncate">1D Consolidation Settlement</h2>
            <p className="text-xs text-gray-400 font-medium truncate">Native Geotechnical Analysis Tool</p>
          </div>
        </div>
        {(onExitFullScreen || onRequestFullScreen) && (
          <button
            type="button"
            onClick={() => (isFullScreen ? onExitFullScreen?.() : onRequestFullScreen?.())}
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-slate-200"
          >
            {isFullScreen ? <CornersIn size={16} weight="bold" /> : <CornersOut size={16} weight="bold" />}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Panel - Inputs */}
        <div className="w-1/2 p-6 overflow-y-auto border-r border-white/10 custom-scrollbar">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <SlidersHorizontal size={16} /> Soil Parameters
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <InputField 
                label="Layer Thickness (H)" 
                value={params.thickness} 
                unit="m" 
                min={0.1} step={0.1}
                onChange={(v) => handleParamChange('thickness', v)} 
              />
              <InputField 
                label="Initial Void Ratio (e₀)" 
                value={params.voidRatio} 
                unit="-" 
                min={0.1} step={0.01}
                onChange={(v) => handleParamChange('voidRatio', v)} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <InputField 
                label="Compression Index (C_c)" 
                value={params.compressionIndex} 
                unit="-" 
                min={0.01} step={0.01}
                onChange={(v) => handleParamChange('compressionIndex', v)} 
              />
              <InputField 
                label="Recompression Index (C_r)" 
                value={params.recompressionIndex} 
                unit="-" 
                min={0.001} step={0.01}
                onChange={(v) => handleParamChange('recompressionIndex', v)} 
              />
            </div>

            <div className="pt-4 border-t border-white/5">
              <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ArrowsDownUp size={16} /> Stress State
              </h3>
              <div className="space-y-4">
                <InputField 
                  label="Initial Effective Stress (σ'₀)" 
                  value={params.initialStress} 
                  unit="kPa" 
                  min={1} step={1}
                  onChange={(v) => handleParamChange('initialStress', v)} 
                />
                <InputField 
                  label="Preconsolidation Stress (σ'_c)" 
                  value={params.preconsolidation} 
                  unit="kPa" 
                  min={1} step={1}
                  onChange={(v) => handleParamChange('preconsolidation', v)} 
                />
                <InputField 
                  label="Stress Increment (Δσ)" 
                  value={params.stressIncrement} 
                  unit="kPa" 
                  min={0} step={1}
                  onChange={(v) => handleParamChange('stressIncrement', v)} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="w-1/2 p-6 bg-[#0B0C10]/50 overflow-y-auto custom-scrollbar flex flex-col">
          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Calculator size={16} /> Analysis Results
          </h3>

          <div className="bg-[#1F2833] rounded-2xl border border-white/10 p-6 flex-1 flex flex-col justify-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
              <Stack size={200} weight="fill" />
            </div>

            <div className="text-center mb-8 relative z-10">
              <div className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-widest">Total Primary Settlement (S_c)</div>
              <div className="text-6xl font-black text-emerald-400 tabular-nums tracking-tighter">
                {results.Sc_mm.toFixed(2)} <span className="text-2xl text-emerald-600 font-bold tracking-normal">mm</span>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                ({results.Sc_meters.toFixed(4)} meters)
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <ResultRow label="Soil State" value={results.state} />
              <ResultRow label="Initial Stress (σ'₀)" value={params.initialStress} unit="kPa" />
              <ResultRow label="Final Stress (σ'_f)" value={results.finalStress} unit="kPa" />
            </div>

            <div className="mt-8 p-4 rounded-xl bg-sky-900/20 border border-sky-500/20 text-sky-200 text-xs leading-relaxed flex gap-3 relative z-10">
              <Info size={20} className="text-sky-400 shrink-0" weight="duotone" />
              <p>
                Calculations assume 1D consolidation (Terzaghi theory). Ensure units are consistent. For multi-layer soils, calculate settlement for each layer independently and sum the results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, unit, min, step, onChange }: { label: string, value: number, unit: string, min: number, step: number, onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-400">{label}</label>
      <div className="relative">
        <input 
          type="number" 
          value={value} 
          min={min} 
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-[#12161A] border border-white/10 rounded-lg py-2 pl-3 pr-12 text-white font-medium focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all outline-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold uppercase select-none">
          {unit}
        </span>
      </div>
    </div>
  );
}

function ResultRow({ label, value, unit }: { label: string, value: string | number, unit?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white font-medium text-right">
        {value} {unit && <span className="text-gray-500 text-xs ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function SlidersHorizontal({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 256 256" className={className}>
      <path d="M40,112A16,16,0,1,0,24,96,16,16,0,0,0,40,112Zm0-20a4,4,0,1,1-4,4A4,4,0,0,1,40,92ZM216,144A16,16,0,1,0,200,128,16,16,0,0,0,216,144Zm0-20a4,4,0,1,1-4,4A4,4,0,0,1,216,124ZM128,192A16,16,0,1,0,112,176,16,16,0,0,0,128,192Zm0-20a4,4,0,1,1-4,4A4,4,0,0,1,128,172Z"></path>
      <line x1="40" y1="96" x2="248" y2="96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
      <line x1="8" y1="96" x2="24" y2="96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
      <line x1="216" y1="144" x2="248" y2="144" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
      <line x1="8" y1="144" x2="200" y2="144" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
      <line x1="128" y1="192" x2="248" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
      <line x1="8" y1="192" x2="112" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"></line>
    </svg>
  );
}
