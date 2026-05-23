import re

filepath = 'src/pages/cad-studio/CadStudio.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import React, { useState, useMemo, Suspense, useEffect } from 'react';",
    "import React, { useState, useMemo, Suspense, useEffect, useRef } from 'react';"
)
content = content.replace(
    "import { OrbitControls, TransformControls, Grid } from '@react-three/drei';",
    "import { OrbitControls, TransformControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';"
)
content = content.replace(
    "import { Plus, Minus, Intersect, Cube, Cylinder, Sphere as SphereIcon, Trash, Copy, CaretUp, Circle, Sun, Moon, ArrowsOutCardinal, ArrowsClockwise } from '@phosphor-icons/react';",
    "import { Plus, Minus, Intersect, Cube, Cylinder, Sphere as SphereIcon, Trash, Copy, CaretUp, Circle, Sun, Moon, ArrowsOutCardinal, ArrowsClockwise, DownloadSimple, UploadSimple } from '@phosphor-icons/react';"
)

# 2. Add functions and ref
init_marker = "  const [theme, setTheme] = useState<'light' | 'dark'>('dark');"
functions_code = """
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
"""
content = content.replace(init_marker, init_marker + "\n" + functions_code)

# 3. Add GizmoHelper to Canvas
canvas_end_marker = "            </Suspense>\n          </Canvas>"
gizmo_code = """
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
            </GizmoHelper>
"""
content = content.replace(canvas_end_marker, gizmo_code + canvas_end_marker)

# 4. Update Header Buttons
old_header_buttons = """          <button onClick={exportSTL} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-md shadow-lg shadow-indigo-500/20 transition-all ml-2">
            Export STL
          </button>"""

new_header_buttons = """          
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
          </div>"""
content = content.replace(old_header_buttons, new_header_buttons)

with open(filepath, 'w') as f:
    f.write(content)
