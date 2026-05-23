import re

filepath = 'src/pages/cad-studio/CadStudio.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { OrbitControls, TransformControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';",
    "import { OrbitControls, TransformControls, Grid, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei';"
)
content = content.replace(
    "import { Plus, Minus, Intersect, Cube, Cylinder, Sphere as SphereIcon, Trash, Copy, CaretUp, Circle, Sun, Moon, ArrowsOutCardinal, ArrowsClockwise, DownloadSimple, UploadSimple } from '@phosphor-icons/react';",
    "import { Plus, Minus, Intersect, Cube, Cylinder, Sphere as SphereIcon, Trash, Copy, CaretUp, Circle, Sun, Moon, ArrowsOutCardinal, ArrowsClockwise, DownloadSimple, UploadSimple, Magnet, ArrowsIn, Eye, EyeClosed } from '@phosphor-icons/react';"
)

# 2. History & State Initialization
state_init_old = """  const [nodes, setNodes] = useState<CadNode[]>(() => {
    const saved = localStorage.getItem('acadmix_cad_nodes');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return initialNodes;
  });"""

state_init_new = """  const [nodes, _setNodes] = useState<CadNode[]>(() => {
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
  };"""
content = content.replace(state_init_old, state_init_new)

# 3. Mode State & Keyboard hook
mode_old = """  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');"""

mode_new = """  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isSnapEnabled, setIsSnapEnabled] = useState(false);

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
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          setNodes(prev => prev.filter(n => n.id !== selectedId));
          setSelectedId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, selectedId]);"""
content = content.replace(mode_old, mode_new)


# 4. Canvas Pointer Missed & Environment
canvas_old = "<Canvas camera={{ position: [30, 20, 30], fov: 45 }}>"
canvas_new = """<Canvas camera={{ position: [30, 20, 30], fov: 45 }} onPointerMissed={() => setSelectedId(null)}>
                <Environment preset="city" />"""
content = content.replace(canvas_old, canvas_new)


# 5. TransformControls Logic Update
transform_old = """                        <TransformControls 
                          object={mesh}
                          mode={transformMode}
                          onMouseUp={(e) => {"""
transform_new = """                        <TransformControls 
                          object={mesh}
                          mode={transformMode}
                          translationSnap={isSnapEnabled ? 1 : null}
                          rotationSnap={isSnapEnabled ? Math.PI / 12 : null}
                          onMouseUp={(e) => {
                            if (transformMode === 'scale') {
                              const sx = mesh.scale.x;
                              const sy = mesh.scale.y;
                              const sz = mesh.scale.z;
                              
                              setNodes(prev => prev.map(n => {
                                if (n.id !== id) return n;
                                const n2 = { ...n };
                                if (n.type === 'box' && n.size) n2.size = [n.size[0]*sx, n.size[1]*sy, n.size[2]*sz];
                                else if (n.radius) {
                                  const s = Math.max(sx, sz);
                                  n2.radius = n.radius * s;
                                  if (n.height) n2.height = n.height * sy;
                                  if (n.tube) n2.tube = n.tube * s;
                                }
                                return n2;
                              }));
                              
                              mesh.scale.set(1, 1, 1);
                              mesh.updateMatrixWorld();
                              return;
                            }"""
content = content.replace(transform_old, transform_new)

# 6. Toolbar Buttons Update
toolbar_old = """<button onClick={() => setTransformMode('rotate')} className={`p-2 rounded transition-colors ${transformMode === 'rotate' ? (theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-200 text-indigo-700') : (theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200')}`} title="Rotate"><ArrowsClockwise size={18} /></button>
            <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}></div>"""
toolbar_new = """<button onClick={() => setTransformMode('rotate')} className={`p-2 rounded transition-colors ${transformMode === 'rotate' ? (theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-200 text-indigo-700') : (theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200')}`} title="Rotate"><ArrowsClockwise size={18} /></button>
            <button onClick={() => setTransformMode('scale')} className={`p-2 rounded transition-colors ${transformMode === 'scale' ? (theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-200 text-indigo-700') : (theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200')}`} title="Scale (Resize)"><ArrowsIn size={18} /></button>
            <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
            <button onClick={() => setIsSnapEnabled(!isSnapEnabled)} className={`p-2 rounded transition-colors ${isSnapEnabled ? (theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-200 text-indigo-700') : (theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200')}`} title="Toggle Snap to Grid"><Magnet size={18} /></button>
            <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}></div>"""
content = content.replace(toolbar_old, toolbar_new)

# 7. Eye Icon in Feature Tree
tree_old = """<span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-emerald-400'}`}></span>
                  <span className="truncate">{node.name}</span>"""
tree_new = """<span className={`w-2 h-2 rounded-full ${node.visible ? (isSelected ? 'bg-indigo-400' : 'bg-emerald-400') : 'bg-slate-500'}`}></span>
                  <span className={`truncate flex-1 ${!node.visible && 'opacity-50 line-through'}`}>{node.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); updateNode(node.id, { visible: !node.visible }); }} className={`ml-auto mr-2 ${theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                    {node.visible ? <Eye size={14} /> : <EyeClosed size={14} />}
                  </button>"""
content = content.replace(tree_old, tree_new)

with open(filepath, 'w') as f:
    f.write(content)
