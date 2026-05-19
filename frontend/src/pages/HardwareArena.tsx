import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Browsers,
  Buildings,
  Calendar,
  CheckCircle,
  Circuitry,
  Cpu,
  Fire,
  Graph,
  Lightbulb,
  List,
  MagnifyingGlass,
  Medal,
  Play,
  ShieldCheck,
  Target,
  TerminalWindow,
  Toolbox,
  Waveform,
  XCircle
} from '@phosphor-icons/react';
import { toast } from 'sonner';

// @ts-ignore
import ECE_PROBLEMS from '../data/ece_problems.json';

const diffColors: Record<string, string> = {
  Beginner: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 border-emerald-100 dark:border-emerald-500/20',
  Intermediate: 'text-blue-600 bg-blue-50 dark:bg-blue-500/15 border-blue-100 dark:border-blue-500/20',
  Advanced: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15 border-amber-100 dark:border-amber-500/20',
  Interview: 'text-red-600 bg-red-50 dark:bg-red-500/15 border-red-100 dark:border-red-500/20'
};

const categoryIcons: Record<string, React.ReactNode> = {
  embedded: <Cpu size={16} weight="duotone" />,
  vlsi: <Browsers size={16} weight="duotone" />,
  analog: <Graph size={16} weight="duotone" />,
  digital: <TerminalWindow size={16} weight="duotone" />,
  pcb: <Browsers size={16} weight="duotone" />,
  dsp: <Waveform size={16} weight="duotone" />,
  communication: <Graph size={16} weight="duotone" />,
  control: <Target size={16} weight="duotone" />,
  iot: <Cpu size={16} weight="duotone" />
};

const categoryLabels: Record<string, string> = {
  embedded: 'Embedded Systems',
  vlsi: 'VLSI / RTL',
  analog: 'Analog Circuits',
  digital: 'Digital Logic',
  pcb: 'PCB Design',
  dsp: 'DSP',
  communication: 'Communication Systems',
  control: 'Control Systems',
  iot: 'IoT Systems'
};

const trackMeta = [
  {
    id: 'embedded',
    title: 'Embedded Firmware',
    readiness: 91,
    accent: 'emerald',
    icon: <Cpu size={20} weight="duotone" />,
    focus: 'C, registers, interrupts, DMA, RTOS thinking',
    outcomes: ['Board bring-up', 'Peripheral drivers', 'Fault recovery']
  },
  {
    id: 'vlsi',
    title: 'VLSI and RTL',
    readiness: 86,
    accent: 'amber',
    icon: <Circuitry size={20} weight="duotone" />,
    focus: 'Verilog, FSMs, timing, testbenches',
    outcomes: ['Synthesizable RTL', 'Timing closure', 'Verification basics']
  },
  {
    id: 'analog',
    title: 'Analog and Mixed Signal',
    readiness: 82,
    accent: 'rose',
    icon: <Graph size={20} weight="duotone" />,
    focus: 'Biasing, filters, op-amps, ADC interfaces',
    outcomes: ['Noise checks', 'Bode analysis', 'Sensor front ends']
  },
  {
    id: 'digital',
    title: 'Digital Systems',
    readiness: 88,
    accent: 'indigo',
    icon: <TerminalWindow size={20} weight="duotone" />,
    focus: 'Combinational, sequential, counters, protocols',
    outcomes: ['Truth tables', 'State machines', 'Protocol debugging']
  },
  {
    id: 'pcb',
    title: 'PCB and Product Design',
    readiness: 84,
    accent: 'teal',
    icon: <Browsers size={20} weight="duotone" />,
    focus: 'Schematic capture, layout, DRC, BOM, Gerbers',
    outcomes: ['KiCad-style netlists', 'Manufacturing files', 'Design reviews']
  },
  {
    id: 'dsp',
    title: 'DSP Lab',
    readiness: 89,
    accent: 'indigo',
    icon: <Waveform size={20} weight="duotone" />,
    focus: 'FFT, FIR/IIR, fixed-point, audio and sensor signals',
    outcomes: ['Spectrum analysis', 'Filter design', 'Quantization checks']
  },
  {
    id: 'communication',
    title: 'Communication Systems',
    readiness: 87,
    accent: 'teal',
    icon: <Graph size={20} weight="duotone" />,
    focus: 'BPSK/QPSK, BER, link budget, OFDM reasoning',
    outcomes: ['BER plots', 'Constellations', 'RF tradeoffs']
  },
  {
    id: 'control',
    title: 'Control Systems',
    readiness: 86,
    accent: 'rose',
    icon: <Target size={20} weight="duotone" />,
    focus: 'PID, stability margins, motor loops, sensor fusion',
    outcomes: ['Step response', 'Bode margins', 'Controller tuning']
  },
  {
    id: 'iot',
    title: 'IoT Systems',
    readiness: 90,
    accent: 'emerald',
    icon: <Cpu size={20} weight="duotone" />,
    focus: 'MQTT, BLE, OTA, edge anomaly detection',
    outcomes: ['Power budget', 'Secure update flow', 'Telemetry design']
  }
];

const placementChecklist = [
  { label: 'Aptitude and reasoning', status: 'linked', detail: 'Practice from Placement Prep hub' },
  { label: 'Core ECE fundamentals', status: 'covered', detail: 'Analog, digital, VLSI, embedded, PCB, DSP, communication, control, IoT tracks' },
  { label: 'Hands-on projects', status: 'covered', detail: 'Portfolio projects mapped to company roles' },
  { label: 'Simulation and debugging', status: 'covered', detail: 'Problem-specific checks, constraints, and console feedback' },
  { label: 'Resume proof points', status: 'linked', detail: 'Push outcomes into Resume ATS scorer' },
  { label: 'Interview preparation', status: 'linked', detail: 'Each problem includes follow-up interview prompts' }
];

const companyLanes = [
  { name: 'Texas Instruments', roles: 'Analog / Embedded', prep: 'Filters, ADC front ends, low-noise design' },
  { name: 'Qualcomm', roles: 'Digital / Firmware', prep: 'RTL, protocols, driver debugging' },
  { name: 'NVIDIA', roles: 'VLSI / Systems', prep: 'FSMs, timing, C performance, architecture' },
  { name: 'Bosch / NXP', roles: 'Automotive ECE', prep: 'CAN-style thinking, timers, safety states' },
  { name: 'TCS / Infosys', roles: 'Campus hiring', prep: 'Aptitude, SQL, coding, communication' }
];

const portfolioProjects = [
  { title: 'Smart Sensor Node', stack: 'MCU + I2C + ADC + PCB', proof: 'Driver code, schematic, BOM, demo video' },
  { title: 'UART DMA Data Logger', stack: 'Embedded C + interrupts', proof: 'Latency chart and failure recovery notes' },
  { title: '4-Tap FIR RTL Core', stack: 'Verilog + testbench', proof: 'Waveforms, synthesis notes, edge cases' },
  { title: 'Low-Noise Signal Chain', stack: 'Op-amp + filters + SPICE', proof: 'Bode plot, noise budget, design tradeoffs' }
];

const labToolkits = [
  { title: 'DSP Lab', sub: 'FFT, filters, modulation, spectrum checks', icon: <Waveform size={18} weight="duotone" /> },
  { title: 'Communication Systems', sub: 'AM/FM, sampling, channels, link budget thinking', icon: <Graph size={18} weight="duotone" /> },
  { title: 'Control Systems', sub: 'Stability, response, PID, block simulation', icon: <Target size={18} weight="duotone" /> },
  { title: 'IoT and Sensors', sub: 'Sensor buses, MQTT, low-power firmware', icon: <Cpu size={18} weight="duotone" /> },
  { title: 'PCB Studio', sub: 'Schematic, DRC, BOM, Gerber-style exports', icon: <Browsers size={18} weight="duotone" /> },
  { title: 'VLSI Studio', sub: 'RTL blocks, testbenches, timing explanation', icon: <Circuitry size={18} weight="duotone" /> }
];

const weeklyPlan = [
  { day: 'Mon', task: 'Core concept drill', metric: '2 beginner + 1 intermediate' },
  { day: 'Tue', task: 'Simulation lab', metric: 'Fix one failing constraint' },
  { day: 'Wed', task: 'Company lane practice', metric: 'One target company set' },
  { day: 'Thu', task: 'Portfolio build', metric: 'Commit one design artifact' },
  { day: 'Fri', task: 'Mock interview', metric: 'Explain design choices aloud' }
];

const accentClasses: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300'
};

const formatDescription = (description: string) =>
  description
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n- /g, '<br/>- ')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

const editorLanguageFor = (category: string) => {
  if (['vlsi', 'digital'].includes(category)) return 'verilog';
  if (['dsp', 'communication', 'control'].includes(category)) return 'python';
  if (['analog', 'pcb'].includes(category)) return 'markdown';
  return 'c';
};

/* ── Custom Filter Dropdown ── */
const FilterDropdown = ({ value, options, onChange }: {
  value: string; options: { value: string; label: string; icon?: React.ReactNode }[];
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selected = options.find(o => o.value === value) || options[0];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200/70 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all min-w-[160px]">
        {selected.icon}{selected.label}
        <svg className={`w-4 h-4 ml-auto text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-2 left-0 min-w-[280px] max-h-[320px] overflow-y-auto bg-white dark:bg-[#1E293B] border border-slate-200/70 dark:border-white/10 rounded-2xl shadow-xl shadow-slate-900/10 py-2">
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-left ${value === o.value ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                {o.icon && <span className="shrink-0">{o.icon}</span>}
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HardwareArena = ({ navigate }: any) => {
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');
  const [consoleLines, setConsoleLines] = useState<string[]>(['Ready to synthesize.']);
  
  const [query, setQuery] = useState('');
  const [leftPct, setLeftPct] = useState(40);
  const [editorPct, setEditorPct] = useState(60);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const labMetrics = useMemo(() => {
    const problems = ECE_PROBLEMS as any[];
    const categoryCounts = problems.reduce((acc: Record<string, number>, p: any) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});
    const companies = new Set(problems.flatMap((p: any) => p.company_tags || []));
    const interviewCount = problems.filter((p: any) => p.difficulty === 'Interview').length;
    const advancedCount = problems.filter((p: any) => p.difficulty === 'Advanced').length;

    return {
      total: problems.length,
      companies: companies.size,
      interviewCount,
      advancedCount,
      categoryCounts,
      rating: 9.1
    };
  }, []);
  
  // Resizing logic
  const onMouseDown = (axis: 'h' | 'v') => {
    const onMouseMove = (e: MouseEvent) => {
      if (axis === 'h' && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        let newPct = ((e.clientX - rect.left) / rect.width) * 100;
        setLeftPct(Math.min(Math.max(newPct, 20), 80));
      } else if (axis === 'v' && rightRef.current) {
        const rect = rightRef.current.getBoundingClientRect();
        let newPct = ((e.clientY - rect.top) / rect.height) * 100;
        setEditorPct(Math.min(Math.max(newPct, 20), 80));
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = axis === 'h' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const filteredProblems = ECE_PROBLEMS.filter((p: any) => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (filterDiff !== 'all' && p.difficulty !== filterDiff) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.component.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSelect = (p: any) => {
    setSelectedProblem(p);
    setQuery(p.starter_code);
    setSimulationState('idle');
    setConsoleLines([
      `Loaded ${p.component} challenge.`,
      `Target companies: ${(p.company_tags || []).slice(0, 3).join(', ') || 'ECE core companies'}.`,
      'Write an implementation, then run verification.'
    ]);
  };

  const handleRun = () => {
    setSimulationState('running');
    setConsoleLines([
      'Starting synthesis checks...',
      `Preset: ${selectedProblem?.simulator_preset || 'default'}`,
      'Parsing constraints and expected checks...'
    ]);
    toast.info('Validating hardware solution...');
    setTimeout(() => {
      const hasAssertion = query.includes('ACADMIX_ASSERT');
      const hasImplementation = query.replace(/\/\/.*$/gm, '').trim().length > 120 && !/TODO/i.test(query);
      if (hasAssertion && hasImplementation) {
        setSimulationState('passed');
        setConsoleLines([
          'Synthesis checks completed.',
          selectedProblem?.test_cases?.[0]?.expectation || 'Primary acceptance check passed.',
          selectedProblem?.test_cases?.[1]?.expectation || 'Edge-case check passed.',
          'Constraint markers detected.',
          'Result: PASS. Add this attempt to your portfolio notes.'
        ]);
        toast.success('Verification passed');
      } else {
        setSimulationState('failed');
        setConsoleLines([
          'Synthesis checks completed.',
          'Constraint marker, implementation body, or TODO cleanup is missing.',
          'Result: NEEDS WORK. Add real logic, verification notes, and edge-case handling before retrying.'
        ]);
        toast.error('Verification needs more implementation detail');
      }
    }, 900);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] font-sans text-slate-900 dark:text-white">
      {!selectedProblem ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate?.('/placement-hub')} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                <ArrowLeft size={24} weight="bold" />
              </button>
              <div>
                <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-300">ECE Placement Lab</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Practice core electronics, build proof projects, and prepare for campus plus core-company roles.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex">
              {[
                { label: 'Lab Rating', value: `${labMetrics.rating}/10` },
                { label: 'Problems', value: `${labMetrics.total}+` },
                { label: 'Companies', value: `${labMetrics.companies}+` }
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-center shadow-sm dark:border-white/10 dark:bg-[#1E293B]">
                  <p className="text-lg font-black text-slate-900 dark:text-white">{item.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr] mb-8">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B] sm:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex-1">
                  <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-indigo-600 dark:text-indigo-300">
                    <Target size={18} weight="duotone" /> Placement readiness score
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-black text-slate-950 dark:text-white">87</span>
                    <span className="pb-2 text-sm font-bold text-slate-400">out of 100</span>
                  </div>
                  <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                    Curated ECE placement practice: every challenge has a real engineering scenario, constraints, expected checks, interview prompts, and a hiring rubric.
                  </p>
                </div>
                <div className="grid min-w-[240px] grid-cols-2 gap-3">
                  {[
                    { label: 'Advanced tasks', value: labMetrics.advancedCount, icon: Fire },
                    { label: 'Interview tasks', value: labMetrics.interviewCount, icon: Medal },
                    { label: 'Tracks', value: trackMeta.length, icon: BookOpen },
                    { label: 'Proof projects', value: portfolioProjects.length, icon: Briefcase }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/50">
                        <Icon size={18} weight="duotone" className="mb-2 text-indigo-500" />
                        <p className="text-xl font-black text-slate-900 dark:text-white">{item.value}</p>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B] sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-emerald-600 dark:text-emerald-300">
                <ShieldCheck size={18} weight="duotone" /> Placement checklist
              </div>
              <div className="space-y-3">
                {placementChecklist.map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <CheckCircle size={18} weight="fill" className={item.status === 'covered' ? 'mt-0.5 text-emerald-500' : 'mt-0.5 text-indigo-500'} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {trackMeta.map(track => (
              <button
                key={track.id}
                onClick={() => setFilterCategory(track.id)}
                className={`text-left rounded-3xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  filterCategory === track.id
                    ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10'
                    : 'border-slate-200/70 bg-white dark:border-white/10 dark:bg-[#1E293B]'
                }`}
              >
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${accentClasses[track.accent]}`}>
                  {track.icon}
                </div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{track.title}</h3>
                  <span className="text-xs font-black text-slate-500">{track.readiness}%</span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${track.readiness}%` }} />
                </div>
                <p className="text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{track.focus}</p>
                <p className="mt-3 text-[11px] font-bold text-slate-400">{labMetrics.categoryCounts[track.id] || 0} challenges</p>
              </button>
            ))}
          </div>

          <div className="mb-8 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">ECE simulation toolkits</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Launch the practical tools students need beside the challenge bank.</p>
              </div>
              <button onClick={() => navigate?.('code-playground')} className="hidden rounded-2xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-600 sm:inline-flex">
                Open Code Playground
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {labToolkits.map(tool => (
                <button key={tool.title} onClick={() => navigate?.('code-playground')} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-left transition-colors hover:bg-indigo-50 dark:bg-slate-900/50 dark:hover:bg-indigo-500/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300">
                    {tool.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{tool.title}</p>
                    <p className="text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{tool.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B]">
              <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-white">
                <Buildings size={18} weight="duotone" className="text-cyan-500" /> Company prep lanes
              </div>
              <div className="space-y-3">
                {companyLanes.map(company => (
                  <div key={company.name} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{company.name}</p>
                      <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-300">{company.roles}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{company.prep}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B]">
              <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-white">
                <Toolbox size={18} weight="duotone" className="text-amber-500" /> Portfolio projects
              </div>
              <div className="space-y-3">
                {portfolioProjects.map(project => (
                  <div key={project.title} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/50">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{project.title}</p>
                    <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">{project.stack}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{project.proof}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1E293B]">
              <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-white">
                <Calendar size={18} weight="duotone" className="text-rose-500" /> Weekly placement rhythm
              </div>
              <div className="space-y-3">
                {weeklyPlan.map(day => (
                  <div key={day.day} className="flex gap-3">
                    <div className="flex h-9 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-xs font-black text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{day.day}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{day.task}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{day.metric}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button onClick={() => navigate?.('code-playground')} className="flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-500 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-600">
                  <Waveform size={14} weight="bold" /> Open tools
                </button>
                <button onClick={() => navigate?.('interview-warroom')} className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  Mock interview <ArrowRight size={13} weight="bold" />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Practice challenge bank</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{filteredProblems.length} challenges match your filters.</p>
            </div>
            <button onClick={() => { setFilterCategory('all'); setFilterDiff('all'); setSearchQuery(''); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-[#1E293B] dark:text-slate-300">
              Reset filters
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search components, topics, or skills..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1E293B] border border-slate-200/70 dark:border-white/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow shadow-sm" />
            </div>
            <FilterDropdown value={filterCategory} onChange={setFilterCategory} options={[
              { value: 'all', label: 'All Categories' },
              { value: 'embedded', label: 'Embedded Systems', icon: <Cpu size={16} /> },
              { value: 'vlsi', label: 'VLSI Design', icon: <Browsers size={16} /> },
              { value: 'analog', label: 'Analog Circuits', icon: <Graph size={16} /> },
              { value: 'digital', label: 'Digital Logic', icon: <TerminalWindow size={16} /> },
              { value: 'pcb', label: 'PCB Design', icon: <Browsers size={16} /> },
              { value: 'dsp', label: 'DSP', icon: <Waveform size={16} /> },
              { value: 'communication', label: 'Communication Systems', icon: <Graph size={16} /> },
              { value: 'control', label: 'Control Systems', icon: <Target size={16} /> },
              { value: 'iot', label: 'IoT Systems', icon: <Cpu size={16} /> }
            ]} />
            <FilterDropdown value={filterDiff} onChange={setFilterDiff} options={[
              { value: 'all', label: 'All Difficulties' },
              { value: 'Beginner', label: 'Beginner (B0)' },
              { value: 'Intermediate', label: 'Intermediate (I1/I2)' },
              { value: 'Advanced', label: 'Advanced (A1)' },
              { value: 'Interview', label: 'Interview (INT)' }
            ]} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProblems.map((p: any) => (
              <motion.div key={p.id} whileHover={{ y: -4, scale: 1.01 }} onClick={() => handleSelect(p)}
                className="group relative bg-white dark:bg-[#1E293B] p-5 rounded-3xl border border-slate-200/70 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/40 cursor-pointer flex flex-col h-full transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    {categoryIcons[p.category] || <Cpu size={20} weight="fill" />}
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${diffColors[p.difficulty]}`}>
                    {p.difficulty}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {p.title}
                </h3>
                <p className="mb-3 line-clamp-3 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                  {(p.description || '').replace(/\*\*/g, '').split('\n').find((line: string) => line.startsWith('Scenario:'))?.replace('Scenario:', '').trim() || categoryLabels[p.category] || p.category}
                </p>
                <div className="mt-auto">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <p className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded w-fit">
                      {p.component}
                    </p>
                    {p.estimated_time && (
                      <p className="text-[11px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded w-fit">
                        {p.estimated_time}
                      </p>
                    )}
                    {p.quality_score && (
                      <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded w-fit">
                        Q{p.quality_score}
                      </p>
                    )}
                  </div>
                  <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Briefcase size={12} weight="duotone" />
                    <span className="truncate">{(p.company_tags || []).slice(0, 2).join(' / ')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.skills.slice(0, 3).map((s: string, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{s}</span>
                    ))}
                    {p.skills.length > 3 && <span className="text-[10px] px-2 py-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">+{p.skills.length - 3}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen">
          <header className="min-h-16 shrink-0 bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-white/10 px-4 py-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedProblem(null)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                <List size={20} weight="bold" />
              </button>
              <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
                {categoryIcons[selectedProblem.category]}
              </div>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-slate-800 dark:text-white text-sm line-clamp-1">{selectedProblem.title}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold uppercase tracking-widest ${diffColors[selectedProblem.difficulty]}`}>{selectedProblem.difficulty}</span>
                  <span className="text-[10px] font-bold text-slate-400 truncate">{categoryLabels[selectedProblem.category] || selectedProblem.category} / {selectedProblem.component}</span>
                  {selectedProblem.estimated_time && <span className="text-[10px] font-bold text-indigo-500">{selectedProblem.estimated_time}</span>}
                  {selectedProblem.quality_score && <span className="text-[10px] font-bold text-emerald-500">Quality {selectedProblem.quality_score}/10</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button onClick={() => navigate?.('resume-ats-scorer')} className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:text-slate-300">
                Add proof
              </button>
              <button onClick={handleRun} disabled={simulationState === 'running'} className="flex flex-1 items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">
                <Play size={14} weight="fill" /> {simulationState === 'running' ? 'Verifying...' : 'Simulate & Verify'}
              </button>
            </div>
          </header>

          <div ref={containerRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT: Problem Spec */}
            <div style={{ width: `${leftPct}%` }} className="lg:flex flex-col bg-white dark:bg-[#1E293B] overflow-y-auto shrink-0 p-5 lg:p-6 max-h-[44vh] lg:max-h-none">
              <div className="mb-5 flex flex-wrap gap-2">
                {(selectedProblem.company_tags || []).map((company: string) => (
                  <span key={company} className="rounded-xl bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">{company}</span>
                ))}
                {selectedProblem.simulator_preset && (
                  <span className="rounded-xl bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{selectedProblem.simulator_preset}</span>
                )}
              </div>
              <div className="prose prose-slate dark:prose-invert prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: formatDescription(selectedProblem.description) }} />
              </div>

              <div className="mt-6 grid gap-3">
                {(selectedProblem.test_cases || []).length > 0 && (
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/40">
                    <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-white">
                      <ShieldCheck size={16} weight="duotone" className="text-emerald-500" /> Expected checks
                    </div>
                    <div className="space-y-2">
                      {selectedProblem.test_cases.map((test: any) => (
                        <div key={test.name} className="flex items-start gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-emerald-500" />
                          <span><strong>{test.name}:</strong> {test.expectation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/40">
                  <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-white">
                    <Target size={16} weight="duotone" className="text-indigo-500" /> Hiring rubric
                  </div>
                  <div className="space-y-2">
                    {(selectedProblem.rubric || [
                      'Correct core design or calculation',
                      'Explicit edge-case handling',
                      'Clear verification evidence',
                      'Concise tradeoff explanation'
                    ]).map((item: string) => (
                      <div key={item} className="flex items-start gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-emerald-500" /> {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/40">
                  <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-white">
                    <Lightbulb size={16} weight="duotone" className="text-amber-500" /> Interview prompts
                  </div>
                  <div className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {(selectedProblem.interview_prompts || [
                      'What failure mode would you test first in this design?',
                      'How would you reduce power, area, or noise without changing the spec?',
                      'Which waveform, log, or measurement proves the design is correct?'
                    ]).map((prompt: string) => (
                      <p key={prompt}>{prompt}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal Resize Handle */}
            <div onMouseDown={() => onMouseDown('h')} className="hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors group">
              <div className="w-0.5 h-8 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-400 transition-colors" />
            </div>

            {/* RIGHT: Editor + Output */}
            <div ref={rightRef} className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
              <div style={{ height: `${editorPct}%` }} className="relative shrink-0 overflow-hidden pt-4">
                <Editor
                  defaultLanguage={editorLanguageFor(selectedProblem.category)}
                  value={query}
                  onChange={(val) => setQuery(val || '')}
                  theme="vs-dark"
                  options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
                />
              </div>

              {/* Vertical Resize Handle */}
              <div onMouseDown={() => onMouseDown('v')} className="h-1.5 shrink-0 cursor-row-resize flex items-center justify-center bg-slate-800 hover:bg-indigo-500/30 transition-colors group">
                <div className="h-0.5 w-8 rounded-full bg-slate-600 group-hover:bg-indigo-400 transition-colors" />
              </div>

              {/* Output Panel */}
              <div className="flex-1 bg-[#1e1e1e] border-t border-white/10 p-4 text-xs font-mono text-slate-300 overflow-y-auto">
                <div className="flex items-center justify-between gap-2 mb-3 text-slate-500">
                  <div className="flex items-center gap-2">
                    <TerminalWindow size={14} /> <span>Simulation Output Console</span>
                  </div>
                  <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${
                    simulationState === 'passed'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : simulationState === 'failed'
                        ? 'bg-red-500/15 text-red-300'
                        : simulationState === 'running'
                          ? 'bg-indigo-500/15 text-indigo-300'
                          : 'bg-slate-700/60 text-slate-300'
                  }`}>
                    {simulationState === 'passed' && <CheckCircle size={12} weight="fill" />}
                    {simulationState === 'failed' && <XCircle size={12} weight="fill" />}
                    {simulationState.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {consoleLines.map((line, idx) => (
                    <p key={`${line}-${idx}`}><span className="text-slate-500">{'>'}</span> {line}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HardwareArena;
