import re

filepath = 'src/pages/cad-studio/CadStudio.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add STLExporter and useEffect import
content = content.replace(
    "import React, { useState, useMemo, Suspense } from 'react';",
    "import React, { useState, useMemo, Suspense, useEffect } from 'react';"
)
content = content.replace(
    "import { v4 as uuidv4 } from 'uuid';",
    "import { v4 as uuidv4 } from 'uuid';\nimport { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';"
)

# 2. Modify State initialization for LocalStorage
state_init = """  const [nodes, setNodes] = useState<CadNode[]>(() => {
    const saved = localStorage.getItem('acadmix_cad_nodes');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return initialNodes;
  });

  useEffect(() => {
    localStorage.setItem('acadmix_cad_nodes', JSON.stringify(nodes));
  }, [nodes]);
"""
content = content.replace("  const [nodes, setNodes] = useState<CadNode[]>(initialNodes);", state_init)


# 3. Add Export STL and Clone logic
logic_injection = """  const exportSTL = () => {
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
"""
content = content.replace("  const deleteNode = (id: string) => {", logic_injection + "\n  const deleteNode = (id: string) => {")


# 4. Wire Export Button
content = content.replace('<button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-md shadow-lg shadow-indigo-500/20 transition-all">', '<button onClick={exportSTL} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-md shadow-lg shadow-indigo-500/20 transition-all">')


# 5. Wire Feature Tree clone button
tree_buttons = """                {selectedId === node.id && (
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }} className="text-slate-400 hover:text-indigo-400">
                      <Copy size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="text-slate-400 hover:text-rose-500">
                      <Trash size={14} />
                    </button>
                  </div>
                )}"""
content = re.sub(r'\{\s*selectedId === node\.id && \(\s*<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); deleteNode\(node\.id\); \}\} className="text-slate-400 hover:text-rose-500">\s*<Trash size=\{14\} />\s*</button>\s*\)\s*\}', tree_buttons, content)

# 6. Add Color Picker to Properties Panel
color_picker = """                {['box', 'cylinder', 'sphere', 'cone', 'torus'].includes(selectedNode.type) && (
                  <div className="mt-3 flex items-center gap-2">
                    <input 
                      type="color" 
                      value={selectedNode.color || '#3b82f6'} 
                      onChange={e => updateNode(selectedNode.id, { color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                    <label className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Material Color</label>
                  </div>
                )}
                
                <hr className={theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} />"""
content = content.replace("                <hr className={theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} />", color_picker, 1)

with open(filepath, 'w') as f:
    f.write(content)
