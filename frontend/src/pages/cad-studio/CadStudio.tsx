import React, { useState, useMemo, Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PivotControls, Grid, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei';
import { Plus, Minus, Intersect, Cube, Cylinder, Sphere as SphereIcon, Trash, Copy, CaretUp, Circle, Sun, Moon, DownloadSimple, UploadSimple, Magnet, Eye, EyeClosed, TextT } from '@phosphor-icons/react';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { CadNode, NodeType, evaluateFeatureTree, preloadCadAssets } from './CadEngine';
import ErrorBoundary from '../../components/ErrorBoundary';

const initialNodes: CadNode[] = [
  { id: '1', name: 'Base Block', type: 'box', size: [20, 5, 20], position: [0, 2.5, 0], rotation: [0, 0, 0], visible: true },
  { id: '2', name: 'Hole Cutter', type: 'cylinder', radius: 4, height: 10, position: [0, 2.5, 0], rotation: [0, 0, 0], visible: false },
  { id: '3', name: 'Cut Operation', type: 'subtract', targetId: '1', toolId: '2', visible: true }
];

const PivotWrapper = ({ mesh, id, setIsDragging, nodes, updateNode }: { mesh: THREE.Mesh, id: string, setIsDragging: (v: boolean) => void, nodes: CadNode[], updateNode: (id: string, updates: Partial<CadNode>) => void }) => {
  const pivotRef = useRef(new THREE.Matrix4());
  
  const pos = [mesh.position.x, mesh.position.y, mesh.position.z] as [number, number, number];
  const rot = [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z] as [number, number, number];
  
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.updateMatrixWorld();

  return (
    <PivotControls
      position={pos}
      rotation={rot}
      scale={75}
      depthTest={false}
      fixed={true}
      onDragStart={() => setIsDragging(true)}
      onDrag={(local) => {
        pivotRef.current.copy(local);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        pivotRef.current.decompose(position, quaternion, scale);
        
        const rotEuler = new THREE.Euler().setFromQuaternion(quaternion);

        const cleanPos = [position.x, position.y, position.z].map(p => Math.round(p * 100) / 100) as [number, number, number];
        const cleanRot = [
          THREE.MathUtils.radToDeg(rotEuler.x), 
          THREE.MathUtils.radToDeg(rotEuler.y), 
          THREE.MathUtils.radToDeg(rotEuler.z)
        ].map(r => Math.round(r * 10) / 10) as [number, number, number];

        const sx = scale.x;
        const sy = scale.y;
        const sz = scale.z;

        const targetNode = nodes.find(n => n.id === id);
        if (!targetNode) return;

        let newSize = targetNode.size;
        let newRadius = targetNode.radius;
        let newHeight = targetNode.height;
        let newTube = targetNode.tube;

        if (Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01 || Math.abs(sz - 1) > 0.01) {
          if (targetNode.type === 'box' && targetNode.size) {
            newSize = [
              Math.max(0.1, Math.abs(targetNode.size[0] * sx)),
              Math.max(0.1, Math.abs(targetNode.size[1] * sy)),
              Math.max(0.1, Math.abs(targetNode.size[2] * sz))
            ];
          }
          else if (targetNode.radius) {
            const s = Math.abs(Math.max(sx, sz));
            newRadius = Math.max(0.1, Math.abs(targetNode.radius * s));
            if (targetNode.height) newHeight = Math.max(0.1, Math.abs(targetNode.height * sy));
            if (targetNode.tube) newTube = Math.max(0.1, Math.abs(targetNode.tube * s));
          }
        }

        updateNode(id, { 
          position: cleanPos, 
          rotation: cleanRot,
          ...(newSize !== targetNode.size ? { size: newSize } : {}),
          ...(newRadius !== targetNode.radius ? { radius: newRadius } : {}),
          ...(newHeight !== targetNode.height ? { height: newHeight } : {}),
          ...(newTube !== targetNode.tube ? { tube: newTube } : {})
        });
      }}
    >
      <primitive object={mesh} />
    </PivotControls>
  );
};

const CadStudio = () => {
  useEffect(() => {
    preloadCadAssets(() => {
      _setNodes(prev => [...prev]); // Trigger re-render when assets load
    });
  }, []);

  const [clipboard, setClipboard] = useState<CadNode | null>(null);
  const [nodes, _setNodes] = useState<CadNode[]>(() => {
    const saved = localStorage.getItem('acadmix_cad_nodes');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return initialNodes;
  });

  const [past, setPast] = useState<CadNode[][]>([]);
  const [future, setFuture] = useState<CadNode[][]>([]);

  const setNodes = (action: React.SetStateAction<CadNode[]>, skipHistory = false) => {
    _setNodes(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (!skipHistory && JSON.stringify(prev) !== JSON.stringify(next)) {
        setPast(p => [...p, prev]);
        setFuture([]);
      }
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem('acadmix_cad_nodes', JSON.stringify(nodes));
  }, [nodes]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSnapEnabled, setIsSnapEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        setPast(p => {
          if (p.length === 0) return p;
          const prev = p[p.length - 1];
          setFuture(f => [nodes, ...f]);
          _setNodes(prev);
          return p.slice(0, p.length - 1);
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        setFuture(f => {
          if (f.length === 0) return f;
          const next = f[0];
          setPast(p => [...p, nodes]);
          _setNodes(next);
          return f.slice(1);
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedId) {
          const target = nodes.find(n => n.id === selectedId);
          if (target) setClipboard(JSON.parse(JSON.stringify(target)));
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboard) {
          const clone = JSON.parse(JSON.stringify(clipboard));
          clone.id = uuidv4();
          clone.name = clone.name + ' (Copy)';
          if (clone.position) {
            clone.position = [clone.position[0] + 2, clone.position[1] + 2, clone.position[2]];
          }
          setNodes(prev => [...prev, clone]);
          setSelectedId(clone.id);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          setNodes(prev => prev.filter(n => n.id !== selectedId));
          setSelectedId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, selectedId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportProject = () => {
    const data = JSON.stringify(nodes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'acadmix_cad_project.json';
    link.click();
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) setNodes(imported);
      } catch (err) {
        console.error('Invalid project file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Re-evaluate the feature tree whenever nodes change
  const renderMeshes = useMemo(() => {
    try {
      setEngineError(null);
      return evaluateFeatureTree(nodes);
    } catch (err: any) {
      console.error(err);
      setEngineError(err.message || err.toString());
      return [];
    }
  }, [nodes]);

  const addPrimitive = (type: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'text') => {
    const newNode: CadNode = {
      id: uuidv4(),
      name: `New ${type}`,
      type,
      visible: true,
      position: [0, 5, 0],
      rotation: [0, 0, 0],
      ...(type === 'box' ? { size: [10, 10, 10] } : {}),
      ...(type === 'cylinder' ? { radius: 5, height: 10 } : {}),
      ...(type === 'sphere' ? { radius: 5 } : {}),
      ...(type === 'cone' ? { radius: 5, height: 10 } : {}),
      ...(type === 'torus' ? { radius: 5, tube: 1.5 } : {}),
      ...(type === 'text' ? { textValue: 'AcadMix', radius: 5, height: 2 } : {})
    };
    setNodes([...nodes, newNode]);
    setSelectedId(newNode.id);
  };

  const addBoolean = (type: 'union' | 'subtract' | 'intersect') => {
    const newNode: CadNode = {
      id: uuidv4(),
      name: `New ${type}`,
      type,
      visible: true,
      targetId: '',
      toolId: ''
    };
    setNodes([...nodes, newNode]);
    setSelectedId(newNode.id);
  };

  const updateNode = (id: string, updates: Partial<CadNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const exportSTL = () => {
    const exporter = new STLExporter();
    const group = new THREE.Group();
    renderMeshes.forEach(({ mesh }) => {
      group.add(mesh.clone());
    });
    const stlString = exporter.parse(group);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = 'acadmix_cad_export.stl';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const duplicateNode = (id: string) => {
    const nodeToClone = nodes.find(n => n.id === id);
    if (!nodeToClone) return;
    const newNode: CadNode = {
      ...nodeToClone,
      id: uuidv4(),
      name: `${nodeToClone.name} (Copy)`,
    };
    if (newNode.position) {
      newNode.position = [newNode.position[0] + 5, newNode.position[1], newNode.position[2] + 5];
    }
    setNodes([...nodes, newNode]);
    setSelectedId(newNode.id);
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selectedNode = nodes.find(n => n.id === selectedId);

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden font-sans transition-colors duration-200 ${theme === 'dark' ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* ── TOP BAR ── */}
      <header className={`h-14 border-b flex items-center justify-between px-4 z-10 shrink-0 transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cube weight="duotone" className="text-white text-xl" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">AcadMix <span className="font-light opacity-70">CAD Studio</span></h1>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 p-1 rounded-lg border transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button onClick={() => addPrimitive('box')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Add Box"><Cube size={18} /></button>
            <button onClick={() => addPrimitive('cylinder')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Add Cylinder"><Cylinder size={18} /></button>
            <button onClick={() => addPrimitive('sphere')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Add Sphere"><SphereIcon size={18} /></button>
            <button onClick={() => addPrimitive('cone')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Add Cone"><CaretUp size={18} /></button>
            <button onClick={() => addPrimitive('torus')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Add Torus"><Circle size={18} /></button>
            <button onClick={() => addPrimitive('text')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Add 3D Text"><TextT size={18} /></button>
            <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
            <button onClick={() => addBoolean('union')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-indigo-500/20 text-indigo-400' : 'hover:bg-indigo-100 text-indigo-600'}`} title="Boolean Union"><Plus size={18} /></button>
            <button onClick={() => addBoolean('subtract')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-600'}`} title="Boolean Subtract"><Minus size={18} /></button>
            <button onClick={() => addBoolean('intersect')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-amber-500/20 text-amber-400' : 'hover:bg-amber-100 text-amber-600'}`} title="Boolean Intersect"><Intersect size={18} /></button>
          </div>

          <div className={`flex items-center gap-1 p-1 rounded-lg border transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button onClick={() => setIsSnapEnabled(!isSnapEnabled)} className={`p-2 rounded transition-colors ${isSnapEnabled ? (theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-200 text-indigo-700') : (theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200')}`} title="Toggle Snap to Grid"><Magnet size={18} /></button>
            <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={importProject} />
          <div className="flex items-center gap-2 ml-2">
            <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all border ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} title="Load Project JSON">
              <UploadSimple size={16} /> Load
            </button>
            <button onClick={exportProject} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all border ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} title="Save Project JSON">
              <DownloadSimple size={16} /> Save
            </button>
            <button onClick={exportSTL} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-md shadow-lg shadow-indigo-500/20 transition-all ml-2">
              Export STL
            </button>
          </div>
        </div>

      </header>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Feature Tree */}
        <aside className={`w-64 border-r flex flex-col z-10 shrink-0 transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
            <h2 className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Feature Tree</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {nodes.map(node => (
              <div 
                key={node.id} 
                onClick={() => setSelectedId(node.id)}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedId === node.id ? (theme === 'dark' ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-200') : (theme === 'dark' ? 'hover:bg-slate-800 border border-transparent' : 'hover:bg-slate-100 border border-transparent')}`}
              >
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  <div className={`w-2 h-2 rounded-full ${node.visible ? (selectedId === node.id ? 'bg-indigo-400' : 'bg-emerald-400') : 'bg-slate-500'}`}></div>
                  <span className={`text-sm truncate flex-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700 font-medium'} ${!node.visible && 'opacity-50 line-through'}`}>{node.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); updateNode(node.id, { visible: !node.visible }); }} className={`ml-auto ${theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                    {node.visible ? <Eye size={16} /> : <EyeClosed size={16} />}
                  </button>
                  {selectedId === node.id && (
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }} className="text-slate-400 hover:text-indigo-400">
                        <Copy size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="text-slate-400 hover:text-rose-500">
                        <Trash size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER: 3D Canvas */}
        <main className={`flex-1 relative transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
          {engineError && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-rose-900/90 text-white p-8">
              <div className="bg-rose-950 p-6 rounded-lg shadow-2xl border border-rose-500 max-w-2xl w-full">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Trash size={24} /> Engine Crash
                </h3>
                <pre className="text-sm bg-black/50 p-4 rounded overflow-auto whitespace-pre-wrap">
                  {engineError}
                </pre>
              </div>
            </div>
          )}
          
          <ErrorBoundary>
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center">Loading CAD...</div>}>
              <Canvas camera={{ position: [30, 20, 30], fov: 45 }} onPointerMissed={() => setSelectedId(null)}>
                <Environment preset="city" />
                <color attach="background" args={[theme === 'dark' ? '#0b1120' : '#f8fafc']} />
                
                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={1.5} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                {/* Render CSG Meshes */}
                {renderMeshes.map(({ id, mesh }) => {
                  const isSelected = id === selectedId;
                  const isPrimitive = ['box', 'cylinder', 'sphere', 'cone', 'torus', 'text'].includes(
                    nodes.find(n => n.id === id)?.type || ''
                  );

                  if (isSelected && isPrimitive) {
                    return (
                      <PivotWrapper 
                        key={id} 
                        mesh={mesh} 
                        id={id} 
                        setIsDragging={setIsDragging} 
                        nodes={nodes} 
                        updateNode={updateNode} 
                      />
                    );
                  }

                  return <primitive key={id} object={mesh} />;
                })}

                {/* Grid */}
                <Grid infiniteGrid fadeDistance={5000} sectionSize={10} cellSize={1} sectionColor={theme === 'dark' ? "#334155" : "#cbd5e1"} cellColor={theme === 'dark' ? "#1e293b" : "#e2e8f0"} position={[0, 0, 0]} />
                <OrbitControls 
                  makeDefault 
                  enabled={!isDragging} 
                  mouseButtons={{
                    LEFT: THREE.MOUSE.PAN,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.ROTATE
                  }}
                />

                <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
                  <group scale={0.65}>
                    <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" hideNegativeAxes />
                  </group>
                </GizmoHelper>
              </Canvas>
            </Suspense>
          </ErrorBoundary>
          
          <div className={`absolute bottom-4 left-4 text-xs font-mono px-3 py-1.5 rounded backdrop-blur border ${theme === 'dark' ? 'text-slate-500 bg-slate-900/80 border-slate-800' : 'text-slate-600 bg-white/80 border-slate-300'}`}>
            {nodes.length} Nodes • {renderMeshes.length} Visible Meshes
          </div>
        </main>

        {/* RIGHT PANEL: Properties */}
        <aside className={`w-72 border-l flex flex-col z-10 shrink-0 transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
            <h2 className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Properties</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {selectedNode ? (
              <div className="space-y-4">
                {/* General */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Name</label>
                  <input 
                    type="text" 
                    value={selectedNode.name} 
                    onChange={e => updateNode(selectedNode.id, { name: e.target.value })}
                    className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500 ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={selectedNode.visible}
                    onChange={e => updateNode(selectedNode.id, { visible: e.target.checked })}
                    className={`rounded focus:ring-indigo-500 ${theme === 'dark' ? 'border-slate-700 bg-slate-950 text-indigo-500' : 'border-slate-300 bg-white text-indigo-600'}`}
                  />
                  <label className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Visible in Viewport</label>
                </div>

                {['box', 'cylinder', 'sphere', 'cone', 'torus', 'text'].includes(selectedNode.type) && (
                  <>
                    <div className="mt-3 flex items-center gap-2">
                      <input 
                        type="color" 
                        value={selectedNode.color || '#3b82f6'} 
                        onChange={e => updateNode(selectedNode.id, { color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      />
                      <label className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Material Color</label>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <label className={`text-xs w-20 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Material</label>
                      <select value={selectedNode.materialType || 'solid'} onChange={e => updateNode(selectedNode.id, { materialType: e.target.value as any })}
                        className={`flex-1 border rounded px-2 py-1 text-sm ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
                        <option value="solid">Solid Color</option>
                        <option value="wood">Wood</option>
                        <option value="carbon">Carbon Fiber</option>
                      </select>
                    </div>
                  </>
                )}
                
                <hr className={theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} />

                {/* Parametric Size */}
                {selectedNode.type === 'box' && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-500 mb-2">Dimensions (W, H, D)</label>
                      <div className="flex gap-2">
                        {[0, 1, 2].map(i => (
                          <input key={i} type="number" value={selectedNode.size?.[i] || 0} onChange={e => {
                            const newSize = [...(selectedNode.size || [0,0,0])] as [number, number, number];
                            newSize[i] = parseFloat(e.target.value) || 0;
                            updateNode(selectedNode.id, { size: newSize });
                          }} className={`w-full border rounded px-2 py-1 text-sm text-center ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs text-slate-500 mb-1">Corner Radius (Fillet)</label>
                      <input type="number" value={selectedNode.cornerRadius || 0} onChange={e => updateNode(selectedNode.id, { cornerRadius: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className={`w-full border rounded px-2 py-1.5 text-sm ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                    </div>
                  </>
                )}

                {selectedNode.type === 'text' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Text String</label>
                    <input type="text" value={selectedNode.textValue || ''} onChange={e => updateNode(selectedNode.id, { textValue: e.target.value })}
                      className={`w-full border rounded px-2 py-1.5 text-sm ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                  </div>
                )}

                {['cylinder', 'sphere', 'cone', 'torus', 'text'].includes(selectedNode.type) && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Radius</label>
                    <input type="number" value={selectedNode.radius || 0} onChange={e => updateNode(selectedNode.id, { radius: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded px-2 py-1.5 text-sm ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                  </div>
                )}

                {['cylinder', 'cone', 'text'].includes(selectedNode.type) && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Height</label>
                    <input type="number" value={selectedNode.height || 0} onChange={e => updateNode(selectedNode.id, { height: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded px-2 py-1.5 text-sm ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                  </div>
                )}

                {selectedNode.type === 'torus' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tube Radius</label>
                    <input type="number" value={selectedNode.tube || 0} onChange={e => updateNode(selectedNode.id, { tube: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded px-2 py-1.5 text-sm ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                  </div>
                )}

                {/* Transform */}
                {['box', 'cylinder', 'sphere', 'cone', 'torus', 'text'].includes(selectedNode.type) && (
                  <>
                    <hr className={theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} />
                    <div>
                      <label className="block text-xs text-slate-500 mb-2">Position (X, Y, Z)</label>
                      <div className="flex gap-2">
                        {[0, 1, 2].map(i => (
                          <input key={i} type="number" value={selectedNode.position?.[i] || 0} onChange={e => {
                            const newPos = [...(selectedNode.position || [0,0,0])] as [number, number, number];
                            newPos[i] = parseFloat(e.target.value) || 0;
                            updateNode(selectedNode.id, { position: newPos });
                          }} className={`w-full border rounded px-2 py-1 text-sm text-center ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-500 mb-2 mt-3">Rotation (X, Y, Z)</label>
                      <div className="flex gap-2">
                        {[0, 1, 2].map(i => (
                          <input key={i} type="number" value={selectedNode.rotation?.[i] || 0} onChange={e => {
                            const newRot = [...(selectedNode.rotation || [0,0,0])] as [number, number, number];
                            newRot[i] = parseFloat(e.target.value) || 0;
                            updateNode(selectedNode.id, { rotation: newRot });
                          }} className={`w-full border rounded px-2 py-1 text-sm text-center ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Boolean Props */}
                {['union', 'subtract', 'intersect'].includes(selectedNode.type) && (
                  <>
                    <hr className={theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} />
                    <div>
                      <label className="block text-xs text-indigo-500 mb-1 font-bold">Base Object</label>
                      <select value={selectedNode.targetId} onChange={e => updateNode(selectedNode.id, { targetId: e.target.value })}
                        className={`w-full border rounded px-2 py-1.5 text-sm ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
                        <option value="">Select...</option>
                        {nodes.filter(n => n.id !== selectedNode.id).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-rose-500 mb-1 font-bold">Tool Object</label>
                      <select value={selectedNode.toolId} onChange={e => updateNode(selectedNode.id, { toolId: e.target.value })}
                        className={`w-full border rounded px-2 py-1.5 text-sm ${theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
                        <option value="">Select...</option>
                        {nodes.filter(n => n.id !== selectedNode.id).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </select>
                    </div>
                    <div className={`mt-4 p-3 rounded border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                      <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Hint: A Boolean operation takes the Base object and applies the Tool object to it. Make sure both source objects are set to <b>Hidden</b> so only the final result is visible!
                      </p>
                    </div>
                  </>
                )}

              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center px-4">
                Select a node from the Feature Tree to edit its properties.
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
};

export default CadStudio;
