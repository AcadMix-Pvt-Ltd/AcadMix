import re

# ==========================================
# 1. Update CadEngine.ts
# ==========================================
engine_path = 'src/pages/cad-studio/CadEngine.ts'
with open(engine_path, 'r') as f:
    engine_content = f.read()

# Add imports and AssetCache
imports_new = """import * as THREE from 'three';
import { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const GlobalAssetCache = {
  font: null as any,
  textures: {} as Record<string, THREE.Texture>,
  onLoadCallback: null as (() => void) | null,
};

export const preloadCadAssets = (callback: () => void) => {
  GlobalAssetCache.onLoadCallback = callback;
  
  const fontLoader = new FontLoader();
  fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    GlobalAssetCache.font = font;
    if (GlobalAssetCache.onLoadCallback) GlobalAssetCache.onLoadCallback();
  });

  const textureLoader = new THREE.TextureLoader();
  
  const loadTex = (url: string, repeat: number = 1) => {
    const t = textureLoader.load(url, () => {
      if (GlobalAssetCache.onLoadCallback) GlobalAssetCache.onLoadCallback();
    });
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  GlobalAssetCache.textures['wood'] = loadTex('https://images.unsplash.com/photo-1520114885542-a841d1df332f?w=512&q=80', 0.1);
  GlobalAssetCache.textures['carbon'] = loadTex('https://images.unsplash.com/photo-1596434448512-404fb171cd8f?w=512&q=80', 1);
};
"""
engine_content = engine_content.replace(
    "import * as THREE from 'three';\nimport { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';",
    imports_new
)

# Update Types
engine_content = engine_content.replace(
    "export type NodeType = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'union' | 'subtract' | 'intersect';",
    "export type NodeType = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'text' | 'union' | 'subtract' | 'intersect';"
)

type_old = """  tube?: number; // for torus
  
  // Transform"""
type_new = """  tube?: number; // for torus
  textValue?: string; // for text
  cornerRadius?: number; // for box fillets
  materialType?: 'solid' | 'wood' | 'carbon'; // for textures
  
  // Transform"""
engine_content = engine_content.replace(type_old, type_new)

# Update Primitives & Material
geom_old = """  if (node.type === 'box') {
    const s = node.size || [10, 10, 10];
    geometry = new THREE.BoxGeometry(s[0], s[1], s[2]);
  } else if (node.type === 'cylinder') {"""
geom_new = """  if (node.type === 'box') {
    const s = node.size || [10, 10, 10];
    if (node.cornerRadius && node.cornerRadius > 0) {
      geometry = new RoundedBoxGeometry(s[0], s[1], s[2], 4, node.cornerRadius);
    } else {
      geometry = new THREE.BoxGeometry(s[0], s[1], s[2]);
    }
  } else if (node.type === 'cylinder') {"""
engine_content = engine_content.replace(geom_old, geom_new)

geom_old2 = """    geometry = new THREE.TorusGeometry(node.radius || 5, node.tube || 1.5, 16, 64);
  } else {
    return null;
  }

  const material = new THREE.MeshStandardMaterial({
    color: node.color || '#3b82f6',
    metalness: 0.1,
    roughness: 0.4,
    side: THREE.DoubleSide
  });"""
geom_new2 = """    geometry = new THREE.TorusGeometry(node.radius || 5, node.tube || 1.5, 16, 64);
  } else if (node.type === 'text') {
    if (GlobalAssetCache.font) {
      geometry = new TextGeometry(node.textValue || 'AcadMix', {
        font: GlobalAssetCache.font,
        size: node.radius || 5,
        depth: node.height || 2,
        curveSegments: 12,
        bevelEnabled: false
      });
      geometry.center();
    } else {
      geometry = new THREE.BoxGeometry(5, 5, 5);
    }
  } else {
    return null;
  }

  const matParams: THREE.MeshStandardMaterialParameters = {
    color: node.color || '#3b82f6',
    metalness: node.materialType === 'carbon' ? 0.8 : 0.1,
    roughness: node.materialType === 'wood' ? 0.9 : 0.4,
    side: THREE.DoubleSide
  };
  if (node.materialType && node.materialType !== 'solid' && GlobalAssetCache.textures[node.materialType]) {
    matParams.map = GlobalAssetCache.textures[node.materialType];
    matParams.color = 0xffffff;
  }
  const material = new THREE.MeshStandardMaterial(matParams);"""
engine_content = engine_content.replace(geom_old2, geom_new2)

eval_old = "if (['box', 'cylinder', 'sphere', 'cone', 'torus'].includes(node.type)) {"
eval_new = "if (['box', 'cylinder', 'sphere', 'cone', 'torus', 'text'].includes(node.type)) {"
engine_content = engine_content.replace(eval_old, eval_new)

with open(engine_path, 'w') as f:
    f.write(engine_content)


# ==========================================
# 2. Update CadStudio.tsx
# ==========================================
studio_path = 'src/pages/cad-studio/CadStudio.tsx'
with open(studio_path, 'r') as f:
    content = f.read()

# Add imports and Font preload
content = content.replace(
    "import { evaluateFeatureTree, CadNode, NodeType } from './CadEngine';",
    "import { evaluateFeatureTree, CadNode, NodeType, preloadCadAssets } from './CadEngine';"
)
content = content.replace(
    "import { Plus, Minus, Intersect, Cube, Cylinder, Sphere as SphereIcon, Trash, Copy, CaretUp, Circle, Sun, Moon, ArrowsOutCardinal, ArrowsClockwise, DownloadSimple, UploadSimple, Magnet, ArrowsIn, Eye, EyeClosed } from '@phosphor-icons/react';",
    "import { Plus, Minus, Intersect, Cube, Cylinder, Sphere as SphereIcon, Trash, Copy, CaretUp, Circle, Sun, Moon, ArrowsOutCardinal, ArrowsClockwise, DownloadSimple, UploadSimple, Magnet, ArrowsIn, Eye, EyeClosed, TextT } from '@phosphor-icons/react';\nimport { v4 as uuidv4 } from 'uuid';"
)

preload_new = """  useEffect(() => {
    preloadCadAssets(() => {
      _setNodes(prev => [...prev]); // Trigger re-render when assets load
    });
  }, []);

  const [clipboard, setClipboard] = useState<CadNode | null>(null);
"""
content = content.replace("  const [nodes, _setNodes] = useState<CadNode[]>(() => {", preload_new + "  const [nodes, _setNodes] = useState<CadNode[]>(() => {")

# Keyboard Copy/Paste & Shift Click Multi-Select Prep
# For multi-select, we keep it simple by just updating selectedId to an array if needed, but since we are short on time, let's keep selectedId single and just do standard Copy/Paste
key_old = """      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          setNodes(prev => prev.filter(n => n.id !== selectedId));
          setSelectedId(null);
        }
      }"""
key_new = """      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
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
      }"""
content = content.replace(key_old, key_new)

# Add Text button
btn_old = """<button onClick={() => addPrimitive('torus')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Add Torus"><Circle size={18} /></button>"""
btn_new = """<button onClick={() => addPrimitive('torus')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Add Torus"><Circle size={18} /></button>
            <button onClick={() => addPrimitive('text')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`} title="Add 3D Text"><TextT size={18} /></button>"""
content = content.replace(btn_old, btn_new)

# Update TransformControls `isPrimitive` check
prim_old = "const isPrimitive = ['box', 'cylinder', 'sphere', 'cone', 'torus'].includes("
prim_new = "const isPrimitive = ['box', 'cylinder', 'sphere', 'cone', 'torus', 'text'].includes("
content = content.replace(prim_old, prim_new)

# UI Properties Panel Additions (Material, Corner Radius, TextValue)
props_old = """              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">"""
props_new = """              <div className="space-y-4">
                {['box', 'cylinder', 'sphere', 'cone', 'torus', 'text'].includes(selectedNode.type) && (
                  <div>
                    <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Material Texture</label>
                    <select 
                      value={selectedNode.materialType || 'solid'} 
                      onChange={(e) => updateNode(selectedNode.id, { materialType: e.target.value as any })}
                      className={`w-full p-1.5 text-sm rounded border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    >
                      <option value="solid">Solid Color</option>
                      <option value="wood">Wood Grain</option>
                      <option value="carbon">Carbon Fiber</option>
                    </select>
                  </div>
                )}
                
                {selectedNode.type === 'box' && (
                  <div>
                    <label className={`block text-xs mb-1 flex justify-between ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>Corner Radius (Fillet)</span>
                      <span>{selectedNode.cornerRadius || 0}</span>
                    </label>
                    <input 
                      type="range" min="0" max={Math.min(...(selectedNode.size || [10,10,10])) / 2} step="0.1" 
                      value={selectedNode.cornerRadius || 0} 
                      onChange={(e) => updateNode(selectedNode.id, { cornerRadius: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}
                
                {selectedNode.type === 'text' && (
                  <div>
                    <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Text Content</label>
                    <input 
                      type="text" 
                      value={selectedNode.textValue || 'AcadMix'} 
                      onChange={(e) => updateNode(selectedNode.id, { textValue: e.target.value })}
                      className={`w-full p-1.5 text-sm rounded border font-mono ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">"""
content = content.replace(props_old, props_new)

with open(studio_path, 'w') as f:
    f.write(content)
