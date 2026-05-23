import re
import os

filepath = 'src/pages/cad-studio/CadStudio.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { Plus, Minus, Intersect, Cube, Cylinder, Sphere as SphereIcon, Trash, Copy, CaretUp, Circle } from '@phosphor-icons/react';",
    "import { Plus, Minus, Intersect, Cube, Cylinder, Sphere as SphereIcon, Trash, Copy, CaretUp, Circle, Sun, Moon, ArrowsOutCardinal, ArrowsClockwise } from '@phosphor-icons/react';"
)
content = content.replace(
    "import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei';",
    "import { OrbitControls, TransformControls, Grid } from '@react-three/drei';\nimport * as THREE from 'three';"
)

# 2. State
state_injection = """  const [engineError, setEngineError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');
"""
content = content.replace(
    "  const [engineError, setEngineError] = useState<string | null>(null);",
    state_injection
)

# 3. Colors and Theme handling
content = content.replace('bg-[#0f172a] text-slate-200', '${theme === \'dark\' ? \'bg-[#0f172a] text-slate-200\' : \'bg-slate-50 text-slate-900\'}')
content = content.replace('<div className="w-screen', '<div className={`w-screen h-screen flex flex-col overflow-hidden font-sans ${theme === \'dark\' ? \'bg-[#0f172a] text-slate-200\' : \'bg-slate-50 text-slate-900\'}`}>')
content = content.replace('<header className="h-14 bg-slate-900 border-b border-slate-800', '<header className={`h-14 border-b flex items-center justify-between px-4 z-10 shrink-0 ${theme === \'dark\' ? \'bg-slate-900 border-slate-800\' : \'bg-white border-slate-200\'}`}>')

# Update Top Bar text
content = content.replace('<h1 className="text-lg font-bold tracking-tight text-white">AcadMix <span className="font-light opacity-70">CAD Studio</span></h1>', '<h1 className={`text-lg font-bold tracking-tight ${theme === \'dark\' ? \'text-white\' : \'text-slate-900\'}`}>AcadMix <span className="font-light opacity-70">CAD Studio</span></h1>')

# Add Theme and Transform mode buttons to Top Bar
top_bar_injection = """
        <div className={`flex items-center gap-2 p-1 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          <button onClick={() => setTransformMode('translate')} className={`p-2 rounded transition-colors ${transformMode === 'translate' ? (theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600') : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`} title="Translate (Move)"><ArrowsOutCardinal size={18} /></button>
          <button onClick={() => setTransformMode('rotate')} className={`p-2 rounded transition-colors ${transformMode === 'rotate' ? (theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600') : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`} title="Rotate"><ArrowsClockwise size={18} /></button>
          <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-2 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        
        <div>
"""
content = content.replace("        <div>\n          <button className=\"px-4 py-1.5", top_bar_injection + "          <button className=\"px-4 py-1.5")


# Change tool bar styling
content = content.replace('<div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">', '<div className={`flex items-center gap-2 p-1 rounded-lg border ${theme === \'dark\' ? \'bg-slate-800 border-slate-700\' : \'bg-slate-100 border-slate-200\'}`}>')
content = content.replace('className="p-2 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"', 'className={`p-2 rounded transition-colors ${theme === \'dark\' ? \'hover:bg-slate-700 text-slate-300 hover:text-white\' : \'hover:bg-slate-200 text-slate-600 hover:text-slate-900\'}`}')
content = content.replace('<div className="w-px h-6 bg-slate-700 mx-1"></div>', '<div className={`w-px h-6 mx-1 ${theme === \'dark\' ? \'bg-slate-700\' : \'bg-slate-300\'}`}></div>')


# Replace main layout colors
content = content.replace('<aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10 shrink-0">', '<aside className={`w-64 border-r flex flex-col z-10 shrink-0 ${theme === \'dark\' ? \'bg-slate-900 border-slate-800\' : \'bg-white border-slate-200\'}`}>')
content = content.replace('<div className="p-3 border-b border-slate-800">', '<div className={`p-3 border-b ${theme === \'dark\' ? \'border-slate-800\' : \'border-slate-200\'}`}>')
content = content.replace('text-slate-400', '${theme === \'dark\' ? \'text-slate-400\' : \'text-slate-500\'}')

content = content.replace('<main className="flex-1 relative bg-slate-950">', '<main className={`flex-1 relative ${theme === \'dark\' ? \'bg-slate-950\' : \'bg-slate-100\'}`}>')

# Update Canvas background and Grid
content = content.replace('<color attach="background" args={[\'#0b1120\']} />', '<color attach="background" args={[theme === \'dark\' ? \'#0b1120\' : \'#f8fafc\']} />')
content = content.replace('<Grid infiniteGrid fadeDistance={100} sectionColor="#334155" cellColor="#1e293b" position={[0, 0, 0]} />', '<Grid infiniteGrid fadeDistance={100} sectionColor={theme === \'dark\' ? \'#334155\' : \'#cbd5e1\'} cellColor={theme === \'dark\' ? \'#1e293b\' : \'#e2e8f0\'} position={[0, 0, 0]} />')

# Update right panel
content = content.replace('<aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col z-10 shrink-0">', '<aside className={`w-72 border-l flex flex-col z-10 shrink-0 ${theme === \'dark\' ? \'bg-slate-900 border-slate-800\' : \'bg-white border-slate-200\'}`}>')


# Update inputs
content = content.replace('className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"', 'className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500 ${theme === \'dark\' ? \'bg-slate-950 border-slate-700 text-white\' : \'bg-slate-50 border-slate-300 text-slate-900\'}`}')

content = content.replace('className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm"', 'className={`w-full border rounded px-2 py-1.5 text-sm ${theme === \'dark\' ? \'bg-slate-950 border-slate-700 text-white\' : \'bg-slate-50 border-slate-300 text-slate-900\'}`}')

content = content.replace('className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-center"', 'className={`w-full border rounded px-2 py-1 text-sm text-center ${theme === \'dark\' ? \'bg-slate-950 border-slate-700 text-white\' : \'bg-slate-50 border-slate-300 text-slate-900\'}`}')

content = content.replace('className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"', 'className={`w-full border rounded px-2 py-1.5 text-sm ${theme === \'dark\' ? \'bg-slate-950 border-slate-700 text-white\' : \'bg-slate-50 border-slate-300 text-slate-900\'}`}')



# 4. Transform Controls injection
transform_block = """            {/* Render CSG Meshes */}
            {renderMeshes.map(({ id, mesh }) => {
              const isSelected = id === selectedId;
              const isPrimitive = ['box', 'cylinder', 'sphere', 'cone', 'torus'].includes(
                nodes.find(n => n.id === id)?.type || ''
              );

              if (isSelected && isPrimitive) {
                return (
                  <TransformControls 
                    key={id} 
                    mode={transformMode}
                    onMouseUp={() => {
                      const pos = [mesh.position.x, mesh.position.y, mesh.position.z] as [number, number, number];
                      const rot = [
                        THREE.MathUtils.radToDeg(mesh.rotation.x), 
                        THREE.MathUtils.radToDeg(mesh.rotation.y), 
                        THREE.MathUtils.radToDeg(mesh.rotation.z)
                      ] as [number, number, number];
                      updateNode(id, { position: pos, rotation: rot });
                    }}
                  >
                    <primitive object={mesh} />
                  </TransformControls>
                );
              }
              return <primitive key={id} object={mesh} />;
            })}"""

content = re.sub(r'\{\/\* Render CSG Meshes \*\/.*?\}\)\}', transform_block, content, flags=re.DOTALL)


with open(filepath, 'w') as f:
    f.write(content)
