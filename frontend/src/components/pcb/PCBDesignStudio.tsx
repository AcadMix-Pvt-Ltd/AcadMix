import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNodesState, useEdgesState, addEdge, type Connection, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Circuitry, Code, ShieldCheck, ListBullets, Export, FloppyDisk, ArrowCounterClockwise, ArrowClockwise, Stack, ShareNetwork, LockKey, LockKeyOpen, CornersOut, CornersIn, Copy, Check, WaveSine, Users, List } from '@phosphor-icons/react';
import ComponentLibraryPanel from './ComponentLibraryPanel';
import PropertiesInspector from './PropertiesInspector';
import PCBCanvas from './PCBCanvas';
import { pcbNodeTypes, logicalNodeTypes } from './nodes';
import LayerManagerPanel, { type PCBLayer } from './LayerManagerPanel';
import PCBLayoutMenu from './PCBLayoutMenu';
import type { ComponentType } from './types';
import { getCatalogEntry } from './componentCatalog';
import { runDRC, generateNetlistText, generateBOM, bomToCSV, exportKiCadNetlist, downloadFile, generateSPICENetlist, generatePickPlace, pickPlaceToCSV, generatePCBInfo, type PCBInfo } from './pcbEngine';
import { exportGerbers } from './gerberExporter';
import PCB3DViewer from './PCB3DViewer';
import { Simulation as EEcircuitSimulation } from 'eecircuit-engine';
import SpiceChart from '../SpiceChart';
import { DEFAULT_DSL, parseDSL, serializeDSL } from './circuitDSL';
import { useCollaboration } from './useCollaboration';
import { toast } from 'sonner';

let nodeCounter = 100;
const refDesCounters: Record<string, number> = {};

function getNextRefDes(prefix: string): string {
  refDesCounters[prefix] = (refDesCounters[prefix] || 0) + 1;
  return `${prefix}${refDesCounters[prefix]}`;
}

// Default starter circuit
const STARTER_NODES: Node[] = [
  { id: 'board-1', type: 'board', position: { x: 0, y: 0 }, data: { refDes: 'BRD1', componentType: 'board_custom', category: 'board', label: 'Custom Resizable Board', width: 800, height: 600 }, style: { width: 800, height: 600 }, draggable: true, selectable: true, zIndex: -1 },
  { id: 'comp-1', type: 'vcc_node', position: { x: 100, y: 60 }, data: { refDes: 'PWR1', componentType: 'vcc_node', category: 'power', label: 'VCC Rail', properties: { value: '5V' }, pins: getCatalogEntry('vcc_node')!.pins } },
  { id: 'comp-2', type: 'res_0805_330', position: { x: 300, y: 60 }, data: { refDes: 'R1', componentType: 'res_0805_330', category: 'passive', label: 'Resistor 330Ω 0805', properties: { value: '330Ω', package: '0805' }, pins: getCatalogEntry('res_0805_330')!.pins } },
  { id: 'comp-3', type: 'led_red', position: { x: 520, y: 60 }, data: { refDes: 'D1', componentType: 'led_red', category: 'active', label: 'LED Red', properties: { value: 'Red', color: 'red', package: '0603' }, pins: getCatalogEntry('led_red')!.pins } },
  { id: 'comp-4', type: 'gnd_node', position: { x: 720, y: 60 }, data: { refDes: 'GND1', componentType: 'gnd_node', category: 'power', label: 'GND Node', properties: { value: 'GND' }, pins: getCatalogEntry('gnd_node')!.pins } },
];

const STARTER_EDGES: Edge[] = [
  { id: 'e-1', source: 'comp-1', sourceHandle: '1', target: 'comp-2', targetHandle: '1', type: 'straight', data: { layer: 'TopLayer' }, style: { stroke: '#ff0000', strokeWidth: 3, mixBlendMode: 'screen' } },
  { id: 'e-2', source: 'comp-2', sourceHandle: '2', target: 'comp-3', targetHandle: 'a', type: 'straight', data: { layer: 'TopLayer' }, style: { stroke: '#ff0000', strokeWidth: 3, mixBlendMode: 'screen' } },
  { id: 'e-3', source: 'comp-3', sourceHandle: 'k', target: 'comp-4', targetHandle: '1', type: 'straight', data: { layer: 'BottomLayer' }, style: { stroke: '#0000ff', strokeWidth: 3, mixBlendMode: 'screen' } },
];

export default function PCBDesignStudio({ user, isFullScreen: externalFullScreen, onExitFullScreen, onRequestFullScreen }: { 
  user?: any;
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
}) {
  const [roomId, setRoomId] = useState(() => 'PCB-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [isHost, setIsHost] = useState(true);
  
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const effectiveFullScreen = externalFullScreen ?? isFullScreen;

  const [mode, setMode] = useState<'schematic' | 'visual' | 'code' | '3d'>('schematic');
  const [lockCircuit, setLockCircuit] = useState(false);

  const { 
    nodes, edges, 
    onNodesChange, onEdgesChange, 
    onConnectEdges, addNode, 
    updateNodeProperty, deleteNode, 
    setGraph, connected, users, awareness,
    layerVisibility, toggleLayerVisibility,
    undo: handleUndo, redo: handleRedo,
    guestStatus, pendingGuests, joinWaitingRoom, acceptGuest, rejectGuest
  } = useCollaboration(STARTER_NODES, STARTER_EDGES, roomId, user, isHost, lockCircuit);
  
  // Layer Management State
  const [activeLayer, setActiveLayer] = useState<PCBLayer>('TopLayer');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(true);
  const [drcResults, setDrcResults] = useState<any[]>([]);
  const [showDRC, setShowDRC] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showNetlist, setShowNetlist] = useState(false);
  const [netlistText, setNetlistText] = useState('');
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [simOutput, setSimOutput] = useState<any>(null);
  const [showSimOutput, setShowSimOutput] = useState(false);
  const [codeText, setCodeText] = useState(DEFAULT_DSL);
  const [undoStack, setUndoStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [showPCBLayoutMenu, setShowPCBLayoutMenu] = useState(false);
  const [showPCBInfo, setShowPCBInfo] = useState(false);
  const [pcbInfo, setPcbInfo] = useState<PCBInfo | null>(null);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId), [nodes, selectedId]);
  const selectedForInspector = useMemo(() => {
    if (!selectedNode) return null;
    
    // Copy existing properties
    const properties = { ...((selectedNode.data as any)?.properties || {}) };
    
    // Inject dynamic dimensions for resizable components
    const category = (selectedNode.data as any)?.category;
    if (category === 'board' || selectedNode.type === 'copper_pour') {
      properties.width = Math.round(selectedNode.width || selectedNode.measured?.width || (selectedNode.style?.width as number) || properties.width || 0);
      properties.height = Math.round(selectedNode.height || selectedNode.measured?.height || (selectedNode.style?.height as number) || properties.height || 0);
    }
    
    return { 
      id: selectedNode.id, 
      type: selectedNode.type as ComponentType, 
      refDes: (selectedNode.data as any)?.refDes || '', 
      properties 
    };
  }, [selectedNode]);

  const saveUndo = useCallback(() => {
    // In a CRDT environment, standard local undo/redo requires a Yjs UndoManager.
    // For this POC, we'll bypass local undo.
  }, []);

  const onConnect = useCallback((params: Connection) => {
    const color = activeLayer === 'TopLayer' ? '#ff0000' : '#0000ff';
    onConnectEdges(params, mode === 'schematic' ? 'default' : 'step', activeLayer, color);
  }, [onConnectEdges, activeLayer, mode]);

  // Build CircuitGraph from React Flow state for engine calls
  const buildGraph = useCallback(() => {
    const components = nodes.map(n => ({ id: n.id, type: (n.data as any).componentType || n.type as ComponentType, refDes: (n.data as any).refDes || n.id, position: n.position, rotation: 0, properties: (n.data as any).properties || {} }));
    const wires = edges.map(e => ({ id: e.id, fromComponent: e.source, fromPin: e.sourceHandle || '1', toComponent: e.target, toPin: e.targetHandle || '1' }));
    return { components, wires, metadata: { name: 'AcadMix Circuit', author: 'Student', created: new Date().toISOString(), modified: new Date().toISOString(), version: 1 } };
  }, [nodes, edges]);

  const handleAddComponent = useCallback((type: ComponentType) => {
    saveUndo();
    const catalog = getCatalogEntry(type);
    if (!catalog) return;
    const id = `comp-${++nodeCounter}`;
    const refDes = getNextRefDes(catalog.refDesPrefix);
    const newNode: Node = {
      id,
      type: catalog.category === 'board' ? 'board' : type,
      position: { x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 },
      data: { refDes, componentType: type, category: catalog.category, label: catalog.label, properties: { ...catalog.defaultProperties }, pins: catalog.pins },
      style: catalog.category === 'board' ? { width: catalog.defaultProperties.width || 800, height: catalog.defaultProperties.height || 600 } : undefined,
      zIndex: catalog.category === 'board' ? -1 : 0
    };
    addNode(newNode);
  }, [addNode]);

  const handlePropertyChange = useCallback((nodeId: string, field: string, value: any) => {
    updateNodeProperty(nodeId, field, value);
  }, [updateNodeProperty]);

  const handleDelete = useCallback((nodeId: string) => {
    deleteNode(nodeId);
    setSelectedId(null);
  }, [deleteNode]);

  const handleDuplicate = useCallback((nodeId: string) => {
    const orig = nodes.find(n => n.id === nodeId);
    if (!orig) return;
    const catalog = getCatalogEntry((orig.data as any).componentType || orig.type as ComponentType);
    const id = `comp-${++nodeCounter}`;
    const refDes = getNextRefDes(catalog?.refDesPrefix || 'X');
    const dup: Node = { ...orig, id, position: { x: orig.position.x + 40, y: orig.position.y + 40 }, data: { ...orig.data, refDes } };
    addNode(dup);
    setSelectedId(id);
  }, [nodes, addNode]);

  const handleRotate = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const currentRot = Number((node.data as any).properties?.rotation || 0);

    // If it's a board, swap width and height to correctly rotate the bounding box
    if (node.type === 'board') {
      const w = Number((node.data as any).properties?.width || node.style?.width || 800);
      const h = Number((node.data as any).properties?.height || node.style?.height || 600);
      updateNodeProperty(nodeId, 'width', h);
      updateNodeProperty(nodeId, 'height', w);
    }

    updateNodeProperty(nodeId, 'rotation', (currentRot + 90) % 360);
  }, [nodes, updateNodeProperty]);

  const handleRunDRC = useCallback(() => {
    const graph = buildGraph();
    const results = runDRC(graph);
    setDrcResults(results);
    setShowDRC(true);
  }, [buildGraph]);

  const handleNetlist = useCallback(() => {
    const graph = buildGraph();
    setNetlistText(generateNetlistText(graph));
    setShowNetlist(true);
  }, [buildGraph]);

  const handleSimulate = useCallback(async () => {
    const graph = buildGraph();
    const spice = generateSPICENetlist(graph);
    setIsSimulating(true);
    setSimOutput(null);
    setShowSimOutput(true);
    
    try {
      const sim = new EEcircuitSimulation();
      await sim.start();
      sim.setNetList(spice);
      const res = await Promise.race([
        sim.runSim(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Simulation timeout (15s)')), 15000))
      ]);
      setSimOutput(res);
    } catch (e: any) {
      setSimOutput({ error: e.message || 'Simulation failed' });
    } finally {
      setIsSimulating(false);
    }
  }, [buildGraph]);

  const handleExportBOM = useCallback(() => {
    const graph = buildGraph();
    const bom = generateBOM(graph);
    downloadFile(bomToCSV(bom), 'acadmix_bom.csv', 'text/csv');
    toast.success('BOM exported successfully');
  }, [buildGraph]);

  const handleExportGerber = useCallback(() => {
    const graph = buildGraph();
    const gerbers = exportGerbers(graph);
    downloadFile(gerbers.topCopper, 'CAM_Top.gbr', 'text/plain');
    setTimeout(() => downloadFile(gerbers.bottomCopper, 'CAM_Bottom.gbr', 'text/plain'), 300);
    setTimeout(() => downloadFile(gerbers.outline, 'CAM_Outline.gbr', 'text/plain'), 600);
    setTimeout(() => downloadFile(gerbers.drill, 'CAM_Drill.drl', 'text/plain'), 900);
    toast.success('Gerber fabrication files exported');
  }, [buildGraph]);

  const handleExportPickPlace = useCallback(() => {
    const graph = buildGraph();
    const pp = generatePickPlace(graph);
    downloadFile(pickPlaceToCSV(pp), 'acadmix_pick_place.csv', 'text/csv');
    toast.success('Pick and Place file exported');
  }, [buildGraph]);

  const handleShowPCBInfo = useCallback(() => {
    const graph = buildGraph();
    const info = generatePCBInfo(graph);
    setPcbInfo(info);
    setShowPCBInfo(true);
  }, [buildGraph]);

  const handleCanvasSettings = useCallback(() => {
    toast.info('Canvas Settings — Coming Soon', { description: 'Unit selection (mm/mil) and grid customization is on our roadmap.', duration: 3000 });
  }, []);


  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if (e.key === 'F5') { e.preventDefault(); handleRunDRC(); }
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); setMode('visual'); }
      if (e.ctrlKey && e.key === '2') { e.preventDefault(); setMode('code'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, handleRunDRC]);

  // Code mode sync
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCodeText(e.target.value);
  }, []);

  const syncCodeToVisual = useCallback(() => {
    const result = parseDSL(codeText);
    if (result.graph && result.errors.length === 0) {
      saveUndo();
      const newNodes: Node[] = result.graph.components.map(c => {
        const catalog = getCatalogEntry(c.type);
        return { id: c.id, type: c.type, position: c.position, data: { refDes: c.refDes, componentType: c.type, category: catalog?.category || 'passive', label: catalog?.label || c.type, properties: c.properties, pins: catalog?.pins || [] } };
      });
      const newEdges: Edge[] = result.graph.wires.map(w => ({ id: w.id, source: w.fromComponent, sourceHandle: w.fromPin, target: w.toComponent, targetHandle: w.toPin, type: 'step', style: { stroke: '#d4a574', strokeWidth: 3 } }));
      setGraph(newNodes, newEdges);
    }
  }, [codeText, setGraph]);

  const syncVisualToCode = useCallback(() => {
    const graph = buildGraph();
    setCodeText(serializeDSL(graph));
  }, [buildGraph]);

  const drcErrorCount = drcResults.filter(r => r.severity === 'error').length;
  const drcWarnCount = drcResults.filter(r => r.severity === 'warning').length;

  return (
    <div className={effectiveFullScreen 
      ? "fixed inset-0 z-[100] w-screen h-screen flex flex-col bg-gray-950" 
      : "w-full h-full min-h-0 flex flex-col bg-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-gray-800/50 relative"
    }>

      {/* ── Fullscreen Prompt Overlay (when embedded) ── */}
      {!effectiveFullScreen && onRequestFullScreen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(5,7,12,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="flex flex-col items-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <CornersOut size={28} weight="bold" className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Copper Studio</h3>
              <p className="text-sm text-gray-400 max-w-xs">For the best PCB design experience, open the editor in full screen.</p>
            </div>
            <button
              onClick={onRequestFullScreen}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/20 text-sm"
            >
              <CornersOut size={18} weight="bold" />
              View in Full Screen
            </button>
          </div>
        </div>
      )}
      
      {/* ── Waiting Room UI for Guest ── */}
      {!isHost && guestStatus === 'confirming' && (
        <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-md flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} weight="duotone" className="text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Join PCB Studio</h2>
            <p className="text-gray-400 mb-6">
              You are requesting to join a collaborative PCB design session. Your profile ({user?.name || 'Guest'}) will be shared with the host.
            </p>
            <div className="flex gap-4">
              <button onClick={() => window.history.back()} className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={joinWaitingRoom} className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">
                Request to Join
              </button>
            </div>
          </div>
        </div>
      )}

      {!isHost && guestStatus === 'waiting' && (
        <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-md flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Waiting for Host...</h2>
            <p className="text-gray-400">
              Your request has been sent. Please wait while the host approves your join request.
            </p>
          </div>
        </div>
      )}

      {!isHost && guestStatus === 'rejected' && (
        <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-md flex items-center justify-center">
          <div className="bg-gray-900 border border-rose-800/50 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <WarningCircle size={32} weight="duotone" className="text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Request Denied</h2>
            <p className="text-gray-400 mb-6">
              The host declined your request to join this session.
            </p>
            <button onClick={() => {
              setIsHost(true);
              setRoomId('PCB-' + Math.random().toString(36).substring(2, 8).toUpperCase());
            }} className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors">
              Return to My Studio
            </button>
          </div>
        </div>
      )}

      {/* ── Join Room Prompt ── */}
      {showJoinPrompt && (
        <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-md flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Join Room</h2>
            <p className="text-gray-400 mb-6 text-center text-sm">
              Enter the Room Code shared by the host to join their collaborative session.
            </p>
            <input 
              type="text" 
              placeholder="e.g. PCB-X7A9B"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-center text-lg mb-6 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <div className="flex gap-4">
              <button onClick={() => {
                setShowJoinPrompt(false);
                setJoinCodeInput('');
              }} className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button 
                disabled={!joinCodeInput.trim()}
                onClick={() => {
                  if (joinCodeInput.trim()) {
                    setRoomId(joinCodeInput.trim());
                    setIsHost(false);
                    setShowJoinPrompt(false);
                  }
                }} 
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending Guests Toast for Host ── */}
      {isHost && pendingGuests.length > 0 && (
        <div className="absolute top-16 right-4 z-50 w-80 flex flex-col gap-2">
          {pendingGuests.map((guest, idx) => (
            <div key={idx} className="bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-2xl animate-fade-in-up">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {guest.name}
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300">{guest.role}</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">{guest.collegeId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => acceptGuest(guest.id)} className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                  Admit
                </button>
                <button onClick={() => rejectGuest(guest.id)} className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/60 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Circuitry size={16} weight="bold" className="text-white" />
          </div>
          <span className="font-bold text-sm text-gray-200">Copper Studio</span>

          {/* ── PCB Layout Menu Trigger ── */}
          <div className="relative">
            <button
              onClick={() => setShowPCBLayoutMenu(!showPCBLayoutMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${
                showPCBLayoutMenu
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border-gray-700/50'
              }`}
            >
              <List size={13} weight="bold" />
              PCB Layout
            </button>
            <PCBLayoutMenu
              isOpen={showPCBLayoutMenu}
              onToggle={() => setShowPCBLayoutMenu(!showPCBLayoutMenu)}
              onClose={() => setShowPCBLayoutMenu(false)}
              onRunDRC={handleRunDRC}
              onShowNetlist={handleNetlist}
              onExportBOM={handleExportBOM}
              onExportGerber={handleExportGerber}
              onShowLayers={() => setShowLayersMenu(!showLayersMenu)}
              onShow3D={() => setMode('3d')}
              onShowPCBInfo={handleShowPCBInfo}
              onExportPickPlace={handleExportPickPlace}
              onCanvasSettings={handleCanvasSettings}
            />
          </div>

          <div className="flex items-center gap-2 ml-4">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} title={connected ? 'Connected to Room' : 'Disconnected'} />
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{Math.max(1, users.length)} Online</span>
            <div className="flex -space-x-2 ml-2">
              {(users.length > 0 ? users : [{ name: user?.name || 'You', color: '#6366f1' }]).map((u, i) => (
                <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-gray-900" style={{ backgroundColor: u.color }} title={u.name}>
                  {u.name.substring(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
            
            <div className="w-px h-4 bg-gray-700 mx-2" />
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider whitespace-nowrap">Room: <span className="text-gray-300">{roomId}</span></span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              title={copiedLink ? 'Copied!' : 'Copy Room Code'}
              className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 transition-colors shrink-0 ml-1"
            >
              {copiedLink ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
            </button>
            <button 
              onClick={() => setShowJoinPrompt(true)}
              title="Join Room"
              className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
            >
              <Users size={14} weight="bold" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center bg-transparent border border-gray-800/50 rounded-full p-0.5 ml-2 backdrop-blur-sm">
            <button onClick={() => { setMode('schematic'); }} className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ${mode === 'schematic' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> Schematic
            </button>
            <button onClick={() => { setMode('visual'); }} className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ${mode === 'visual' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'}`}>
              <Circuitry size={12} weight="bold" /> 2D PCB
            </button>
            <button onClick={() => { setMode('3d'); }} className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ${mode === '3d' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg> 3D View
            </button>
            <button onClick={() => { setMode('code'); syncVisualToCode(); }} className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap transition-all ${mode === 'code' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'}`}>
              <Code size={12} weight="bold" /> Code
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setLockCircuit(!lockCircuit)} 
            title={lockCircuit ? "Unlock Circuit components" : "Lock Circuit (Group move)"} 
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold ${lockCircuit ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
          >
            {lockCircuit ? <LockKey size={14} weight="bold" /> : <LockKeyOpen size={14} weight="bold" />}
          </button>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <button onClick={handleUndo} title="Undo (Ctrl+Z)" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"><ArrowCounterClockwise size={14} weight="bold" /></button>
          <button onClick={handleRedo} title="Redo (Ctrl+Y)" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"><ArrowClockwise size={14} weight="bold" /></button>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <button onClick={handleRunDRC} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"><ShieldCheck size={13} weight="bold" /> DRC</button>
          <button onClick={handleNetlist} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"><ListBullets size={13} weight="bold" /> Netlist</button>
          <button onClick={handleSimulate} disabled={isSimulating} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors disabled:opacity-50"><WaveSine size={13} weight="bold" /> {isSimulating ? 'Simulating...' : 'Simulate'}</button>
          <button onClick={handleExportBOM} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"><Export size={13} weight="bold" /> BOM</button>
          <button onClick={handleExportGerber} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"><Export size={13} weight="bold" /> Gerber</button>
          <div className="w-px h-5 bg-gray-700 mx-1" />
          <button 
            onClick={() => onExitFullScreen ? onExitFullScreen() : setIsFullScreen(!isFullScreen)} 
            title={effectiveFullScreen ? "Exit Full Screen" : "Full Screen"} 
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            {effectiveFullScreen ? <CornersIn size={14} weight="bold" /> : <CornersOut size={14} weight="bold" />}
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 min-h-0 flex relative z-0">
        {mode === 'schematic' || mode === 'visual' ? (
          <>
            {showLibrary && <div className="w-56 shrink-0 z-10"><ComponentLibraryPanel onAddComponent={handleAddComponent} /></div>}
            <PCBCanvas 
              nodeTypes={mode === 'schematic' ? logicalNodeTypes : pcbNodeTypes}
              nodes={nodes.map(n => {
                const isBoard = n.type === 'board' || n.type?.startsWith('board_') || n.type === 'copper_pour';
                return { ...n, hidden: isBoard ? !layerVisibility.BoardOutline : (mode === 'visual' && !layerVisibility.TopSilkLayer) };
              })} 
              edges={edges.map(e => ({ ...e, hidden: mode === 'visual' && !layerVisibility[(e.data?.layer as PCBLayer) || 'TopLayer'], type: mode === 'schematic' ? 'default' : 'step' }))} 
              onNodesChange={onNodesChange} 
              onEdgesChange={onEdgesChange} 
              onConnect={onConnect} 
              onNodeClick={(_, node) => setSelectedId(node.id)} 
              onPaneClick={() => setSelectedId(null)} 
            />
            <div className="w-60 shrink-0 z-10"><PropertiesInspector selected={selectedForInspector} onPropertyChange={handlePropertyChange} onDelete={handleDelete} onDuplicate={handleDuplicate} onRotate={handleRotate} /></div>
          </>
        ) : mode === '3d' ? (
          <div className="flex-1 min-h-0 relative">
            <PCB3DViewer graph={buildGraph()} />
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* Code Editor */}
            <div className="flex-1 flex flex-col min-h-0 border-r border-gray-800/60">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-gray-800/40">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Circuit DSL</span>
                <button onClick={syncCodeToVisual} className="px-3 py-1 text-[10px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">Apply to Canvas</button>
              </div>
              <textarea
                value={codeText}
                onChange={handleCodeChange}
                spellCheck={false}
                className="flex-1 min-h-0 w-full p-4 bg-gray-950 text-emerald-300 font-mono text-xs leading-relaxed resize-none outline-none border-none selection:bg-emerald-800/40"
                style={{ tabSize: 2 }}
              />
            </div>
            {/* Preview */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-800/40">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Live Preview</span>
              </div>
              <PCBCanvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(null)} />
            </div>
          </div>
        )}
      </div>

      {/* ── Status Bar ── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900/90 border-t border-gray-800/60 shrink-0 relative z-30">
        <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
          <span>● {nodes.length} components</span>
          <span>│ {edges.length} wires</span>
          {drcResults.length > 0 && (
            <span className={drcErrorCount > 0 ? 'text-red-400' : drcWarnCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>
              │ {drcErrorCount > 0 ? `✗ ${drcErrorCount} errors` : drcWarnCount > 0 ? `⚠ ${drcWarnCount} warnings` : '✓ DRC passed'}
            </span>
          )}
          <span className="w-px h-3 bg-gray-700 mx-2" />
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-[9px] font-bold shadow-sm">Scroll</kbd> Zoom</span>
            <span className="w-px h-3 bg-gray-700" />
            <span><kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-[9px] font-bold shadow-sm">Drag</kbd> Pan</span>
            <span className="w-px h-3 bg-gray-700" />
            <span><kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-[9px] font-bold shadow-sm">Del</kbd> Remove</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowLayersMenu(!showLayersMenu)} 
              className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-lg transition-colors ${showLayersMenu ? 'bg-gray-700 text-gray-200' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
            >
              <Stack size={13} weight="bold" /> Layers
            </button>
            {showLayersMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLayersMenu(false)} />
                <LayerManagerPanel 
                  activeLayer={activeLayer} 
                  setActiveLayer={setActiveLayer} 
                  layerVisibility={layerVisibility as Record<PCBLayer, boolean>} 
                  toggleVisibility={toggleLayerVisibility} 
                  className="absolute bottom-full right-0 mb-2 z-50"
                />
              </>
            )}
          </div>
          <span className="text-[9px] text-gray-600 font-mono">AcadMix PCB Studio v1.0</span>
        </div>
      </div>

      {/* ── DRC Modal ── */}
      {showDRC && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDRC(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-[480px] max-h-[400px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <span className="text-sm font-bold text-gray-200">Design Rule Check</span>
              <button onClick={() => setShowDRC(false)} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[320px] space-y-2">
              {drcResults.map(r => (
                <div key={r.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${r.severity === 'error' ? 'bg-red-900/20 text-red-400' : r.severity === 'warning' ? 'bg-amber-900/20 text-amber-400' : 'bg-emerald-900/20 text-emerald-400'}`}>
                  <span className="font-bold shrink-0">{r.severity === 'error' ? '✗' : r.severity === 'warning' ? '⚠' : '✓'}</span>
                  <span>{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Netlist Modal ── */}
      {showNetlist && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowNetlist(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-[560px] max-h-[500px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <span className="text-sm font-bold text-gray-200">Netlist</span>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(netlistText); }} className="px-3 py-1 text-[10px] font-bold rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">Copy</button>
                <button onClick={() => setShowNetlist(false)} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
              </div>
            </div>
            <pre className="p-4 overflow-auto max-h-[420px] text-[11px] text-emerald-300 font-mono leading-relaxed">{netlistText}</pre>
          </div>
        </div>
      )}

      {/* ── Simulation Modal ── */}
      {showSimOutput && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSimOutput(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-[800px] h-[500px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 shrink-0">
              <span className="text-sm font-bold text-gray-200 flex items-center gap-2"><WaveSine size={16} className="text-indigo-400" /> Circuit Simulation (SPICE)</span>
              <button onClick={() => setShowSimOutput(false)} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto bg-[#0B0C10]">
              {isSimulating ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-indigo-400">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold animate-pulse">Running SPICE Simulation...</p>
                </div>
              ) : simOutput?.error ? (
                <div className="w-full h-full flex items-center justify-center text-red-400 text-xs font-mono p-6 bg-red-950/20 rounded-xl border border-red-900/50 text-center whitespace-pre-wrap">
                  {simOutput.error}
                </div>
              ) : simOutput?.data ? (
                <div className="w-full h-full min-h-[300px]">
                  <SpiceChart data={simOutput.data} />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No output</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PCB Information Modal ── */}
      {showPCBInfo && pcbInfo && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPCBInfo(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-[520px] max-h-[550px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <span className="text-sm font-bold text-gray-200">PCB Information</span>
              <button onClick={() => setShowPCBInfo(false)} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[480px]">
              {/* Board Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Board Width</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">{(pcbInfo.boardWidth * 0.254).toFixed(1)} mm</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Board Height</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">{(pcbInfo.boardHeight * 0.254).toFixed(1)} mm</div>
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Components</div>
                  <div className="text-xl font-bold text-white font-mono">{pcbInfo.componentCount}</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Nets</div>
                  <div className="text-xl font-bold text-white font-mono">{pcbInfo.netCount}</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Wires</div>
                  <div className="text-xl font-bold text-white font-mono">{pcbInfo.wireCount}</div>
                </div>
              </div>

              {/* SMD vs TH */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-900/20 rounded-xl p-3 border border-blue-800/30">
                  <div className="text-[9px] uppercase tracking-wider text-blue-400 font-bold mb-1">SMD Components</div>
                  <div className="text-lg font-bold text-blue-300 font-mono">{pcbInfo.smdCount}</div>
                </div>
                <div className="bg-amber-900/20 rounded-xl p-3 border border-amber-800/30">
                  <div className="text-[9px] uppercase tracking-wider text-amber-400 font-bold mb-1">Through-Hole</div>
                  <div className="text-lg font-bold text-amber-300 font-mono">{pcbInfo.thCount}</div>
                </div>
              </div>

              {/* Component Breakdown */}
              <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/40">
                <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-2">Component Breakdown</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pcbInfo.categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                    <span key={cat} className="text-[10px] font-mono font-bold bg-gray-700/50 text-gray-300 px-2 py-1 rounded-lg border border-gray-600/30">
                      {cat}: {count}
                    </span>
                  ))}
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-[10px] text-gray-600 font-mono text-center space-y-0.5">
                <div>Created: {new Date(pcbInfo.created).toLocaleString()}</div>
                <div>Modified: {new Date(pcbInfo.modified).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
