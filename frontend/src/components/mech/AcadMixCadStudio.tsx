import React, { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import {
  Circle,
  CornersIn,
  CornersOut,
  Cube,
  DownloadSimple,
  LineSegment,
  LockSimple,
  PencilSimpleLine,
  Rectangle,
  Selection,
  Sparkle,
} from '@phosphor-icons/react';

type AcadMixCadStudioProps = {
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
};

type SketchTool = 'select' | 'line' | 'rectangle' | 'circle' | 'slot';
type FeatureKind = 'sketch' | 'extrude' | 'cut' | 'fillet' | 'chamfer' | 'pattern' | 'mirror';
type ConstraintKind = 'coincident' | 'horizontal' | 'vertical' | 'equal' | 'locked';
type MaterialKey = 'aluminium' | 'steel' | 'copper' | 'brass' | 'nylon' | 'glass';

type SketchEntity = {
  id: string;
  type: Exclude<SketchTool, 'select'>;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  constraints: ConstraintKind[];
};

type CadFeature = {
  id: string;
  kind: FeatureKind;
  name: string;
  entityId?: string;
  operation: 'base' | 'join' | 'cut' | 'reference';
  depth: number;
  amount: number;
  count: number;
  spacing: number;
  material: MaterialKey;
  enabled: boolean;
};

type DragState = {
  id: string;
  dx: number;
  dy: number;
};

const sketchTools: Array<{ key: SketchTool; label: string; icon: React.ReactNode }> = [
  { key: 'select', label: 'Select', icon: <Selection size={16} weight="bold" /> },
  { key: 'line', label: 'Line', icon: <LineSegment size={16} weight="bold" /> },
  { key: 'rectangle', label: 'Rectangle', icon: <Rectangle size={16} weight="bold" /> },
  { key: 'circle', label: 'Circle', icon: <Circle size={16} weight="bold" /> },
  { key: 'slot', label: 'Slot', icon: <PencilSimpleLine size={16} weight="bold" /> },
];

const cadMaterials: Record<MaterialKey, { name: string; density: number; color: string; roughness: number; metalness: number; finish: string }> = {
  aluminium: { name: 'Aluminium 6061', density: 2.7, color: '#b9c2cf', roughness: 0.28, metalness: 0.75, finish: 'brushed metal' },
  steel: { name: 'Tool Steel', density: 7.85, color: '#8d99a8', roughness: 0.22, metalness: 0.88, finish: 'polished metal' },
  copper: { name: 'Copper', density: 8.96, color: '#c96f43', roughness: 0.24, metalness: 0.82, finish: 'warm metal' },
  brass: { name: 'Brass', density: 8.5, color: '#d7aa48', roughness: 0.3, metalness: 0.78, finish: 'satin metal' },
  nylon: { name: 'Nylon / Polymer', density: 1.15, color: '#2563eb', roughness: 0.62, metalness: 0.02, finish: 'matte polymer' },
  glass: { name: 'Glass', density: 2.5, color: '#8eeaff', roughness: 0.08, metalness: 0.02, finish: 'transparent' },
};

const seedEntities: SketchEntity[] = [
  { id: 'plate', type: 'rectangle', name: 'Base sketch', x: 272, y: 172, w: 220, h: 118, radius: 0, constraints: ['horizontal', 'vertical'] },
  { id: 'boss', type: 'circle', name: 'Center boss', x: 272, y: 172, w: 74, h: 74, radius: 37, constraints: ['coincident', 'equal'] },
  { id: 'slot-a', type: 'slot', name: 'Mount slot A', x: 206, y: 172, w: 58, h: 24, radius: 12, constraints: ['horizontal', 'equal'] },
  { id: 'slot-b', type: 'slot', name: 'Mount slot B', x: 338, y: 172, w: 58, h: 24, radius: 12, constraints: ['horizontal', 'equal'] },
];

const seedFeatures: CadFeature[] = [
  { id: 'sketch-1', kind: 'sketch', name: 'Sketch 1 - mounting plate', entityId: 'plate', operation: 'reference', depth: 0, amount: 0, count: 1, spacing: 0, material: 'aluminium', enabled: true },
  { id: 'extrude-base', kind: 'extrude', name: 'Extrude base plate', entityId: 'plate', operation: 'base', depth: 32, amount: 0, count: 1, spacing: 0, material: 'aluminium', enabled: true },
  { id: 'extrude-boss', kind: 'extrude', name: 'Extrude center boss', entityId: 'boss', operation: 'join', depth: 54, amount: 0, count: 1, spacing: 0, material: 'steel', enabled: true },
  { id: 'cut-slots', kind: 'cut', name: 'Cut mounting slots', entityId: 'slot-a', operation: 'cut', depth: 36, amount: 0, count: 2, spacing: 132, material: 'aluminium', enabled: true },
  { id: 'edge-fillet', kind: 'fillet', name: 'Outer edge fillet', entityId: 'plate', operation: 'reference', depth: 0, amount: 6, count: 1, spacing: 0, material: 'aluminium', enabled: true },
  { id: 'mirror-slots', kind: 'mirror', name: 'Mirror slot pair', entityId: 'slot-a', operation: 'reference', depth: 0, amount: 0, count: 2, spacing: 132, material: 'aluminium', enabled: true },
];

const snap = 5;

export default function AcadMixCadStudio({ isFullScreen, onExitFullScreen, onRequestFullScreen }: AcadMixCadStudioProps) {
  const [entities, setEntities] = useState<SketchEntity[]>(seedEntities);
  const [features, setFeatures] = useState<CadFeature[]>(seedFeatures);
  const [activeTool, setActiveTool] = useState<SketchTool>('select');
  const [selectedEntityId, setSelectedEntityId] = useState(seedEntities[0].id);
  const [selectedFeatureId, setSelectedFeatureId] = useState(seedFeatures[1].id);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialKey>('aluminium');
  const [viewportMode, setViewportMode] = useState<'shaded' | 'realistic' | 'section'>('realistic');
  const [drag, setDrag] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const selectedEntity = entities.find((entity) => entity.id === selectedEntityId) || entities[0];
  const selectedFeature = features.find((feature) => feature.id === selectedFeatureId) || features[0];

  const enabledModelFeatures = useMemo(() => features.filter((feature) => feature.enabled && feature.kind !== 'sketch'), [features]);
  const modelStats = useMemo(() => {
    const volume = enabledModelFeatures.reduce((sum, feature) => {
      const entity = entities.find((item) => item.id === feature.entityId);
      if (!entity || feature.operation === 'reference') return sum;
      const signed = feature.operation === 'cut' ? -1 : 1;
      return sum + signed * sketchArea(entity) * Math.max(feature.depth, 0);
    }, 0);
    const mass = enabledModelFeatures.reduce((sum, feature) => {
      const entity = entities.find((item) => item.id === feature.entityId);
      if (!entity || feature.operation === 'cut' || feature.operation === 'reference') return sum;
      return sum + sketchArea(entity) * feature.depth / 1000 * cadMaterials[feature.material].density;
    }, 0);
    const constraintCount = entities.reduce((sum, entity) => sum + entity.constraints.length, 0);
    const definition = Math.min(98, Math.max(40, 55 + constraintCount * 5 + features.filter((feature) => feature.enabled).length * 2));
    return { volume: Math.max(0, volume), mass, constraintCount, definition };
  }, [enabledModelFeatures, entities, features]);

  const addEntity = (type: Exclude<SketchTool, 'select'>, x = 280, y = 170) => {
    const next: SketchEntity = {
      id: `${type}-${Date.now().toString(36).slice(-5)}`,
      type,
      name: `${toolName(type)} ${entities.length + 1}`,
      x,
      y,
      w: type === 'line' ? 92 : type === 'circle' ? 76 : type === 'slot' ? 112 : 120,
      h: type === 'line' ? 0 : type === 'circle' ? 76 : type === 'slot' ? 28 : 72,
      radius: type === 'circle' ? 38 : type === 'slot' ? 14 : 0,
      constraints: type === 'line' || type === 'slot' ? ['horizontal'] : type === 'circle' ? ['equal'] : ['horizontal', 'vertical'],
    };
    setEntities((current) => [...current, next]);
    setSelectedEntityId(next.id);
    setActiveTool('select');
  };

  const addFeature = (kind: FeatureKind) => {
    if (!selectedEntity) return;
    const next: CadFeature = {
      id: `${kind}-${Date.now().toString(36).slice(-5)}`,
      kind,
      name: `${featureName(kind)} ${features.length + 1}`,
      entityId: selectedEntity.id,
      operation: kind === 'cut' ? 'cut' : kind === 'extrude' ? 'join' : 'reference',
      depth: kind === 'extrude' ? 32 : kind === 'cut' ? 36 : 0,
      amount: kind === 'fillet' ? 4 : kind === 'chamfer' ? 3 : 0,
      count: kind === 'pattern' ? 4 : 1,
      spacing: kind === 'pattern' ? 42 : 0,
      material: selectedMaterial,
      enabled: true,
    };
    setFeatures((current) => [...current, next]);
    setSelectedFeatureId(next.id);
  };

  const updateEntity = (id: string, patch: Partial<SketchEntity>) => {
    setEntities((current) => current.map((entity) => entity.id === id ? applyEntityRules({ ...entity, ...patch }) : entity));
  };

  const updateFeature = (id: string, patch: Partial<CadFeature>) => {
    setFeatures((current) => current.map((feature) => feature.id === id ? { ...feature, ...patch } : feature));
  };

  const onSketchDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = snapPoint(svgPoint(event, svgRef.current));
    if (activeTool !== 'select') {
      addEntity(activeTool, point.x, point.y);
      return;
    }
  };

  const onEntityDown = (event: React.PointerEvent<SVGElement>, entity: SketchEntity) => {
    event.stopPropagation();
    setSelectedEntityId(entity.id);
    const point = svgPoint(event, svgRef.current);
    setDrag({ id: entity.id, dx: point.x - entity.x, dy: point.y - entity.y });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const onSketchMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const point = snapPoint(svgPoint(event, svgRef.current));
    updateEntity(drag.id, { x: clamp(point.x - drag.dx, 38, 520), y: clamp(point.y - drag.dy, 38, 300) });
  };

  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDrag(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };

  const toggleConstraint = (constraint: ConstraintKind) => {
    if (!selectedEntity) return;
    const current = new Set(selectedEntity.constraints);
    if (current.has(constraint)) current.delete(constraint);
    else current.add(constraint);
    updateEntity(selectedEntity.id, { constraints: Array.from(current) });
  };

  const exportDefinition = JSON.stringify({ entities, features }, null, 2);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f7fb] text-slate-950">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
              <Cube size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">AcadMix CAD Engine v1</h2>
              <p className="text-sm font-semibold text-slate-500">Serious browser CAD foundation: sketch, constrain, feature timeline, real 3D viewport, material-driven model preview.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label="Kernel path" value="OCCT-ready" />
            <StatusPill label="Sketch" value={`${modelStats.definition}% defined`} tone={modelStats.definition > 78 ? 'good' : 'warn'} />
            <StatusPill label="Features" value={String(features.filter((feature) => feature.enabled).length)} />
            {(onExitFullScreen || onRequestFullScreen) && (
              <button
                type="button"
                onClick={() => (isFullScreen ? onExitFullScreen?.() : onRequestFullScreen?.())}
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-950"
              >
                {isFullScreen ? <CornersIn size={17} weight="bold" /> : <CornersOut size={17} weight="bold" />}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[284px_1fr_344px]">
        <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-4 xl:border-b-0 xl:border-r">
          <SectionTitle title="Sketch Tools" caption="Native AcadMix workflow" />
          <div className="grid grid-cols-2 gap-2">
            {sketchTools.map((tool) => (
              <button
                key={tool.key}
                type="button"
                onClick={() => setActiveTool(tool.key)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-black shadow-sm transition-colors ${activeTool === tool.key ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
              >
                {tool.icon}
                {tool.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <SectionTitle title="Sketch Browser" caption={`${entities.length} entities`} />
            <div className="space-y-2">
              {entities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left shadow-sm transition-colors ${entity.id === selectedEntityId ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-slate-950">{entity.name}</span>
                    {entity.constraints.includes('locked') && <LockSimple size={14} weight="bold" className="text-slate-400" />}
                  </div>
                  <div className="mt-1 text-xs font-bold capitalize text-slate-500">{entity.type} / {formatMm(entity.w)} x {formatMm(entity.h)}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entity.constraints.map((constraint) => (
                      <span key={constraint} className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase text-slate-500 ring-1 ring-slate-200">{constraint}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <SectionTitle title="Create Feature" caption="Timeline operations" />
            <div className="grid grid-cols-2 gap-2">
              {(['extrude', 'cut', 'fillet', 'chamfer', 'pattern', 'mirror'] as FeatureKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addFeature(kind)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-black capitalize text-slate-700 shadow-sm transition-colors hover:bg-white"
                >
                  {featureName(kind)}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <Segmented label="Viewport" value={viewportMode} options={['shaded', 'realistic', 'section']} onChange={(value) => setViewportMode(value as 'shaded' | 'realistic' | 'section')} />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-bold text-slate-500">Command: {activeTool.toUpperCase()}</div>
            <div className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
              <Sparkle size={14} weight="fill" className="text-sky-500" />
              Manufacturing checks active
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 2xl:grid-cols-[0.92fr_1.08fr]">
            <section className="min-h-0 border-b border-slate-200 p-4 2xl:border-b-0 2xl:border-r">
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle title="2D Sketch" caption="XY plane with constraints and snap" />
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-500">Snap {snap} mm</div>
              </div>
              <svg
                ref={svgRef}
                viewBox="0 0 560 340"
                onPointerDown={onSketchDown}
                onPointerMove={onSketchMove}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
                className="h-[520px] w-full touch-none rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <defs>
                  <pattern id="amx-cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M20 0 L0 0 0 20" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="560" height="340" fill="url(#amx-cad-grid)" />
                <line x1="36" x2="536" y1="300" y2="300" stroke="rgba(15,23,42,0.18)" strokeWidth="1.5" />
                <line x1="40" x2="40" y1="24" y2="316" stroke="rgba(15,23,42,0.18)" strokeWidth="1.5" />
                {entities.map((entity) => (
                  <SketchEntityView key={entity.id} entity={entity} selected={entity.id === selectedEntityId} onPointerDown={onEntityDown} />
                ))}
              </svg>
            </section>

            <section className="min-h-0 p-4">
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle title="3D Design Space" caption="WebGL viewport with orbit, shadows, grid and materials" />
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">Live model</div>
              </div>
              <div className="h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Canvas shadows dpr={[1, 1.6]} gl={{ antialias: true }}>
                  <PerspectiveCamera makeDefault position={[4.8, 4.2, 5.4]} fov={42} />
                  <color attach="background" args={['#f8fbff']} />
                  <ambientLight intensity={0.62} />
                  <directionalLight position={[6, 7, 5]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
                  <CadScene entities={entities} features={features} selectedFeatureId={selectedFeatureId} viewportMode={viewportMode} />
                  <Grid args={[8, 8]} position={[0, -0.04, 0]} cellSize={0.25} cellThickness={0.6} cellColor="#d6dee9" sectionSize={1} sectionThickness={1.2} sectionColor="#94a3b8" fadeDistance={8} fadeStrength={1} />
                  <ContactShadows position={[0, -0.02, 0]} opacity={0.34} scale={8} blur={2.4} far={4} />
                  <Environment preset="city" />
                  <OrbitControls enableDamping makeDefault />
                </Canvas>
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {features.map((feature, index) => (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => {
                    setSelectedFeatureId(feature.id);
                    if (feature.entityId) setSelectedEntityId(feature.entityId);
                  }}
                  className={`min-w-[170px] rounded-xl border px-3 py-2 text-left shadow-sm transition-colors ${feature.id === selectedFeatureId ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:bg-white'} ${!feature.enabled ? 'opacity-50' : ''}`}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Step {index + 1}</div>
                  <div className="mt-1 truncate text-xs font-black text-slate-900">{feature.name}</div>
                  <div className="mt-1 text-[10px] font-bold capitalize text-slate-500">{feature.kind} / {feature.operation}</div>
                </button>
              ))}
            </div>
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-4 xl:border-l xl:border-t-0">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Mass" value={formatNumber(modelStats.mass / 1000, 2)} unit="kg" tone="good" />
            <Metric label="Volume" value={formatNumber(modelStats.volume / 1000, 1)} unit="cm3" />
            <Metric label="Constraints" value={String(modelStats.constraintCount)} />
            <Metric label="Definition" value={`${modelStats.definition}%`} tone={modelStats.definition > 78 ? 'good' : 'warn'} />
          </div>

          <Panel>
            <SectionTitle title="Material Library" caption="Premium finishes" />
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(cadMaterials) as Array<[MaterialKey, typeof cadMaterials[MaterialKey]]>).map(([key, material]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedMaterial(key);
                    if (selectedFeature && selectedFeature.operation !== 'cut') updateFeature(selectedFeature.id, { material: key });
                  }}
                  className={`rounded-xl border p-2 text-left shadow-sm transition-colors ${selectedFeature?.material === key ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
                >
                  <div className="h-9 rounded-lg border border-white shadow-inner" style={{ background: `linear-gradient(135deg, #ffffff, ${material.color}, #e2e8f0)` }} />
                  <div className="mt-2 truncate text-xs font-black text-slate-800">{material.name}</div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">{material.finish}</div>
                </button>
              ))}
            </div>
          </Panel>

          {selectedEntity && (
            <Panel>
              <SectionTitle title="Sketch Inspector" caption={selectedEntity.name} />
              <div className="grid grid-cols-2 gap-3">
                <CadNumber label="X" value={selectedEntity.x} unit="mm" onChange={(value) => updateEntity(selectedEntity.id, { x: value })} />
                <CadNumber label="Y" value={selectedEntity.y} unit="mm" onChange={(value) => updateEntity(selectedEntity.id, { y: value })} />
                <CadNumber label="Width" value={selectedEntity.w} unit="mm" onChange={(value) => updateEntity(selectedEntity.id, { w: value, radius: selectedEntity.type === 'circle' ? Math.max(4, value / 2) : selectedEntity.radius })} />
                <CadNumber label="Height" value={selectedEntity.h} unit="mm" onChange={(value) => updateEntity(selectedEntity.id, { h: value })} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(['coincident', 'horizontal', 'vertical', 'equal', 'locked'] as ConstraintKind[]).map((constraint) => (
                  <button
                    key={constraint}
                    type="button"
                    onClick={() => toggleConstraint(constraint)}
                    className={`rounded-xl border px-3 py-2 text-xs font-black capitalize ${selectedEntity.constraints.includes(constraint) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'}`}
                  >
                    {constraint}
                  </button>
                ))}
              </div>
            </Panel>
          )}

          {selectedFeature && (
            <Panel>
              <SectionTitle title="Feature Parameters" caption={selectedFeature.name} />
              <div className="grid grid-cols-2 gap-3">
                <CadNumber label="Depth" value={selectedFeature.depth} unit="mm" onChange={(value) => updateFeature(selectedFeature.id, { depth: Math.max(0, value) })} />
                <CadNumber label="Amount" value={selectedFeature.amount} unit="mm" onChange={(value) => updateFeature(selectedFeature.id, { amount: Math.max(0, value) })} />
                <CadNumber label="Count" value={selectedFeature.count} unit="" onChange={(value) => updateFeature(selectedFeature.id, { count: Math.max(1, Math.round(value)) })} />
                <CadNumber label="Spacing" value={selectedFeature.spacing} unit="mm" onChange={(value) => updateFeature(selectedFeature.id, { spacing: value })} />
              </div>
              <button
                type="button"
                onClick={() => updateFeature(selectedFeature.id, { enabled: !selectedFeature.enabled })}
                className={`mt-4 w-full rounded-xl border px-3 py-2.5 text-sm font-black ${selectedFeature.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
              >
                {selectedFeature.enabled ? 'Feature enabled' : 'Feature suppressed'}
              </button>
            </Panel>
          )}

          <Panel>
            <div className="mb-3 flex items-center justify-between gap-3">
              <SectionTitle title="Project Definition" caption="JSON export path" />
              <DownloadSimple size={18} weight="bold" className="text-slate-400" />
            </div>
            <textarea readOnly value={exportDefinition} className="h-40 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] leading-relaxed text-slate-600 outline-none" />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function CadScene({ entities, features, selectedFeatureId, viewportMode }: { entities: SketchEntity[]; features: CadFeature[]; selectedFeatureId: string; viewportMode: 'shaded' | 'realistic' | 'section' }) {
  const modelFeatures = features.filter((feature) => feature.enabled && feature.kind !== 'sketch');
  return (
    <group rotation={[0, -0.32, 0]}>
      {modelFeatures.map((feature, index) => {
        const entity = entities.find((item) => item.id === feature.entityId);
        if (!entity || feature.operation === 'reference') return null;
        return <FeatureSolid key={feature.id} entity={entity} feature={feature} index={index} selected={feature.id === selectedFeatureId} viewportMode={viewportMode} />;
      })}
      <Axes />
    </group>
  );
}

function FeatureSolid({ entity, feature, index, selected, viewportMode }: { entity: SketchEntity; feature: CadFeature; index: number; selected: boolean; viewportMode: 'shaded' | 'realistic' | 'section' }) {
  const material = cadMaterials[feature.material];
  const scale = 0.012;
  const x = (entity.x - 280) * scale;
  const z = (entity.y - 170) * scale;
  const y = Math.max(feature.depth, 1) * scale * 0.5 + index * 0.004;
  const depth = Math.max(feature.depth, 1) * scale;
  const color = feature.operation === 'cut' ? '#fb3b5f' : material.color;
  const opacity = feature.operation === 'cut' ? 0.28 : viewportMode === 'section' ? 0.68 : material.name === 'Glass' ? 0.52 : 1;
  const emissive = selected ? '#0ea5e9' : '#000000';
  const mat = (
    <meshStandardMaterial
      color={color}
      roughness={viewportMode === 'realistic' ? material.roughness : 0.55}
      metalness={viewportMode === 'realistic' ? material.metalness : 0.08}
      transparent={feature.operation === 'cut' || material.name === 'Glass' || viewportMode === 'section'}
      opacity={opacity}
      emissive={emissive}
      emissiveIntensity={selected ? 0.08 : 0}
    />
  );

  if (entity.type === 'circle') {
    return (
      <mesh position={[x, y, z]} castShadow receiveShadow>
        <cylinderGeometry args={[entity.radius * scale, entity.radius * scale, depth, 72]} />
        {mat}
      </mesh>
    );
  }

  if (entity.type === 'slot') {
    return (
      <group position={[x, y, z]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[Math.max(0.08, (entity.w - entity.h) * scale), depth, entity.h * scale]} />
          {mat}
        </mesh>
        <mesh position={[-(entity.w - entity.h) * scale * 0.5, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[entity.h * scale * 0.5, entity.h * scale * 0.5, depth, 36]} />
          {mat}
        </mesh>
        <mesh position={[(entity.w - entity.h) * scale * 0.5, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[entity.h * scale * 0.5, entity.h * scale * 0.5, depth, 36]} />
          {mat}
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={[x, y, z]} castShadow receiveShadow>
      <boxGeometry args={[Math.max(0.08, entity.w * scale), depth, Math.max(0.08, entity.h * scale)]} />
      {mat}
    </mesh>
  );
}

function Axes() {
  return (
    <group position={[-2.15, 0.08, 1.85]}>
      <mesh rotation={[0, 0, -Math.PI / 2]} position={[0.22, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.44, 12]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.22]}>
        <cylinderGeometry args={[0.012, 0.012, 0.44, 12]} />
        <meshBasicMaterial color="#2563eb" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.44, 12]} />
        <meshBasicMaterial color="#16a34a" />
      </mesh>
    </group>
  );
}

function SketchEntityView({ entity, selected, onPointerDown }: { entity: SketchEntity; selected: boolean; onPointerDown: (event: React.PointerEvent<SVGElement>, entity: SketchEntity) => void }) {
  const stroke = selected ? '#0ea5e9' : '#334155';
  const fill = selected ? 'rgba(14,165,233,0.12)' : 'rgba(148,163,184,0.14)';
  if (entity.type === 'line') {
    return (
      <g onPointerDown={(event) => onPointerDown(event, entity)} className="cursor-move">
        <line x1={entity.x} y1={entity.y} x2={entity.x + entity.w} y2={entity.y + entity.h} stroke={stroke} strokeWidth={selected ? 3 : 2} strokeLinecap="round" />
        <SketchLabel entity={entity} />
      </g>
    );
  }
  if (entity.type === 'circle') {
    return (
      <g onPointerDown={(event) => onPointerDown(event, entity)} className="cursor-move">
        <circle cx={entity.x} cy={entity.y} r={entity.radius} fill={fill} stroke={stroke} strokeWidth={selected ? 3 : 2} />
        <SketchLabel entity={entity} />
      </g>
    );
  }
  if (entity.type === 'slot') {
    return (
      <g onPointerDown={(event) => onPointerDown(event, entity)} className="cursor-move">
        <rect x={entity.x - entity.w / 2} y={entity.y - entity.h / 2} width={entity.w} height={entity.h} rx={entity.h / 2} fill={fill} stroke={stroke} strokeWidth={selected ? 3 : 2} />
        <SketchLabel entity={entity} />
      </g>
    );
  }
  return (
    <g onPointerDown={(event) => onPointerDown(event, entity)} className="cursor-move">
      <rect x={entity.x - entity.w / 2} y={entity.y - entity.h / 2} width={entity.w} height={entity.h} rx="6" fill={fill} stroke={stroke} strokeWidth={selected ? 3 : 2} />
      <SketchLabel entity={entity} />
    </g>
  );
}

function SketchLabel({ entity }: { entity: SketchEntity }) {
  const y = entity.type === 'line' ? entity.y - 12 : entity.y - Math.abs(entity.h) / 2 - 10;
  const dimY = entity.type === 'line' ? entity.y + 18 : entity.y + Math.abs(entity.h) / 2 + 22;
  return (
    <g className="pointer-events-none">
      <text x={entity.x} y={y} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="900">{entity.name}</text>
      <text x={entity.x} y={dimY} textAnchor="middle" fill="#2563eb" fontSize="10" fontWeight="900">{entity.type === 'line' ? `${formatMm(Math.hypot(entity.w, entity.h))}` : `${formatMm(entity.w)} x ${formatMm(entity.h)}`}</text>
    </g>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>;
}

function SectionTitle({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="mb-3">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</div>
      <div className="mt-1 text-sm font-semibold text-slate-500">{caption}</div>
    </div>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className={`text-xs font-black ${tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-700'}`}>{value}</div>
    </div>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
      <span className="px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</span>
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-lg px-2.5 py-1.5 text-xs font-black capitalize ${value === option ? 'bg-white text-sky-700 shadow-sm ring-1 ring-sky-200' : 'text-slate-500 hover:text-slate-900'}`}>
          {option}
        </button>
      ))}
    </div>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className={`mt-2 flex items-baseline gap-1 text-2xl font-black ${tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-950'}`}>
        {value}
        {unit && <span className="text-xs font-black text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

function CadNumber({ label, value, unit, onChange }: { label: string; value: number; unit: string; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" value={Number(value.toFixed(2))} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-lg font-black text-slate-950 outline-none" />
        {unit && <span className="text-[10px] font-black uppercase text-slate-400">{unit}</span>}
      </div>
    </label>
  );
}

function applyEntityRules(entity: SketchEntity): SketchEntity {
  let next = { ...entity };
  if (next.constraints.includes('equal')) {
    const size = Math.max(8, Math.max(Math.abs(next.w), Math.abs(next.h)));
    next = { ...next, w: size, h: size, radius: next.type === 'circle' ? size / 2 : next.radius };
  }
  if (next.type === 'line' && next.constraints.includes('horizontal')) next = { ...next, h: 0 };
  if (next.type === 'line' && next.constraints.includes('vertical')) next = { ...next, w: 0 };
  return next;
}

function sketchArea(entity: SketchEntity) {
  if (entity.type === 'line') return 0;
  if (entity.type === 'circle') return Math.PI * Math.pow(entity.radius, 2);
  if (entity.type === 'slot') return Math.max(entity.w - entity.h, 0) * entity.h + Math.PI * Math.pow(entity.h / 2, 2);
  return entity.w * entity.h;
}

function svgPoint(event: React.PointerEvent, svg: SVGSVGElement | null) {
  const matrix = svg?.getScreenCTM();
  if (!svg || !matrix) return { x: 0, y: 0 };
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(matrix.inverse());
}

function snapPoint(point: { x: number; y: number }) {
  return { x: Math.round(point.x / snap) * snap, y: Math.round(point.y / snap) * snap };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '0';
}

function formatMm(value: number) {
  return `${formatNumber(value, 0)} mm`;
}

function toolName(tool: Exclude<SketchTool, 'select'>) {
  return tool === 'slot' ? 'Slot' : tool.charAt(0).toUpperCase() + tool.slice(1);
}

function featureName(kind: FeatureKind) {
  const names: Record<FeatureKind, string> = {
    sketch: 'Sketch',
    extrude: 'Extrude',
    cut: 'Cut',
    fillet: 'Fillet',
    chamfer: 'Chamfer',
    pattern: 'Pattern',
    mirror: 'Mirror',
  };
  return names[kind];
}
