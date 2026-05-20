import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, ContactShadows, Box } from '@react-three/drei';
import type { CircuitGraph } from './types';
import { getCatalogEntry } from './componentCatalog';

interface PCB3DViewerProps {
  graph: CircuitGraph;
}

export default function PCB3DViewer({ graph }: PCB3DViewerProps) {
  const controlsRef = useRef<any>(null);

  // Find board dimensions
  const boardNode = graph.components.find(c => c.type === 'board_custom' || c.type.startsWith('board_'));
  const width = boardNode?.properties.width || 800;
  const height = boardNode?.properties.height || 600;
  
  // Scale down heavily for 3D view (React Flow pixels to 3D units)
  const SCALE = 0.05;
  const w = width * SCALE;
  const h = height * SCALE;

  const handleReset = () => {
    // position, target, enableTransition
    controlsRef.current?.setLookAt(0, w, h, 0, 0, 0, true);
  };
  const thickness = 1.6 * SCALE * 10; // Standard 1.6mm thickness, exaggerated slightly for visibility

  // Center offset
  const offsetX = -w / 2;
  const offsetY = -h / 2;

  const components = useMemo(() => {
    return graph.components.filter(c => c.id !== boardNode?.id).map(c => {
      const catalog = getCatalogEntry(c.type);
      // Scale components up so they match their relative size in the 2D view
      let cw = 40 * SCALE;
      let ch = 40 * SCALE;
      let depth = 15 * SCALE;
      let color = '#333333';

      if (catalog?.category === 'ic') { cw = 80 * SCALE; ch = 60 * SCALE; depth = 12 * SCALE; color = '#1a1a1a'; }
      if (catalog?.category === 'passive') { cw = 40 * SCALE; ch = 20 * SCALE; depth = 10 * SCALE; color = '#e2e8f0'; }
      if (catalog?.category === 'connector') { cw = 60 * SCALE; ch = 40 * SCALE; depth = 25 * SCALE; color = '#d1d5db'; }
      if (catalog?.category === 'power') { cw = 30 * SCALE; ch = 30 * SCALE; depth = 5 * SCALE; color = '#ef4444'; } // Make power pads visible

      // Map 2D coordinate to 3D. React Flow Y is down, 3D Z is depth. We put board on X-Z plane.
      // So RF X -> 3D X, RF Y -> 3D Z.
      // Adjusting relative to board center
      let posX = (c.position.x * SCALE) + offsetX;
      let posZ = (c.position.y * SCALE) + offsetY;

      // Adjust for board relative position (React Flow child nodes are absolute if no parent, but here we assume absolute)
      if (boardNode) {
         posX = ((c.position.x - boardNode.position.x) * SCALE) + offsetX;
         posZ = ((c.position.y - boardNode.position.y) * SCALE) + offsetY;
      }

      return (
        <group key={c.id} position={[posX, thickness / 2 + depth / 2, posZ]}>
          <Box args={[cw, depth, ch]} castShadow receiveShadow>
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
          </Box>
        </group>
      );
    });
  }, [graph.components, boardNode, offsetX, offsetY, thickness]);

  return (
    <div className="w-full h-full relative bg-gray-900">
      <Canvas shadows camera={{ position: [0, w, h], fov: 45 }}>
        <color attach="background" args={['#111827']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
        <hemisphereLight args={['#ffffff', '#0f172a', 0.8]} />
        <pointLight position={[-8, 8, -6]} intensity={0.4} color="#60a5fa" />

        {/* Board Substrate */}
        <group position={[0, 0, 0]}>
          <Box args={[w, thickness, h]} castShadow receiveShadow>
            <meshStandardMaterial color="#06301A" roughness={0.8} metalness={0.1} />
          </Box>
          
          {/* Silkscreen Grid / Decals could go here as textures */}
          
          {/* Components */}
          {components}
        </group>

        <CameraControls ref={controlsRef} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 + 0.1} />
        <ContactShadows position={[0, -thickness, 0]} opacity={0.5} scale={100} blur={2} far={10} />
      </Canvas>
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-gray-900/80 backdrop-blur text-white px-4 py-2 rounded-lg border border-gray-700 text-xs font-mono">
          Left Click + Drag: Rotate | Scroll: Zoom | Right Click + Drag: Pan
        </div>
        <button 
          onClick={handleReset}
          className="self-start px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-600/50 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer z-10"
        >
          Reset View
        </button>
      </div>
    </div>
  );
}
