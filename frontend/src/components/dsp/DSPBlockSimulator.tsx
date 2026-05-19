import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Play, Plus, WaveSine, Funnel, ChartLineUp, SlidersHorizontal, X, WaveSawtooth, Clock, ChartBar, Pulse, GitFork, ArrowsDownUp, Gauge, Minus, ArrowsClockwise, Broadcast, Swap, SquaresFour, Lightning, Equalizer, CornersIn, CornersOut } from '@phosphor-icons/react';

import SignalGeneratorNode from './nodes/SignalGeneratorNode';
import AdderNode from './nodes/AdderNode';
import GainNode from './nodes/GainNode';
import FilterNode from './nodes/FilterNode';
import ScopeNode from './nodes/ScopeNode';
import MultiplierNode from './nodes/MultiplierNode';
import NoiseGeneratorNode from './nodes/NoiseGeneratorNode';
import DelayNode from './nodes/DelayNode';
import FFTNode from './nodes/FFTNode';
import ConstantNode from './nodes/ConstantNode';
import SplitterNode from './nodes/SplitterNode';
import DownsamplerNode from './nodes/DownsamplerNode';
import ComparatorNode from './nodes/ComparatorNode';
import AbsValueNode from './nodes/AbsValueNode';
import IntegratorNode from './nodes/IntegratorNode';
import SubtractorNode from './nodes/SubtractorNode';
import UpsamplerNode from './nodes/UpsamplerNode';
import AMModulatorNode from './nodes/AMModulatorNode';
import PhaseShifterNode from './nodes/PhaseShifterNode';
import QuantizerNode from './nodes/QuantizerNode';
import ChirpGeneratorNode from './nodes/ChirpGeneratorNode';
import ImpulseGeneratorNode from './nodes/ImpulseGeneratorNode';
import MovingAverageNode from './nodes/MovingAverageNode';
import PowerMeterNode from './nodes/PowerMeterNode';
import { runSimulation, type SimulationResult } from './engine';

// ── Node type registry ───────────────────────────────────────────────────────

const nodeTypes = {
  // Sources
  signalGenerator: SignalGeneratorNode,
  noiseGenerator: NoiseGeneratorNode,
  constant: ConstantNode,
  chirpGenerator: ChirpGeneratorNode,
  impulseGenerator: ImpulseGeneratorNode,
  // Math
  adder: AdderNode,
  subtractor: SubtractorNode,
  multiplier: MultiplierNode,
  gain: GainNode,
  absValue: AbsValueNode,
  integrator: IntegratorNode,
  // Processing
  filter: FilterNode,
  movingAverage: MovingAverageNode,
  delay: DelayNode,
  downsampler: DownsamplerNode,
  upsampler: UpsamplerNode,
  comparator: ComparatorNode,
  quantizer: QuantizerNode,
  // Communications
  amModulator: AMModulatorNode,
  phaseShifter: PhaseShifterNode,
  // Routing
  splitter: SplitterNode,
  // Visualizers
  scope: ScopeNode,
  fft: FFTNode,
  powerMeter: PowerMeterNode,
};

// ── Initial demo graph ───────────────────────────────────────────────────────

const INITIAL_NODES: Node[] = [
  {
    id: 'sig1',
    type: 'signalGenerator',
    position: { x: 50, y: 40 },
    data: { label: 'Sine 5 Hz', waveform: 'sine', frequency: 5, amplitude: 1, dcOffset: 0 },
  },
  {
    id: 'sig2',
    type: 'signalGenerator',
    position: { x: 50, y: 320 },
    data: { label: 'Square 20 Hz', waveform: 'square', frequency: 20, amplitude: 0.5, dcOffset: 0 },
  },
  {
    id: 'add1',
    type: 'adder',
    position: { x: 370, y: 160 },
    data: { label: 'Adder' },
  },
  {
    id: 'filt1',
    type: 'filter',
    position: { x: 570, y: 160 },
    data: { label: 'LP Filter', filterType: 'lowpass', cutoff: 0.15 },
  },
  {
    id: 'scope1',
    type: 'scope',
    position: { x: 850, y: 140 },
    data: { label: 'Scope' },
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e-sig1-add', source: 'sig1', target: 'add1', targetHandle: 'a', animated: true, style: { stroke: '#818cf8' } },
  { id: 'e-sig2-add', source: 'sig2', target: 'add1', targetHandle: 'b', animated: true, style: { stroke: '#818cf8' } },
  { id: 'e-add-filt', source: 'add1', target: 'filt1', animated: true, style: { stroke: '#34d399' } },
  { id: 'e-filt-scope', source: 'filt1', target: 'scope1', animated: true, style: { stroke: '#22d3ee' } },
];

// ── Toolbar palette ──────────────────────────────────────────────────────────

const PALETTE_SECTIONS = [
  {
    title: 'Sources',
    items: [
      { type: 'signalGenerator', label: 'Signal Gen', icon: WaveSine, defaults: { label: 'Signal', waveform: 'sine', frequency: 5, amplitude: 1, dcOffset: 0 } },
      { type: 'noiseGenerator', label: 'Noise Source', icon: WaveSawtooth, defaults: { label: 'Noise', noiseType: 'white', amplitude: 0.5 } },
      { type: 'constant', label: 'DC Source', icon: Pulse, defaults: { label: 'DC', value: 1 } },
      { type: 'chirpGenerator', label: 'Chirp / Sweep', icon: WaveSine, defaults: { label: 'Chirp', startFreq: 1, endFreq: 50, amplitude: 1 } },
      { type: 'impulseGenerator', label: 'Impulse δ(n)', icon: Lightning, defaults: { label: 'Impulse', amplitude: 1, position: 0 } },
    ],
  },
  {
    title: 'Math',
    items: [
      { type: 'adder', label: 'Adder (Σ)', icon: Plus, defaults: { label: 'Adder' } },
      { type: 'subtractor', label: 'Subtractor (−)', icon: Minus, defaults: { label: 'Subtract' } },
      { type: 'multiplier', label: 'Multiplier (×)', icon: X, defaults: { label: 'Multiply' } },
      { type: 'gain', label: 'Gain / Amp', icon: SlidersHorizontal, defaults: { label: 'Gain', gain: 1 } },
      { type: 'absValue', label: 'Abs / Rectifier', icon: WaveSine, defaults: { label: '|x|' } },
      { type: 'integrator', label: 'Integrator (∫)', icon: ArrowsClockwise, defaults: { label: 'Integrator' } },
    ],
  },
  {
    title: 'Processing',
    items: [
      { type: 'filter', label: 'Filter (FIR)', icon: Funnel, defaults: { label: 'Filter', filterType: 'lowpass', cutoff: 0.2 } },
      { type: 'movingAverage', label: 'Moving Average', icon: Equalizer, defaults: { label: 'MA Filter', windowSize: 8 } },
      { type: 'delay', label: 'Delay (z⁻¹)', icon: Clock, defaults: { label: 'Delay', delaySamples: 50 } },
      { type: 'downsampler', label: 'Downsample (↓N)', icon: ArrowsDownUp, defaults: { label: 'Downsample', factor: 2 } },
      { type: 'upsampler', label: 'Upsample (↑N)', icon: ArrowsDownUp, defaults: { label: 'Upsample', factor: 2 } },
      { type: 'quantizer', label: 'Quantizer (ADC)', icon: SquaresFour, defaults: { label: 'Quantizer', bits: 4 } },
      { type: 'comparator', label: 'Comparator', icon: Gauge, defaults: { label: 'Comparator', threshold: 0 } },
    ],
  },
  {
    title: 'Communications',
    items: [
      { type: 'amModulator', label: 'AM Modulator', icon: Broadcast, defaults: { label: 'AM Mod', carrierFreq: 50, modulationIndex: 0.8 } },
      { type: 'phaseShifter', label: 'Phase Shifter', icon: Swap, defaults: { label: 'Phase', phaseDeg: 90 } },
    ],
  },
  {
    title: 'Routing',
    items: [
      { type: 'splitter', label: 'Splitter', icon: GitFork, defaults: { label: 'Split' } },
    ],
  },
  {
    title: 'Visualizers',
    items: [
      { type: 'scope', label: 'Oscilloscope', icon: ChartLineUp, defaults: { label: 'Scope' } },
      { type: 'fft', label: 'FFT Spectrum', icon: ChartBar, defaults: { label: 'FFT' } },
      { type: 'powerMeter', label: 'Power Meter', icon: Gauge, defaults: { label: 'Power' } },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────────────

let nodeCounter = 100;

export default function DSPBlockSimulator({ isFullScreen, onExitFullScreen, onRequestFullScreen }: {
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [showPalette, setShowPalette] = useState(false);

  // ── Data change callback (passed into each node via data) ────────────────
  const handleNodeDataChange = useCallback(
    (nodeId: string, field: string, value: any) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return { ...n, data: { ...n.data, [field]: value } };
          }
          return n;
        }),
      );
    },
    [setNodes],
  );

  // Inject the callback & live signal data into every node's data
  const enrichedNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onDataChange: handleNodeDataChange,
        // Inject scope / FFT / powerMeter data if available
        ...((n.type === 'scope' || n.type === 'fft' || n.type === 'powerMeter') && simResult
          ? { signalData: simResult.signals[n.id], timeData: simResult.time }
          : {}),
      },
    }));
  }, [nodes, handleNodeDataChange, simResult]);

  // ── Connection handler ───────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: { stroke: '#818cf8' } },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // ── Add node from palette ────────────────────────────────────────────────
  const addNode = useCallback(
    (type: string, defaults: Record<string, any>) => {
      const id = `node-${nodeCounter++}`;
      const newNode: Node = {
        id,
        type,
        position: { x: 300 + Math.random() * 200, y: 100 + Math.random() * 200 },
        data: { ...defaults },
      };
      setNodes((nds) => [...nds, newNode]);
      setShowPalette(false);
    },
    [setNodes],
  );

  // ── Run simulation ──────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    const graphNodes = nodes.map((n) => ({
      id: n.id,
      type: n.type!,
      data: n.data as any,
    }));
    const graphEdges = edges.map((e) => ({
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));
    const result = runSimulation(graphNodes, graphEdges);
    setSimResult(result);
  }, [nodes, edges]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm relative">
      {/* Short screen prompt overlay */}
      {!isFullScreen && onRequestFullScreen && (
        <div className="absolute inset-0 z-[100] backdrop-blur-sm bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center pointer-events-auto">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center border border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
              <CornersOut size={32} weight="duotone" className="text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              View in Full Screen
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
              The DSP simulator requires a full-screen workspace for optimal node wiring and visualization.
            </p>
            <button
              onClick={onRequestFullScreen}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-2"
            >
              <CornersOut size={20} weight="bold" />
              Enter Full Screen
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          {isFullScreen && onExitFullScreen && (
            <button 
              onClick={onExitFullScreen}
              title="Exit Full Screen"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-100"
            >
              <CornersIn size={16} weight="bold" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <WaveSine size={16} weight="bold" className="text-white" />
          </div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Native DSP Block Simulator
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Block button */}
          <div className="relative">
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold transition-all border border-gray-200 dark:border-gray-800/50"
            >
              <Plus size={16} weight="bold" />
              Add Block
            </button>

            {/* Palette Dropdown */}
            {showPalette && (
              <div className="absolute right-0 top-full mt-2 w-64 max-h-[420px] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/20 z-50">
                {PALETTE_SECTIONS.map((section, sIdx) => (
                  <div key={section.title}>
                    {sIdx > 0 && <div className="h-px bg-gray-100 dark:bg-gray-700 mx-3" />}
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{section.title}</span>
                    </div>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.type}
                          onClick={() => addNode(item.type, { ...item.defaults })}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Icon size={18} weight="duotone" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all shadow-sm shadow-blue-500/20 active:scale-95"
          >
            <Play size={16} weight="fill" />
            Run Simulation
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={enrichedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          defaultEdgeOptions={{ animated: true, style: { stroke: '#818cf8', strokeWidth: 2 } }}
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            position="bottom-left"
            className="!bg-white/80 dark:!bg-gray-800/80 !border !border-gray-200 dark:!border-gray-700 !rounded-xl !shadow-lg backdrop-blur-sm"
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(148, 163, 184, 0.2)"
          />

          {/* Hint panel */}
          <Panel position="bottom-right">
            <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500 font-mono bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-xl px-4 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-[10px] font-bold shadow-sm">Scroll</kbd>
                <span className="opacity-80">Zoom</span>
              </span>
              <span className="w-px h-3.5 bg-current opacity-20" />
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-[10px] font-bold shadow-sm">Drag</kbd>
                <span className="opacity-80">Move</span>
              </span>
              <span className="w-px h-3.5 bg-current opacity-20" />
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-[10px] font-bold shadow-sm">Delete</kbd>
                <span className="opacity-80">Remove</span>
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
