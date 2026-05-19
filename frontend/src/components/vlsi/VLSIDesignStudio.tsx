import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  useNodesState, useEdgesState, addEdge, ReactFlowProvider,
  type Connection, type Edge, type Node, type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Cpu, Play, Pause, SkipForward, Code, Download, Trash, Users, ArrowCounterClockwise, ArrowClockwise, Copy, SignIn, CornersOut, CornersIn, Pulse } from '@phosphor-icons/react';
import { toast } from 'sonner';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

import ComponentLibraryPanel from './ComponentLibraryPanel';
import PropertiesInspector from './PropertiesInspector';
import VLSICanvas from './VLSICanvas';
import { getCatalogEntry } from './componentCatalog';
import { evaluateNode, generateVerilog, generateTestbench } from './vlsiEngine';
import type { LogicState, TimingData } from './types';
import WaveformViewer from './WaveformViewer';
import PromptModal from '../PromptModal';

let nodeCounter = 10;

// ─── Starter Circuit ──────────────────────────────────────────────────────────
const makeStarterNodes = (onPropertyChange: (id: string, f: string, v: any) => void): Node[] => [
  {
    id: 'clk-1', type: 'clock', position: { x: 80, y: 130 },
    data: { refDes: 'CLK1', componentType: 'clock', properties: { frequency: 1, label: 'CLK' }, pins: getCatalogEntry('clock')!.pins, logicOutputs: { out: 0 }, state: { clockState: 0 }, onPropertyChange },
  },
  {
    id: 'sw-1', type: 'input_switch', position: { x: 80, y: 280 },
    data: { refDes: 'SW1', componentType: 'input_switch', properties: { label: 'EN' }, pins: getCatalogEntry('input_switch')!.pins, logicOutputs: { out: 1 }, state: { state: 1 }, onPropertyChange },
  },
  {
    id: 'and-1', type: 'gate_and', position: { x: 300, y: 200 },
    data: { refDes: 'U1', componentType: 'gate_and', properties: {}, pins: getCatalogEntry('gate_and')!.pins, logicOutputs: { out: 0 }, onPropertyChange },
  },
  {
    id: 'led-1', type: 'output_led', position: { x: 520, y: 200 },
    data: { refDes: 'LED1', componentType: 'output_led', properties: { label: 'OUT', color: 'red' }, pins: getCatalogEntry('output_led')!.pins, logicInputs: { in: 0 }, onPropertyChange },
  },
];

const STARTER_EDGES: Edge[] = [
  { id: 'e1', source: 'clk-1', sourceHandle: 'out', target: 'and-1', targetHandle: 'in1', type: 'smoothstep', style: { stroke: '#475569', strokeWidth: 2 } },
  { id: 'e2', source: 'sw-1',  sourceHandle: 'out', target: 'and-1', targetHandle: 'in2', type: 'smoothstep', style: { stroke: '#10B981', strokeWidth: 2 } },
  { id: 'e3', source: 'and-1', sourceHandle: 'out', target: 'led-1', targetHandle: 'in',  type: 'smoothstep', style: { stroke: '#475569', strokeWidth: 2 } },
];

function VLSIDesignStudioInternal({ user, isFullScreen, onExitFullScreen, onRequestFullScreen }: { 
  user?: any; 
  isFullScreen?: boolean; 
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
}) {
  // ─── States & Refs ──────────────────────────────────────────────────────────
  const onPropertyChangeRef = useRef<(id: string, f: string, v: any) => void>(() => {});
  const [nodes, setNodes, onNodesChange] = useNodesState(makeStarterNodes((...args) => onPropertyChangeRef.current(...args)));
  const [edges, setEdges, onEdgesChange] = useEdgesState(STARTER_EDGES);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'schematic' | 'waveform' | 'code'>('schematic');
  const [verilogCode, setVerilogCode] = useState('');
  
  const [simulationHistory, setSimulationHistory] = useState<TimingData[]>([]);
  const [isWaveformExpanded, setIsWaveformExpanded] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Collaboration State
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isColabActive, setIsColabActive] = useState(false);
  const [colabUsers, setColabUsers] = useState(0);
  const yDocRef = useRef<Y.Doc>(new Y.Doc());
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const providerRef = useRef<any>(null);
  const isRemoteChange = useRef(false);
  const isSyncingRef = useRef(false);

  const simIntervalRef = useRef<number | null>(null);
  const simTimeRef = useRef<number>(0);
  const selectedNode = nodes.find(n => n.id === selectedId);

  // Initialize UndoManager
  useEffect(() => {
    const yNodes = yDocRef.current.getMap('nodes');
    const yEdges = yDocRef.current.getMap('edges');
    undoManagerRef.current = new Y.UndoManager([yNodes, yEdges]);
  }, []);

  const handleUndo = useCallback(() => undoManagerRef.current?.undo(), []);
  const handleRedo = useCallback(() => undoManagerRef.current?.redo(), []);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handlePropertyChange = useCallback((id: string, field: string, value: string | number | boolean) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== id) return n;
      if (field === 'state') {
        return {
          ...n,
          data: {
            ...n.data,
            state: { ...(n.data.state as any), state: value },
            logicOutputs: { out: value as LogicState },
          },
        };
      }
      return {
        ...n,
        data: {
          ...n.data,
          properties: { ...(n.data.properties as any), [field]: value },
        },
      };
    }));
  }, [setNodes]);

  useEffect(() => { onPropertyChangeRef.current = handlePropertyChange; }, [handlePropertyChange]);

  const toggleCollaboration = useCallback((existingId?: string) => {
    if (isColabActive && !existingId) {
      providerRef.current?.destroy();
      providerRef.current = null;
      setIsColabActive(false);
      setRoomId(null);
      setColabUsers(0);
      toast.success('Collaboration ended');
    } else {
      const id = existingId || `vlsi-${Math.random().toString(36).substring(2, 9)}`;
      
      // Cleanup previous if switching
      if (providerRef.current) providerRef.current.destroy();

      setRoomId(id);
      providerRef.current = new WebrtcProvider(id, yDocRef.current, {
        signaling: ['wss://y-webrtc-signaling-eu.herokuapp.com', 'wss://y-webrtc-signaling-us.herokuapp.com'],
      });

      providerRef.current.on('peers', (params: any) => {
        setColabUsers(params.webrtcConns.size + 1);
      });

      setIsColabActive(true);
      toast.success(existingId ? `Joined room: ${id}` : `Started room: ${id}`);
    }
  }, [isColabActive]);

  const handleJoinRoom = useCallback(() => {
    setIsJoinModalOpen(true);
  }, []);

  const onConfirmJoin = useCallback((id: string) => {
    setIsJoinModalOpen(false);
    if (id && id.trim()) {
      toggleCollaboration(id.trim());
    }
  }, [toggleCollaboration]);

  const handleCopyRoomId = useCallback(() => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied to clipboard');
    }
  }, [roomId]);

  const onConnect = useCallback((params: Connection) => {
    const edgeId = `e-${params.source}-${params.target}-${params.sourceHandle}-${params.targetHandle}-${Date.now()}`;
    const newEdge: Edge = {
      ...params,
      id: edgeId,
      type: 'smoothstep',
      style: { stroke: '#475569', strokeWidth: 2 }
    };

    setEdges(eds => {
      const next = addEdge(newEdge, eds);
      if (isColabActive) {
        const yEdges = yDocRef.current.getMap('edges');
        yEdges.set(edgeId, newEdge);
      }
      return next;
    });
  }, [setEdges, isColabActive]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => setSelectedId(node.id), []);
  const onPaneClick = useCallback(() => setSelectedId(null), []);

  const handleAddComponent = useCallback((type: string, position?: XYPosition) => {
    const catalog = getCatalogEntry(type);
    if (!catalog) return;
    const id = `node-${Date.now()}-${++nodeCounter}`;
    const newNode: Node = {
      id,
      type: catalog.type,
      position: position || { x: 250 + Math.random() * 60, y: 200 + Math.random() * 60 },
      data: {
        componentType: catalog.type,
        refDes: `${catalog.refDesPrefix}${nodeCounter}`,
        properties: { ...(catalog.defaultProperties ?? {}) },
        pins: catalog.pins,
        state: catalog.type === 'input_switch' ? { state: 0 } : catalog.type === 'clock' ? { clockState: 0 } : {},
        logicOutputs: {},
        logicInputs: {},
        onPropertyChange: (...args: [string, string, any]) => onPropertyChangeRef.current(...args),
      },
    };
    setNodes(nds => {
      const next = nds.concat(newNode);
      const yNodes = yDocRef.current.getMap('nodes');
      yNodes.set(newNode.id, { ...newNode, data: { ...newNode.data, onPropertyChange: undefined } });
      return next;
    });
    toast.success(`Added ${catalog.label}`, { duration: 1500 });
  }, [setNodes]);

  const handleDeleteNode = useCallback((id: string) => {
    const yNodes = yDocRef.current.getMap('nodes');
    const yEdges = yDocRef.current.getMap('edges');
    
    yDocRef.current.transact(() => {
      yNodes.delete(id);
      // Also delete connected edges from Yjs
      yEdges.forEach((edge: any, edgeId) => {
        if (edge.source === id || edge.target === id) {
          yEdges.delete(edgeId);
        }
      });
    });

    if (selectedId === id) setSelectedId(null);
    toast.info('Component deleted', { duration: 1500 });
  }, [selectedId]);

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    const yNodes = yDocRef.current.getMap('nodes');
    const yEdges = yDocRef.current.getMap('edges');
    
    yDocRef.current.transact(() => {
      deletedNodes.forEach(node => {
        yNodes.delete(node.id);
        // Also cleanup edges connected to this node in Yjs
        yEdges.forEach((edge: any, edgeId) => {
          if (edge.source === node.id || edge.target === node.id) {
            yEdges.delete(edgeId);
          }
        });
      });
    });
  }, []);

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    const yEdges = yDocRef.current.getMap('edges');
    yDocRef.current.transact(() => {
      deletedEdges.forEach(edge => yEdges.delete(edge.id));
    });
  }, []);

  // ─── Sync Yjs to Local State (THE SOURCE OF TRUTH) ────────────────────────
  useEffect(() => {
    const yNodes = yDocRef.current.getMap('nodes');
    const yEdges = yDocRef.current.getMap('edges');

    const syncFromYjs = () => {
      const remoteNodes = Array.from(yNodes.values()).map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          onPropertyChange: (...args: [string, string, any]) => onPropertyChangeRef.current(...args),
        }
      }));
      const remoteEdges = Array.from(yEdges.values()) as Edge[];
      
      setNodes(remoteNodes as Node[]);
      setEdges(remoteEdges);
    };

    // Initialize Yjs if empty (seed it)
    if (yNodes.size === 0 && nodes.length > 0) {
      yDocRef.current.transact(() => {
        nodes.forEach(n => yNodes.set(n.id, { ...n, data: { ...n.data, onPropertyChange: undefined } }));
        edges.forEach(e => yEdges.set(e.id, e));
      });
    } else {
      syncFromYjs();
    }

    yNodes.observe(syncFromYjs);
    yEdges.observe(syncFromYjs);
    return () => {
      yNodes.unobserve(syncFromYjs);
      yEdges.unobserve(syncFromYjs);
    };
  }, []); // Only on mount

  // ─── Sync Local Node Positions ONLY to Yjs (Performance) ──────────────────
  // We handle ADD/DELETE specifically in their handlers to avoid loops
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    const yNodes = yDocRef.current.getMap('nodes');
    yNodes.set(node.id, { ...node, data: { ...node.data, onPropertyChange: undefined } });
  }, []);

  const runSimulationStep = useCallback(() => {
    setNodes(currentNodes => {
      // 1) Toggle clocks
      let updated = currentNodes.map(n => {
        if (n.type !== 'clock') return n;
        const prev = (n.data.state as any)?.clockState ?? 0;
        const next = prev === 1 ? 0 : 1;
        return {
          ...n,
          data: { ...n.data, state: { ...(n.data.state as any), clockState: next }, logicOutputs: { out: next } },
        };
      });

      // 2) Iterative combinational settling (4 passes)
      for (let pass = 0; pass < 4; pass++) {
        updated = updated.map(n => {
          const nodeInputs: Record<string, LogicState> = {};
          edges.forEach(edge => {
            if (edge.target !== n.id) return;
            const src = updated.find(s => s.id === edge.source);
            if (!src) return;
            const val = (src.data.logicOutputs as any)?.[edge.sourceHandle!];
            nodeInputs[edge.targetHandle!] = val;
          });
          const { outputs, newState } = evaluateNode(n.type ?? '', nodeInputs, (n.data.state as any) ?? {});
          return {
            ...n,
            data: { ...n.data, state: newState, logicOutputs: outputs, logicInputs: nodeInputs },
          };
        });
      }

      // 3) Capture History for Waveform Viewer
      const currentSignals: Record<string, LogicState> = {};
      updated.forEach(n => {
        const signalName = (n.data.properties as any)?.label || n.data.refDes;
        if (signalName) {
          const outputs = n.data.logicOutputs as Record<string, LogicState> | undefined;
          const inputs = n.data.logicInputs as Record<string, LogicState> | undefined;

          if (outputs && Object.keys(outputs).length > 0) {
            const keys = Object.keys(outputs);
            if (keys.length === 1) {
              currentSignals[signalName] = outputs[keys[0]];
            } else {
              keys.forEach(k => { currentSignals[`${signalName}_${k}`] = outputs[k]; });
            }
          } else if (inputs && Object.keys(inputs).length > 0) {
            const keys = Object.keys(inputs);
            if (keys.length === 1) {
              currentSignals[signalName] = inputs[keys[0]];
            } else {
              keys.forEach(k => { currentSignals[`${signalName}_${k}`] = inputs[k]; });
            }
          }
        }
      });

      setSimulationHistory(prev => {
        const next = [...prev, { timestamp: simTimeRef.current++, signals: currentSignals }];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });

      // 4) Update Edges based on the new node states
      setEdges(currentEdges => currentEdges.map(e => {
        const src = updated.find(n => n.id === e.source);
        const val = src ? (src.data.logicOutputs as any)?.[e.sourceHandle!] : undefined;
        const color = val === 1 ? '#10B981' : val === 0 ? '#F43F5E' : '#475569';
        return {
          ...e,
          animated: val === 1,
          style: { ...e.style, stroke: color, strokeWidth: val === 1 ? 2.5 : 2 },
        };
      }));

      return updated;
    });
  }, [edges, setNodes, setEdges]);

  useEffect(() => {
    if (isRunning) {
      simIntervalRef.current = window.setInterval(runSimulationStep, 500);
    } else {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    }
    return () => { if (simIntervalRef.current) clearInterval(simIntervalRef.current); };
  }, [isRunning, runSimulationStep]);

  const getGraphData = useCallback(() => ({
    nodes: nodes.map(n => ({ id: n.id, type: n.type ?? '', properties: (n.data.properties as any) ?? {}, refDes: n.data.refDes as string })),
    edges: edges.map(e => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle ?? '', target: e.target, targetHandle: e.targetHandle ?? '' })),
  }), [nodes, edges]);

  const handleGenerateCode = useCallback(() => {
    try {
      setVerilogCode(generateVerilog(getGraphData()));
      setMode('code');
    } catch (err) {
      toast.error('Failed to generate Verilog.');
    }
  }, [getGraphData]);

  const handleGenerateTestbench = useCallback(() => {
    try {
      setVerilogCode(generateTestbench(getGraphData(), 'TopModule'));
      setMode('code');
      toast.success('Testbench generated!');
    } catch (err) {
      toast.error('Failed to generate Testbench.');
    }
  }, [getGraphData]);

  const handleClear = useCallback(() => {
    setNodes([]); setEdges([]); setSelectedId(null); setIsRunning(false);
    setSimulationHistory([]); simTimeRef.current = 0;
    toast.info('Canvas cleared');
  }, [setNodes, setEdges]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([verilogCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'design.v'; a.click();
    URL.revokeObjectURL(url);
  }, [verilogCode]);

  return (
    <div className="w-full h-full min-h-0 flex bg-[#0B0F19] text-slate-200 overflow-hidden relative">

      {/* ── Fullscreen Prompt Overlay (when embedded) ── */}
      {!isFullScreen && onRequestFullScreen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(5,7,12,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="flex flex-col items-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <CornersOut size={28} weight="bold" className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Silicon Studio</h3>
              <p className="text-sm text-gray-400 max-w-xs">For the best VLSI design experience, open the editor in full screen.</p>
            </div>
            <button
              onClick={onRequestFullScreen}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-600/20 text-sm"
            >
              <CornersOut size={18} weight="bold" />
              View in Full Screen
            </button>
          </div>
        </div>
      )}
      {/* Left panel */}
      <div className="w-60 shrink-0 h-full relative z-10 border-r border-slate-800/70">
        <ComponentLibraryPanel onAddComponent={handleAddComponent} />
      </div>

      {/* Centre */}
      <div className="flex-1 flex flex-col relative h-full min-w-0">
        {/* Top toolbar — matches PCB Copper Studio layout */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/60 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu size={16} weight="bold" className="text-white" />
            </div>
            <span className="font-bold text-sm text-gray-200">Silicon Studio</span>

            {/* Mode toggle */}
            <div className="flex items-center bg-transparent border border-gray-800/50 rounded-full p-0.5 ml-2 backdrop-blur-sm">
              <button onClick={() => setMode('schematic')} className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ${mode === 'schematic' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'}`}>
                <Cpu size={13} weight="bold" /> Schematic
              </button>
              <button onClick={() => setMode('waveform')} className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ${mode === 'waveform' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'}`}>
                <Pulse size={13} weight="bold" /> Waveforms {simulationHistory.length > 0 && `(${simulationHistory.length})`}
              </button>
              <button onClick={() => setMode('code')} className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ${mode === 'code' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'}`}>
                <Code size={13} weight="bold" /> HDL Code
              </button>
            </div>

            {/* Simulation controls — pill container */}
            <div className="flex items-center bg-transparent border border-gray-800/50 rounded-full p-0.5 ml-2 backdrop-blur-sm">
              <button
                onClick={() => setIsRunning(r => !r)}
                className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ${isRunning ? 'bg-amber-500 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md'}`}
              >
                {isRunning ? <Pause size={12} weight="fill" /> : <Play size={12} weight="fill" />}
                {isRunning ? 'Stop' : 'Run'}
              </button>
              <button
                onClick={runSimulationStep}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all text-gray-400 hover:text-gray-300 disabled:opacity-30"
              >
                <SkipForward size={12} weight="fill" /> Step
              </button>
            </div>

            {/* Collaboration — pill container */}
            <div className="flex items-center bg-transparent border border-gray-800/50 rounded-full p-0.5 ml-1 backdrop-blur-sm">
              <button
                onClick={() => toggleCollaboration()}
                className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all relative ${isColabActive ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'}`}
                title={isColabActive ? `In Room: ${roomId} (Click to Stop)` : 'Start New Room'}
              >
                <Users size={13} weight={isColabActive ? "fill" : "bold"} />
                {isColabActive ? `${colabUsers} Active` : 'Host Lab'}
                {isColabActive && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" />}
              </button>

              {isColabActive && (
                <button
                  onClick={handleCopyRoomId}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
                  title="Copy Room ID"
                >
                  <Copy size={13} weight="bold" /> Copy ID
                </button>
              )}

              {!isColabActive && (
                <button
                  onClick={handleJoinRoom}
                  className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all text-gray-400 hover:text-gray-300"
                  title="Join Existing Room"
                >
                  <SignIn size={13} weight="bold" /> Join
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={handleUndo} title="Undo" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"><ArrowCounterClockwise size={14} weight="bold" /></button>
            <button onClick={handleRedo} title="Redo" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"><ArrowClockwise size={14} weight="bold" /></button>
            <div className="w-px h-5 bg-gray-700 mx-1" />
            <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"><Trash size={13} weight="bold" /> Clear</button>
            <div className="w-px h-5 bg-gray-700 mx-1" />
            <button 
              onClick={() => isFullScreen && onExitFullScreen ? onExitFullScreen() : onRequestFullScreen?.()}
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              {isFullScreen ? <CornersIn size={14} weight="bold" /> : <CornersOut size={14} weight="bold" />}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-[#0B0F19] flex flex-col">
          <div className="flex-1 relative">
            {mode === 'schematic' && (
              <>
                <VLSICanvas
                  nodes={nodes} edges={edges}
                  onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                  onConnect={onConnect} onNodeClick={onNodeClick} onPaneClick={onPaneClick}
                  onNodesDelete={onNodesDelete} onEdgesDelete={onEdgesDelete}
                  onNodeDragStop={onNodeDragStop}
                  onDrop={(type, pos) => handleAddComponent(type, pos)}
                />
                {isRunning && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 backdrop-blur pointer-events-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SIMULATING
                  </div>
                )}
              </>
            )}

            {mode === 'waveform' && (
              <div className="absolute inset-0 bg-[#0B0F19]">
                {simulationHistory.length > 0 ? (
                  <WaveformViewer 
                    history={simulationHistory} 
                    onClose={() => setMode('schematic')}
                    isExpanded={true}
                    onToggleExpand={() => {}}
                    onClear={() => setSimulationHistory([])}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <Pulse size={48} className="mb-4 opacity-20" />
                    <p>No waveform data available.</p>
                    <p className="text-sm mt-2">Run a simulation first to capture logic states.</p>
                  </div>
                )}
              </div>
            )}

            {mode === 'code' && (
              <div className="absolute inset-0 bg-[#0F172A] p-6 overflow-auto">
                <div className="max-w-4xl mx-auto flex flex-col h-full bg-[#0B0F19] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
                  <div className="px-5 py-3 bg-slate-800/50 border-b border-slate-700/80 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Code size={16} className="text-indigo-400" /> Generated Verilog HDL
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={handleGenerateCode} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 rounded-lg transition-colors">
                        <Code size={14} /> Generate HDL
                      </button>
                      <button onClick={handleGenerateTestbench} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 rounded-lg transition-colors">
                        <Code size={14} /> Generate Testbench
                      </button>
                      <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors">
                        <Download size={14} /> Download .v
                      </button>
                    </div>
                  </div>
                  <div className="p-5 overflow-y-auto flex-1">
                    {verilogCode ? (
                      <pre className="font-mono text-[13px] text-emerald-400 leading-relaxed whitespace-pre-wrap">{verilogCode}</pre>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <Code size={48} className="mb-4 opacity-20" />
                        <p>No code generated yet.</p>
                        <button onClick={handleGenerateCode} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors">
                          Generate HDL Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PromptModal
        open={isJoinModalOpen}
        title="Join Collaborative Room"
        message="Enter the Room ID shared by your partner to start working together in real-time."
        placeholder="e.g. vlsi-x2y3z4"
        confirmText="Join Room"
        onConfirm={onConfirmJoin}
        onCancel={() => setIsJoinModalOpen(false)}
      />

      {/* Right panel */}
      <div className="w-60 shrink-0 h-full relative z-10 border-l border-slate-800/70">
        <PropertiesInspector
          selectedNode={selectedNode}
          onPropertyChange={handlePropertyChange}
          onDelete={handleDeleteNode}
        />
      </div>


    </div>
  );
}

export default function VLSIDesignStudio(props: { 
  user?: any;
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <VLSIDesignStudioInternal {...props} />
    </ReactFlowProvider>
  );
}
