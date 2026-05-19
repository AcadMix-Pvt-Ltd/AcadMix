import React, { useMemo, useRef, useState } from 'react';
import {
  Blueprint,
  Calculator,
  CheckCircle,
  Clock,
  Compass,
  CornersIn,
  CornersOut,
  Cube,
  Drop,
  Gauge,
  HardHat,
  Path,
  Plus,
  Stack,
  Trash,
  Tree,
  WarningCircle,
  Wall,
} from '@phosphor-icons/react';

export type CivilStudioTool =
  | 'structural'
  | 'geotech'
  | 'hydraulics'
  | 'survey'
  | 'cad'
  | 'transport'
  | 'environment'
  | 'concrete'
  | 'estimation'
  | 'planning'
  | 'steel'
  | 'retaining'
  | 'waterNetwork'
  | 'openChannel'
  | 'pavement'
  | 'leveling'
  | 'mixDesign'
  | 'costEstimator'
  | 'frame'
  | 'truss'
  | 'soilLab'
  | 'earthwork'
  | 'bridge'
  | 'columnFooting'
  | 'masonry'
  | 'rebar'
  | 'formwork'
  | 'pile'
  | 'seismic'
  | 'wind'
  | 'services'
  | 'equipment'
  | 'qcLab'
  | 'tender'
  | 'siteLayout'
  | 'bimRevit'
  | 'bbs'
  | 'rateAnalysis'
  | 'isCodeChecker'
  | 'safetyInspection'
  | 'draftingPractice'
  | 'staadFrame'
  | 'projectControl'
  | 'claimsDelay'
  | 'qaDocs'
  | 'setout'
  | 'roadCrossSection'
  | 'stormwater'
  | 'drawingTakeoff';

type CivilEngineeringStudioProps = {
  tool: CivilStudioTool;
  user?: unknown;
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
};

type Point = {
  x: number;
  y: number;
};

const toolMeta: Record<CivilStudioTool, { title: string; subtitle: string; accent: string; icon: React.ReactNode }> = {
  structural: {
    title: 'Structural Analysis Studio',
    subtitle: 'Beam reactions, SFD/BMD, deflection and serviceability checks',
    accent: 'rose',
    icon: <Blueprint size={24} weight="duotone" />,
  },
  geotech: {
    title: 'Geotechnical Bearing Studio',
    subtitle: 'Terzaghi bearing capacity with safety and soil-state insight',
    accent: 'amber',
    icon: <Stack size={24} weight="duotone" />,
  },
  hydraulics: {
    title: 'Hydraulics Flow Studio',
    subtitle: 'Pipe head loss, pump power and open-channel Manning flow',
    accent: 'sky',
    icon: <Drop size={24} weight="duotone" />,
  },
  survey: {
    title: 'Survey Traverse Studio',
    subtitle: 'Bowditch correction, coordinate plotting, area and precision',
    accent: 'emerald',
    icon: <Compass size={24} weight="duotone" />,
  },
  cad: {
    title: 'CAD/BIM Quantity Sketcher',
    subtitle: 'Grid planning, bay quantities and early structural takeoff',
    accent: 'violet',
    icon: <Cube size={24} weight="duotone" />,
  },
  transport: {
    title: 'Road Geometry Studio',
    subtitle: 'Sight distance, superelevation, curve and capacity checks',
    accent: 'indigo',
    icon: <Path size={24} weight="duotone" />,
  },
  environment: {
    title: 'Environmental Systems Studio',
    subtitle: 'Water demand, treatment tank sizing and BOD process checks',
    accent: 'teal',
    icon: <Tree size={24} weight="duotone" />,
  },
  concrete: {
    title: 'RCC Beam Design Studio',
    subtitle: 'Flexural steel, ductility, spacing and utilization checks',
    accent: 'rose',
    icon: <Wall size={24} weight="duotone" />,
  },
  estimation: {
    title: 'Quantity & BBS Studio',
    subtitle: 'Concrete, cement, aggregates, reinforcement and cost takeoff',
    accent: 'amber',
    icon: <Calculator size={24} weight="duotone" />,
  },
  planning: {
    title: 'Construction Planning Studio',
    subtitle: 'CPM, floats, critical path and Gantt visualization',
    accent: 'violet',
    icon: <Clock size={24} weight="duotone" />,
  },
  steel: {
    title: 'Steel Structure Design Studio',
    subtitle: 'Tension, compression, slenderness and utilization checks',
    accent: 'sky',
    icon: <Blueprint size={24} weight="duotone" />,
  },
  retaining: {
    title: 'Retaining Wall & Slope Studio',
    subtitle: 'Earth pressure, sliding, overturning and bearing checks',
    accent: 'amber',
    icon: <Stack size={24} weight="duotone" />,
  },
  waterNetwork: {
    title: 'Water Supply Network Studio',
    subtitle: 'Loop demand, head loss, velocity and Hardy-Cross style balance',
    accent: 'teal',
    icon: <Drop size={24} weight="duotone" />,
  },
  openChannel: {
    title: 'Open Channel Design Studio',
    subtitle: 'Trapezoidal canal, Froude number, discharge and lining checks',
    accent: 'sky',
    icon: <Drop size={24} weight="duotone" />,
  },
  pavement: {
    title: 'Pavement Design Studio',
    subtitle: 'CBR, traffic, flexible layers and rigid slab thickness',
    accent: 'indigo',
    icon: <Path size={24} weight="duotone" />,
  },
  leveling: {
    title: 'Survey Leveling Studio',
    subtitle: 'HI method, rise/fall checks, contour interpolation and closing error',
    accent: 'emerald',
    icon: <Compass size={24} weight="duotone" />,
  },
  mixDesign: {
    title: 'Concrete Mix Design Studio',
    subtitle: 'Target strength, w/c ratio, moisture correction and material yield',
    accent: 'rose',
    icon: <Wall size={24} weight="duotone" />,
  },
  costEstimator: {
    title: 'Construction Cost Estimator',
    subtitle: 'Excavation, PCC, RCC, masonry, finishing and live rate sensitivity',
    accent: 'amber',
    icon: <Calculator size={24} weight="duotone" />,
  },
  frame: {
    title: 'Frame Analysis Studio',
    subtitle: 'Portal frame loads, approximate drift, reactions and moment demand',
    accent: 'rose',
    icon: <Blueprint size={24} weight="duotone" />,
  },
  truss: {
    title: 'Truss Analysis Studio',
    subtitle: 'Span, panel geometry, nodal load and member-force visualization',
    accent: 'sky',
    icon: <Blueprint size={24} weight="duotone" />,
  },
  soilLab: {
    title: 'Soil Classification & Compaction Studio',
    subtitle: 'Sieve, Atterberg, USCS/IS interpretation and Proctor curve insight',
    accent: 'amber',
    icon: <Stack size={24} weight="duotone" />,
  },
  earthwork: {
    title: 'GIS / Contour / Earthwork Studio',
    subtitle: 'Grid levels, contour slope, cut-fill balancing and haul estimate',
    accent: 'emerald',
    icon: <Compass size={24} weight="duotone" />,
  },
  bridge: {
    title: 'Bridge Basics Studio',
    subtitle: 'Deck span, IRC-style live load, girder reactions and distribution',
    accent: 'indigo',
    icon: <Path size={24} weight="duotone" />,
  },
  columnFooting: {
    title: 'Column & Footing Design Studio',
    subtitle: 'Axial load, eccentricity, footing pressure, shear and sizing checks',
    accent: 'rose',
    icon: <Wall size={24} weight="duotone" />,
  },
  masonry: {
    title: 'Masonry Design Studio',
    subtitle: 'Wall load, slenderness, opening effect and lintel load path checks',
    accent: 'amber',
    icon: <Wall size={24} weight="duotone" />,
  },
  rebar: {
    title: 'Rebar Detailing Studio',
    subtitle: 'Anchorage, lap, hook, spacing and bar bending schedule quantities',
    accent: 'rose',
    icon: <Wall size={24} weight="duotone" />,
  },
  formwork: {
    title: 'Formwork & Scaffolding Studio',
    subtitle: 'Panel quantity, prop spacing, pour pressure and reuse-cycle costing',
    accent: 'violet',
    icon: <Cube size={24} weight="duotone" />,
  },
  pile: {
    title: 'Pile Group Studio',
    subtitle: 'Pile capacity, group efficiency, settlement indicator and layout',
    accent: 'amber',
    icon: <Stack size={24} weight="duotone" />,
  },
  seismic: {
    title: 'Seismic Design Studio',
    subtitle: 'Base shear, response factor, storey drift and soft-storey signal',
    accent: 'rose',
    icon: <Gauge size={24} weight="duotone" />,
  },
  wind: {
    title: 'Wind Load Studio',
    subtitle: 'IS 875-style wind pressure, height factor and cladding load map',
    accent: 'sky',
    icon: <Gauge size={24} weight="duotone" />,
  },
  services: {
    title: 'Building Services Civil Studio',
    subtitle: 'Rainwater pipes, septic tank, soak pit and fire tank sizing',
    accent: 'teal',
    icon: <Drop size={24} weight="duotone" />,
  },
  equipment: {
    title: 'Construction Equipment Productivity Studio',
    subtitle: 'Excavator, dumper, pump and batching cycle productivity checks',
    accent: 'violet',
    icon: <Clock size={24} weight="duotone" />,
  },
  qcLab: {
    title: 'Quality Control Lab Studio',
    subtitle: 'Slump, cube, sieve, density and bitumen test interpretation',
    accent: 'emerald',
    icon: <CheckCircle size={24} weight="duotone" />,
  },
  tender: {
    title: 'Tender & BOQ Comparison Studio',
    subtitle: 'Rate analysis, L1/L2/L3 comparison and item-wise variance risk',
    accent: 'amber',
    icon: <Calculator size={24} weight="duotone" />,
  },
  siteLayout: {
    title: 'Site Layout Planning Studio',
    subtitle: 'Crane reach, storage zones, access paths and safety buffer planning',
    accent: 'indigo',
    icon: <Cube size={24} weight="duotone" />,
  },
  bimRevit: {
    title: 'BIM / Revit Concept Studio',
    subtitle: 'Model levels, grid planning, quantities and coordination issue checks',
    accent: 'violet',
    icon: <Cube size={24} weight="duotone" />,
  },
  bbs: {
    title: 'Bar Bending Schedule Studio',
    subtitle: 'Cut length, bends, laps, hooks, weight and wastage control',
    accent: 'rose',
    icon: <Wall size={24} weight="duotone" />,
  },
  rateAnalysis: {
    title: 'Rate Analysis Studio',
    subtitle: 'Material, labour, equipment, overhead and contractor margin breakdown',
    accent: 'amber',
    icon: <Calculator size={24} weight="duotone" />,
  },
  isCodeChecker: {
    title: 'IS Code Design Checker',
    subtitle: 'Quick compliance checks for RCC, steel, wind, seismic and serviceability',
    accent: 'emerald',
    icon: <CheckCircle size={24} weight="duotone" />,
  },
  safetyInspection: {
    title: 'Construction Safety Inspection Studio',
    subtitle: 'Scaffold, excavation, lifting, PPE and site-risk inspection scoring',
    accent: 'rose',
    icon: <WarningCircle size={24} weight="duotone" />,
  },
  draftingPractice: {
    title: 'AutoCAD Drafting Practice Board',
    subtitle: 'Scale, linework, offsets, dimensions and drawing accuracy checks',
    accent: 'sky',
    icon: <Blueprint size={24} weight="duotone" />,
  },
  staadFrame: {
    title: 'STAAD-like Frame Modeler',
    subtitle: 'Nodes, members, supports, loads and utilization for placement workflows',
    accent: 'indigo',
    icon: <Blueprint size={24} weight="duotone" />,
  },
  projectControl: {
    title: 'Project Planning Cost-Control Studio',
    subtitle: 'Earned value, planned vs actual progress, SPI/CPI and delay impact',
    accent: 'violet',
    icon: <Clock size={24} weight="duotone" />,
  },
  claimsDelay: {
    title: 'Contract Claims & Delay Analysis Studio',
    subtitle: 'EOT, liquidated damages, delay ownership and claim value checks',
    accent: 'amber',
    icon: <Calculator size={24} weight="duotone" />,
  },
  qaDocs: {
    title: 'Construction QA Document Studio',
    subtitle: 'ITP, pour card, cube register, inspection request and NCR readiness',
    accent: 'emerald',
    icon: <CheckCircle size={24} weight="duotone" />,
  },
  setout: {
    title: 'Site Survey Layout Setout Studio',
    subtitle: 'Coordinate setout, offsets, gridline marking and closure error checks',
    accent: 'emerald',
    icon: <Compass size={24} weight="duotone" />,
  },
  roadCrossSection: {
    title: 'Road Estimation & Cross-Section Studio',
    subtitle: 'Chainage-wise cut/fill, camber, shoulder and pavement layer quantities',
    accent: 'indigo',
    icon: <Path size={24} weight="duotone" />,
  },
  stormwater: {
    title: 'Drainage & Stormwater Network Studio',
    subtitle: 'Catchment runoff, pipe sizing, slope and manhole spacing checks',
    accent: 'teal',
    icon: <Drop size={24} weight="duotone" />,
  },
  drawingTakeoff: {
    title: 'Quantity Takeoff From Drawing Studio',
    subtitle: 'Drawing-scale walls, slab, openings and area/volume extraction',
    accent: 'sky',
    icon: <Blueprint size={24} weight="duotone" />,
  },
};

const accentClasses: Record<string, { text: string; bg: string; border: string; soft: string; fill: string; stroke: string }> = {
  rose: {
    text: 'text-rose-300',
    bg: 'bg-rose-500',
    border: 'border-rose-400/25',
    soft: 'bg-rose-500/10',
    fill: '#fb7185',
    stroke: '#f43f5e',
  },
  amber: {
    text: 'text-amber-300',
    bg: 'bg-amber-500',
    border: 'border-amber-400/25',
    soft: 'bg-amber-500/10',
    fill: '#fbbf24',
    stroke: '#f59e0b',
  },
  sky: {
    text: 'text-sky-300',
    bg: 'bg-sky-500',
    border: 'border-sky-400/25',
    soft: 'bg-sky-500/10',
    fill: '#38bdf8',
    stroke: '#0ea5e9',
  },
  emerald: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500',
    border: 'border-emerald-400/25',
    soft: 'bg-emerald-500/10',
    fill: '#34d399',
    stroke: '#10b981',
  },
  violet: {
    text: 'text-violet-300',
    bg: 'bg-violet-500',
    border: 'border-violet-400/25',
    soft: 'bg-violet-500/10',
    fill: '#a78bfa',
    stroke: '#8b5cf6',
  },
  indigo: {
    text: 'text-indigo-300',
    bg: 'bg-indigo-500',
    border: 'border-indigo-400/25',
    soft: 'bg-indigo-500/10',
    fill: '#818cf8',
    stroke: '#6366f1',
  },
  teal: {
    text: 'text-teal-300',
    bg: 'bg-teal-500',
    border: 'border-teal-400/25',
    soft: 'bg-teal-500/10',
    fill: '#2dd4bf',
    stroke: '#14b8a6',
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const safe = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const fmt = (value: number, digits = 2) => safe(value).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const fmtCompact = (value: number, digits = 1) => safe(value).toLocaleString('en-IN', { maximumFractionDigits: digits });

function svgPointer(event: React.PointerEvent, svg: SVGSVGElement | null) {
  const matrix = svg?.getScreenCTM();
  if (!svg || !matrix) return { x: 0, y: 0 };
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(matrix.inverse());
}

function DragKnob({ x, y, accent, label }: { x: number; y: number; accent: string; label?: string }) {
  return (
    <g className="pointer-events-none">
      <circle cx={x} cy={y} r="14" fill={accent} opacity="0.18" />
      <circle cx={x} cy={y} r="7" fill={accent} stroke="rgba(255,255,255,0.82)" strokeWidth="2" />
      {label && (
        <text x={x + 16} y={y - 12} fill={accent} fontSize="11" fontWeight="900">
          {label}
        </text>
      )}
    </g>
  );
}

export default function CivilEngineeringStudio({ tool, isFullScreen, onExitFullScreen, onRequestFullScreen }: CivilEngineeringStudioProps) {
  const meta = toolMeta[tool];
  const accent = accentClasses[meta.accent];

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#0B0C10] text-slate-200 font-sans overflow-hidden">
      <div className="shrink-0 border-b border-white/10 bg-[#101722]/95 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl ${accent.soft} ${accent.text} border ${accent.border} flex items-center justify-center shadow-lg shadow-black/20`}>
              {meta.icon}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">{meta.title}</h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
            <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-300">
            <StatusPill icon={<CheckCircle size={14} weight="duotone" />} label="Native" />
            <StatusPill icon={<Gauge size={14} weight="duotone" />} label="Live Solver" />
            <StatusPill icon={<HardHat size={14} weight="duotone" />} label="Lab Ready" />
            </div>
            {(onExitFullScreen || onRequestFullScreen) && (
              <button
                type="button"
                onClick={() => (isFullScreen ? onExitFullScreen?.() : onRequestFullScreen?.())}
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-slate-200"
              >
                {isFullScreen ? <CornersIn size={16} weight="bold" /> : <CornersOut size={16} weight="bold" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 pb-8 sm:p-5 sm:pb-8">
        {tool === 'structural' && <StructuralStudio accent={accent} />}
        {tool === 'geotech' && <GeotechStudio accent={accent} />}
        {tool === 'hydraulics' && <HydraulicsStudio accent={accent} />}
        {tool === 'survey' && <SurveyStudio accent={accent} />}
        {tool === 'cad' && <CadBimStudio accent={accent} />}
        {tool === 'transport' && <TransportStudio accent={accent} />}
        {tool === 'environment' && <EnvironmentalStudio accent={accent} />}
        {tool === 'concrete' && <ConcreteStudio accent={accent} />}
        {tool === 'estimation' && <EstimationStudio accent={accent} />}
        {tool === 'planning' && <PlanningStudio accent={accent} />}
        {tool === 'steel' && <SteelStudio accent={accent} />}
        {tool === 'retaining' && <RetainingWallStudio accent={accent} />}
        {tool === 'waterNetwork' && <WaterNetworkStudio accent={accent} />}
        {tool === 'openChannel' && <OpenChannelStudio accent={accent} />}
        {tool === 'pavement' && <PavementStudio accent={accent} />}
        {tool === 'leveling' && <LevelingStudio accent={accent} />}
        {tool === 'mixDesign' && <MixDesignStudio accent={accent} />}
        {tool === 'costEstimator' && <CostEstimatorStudio accent={accent} />}
        {isAdvancedCivilTool(tool) && <AdvancedCivilTool tool={tool} accent={accent} />}
      </div>
    </div>
  );
}

function StatusPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="text-slate-400">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-[#111827]/85 shadow-xl shadow-black/20 ${className}`}>
      {children}
    </section>
  );
}

function PanelHeader({ title, caption, icon, accent }: { title: string; caption?: string; icon?: React.ReactNode; accent: typeof accentClasses[string] }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div className="flex items-start gap-3">
        {icon && <div className={`${accent.soft} ${accent.text} border ${accent.border} rounded-xl p-2`}>{icon}</div>}
        <div>
          <h3 className="text-sm font-black text-white tracking-wide">{title}</h3>
          {caption && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{caption}</p>}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full rounded-xl border border-white/10 bg-[#0B1018] px-3 py-2.5 pr-16 text-sm font-bold text-white outline-none transition [appearance:textfield] focus:border-cyan-400/70 focus:ring-0 focus:!outline-none focus-visible:!outline-none focus-visible:!outline-offset-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black uppercase text-slate-500">{unit}</span>}
      </div>
    </label>
  );
}

function Metric({ label, value, unit, tone = 'slate' }: { label: string; value: string | number; unit?: string; tone?: 'slate' | 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-white';
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-2 flex items-baseline gap-1 text-2xl font-black tabular-nums ${toneClass}`}>
        {value}
        {unit && <span className="text-xs font-black text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

function MiniChart({ points, label, color = '#38bdf8', unit = '' }: { points: Point[]; label: string; color?: string; unit?: string }) {
  const width = 640;
  const height = 190;
  const pad = 24;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 0);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const toX = (x: number) => pad + ((x - minX) / rangeX) * (width - pad * 2);
  const toY = (y: number) => height - pad - ((y - minY) / rangeY) * (height - pad * 2);
  const path = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${toX(p.x).toFixed(2)} ${toY(p.y).toFixed(2)}`).join(' ');
  const zeroY = toY(0);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#080D14] p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-black uppercase tracking-[0.12em] text-slate-400">{label}</span>
        <span className="font-bold text-slate-500">
          max {fmt(Math.max(...ys.map((y) => Math.abs(y))), 2)} {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full overflow-visible">
        <defs>
          <linearGradient id={`fill-${label.replace(/\W/g, '')}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((tick) => (
          <line key={tick} x1={pad} x2={width - pad} y1={pad + tick * ((height - pad * 2) / 4)} y2={pad + tick * ((height - pad * 2) / 4)} stroke="rgba(148,163,184,0.12)" />
        ))}
        <line x1={pad} x2={width - pad} y1={zeroY} y2={zeroY} stroke="rgba(148,163,184,0.35)" strokeDasharray="5 6" />
        <path d={`${path} L ${width - pad} ${zeroY} L ${pad} ${zeroY} Z`} fill={`url(#fill-${label.replace(/\W/g, '')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function StructuralStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [beam, setBeam] = useState({
    span: 6,
    udl: 8,
    pointLoad: 30,
    pointPosition: 3.8,
    elasticModulus: 200,
    inertia: 85_000_000,
    deflectionLimit: 250,
  });

  const results = useMemo(() => {
    const Lm = Math.max(beam.span, 0.5);
    const L = Lm * 1000;
    const pointPosition = clamp(beam.pointPosition, 0.05, Lm - 0.05);
    const a = pointPosition * 1000;
    const b = L - a;
    const wKnM = Math.max(beam.udl, 0);
    const pKn = Math.max(beam.pointLoad, 0);
    const totalUdl = wKnM * Lm;
    const rb = (totalUdl * (Lm / 2) + pKn * pointPosition) / Lm;
    const ra = totalUdl + pKn - rb;
    const E = Math.max(beam.elasticModulus, 1) * 1000;
    const I = Math.max(beam.inertia, 1);
    const w = wKnM;
    const P = pKn * 1000;
    const points = Array.from({ length: 101 }, (_, index) => {
      const x = (Lm * index) / 100;
      const xmm = x * 1000;
      const shear = ra - wKnM * x - (x >= pointPosition ? pKn : 0);
      const moment = ra * x - (wKnM * x * x) / 2 - (x >= pointPosition ? pKn * (x - pointPosition) : 0);
      const udlDef = (w * xmm * (Math.pow(L, 3) - 2 * L * Math.pow(xmm, 2) + Math.pow(xmm, 3))) / (24 * E * I);
      const pointDef =
        xmm <= a
          ? (P * b * xmm * (Math.pow(L, 2) - Math.pow(b, 2) - Math.pow(xmm, 2))) / (6 * L * E * I)
          : (P * a * (L - xmm) * (Math.pow(L, 2) - Math.pow(a, 2) - Math.pow(L - xmm, 2))) / (6 * L * E * I);
      return { x, shear, moment, deflection: udlDef + pointDef };
    });
    const maxMoment = Math.max(...points.map((p) => Math.abs(p.moment)));
    const maxShear = Math.max(Math.abs(ra), Math.abs(rb), ...points.map((p) => Math.abs(p.shear)));
    const maxDeflection = Math.max(...points.map((p) => Math.abs(p.deflection)));
    const allowableDeflection = L / Math.max(beam.deflectionLimit, 1);

    return {
      ra,
      rb,
      totalLoad: totalUdl + pKn,
      points,
      maxMoment,
      maxShear,
      maxDeflection,
      allowableDeflection,
      deflectionOk: maxDeflection <= allowableDeflection,
    };
  }, [beam]);

  const update = (field: keyof typeof beam, value: number) => setBeam((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel>
        <PanelHeader title="Load Model" caption="Simply supported beam with full UDL and one movable point load." icon={<Blueprint size={18} weight="duotone" />} accent={accent} />
        <div className="grid gap-4 p-4">
          <Field label="Span" value={beam.span} unit="m" min={0.5} step={0.1} onChange={(v) => update('span', v)} />
          <Field label="UDL" value={beam.udl} unit="kN/m" min={0} step={0.5} onChange={(v) => update('udl', v)} />
          <Field label="Point load" value={beam.pointLoad} unit="kN" min={0} step={1} onChange={(v) => update('pointLoad', v)} />
          <Field label="Point position from left" value={beam.pointPosition} unit="m" min={0.1} max={beam.span - 0.1} step={0.1} onChange={(v) => update('pointPosition', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="E" value={beam.elasticModulus} unit="GPa" min={1} step={1} onChange={(v) => update('elasticModulus', v)} />
            <Field label="I" value={beam.inertia} unit="mm4" min={1} step={1000000} onChange={(v) => update('inertia', v)} />
          </div>
          <Field label="Deflection limit" value={beam.deflectionLimit} unit="L/x" min={100} step={10} onChange={(v) => update('deflectionLimit', v)} />
        </div>
      </Panel>

      <div className="grid gap-4">
        <Panel className="p-4">
          <BeamGraphic
            span={beam.span}
            pointPosition={clamp(beam.pointPosition, 0.05, beam.span - 0.05)}
            accent={accent.stroke}
            onPointPositionChange={(value) => update('pointPosition', value)}
          />
        </Panel>
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Reaction A" value={fmt(results.ra, 2)} unit="kN" />
          <Metric label="Reaction B" value={fmt(results.rb, 2)} unit="kN" />
          <Metric label="Max moment" value={fmt(results.maxMoment, 2)} unit="kN-m" />
          <Metric label="Deflection" value={fmt(results.maxDeflection, 2)} unit="mm" tone={results.deflectionOk ? 'good' : 'warn'} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <MiniChart label="Shear Force" unit="kN" color="#38bdf8" points={results.points.map((p) => ({ x: p.x, y: p.shear }))} />
          <MiniChart label="Bending Moment" unit="kN-m" color="#fb7185" points={results.points.map((p) => ({ x: p.x, y: p.moment }))} />
          <MiniChart label="Deflection" unit="mm" color="#a78bfa" points={results.points.map((p) => ({ x: p.x, y: -p.deflection }))} />
        </div>
        <Insight
          ok={results.deflectionOk}
          title={results.deflectionOk ? 'Serviceability check passed' : 'Deflection limit exceeded'}
          body={`Allowable deflection is ${fmt(results.allowableDeflection, 2)} mm. Total applied load is ${fmt(results.totalLoad, 2)} kN. This gives students immediate feedback instead of only a raw answer.`}
        />
      </div>
    </div>
  );
}

function BeamGraphic({
  span,
  pointPosition,
  accent,
  onPointPositionChange,
}: {
  span: number;
  pointPosition: number;
  accent: string;
  onPointPositionChange: (value: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pointX = 80 + (pointPosition / span) * 520;

  const positionFromPointer = (event: React.PointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return pointPosition;

    const pointer = svg.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const { x: svgX } = pointer.matrixTransform(matrix.inverse());
    const next = ((clamp(svgX, 80, 600) - 80) / 520) * span;
    return Number(clamp(next, 0.05, span - 0.05).toFixed(2));
  };

  const movePointLoad = (event: React.PointerEvent<SVGElement>) => {
    onPointPositionChange(positionFromPointer(event));
  };

  const startDrag = (event: React.PointerEvent<SVGElement>) => {
    event.preventDefault();
    setIsDragging(true);
    svgRef.current?.setPointerCapture(event.pointerId);
    movePointLoad(event);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) movePointLoad(event);
  };

  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 680 220"
      className={`h-52 w-full select-none ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onPointerLeave={(event) => {
        if (isDragging) stopDrag(event);
      }}
    >
      <defs>
        <marker id="arrow-load" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={accent} />
        </marker>
      </defs>
      <rect x="18" y="18" width="644" height="184" rx="22" fill="rgba(15,23,42,0.82)" stroke="rgba(148,163,184,0.18)" />
      <rect x="72" y="104" width="536" height="48" fill="transparent" className="cursor-crosshair" onPointerDown={startDrag} />
      <line x1="80" y1="128" x2="600" y2="128" stroke="rgba(226,232,240,0.9)" strokeWidth="8" strokeLinecap="round" />
      {Array.from({ length: 9 }, (_, index) => {
        const x = 80 + index * 65;
        return <line key={x} x1={x} y1="48" x2={x} y2="98" stroke={accent} strokeWidth="2" markerEnd="url(#arrow-load)" opacity="0.55" />;
      })}
      <g className={isDragging ? 'cursor-grabbing' : 'cursor-grab'} onPointerDown={startDrag}>
        <line x1={pointX} y1="38" x2={pointX} y2="102" stroke={accent} strokeWidth={isDragging ? '7' : '5'} markerEnd="url(#arrow-load)" />
        <circle cx={pointX} cy="38" r={isDragging ? '10' : '7'} fill={accent} opacity="0.85" />
        <circle cx={pointX} cy="70" r="34" fill="transparent" />
      </g>
      <path d="M80 132 L55 172 L105 172 Z" fill="rgba(148,163,184,0.16)" stroke="rgba(226,232,240,0.8)" strokeWidth="2" />
      <path d="M600 132 L575 172 L625 172 Z" fill="rgba(148,163,184,0.16)" stroke="rgba(226,232,240,0.8)" strokeWidth="2" />
      <line x1="80" y1="190" x2="600" y2="190" stroke="rgba(148,163,184,0.3)" strokeWidth="2" />
      <line x1={pointX} y1="128" x2={pointX} y2="190" stroke={accent} strokeWidth="2" strokeDasharray="5 6" opacity="0.65" />
      <text x={pointX} y="184" textAnchor="middle" fill={accent} fontSize="11" fontWeight="900">
        {fmt(pointPosition, 2)} m
      </text>
      <text x="340" y="210" textAnchor="middle" fill="rgba(203,213,225,0.78)" fontSize="13" fontWeight="700">
        Span {fmt(span, 2)} m
      </text>
      <text x={pointX} y="30" textAnchor="middle" fill={accent} fontSize="12" fontWeight="800">
        Point load
      </text>
    </svg>
  );
}

function GeotechStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [soil, setSoil] = useState({
    width: 2,
    length: 2.5,
    depth: 1.5,
    cohesion: 25,
    friction: 28,
    unitWeight: 18,
    safetyFactor: 3,
    serviceLoad: 550,
  });

  const results = useMemo(() => {
    const phi = clamp(soil.friction, 0, 45) * (Math.PI / 180);
    const tanPhi = Math.tan(phi);
    const nq = soil.friction < 0.1 ? 1 : Math.exp(Math.PI * tanPhi) * Math.pow(Math.tan(Math.PI / 4 + phi / 2), 2);
    const nc = soil.friction < 0.1 ? 5.7 : (nq - 1) / tanPhi;
    const ngamma = soil.friction < 0.1 ? 0 : 2 * (nq + 1) * tanPhi;
    const q = soil.unitWeight * soil.depth;
    const qult = soil.cohesion * nc + q * nq + 0.5 * soil.unitWeight * soil.width * ngamma;
    const qnet = qult - q;
    const qall = qnet / Math.max(soil.safetyFactor, 1);
    const area = soil.width * soil.length;
    const servicePressure = soil.serviceLoad / Math.max(area, 0.01);
    const utilization = (servicePressure / Math.max(qall, 0.01)) * 100;
    return { nq, nc, ngamma, q, qult, qnet, qall, area, servicePressure, utilization, ok: utilization <= 100 };
  }, [soil]);

  const update = (field: keyof typeof soil, value: number) => setSoil((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel>
        <PanelHeader title="Foundation Inputs" caption="Shallow footing capacity using classical Terzaghi factors." icon={<Stack size={18} weight="duotone" />} accent={accent} />
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width B" value={soil.width} unit="m" min={0.3} step={0.1} onChange={(v) => update('width', v)} />
            <Field label="Length L" value={soil.length} unit="m" min={0.3} step={0.1} onChange={(v) => update('length', v)} />
          </div>
          <Field label="Foundation depth" value={soil.depth} unit="m" min={0.1} step={0.1} onChange={(v) => update('depth', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cohesion" value={soil.cohesion} unit="kPa" min={0} step={1} onChange={(v) => update('cohesion', v)} />
            <Field label="Phi" value={soil.friction} unit="deg" min={0} max={45} step={1} onChange={(v) => update('friction', v)} />
          </div>
          <Field label="Unit weight" value={soil.unitWeight} unit="kN/m3" min={5} step={0.5} onChange={(v) => update('unitWeight', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="FOS" value={soil.safetyFactor} min={1} step={0.1} onChange={(v) => update('safetyFactor', v)} />
            <Field label="Service load" value={soil.serviceLoad} unit="kN" min={1} step={10} onChange={(v) => update('serviceLoad', v)} />
          </div>
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Safe capacity" value={fmt(results.qall, 1)} unit="kPa" tone={results.ok ? 'good' : 'warn'} />
          <Metric label="Service pressure" value={fmt(results.servicePressure, 1)} unit="kPa" />
          <Metric label="Utilization" value={fmt(results.utilization, 1)} unit="%" tone={results.ok ? 'good' : 'warn'} />
          <Metric label="Footing area" value={fmt(results.area, 2)} unit="m2" />
        </div>
        <Panel className="p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <FoundationSketch
                width={soil.width}
                depth={soil.depth}
                pressure={results.servicePressure}
                capacity={results.qall}
                accent={accent.stroke}
                onChange={(next) => setSoil((prev) => ({ ...prev, ...next }))}
              />
            <div className="space-y-3">
              <ResultLine label="Nc" value={fmt(results.nc, 2)} />
              <ResultLine label="Nq" value={fmt(results.nq, 2)} />
              <ResultLine label="Ngamma" value={fmt(results.ngamma, 2)} />
              <ResultLine label="Ultimate capacity" value={`${fmt(results.qult, 1)} kPa`} />
              <ResultLine label="Net capacity" value={`${fmt(results.qnet, 1)} kPa`} />
            </div>
          </div>
        </Panel>
        <Insight
          ok={results.ok}
          title={results.ok ? 'Bearing pressure is within safe range' : 'Increase footing area or improve soil'}
          body="This native check is useful during design tutorials because it shows factor values, service pressure, utilization and the physical pressure block in one screen."
        />
      </div>
    </div>
  );
}

function FoundationSketch({
  width,
  depth,
  pressure,
  capacity,
  accent,
  onChange,
}: {
  width: number;
  depth: number;
  pressure: number;
  capacity: number;
  accent: string;
  onChange?: (next: Partial<{ width: number; depth: number }>) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<'width' | 'depth' | null>(null);
  const ratio = clamp(pressure / Math.max(capacity, 1), 0, 1.3);
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag || !onChange) return;
    const point = svgPointer(event, svgRef.current);
    if (drag === 'width') onChange({ width: Number(clamp(((point.x - 310) / 230) * 6, 0.5, 8).toFixed(2)) });
    if (drag === 'depth') onChange({ depth: Number(clamp(((168 - point.y) / 86) * 4, 0.2, 4).toFixed(2)) });
  };
  const startDrag = (kind: 'width' | 'depth') => (event: React.PointerEvent<SVGElement>) => {
    setDrag(kind);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDrag(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };
  const widthHandleX = 310 + (clamp(width, 0.5, 8) / 6) * 230;
  const depthHandleY = 168 - (clamp(depth, 0.2, 4) / 4) * 86;
  return (
    <svg ref={svgRef} viewBox="0 0 620 280" className="min-h-64 w-full touch-none" onPointerMove={handleMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <rect x="20" y="20" width="580" height="240" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <rect x="80" y="168" width="460" height="44" rx="8" fill="rgba(148,163,184,0.18)" stroke="rgba(226,232,240,0.55)" strokeWidth="2" />
      <rect x="205" y="82" width="210" height="86" rx="8" fill="rgba(148,163,184,0.12)" stroke="rgba(226,232,240,0.48)" />
      <path d="M80 222 C160 206 210 242 310 222 C420 202 470 240 540 222 L540 248 L80 248 Z" fill="rgba(217,119,6,0.22)" />
      <rect x="80" y={218 - ratio * 72} width="460" height={ratio * 72} rx="10" fill={accent} opacity="0.22" />
      <line x1="80" y1="236" x2="540" y2="236" stroke={accent} strokeWidth="3" strokeDasharray="8 8" />
      <line x1="310" y1="188" x2={widthHandleX} y2="188" stroke={accent} strokeWidth="4" opacity="0.35" />
      <line x1="426" y1="168" x2="426" y2={depthHandleY} stroke={accent} strokeWidth="4" opacity="0.35" />
      <circle cx={widthHandleX} cy="188" r="22" fill="transparent" className="cursor-ew-resize" onPointerDown={startDrag('width')} />
      <DragKnob x={widthHandleX} y={188} accent={accent} label="B" />
      <circle cx="426" cy={depthHandleY} r="22" fill="transparent" className="cursor-ns-resize" onPointerDown={startDrag('depth')} />
      <DragKnob x={426} y={depthHandleY} accent={accent} label="Df" />
      <text x="310" y="54" fill="rgba(226,232,240,0.85)" fontSize="14" fontWeight="800" textAnchor="middle">
        Footing width {fmt(width, 2)} m - embedment {fmt(depth, 2)} m
      </text>
      <text x="310" y="270" fill={accent} fontSize="13" fontWeight="800" textAnchor="middle">
        q/service to q/allow = {fmt(ratio * 100, 1)}%
      </text>
    </svg>
  );
}

function HydraulicsStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [pipe, setPipe] = useState({
    length: 350,
    diameter: 180,
    flow: 42,
    roughness: 0.15,
    minorK: 4,
    staticHead: 18,
    efficiency: 72,
    channelWidth: 2.4,
    channelDepth: 0.8,
    channelSlope: 0.0015,
    manningN: 0.015,
  });

  const results = useMemo(() => {
    const g = 9.81;
    const Q = Math.max(pipe.flow, 0) / 1000;
    const D = Math.max(pipe.diameter, 1) / 1000;
    const area = (Math.PI * D * D) / 4;
    const velocity = Q / Math.max(area, 0.00001);
    const re = (velocity * D) / 0.000001;
    const eps = Math.max(pipe.roughness, 0.001) / 1000;
    const f = re <= 2300 ? 64 / Math.max(re, 1) : 0.25 / Math.pow(Math.log10(eps / (3.7 * D) + 5.74 / Math.pow(Math.max(re, 1), 0.9)), 2);
    const frictionHead = f * (Math.max(pipe.length, 0) / D) * ((velocity * velocity) / (2 * g));
    const minorHead = Math.max(pipe.minorK, 0) * ((velocity * velocity) / (2 * g));
    const totalHead = frictionHead + minorHead + Math.max(pipe.staticHead, 0);
    const pumpPower = (1000 * g * Q * totalHead) / Math.max(pipe.efficiency / 100, 0.01) / 1000;
    const b = Math.max(pipe.channelWidth, 0.01);
    const y = Math.max(pipe.channelDepth, 0.01);
    const channelArea = b * y;
    const wettedPerimeter = b + 2 * y;
    const hydraulicRadius = channelArea / wettedPerimeter;
    const manningQ = (1 / Math.max(pipe.manningN, 0.001)) * channelArea * Math.pow(hydraulicRadius, 2 / 3) * Math.sqrt(Math.max(pipe.channelSlope, 0));
    return { Q, area, velocity, re, f, frictionHead, minorHead, totalHead, pumpPower, manningQ, channelArea, hydraulicRadius };
  }, [pipe]);

  const update = (field: keyof typeof pipe, value: number) => setPipe((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel>
        <PanelHeader title="Hydraulic Inputs" caption="Pipe flow and channel flow are calculated together for fast comparison." icon={<Drop size={18} weight="duotone" />} accent={accent} />
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pipe length" value={pipe.length} unit="m" min={1} step={5} onChange={(v) => update('length', v)} />
            <Field label="Diameter" value={pipe.diameter} unit="mm" min={10} step={5} onChange={(v) => update('diameter', v)} />
          </div>
          <Field label="Flow" value={pipe.flow} unit="L/s" min={0} step={1} onChange={(v) => update('flow', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Roughness" value={pipe.roughness} unit="mm" min={0.001} step={0.01} onChange={(v) => update('roughness', v)} />
            <Field label="Minor K" value={pipe.minorK} min={0} step={0.5} onChange={(v) => update('minorK', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Static head" value={pipe.staticHead} unit="m" min={0} step={1} onChange={(v) => update('staticHead', v)} />
            <Field label="Pump eff." value={pipe.efficiency} unit="%" min={1} max={100} step={1} onChange={(v) => update('efficiency', v)} />
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Open channel</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Width" value={pipe.channelWidth} unit="m" min={0.1} step={0.1} onChange={(v) => update('channelWidth', v)} />
              <Field label="Depth" value={pipe.channelDepth} unit="m" min={0.1} step={0.1} onChange={(v) => update('channelDepth', v)} />
              <Field label="Slope" value={pipe.channelSlope} min={0.0001} step={0.0001} onChange={(v) => update('channelSlope', v)} />
              <Field label="Manning n" value={pipe.manningN} min={0.01} step={0.001} onChange={(v) => update('manningN', v)} />
            </div>
          </div>
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Velocity" value={fmt(results.velocity, 2)} unit="m/s" tone={results.velocity < 3 ? 'good' : 'warn'} />
          <Metric label="Total head" value={fmt(results.totalHead, 2)} unit="m" />
          <Metric label="Pump power" value={fmt(results.pumpPower, 2)} unit="kW" />
          <Metric label="Manning flow" value={fmt(results.manningQ * 1000, 1)} unit="L/s" />
        </div>
        <Panel className="p-4">
          <HydraulicGraphic
            velocity={results.velocity}
            totalHead={results.totalHead}
            flow={pipe.flow}
            channelDepth={pipe.channelDepth}
            accent={accent.stroke}
            onChange={(next) => setPipe((prev) => ({ ...prev, ...next }))}
          />
        </Panel>
        <div className="grid gap-3 md:grid-cols-2">
          <Panel className="p-4">
            <ResultLine label="Reynolds number" value={fmtCompact(results.re, 0)} />
            <ResultLine label="Friction factor" value={fmt(results.f, 4)} />
            <ResultLine label="Friction head" value={`${fmt(results.frictionHead, 2)} m`} />
            <ResultLine label="Minor head" value={`${fmt(results.minorHead, 2)} m`} />
          </Panel>
          <Insight
            ok={results.velocity <= 3}
            title={results.velocity <= 3 ? 'Velocity is practical for teaching design' : 'Pipe velocity is high'}
            body="Students can see how changing diameter affects velocity, Reynolds number, friction losses and pump sizing instantly."
          />
        </div>
      </div>
    </div>
  );
}

function HydraulicGraphic({
  velocity,
  totalHead,
  flow,
  channelDepth,
  accent,
  onChange,
}: {
  velocity: number;
  totalHead: number;
  flow: number;
  channelDepth: number;
  accent: string;
  onChange?: (next: Partial<{ flow: number; channelDepth: number }>) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<'flow' | 'depth' | null>(null);
  const wave = Array.from({ length: 44 }, (_, index) => {
    const x = 60 + index * 12;
    const y = 164 + Math.sin(index / 1.8) * 8;
    return `${x},${y}`;
  }).join(' ');
  const flowX = 64 + (clamp(flow, 0, 120) / 120) * 462;
  const depthY = 216 - (clamp(channelDepth, 0.1, 2.5) / 2.5) * 44;
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag || !onChange) return;
    const point = svgPointer(event, svgRef.current);
    if (drag === 'flow') onChange({ flow: Math.round(clamp(((point.x - 64) / 462) * 120, 0, 120)) });
    if (drag === 'depth') onChange({ channelDepth: Number(clamp(((216 - point.y) / 44) * 2.5, 0.1, 2.5).toFixed(2)) });
  };
  const startDrag = (kind: 'flow' | 'depth') => (event: React.PointerEvent<SVGElement>) => {
    setDrag(kind);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDrag(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };
  return (
    <svg ref={svgRef} viewBox="0 0 640 260" className="h-64 w-full touch-none" onPointerMove={handleMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <rect x="20" y="20" width="600" height="220" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <path d="M64 104 H526" stroke="rgba(226,232,240,0.7)" strokeWidth="28" strokeLinecap="round" />
      <path d="M64 104 H526" stroke={accent} strokeWidth="14" strokeLinecap="round" opacity="0.45" />
      <circle cx="524" cy="104" r="34" fill="rgba(15,23,42,1)" stroke={accent} strokeWidth="4" />
      <path d="M524 74 A30 30 0 1 1 524 134 A30 30 0 1 1 524 74" fill="none" stroke="rgba(226,232,240,0.22)" strokeWidth="6" strokeDasharray="16 10" />
      <polyline points={wave} fill="none" stroke={accent} strokeWidth="3" opacity="0.75" />
      <rect x="58" y="172" width="470" height="44" rx="8" fill={accent} opacity="0.16" />
      <line x1="58" y1="172" x2="528" y2="172" stroke={accent} strokeWidth="3" opacity="0.72" />
      <circle cx={flowX} cy="104" r="22" fill="transparent" className="cursor-ew-resize" onPointerDown={startDrag('flow')} />
      <DragKnob x={flowX} y={104} accent={accent} label="Q" />
      <circle cx="546" cy={depthY} r="22" fill="transparent" className="cursor-ns-resize" onPointerDown={startDrag('depth')} />
      <DragKnob x={546} y={depthY} accent={accent} label="y" />
      <text x="72" y="70" fill="rgba(226,232,240,0.86)" fontSize="13" fontWeight="800">
        Pipe flow {fmt(flow, 1)} L/s - velocity {fmt(velocity, 2)} m/s
      </text>
      <text x="72" y="236" fill="rgba(203,213,225,0.72)" fontSize="12" fontWeight="700">
        Channel depth {fmt(channelDepth, 2)} m
      </text>
      <text x="478" y="54" fill={accent} fontSize="13" fontWeight="900">
        Head {fmt(totalHead, 1)} m
      </text>
    </svg>
  );
}

type TraverseLeg = {
  id: string;
  length: number;
  bearing: number;
};

function SurveyStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [legs, setLegs] = useState<TraverseLeg[]>([
    { id: 'AB', length: 125, bearing: 38 },
    { id: 'BC', length: 92, bearing: 121 },
    { id: 'CD', length: 138, bearing: 205 },
    { id: 'DE', length: 104, bearing: 286 },
    { id: 'EA', length: 78, bearing: 330 },
  ]);

  const results = useMemo(() => {
    const raw = legs.map((leg) => {
      const theta = leg.bearing * (Math.PI / 180);
      return {
        ...leg,
        lat: leg.length * Math.cos(theta),
        dep: leg.length * Math.sin(theta),
      };
    });
    const sumLat = raw.reduce((sum, leg) => sum + leg.lat, 0);
    const sumDep = raw.reduce((sum, leg) => sum + leg.dep, 0);
    const perimeter = raw.reduce((sum, leg) => sum + leg.length, 0);
    const closure = Math.hypot(sumLat, sumDep);
    const corrected = raw.map((leg) => ({
      ...leg,
      cLat: leg.lat - (sumLat * leg.length) / Math.max(perimeter, 0.01),
      cDep: leg.dep - (sumDep * leg.length) / Math.max(perimeter, 0.01),
    }));
    const coordinates = [{ label: 'A', x: 0, y: 0 }];
    corrected.forEach((leg, index) => {
      const previous = coordinates[coordinates.length - 1];
      coordinates.push({
        label: index === corrected.length - 1 ? 'A close' : String.fromCharCode(66 + index),
        x: previous.x + leg.cDep,
        y: previous.y + leg.cLat,
      });
    });
    const area = Math.abs(
      coordinates.slice(0, -1).reduce((sum, current, index, list) => {
        const next = list[(index + 1) % list.length];
        return sum + current.x * next.y - next.x * current.y;
      }, 0) / 2
    );
    return { raw, corrected, sumLat, sumDep, perimeter, closure, precision: perimeter / Math.max(closure, 0.0001), coordinates, area };
  }, [legs]);

  const updateLeg = (index: number, field: keyof TraverseLeg, value: number | string) => {
    setLegs((prev) => prev.map((leg, legIndex) => (legIndex === index ? { ...leg, [field]: value } : leg)));
  };

  const addLeg = () => {
    setLegs((prev) => [...prev, { id: `${String.fromCharCode(65 + prev.length)}${String.fromCharCode(66 + prev.length)}`, length: 75, bearing: 45 }]);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[460px_1fr]">
      <Panel>
        <PanelHeader title="Traverse Observations" caption="Enter whole-circle bearings. Corrections are distributed by Bowditch rule." icon={<Compass size={18} weight="duotone" />} accent={accent} />
        <div className="p-4">
          <div className="space-y-2">
            {legs.map((leg, index) => (
              <div key={`${leg.id}-${index}`} className="grid grid-cols-[72px_1fr_1fr_34px] items-start gap-2">
                <input
                  value={leg.id}
                  onChange={(event) => updateLeg(index, 'id', event.target.value)}
                  aria-label={`Traverse line ${index + 1}`}
                  className="mt-[25px] h-[42px] w-full rounded-xl border border-white/10 bg-[#0B1018] px-3 text-sm font-black text-white outline-none transition focus:border-emerald-400/70 focus:!outline-none focus-visible:!outline-none focus-visible:!outline-offset-0"
                />
                <Field label="Length" value={leg.length} unit="m" min={0} step={1} onChange={(v) => updateLeg(index, 'length', v)} />
                <Field label="Bearing" value={leg.bearing} unit="deg" min={0} max={360} step={1} onChange={(v) => updateLeg(index, 'bearing', v)} />
                <button
                  type="button"
                  onClick={() => setLegs((prev) => prev.filter((_, legIndex) => legIndex !== index))}
                  className="mt-5 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-rose-300"
                >
                  <Trash size={16} className="mx-auto" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLeg} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl ${accent.bg} px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-black/20`}>
            <Plus size={16} weight="bold" />
            Add traverse leg
          </button>
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Closure error" value={fmt(results.closure, 3)} unit="m" tone={results.precision > 5000 ? 'good' : 'warn'} />
          <Metric label="Precision" value={`1:${fmtCompact(results.precision, 0)}`} />
          <Metric label="Perimeter" value={fmt(results.perimeter, 2)} unit="m" />
          <Metric label="Area" value={fmt(results.area, 2)} unit="m2" />
        </div>
        <Panel className="p-4">
          <TraversePlot
            coordinates={results.coordinates}
            accent={accent.stroke}
            onMovePoint={(index, x, y) => {
              if (index <= 0 || index >= legs.length) return;
              const previous = results.coordinates[index - 1];
              const dep = x - previous.x;
              const lat = y - previous.y;
              const bearing = (Math.atan2(dep, lat) * 180) / Math.PI;
              updateLeg(index - 1, 'length', Number(Math.hypot(lat, dep).toFixed(1)));
              updateLeg(index - 1, 'bearing', Number(((bearing + 360) % 360).toFixed(0)));
            }}
          />
        </Panel>
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Line</th>
                  <th className="px-4 py-3">Latitude</th>
                  <th className="px-4 py-3">Departure</th>
                  <th className="px-4 py-3">Corrected lat.</th>
                  <th className="px-4 py-3">Corrected dep.</th>
                </tr>
              </thead>
              <tbody>
                {results.corrected.map((leg) => (
                  <tr key={leg.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-black text-white">{leg.id}</td>
                    <td className="px-4 py-3 text-slate-300">{fmt(leg.lat, 3)}</td>
                    <td className="px-4 py-3 text-slate-300">{fmt(leg.dep, 3)}</td>
                    <td className="px-4 py-3 text-emerald-300">{fmt(leg.cLat, 3)}</td>
                    <td className="px-4 py-3 text-emerald-300">{fmt(leg.cDep, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TraversePlot({
  coordinates,
  accent,
  onMovePoint,
}: {
  coordinates: Array<{ label: string; x: number; y: number }>;
  accent: string;
  onMovePoint?: (index: number, x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const width = 640;
  const height = 360;
  const pad = 44;
  const xs = coordinates.map((p) => p.x);
  const ys = coordinates.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY) * 0.9;
  const toX = (x: number) => width / 2 + (x - (minX + maxX) / 2) * scale;
  const toY = (y: number) => height / 2 - (y - (minY + maxY) / 2) * scale;
  const fromX = (x: number) => (x - width / 2) / scale + (minX + maxX) / 2;
  const fromY = (y: number) => (height / 2 - y) / scale + (minY + maxY) / 2;
  const points = coordinates.map((p) => `${toX(p.x)},${toY(p.y)}`).join(' ');
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragIndex === null || !onMovePoint) return;
    const point = svgPointer(event, svgRef.current);
    onMovePoint(dragIndex, fromX(point.x), fromY(point.y));
  };
  const startDrag = (index: number) => (event: React.PointerEvent<SVGElement>) => {
    if (index <= 0 || index >= coordinates.length - 1) return;
    setDragIndex(index);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragIndex(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };
  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="h-80 w-full touch-none" onPointerMove={handleMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <rect x="10" y="10" width={width - 20} height={height - 20} rx="22" fill="rgba(8,13,20,0.94)" stroke="rgba(148,163,184,0.16)" />
      {Array.from({ length: 8 }, (_, index) => (
        <React.Fragment key={index}>
          <line x1={pad + index * 75} x2={pad + index * 75} y1="34" y2={height - 34} stroke="rgba(148,163,184,0.08)" />
          <line x1="34" x2={width - 34} y1={pad + index * 38} y2={pad + index * 38} stroke="rgba(148,163,184,0.08)" />
        </React.Fragment>
      ))}
      <polyline points={points} fill="rgba(16,185,129,0.12)" stroke={accent} strokeWidth="3" strokeLinejoin="round" />
      {coordinates.map((p, index) => (
        <g key={`${p.label}-${index}`}>
          {index > 0 && index < coordinates.length - 1 && (
            <circle cx={toX(p.x)} cy={toY(p.y)} r="20" fill="transparent" className="cursor-grab active:cursor-grabbing" onPointerDown={startDrag(index)} />
          )}
          <circle cx={toX(p.x)} cy={toY(p.y)} r={index > 0 && index < coordinates.length - 1 ? 8 : 6} fill={accent} stroke={index > 0 && index < coordinates.length - 1 ? 'rgba(255,255,255,0.82)' : 'none'} strokeWidth="2" />
          <text x={toX(p.x) + 10} y={toY(p.y) - 8} fill="rgba(226,232,240,0.84)" fontSize="12" fontWeight="800">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function CadBimStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [model, setModel] = useState({
    baysX: 4,
    baysY: 3,
    bayWidth: 5,
    bayDepth: 4,
    floors: 3,
    slabThickness: 150,
    beamWidth: 230,
    beamDepth: 450,
    columnSize: 450,
  });

  const results = useMemo(() => {
    const totalWidth = model.baysX * model.bayWidth;
    const totalDepth = model.baysY * model.bayDepth;
    const floorArea = totalWidth * totalDepth;
    const columns = (model.baysX + 1) * (model.baysY + 1);
    const slabVolume = floorArea * (model.slabThickness / 1000) * model.floors;
    const beamLengthPerFloor = (model.baysY + 1) * totalWidth + (model.baysX + 1) * totalDepth;
    const beamVolume = beamLengthPerFloor * (model.beamWidth / 1000) * (model.beamDepth / 1000) * model.floors;
    const columnVolume = columns * Math.pow(model.columnSize / 1000, 2) * 3.2 * model.floors;
    return { totalWidth, totalDepth, floorArea, builtup: floorArea * model.floors, columns, slabVolume, beamVolume, columnVolume, concrete: slabVolume + beamVolume + columnVolume };
  }, [model]);

  const update = (field: keyof typeof model, value: number) => setModel((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel>
        <PanelHeader title="Grid Model" caption="A native schematic model for teaching structural grids and early BIM quantities." icon={<Cube size={18} weight="duotone" />} accent={accent} />
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bays X" value={model.baysX} min={1} step={1} onChange={(v) => update('baysX', Math.round(v))} />
            <Field label="Bays Y" value={model.baysY} min={1} step={1} onChange={(v) => update('baysY', Math.round(v))} />
            <Field label="Bay width" value={model.bayWidth} unit="m" min={1} step={0.5} onChange={(v) => update('bayWidth', v)} />
            <Field label="Bay depth" value={model.bayDepth} unit="m" min={1} step={0.5} onChange={(v) => update('bayDepth', v)} />
            <Field label="Floors" value={model.floors} min={1} step={1} onChange={(v) => update('floors', Math.round(v))} />
            <Field label="Slab" value={model.slabThickness} unit="mm" min={80} step={10} onChange={(v) => update('slabThickness', v)} />
            <Field label="Beam b" value={model.beamWidth} unit="mm" min={100} step={10} onChange={(v) => update('beamWidth', v)} />
            <Field label="Beam D" value={model.beamDepth} unit="mm" min={150} step={10} onChange={(v) => update('beamDepth', v)} />
          </div>
          <Field label="Column size" value={model.columnSize} unit="mm" min={200} step={25} onChange={(v) => update('columnSize', v)} />
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Built-up area" value={fmt(results.builtup, 1)} unit="m2" />
          <Metric label="Columns" value={results.columns} />
          <Metric label="Concrete" value={fmt(results.concrete, 2)} unit="m3" />
          <Metric label="Beam length/floor" value={fmt((model.baysY + 1) * results.totalWidth + (model.baysX + 1) * results.totalDepth, 1)} unit="m" />
        </div>
        <Panel className="p-4">
          <GridModel
            model={model}
            accent={accent.stroke}
            onResize={(bayWidth, bayDepth) => setModel((prev) => ({ ...prev, bayWidth, bayDepth }))}
          />
        </Panel>
        <Panel className="p-4">
          <ResultLine label="Slab concrete" value={`${fmt(results.slabVolume, 2)} m3`} />
          <ResultLine label="Beam concrete" value={`${fmt(results.beamVolume, 2)} m3`} />
          <ResultLine label="Column concrete" value={`${fmt(results.columnVolume, 2)} m3`} />
          <ResultLine label="Plan size" value={`${fmt(results.totalWidth, 1)} m x ${fmt(results.totalDepth, 1)} m`} />
        </Panel>
      </div>
    </div>
  );
}

function GridModel({
  model,
  accent,
  onResize,
}: {
  model: { baysX: number; baysY: number; bayWidth: number; bayDepth: number };
  accent: string;
  onResize?: (bayWidth: number, bayDepth: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const width = 640;
  const height = 360;
  const left = 60;
  const top = 48;
  const gridW = 500;
  const gridH = 240;
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !onResize) return;
    const point = svgPointer(event, svgRef.current);
    const totalWidth = clamp(((point.x - left) / gridW) * model.baysX * 10, model.baysX, model.baysX * 10);
    const totalDepth = clamp(((point.y - top) / gridH) * model.baysY * 10, model.baysY, model.baysY * 10);
    onResize(Number((totalWidth / model.baysX).toFixed(1)), Number((totalDepth / model.baysY).toFixed(1)));
  };
  const startDrag = (event: React.PointerEvent<SVGElement>) => {
    setDragging(true);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragging(false);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };
  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="h-80 w-full touch-none" onPointerMove={handleMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <rect x="12" y="12" width={width - 24} height={height - 24} rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      {Array.from({ length: model.baysX + 1 }, (_, index) => {
        const x = left + (index / model.baysX) * gridW;
        return <line key={`x-${index}`} x1={x} x2={x} y1={top} y2={top + gridH} stroke={accent} strokeWidth="3" opacity="0.65" />;
      })}
      {Array.from({ length: model.baysY + 1 }, (_, index) => {
        const y = top + (index / model.baysY) * gridH;
        return <line key={`y-${index}`} x1={left} x2={left + gridW} y1={y} y2={y} stroke={accent} strokeWidth="3" opacity="0.65" />;
      })}
      {Array.from({ length: model.baysX + 1 }, (_, ix) =>
        Array.from({ length: model.baysY + 1 }, (_, iy) => {
          const x = left + (ix / model.baysX) * gridW;
          const y = top + (iy / model.baysY) * gridH;
          return <rect key={`${ix}-${iy}`} x={x - 7} y={y - 7} width="14" height="14" rx="3" fill="rgba(226,232,240,0.9)" />;
        })
      )}
      <circle cx={left + gridW} cy={top + gridH} r="24" fill="transparent" className="cursor-nwse-resize" onPointerDown={startDrag} />
      <DragKnob x={left + gridW} y={top + gridH} accent={accent} label="size" />
      <text x={left + gridW / 2} y={height - 34} fill="rgba(203,213,225,0.75)" fontSize="13" fontWeight="800" textAnchor="middle">
        {model.baysX} x {model.baysY} bay grid - {fmt(model.bayWidth, 1)} m by {fmt(model.bayDepth, 1)} m bays
      </text>
    </svg>
  );
}

function TransportStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [road, setRoad] = useState({
    speed: 80,
    reactionTime: 2.5,
    friction: 0.35,
    gradient: 2,
    radius: 220,
    laneWidth: 3.5,
    trafficVolume: 1450,
    capacityPerLane: 1800,
  });

  const results = useMemo(() => {
    const V = Math.max(road.speed, 1);
    const g = road.gradient / 100;
    const lag = 0.278 * V * road.reactionTime;
    const braking = (V * V) / (254 * Math.max(road.friction + g, 0.05));
    const ssd = lag + braking;
    const e = (V * V) / (225 * Math.max(road.radius, 1));
    const safeRadius = (V * V) / (225 * 0.07);
    const capacity = road.capacityPerLane * 2;
    const vc = road.trafficVolume / capacity;
    const widening = (Math.pow(6, 2) / (2 * Math.max(road.radius, 1))) + V / (9.5 * Math.sqrt(Math.max(road.radius, 1)));
    return { lag, braking, ssd, e, safeRadius, capacity, vc, widening, ok: e <= 0.07 && vc <= 1 };
  }, [road]);

  const update = (field: keyof typeof road, value: number) => setRoad((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel>
        <PanelHeader title="Road Inputs" caption="Highway geometry checks for sight distance, curve and lane capacity." icon={<Path size={18} weight="duotone" />} accent={accent} />
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Design speed" value={road.speed} unit="km/h" min={10} step={5} onChange={(v) => update('speed', v)} />
            <Field label="Reaction time" value={road.reactionTime} unit="s" min={1} step={0.1} onChange={(v) => update('reactionTime', v)} />
            <Field label="Friction" value={road.friction} min={0.1} step={0.01} onChange={(v) => update('friction', v)} />
            <Field label="Gradient" value={road.gradient} unit="%" step={0.5} onChange={(v) => update('gradient', v)} />
            <Field label="Curve radius" value={road.radius} unit="m" min={10} step={10} onChange={(v) => update('radius', v)} />
            <Field label="Lane width" value={road.laneWidth} unit="m" min={2.5} step={0.1} onChange={(v) => update('laneWidth', v)} />
            <Field label="Traffic volume" value={road.trafficVolume} unit="veh/h" min={0} step={50} onChange={(v) => update('trafficVolume', v)} />
            <Field label="Cap. per lane" value={road.capacityPerLane} unit="veh/h" min={500} step={50} onChange={(v) => update('capacityPerLane', v)} />
          </div>
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="SSD" value={fmt(results.ssd, 1)} unit="m" />
          <Metric label="Superelevation" value={fmt(results.e * 100, 2)} unit="%" tone={results.e <= 0.07 ? 'good' : 'warn'} />
          <Metric label="V/C ratio" value={fmt(results.vc, 2)} tone={results.vc <= 1 ? 'good' : 'warn'} />
          <Metric label="Extra widening" value={fmt(results.widening, 2)} unit="m" />
        </div>
        <Panel className="p-4">
          <RoadGraphic radius={road.radius} ssd={results.ssd} accent={accent.stroke} onRadiusChange={(radius) => update('radius', radius)} />
        </Panel>
        <Insight
          ok={results.ok}
          title={results.ok ? 'Geometry and capacity are within teaching limits' : 'Review radius, superelevation or traffic demand'}
          body={`Lag distance is ${fmt(results.lag, 1)} m and braking distance is ${fmt(results.braking, 1)} m. The minimum radius at 7% superelevation is around ${fmt(results.safeRadius, 1)} m.`}
        />
      </div>
    </div>
  );
}

function RoadGraphic({ radius, ssd, accent, onRadiusChange }: { radius: number; ssd: number; accent: string; onRadiusChange?: (radius: number) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const handleX = 104 + (clamp(radius, 50, 600) - 50) / 550 * 352;
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !onRadiusChange) return;
    const point = svgPointer(event, svgRef.current);
    onRadiusChange(Math.round(clamp(50 + ((point.x - 104) / 352) * 550, 50, 600)));
  };
  const startDrag = (event: React.PointerEvent<SVGElement>) => {
    setDragging(true);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragging(false);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };
  return (
    <svg ref={svgRef} viewBox="0 0 640 270" className="h-64 w-full touch-none" onPointerMove={handleMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <rect x="16" y="16" width="608" height="238" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <path d="M40 196 C170 80 300 80 600 132" fill="none" stroke="rgba(226,232,240,0.72)" strokeWidth="58" strokeLinecap="round" />
      <path d="M40 196 C170 80 300 80 600 132" fill="none" stroke="rgba(15,23,42,1)" strokeWidth="48" strokeLinecap="round" />
      <path d="M40 196 C170 80 300 80 600 132" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="18 14" />
      <path d="M104 178 C196 106 294 102 456 122" fill="none" stroke="#f8fafc" strokeWidth="3" opacity="0.75" />
      <circle cx="104" cy="178" r="8" fill={accent} />
      <circle cx="456" cy="122" r="8" fill={accent} />
      <line x1="104" y1="218" x2="456" y2="218" stroke={accent} strokeWidth="4" opacity="0.25" />
      <circle cx={handleX} cy="218" r="22" fill="transparent" className="cursor-ew-resize" onPointerDown={startDrag} />
      <DragKnob x={handleX} y={218} accent={accent} label="R" />
      <text x="320" y="56" fill="rgba(226,232,240,0.86)" fontSize="14" fontWeight="900" textAnchor="middle">
        SSD {fmt(ssd, 1)} m - curve radius {fmt(radius, 1)} m
      </text>
    </svg>
  );
}

function EnvironmentalStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [plant, setPlant] = useState({
    population: 25000,
    demand: 135,
    peakFactor: 2.5,
    detention: 4,
    overflowRate: 30,
    bod: 220,
    mlss: 3000,
    fm: 0.35,
    chlorineTime: 30,
  });

  const results = useMemo(() => {
    const avgMld = (plant.population * plant.demand) / 1_000_000;
    const peakMld = avgMld * plant.peakFactor;
    const peakM3Day = peakMld * 1000;
    const sedimentationArea = peakM3Day / Math.max(plant.overflowRate, 1);
    const equalizationVolume = (avgMld * 1000 * plant.detention) / 24;
    const bodLoad = avgMld * 1000 * plant.bod / 1000;
    const aerationVolume = bodLoad / Math.max((plant.mlss / 1000) * plant.fm, 0.01);
    const chlorineVolume = (peakMld * 1000 * plant.chlorineTime) / (24 * 60);
    return { avgMld, peakMld, sedimentationArea, equalizationVolume, bodLoad, aerationVolume, chlorineVolume };
  }, [plant]);

  const update = (field: keyof typeof plant, value: number) => setPlant((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel>
        <PanelHeader title="Treatment Inputs" caption="Water demand and primary sizing for WTP/STP classroom design." icon={<Tree size={18} weight="duotone" />} accent={accent} />
        <div className="grid gap-4 p-4">
          <Field label="Population" value={plant.population} min={100} step={500} onChange={(v) => update('population', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Demand" value={plant.demand} unit="lpcd" min={20} step={5} onChange={(v) => update('demand', v)} />
            <Field label="Peak factor" value={plant.peakFactor} min={1} step={0.1} onChange={(v) => update('peakFactor', v)} />
            <Field label="Detention" value={plant.detention} unit="h" min={0.5} step={0.5} onChange={(v) => update('detention', v)} />
            <Field label="Overflow rate" value={plant.overflowRate} unit="m3/m2d" min={5} step={1} onChange={(v) => update('overflowRate', v)} />
            <Field label="BOD" value={plant.bod} unit="mg/L" min={10} step={10} onChange={(v) => update('bod', v)} />
            <Field label="MLSS" value={plant.mlss} unit="mg/L" min={500} step={100} onChange={(v) => update('mlss', v)} />
            <Field label="F/M" value={plant.fm} min={0.05} step={0.05} onChange={(v) => update('fm', v)} />
            <Field label="Chlorine time" value={plant.chlorineTime} unit="min" min={5} step={5} onChange={(v) => update('chlorineTime', v)} />
          </div>
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Average demand" value={fmt(results.avgMld, 3)} unit="MLD" />
          <Metric label="Peak flow" value={fmt(results.peakMld, 3)} unit="MLD" />
          <Metric label="Sed. area" value={fmt(results.sedimentationArea, 1)} unit="m2" />
          <Metric label="BOD load" value={fmt(results.bodLoad, 1)} unit="kg/d" />
        </div>
        <Panel className="p-4">
          <TreatmentGraphic
            results={results}
            accent={accent.stroke}
            onPeakFactorChange={(peakFactor) => update('peakFactor', peakFactor)}
          />
        </Panel>
        <Panel className="p-4">
          <ResultLine label="Equalization tank" value={`${fmt(results.equalizationVolume, 1)} m3`} />
          <ResultLine label="Aeration tank" value={`${fmt(results.aerationVolume, 1)} m3`} />
          <ResultLine label="Chlorine contact tank" value={`${fmt(results.chlorineVolume, 1)} m3`} />
        </Panel>
      </div>
    </div>
  );
}

function TreatmentGraphic({
  results,
  accent,
  onPeakFactorChange,
}: {
  results: { avgMld: number; peakMld: number; sedimentationArea: number; aerationVolume: number; chlorineVolume: number };
  accent: string;
  onPeakFactorChange?: (peakFactor: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const stages = [
    { label: 'Inlet', value: results.peakMld, unit: 'MLD' },
    { label: 'Sedimentation', value: results.sedimentationArea, unit: 'm2' },
    { label: 'Aeration', value: results.aerationVolume, unit: 'm3' },
    { label: 'Chlorination', value: results.chlorineVolume, unit: 'm3' },
  ];
  const factor = results.peakMld / Math.max(results.avgMld, 0.001);
  const handleY = 188 - (clamp(factor, 1, 5) - 1) / 4 * 104;
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !onPeakFactorChange) return;
    const point = svgPointer(event, svgRef.current);
    onPeakFactorChange(Number(clamp(1 + ((188 - point.y) / 104) * 4, 1, 5).toFixed(2)));
  };
  const startDrag = (event: React.PointerEvent<SVGElement>) => {
    setDragging(true);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragging(false);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };
  return (
    <svg ref={svgRef} viewBox="0 0 720 260" className="h-64 w-full touch-none" onPointerMove={handleMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <rect x="20" y="20" width="680" height="220" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      {stages.map((stage, index) => {
        const x = 62 + index * 165;
        return (
          <g key={stage.label}>
            {index > 0 && <line x1={x - 70} y1="126" x2={x - 26} y2="126" stroke={accent} strokeWidth="4" strokeLinecap="round" />}
            <rect x={x} y="74" width="112" height="104" rx="18" fill="rgba(15,23,42,0.95)" stroke={accent} strokeWidth="2" opacity="0.88" />
            <text x={x + 56} y="111" fill="rgba(226,232,240,0.88)" fontSize="13" fontWeight="900" textAnchor="middle">
              {stage.label}
            </text>
            <text x={x + 56} y="140" fill={accent} fontSize="15" fontWeight="900" textAnchor="middle">
              {fmt(stage.value, 1)}
            </text>
            <text x={x + 56} y="160" fill="rgba(148,163,184,0.8)" fontSize="11" fontWeight="800" textAnchor="middle">
              {stage.unit}
            </text>
          </g>
        );
      })}
      <line x1="34" y1="188" x2="34" y2="84" stroke={accent} strokeWidth="4" opacity="0.28" />
      <circle cx="34" cy={handleY} r="22" fill="transparent" className="cursor-ns-resize" onPointerDown={startDrag} />
      <DragKnob x={34} y={handleY} accent={accent} label="peak" />
    </svg>
  );
}

function ConcreteStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [beam, setBeam] = useState({
    width: 300,
    effectiveDepth: 500,
    moment: 145,
    fck: 25,
    fy: 500,
    barDia: 16,
    clearSpacing: 25,
  });

  const results = useMemo(() => {
    const b = Math.max(beam.width, 1);
    const d = Math.max(beam.effectiveDepth, 1);
    const fck = Math.max(beam.fck, 1);
    const fy = Math.max(beam.fy, 1);
    const Mu = Math.max(beam.moment, 0) * 1_000_000;
    const xuMaxRatio = fy >= 500 ? 0.46 : fy >= 415 ? 0.48 : 0.53;
    const xuMax = xuMaxRatio * d;
    const muLim = (0.36 * fck * b * xuMax * (d - 0.42 * xuMax)) / 1_000_000;
    let low = 0;
    let high = 0.04 * b * d;
    for (let i = 0; i < 70; i += 1) {
      const ast = (low + high) / 2;
      const xu = (0.87 * fy * ast) / (0.36 * fck * b);
      const m = 0.87 * fy * ast * (d - 0.42 * xu);
      if (m < Mu) low = ast;
      else high = ast;
    }
    const astReq = Math.max(high, (0.85 * b * d) / fy);
    const barArea = (Math.PI * beam.barDia * beam.barDia) / 4;
    const bars = Math.max(2, Math.ceil(astReq / Math.max(barArea, 1)));
    const astProvided = bars * barArea;
    const utilization = (beam.moment / Math.max(muLim, 0.01)) * 100;
    const beamCapacity = (0.87 * fy * astProvided * (d - 0.42 * ((0.87 * fy * astProvided) / (0.36 * fck * b)))) / 1_000_000;
    return { xuMax, muLim, astReq, bars, astProvided, utilization, beamCapacity, singlyOk: beam.moment <= muLim };
  }, [beam]);

  const update = (field: keyof typeof beam, value: number) => setBeam((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel>
        <PanelHeader title="RCC Beam Inputs" caption="Limit state flexure check for singly reinforced rectangular beams." icon={<Wall size={18} weight="duotone" />} accent={accent} />
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width b" value={beam.width} unit="mm" min={100} step={10} onChange={(v) => update('width', v)} />
            <Field label="Eff. depth d" value={beam.effectiveDepth} unit="mm" min={100} step={10} onChange={(v) => update('effectiveDepth', v)} />
            <Field label="Moment Mu" value={beam.moment} unit="kN-m" min={0} step={5} onChange={(v) => update('moment', v)} />
            <Field label="fck" value={beam.fck} unit="MPa" min={10} step={5} onChange={(v) => update('fck', v)} />
            <Field label="fy" value={beam.fy} unit="MPa" min={250} step={5} onChange={(v) => update('fy', v)} />
            <Field label="Bar dia" value={beam.barDia} unit="mm" min={8} step={2} onChange={(v) => update('barDia', v)} />
          </div>
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Ast required" value={fmt(results.astReq, 0)} unit="mm2" />
          <Metric label="Use bars" value={`${results.bars} - ${fmt(beam.barDia, 0)}`} unit="mm" tone="good" />
          <Metric label="Mu limit" value={fmt(results.muLim, 1)} unit="kN-m" tone={results.singlyOk ? 'good' : 'warn'} />
          <Metric label="Utilization" value={fmt(results.utilization, 1)} unit="%" tone={results.singlyOk ? 'good' : 'warn'} />
        </div>
        <Panel className="p-4">
          <RccBeamGraphic
            bars={results.bars}
            barDia={beam.barDia}
            width={beam.width}
            depth={beam.effectiveDepth}
            accent={accent.stroke}
            onResize={(width, effectiveDepth) => setBeam((prev) => ({ ...prev, width, effectiveDepth }))}
          />
        </Panel>
        <Insight
          ok={results.singlyOk}
          title={results.singlyOk ? 'Singly reinforced section is adequate' : 'Moment exceeds singly reinforced limit'}
          body={`Provided steel is ${fmt(results.astProvided, 0)} mm2 and estimated moment capacity with selected bars is ${fmt(results.beamCapacity, 1)} kN-m.`}
        />
      </div>
    </div>
  );
}

function RccBeamGraphic({
  bars,
  barDia,
  width,
  depth,
  accent,
  onResize,
}: {
  bars: number;
  barDia: number;
  width: number;
  depth: number;
  accent: string;
  onResize?: (width: number, depth: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const sectionX = 210;
  const sectionY = 54;
  const sectionW = 220;
  const sectionH = 190;
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !onResize) return;
    const point = svgPointer(event, svgRef.current);
    const nextWidth = Math.round(clamp(((point.x - sectionX) / sectionW) * 600, 150, 600) / 10) * 10;
    const nextDepth = Math.round(clamp(((point.y - sectionY) / sectionH) * 900, 200, 900) / 10) * 10;
    onResize(nextWidth, nextDepth);
  };
  const startDrag = (event: React.PointerEvent<SVGElement>) => {
    setDragging(true);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragging(false);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };
  const handleX = sectionX + (clamp(width, 150, 600) / 600) * sectionW;
  const handleY = sectionY + (clamp(depth, 200, 900) / 900) * sectionH;
  return (
    <svg ref={svgRef} viewBox="0 0 640 300" className="h-72 w-full touch-none" onPointerMove={handleMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <rect x="18" y="18" width="604" height="264" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <rect x="210" y="54" width="220" height="190" rx="10" fill="rgba(148,163,184,0.14)" stroke="rgba(226,232,240,0.75)" strokeWidth="3" />
      <line x1="238" x2="402" y1="82" y2="82" stroke="rgba(226,232,240,0.35)" strokeWidth="3" />
      {Array.from({ length: bars }, (_, index) => {
        const x = 238 + (bars === 1 ? 82 : (index / (bars - 1)) * 164);
        return <circle key={index} cx={x} cy="218" r={clamp(barDia / 3, 4, 10)} fill={accent} stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />;
      })}
      <circle cx={handleX} cy={handleY} r="24" fill="transparent" className="cursor-nwse-resize" onPointerDown={startDrag} />
      <DragKnob x={handleX} y={handleY} accent={accent} label="b,d" />
      <text x="320" y="272" fill="rgba(203,213,225,0.76)" fontSize="13" fontWeight="800" textAnchor="middle">
        {fmt(width, 0)} mm x {fmt(depth, 0)} mm effective section
      </text>
    </svg>
  );
}

function EstimationStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [item, setItem] = useState({
    length: 12,
    width: 8,
    thickness: 150,
    wastage: 3,
    concreteRate: 6200,
    steelRate: 68,
    rebarDia: 12,
    spacingX: 150,
    spacingY: 150,
    cover: 25,
    mixCement: 1,
    mixSand: 1.5,
    mixAggregate: 3,
  });

  const results = useMemo(() => {
    const slabVolume = item.length * item.width * (item.thickness / 1000);
    const wetVolume = slabVolume * (1 + item.wastage / 100);
    const dryVolume = wetVolume * 1.54;
    const ratioSum = item.mixCement + item.mixSand + item.mixAggregate;
    const cementVolume = dryVolume * (item.mixCement / ratioSum);
    const sandVolume = dryVolume * (item.mixSand / ratioSum);
    const aggregateVolume = dryVolume * (item.mixAggregate / ratioSum);
    const cementBags = (cementVolume * 1440) / 50;
    const barsX = Math.floor(((item.width * 1000 - item.cover * 2) / Math.max(item.spacingX, 1))) + 1;
    const barsY = Math.floor(((item.length * 1000 - item.cover * 2) / Math.max(item.spacingY, 1))) + 1;
    const lengthX = barsX * Math.max(item.length - (item.cover * 2) / 1000, 0);
    const lengthY = barsY * Math.max(item.width - (item.cover * 2) / 1000, 0);
    const totalSteelLength = lengthX + lengthY;
    const steelWeight = totalSteelLength * ((item.rebarDia * item.rebarDia) / 162);
    const concreteCost = wetVolume * item.concreteRate;
    const steelCost = steelWeight * item.steelRate;
    return { slabVolume, wetVolume, dryVolume, cementBags, sandVolume, aggregateVolume, barsX, barsY, totalSteelLength, steelWeight, concreteCost, steelCost, totalCost: concreteCost + steelCost };
  }, [item]);

  const update = (field: keyof typeof item, value: number) => setItem((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel>
        <PanelHeader title="Quantity Inputs" caption="Slab concrete and two-way reinforcement takeoff with cost." icon={<Calculator size={18} weight="duotone" />} accent={accent} />
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Length" value={item.length} unit="m" min={0.1} step={0.5} onChange={(v) => update('length', v)} />
            <Field label="Width" value={item.width} unit="m" min={0.1} step={0.5} onChange={(v) => update('width', v)} />
            <Field label="Thickness" value={item.thickness} unit="mm" min={50} step={10} onChange={(v) => update('thickness', v)} />
            <Field label="Wastage" value={item.wastage} unit="%" min={0} step={0.5} onChange={(v) => update('wastage', v)} />
            <Field label="Bar dia" value={item.rebarDia} unit="mm" min={6} step={2} onChange={(v) => update('rebarDia', v)} />
            <Field label="Cover" value={item.cover} unit="mm" min={10} step={5} onChange={(v) => update('cover', v)} />
            <Field label="Spacing X" value={item.spacingX} unit="mm" min={50} step={25} onChange={(v) => update('spacingX', v)} />
            <Field label="Spacing Y" value={item.spacingY} unit="mm" min={50} step={25} onChange={(v) => update('spacingY', v)} />
            <Field label="Concrete rate" value={item.concreteRate} unit="/m3" min={0} step={100} onChange={(v) => update('concreteRate', v)} />
            <Field label="Steel rate" value={item.steelRate} unit="/kg" min={0} step={1} onChange={(v) => update('steelRate', v)} />
          </div>
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Concrete" value={fmt(results.wetVolume, 2)} unit="m3" />
          <Metric label="Cement" value={fmt(results.cementBags, 1)} unit="bags" />
          <Metric label="Steel" value={fmt(results.steelWeight, 1)} unit="kg" />
          <Metric label="Total cost" value={fmtCompact(results.totalCost, 0)} unit="INR" />
        </div>
        <Panel className="p-4">
          <QuantityGraphic
            length={item.length}
            width={item.width}
            barsX={results.barsX}
            barsY={results.barsY}
            accent={accent.stroke}
            onResize={(length, width) => setItem((prev) => ({ ...prev, length, width }))}
          />
        </Panel>
        <div className="grid gap-3 md:grid-cols-2">
          <Panel className="p-4">
            <ResultLine label="Dry material volume" value={`${fmt(results.dryVolume, 2)} m3`} />
            <ResultLine label="Sand" value={`${fmt(results.sandVolume, 2)} m3`} />
            <ResultLine label="Aggregate" value={`${fmt(results.aggregateVolume, 2)} m3`} />
          </Panel>
          <Panel className="p-4">
            <ResultLine label="Bars along length" value={`${results.barsX} bars`} />
            <ResultLine label="Bars along width" value={`${results.barsY} bars`} />
            <ResultLine label="Total bar length" value={`${fmt(results.totalSteelLength, 1)} m`} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function QuantityGraphic({
  length,
  width,
  barsX,
  barsY,
  accent,
  onResize,
}: {
  length: number;
  width: number;
  barsX: number;
  barsY: number;
  accent: string;
  onResize?: (length: number, width: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const slabX = 90;
  const slabY = 62;
  const slabW = 460;
  const slabH = 190;
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !onResize) return;
    const point = svgPointer(event, svgRef.current);
    const nextLength = Number(clamp(((point.x - slabX) / slabW) * 30, 2, 30).toFixed(1));
    const nextWidth = Number(clamp(((point.y - slabY) / slabH) * 20, 2, 20).toFixed(1));
    onResize(nextLength, nextWidth);
  };
  const startDrag = (event: React.PointerEvent<SVGElement>) => {
    setDragging(true);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragging(false);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };
  const handleX = slabX + (clamp(length, 2, 30) / 30) * slabW;
  const handleY = slabY + (clamp(width, 2, 20) / 20) * slabH;
  return (
    <svg ref={svgRef} viewBox="0 0 640 330" className="h-80 w-full touch-none" onPointerMove={handleMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <rect x="16" y="16" width="608" height="298" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <rect x="90" y="62" width="460" height="190" rx="14" fill="rgba(148,163,184,0.12)" stroke="rgba(226,232,240,0.65)" strokeWidth="3" />
      {Array.from({ length: Math.min(barsX, 24) }, (_, index) => {
        const x = 104 + (index / Math.max(Math.min(barsX, 24) - 1, 1)) * 432;
        return <line key={`x-${index}`} x1={x} x2={x} y1="74" y2="240" stroke={accent} strokeWidth="2" opacity="0.55" />;
      })}
      {Array.from({ length: Math.min(barsY, 18) }, (_, index) => {
        const y = 76 + (index / Math.max(Math.min(barsY, 18) - 1, 1)) * 162;
        return <line key={`y-${index}`} x1="102" x2="538" y1={y} y2={y} stroke={accent} strokeWidth="2" opacity="0.55" />;
      })}
      <circle cx={handleX} cy={handleY} r="24" fill="transparent" className="cursor-nwse-resize" onPointerDown={startDrag} />
      <DragKnob x={handleX} y={handleY} accent={accent} label="L,W" />
      <text x="320" y="288" fill="rgba(203,213,225,0.75)" fontSize="13" fontWeight="800" textAnchor="middle">
        Slab panel {fmt(length, 1)} m x {fmt(width, 1)} m - BBS preview
      </text>
    </svg>
  );
}

type Task = {
  id: string;
  name: string;
  duration: number;
  predecessors: string;
};

function PlanningStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 'A', name: 'Site survey', duration: 2, predecessors: '' },
    { id: 'B', name: 'Excavation', duration: 4, predecessors: 'A' },
    { id: 'C', name: 'Footing steel', duration: 3, predecessors: 'B' },
    { id: 'D', name: 'Footing concrete', duration: 2, predecessors: 'C' },
    { id: 'E', name: 'Column starter', duration: 3, predecessors: 'D' },
    { id: 'F', name: 'Backfilling', duration: 2, predecessors: 'D' },
    { id: 'G', name: 'Plinth beam', duration: 4, predecessors: 'E,F' },
  ]);

  const results = useMemo(() => computeCpm(tasks), [tasks]);

  const updateTask = (index: number, field: keyof Task, value: string | number) => {
    setTasks((prev) => prev.map((task, taskIndex) => (taskIndex === index ? { ...task, [field]: value } : task)));
  };

  const addTask = () => {
    const nextId = String.fromCharCode(65 + tasks.length);
    setTasks((prev) => [...prev, { id: nextId, name: 'New activity', duration: 2, predecessors: prev.length ? prev[prev.length - 1].id : '' }]);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[520px_1fr]">
      <Panel>
        <PanelHeader title="Activity Network" caption="Edit durations and predecessors. IDs use comma separated dependencies." icon={<Clock size={18} weight="duotone" />} accent={accent} />
        <div className="p-4">
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={`${task.id}-${index}`} className="grid grid-cols-[46px_1fr_82px_92px_34px] gap-2">
                <input value={task.id} onChange={(event) => updateTask(index, 'id', event.target.value.toUpperCase())} className="h-10 rounded-xl border border-white/10 bg-[#0B1018] px-2 text-center text-sm font-black text-white outline-none transition focus:border-violet-400/70 focus:!outline-none focus-visible:!outline-none focus-visible:!outline-offset-0" />
                <input value={task.name} onChange={(event) => updateTask(index, 'name', event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#0B1018] px-3 text-sm font-bold text-white outline-none transition focus:border-violet-400/70 focus:!outline-none focus-visible:!outline-none focus-visible:!outline-offset-0" />
                <input type="number" value={task.duration} min={0} step={1} onChange={(event) => updateTask(index, 'duration', Number(event.target.value))} className="h-10 rounded-xl border border-white/10 bg-[#0B1018] px-3 text-sm font-bold text-white outline-none transition [appearance:textfield] focus:border-violet-400/70 focus:!outline-none focus-visible:!outline-none focus-visible:!outline-offset-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                <input value={task.predecessors} onChange={(event) => updateTask(index, 'predecessors', event.target.value.toUpperCase())} className="h-10 rounded-xl border border-white/10 bg-[#0B1018] px-3 text-sm font-bold text-white outline-none transition focus:border-violet-400/70 focus:!outline-none focus-visible:!outline-none focus-visible:!outline-offset-0" />
                <button type="button" onClick={() => setTasks((prev) => prev.filter((_, taskIndex) => taskIndex !== index))} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-rose-300">
                  <Trash size={16} className="mx-auto" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addTask} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl ${accent.bg} px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-black/20`}>
            <Plus size={16} weight="bold" />
            Add activity
          </button>
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Project duration" value={fmt(results.duration, 0)} unit="days" />
          <Metric label="Critical tasks" value={results.critical.length} />
          <Metric label="Total activities" value={tasks.length} />
          <Metric label="Avg float" value={fmt(results.averageFloat, 1)} unit="days" />
        </div>
        <Panel className="p-4">
          <GanttChart
            tasks={results.rows}
            duration={results.duration}
            accent={accent.stroke}
            onDurationChange={(id, duration) => {
              const index = tasks.findIndex((task) => task.id.toUpperCase() === id.toUpperCase());
              if (index >= 0) updateTask(index, 'duration', duration);
            }}
          />
        </Panel>
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">ES</th>
                  <th className="px-4 py-3">EF</th>
                  <th className="px-4 py-3">LS</th>
                  <th className="px-4 py-3">LF</th>
                  <th className="px-4 py-3">Float</th>
                </tr>
              </thead>
              <tbody>
                {results.rows.map((task) => (
                  <tr key={task.id} className={`border-t border-white/10 ${task.float <= 0.001 ? 'bg-violet-500/8' : ''}`}>
                    <td className="px-4 py-3 font-black text-white">{task.id}</td>
                    <td className="px-4 py-3 text-slate-300">{task.name}</td>
                    <td className="px-4 py-3">{fmt(task.es, 0)}</td>
                    <td className="px-4 py-3">{fmt(task.ef, 0)}</td>
                    <td className="px-4 py-3">{fmt(task.ls, 0)}</td>
                    <td className="px-4 py-3">{fmt(task.lf, 0)}</td>
                    <td className={`px-4 py-3 font-black ${task.float <= 0.001 ? 'text-violet-300' : 'text-slate-400'}`}>{fmt(task.float, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function computeCpm(tasks: Task[]) {
  const normalized = tasks.map((task) => ({
    ...task,
    duration: Math.max(Number(task.duration) || 0, 0),
    preds: task.predecessors
      .split(',')
      .map((id) => id.trim().toUpperCase())
      .filter(Boolean),
  }));
  const byId = new Map(normalized.map((task) => [task.id.toUpperCase(), task]));
  const forward = new Map<string, { es: number; ef: number }>();
  normalized.forEach((task) => {
    const es = Math.max(0, ...task.preds.map((pred) => forward.get(pred)?.ef ?? 0));
    forward.set(task.id.toUpperCase(), { es, ef: es + task.duration });
  });
  const projectDuration = Math.max(0, ...Array.from(forward.values()).map((item) => item.ef));
  const successors = new Map<string, string[]>();
  normalized.forEach((task) => {
    task.preds.forEach((pred) => {
      successors.set(pred, [...(successors.get(pred) ?? []), task.id.toUpperCase()]);
    });
  });
  const backward = new Map<string, { ls: number; lf: number }>();
  [...normalized].reverse().forEach((task) => {
    const taskId = task.id.toUpperCase();
    const succs = successors.get(taskId) ?? [];
    const lf = succs.length ? Math.min(...succs.map((succ) => backward.get(succ)?.ls ?? projectDuration)) : projectDuration;
    backward.set(taskId, { lf, ls: lf - task.duration });
  });
  const rows = normalized.map((task) => {
    const taskId = task.id.toUpperCase();
    const early = forward.get(taskId) ?? { es: 0, ef: task.duration };
    const late = backward.get(taskId) ?? { ls: early.es, lf: early.ef };
    return {
      id: task.id,
      name: task.name,
      duration: task.duration,
      es: early.es,
      ef: early.ef,
      ls: late.ls,
      lf: late.lf,
      float: late.ls - early.es,
      critical: Math.abs(late.ls - early.es) <= 0.001,
      exists: byId.has(taskId),
    };
  });
  const critical = rows.filter((row) => row.critical);
  const averageFloat = rows.reduce((sum, row) => sum + Math.max(row.float, 0), 0) / Math.max(rows.length, 1);
  return { rows, duration: projectDuration, critical, averageFloat };
}

function GanttChart({
  tasks,
  duration,
  accent,
  onDurationChange,
}: {
  tasks: Array<{ id: string; name: string; es: number; ef: number; duration: number; critical: boolean }>;
  duration: number;
  accent: string;
  onDurationChange?: (id: string, duration: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const width = 720;
  const rowHeight = 34;
  const left = 150;
  const top = 44;
  const height = Math.max(220, top + tasks.length * rowHeight + 44);
  const scale = (width - left - 40) / Math.max(duration, 1);
  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragId || !onDurationChange) return;
    const task = tasks.find((item) => item.id === dragId);
    if (!task) return;
    const point = svgPointer(event, svgRef.current);
    const next = Math.max(1, Math.round((point.x - left) / scale - task.es));
    onDurationChange(dragId, next);
  };
  const startDrag = (id: string) => (event: React.PointerEvent<SVGElement>) => {
    setDragId(id);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragId(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };
  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="min-h-72 w-full touch-none" onPointerMove={handleMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <rect x="12" y="12" width={width - 24} height={height - 24} rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      {Array.from({ length: Math.ceil(duration) + 1 }, (_, index) => (
        <g key={index}>
          <line x1={left + index * scale} x2={left + index * scale} y1="34" y2={height - 34} stroke="rgba(148,163,184,0.08)" />
          {index % 2 === 0 && (
            <text x={left + index * scale} y="28" fill="rgba(148,163,184,0.6)" fontSize="10" fontWeight="800" textAnchor="middle">
              {index}
            </text>
          )}
        </g>
      ))}
      {tasks.map((task, index) => {
        const y = top + index * rowHeight;
        const x = left + task.es * scale;
        const w = Math.max(task.duration * scale, 8);
        return (
          <g key={task.id}>
            <text x="34" y={y + 19} fill="rgba(226,232,240,0.82)" fontSize="12" fontWeight="800">
              {task.id}. {task.name}
            </text>
            <rect x={x} y={y} width={w} height="20" rx="10" fill={task.critical ? accent : 'rgba(148,163,184,0.36)'} />
            <circle cx={x + w} cy={y + 10} r="16" fill="transparent" className="cursor-ew-resize" onPointerDown={startDrag(task.id)} />
            <circle cx={x + w} cy={y + 10} r="5" fill={accent} stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" />
            {task.critical && <circle cx={x + w + 10} cy={y + 10} r="4" fill={accent} />}
          </g>
        );
      })}
    </svg>
  );
}

function SteelStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [member, setMember] = useState({ length: 4.2, load: 420, area: 4200, radiusGyration: 52, fy: 250, connectionBolts: 4, boltDia: 20 });
  const slenderness = (member.length * 1000) / Math.max(member.radiusGyration, 1);
  const compressionCapacity = 0.6 * member.fy * member.area / 1000;
  const tensionCapacity = 0.9 * member.fy * member.area / 1000;
  const boltCapacity = member.connectionBolts * 0.6 * 400 * (Math.PI * member.boltDia * member.boltDia / 4) / 1000;
  const governing = Math.min(compressionCapacity, tensionCapacity, boltCapacity);
  const utilization = member.load / Math.max(governing, 1) * 100;
  const update = (field: keyof typeof member, value: number) => setMember((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="grid gap-4 xl:grid-cols-[370px_1fr]">
      <Panel>
        <PanelHeader title="Steel Member Inputs" caption="Drag the member end to change length and drag the load arrow to change axial demand." icon={<Blueprint size={18} weight="duotone" />} accent={accent} />
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Length" value={member.length} unit="m" min={1} step={0.1} onChange={(v) => update('length', v)} />
            <Field label="Axial load" value={member.load} unit="kN" min={0} step={10} onChange={(v) => update('load', v)} />
            <Field label="Area" value={member.area} unit="mm2" min={500} step={100} onChange={(v) => update('area', v)} />
            <Field label="r min" value={member.radiusGyration} unit="mm" min={10} step={1} onChange={(v) => update('radiusGyration', v)} />
            <Field label="fy" value={member.fy} unit="MPa" min={200} step={10} onChange={(v) => update('fy', v)} />
            <Field label="Bolts" value={member.connectionBolts} min={2} step={1} onChange={(v) => update('connectionBolts', Math.round(v))} />
          </div>
          <Field label="Bolt dia" value={member.boltDia} unit="mm" min={12} step={2} onChange={(v) => update('boltDia', v)} />
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Utilization" value={fmt(utilization, 1)} unit="%" tone={utilization <= 100 ? 'good' : 'warn'} />
          <Metric label="Slenderness" value={fmt(slenderness, 0)} tone={slenderness <= 180 ? 'good' : 'warn'} />
          <Metric label="Member capacity" value={fmt(governing, 0)} unit="kN" />
          <Metric label="Bolt group" value={fmt(boltCapacity, 0)} unit="kN" />
        </div>
        <Panel className="p-4">
          <SteelGraphic member={member} accent={accent.stroke} onChange={(next) => setMember((prev) => ({ ...prev, ...next }))} />
        </Panel>
        <Insight ok={utilization <= 100 && slenderness <= 180} title={utilization <= 100 ? 'Steel member is within preliminary capacity' : 'Steel member demand exceeds capacity'} body="This is a teaching-grade interactive member check. It exposes axial demand, slenderness and connection capacity in one workflow." />
      </div>
    </div>
  );
}

function SteelGraphic({ member, accent, onChange }: { member: { length: number; load: number; connectionBolts: number }; accent: string; onChange: (next: Partial<{ length: number; load: number }>) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<'length' | 'load' | null>(null);
  const endX = 120 + (clamp(member.length, 1, 10) / 10) * 420;
  const loadY = 176 - (clamp(member.load, 0, 1200) / 1200) * 104;
  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const p = svgPointer(event, svgRef.current);
    if (drag === 'length') onChange({ length: Number(clamp(((p.x - 120) / 420) * 10, 1, 10).toFixed(2)) });
    if (drag === 'load') onChange({ load: Math.round(clamp(((176 - p.y) / 104) * 1200, 0, 1200)) });
  };
  const start = (kind: 'length' | 'load') => (event: React.PointerEvent<SVGElement>) => { setDrag(kind); svgRef.current?.setPointerCapture(event.pointerId); };
  const stop = (event: React.PointerEvent<SVGSVGElement>) => { setDrag(null); if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId); };
  return (
    <svg ref={svgRef} viewBox="0 0 640 270" className="h-64 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="16" y="16" width="608" height="238" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <line x1="120" y1="136" x2={endX} y2="136" stroke="rgba(226,232,240,0.82)" strokeWidth="28" strokeLinecap="round" />
      <line x1="120" y1="136" x2={endX} y2="136" stroke={accent} strokeWidth="8" opacity="0.65" />
      <rect x="82" y="96" width="28" height="80" rx="4" fill="rgba(226,232,240,0.18)" stroke="rgba(226,232,240,0.55)" />
      <line x1={endX} y1={loadY} x2={endX} y2="116" stroke="#fb7185" strokeWidth="6" strokeLinecap="round" />
      <path d={`M${endX - 14} 116 L${endX} 142 L${endX + 14} 116 Z`} fill="#fb7185" />
      {Array.from({ length: member.connectionBolts }, (_, index) => <circle key={index} cx="96" cy={110 + index * 16} r="4" fill={accent} />)}
      <circle cx={endX} cy="136" r="24" fill="transparent" className="cursor-ew-resize" onPointerDown={start('length')} />
      <DragKnob x={endX} y={136} accent={accent} label="L" />
      <circle cx={endX} cy={loadY} r="24" fill="transparent" className="cursor-ns-resize" onPointerDown={start('load')} />
      <DragKnob x={endX} y={loadY} accent="#fb7185" label="P" />
      <text x="320" y="226" fill="rgba(203,213,225,0.78)" fontSize="13" fontWeight="800" textAnchor="middle">Drag member end and load arrow</text>
    </svg>
  );
}

function RetainingWallStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [wall, setWall] = useState({ height: 4.5, base: 3.2, stem: 0.35, soilGamma: 18, phi: 30, surcharge: 10, baseFriction: 0.55 });
  const ka = Math.pow(Math.tan(Math.PI / 4 - (wall.phi * Math.PI / 180) / 2), 2);
  const pa = 0.5 * ka * wall.soilGamma * wall.height * wall.height + ka * wall.surcharge * wall.height;
  const slidingResist = (wall.base * wall.height * 24 + wall.base * wall.height * wall.soilGamma * 0.35) * wall.baseFriction;
  const fsSliding = slidingResist / Math.max(pa, 1);
  const overturning = pa * wall.height / 3;
  const resisting = wall.base * wall.height * 24 * wall.base / 2;
  const fsOverturning = resisting / Math.max(overturning, 1);
  const update = (field: keyof typeof wall, value: number) => setWall((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="grid gap-4 xl:grid-cols-[370px_1fr]">
      <Panel>
        <PanelHeader title="Wall Inputs" caption="Drag wall height/base in the section to update stability checks." icon={<Stack size={18} weight="duotone" />} accent={accent} />
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="Height" value={wall.height} unit="m" min={1} step={0.1} onChange={(v) => update('height', v)} />
          <Field label="Base" value={wall.base} unit="m" min={0.8} step={0.1} onChange={(v) => update('base', v)} />
          <Field label="Stem" value={wall.stem} unit="m" min={0.2} step={0.05} onChange={(v) => update('stem', v)} />
          <Field label="Soil gamma" value={wall.soilGamma} unit="kN/m3" min={10} step={0.5} onChange={(v) => update('soilGamma', v)} />
          <Field label="Phi" value={wall.phi} unit="deg" min={15} max={45} step={1} onChange={(v) => update('phi', v)} />
          <Field label="Surcharge" value={wall.surcharge} unit="kPa" min={0} step={1} onChange={(v) => update('surcharge', v)} />
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Active force" value={fmt(pa, 1)} unit="kN/m" />
          <Metric label="FS sliding" value={fmt(fsSliding, 2)} tone={fsSliding >= 1.5 ? 'good' : 'warn'} />
          <Metric label="FS overturn" value={fmt(fsOverturning, 2)} tone={fsOverturning >= 2 ? 'good' : 'warn'} />
          <Metric label="Ka" value={fmt(ka, 3)} />
        </div>
        <Panel className="p-4"><WallGraphic wall={wall} accent={accent.stroke} onChange={(next) => setWall((prev) => ({ ...prev, ...next }))} /></Panel>
        <Insight ok={fsSliding >= 1.5 && fsOverturning >= 2} title={fsSliding >= 1.5 && fsOverturning >= 2 ? 'Preliminary wall stability is acceptable' : 'Wall stability needs revision'} body="Students can see how geometry and soil friction affect active pressure and safety factors immediately." />
      </div>
    </div>
  );
}

function WallGraphic({ wall, accent, onChange }: { wall: { height: number; base: number }; accent: string; onChange: (next: Partial<{ height: number; base: number }>) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<'height' | 'base' | null>(null);
  const topY = 220 - (clamp(wall.height, 1, 8) / 8) * 150;
  const baseX = 260 + (clamp(wall.base, 0.8, 6) / 6) * 240;
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const p = svgPointer(e, svgRef.current);
    if (drag === 'height') onChange({ height: Number(clamp(((220 - p.y) / 150) * 8, 1, 8).toFixed(2)) });
    if (drag === 'base') onChange({ base: Number(clamp(((p.x - 260) / 240) * 6, 0.8, 6).toFixed(2)) });
  };
  const start = (kind: 'height' | 'base') => (e: React.PointerEvent<SVGElement>) => { setDrag(kind); svgRef.current?.setPointerCapture(e.pointerId); };
  const stop = (e: React.PointerEvent<SVGSVGElement>) => { setDrag(null); if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId); };
  return (
    <svg ref={svgRef} viewBox="0 0 640 300" className="h-72 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="18" y="18" width="604" height="264" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <path d="M360 76 L574 220 L360 220 Z" fill="rgba(217,119,6,0.22)" />
      <rect x="248" y={topY} width="36" height={220 - topY} fill="rgba(226,232,240,0.65)" />
      <rect x="190" y="220" width={baseX - 190} height="28" rx="5" fill="rgba(226,232,240,0.65)" />
      <line x1="470" y1="122" x2="316" y2="154" stroke={accent} strokeWidth="4" markerEnd="url(#wallArrow)" />
      <defs><marker id="wallArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={accent} /></marker></defs>
      <circle cx="266" cy={topY} r="24" fill="transparent" className="cursor-ns-resize" onPointerDown={start('height')} />
      <DragKnob x={266} y={topY} accent={accent} label="H" />
      <circle cx={baseX} cy="234" r="24" fill="transparent" className="cursor-ew-resize" onPointerDown={start('base')} />
      <DragKnob x={baseX} y={234} accent={accent} label="B" />
    </svg>
  );
}

function WaterNetworkStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [net, setNet] = useState({ demand: 42, diameter: 180, length: 420, roughnessC: 120, reservoirHead: 38, loopImbalance: 8 });
  const q = net.demand / 1000;
  const d = net.diameter / 1000;
  const velocity = q / Math.max(Math.PI * d * d / 4, 0.00001);
  const headLoss = 10.67 * net.length * Math.pow(q, 1.852) / (Math.pow(net.roughnessC, 1.852) * Math.pow(Math.max(d, 0.01), 4.87));
  const residual = net.reservoirHead - headLoss - net.loopImbalance;
  const update = (field: keyof typeof net, value: number) => setNet((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel><PanelHeader title="Network Inputs" caption="Drag demand node and pipe diameter handle in the loop." icon={<Drop size={18} weight="duotone" />} accent={accent} />
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="Demand" value={net.demand} unit="L/s" min={1} step={1} onChange={(v) => update('demand', v)} />
          <Field label="Diameter" value={net.diameter} unit="mm" min={50} step={10} onChange={(v) => update('diameter', v)} />
          <Field label="Length" value={net.length} unit="m" min={50} step={10} onChange={(v) => update('length', v)} />
          <Field label="H-W C" value={net.roughnessC} min={70} step={5} onChange={(v) => update('roughnessC', v)} />
          <Field label="Head" value={net.reservoirHead} unit="m" min={5} step={1} onChange={(v) => update('reservoirHead', v)} />
          <Field label="Loop imbalance" value={net.loopImbalance} unit="m" step={0.5} onChange={(v) => update('loopImbalance', v)} />
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Velocity" value={fmt(velocity, 2)} unit="m/s" tone={velocity < 2.5 ? 'good' : 'warn'} />
          <Metric label="Head loss" value={fmt(headLoss, 2)} unit="m" />
          <Metric label="Residual head" value={fmt(residual, 2)} unit="m" tone={residual >= 7 ? 'good' : 'warn'} />
          <Metric label="Flow" value={fmt(net.demand, 1)} unit="L/s" />
        </div>
        <Panel className="p-4"><NetworkGraphic net={net} accent={accent.stroke} onChange={(next) => setNet((prev) => ({ ...prev, ...next }))} /></Panel>
      </div>
    </div>
  );
}

function NetworkGraphic({ net, accent, onChange }: { net: { demand: number; diameter: number }; accent: string; onChange: (next: Partial<{ demand: number; diameter: number }>) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<'demand' | 'diameter' | null>(null);
  const demandY = 212 - (clamp(net.demand, 1, 120) / 120) * 132;
  const diameterX = 132 + (clamp(net.diameter, 50, 500) - 50) / 450 * 380;
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const p = svgPointer(e, svgRef.current);
    if (drag === 'demand') onChange({ demand: Math.round(clamp(((212 - p.y) / 132) * 120, 1, 120)) });
    if (drag === 'diameter') onChange({ diameter: Math.round(clamp(50 + ((p.x - 132) / 380) * 450, 50, 500) / 10) * 10 });
  };
  const start = (kind: 'demand' | 'diameter') => (e: React.PointerEvent<SVGElement>) => { setDrag(kind); svgRef.current?.setPointerCapture(e.pointerId); };
  const stop = (e: React.PointerEvent<SVGSVGElement>) => { setDrag(null); if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId); };
  return (
    <svg ref={svgRef} viewBox="0 0 640 300" className="h-72 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="18" y="18" width="604" height="264" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <polyline points="132,92 512,92 512,212 132,212 132,92" fill="none" stroke={accent} strokeWidth={clamp(net.diameter / 40, 3, 12)} strokeLinejoin="round" opacity="0.75" />
      {[[132,92],[512,92],[512,212],[132,212]].map(([x,y], i) => <circle key={i} cx={x} cy={y} r="16" fill="rgba(15,23,42,1)" stroke={accent} strokeWidth="4" />)}
      <circle cx="512" cy={demandY} r="24" fill="transparent" className="cursor-ns-resize" onPointerDown={start('demand')} />
      <DragKnob x={512} y={demandY} accent="#fb7185" label="D" />
      <circle cx={diameterX} cy="92" r="24" fill="transparent" className="cursor-ew-resize" onPointerDown={start('diameter')} />
      <DragKnob x={diameterX} y={92} accent={accent} label="dia" />
    </svg>
  );
}

function OpenChannelStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [channel, setChannel] = useState({ bottomWidth: 2.2, depth: 1.1, sideSlope: 1.5, slope: 0.0012, n: 0.015 });
  const area = channel.depth * (channel.bottomWidth + channel.sideSlope * channel.depth);
  const perimeter = channel.bottomWidth + 2 * channel.depth * Math.sqrt(1 + channel.sideSlope * channel.sideSlope);
  const r = area / Math.max(perimeter, 0.01);
  const q = (1 / channel.n) * area * Math.pow(r, 2 / 3) * Math.sqrt(channel.slope);
  const velocity = q / Math.max(area, 0.01);
  const froude = velocity / Math.sqrt(9.81 * Math.max(channel.depth, 0.01));
  const update = (field: keyof typeof channel, value: number) => setChannel((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel><PanelHeader title="Canal Inputs" caption="Drag water depth and bottom width in the channel section." icon={<Drop size={18} weight="duotone" />} accent={accent} />
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="Bottom width" value={channel.bottomWidth} unit="m" min={0.3} step={0.1} onChange={(v) => update('bottomWidth', v)} />
          <Field label="Depth" value={channel.depth} unit="m" min={0.1} step={0.1} onChange={(v) => update('depth', v)} />
          <Field label="Side slope" value={channel.sideSlope} min={0} step={0.1} onChange={(v) => update('sideSlope', v)} />
          <Field label="Bed slope" value={channel.slope} min={0.0001} step={0.0001} onChange={(v) => update('slope', v)} />
          <Field label="Manning n" value={channel.n} min={0.01} step={0.001} onChange={(v) => update('n', v)} />
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Discharge" value={fmt(q, 2)} unit="m3/s" />
          <Metric label="Velocity" value={fmt(velocity, 2)} unit="m/s" />
          <Metric label="Froude" value={fmt(froude, 2)} tone={froude < 1 ? 'good' : 'warn'} />
          <Metric label="Hydraulic R" value={fmt(r, 2)} unit="m" />
        </div>
        <Panel className="p-4"><ChannelGraphic channel={channel} accent={accent.stroke} onChange={(next) => setChannel((prev) => ({ ...prev, ...next }))} /></Panel>
      </div>
    </div>
  );
}

function ChannelGraphic({ channel, accent, onChange }: { channel: { bottomWidth: number; depth: number; sideSlope: number }; accent: string; onChange: (next: Partial<{ bottomWidth: number; depth: number }>) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<'width' | 'depth' | null>(null);
  const baseW = (clamp(channel.bottomWidth, 0.3, 8) / 8) * 300;
  const depthPx = (clamp(channel.depth, 0.1, 4) / 4) * 140;
  const left = 320 - baseW / 2;
  const right = 320 + baseW / 2;
  const waterY = 220 - depthPx;
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const p = svgPointer(e, svgRef.current);
    if (drag === 'width') onChange({ bottomWidth: Number(clamp((Math.abs(p.x - 320) * 2 / 300) * 8, 0.3, 8).toFixed(2)) });
    if (drag === 'depth') onChange({ depth: Number(clamp(((220 - p.y) / 140) * 4, 0.1, 4).toFixed(2)) });
  };
  const start = (kind: 'width' | 'depth') => (e: React.PointerEvent<SVGElement>) => { setDrag(kind); svgRef.current?.setPointerCapture(e.pointerId); };
  const stop = (e: React.PointerEvent<SVGSVGElement>) => { setDrag(null); if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId); };
  return (
    <svg ref={svgRef} viewBox="0 0 640 300" className="h-72 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="18" y="18" width="604" height="264" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <polygon points={`${left - channel.sideSlope * 35},80 ${left},220 ${right},220 ${right + channel.sideSlope * 35},80`} fill="rgba(217,119,6,0.18)" stroke="rgba(226,232,240,0.55)" strokeWidth="3" />
      <polygon points={`${left - channel.sideSlope * 20},${waterY} ${left},220 ${right},220 ${right + channel.sideSlope * 20},${waterY}`} fill={accent} opacity="0.35" />
      <circle cx={right} cy="220" r="22" fill="transparent" className="cursor-ew-resize" onPointerDown={start('width')} />
      <DragKnob x={right} y={220} accent={accent} label="b" />
      <circle cx="520" cy={waterY} r="22" fill="transparent" className="cursor-ns-resize" onPointerDown={start('depth')} />
      <DragKnob x={520} y={waterY} accent={accent} label="y" />
    </svg>
  );
}

function PavementStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [pavement, setPavement] = useState({ cbr: 6, msa: 25, subbase: 200, base: 250, bituminous: 120, axleLoad: 80 });
  const required = 160 + pavement.msa * 3 + Math.max(0, 10 - pavement.cbr) * 18;
  const provided = pavement.subbase + pavement.base + pavement.bituminous;
  const stressIndex = pavement.axleLoad * pavement.axleLoad / Math.max(pavement.cbr * provided, 1);
  const update = (field: keyof typeof pavement, value: number) => setPavement((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel><PanelHeader title="Pavement Inputs" caption="Drag layer thicknesses in the section." icon={<Path size={18} weight="duotone" />} accent={accent} />
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="CBR" value={pavement.cbr} unit="%" min={2} step={1} onChange={(v) => update('cbr', v)} />
          <Field label="Traffic" value={pavement.msa} unit="MSA" min={1} step={1} onChange={(v) => update('msa', v)} />
          <Field label="Bituminous" value={pavement.bituminous} unit="mm" min={40} step={10} onChange={(v) => update('bituminous', v)} />
          <Field label="Base" value={pavement.base} unit="mm" min={100} step={10} onChange={(v) => update('base', v)} />
          <Field label="Subbase" value={pavement.subbase} unit="mm" min={100} step={10} onChange={(v) => update('subbase', v)} />
          <Field label="Axle load" value={pavement.axleLoad} unit="kN" min={20} step={5} onChange={(v) => update('axleLoad', v)} />
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Required" value={fmt(required, 0)} unit="mm" />
          <Metric label="Provided" value={fmt(provided, 0)} unit="mm" tone={provided >= required ? 'good' : 'warn'} />
          <Metric label="Reserve" value={fmt(provided - required, 0)} unit="mm" tone={provided >= required ? 'good' : 'warn'} />
          <Metric label="Stress index" value={fmt(stressIndex, 2)} />
        </div>
        <Panel className="p-4"><PavementGraphic pavement={pavement} accent={accent.stroke} onChange={(next) => setPavement((prev) => ({ ...prev, ...next }))} /></Panel>
      </div>
    </div>
  );
}

function PavementGraphic({ pavement, accent, onChange }: { pavement: { bituminous: number; base: number; subbase: number }; accent: string; onChange: (next: Partial<{ bituminous: number; base: number; subbase: number }>) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<'bituminous' | 'base' | 'subbase' | null>(null);
  const total = Math.max(pavement.bituminous + pavement.base + pavement.subbase, 1);
  const y0 = 72;
  const scale = 150 / total;
  const h1 = pavement.bituminous * scale;
  const h2 = pavement.base * scale;
  const h3 = pavement.subbase * scale;
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const p = svgPointer(e, svgRef.current);
    const mm = Math.round(clamp((p.y - y0) / 150 * 700, 40, 700) / 10) * 10;
    if (drag === 'bituminous') onChange({ bituminous: clamp(mm, 40, 250) });
    if (drag === 'base') onChange({ base: clamp(mm, 100, 450) });
    if (drag === 'subbase') onChange({ subbase: clamp(mm, 100, 500) });
  };
  const start = (kind: 'bituminous' | 'base' | 'subbase') => (e: React.PointerEvent<SVGElement>) => { setDrag(kind); svgRef.current?.setPointerCapture(e.pointerId); };
  const stop = (e: React.PointerEvent<SVGSVGElement>) => { setDrag(null); if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId); };
  return (
    <svg ref={svgRef} viewBox="0 0 640 300" className="h-72 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="18" y="18" width="604" height="264" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <rect x="116" y={y0} width="408" height={h1} fill="#334155" />
      <rect x="116" y={y0 + h1} width="408" height={h2} fill={accent} opacity="0.55" />
      <rect x="116" y={y0 + h1 + h2} width="408" height={h3} fill="rgba(217,119,6,0.32)" />
      {[['bituminous', y0 + h1], ['base', y0 + h1 + h2], ['subbase', y0 + h1 + h2 + h3]].map(([kind, y]) => (
        <g key={kind as string}>
          <circle cx="540" cy={y as number} r="22" fill="transparent" className="cursor-ns-resize" onPointerDown={start(kind as 'bituminous' | 'base' | 'subbase')} />
          <DragKnob x={540} y={y as number} accent={accent} label={(kind as string).slice(0, 3)} />
        </g>
      ))}
    </svg>
  );
}

function LevelingStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [points, setPoints] = useState([
    { id: 'BM', bs: 1.24, is: 0, fs: 0, rl: 100 },
    { id: 'P1', bs: 0, is: 1.65, fs: 0, rl: 0 },
    { id: 'P2', bs: 0, is: 1.18, fs: 0, rl: 0 },
    { id: 'CP', bs: 1.05, is: 0, fs: 2.1, rl: 0 },
    { id: 'TBM', bs: 0, is: 0, fs: 1.72, rl: 0 },
  ]);
  const rows = useMemo(() => {
    let hi = points[0].rl + points[0].bs;
    return points.map((p, i) => {
      const rl = i === 0 ? p.rl : hi - (p.is || p.fs);
      if (p.bs && i > 0) hi = rl + p.bs;
      return { ...p, rl, hi };
    });
  }, [points]);
  const closure = rows[rows.length - 1].rl - 100.47;
  const update = (index: number, field: keyof (typeof points)[number], value: number | string) => setPoints((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  return (
    <div className="grid gap-4 xl:grid-cols-[500px_1fr]">
      <Panel><PanelHeader title="Level Book" caption="Drag staff points in the profile to change readings." icon={<Compass size={18} weight="duotone" />} accent={accent} />
        <div className="space-y-2 p-4">
          {points.map((p, i) => <div key={p.id} className="grid grid-cols-[56px_1fr_1fr_1fr] gap-2"><input value={p.id} onChange={(e) => update(i, 'id', e.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#0B1018] px-2 text-sm font-black text-white outline-none" /><Field label="BS" value={p.bs} step={0.01} onChange={(v) => update(i, 'bs', v)} /><Field label="IS" value={p.is} step={0.01} onChange={(v) => update(i, 'is', v)} /><Field label="FS" value={p.fs} step={0.01} onChange={(v) => update(i, 'fs', v)} /></div>)}
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Final RL" value={fmt(rows[rows.length - 1].rl, 3)} unit="m" />
          <Metric label="Closure" value={fmt(closure, 3)} unit="m" tone={Math.abs(closure) <= 0.02 ? 'good' : 'warn'} />
          <Metric label="Stations" value={points.length} />
        </div>
        <Panel className="p-4"><LevelingGraphic rows={rows} accent={accent.stroke} onChange={(index, reading) => update(index, rows[index].fs ? 'fs' : rows[index].is ? 'is' : 'bs', reading)} /></Panel>
      </div>
    </div>
  );
}

function LevelingGraphic({ rows, accent, onChange }: { rows: Array<{ id: string; rl: number; bs: number; is: number; fs: number }>; accent: string; onChange: (index: number, reading: number) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const minRl = Math.min(...rows.map((r) => r.rl)) - 0.5;
  const maxRl = Math.max(...rows.map((r) => r.rl)) + 0.5;
  const toY = (rl: number) => 230 - ((rl - minRl) / Math.max(maxRl - minRl, 1)) * 150;
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragIndex === null) return;
    const p = svgPointer(e, svgRef.current);
    onChange(dragIndex, Number(clamp((p.y - 40) / 170 * 3, 0, 3).toFixed(2)));
  };
  const start = (index: number) => (e: React.PointerEvent<SVGElement>) => { setDragIndex(index); svgRef.current?.setPointerCapture(e.pointerId); };
  const stop = (e: React.PointerEvent<SVGSVGElement>) => { setDragIndex(null); if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId); };
  return (
    <svg ref={svgRef} viewBox="0 0 640 300" className="h-72 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="18" y="18" width="604" height="264" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <polyline points={rows.map((r, i) => `${80 + i * 110},${toY(r.rl)}`).join(' ')} fill="none" stroke={accent} strokeWidth="4" />
      {rows.map((r, i) => <g key={r.id}><circle cx={80 + i * 110} cy={toY(r.rl)} r="20" fill="transparent" className="cursor-ns-resize" onPointerDown={start(i)} /><DragKnob x={80 + i * 110} y={toY(r.rl)} accent={accent} label={r.id} /></g>)}
    </svg>
  );
}

function MixDesignStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [mix, setMix] = useState({ grade: 30, wc: 0.45, water: 186, sandZoneFactor: 0.62, coarseFactor: 0.64, moisture: 2 });
  const target = mix.grade + 1.65 * 5;
  const cement = mix.water / Math.max(mix.wc, 0.25);
  const fineAgg = (1 - mix.coarseFactor) * 1700 * mix.sandZoneFactor;
  const coarseAgg = mix.coarseFactor * 1700;
  const correctedWater = mix.water * (1 - mix.moisture / 100);
  const update = (field: keyof typeof mix, value: number) => setMix((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel><PanelHeader title="Mix Inputs" caption="Drag water-cement and aggregate balance handles." icon={<Wall size={18} weight="duotone" />} accent={accent} />
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="Grade" value={mix.grade} unit="MPa" min={15} step={5} onChange={(v) => update('grade', v)} />
          <Field label="W/C" value={mix.wc} min={0.25} max={0.65} step={0.01} onChange={(v) => update('wc', v)} />
          <Field label="Water" value={mix.water} unit="kg" min={120} step={5} onChange={(v) => update('water', v)} />
          <Field label="Fine factor" value={mix.sandZoneFactor} min={0.4} max={0.8} step={0.01} onChange={(v) => update('sandZoneFactor', v)} />
          <Field label="Coarse factor" value={mix.coarseFactor} min={0.45} max={0.75} step={0.01} onChange={(v) => update('coarseFactor', v)} />
          <Field label="Moisture" value={mix.moisture} unit="%" min={0} step={0.5} onChange={(v) => update('moisture', v)} />
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Target mean" value={fmt(target, 1)} unit="MPa" />
          <Metric label="Cement" value={fmt(cement, 0)} unit="kg/m3" tone={cement >= 300 ? 'good' : 'warn'} />
          <Metric label="Fine agg." value={fmt(fineAgg, 0)} unit="kg" />
          <Metric label="Coarse agg." value={fmt(coarseAgg, 0)} unit="kg" />
        </div>
        <Panel className="p-4"><MixGraphic mix={mix} accent={accent.stroke} onChange={(next) => setMix((prev) => ({ ...prev, ...next }))} /></Panel>
        <Panel className="p-4"><ResultLine label="Corrected water" value={`${fmt(correctedWater, 1)} kg/m3`} /><ResultLine label="Nominal proportion" value={`1 : ${fmt(fineAgg / cement, 2)} : ${fmt(coarseAgg / cement, 2)}`} /></Panel>
      </div>
    </div>
  );
}

function MixGraphic({ mix, accent, onChange }: { mix: { wc: number; coarseFactor: number }; accent: string; onChange: (next: Partial<{ wc: number; coarseFactor: number }>) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<'wc' | 'agg' | null>(null);
  const wcX = 110 + ((clamp(mix.wc, 0.25, 0.65) - 0.25) / 0.4) * 420;
  const aggX = 110 + ((clamp(mix.coarseFactor, 0.45, 0.75) - 0.45) / 0.3) * 420;
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const p = svgPointer(e, svgRef.current);
    if (drag === 'wc') onChange({ wc: Number(clamp(0.25 + ((p.x - 110) / 420) * 0.4, 0.25, 0.65).toFixed(2)) });
    if (drag === 'agg') onChange({ coarseFactor: Number(clamp(0.45 + ((p.x - 110) / 420) * 0.3, 0.45, 0.75).toFixed(2)) });
  };
  const start = (kind: 'wc' | 'agg') => (e: React.PointerEvent<SVGElement>) => { setDrag(kind); svgRef.current?.setPointerCapture(e.pointerId); };
  const stop = (e: React.PointerEvent<SVGSVGElement>) => { setDrag(null); if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId); };
  return (
    <svg ref={svgRef} viewBox="0 0 640 280" className="h-64 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="18" y="18" width="604" height="244" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      <line x1="110" y1="96" x2="530" y2="96" stroke={accent} strokeWidth="8" opacity="0.35" />
      <line x1="110" y1="176" x2="530" y2="176" stroke={accent} strokeWidth="8" opacity="0.35" />
      <circle cx={wcX} cy="96" r="24" fill="transparent" className="cursor-ew-resize" onPointerDown={start('wc')} /><DragKnob x={wcX} y={96} accent={accent} label="w/c" />
      <circle cx={aggX} cy="176" r="24" fill="transparent" className="cursor-ew-resize" onPointerDown={start('agg')} /><DragKnob x={aggX} y={176} accent={accent} label="agg" />
    </svg>
  );
}

function CostEstimatorStudio({ accent }: { accent: typeof accentClasses[string] }) {
  const [job, setJob] = useState({ floorArea: 180, floors: 2, excavation: 80, rccRate: 7200, masonryRate: 950, finishRate: 1250, steelKgM2: 42 });
  const rccVolume = job.floorArea * job.floors * 0.18;
  const steel = job.floorArea * job.floors * job.steelKgM2;
  const masonry = job.floorArea * job.floors * 0.45;
  const finishing = job.floorArea * job.floors;
  const total = job.excavation * 280 + rccVolume * job.rccRate + masonry * job.masonryRate + finishing * job.finishRate + steel * 70;
  const update = (field: keyof typeof job, value: number) => setJob((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel><PanelHeader title="Estimator Inputs" caption="Drag building footprint and floor stack to change cost." icon={<Calculator size={18} weight="duotone" />} accent={accent} />
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="Floor area" value={job.floorArea} unit="m2" min={20} step={10} onChange={(v) => update('floorArea', v)} />
          <Field label="Floors" value={job.floors} min={1} step={1} onChange={(v) => update('floors', Math.round(v))} />
          <Field label="Excavation" value={job.excavation} unit="m3" min={0} step={5} onChange={(v) => update('excavation', v)} />
          <Field label="RCC rate" value={job.rccRate} unit="/m3" min={0} step={100} onChange={(v) => update('rccRate', v)} />
          <Field label="Masonry rate" value={job.masonryRate} unit="/m2" min={0} step={50} onChange={(v) => update('masonryRate', v)} />
          <Field label="Finish rate" value={job.finishRate} unit="/m2" min={0} step={50} onChange={(v) => update('finishRate', v)} />
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Total cost" value={fmtCompact(total, 0)} unit="INR" />
          <Metric label="RCC" value={fmt(rccVolume, 1)} unit="m3" />
          <Metric label="Steel" value={fmt(steel, 0)} unit="kg" />
          <Metric label="Rate/m2" value={fmtCompact(total / Math.max(job.floorArea * job.floors, 1), 0)} unit="INR" />
        </div>
        <Panel className="p-4"><CostGraphic job={job} accent={accent.stroke} onChange={(next) => setJob((prev) => ({ ...prev, ...next }))} /></Panel>
        <Panel className="p-4"><ResultLine label="RCC cost" value={`INR ${fmtCompact(rccVolume * job.rccRate, 0)}`} /><ResultLine label="Masonry cost" value={`INR ${fmtCompact(masonry * job.masonryRate, 0)}`} /><ResultLine label="Finishing cost" value={`INR ${fmtCompact(finishing * job.finishRate, 0)}`} /></Panel>
      </div>
    </div>
  );
}

function CostGraphic({ job, accent, onChange }: { job: { floorArea: number; floors: number }; accent: string; onChange: (next: Partial<{ floorArea: number; floors: number }>) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<'area' | 'floors' | null>(null);
  const w = 140 + (clamp(job.floorArea, 20, 600) / 600) * 260;
  const floorsH = clamp(job.floors, 1, 12) * 16;
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const p = svgPointer(e, svgRef.current);
    if (drag === 'area') onChange({ floorArea: Math.round(clamp(((p.x - 120) / 260) * 600, 20, 600) / 10) * 10 });
    if (drag === 'floors') onChange({ floors: Math.round(clamp((210 - p.y) / 16, 1, 12)) });
  };
  const start = (kind: 'area' | 'floors') => (e: React.PointerEvent<SVGElement>) => { setDrag(kind); svgRef.current?.setPointerCapture(e.pointerId); };
  const stop = (e: React.PointerEvent<SVGSVGElement>) => { setDrag(null); if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId); };
  return (
    <svg ref={svgRef} viewBox="0 0 640 300" className="h-72 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="18" y="18" width="604" height="264" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      {Array.from({ length: job.floors }, (_, i) => <rect key={i} x="180" y={210 - (i + 1) * 16} width={w} height="15" fill={i % 2 ? 'rgba(226,232,240,0.22)' : accent} opacity={i % 2 ? 1 : 0.42} stroke="rgba(226,232,240,0.25)" />)}
      <circle cx={180 + w} cy="210" r="24" fill="transparent" className="cursor-ew-resize" onPointerDown={start('area')} /><DragKnob x={180 + w} y={210} accent={accent} label="area" />
      <circle cx="160" cy={210 - floorsH} r="24" fill="transparent" className="cursor-ns-resize" onPointerDown={start('floors')} /><DragKnob x={160} y={210 - floorsH} accent={accent} label="floors" />
    </svg>
  );
}

type AdvancedToolKind = Exclude<
  CivilStudioTool,
  | 'structural'
  | 'geotech'
  | 'hydraulics'
  | 'survey'
  | 'cad'
  | 'transport'
  | 'environment'
  | 'concrete'
  | 'estimation'
  | 'planning'
  | 'steel'
  | 'retaining'
  | 'waterNetwork'
  | 'openChannel'
  | 'pavement'
  | 'leveling'
  | 'mixDesign'
  | 'costEstimator'
>;

function isAdvancedCivilTool(tool: CivilStudioTool): tool is AdvancedToolKind {
  return [
    'frame',
    'truss',
    'soilLab',
    'earthwork',
    'bridge',
    'columnFooting',
    'masonry',
    'rebar',
    'formwork',
    'pile',
    'seismic',
    'wind',
    'services',
    'equipment',
    'qcLab',
    'tender',
    'siteLayout',
    'bimRevit',
    'bbs',
    'rateAnalysis',
    'isCodeChecker',
    'safetyInspection',
    'draftingPractice',
    'staadFrame',
    'projectControl',
    'claimsDelay',
    'qaDocs',
    'setout',
    'roadCrossSection',
    'stormwater',
    'drawingTakeoff',
  ].includes(tool);
}

type AdvancedInput = {
  key: 'a' | 'b' | 'c' | 'd';
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
};

type AdvancedValues = Record<'a' | 'b' | 'c' | 'd', number>;

const advancedToolInputs: Record<AdvancedToolKind, { icon: React.ReactNode; caption: string; inputs: AdvancedInput[]; initial: AdvancedValues }> = {
  frame: {
    icon: <Blueprint size={18} weight="duotone" />,
    caption: 'Drag bay span and lateral load in the frame view.',
    inputs: [
      { key: 'a', label: 'Bay span', unit: 'm', min: 3, max: 12, step: 0.5 },
      { key: 'b', label: 'Storey height', unit: 'm', min: 2.5, max: 6, step: 0.1 },
      { key: 'c', label: 'Lateral load', unit: 'kN', min: 0, max: 500, step: 10 },
      { key: 'd', label: 'EI factor', min: 0.5, max: 5, step: 0.1 },
    ],
    initial: { a: 6, b: 3.4, c: 120, d: 1.6 },
  },
  truss: {
    icon: <Blueprint size={18} weight="duotone" />,
    caption: 'Drag span and apex height to reshape the truss.',
    inputs: [
      { key: 'a', label: 'Span', unit: 'm', min: 6, max: 30, step: 1 },
      { key: 'b', label: 'Apex height', unit: 'm', min: 1, max: 8, step: 0.2 },
      { key: 'c', label: 'Joint load', unit: 'kN', min: 10, max: 300, step: 5 },
      { key: 'd', label: 'Panels', min: 3, max: 10, step: 1 },
    ],
    initial: { a: 18, b: 4, c: 80, d: 6 },
  },
  soilLab: {
    icon: <Stack size={18} weight="duotone" />,
    caption: 'Drag liquid limit and moisture to classify and tune compaction.',
    inputs: [
      { key: 'a', label: 'Liquid limit', unit: '%', min: 15, max: 90, step: 1 },
      { key: 'b', label: 'Plasticity index', unit: '%', min: 0, max: 50, step: 1 },
      { key: 'c', label: 'Moisture', unit: '%', min: 4, max: 28, step: 0.5 },
      { key: 'd', label: 'Gravel+sand', unit: '%', min: 10, max: 95, step: 1 },
    ],
    initial: { a: 42, b: 18, c: 14, d: 62 },
  },
  earthwork: {
    icon: <Compass size={18} weight="duotone" />,
    caption: 'Drag formation level and grid spacing to balance cut-fill.',
    inputs: [
      { key: 'a', label: 'Grid spacing', unit: 'm', min: 5, max: 50, step: 5 },
      { key: 'b', label: 'Formation RL', unit: 'm', min: 98, max: 106, step: 0.1 },
      { key: 'c', label: 'Plot length', unit: 'm', min: 20, max: 200, step: 5 },
      { key: 'd', label: 'Plot width', unit: 'm', min: 20, max: 160, step: 5 },
    ],
    initial: { a: 20, b: 102.4, c: 100, d: 70 },
  },
  bridge: {
    icon: <Path size={18} weight="duotone" />,
    caption: 'Drag span and moving load across the bridge deck.',
    inputs: [
      { key: 'a', label: 'Span', unit: 'm', min: 8, max: 60, step: 1 },
      { key: 'b', label: 'Live load', unit: 'kN', min: 50, max: 1200, step: 25 },
      { key: 'c', label: 'Load position', unit: '%', min: 5, max: 95, step: 5 },
      { key: 'd', label: 'Girders', min: 2, max: 8, step: 1 },
    ],
    initial: { a: 24, b: 450, c: 45, d: 4 },
  },
  columnFooting: {
    icon: <Wall size={18} weight="duotone" />,
    caption: 'Drag axial load and footing size to check soil pressure.',
    inputs: [
      { key: 'a', label: 'Axial load', unit: 'kN', min: 200, max: 5000, step: 50 },
      { key: 'b', label: 'Moment', unit: 'kN-m', min: 0, max: 500, step: 10 },
      { key: 'c', label: 'Footing size', unit: 'm', min: 1, max: 5, step: 0.1 },
      { key: 'd', label: 'SBC', unit: 'kPa', min: 75, max: 400, step: 5 },
    ],
    initial: { a: 1200, b: 90, c: 2.6, d: 180 },
  },
  masonry: {
    icon: <Wall size={18} weight="duotone" />,
    caption: 'Drag wall height and opening ratio.',
    inputs: [
      { key: 'a', label: 'Wall height', unit: 'm', min: 2, max: 6, step: 0.1 },
      { key: 'b', label: 'Thickness', unit: 'mm', min: 115, max: 350, step: 5 },
      { key: 'c', label: 'Opening ratio', unit: '%', min: 0, max: 60, step: 5 },
      { key: 'd', label: 'Load', unit: 'kN/m', min: 10, max: 250, step: 5 },
    ],
    initial: { a: 3.2, b: 230, c: 18, d: 82 },
  },
  rebar: {
    icon: <Wall size={18} weight="duotone" />,
    caption: 'Drag bar spacing and lap position to update detailing.',
    inputs: [
      { key: 'a', label: 'Bar dia', unit: 'mm', min: 8, max: 32, step: 2 },
      { key: 'b', label: 'Spacing', unit: 'mm', min: 75, max: 300, step: 25 },
      { key: 'c', label: 'Lap factor', unit: 'd', min: 30, max: 60, step: 5 },
      { key: 'd', label: 'Beam length', unit: 'm', min: 2, max: 12, step: 0.5 },
    ],
    initial: { a: 16, b: 150, c: 45, d: 6 },
  },
  formwork: {
    icon: <Cube size={18} weight="duotone" />,
    caption: 'Drag slab area and prop spacing.',
    inputs: [
      { key: 'a', label: 'Slab area', unit: 'm2', min: 20, max: 600, step: 10 },
      { key: 'b', label: 'Prop spacing', unit: 'm', min: 0.6, max: 2.5, step: 0.1 },
      { key: 'c', label: 'Reuse cycles', min: 1, max: 20, step: 1 },
      { key: 'd', label: 'Pour depth', unit: 'mm', min: 100, max: 350, step: 10 },
    ],
    initial: { a: 180, b: 1.2, c: 8, d: 150 },
  },
  pile: {
    icon: <Stack size={18} weight="duotone" />,
    caption: 'Drag pile count and spacing in the pile cap.',
    inputs: [
      { key: 'a', label: 'Pile count', min: 2, max: 16, step: 1 },
      { key: 'b', label: 'Diameter', unit: 'mm', min: 300, max: 1200, step: 50 },
      { key: 'c', label: 'Spacing', unit: 'D', min: 2, max: 5, step: 0.25 },
      { key: 'd', label: 'Soil capacity', unit: 'kN', min: 250, max: 2500, step: 50 },
    ],
    initial: { a: 6, b: 600, c: 3, d: 850 },
  },
  seismic: {
    icon: <Gauge size={18} weight="duotone" />,
    caption: 'Drag seismic coefficient and building height.',
    inputs: [
      { key: 'a', label: 'Seismic coeff.', min: 0.04, max: 0.24, step: 0.01 },
      { key: 'b', label: 'Weight', unit: 'kN', min: 1000, max: 50000, step: 500 },
      { key: 'c', label: 'Height', unit: 'm', min: 6, max: 80, step: 1 },
      { key: 'd', label: 'Storeys', min: 1, max: 20, step: 1 },
    ],
    initial: { a: 0.1, b: 12000, c: 24, d: 8 },
  },
  wind: {
    icon: <Gauge size={18} weight="duotone" />,
    caption: 'Drag wind speed and building height.',
    inputs: [
      { key: 'a', label: 'Wind speed', unit: 'm/s', min: 25, max: 60, step: 1 },
      { key: 'b', label: 'Height', unit: 'm', min: 6, max: 100, step: 1 },
      { key: 'c', label: 'Width', unit: 'm', min: 5, max: 60, step: 1 },
      { key: 'd', label: 'Cp net', min: 0.5, max: 1.8, step: 0.1 },
    ],
    initial: { a: 39, b: 36, c: 18, d: 1.2 },
  },
  services: {
    icon: <Drop size={18} weight="duotone" />,
    caption: 'Drag occupancy and rainfall intensity.',
    inputs: [
      { key: 'a', label: 'Occupancy', min: 20, max: 1000, step: 10 },
      { key: 'b', label: 'Rainfall', unit: 'mm/h', min: 25, max: 200, step: 5 },
      { key: 'c', label: 'Roof area', unit: 'm2', min: 50, max: 3000, step: 50 },
      { key: 'd', label: 'Fire duration', unit: 'h', min: 0.5, max: 4, step: 0.5 },
    ],
    initial: { a: 160, b: 85, c: 650, d: 2 },
  },
  equipment: {
    icon: <Clock size={18} weight="duotone" />,
    caption: 'Drag bucket size and cycle time.',
    inputs: [
      { key: 'a', label: 'Bucket', unit: 'm3', min: 0.3, max: 3, step: 0.1 },
      { key: 'b', label: 'Cycle time', unit: 'min', min: 0.5, max: 8, step: 0.1 },
      { key: 'c', label: 'Efficiency', unit: '%', min: 40, max: 95, step: 5 },
      { key: 'd', label: 'Dumper cap.', unit: 'm3', min: 3, max: 25, step: 1 },
    ],
    initial: { a: 1.2, b: 2.5, c: 75, d: 10 },
  },
  qcLab: {
    icon: <CheckCircle size={18} weight="duotone" />,
    caption: 'Drag cube strength and slump to evaluate quality.',
    inputs: [
      { key: 'a', label: 'Cube strength', unit: 'MPa', min: 10, max: 70, step: 1 },
      { key: 'b', label: 'Target grade', unit: 'MPa', min: 15, max: 50, step: 5 },
      { key: 'c', label: 'Slump', unit: 'mm', min: 10, max: 180, step: 5 },
      { key: 'd', label: 'Density', unit: 'kg/m3', min: 2100, max: 2600, step: 10 },
    ],
    initial: { a: 34, b: 30, c: 85, d: 2400 },
  },
  tender: {
    icon: <Calculator size={18} weight="duotone" />,
    caption: 'Drag quoted rate and risk loading.',
    inputs: [
      { key: 'a', label: 'Estimate', unit: 'L', min: 5, max: 500, step: 5 },
      { key: 'b', label: 'Quote variance', unit: '%', min: -20, max: 30, step: 1 },
      { key: 'c', label: 'Risk loading', unit: '%', min: 0, max: 20, step: 1 },
      { key: 'd', label: 'Competitors', min: 2, max: 8, step: 1 },
    ],
    initial: { a: 120, b: -4, c: 6, d: 4 },
  },
  siteLayout: {
    icon: <Cube size={18} weight="duotone" />,
    caption: 'Drag crane reach and storage area.',
    inputs: [
      { key: 'a', label: 'Crane reach', unit: 'm', min: 10, max: 80, step: 2 },
      { key: 'b', label: 'Storage area', unit: 'm2', min: 50, max: 2000, step: 50 },
      { key: 'c', label: 'Site length', unit: 'm', min: 30, max: 200, step: 5 },
      { key: 'd', label: 'Safety buffer', unit: 'm', min: 2, max: 15, step: 1 },
    ],
    initial: { a: 42, b: 450, c: 90, d: 6 },
  },
  bimRevit: {
    icon: <Cube size={18} weight="duotone" />,
    caption: 'Drag floor count and model area to update BIM quantities and clash risk.',
    inputs: [
      { key: 'a', label: 'Floor area', unit: 'm2', min: 80, max: 4000, step: 20 },
      { key: 'b', label: 'Levels', min: 1, max: 30, step: 1 },
      { key: 'c', label: 'Grid spacing', unit: 'm', min: 3, max: 10, step: 0.5 },
      { key: 'd', label: 'MEP density', unit: '%', min: 5, max: 80, step: 5 },
    ],
    initial: { a: 900, b: 5, c: 6, d: 35 },
  },
  bbs: {
    icon: <Wall size={18} weight="duotone" />,
    caption: 'Drag bar diameter and cutting length to update schedule weight.',
    inputs: [
      { key: 'a', label: 'Bar dia', unit: 'mm', min: 8, max: 32, step: 2 },
      { key: 'b', label: 'Cut length', unit: 'm', min: 1, max: 14, step: 0.25 },
      { key: 'c', label: 'Quantity', unit: 'nos', min: 1, max: 500, step: 1 },
      { key: 'd', label: 'Bend/lap add', unit: '%', min: 0, max: 35, step: 1 },
    ],
    initial: { a: 16, b: 5.6, c: 48, d: 12 },
  },
  rateAnalysis: {
    icon: <Calculator size={18} weight="duotone" />,
    caption: 'Drag material rate and productivity to see item-rate sensitivity.',
    inputs: [
      { key: 'a', label: 'Material cost', unit: '/unit', min: 500, max: 12000, step: 100 },
      { key: 'b', label: 'Labour cost', unit: '/unit', min: 100, max: 5000, step: 50 },
      { key: 'c', label: 'Productivity', unit: 'unit/day', min: 1, max: 80, step: 1 },
      { key: 'd', label: 'OH + profit', unit: '%', min: 5, max: 35, step: 1 },
    ],
    initial: { a: 3200, b: 850, c: 12, d: 18 },
  },
  isCodeChecker: {
    icon: <CheckCircle size={18} weight="duotone" />,
    caption: 'Drag utilization and deflection ratio for a quick code-style pass/fail signal.',
    inputs: [
      { key: 'a', label: 'Demand/capacity', unit: '%', min: 20, max: 140, step: 5 },
      { key: 'b', label: 'Deflection ratio', unit: 'L/', min: 120, max: 500, step: 10 },
      { key: 'c', label: 'Min steel', unit: '%', min: 0.1, max: 2.5, step: 0.1 },
      { key: 'd', label: 'Cover', unit: 'mm', min: 15, max: 75, step: 5 },
    ],
    initial: { a: 78, b: 280, c: 0.85, d: 40 },
  },
  safetyInspection: {
    icon: <WarningCircle size={18} weight="duotone" />,
    caption: 'Drag hazard severity and controls to compute site inspection risk.',
    inputs: [
      { key: 'a', label: 'Hazard severity', min: 1, max: 5, step: 1 },
      { key: 'b', label: 'Likelihood', min: 1, max: 5, step: 1 },
      { key: 'c', label: 'Controls done', unit: '%', min: 0, max: 100, step: 5 },
      { key: 'd', label: 'Open NCRs', min: 0, max: 20, step: 1 },
    ],
    initial: { a: 4, b: 3, c: 70, d: 3 },
  },
  draftingPractice: {
    icon: <Blueprint size={18} weight="duotone" />,
    caption: 'Drag drawing scale and offset accuracy to score drafting readiness.',
    inputs: [
      { key: 'a', label: 'Drawing scale', unit: '1:x', min: 20, max: 200, step: 10 },
      { key: 'b', label: 'Line accuracy', unit: 'mm', min: 0.5, max: 12, step: 0.5 },
      { key: 'c', label: 'Dimensions', unit: 'nos', min: 4, max: 80, step: 1 },
      { key: 'd', label: 'Layer errors', min: 0, max: 25, step: 1 },
    ],
    initial: { a: 100, b: 2, c: 28, d: 4 },
  },
  staadFrame: {
    icon: <Blueprint size={18} weight="duotone" />,
    caption: 'Drag span and load to model a placement-style frame quickly.',
    inputs: [
      { key: 'a', label: 'Span', unit: 'm', min: 3, max: 16, step: 0.5 },
      { key: 'b', label: 'Height', unit: 'm', min: 2.5, max: 8, step: 0.25 },
      { key: 'c', label: 'UDL', unit: 'kN/m', min: 2, max: 80, step: 1 },
      { key: 'd', label: 'Section capacity', unit: 'kN-m', min: 50, max: 1200, step: 25 },
    ],
    initial: { a: 8, b: 3.5, c: 18, d: 420 },
  },
  projectControl: {
    icon: <Clock size={18} weight="duotone" />,
    caption: 'Drag planned and earned progress to evaluate schedule/cost health.',
    inputs: [
      { key: 'a', label: 'Planned value', unit: 'L', min: 10, max: 1000, step: 10 },
      { key: 'b', label: 'Earned value', unit: 'L', min: 5, max: 1000, step: 10 },
      { key: 'c', label: 'Actual cost', unit: 'L', min: 5, max: 1200, step: 10 },
      { key: 'd', label: 'Delay', unit: 'days', min: 0, max: 180, step: 1 },
    ],
    initial: { a: 240, b: 210, c: 230, d: 18 },
  },
  claimsDelay: {
    icon: <Calculator size={18} weight="duotone" />,
    caption: 'Drag delay days and contract value to estimate EOT/LD exposure.',
    inputs: [
      { key: 'a', label: 'Delay days', unit: 'd', min: 0, max: 240, step: 1 },
      { key: 'b', label: 'Excusable delay', unit: '%', min: 0, max: 100, step: 5 },
      { key: 'c', label: 'Contract value', unit: 'L', min: 20, max: 3000, step: 20 },
      { key: 'd', label: 'LD rate', unit: '%/week', min: 0.1, max: 2, step: 0.1 },
    ],
    initial: { a: 42, b: 55, c: 480, d: 0.5 },
  },
  qaDocs: {
    icon: <CheckCircle size={18} weight="duotone" />,
    caption: 'Drag inspection completion and NCR count to score QA readiness.',
    inputs: [
      { key: 'a', label: 'ITP coverage', unit: '%', min: 0, max: 100, step: 5 },
      { key: 'b', label: 'Pour cards', unit: '%', min: 0, max: 100, step: 5 },
      { key: 'c', label: 'Open NCRs', min: 0, max: 30, step: 1 },
      { key: 'd', label: 'Cube tests', unit: '%', min: 0, max: 100, step: 5 },
    ],
    initial: { a: 85, b: 75, c: 4, d: 90 },
  },
  setout: {
    icon: <Compass size={18} weight="duotone" />,
    caption: 'Drag target coordinate and instrument error to check setout tolerance.',
    inputs: [
      { key: 'a', label: 'Easting offset', unit: 'm', min: -50, max: 50, step: 0.5 },
      { key: 'b', label: 'Northing offset', unit: 'm', min: -50, max: 50, step: 0.5 },
      { key: 'c', label: 'Instrument error', unit: 'mm', min: 1, max: 50, step: 1 },
      { key: 'd', label: 'Tolerance', unit: 'mm', min: 5, max: 100, step: 5 },
    ],
    initial: { a: 18, b: 12, c: 8, d: 25 },
  },
  roadCrossSection: {
    icon: <Path size={18} weight="duotone" />,
    caption: 'Drag formation width and cutting depth for road cross-section quantity.',
    inputs: [
      { key: 'a', label: 'Formation width', unit: 'm', min: 3, max: 30, step: 0.5 },
      { key: 'b', label: 'Cut/fill depth', unit: 'm', min: -4, max: 4, step: 0.1 },
      { key: 'c', label: 'Chainage length', unit: 'm', min: 20, max: 2000, step: 20 },
      { key: 'd', label: 'Side slope', unit: 'H:1V', min: 0.5, max: 3, step: 0.25 },
    ],
    initial: { a: 12, b: 1.2, c: 200, d: 1.5 },
  },
  stormwater: {
    icon: <Drop size={18} weight="duotone" />,
    caption: 'Drag catchment area and rainfall intensity to size stormwater pipe.',
    inputs: [
      { key: 'a', label: 'Catchment', unit: 'ha', min: 0.1, max: 80, step: 0.1 },
      { key: 'b', label: 'Rainfall', unit: 'mm/h', min: 20, max: 220, step: 5 },
      { key: 'c', label: 'Runoff coeff.', min: 0.2, max: 0.95, step: 0.05 },
      { key: 'd', label: 'Pipe slope', unit: '%', min: 0.1, max: 5, step: 0.1 },
    ],
    initial: { a: 4.5, b: 95, c: 0.65, d: 0.8 },
  },
  drawingTakeoff: {
    icon: <Blueprint size={18} weight="duotone" />,
    caption: 'Drag drawing length and scale to extract wall, slab and opening quantities.',
    inputs: [
      { key: 'a', label: 'Plan length', unit: 'm', min: 5, max: 120, step: 1 },
      { key: 'b', label: 'Plan width', unit: 'm', min: 5, max: 80, step: 1 },
      { key: 'c', label: 'Wall thickness', unit: 'mm', min: 100, max: 350, step: 10 },
      { key: 'd', label: 'Openings', unit: '%', min: 0, max: 45, step: 5 },
    ],
    initial: { a: 28, b: 18, c: 230, d: 15 },
  },
};

function advancedMetrics(tool: AdvancedToolKind, v: AdvancedValues) {
  switch (tool) {
    case 'frame': {
      const moment = v.c * v.a / 4;
      const drift = (v.c * Math.pow(v.b, 3)) / Math.max(v.d * 900, 1);
      return { m1: ['Base moment', moment, 'kN-m'], m2: ['Drift index', drift, ''], m3: ['Reaction', v.c / 2, 'kN'], m4: ['Stiffness', v.d, 'x'], ok: drift < 1.5 };
    }
    case 'truss': {
      const chord = (v.c * v.a) / Math.max(8 * v.b, 0.1);
      return { m1: ['Chord force', chord, 'kN'], m2: ['Panel length', v.a / v.d, 'm'], m3: ['Web force', v.c / 2, 'kN'], m4: ['Panels', v.d, ''], ok: chord < 600 };
    }
    case 'soilLab': {
      const plasticLimit = v.a - v.b;
      const mdd = 1.65 + Math.max(0, 18 - v.c) * 0.018 + v.d * 0.002;
      return { m1: ['Plastic limit', plasticLimit, '%'], m2: ['MDD estimate', mdd, 'g/cc'], m3: ['OMC delta', v.c - 14, '%'], m4: ['Soil class', v.b > 20 ? 'CI/CH' : 'SM/SC', ''], ok: v.b < 35 };
    }
    case 'earthwork': {
      const area = v.c * v.d;
      const cutFill = (v.b - 101.5) * area;
      return { m1: ['Area', area, 'm2'], m2: ['Net cut/fill', cutFill, 'm3'], m3: ['Grid cells', Math.ceil(area / (v.a * v.a)), ''], m4: ['Haul index', Math.abs(cutFill) / 100, ''], ok: Math.abs(cutFill) < area * 0.8 };
    }
    case 'bridge': {
      const left = v.b * (1 - v.c / 100);
      const moment = v.b * v.a * (v.c / 100) * (1 - v.c / 100);
      return { m1: ['Left reaction', left, 'kN'], m2: ['Max moment', moment, 'kN-m'], m3: ['Per girder', v.b / v.d, 'kN'], m4: ['Position', v.c, '%'], ok: moment < 4000 };
    }
    case 'columnFooting': {
      const pressure = v.a / Math.max(v.c * v.c, 0.01) + (6 * v.b) / Math.max(v.c * v.c * v.c, 0.01);
      return { m1: ['Max pressure', pressure, 'kPa'], m2: ['SBC', v.d, 'kPa'], m3: ['Eccentricity', v.b / v.a, 'm'], m4: ['Area', v.c * v.c, 'm2'], ok: pressure <= v.d };
    }
    case 'masonry': {
      const slenderness = v.a * 1000 / v.b;
      const effectiveLoad = v.d / Math.max(1 - v.c / 100, 0.1);
      return { m1: ['Slenderness', slenderness, ''], m2: ['Eff. load', effectiveLoad, 'kN/m'], m3: ['Opening', v.c, '%'], m4: ['Capacity index', v.b / effectiveLoad, ''], ok: slenderness < 27 && effectiveLoad < 140 };
    }
    case 'rebar': {
      const lap = v.a * v.c;
      const bars = Math.floor((1000 - 50) / v.b) + 1;
      return { m1: ['Lap length', lap, 'mm'], m2: ['Bars / m', bars, ''], m3: ['Steel / m', bars * Math.PI * v.a * v.a / 4, 'mm2'], m4: ['Beam length', v.d, 'm'], ok: v.b <= 200 };
    }
    case 'formwork': {
      const props = Math.ceil(v.a / (v.b * v.b));
      const pressure = 24 * (v.d / 1000);
      return { m1: ['Props', props, 'nos'], m2: ['Panel area/cycle', v.a / v.c, 'm2'], m3: ['Pour pressure', pressure, 'kPa'], m4: ['Reuse', v.c, 'cycles'], ok: v.b <= 1.5 };
    }
    case 'pile': {
      const group = v.a * v.d * Math.min(1, 0.72 + v.c * 0.06);
      return { m1: ['Group capacity', group, 'kN'], m2: ['Efficiency', Math.min(100, (0.72 + v.c * 0.06) * 100), '%'], m3: ['Cap size', Math.sqrt(v.a) * v.c * v.b / 1000, 'm'], m4: ['Pile dia', v.b, 'mm'], ok: v.c >= 2.5 };
    }
    case 'seismic': {
      const base = v.a * v.b;
      const drift = (base * v.c) / Math.max(v.d * 9000, 1);
      return { m1: ['Base shear', base, 'kN'], m2: ['Storey drift', drift, 'mm'], m3: ['Storey shear', base / v.d, 'kN'], m4: ['Height/storey', v.c / v.d, 'm'], ok: drift < 20 };
    }
    case 'wind': {
      const pressure = 0.6 * v.a * v.a / 1000 * v.d;
      const force = pressure * v.b * v.c;
      return { m1: ['Pressure', pressure, 'kPa'], m2: ['Face load', force, 'kN'], m3: ['Overturning', force * v.b / 2, 'kN-m'], m4: ['Speed', v.a, 'm/s'], ok: pressure < 2.5 };
    }
    case 'services': {
      const rainFlow = v.b * v.c / 3600;
      const septic = v.a * 0.12;
      return { m1: ['Rainwater flow', rainFlow, 'L/s'], m2: ['Septic volume', septic, 'm3'], m3: ['Fire tank', v.a * 45 * v.d / 1000, 'm3'], m4: ['Pipes est.', Math.ceil(rainFlow / 6), 'nos'], ok: rainFlow < 80 };
    }
    case 'equipment': {
      const production = v.a * 60 / v.b * (v.c / 100);
      return { m1: ['Production', production, 'm3/h'], m2: ['Dumpers needed', Math.ceil(production / Math.max(v.d * 2.5, 1)), ''], m3: ['Cycle time', v.b, 'min'], m4: ['Efficiency', v.c, '%'], ok: production > 20 };
    }
    case 'qcLab': {
      const strengthRatio = v.a / v.b * 100;
      const workability = v.c >= 50 && v.c <= 125;
      return { m1: ['Strength ratio', strengthRatio, '%'], m2: ['Slump', v.c, 'mm'], m3: ['Density', v.d, 'kg/m3'], m4: ['Grade', v.b, 'MPa'], ok: strengthRatio >= 100 && workability };
    }
    case 'tender': {
      const quote = v.a * (1 + v.b / 100);
      const riskAdjusted = quote * (1 + v.c / 100);
      return { m1: ['Quoted value', quote, 'L'], m2: ['Risk adjusted', riskAdjusted, 'L'], m3: ['Variance', quote - v.a, 'L'], m4: ['Bidders', v.d, ''], ok: v.b > -15 && v.c < 12 };
    }
    case 'siteLayout': {
      const coverage = v.b / Math.max(v.c * v.c * 0.45, 1) * 100;
      const reachOk = v.a > v.c * 0.35;
      return { m1: ['Crane coverage', coverage, '%'], m2: ['Reach', v.a, 'm'], m3: ['Storage', v.b, 'm2'], m4: ['Buffer', v.d, 'm'], ok: reachOk && coverage < 45 };
    }
    case 'bimRevit': {
      const grossArea = v.a * v.b;
      const columns = Math.ceil(v.a / Math.max(v.c * v.c, 1)) * v.b;
      const clashRisk = v.d * v.b / Math.max(v.c, 1);
      return { m1: ['Gross model area', grossArea, 'm2'], m2: ['Grid columns', columns, 'nos'], m3: ['Clash risk', clashRisk, ''], m4: ['Levels', v.b, ''], ok: clashRisk < 45 };
    }
    case 'bbs': {
      const length = v.b * (1 + v.d / 100) * v.c;
      const unitWeight = (v.a * v.a) / 162;
      return { m1: ['Total length', length, 'm'], m2: ['Steel weight', length * unitWeight, 'kg'], m3: ['Unit wt.', unitWeight, 'kg/m'], m4: ['Bars', v.c, 'nos'], ok: v.d <= 20 };
    }
    case 'rateAnalysis': {
      const labourPerUnit = v.b / Math.max(v.c, 1);
      const base = v.a + labourPerUnit;
      const rate = base * (1 + v.d / 100);
      return { m1: ['Item rate', rate, ''], m2: ['Base cost', base, ''], m3: ['Labour/unit', labourPerUnit, ''], m4: ['OH+profit', v.d, '%'], ok: v.d >= 10 && v.d <= 25 };
    }
    case 'isCodeChecker': {
      const deflectionOk = v.b >= 250;
      const steelOk = v.c >= 0.35 && v.c <= 2.2;
      const coverOk = v.d >= 25;
      return { m1: ['Utilization', v.a, '%'], m2: ['Deflection', `L/${fmtCompact(v.b, 0)}`, ''], m3: ['Steel ratio', v.c, '%'], m4: ['Cover', v.d, 'mm'], ok: v.a <= 100 && deflectionOk && steelOk && coverOk };
    }
    case 'safetyInspection': {
      const rawRisk = v.a * v.b * 4;
      const residual = rawRisk * (1 - v.c / 100) + v.d * 2;
      return { m1: ['Risk score', residual, ''], m2: ['Controls', v.c, '%'], m3: ['Open NCRs', v.d, ''], m4: ['Severity x likelihood', v.a * v.b, ''], ok: residual < 18 && v.d <= 5 };
    }
    case 'draftingPractice': {
      const accuracyScore = clamp(100 - v.b * 6 - v.d * 2, 0, 100);
      const checkLoad = v.c + v.d * 3;
      return { m1: ['Drafting score', accuracyScore, '%'], m2: ['Scale', `1:${fmtCompact(v.a, 0)}`, ''], m3: ['Check items', checkLoad, ''], m4: ['Layer errors', v.d, ''], ok: accuracyScore >= 75 && v.d <= 6 };
    }
    case 'staadFrame': {
      const moment = v.c * v.a * v.a / 8;
      const utilization = moment / Math.max(v.d, 1) * 100;
      const lateralIndex = v.c * v.b / Math.max(v.d, 1);
      return { m1: ['Max moment', moment, 'kN-m'], m2: ['Utilization', utilization, '%'], m3: ['Node count', 4, ''], m4: ['Drift index', lateralIndex, ''], ok: utilization <= 100 && lateralIndex < 1 };
    }
    case 'projectControl': {
      const spi = v.b / Math.max(v.a, 1);
      const cpi = v.b / Math.max(v.c, 1);
      const forecast = v.c / Math.max(cpi, 0.1);
      return { m1: ['SPI', spi, ''], m2: ['CPI', cpi, ''], m3: ['Forecast cost', forecast, 'L'], m4: ['Delay', v.d, 'days'], ok: spi >= 0.9 && cpi >= 0.95 };
    }
    case 'claimsDelay': {
      const excusable = v.a * v.b / 100;
      const chargeable = Math.max(0, v.a - excusable);
      const ld = (chargeable / 7) * (v.d / 100) * v.c;
      return { m1: ['EOT days', excusable, 'd'], m2: ['LD exposure', ld, 'L'], m3: ['Chargeable delay', chargeable, 'd'], m4: ['LD rate', v.d, '%/wk'], ok: chargeable <= 14 };
    }
    case 'qaDocs': {
      const score = (v.a * 0.35 + v.b * 0.25 + v.d * 0.25) - v.c * 2;
      return { m1: ['QA readiness', clamp(score, 0, 100), '%'], m2: ['ITP coverage', v.a, '%'], m3: ['Open NCRs', v.c, ''], m4: ['Cube tests', v.d, '%'], ok: score >= 75 && v.c <= 5 };
    }
    case 'setout': {
      const distance = Math.sqrt(v.a * v.a + v.b * v.b);
      const angularError = Math.atan2(v.b, Math.max(Math.abs(v.a), 0.1)) * 180 / Math.PI;
      return { m1: ['Setout distance', distance, 'm'], m2: ['Bearing angle', angularError, 'deg'], m3: ['Error', v.c, 'mm'], m4: ['Tolerance', v.d, 'mm'], ok: v.c <= v.d };
    }
    case 'roadCrossSection': {
      const depth = Math.abs(v.b);
      const area = (v.a + v.d * depth) * depth;
      const volume = area * v.c;
      return { m1: [v.b >= 0 ? 'Fill volume' : 'Cut volume', volume, 'm3'], m2: ['Section area', area, 'm2'], m3: ['Chainage', v.c, 'm'], m4: ['Side slope', v.d, 'H:1'], ok: volume < 10000 };
    }
    case 'stormwater': {
      const flow = 2.78 * v.c * v.b * v.a;
      const dia = Math.sqrt((4 * flow / 1000) / Math.max(Math.PI * Math.sqrt(v.d / 100), 0.01)) * 1000;
      return { m1: ['Peak runoff', flow, 'L/s'], m2: ['Pipe dia est.', dia, 'mm'], m3: ['Runoff coeff.', v.c, ''], m4: ['Slope', v.d, '%'], ok: dia <= 1800 };
    }
    case 'drawingTakeoff': {
      const slab = v.a * v.b;
      const wallLength = 2 * (v.a + v.b);
      const wallVolume = wallLength * (v.c / 1000) * 3 * (1 - v.d / 100);
      return { m1: ['Slab area', slab, 'm2'], m2: ['Wall volume', wallVolume, 'm3'], m3: ['Wall length', wallLength, 'm'], m4: ['Openings', v.d, '%'], ok: slab <= 5000 };
    }
    default:
      return { m1: ['Metric A', v.a, ''], m2: ['Metric B', v.b, ''], m3: ['Metric C', v.c, ''], m4: ['Metric D', v.d, ''], ok: true };
  }
}

function AdvancedCivilTool({ tool, accent }: { tool: AdvancedToolKind; accent: typeof accentClasses[string] }) {
  const config = advancedToolInputs[tool];
  const [values, setValues] = useState<AdvancedValues>(config.initial);
  const metrics = advancedMetrics(tool, values);
  const update = (key: keyof AdvancedValues, value: number) => {
    const input = config.inputs.find((item) => item.key === key);
    const nextValue = input ? clamp(value, input.min, input.max) : value;
    setValues((prev) => ({ ...prev, [key]: nextValue }));
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Panel>
        <PanelHeader title="Interactive Inputs" caption={config.caption} icon={config.icon} accent={accent} />
        <div className="grid grid-cols-2 gap-3 p-4">
          {config.inputs.map((input) => (
            <Field key={input.key} label={input.label} value={values[input.key]} unit={input.unit} min={input.min} max={input.max} step={input.step} onChange={(v) => update(input.key, input.step >= 1 && !String(input.step).includes('.') ? Math.round(v) : v)} />
          ))}
        </div>
      </Panel>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label={metrics.m1[0] as string} value={typeof metrics.m1[1] === 'number' ? fmt(metrics.m1[1] as number, 2) : metrics.m1[1]} unit={metrics.m1[2] as string} tone={metrics.ok ? 'good' : 'warn'} />
          <Metric label={metrics.m2[0] as string} value={typeof metrics.m2[1] === 'number' ? fmt(metrics.m2[1] as number, 2) : metrics.m2[1]} unit={metrics.m2[2] as string} />
          <Metric label={metrics.m3[0] as string} value={typeof metrics.m3[1] === 'number' ? fmt(metrics.m3[1] as number, 2) : metrics.m3[1]} unit={metrics.m3[2] as string} />
          <Metric label={metrics.m4[0] as string} value={typeof metrics.m4[1] === 'number' ? fmt(metrics.m4[1] as number, 2) : metrics.m4[1]} unit={metrics.m4[2] as string} />
        </div>
        <Panel className="p-4">
          <AdvancedToolGraphic tool={tool} values={values} inputs={config.inputs} accent={accent.stroke} onChange={update} />
        </Panel>
        <Insight ok={metrics.ok} title={metrics.ok ? 'Preliminary check is within target range' : 'Review the highlighted design parameters'} body="This native studio is intentionally diagram-first: students can drag the main engineering variables and see the calculation response immediately." />
      </div>
    </div>
  );
}

function AdvancedToolGraphic({
  tool,
  values,
  inputs,
  accent,
  onChange,
}: {
  tool: AdvancedToolKind;
  values: AdvancedValues;
  inputs: AdvancedInput[];
  accent: string;
  onChange: (key: keyof AdvancedValues, value: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragKey, setDragKey] = useState<keyof AdvancedValues | null>(null);
  const primary = inputs[0];
  const secondary = inputs[1];
  const tA = (values[primary.key] - primary.min) / Math.max(primary.max - primary.min, 1);
  const tB = (values[secondary.key] - secondary.min) / Math.max(secondary.max - secondary.min, 1);
  const xA = 96 + clamp(tA, 0, 1) * 448;
  const yB = 222 - clamp(tB, 0, 1) * 150;

  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragKey) return;
    const input = inputs.find((item) => item.key === dragKey);
    if (!input) return;
    const point = svgPointer(event, svgRef.current);
    const ratio = dragKey === primary.key ? (point.x - 96) / 448 : (222 - point.y) / 150;
    const raw = input.min + clamp(ratio, 0, 1) * (input.max - input.min);
    const snapped = Math.round(raw / input.step) * input.step;
    onChange(dragKey, Number(snapped.toFixed(input.step < 1 ? 2 : 0)));
  };
  const start = (key: keyof AdvancedValues) => (event: React.PointerEvent<SVGElement>) => {
    setDragKey(key);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stop = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragKey(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };

  const panelCount = Math.max(3, Math.min(10, Math.round(values.d)));
  const objectColor = ['qcLab', 'soilLab', 'isCodeChecker', 'qaDocs'].includes(tool)
    ? '#34d399'
    : ['seismic', 'wind', 'safetyInspection', 'claimsDelay'].includes(tool)
      ? '#fb7185'
      : accent;

  return (
    <svg ref={svgRef} viewBox="0 0 640 310" className="h-80 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="18" y="18" width="604" height="274" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      {['frame', 'staadFrame'].includes(tool) && (
        <g>
          <path d={`M120 226 V94 H${xA} V226 M120 94 H${xA}`} fill="none" stroke="rgba(226,232,240,0.75)" strokeWidth="10" strokeLinecap="round" />
          <line x1={xA + 48} y1={yB} x2={xA + 8} y2={yB} stroke={objectColor} strokeWidth="6" />
          <path d={`M${xA + 8} ${yB - 12} L${xA - 12} ${yB} L${xA + 8} ${yB + 12} Z`} fill={objectColor} />
          {tool === 'staadFrame' && (
            <>
              <circle cx="120" cy="94" r="7" fill={accent} />
              <circle cx={xA} cy="94" r="7" fill={accent} />
              <circle cx="120" cy="226" r="7" fill={accent} />
              <circle cx={xA} cy="226" r="7" fill={accent} />
            </>
          )}
        </g>
      )}
      {tool === 'truss' && (
        <g>
          <polygon points={`96,224 ${xA},224 ${(96 + xA) / 2},${yB}`} fill="rgba(148,163,184,0.08)" stroke="rgba(226,232,240,0.7)" strokeWidth="5" />
          {Array.from({ length: panelCount + 1 }, (_, i) => {
            const x = 96 + ((xA - 96) / panelCount) * i;
            return <line key={i} x1={x} y1="224" x2={(96 + xA) / 2} y2={yB} stroke={accent} strokeWidth="2" opacity="0.55" />;
          })}
        </g>
      )}
      {['soilLab', 'qcLab', 'tender', 'rateAnalysis', 'isCodeChecker', 'safetyInspection', 'draftingPractice', 'bbs', 'projectControl', 'claimsDelay', 'qaDocs'].includes(tool) && (
        <g>
          <line x1="92" x2="548" y1="224" y2="224" stroke="rgba(148,163,184,0.28)" strokeWidth="3" />
          <polyline points={`96,210 170,${210 - tA * 90} 250,${226 - tB * 120} 340,${170 - values.c * 0.35} 520,${210 - values.d * 0.03}`} fill="none" stroke={objectColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="250" cy={226 - tB * 120} r="10" fill={objectColor} />
          {tool === 'bbs' && Array.from({ length: 5 }, (_, i) => <line key={i} x1={132 + i * 78} x2={184 + i * 78} y1={180 - i * 5} y2={180 - i * 5} stroke={accent} strokeWidth="6" strokeLinecap="round" />)}
          {tool === 'rateAnalysis' && ['MAT', 'LAB', 'EQP', 'OH'].map((label, i) => <text key={label} x={132 + i * 96} y={246} fill="rgba(226,232,240,0.72)" fontSize="12" fontWeight="900">{label}</text>)}
          {tool === 'isCodeChecker' && <path d="M422 132 l24 24 52 -62" fill="none" stroke={objectColor} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />}
          {tool === 'safetyInspection' && <path d="M462 84 l58 106 h-116 Z" fill="rgba(251,113,133,0.14)" stroke={objectColor} strokeWidth="5" />}
          {tool === 'draftingPractice' && <path d="M112 88 H474 V214 H112 Z M112 146 H474 M232 88 V214" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="10 8" opacity="0.7" />}
          {tool === 'projectControl' && (
            <>
              <rect x="116" y="102" width={Math.max(40, tA * 330)} height="20" rx="8" fill="rgba(148,163,184,0.28)" />
              <rect x="116" y="138" width={Math.max(40, tB * 330)} height="20" rx="8" fill={objectColor} opacity="0.75" />
              <rect x="116" y="174" width={Math.max(40, (values.c / 1200) * 330)} height="20" rx="8" fill="rgba(251,191,36,0.65)" />
            </>
          )}
          {tool === 'claimsDelay' && <path d="M108 92 H512 M108 132 H512 M108 172 H512" stroke="rgba(226,232,240,0.16)" strokeWidth="3" strokeLinecap="round" />}
          {tool === 'qaDocs' && ['ITP', 'POUR', 'CUBE', 'NCR'].map((label, i) => <rect key={label} x={116 + i * 94} y={104 + (i % 2) * 44} width="72" height="52" rx="12" fill={i === 3 ? 'rgba(251,113,133,0.14)' : 'rgba(52,211,153,0.14)'} stroke={i === 3 ? '#fb7185' : objectColor} strokeWidth="3" />)}
        </g>
      )}
      {['earthwork', 'siteLayout', 'bimRevit', 'setout', 'drawingTakeoff'].includes(tool) && (
        <g>
          <rect x="118" y="70" width={Math.max(90, xA - 118)} height={Math.max(70, 222 - yB)} fill={accent} opacity="0.16" stroke={accent} strokeWidth="3" />
          {Array.from({ length: 7 }, (_, i) => <line key={`v-${i}`} x1={118 + i * 64} x2={118 + i * 64} y1="70" y2="222" stroke="rgba(148,163,184,0.16)" />)}
          {Array.from({ length: 5 }, (_, i) => <line key={`h-${i}`} x1="118" x2="544" y1={70 + i * 38} y2={70 + i * 38} stroke="rgba(148,163,184,0.16)" />)}
          {tool === 'siteLayout' && <circle cx="322" cy="148" r={Math.max(22, values.a * 2.2)} fill="none" stroke={objectColor} strokeWidth="4" strokeDasharray="12 10" />}
          {tool === 'bimRevit' && Array.from({ length: Math.min(12, Math.round(values.b)) }, (_, i) => <rect key={i} x={166 + i * 13} y={205 - i * 10} width={Math.max(80, xA - 210)} height="8" fill={i % 2 ? 'rgba(226,232,240,0.34)' : accent} opacity="0.72" />)}
          {tool === 'setout' && (
            <>
              <line x1="322" y1="146" x2={322 + values.a * 3} y2={146 - values.b * 2} stroke={objectColor} strokeWidth="5" strokeLinecap="round" />
              <circle cx={322 + values.a * 3} cy={146 - values.b * 2} r="11" fill={objectColor} />
            </>
          )}
          {tool === 'drawingTakeoff' && (
            <>
              <rect x="166" y="96" width={Math.max(90, values.a * 3)} height={Math.max(70, values.b * 2.2)} fill="none" stroke={objectColor} strokeWidth="5" />
              <rect x="212" y="96" width="42" height="14" fill="rgba(8,13,20,0.95)" stroke={objectColor} strokeWidth="3" />
              <rect x="166" y="154" width="14" height="48" fill="rgba(8,13,20,0.95)" stroke={objectColor} strokeWidth="3" />
            </>
          )}
        </g>
      )}
      {['bridge', 'columnFooting', 'masonry', 'rebar', 'formwork', 'pile', 'services', 'equipment', 'stormwater', 'roadCrossSection'].includes(tool) && (
        <g>
          <rect x="96" y="210" width={Math.max(80, xA - 96)} height="24" rx="8" fill="rgba(226,232,240,0.58)" />
          <rect x="126" y={yB} width={Math.max(80, xA - 146)} height={210 - yB} rx="10" fill={accent} opacity="0.22" stroke={accent} strokeWidth="3" />
          {tool === 'pile' && Array.from({ length: Math.min(16, Math.round(values.a)) }, (_, i) => <circle key={i} cx={154 + (i % 4) * 54} cy={102 + Math.floor(i / 4) * 38} r={clamp(values.b / 90, 4, 12)} fill={objectColor} />)}
          {tool === 'services' && <path d="M130 86 C230 70 340 112 508 76" fill="none" stroke={objectColor} strokeWidth="6" strokeLinecap="round" />}
          {tool === 'stormwater' && <path d="M112 118 C210 188 310 86 512 176" fill="none" stroke={objectColor} strokeWidth="12" strokeLinecap="round" opacity="0.8" />}
          {tool === 'roadCrossSection' && <path d="M118 220 L246 136 H394 L522 220 Z" fill="rgba(129,140,248,0.14)" stroke={objectColor} strokeWidth="5" strokeLinejoin="round" />}
          {tool === 'equipment' && <path d="M132 206 H310 L392 150 H460" fill="none" stroke={objectColor} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      )}
      {['seismic', 'wind'].includes(tool) && (
        <g>
          {Array.from({ length: Math.max(2, Math.min(18, Math.round(values.d))) }, (_, i) => {
            const y = 224 - i * 10;
            return <rect key={i} x="278" y={y - 8} width={Math.max(48, values.c * 1.2)} height="8" fill={i % 2 ? 'rgba(226,232,240,0.32)' : accent} opacity="0.72" />;
          })}
          <line x1="118" y1={yB} x2="260" y2={yB} stroke={objectColor} strokeWidth="6" />
          <path d={`M260 ${yB - 12} L282 ${yB} L260 ${yB + 12} Z`} fill={objectColor} />
        </g>
      )}
      <line x1="96" y1="260" x2="544" y2="260" stroke={accent} strokeWidth="5" opacity="0.28" />
      <circle cx={xA} cy="260" r="24" fill="transparent" className="cursor-ew-resize" onPointerDown={start(primary.key)} />
      <DragKnob x={xA} y={260} accent={accent} label={primary.label} />
      <line x1="574" y1="222" x2="574" y2="72" stroke={objectColor} strokeWidth="5" opacity="0.28" />
      <circle cx="574" cy={yB} r="24" fill="transparent" className="cursor-ns-resize" onPointerDown={start(secondary.key)} />
      <DragKnob x={574} y={yB} accent={objectColor} label={secondary.label} />
    </svg>
  );
}

function ResultLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
      <span className="text-sm font-semibold text-slate-400">{label}</span>
      <span className="text-right text-sm font-black text-white">{value}</span>
    </div>
  );
}

function Insight({ ok, title, body }: { ok: boolean; title: string; body: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${ok ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-amber-400/20 bg-amber-500/10'}`}>
      <div className={`flex items-center gap-2 text-sm font-black ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
        {ok ? <CheckCircle size={18} weight="duotone" /> : <WarningCircle size={18} weight="duotone" />}
        {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
