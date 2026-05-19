import React, { useRef, useState } from 'react';
import {
  Car,
  CheckCircle,
  CornersIn,
  CornersOut,
  Cube,
  Drop,
  Engine,
  Gear,
  Gauge,
  Robot,
  ThermometerHot,
  WarningCircle,
  WaveSine,
  Wrench,
} from '@phosphor-icons/react';

export type MechanicalStudioTool =
  | 'thermoCycle'
  | 'heatExchanger'
  | 'pipeFlow'
  | 'pump'
  | 'beamStress'
  | 'mohrsCircle'
  | 'shaftGear'
  | 'fourBar'
  | 'cnc'
  | 'welding'
  | 'robotArm'
  | 'pidControl'
  | 'vibration'
  | 'icEngine'
  | 'vehicleDynamics'
  | 'cad3d'
  | 'refrigeration'
  | 'boilerPlant'
  | 'turbineCompressor'
  | 'materialTesting'
  | 'metrology'
  | 'castingFoundry'
  | 'sheetMetal'
  | 'industrialEngineering'
  | 'maintenanceReliability'
  | 'additiveManufacturing';

type MechanicalEngineeringStudioProps = {
  tool: MechanicalStudioTool;
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
};

type Accent = { text: string; bg: string; border: string; soft: string; fill: string; stroke: string };
type MechInputKey = 'a' | 'b' | 'c' | 'd';
type MechValues = Record<MechInputKey, number>;
type MechInput = { key: MechInputKey; label: string; unit?: string; min: number; max: number; step: number };

const accentClasses: Record<string, Accent> = {
  rose: { text: 'text-rose-300', bg: 'bg-rose-500', border: 'border-rose-400/25', soft: 'bg-rose-500/10', fill: '#fb7185', stroke: '#f43f5e' },
  amber: { text: 'text-amber-300', bg: 'bg-amber-500', border: 'border-amber-400/25', soft: 'bg-amber-500/10', fill: '#fbbf24', stroke: '#f59e0b' },
  sky: { text: 'text-sky-300', bg: 'bg-sky-500', border: 'border-sky-400/25', soft: 'bg-sky-500/10', fill: '#38bdf8', stroke: '#0ea5e9' },
  emerald: { text: 'text-emerald-300', bg: 'bg-emerald-500', border: 'border-emerald-400/25', soft: 'bg-emerald-500/10', fill: '#34d399', stroke: '#10b981' },
  violet: { text: 'text-violet-300', bg: 'bg-violet-500', border: 'border-violet-400/25', soft: 'bg-violet-500/10', fill: '#a78bfa', stroke: '#8b5cf6' },
  indigo: { text: 'text-indigo-300', bg: 'bg-indigo-500', border: 'border-indigo-400/25', soft: 'bg-indigo-500/10', fill: '#818cf8', stroke: '#6366f1' },
  teal: { text: 'text-teal-300', bg: 'bg-teal-500', border: 'border-teal-400/25', soft: 'bg-teal-500/10', fill: '#2dd4bf', stroke: '#14b8a6' },
};

const toolMeta: Record<MechanicalStudioTool, { title: string; subtitle: string; accent: string; icon: React.ReactNode }> = {
  thermoCycle: { title: 'Thermodynamic Cycle Studio', subtitle: 'Otto/Diesel/Rankine style efficiency, work and heat balance checks', accent: 'rose', icon: <ThermometerHot size={24} weight="duotone" /> },
  heatExchanger: { title: 'Heat Exchanger Studio', subtitle: 'LMTD, UA, effectiveness and outlet temperature sensitivity', accent: 'amber', icon: <ThermometerHot size={24} weight="duotone" /> },
  pipeFlow: { title: 'Fluid Pipe Flow Studio', subtitle: 'Reynolds number, friction loss, velocity and pumping power', accent: 'sky', icon: <Drop size={24} weight="duotone" /> },
  pump: { title: 'Pump & Turbomachinery Studio', subtitle: 'Head, discharge, specific speed, efficiency and cavitation margin', accent: 'teal', icon: <Gauge size={24} weight="duotone" /> },
  beamStress: { title: 'Strength of Materials Studio', subtitle: 'Beam stress, deflection, shear and factor of safety checks', accent: 'amber', icon: <Wrench size={24} weight="duotone" /> },
  mohrsCircle: { title: "Mohr's Circle Studio", subtitle: 'Principal stress, max shear and rotated stress visualization', accent: 'indigo', icon: <WaveSine size={24} weight="duotone" /> },
  shaftGear: { title: 'Shaft & Gear Design Studio', subtitle: 'Torque, shaft diameter, gear ratio and key stress checks', accent: 'violet', icon: <Gear size={24} weight="duotone" /> },
  fourBar: { title: 'Four-Bar Mechanism Studio', subtitle: 'Linkage geometry, transmission angle and Grashof condition', accent: 'violet', icon: <Gear size={24} weight="duotone" /> },
  cnc: { title: 'CNC Machining Studio', subtitle: 'Feed, spindle speed, MRR, cycle time and surface finish estimate', accent: 'emerald', icon: <Wrench size={24} weight="duotone" /> },
  welding: { title: 'Welding & Fabrication Studio', subtitle: 'Heat input, weld size, throat area and distortion risk checks', accent: 'rose', icon: <Wrench size={24} weight="duotone" /> },
  robotArm: { title: 'Robotics Arm Studio', subtitle: 'Reach envelope, payload, joint torque and workspace checks', accent: 'teal', icon: <Robot size={24} weight="duotone" /> },
  pidControl: { title: 'PID Control Studio', subtitle: 'Gain tuning, overshoot, settling and actuator saturation response', accent: 'teal', icon: <Gauge size={24} weight="duotone" /> },
  vibration: { title: 'Dynamics & Vibration Studio', subtitle: 'Natural frequency, damping ratio, resonance and isolation checks', accent: 'indigo', icon: <WaveSine size={24} weight="duotone" /> },
  icEngine: { title: 'IC Engine Performance Studio', subtitle: 'Brake power, indicated power, fuel consumption and efficiency', accent: 'rose', icon: <Engine size={24} weight="duotone" /> },
  vehicleDynamics: { title: 'Vehicle Dynamics Studio', subtitle: 'Braking distance, cornering load, traction and gradeability checks', accent: 'amber', icon: <Car size={24} weight="duotone" /> },
  cad3d: { title: 'CAD / 3D Modeling Studio', subtitle: 'Parametric block model, mass, volume, tolerance and printability checks', accent: 'sky', icon: <Cube size={24} weight="duotone" /> },
  refrigeration: { title: 'Refrigeration & Air Conditioning Studio', subtitle: 'COP, cooling load, psychrometric process and compressor work', accent: 'sky', icon: <ThermometerHot size={24} weight="duotone" /> },
  boilerPlant: { title: 'Boiler / Steam Plant Studio', subtitle: 'Boiler efficiency, equivalent evaporation, heat balance and draught checks', accent: 'rose', icon: <Engine size={24} weight="duotone" /> },
  turbineCompressor: { title: 'Turbine & Compressor Studio', subtitle: 'Pressure ratio, stage efficiency, work and velocity-triangle fundamentals', accent: 'teal', icon: <Gauge size={24} weight="duotone" /> },
  materialTesting: { title: 'Material Testing Studio', subtitle: 'Stress-strain curve, hardness, impact energy and fatigue life checks', accent: 'amber', icon: <Wrench size={24} weight="duotone" /> },
  metrology: { title: 'Metrology Studio', subtitle: 'Limits, fits, tolerance stack-up, gauge design and measurement error', accent: 'indigo', icon: <Gauge size={24} weight="duotone" /> },
  castingFoundry: { title: 'Casting & Foundry Studio', subtitle: 'Riser sizing, shrinkage allowance, gating ratio and solidification time', accent: 'rose', icon: <Drop size={24} weight="duotone" /> },
  sheetMetal: { title: 'Sheet Metal & Forming Studio', subtitle: 'Bend allowance, blank size, forming force and springback estimate', accent: 'emerald', icon: <Wrench size={24} weight="duotone" /> },
  industrialEngineering: { title: 'Industrial Engineering Studio', subtitle: 'Time study, line balancing, EOQ, inventory and layout productivity', accent: 'violet', icon: <Gear size={24} weight="duotone" /> },
  maintenanceReliability: { title: 'Maintenance & Reliability Studio', subtitle: 'MTBF, MTTR, availability and preventive maintenance planning', accent: 'teal', icon: <CheckCircle size={24} weight="duotone" /> },
  additiveManufacturing: { title: 'Additive Manufacturing Studio', subtitle: 'Layer height, print time, material usage and support risk', accent: 'sky', icon: <Cube size={24} weight="duotone" /> },
};

const toolConfig: Record<MechanicalStudioTool, { caption: string; inputs: MechInput[]; initial: MechValues }> = {
  thermoCycle: { caption: 'Drag compression ratio and peak temperature to tune the cycle.', inputs: [
    { key: 'a', label: 'Compression ratio', min: 6, max: 22, step: 0.5 },
    { key: 'b', label: 'Peak temp', unit: 'K', min: 900, max: 2600, step: 50 },
    { key: 'c', label: 'Inlet temp', unit: 'K', min: 280, max: 500, step: 10 },
    { key: 'd', label: 'Gamma', min: 1.2, max: 1.45, step: 0.01 },
  ], initial: { a: 10, b: 1800, c: 300, d: 1.4 } },
  heatExchanger: { caption: 'Drag hot/cold flow conditions for LMTD and heat duty.', inputs: [
    { key: 'a', label: 'Hot inlet', unit: 'C', min: 60, max: 350, step: 5 },
    { key: 'b', label: 'Cold inlet', unit: 'C', min: 5, max: 120, step: 5 },
    { key: 'c', label: 'UA', unit: 'kW/K', min: 0.5, max: 80, step: 0.5 },
    { key: 'd', label: 'Flow factor', min: 0.5, max: 8, step: 0.1 },
  ], initial: { a: 180, b: 30, c: 18, d: 2.4 } },
  pipeFlow: { caption: 'Drag flow and diameter to size pipe losses.', inputs: [
    { key: 'a', label: 'Flow', unit: 'L/s', min: 1, max: 300, step: 1 },
    { key: 'b', label: 'Diameter', unit: 'mm', min: 25, max: 800, step: 5 },
    { key: 'c', label: 'Length', unit: 'm', min: 5, max: 1000, step: 5 },
    { key: 'd', label: 'Roughness', unit: 'mm', min: 0.001, max: 1.5, step: 0.01 },
  ], initial: { a: 45, b: 150, c: 120, d: 0.05 } },
  pump: { caption: 'Drag head and discharge to estimate pump power.', inputs: [
    { key: 'a', label: 'Head', unit: 'm', min: 5, max: 180, step: 1 },
    { key: 'b', label: 'Discharge', unit: 'L/s', min: 5, max: 500, step: 5 },
    { key: 'c', label: 'Efficiency', unit: '%', min: 30, max: 92, step: 1 },
    { key: 'd', label: 'NPSHa', unit: 'm', min: 1, max: 20, step: 0.5 },
  ], initial: { a: 42, b: 85, c: 72, d: 7 } },
  beamStress: { caption: 'Drag load and span to check bending stress and deflection.', inputs: [
    { key: 'a', label: 'Span', unit: 'm', min: 1, max: 12, step: 0.25 },
    { key: 'b', label: 'Load', unit: 'kN', min: 1, max: 300, step: 1 },
    { key: 'c', label: 'Section Z', unit: 'cm3', min: 20, max: 2500, step: 10 },
    { key: 'd', label: 'E', unit: 'GPa', min: 60, max: 220, step: 5 },
  ], initial: { a: 4, b: 35, c: 420, d: 200 } },
  mohrsCircle: { caption: 'Drag normal stresses to reshape the stress circle.', inputs: [
    { key: 'a', label: 'Sigma x', unit: 'MPa', min: -200, max: 300, step: 5 },
    { key: 'b', label: 'Sigma y', unit: 'MPa', min: -200, max: 300, step: 5 },
    { key: 'c', label: 'Tau xy', unit: 'MPa', min: -150, max: 150, step: 5 },
    { key: 'd', label: 'Angle', unit: 'deg', min: 0, max: 90, step: 1 },
  ], initial: { a: 120, b: 35, c: 45, d: 30 } },
  shaftGear: { caption: 'Drag torque and speed for shaft and gear checks.', inputs: [
    { key: 'a', label: 'Power', unit: 'kW', min: 1, max: 500, step: 1 },
    { key: 'b', label: 'Speed', unit: 'rpm', min: 50, max: 5000, step: 50 },
    { key: 'c', label: 'Gear ratio', min: 1, max: 12, step: 0.25 },
    { key: 'd', label: 'Allow stress', unit: 'MPa', min: 40, max: 220, step: 5 },
  ], initial: { a: 22, b: 960, c: 3.5, d: 95 } },
  fourBar: { caption: 'Drag crank and coupler length to test mechanism mobility.', inputs: [
    { key: 'a', label: 'Crank', unit: 'mm', min: 20, max: 220, step: 5 },
    { key: 'b', label: 'Coupler', unit: 'mm', min: 40, max: 320, step: 5 },
    { key: 'c', label: 'Rocker', unit: 'mm', min: 40, max: 320, step: 5 },
    { key: 'd', label: 'Ground', unit: 'mm', min: 60, max: 400, step: 5 },
  ], initial: { a: 70, b: 180, c: 160, d: 220 } },
  cnc: { caption: 'Drag speed and feed to tune machining output.', inputs: [
    { key: 'a', label: 'Spindle', unit: 'rpm', min: 200, max: 8000, step: 100 },
    { key: 'b', label: 'Feed', unit: 'mm/min', min: 20, max: 2500, step: 20 },
    { key: 'c', label: 'Depth cut', unit: 'mm', min: 0.2, max: 12, step: 0.1 },
    { key: 'd', label: 'Tool dia', unit: 'mm', min: 2, max: 50, step: 1 },
  ], initial: { a: 2400, b: 450, c: 2.5, d: 12 } },
  welding: { caption: 'Drag current and travel speed to control heat input.', inputs: [
    { key: 'a', label: 'Current', unit: 'A', min: 40, max: 450, step: 5 },
    { key: 'b', label: 'Voltage', unit: 'V', min: 12, max: 40, step: 1 },
    { key: 'c', label: 'Travel speed', unit: 'mm/min', min: 80, max: 900, step: 10 },
    { key: 'd', label: 'Weld size', unit: 'mm', min: 3, max: 18, step: 0.5 },
  ], initial: { a: 180, b: 24, c: 280, d: 6 } },
  robotArm: { caption: 'Drag link lengths and payload for arm workspace.', inputs: [
    { key: 'a', label: 'Link 1', unit: 'mm', min: 100, max: 900, step: 10 },
    { key: 'b', label: 'Link 2', unit: 'mm', min: 100, max: 900, step: 10 },
    { key: 'c', label: 'Payload', unit: 'kg', min: 0.5, max: 80, step: 0.5 },
    { key: 'd', label: 'Joint speed', unit: 'deg/s', min: 10, max: 240, step: 5 },
  ], initial: { a: 420, b: 360, c: 8, d: 90 } },
  pidControl: { caption: 'Drag controller gains for response quality.', inputs: [
    { key: 'a', label: 'Kp', min: 0.1, max: 20, step: 0.1 },
    { key: 'b', label: 'Ki', min: 0, max: 10, step: 0.1 },
    { key: 'c', label: 'Kd', min: 0, max: 5, step: 0.05 },
    { key: 'd', label: 'Load change', unit: '%', min: 0, max: 100, step: 5 },
  ], initial: { a: 4.5, b: 1.2, c: 0.35, d: 30 } },
  vibration: { caption: 'Drag mass and stiffness to tune natural frequency.', inputs: [
    { key: 'a', label: 'Mass', unit: 'kg', min: 1, max: 1000, step: 1 },
    { key: 'b', label: 'Stiffness', unit: 'kN/m', min: 1, max: 5000, step: 10 },
    { key: 'c', label: 'Damping', unit: '%', min: 0, max: 40, step: 1 },
    { key: 'd', label: 'Excitation', unit: 'Hz', min: 0.5, max: 80, step: 0.5 },
  ], initial: { a: 120, b: 650, c: 8, d: 11 } },
  icEngine: { caption: 'Drag fuel rate and torque to evaluate engine performance.', inputs: [
    { key: 'a', label: 'Torque', unit: 'N-m', min: 10, max: 900, step: 5 },
    { key: 'b', label: 'Speed', unit: 'rpm', min: 500, max: 9000, step: 100 },
    { key: 'c', label: 'Fuel rate', unit: 'kg/h', min: 0.5, max: 90, step: 0.5 },
    { key: 'd', label: 'Calorific value', unit: 'MJ/kg', min: 36, max: 48, step: 0.5 },
  ], initial: { a: 180, b: 2400, c: 12, d: 43 } },
  vehicleDynamics: { caption: 'Drag speed and friction for braking and grade checks.', inputs: [
    { key: 'a', label: 'Speed', unit: 'km/h', min: 10, max: 180, step: 5 },
    { key: 'b', label: 'Friction', min: 0.2, max: 1.1, step: 0.05 },
    { key: 'c', label: 'Mass', unit: 'kg', min: 300, max: 8000, step: 50 },
    { key: 'd', label: 'Grade', unit: '%', min: 0, max: 30, step: 1 },
  ], initial: { a: 80, b: 0.65, c: 1400, d: 8 } },
  cad3d: { caption: 'Drag model dimensions to check mass and printability.', inputs: [
    { key: 'a', label: 'Length', unit: 'mm', min: 20, max: 600, step: 5 },
    { key: 'b', label: 'Width', unit: 'mm', min: 20, max: 400, step: 5 },
    { key: 'c', label: 'Height', unit: 'mm', min: 5, max: 250, step: 5 },
    { key: 'd', label: 'Density', unit: 'g/cc', min: 0.8, max: 8, step: 0.1 },
  ], initial: { a: 180, b: 90, c: 45, d: 2.7 } },
  refrigeration: { caption: 'Drag evaporator and condenser conditions to tune COP and compressor work.', inputs: [
    { key: 'a', label: 'Cooling load', unit: 'kW', min: 1, max: 500, step: 1 },
    { key: 'b', label: 'Evap temp', unit: 'C', min: -30, max: 18, step: 1 },
    { key: 'c', label: 'Cond temp', unit: 'C', min: 25, max: 65, step: 1 },
    { key: 'd', label: 'Air flow', unit: 'm3/s', min: 0.2, max: 20, step: 0.1 },
  ], initial: { a: 55, b: 5, c: 42, d: 3.2 } },
  boilerPlant: { caption: 'Drag steam generation and fuel rate to balance boiler performance.', inputs: [
    { key: 'a', label: 'Steam rate', unit: 'kg/h', min: 200, max: 50000, step: 100 },
    { key: 'b', label: 'Steam pressure', unit: 'bar', min: 5, max: 180, step: 1 },
    { key: 'c', label: 'Fuel rate', unit: 'kg/h', min: 20, max: 6000, step: 20 },
    { key: 'd', label: 'Fuel CV', unit: 'MJ/kg', min: 12, max: 48, step: 0.5 },
  ], initial: { a: 8000, b: 42, c: 760, d: 32 } },
  turbineCompressor: { caption: 'Drag pressure ratio and efficiency to inspect stage work.', inputs: [
    { key: 'a', label: 'Pressure ratio', min: 1.2, max: 18, step: 0.1 },
    { key: 'b', label: 'Inlet temp', unit: 'K', min: 280, max: 900, step: 10 },
    { key: 'c', label: 'Efficiency', unit: '%', min: 45, max: 92, step: 1 },
    { key: 'd', label: 'Mass flow', unit: 'kg/s', min: 0.5, max: 120, step: 0.5 },
  ], initial: { a: 5.5, b: 310, c: 78, d: 12 } },
  materialTesting: { caption: 'Drag load and specimen dimensions to build a live stress-strain check.', inputs: [
    { key: 'a', label: 'Load', unit: 'kN', min: 1, max: 500, step: 1 },
    { key: 'b', label: 'Diameter', unit: 'mm', min: 4, max: 60, step: 0.5 },
    { key: 'c', label: 'Extension', unit: 'mm', min: 0.01, max: 30, step: 0.01 },
    { key: 'd', label: 'Gauge length', unit: 'mm', min: 20, max: 250, step: 1 },
  ], initial: { a: 65, b: 16, c: 1.2, d: 80 } },
  metrology: { caption: 'Drag nominal size and tolerance grade to check fit, stack-up and gauge limits.', inputs: [
    { key: 'a', label: 'Nominal size', unit: 'mm', min: 2, max: 500, step: 1 },
    { key: 'b', label: 'Hole tol', unit: 'um', min: 5, max: 250, step: 1 },
    { key: 'c', label: 'Shaft tol', unit: 'um', min: 5, max: 250, step: 1 },
    { key: 'd', label: 'Basic clearance', unit: 'um', min: -120, max: 220, step: 1 },
  ], initial: { a: 50, b: 35, c: 28, d: 45 } },
  castingFoundry: { caption: 'Drag modulus and shrinkage to size risers, gates and allowances.', inputs: [
    { key: 'a', label: 'Casting volume', unit: 'cm3', min: 50, max: 50000, step: 50 },
    { key: 'b', label: 'Surface area', unit: 'cm2', min: 20, max: 12000, step: 20 },
    { key: 'c', label: 'Shrinkage', unit: '%', min: 0.5, max: 6, step: 0.1 },
    { key: 'd', label: 'Pour time', unit: 's', min: 3, max: 180, step: 1 },
  ], initial: { a: 3200, b: 850, c: 2.1, d: 28 } },
  sheetMetal: { caption: 'Drag bend geometry and sheet thickness to calculate blank and forming force.', inputs: [
    { key: 'a', label: 'Bend angle', unit: 'deg', min: 15, max: 165, step: 1 },
    { key: 'b', label: 'Thickness', unit: 'mm', min: 0.4, max: 12, step: 0.1 },
    { key: 'c', label: 'Bend radius', unit: 'mm', min: 0.4, max: 40, step: 0.1 },
    { key: 'd', label: 'Tensile str.', unit: 'MPa', min: 120, max: 900, step: 5 },
  ], initial: { a: 90, b: 2.5, c: 4, d: 340 } },
  industrialEngineering: { caption: 'Drag cycle times and demand to balance production lines and inventory.', inputs: [
    { key: 'a', label: 'Demand', unit: 'units/day', min: 50, max: 5000, step: 10 },
    { key: 'b', label: 'Available time', unit: 'h/day', min: 4, max: 24, step: 0.5 },
    { key: 'c', label: 'Task sum', unit: 'min', min: 1, max: 240, step: 1 },
    { key: 'd', label: 'Setup cost', unit: 'INR', min: 100, max: 50000, step: 100 },
  ], initial: { a: 620, b: 8, c: 18, d: 2500 } },
  maintenanceReliability: { caption: 'Drag failure and repair times to plan availability and preventive intervals.', inputs: [
    { key: 'a', label: 'MTBF', unit: 'h', min: 20, max: 10000, step: 10 },
    { key: 'b', label: 'MTTR', unit: 'h', min: 0.5, max: 120, step: 0.5 },
    { key: 'c', label: 'PM interval', unit: 'h', min: 20, max: 5000, step: 10 },
    { key: 'd', label: 'Downtime cost', unit: 'k/h', min: 1, max: 500, step: 1 },
  ], initial: { a: 900, b: 8, c: 300, d: 45 } },
  additiveManufacturing: { caption: 'Drag print geometry and layer settings to estimate print time and material use.', inputs: [
    { key: 'a', label: 'Part volume', unit: 'cm3', min: 5, max: 5000, step: 5 },
    { key: 'b', label: 'Layer height', unit: 'mm', min: 0.05, max: 0.6, step: 0.01 },
    { key: 'c', label: 'Infill', unit: '%', min: 5, max: 100, step: 1 },
    { key: 'd', label: 'Print speed', unit: 'mm/s', min: 15, max: 180, step: 1 },
  ], initial: { a: 140, b: 0.2, c: 35, d: 60 } },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const safe = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const fmt = (value: number, digits = 2) => safe(value).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });

function svgPointer(event: React.PointerEvent, svg: SVGSVGElement | null) {
  const matrix = svg?.getScreenCTM();
  if (!svg || !matrix) return { x: 0, y: 0 };
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(matrix.inverse());
}

export default function MechanicalEngineeringStudio({ tool, isFullScreen, onExitFullScreen, onRequestFullScreen }: MechanicalEngineeringStudioProps) {
  const meta = toolMeta[tool];
  const accent = accentClasses[meta.accent];
  const config = toolConfig[tool];
  const [values, setValues] = useState<MechValues>(config.initial);
  const metrics = mechMetrics(tool, values);
  const update = (key: MechInputKey, value: number) => {
    const input = config.inputs.find((item) => item.key === key);
    const next = input ? clamp(value, input.min, input.max) : value;
    setValues((prev) => ({ ...prev, [key]: next }));
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0C10] text-slate-200">
      <div className="shrink-0 border-b border-white/10 bg-[#101722]/95 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${accent.border} ${accent.soft} ${accent.text}`}>
              {meta.icon}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">{meta.title}</h2>
              <p className="text-xs font-medium text-slate-400 sm:text-sm">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill icon={<CheckCircle size={14} weight="duotone" />} label="Native" />
            <StatusPill icon={<Gauge size={14} weight="duotone" />} label="Live Solver" />
            {(onExitFullScreen || onRequestFullScreen) && (
              <button
                type="button"
                onClick={() => (isFullScreen ? onExitFullScreen?.() : onRequestFullScreen?.())}
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-slate-200"
              >
                {isFullScreen ? <CornersIn size={16} weight="bold" /> : <CornersOut size={16} weight="bold" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-8 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <Panel>
            <PanelHeader title="Interactive Inputs" caption={config.caption} icon={meta.icon} accent={accent} />
            <div className="grid grid-cols-2 gap-3 p-4">
              {config.inputs.map((input) => (
                <Field
                  key={input.key}
                  label={input.label}
                  value={values[input.key]}
                  unit={input.unit}
                  min={input.min}
                  max={input.max}
                  step={input.step}
                  onChange={(value) => update(input.key, input.step >= 1 ? Math.round(value) : value)}
                />
              ))}
            </div>
          </Panel>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label={metrics.m1[0]} value={metrics.m1[1]} unit={metrics.m1[2]} tone={metrics.ok ? 'good' : 'warn'} />
              <Metric label={metrics.m2[0]} value={metrics.m2[1]} unit={metrics.m2[2]} />
              <Metric label={metrics.m3[0]} value={metrics.m3[1]} unit={metrics.m3[2]} />
              <Metric label={metrics.m4[0]} value={metrics.m4[1]} unit={metrics.m4[2]} />
            </div>
            <Panel className="p-4">
              <MechGraphic tool={tool} values={values} inputs={config.inputs} accent={accent.stroke} onChange={update} />
            </Panel>
            <Insight ok={metrics.ok} title={metrics.ok ? 'Preliminary check is within target range' : 'Review the highlighted design parameters'} body="This native mechanical studio keeps the workflow interactive: drag the main variables, inspect the diagram, and watch the engineering metrics respond immediately." />
          </div>
        </div>
      </div>
    </div>
  );
}

function mechMetrics(tool: MechanicalStudioTool, v: MechValues): { m1: [string, string, string]; m2: [string, string, string]; m3: [string, string, string]; m4: [string, string, string]; ok: boolean } {
  const metric = (label: string, value: number | string, unit = '', digits = 2): [string, string, string] => [label, typeof value === 'number' ? fmt(value, digits) : value, unit];
  switch (tool) {
    case 'thermoCycle': {
      const eta = 1 - 1 / Math.pow(v.a, v.d - 1);
      const work = (v.b - v.c) * eta;
      return { m1: metric('Efficiency', eta * 100, '%'), m2: metric('Specific work', work, 'kJ/kg'), m3: metric('Pressure ratio', Math.pow(v.a, v.d), ''), m4: metric('Gamma', v.d, ''), ok: eta > 0.45 && v.b > v.c };
    }
    case 'heatExchanger': {
      const duty = v.c * Math.max(v.a - v.b, 1);
      const coldOut = v.b + duty / Math.max(v.d * 4.18, 1);
      return { m1: metric('Heat duty', duty, 'kW'), m2: metric('Cold outlet', coldOut, 'C'), m3: metric('Approach', v.a - coldOut, 'C'), m4: metric('UA', v.c, 'kW/K'), ok: coldOut < v.a - 5 };
    }
    case 'pipeFlow': {
      const area = Math.PI * Math.pow(v.b / 1000, 2) / 4;
      const velocity = (v.a / 1000) / Math.max(area, 0.0001);
      const headLoss = 0.024 * (v.c / Math.max(v.b / 1000, 0.001)) * velocity * velocity / (2 * 9.81);
      return { m1: metric('Velocity', velocity, 'm/s'), m2: metric('Head loss', headLoss, 'm'), m3: metric('Reynolds', velocity * (v.b / 1000) / 1e-6, ''), m4: metric('Roughness', v.d, 'mm'), ok: velocity < 3 && headLoss < 40 };
    }
    case 'pump': {
      const power = 9.81 * (v.b / 1000) * v.a / Math.max(v.c / 100, 0.1);
      return { m1: metric('Shaft power', power, 'kW'), m2: metric('Hydraulic power', 9.81 * (v.b / 1000) * v.a, 'kW'), m3: metric('NPSH margin', v.d - 3, 'm'), m4: metric('Efficiency', v.c, '%'), ok: v.c > 55 && v.d > 3 };
    }
    case 'beamStress': {
      const moment = v.b * v.a / 4;
      const stress = moment * 1e6 / Math.max(v.c * 1000, 1);
      const deflection = (v.b * Math.pow(v.a, 3)) / Math.max(v.d * v.c * 12, 1);
      return { m1: metric('Bending stress', stress, 'MPa'), m2: metric('Max moment', moment, 'kN-m'), m3: metric('Deflection idx', deflection, ''), m4: metric('Section Z', v.c, 'cm3'), ok: stress < 165 && deflection < 20 };
    }
    case 'mohrsCircle': {
      const center = (v.a + v.b) / 2;
      const radius = Math.sqrt(Math.pow((v.a - v.b) / 2, 2) + v.c * v.c);
      return { m1: metric('Sigma 1', center + radius, 'MPa'), m2: metric('Sigma 2', center - radius, 'MPa'), m3: metric('Max shear', radius, 'MPa'), m4: metric('Angle', v.d, 'deg'), ok: center + radius < 250 };
    }
    case 'shaftGear': {
      const torque = 9550 * v.a / Math.max(v.b, 1);
      const dia = Math.cbrt((16 * torque * 1000) / Math.max(Math.PI * v.d, 1));
      return { m1: metric('Torque', torque, 'N-m'), m2: metric('Shaft dia', dia, 'mm'), m3: metric('Output rpm', v.b / v.c, 'rpm'), m4: metric('Gear ratio', v.c, ''), ok: dia < 90 };
    }
    case 'fourBar': {
      const links = [v.a, v.b, v.c, v.d].sort((x, y) => x - y);
      const grashof = links[0] + links[3] <= links[1] + links[2];
      const trans = Math.abs(v.b - v.c) / Math.max(v.d, 1) * 100;
      return { m1: metric('Grashof', grashof ? 'Yes' : 'No'), m2: metric('Mobility', 1, 'DOF'), m3: metric('Transmission idx', trans, '%'), m4: metric('Shortest link', links[0], 'mm'), ok: grashof && trans < 80 };
    }
    case 'cnc': {
      const mrr = v.b * v.c * v.d;
      const chip = v.b / Math.max(v.a, 1);
      return { m1: metric('MRR', mrr, 'mm3/min'), m2: metric('Chip load', chip, 'mm/rev'), m3: metric('Cut speed', Math.PI * v.d * v.a / 1000, 'm/min'), m4: metric('Depth cut', v.c, 'mm'), ok: chip < 0.35 && mrr > 1000 };
    }
    case 'welding': {
      const heat = (v.a * v.b * 60) / Math.max(v.c * 1000, 1);
      const throat = 0.707 * v.d;
      return { m1: metric('Heat input', heat, 'kJ/mm'), m2: metric('Throat', throat, 'mm'), m3: metric('Weld area', throat * 100, 'mm2/100mm'), m4: metric('Current', v.a, 'A'), ok: heat >= 0.4 && heat <= 2.5 };
    }
    case 'robotArm': {
      const reach = v.a + v.b;
      const torque = v.c * 9.81 * reach / 1000;
      return { m1: metric('Max reach', reach, 'mm'), m2: metric('Joint torque', torque, 'N-m'), m3: metric('Workspace', Math.PI * reach * reach / 1e6, 'm2'), m4: metric('Joint speed', v.d, 'deg/s'), ok: torque < 90 };
    }
    case 'pidControl': {
      const overshoot = clamp(40 - v.c * 8 + v.a * 0.8, 0, 100);
      const settling = 12 / Math.max(v.a + v.b, 0.1);
      return { m1: metric('Overshoot', overshoot, '%'), m2: metric('Settling time', settling, 's'), m3: metric('Control effort', v.a * v.d / 10 + v.b * 3, '%'), m4: metric('Kd', v.c, ''), ok: overshoot < 20 && settling < 3.5 };
    }
    case 'vibration': {
      const freq = Math.sqrt((v.b * 1000) / Math.max(v.a, 1)) / (2 * Math.PI);
      const ratio = v.d / Math.max(freq, 0.1);
      return { m1: metric('Natural freq', freq, 'Hz'), m2: metric('Freq ratio', ratio, ''), m3: metric('Damping', v.c, '%'), m4: metric('Isolation', ratio > 1.4 ? 'Good' : 'Poor'), ok: Math.abs(ratio - 1) > 0.25 };
    }
    case 'icEngine': {
      const bp = (2 * Math.PI * v.a * v.b) / 60000;
      const fuelPower = v.c * v.d * 1000 / 3600;
      return { m1: metric('Brake power', bp, 'kW'), m2: metric('Brake efficiency', bp / Math.max(fuelPower, 1) * 100, '%'), m3: metric('BSFC', v.c / Math.max(bp, 1), 'kg/kWh'), m4: metric('Speed', v.b, 'rpm'), ok: bp / Math.max(fuelPower, 1) > 0.22 };
    }
    case 'vehicleDynamics': {
      const speed = v.a / 3.6;
      const brake = speed * speed / Math.max(2 * 9.81 * v.b, 0.1);
      const gradeForce = v.c * 9.81 * v.d / 100;
      return { m1: metric('Braking distance', brake, 'm'), m2: metric('Grade force', gradeForce, 'N'), m3: metric('Kinetic energy', 0.5 * v.c * speed * speed / 1000, 'kJ'), m4: metric('Friction', v.b, ''), ok: brake < 90 };
    }
    case 'cad3d': {
      const volume = v.a * v.b * v.c / 1000;
      const mass = volume * v.d;
      return { m1: metric('Volume', volume, 'cm3'), m2: metric('Mass', mass / 1000, 'kg'), m3: metric('Surface proxy', 2 * (v.a * v.b + v.b * v.c + v.a * v.c) / 100, 'cm2'), m4: metric('Density', v.d, 'g/cc'), ok: v.c >= 10 && mass < 8000 };
    }
    case 'refrigeration': {
      const evapK = v.b + 273.15;
      const condK = v.c + 273.15;
      const carnot = evapK / Math.max(condK - evapK, 1);
      const cop = carnot * 0.42;
      const compressor = v.a / Math.max(cop, 0.1);
      const airDeltaT = v.a / Math.max(1.2 * 1.005 * v.d, 0.1);
      return { m1: metric('COP', cop, ''), m2: metric('Compressor work', compressor, 'kW'), m3: metric('Air delta T', airDeltaT, 'C'), m4: metric('Lift', v.c - v.b, 'C'), ok: cop > 2.4 && airDeltaT < 18 };
    }
    case 'boilerPlant': {
      const steamEnergy = v.a * (2550 + v.b * 2.5) / 3600;
      const fuelEnergy = v.c * v.d * 1000 / 3600;
      const efficiency = steamEnergy / Math.max(fuelEnergy, 1) * 100;
      const equivalentEvap = v.a * (2550 + v.b * 2.5) / 2257;
      return { m1: metric('Boiler efficiency', efficiency, '%'), m2: metric('Steam energy', steamEnergy, 'kW'), m3: metric('Eq. evaporation', equivalentEvap, 'kg/h'), m4: metric('Fuel CV', v.d, 'MJ/kg'), ok: efficiency > 68 && efficiency < 92 };
    }
    case 'turbineCompressor': {
      const gamma = 1.4;
      const cp = 1.005;
      const idealWork = cp * v.b * (Math.pow(v.a, (gamma - 1) / gamma) - 1);
      const actualWork = idealWork / Math.max(v.c / 100, 0.1);
      const power = actualWork * v.d;
      return { m1: metric('Specific work', actualWork, 'kJ/kg'), m2: metric('Power', power, 'kW'), m3: metric('Outlet temp', v.b + actualWork / cp, 'K'), m4: metric('Stage eff.', v.c, '%'), ok: v.c > 65 && actualWork < 420 };
    }
    case 'materialTesting': {
      const area = Math.PI * v.b * v.b / 4;
      const stress = v.a * 1000 / Math.max(area, 1);
      const strain = v.c / Math.max(v.d, 1);
      const modulus = stress / Math.max(strain, 0.0001) / 1000;
      const fatigue = Math.pow(Math.max(420 / Math.max(stress, 1), 1), 5) * 1e5;
      return { m1: metric('Stress', stress, 'MPa'), m2: metric('Strain', strain * 100, '%'), m3: metric('Modulus', modulus, 'GPa'), m4: metric('Fatigue life', fatigue, 'cycles', 0), ok: stress < 420 && strain < 0.08 };
    }
    case 'metrology': {
      const maxClearance = v.d + v.b;
      const minClearance = v.d - v.c;
      const stack = Math.sqrt(v.b * v.b + v.c * v.c);
      const gaugeWear = Math.max(v.b, v.c) * 0.1;
      return { m1: metric('Max clearance', maxClearance, 'um'), m2: metric('Min clearance', minClearance, 'um'), m3: metric('Stack-up', stack, 'um'), m4: metric('Gauge wear', gaugeWear, 'um'), ok: minClearance >= 0 && stack < 120 };
    }
    case 'castingFoundry': {
      const modulus = v.a / Math.max(v.b, 1);
      const riserModulus = modulus * 1.2;
      const shrinkVolume = v.a * v.c / 100;
      const flowRate = v.a / Math.max(v.d, 1);
      const solidification = Math.pow(modulus, 2) * 4.5;
      return { m1: metric('Casting modulus', modulus, 'cm'), m2: metric('Riser modulus', riserModulus, 'cm'), m3: metric('Shrink volume', shrinkVolume, 'cm3'), m4: metric('Solidification', solidification, 's'), ok: riserModulus > modulus && flowRate < 260 };
    }
    case 'sheetMetal': {
      const bendAllowance = (Math.PI / 180) * v.a * (v.c + 0.33 * v.b);
      const springback = (v.d / 210000) * (v.c / Math.max(v.b, 0.1)) * v.a;
      const formingForce = v.d * v.b * v.b * 1.33 / Math.max(v.c, 0.1);
      return { m1: metric('Bend allowance', bendAllowance, 'mm'), m2: metric('Springback', springback, 'deg'), m3: metric('Forming force', formingForce, 'N/mm'), m4: metric('K-factor', 0.33, ''), ok: springback < 6 && formingForce < 4500 };
    }
    case 'industrialEngineering': {
      const takt = (v.b * 60) / Math.max(v.a, 1);
      const stations = Math.ceil(v.c / Math.max(takt, 0.1));
      const balanceEff = v.c / Math.max(stations * takt, 0.1) * 100;
      const eoq = Math.sqrt((2 * v.a * 300 * v.d) / Math.max(v.d * 0.18, 1));
      return { m1: metric('Takt time', takt, 'min/unit'), m2: metric('Stations', stations, ''), m3: metric('Balance eff.', balanceEff, '%'), m4: metric('EOQ', eoq, 'units', 0), ok: balanceEff > 72 && stations <= 12 };
    }
    case 'maintenanceReliability': {
      const availability = v.a / Math.max(v.a + v.b, 1) * 100;
      const failuresPerYear = 8760 / Math.max(v.a, 1);
      const downtimeCost = failuresPerYear * v.b * v.d;
      const pmRisk = clamp((v.c / Math.max(v.a, 1)) * 100, 0, 300);
      return { m1: metric('Availability', availability, '%'), m2: metric('Failures/year', failuresPerYear, ''), m3: metric('Downtime cost', downtimeCost, 'k/yr'), m4: metric('PM risk index', pmRisk, '%'), ok: availability > 97 && pmRisk < 70 };
    }
    case 'additiveManufacturing': {
      const effectiveVolume = v.a * (v.c / 100 + 0.18);
      const material = effectiveVolume * 1.24;
      const layerCount = Math.cbrt(v.a * 1000) / Math.max(v.b, 0.01);
      const printTime = effectiveVolume * 1000 / Math.max(v.d * 8, 1);
      const supportRisk = clamp((v.c < 20 ? 20 : 0) + (v.b < 0.12 ? 20 : 0) + effectiveVolume / 90, 0, 100);
      return { m1: metric('Print time', printTime / 60, 'h'), m2: metric('Material', material, 'g'), m3: metric('Layers', layerCount, '', 0), m4: metric('Support risk', supportRisk, '%'), ok: printTime / 60 < 18 && supportRisk < 55 };
    }
    default:
      return { m1: metric('Metric A', v.a), m2: metric('Metric B', v.b), m3: metric('Metric C', v.c), m4: metric('Metric D', v.d), ok: true };
  }
}

function MechGraphic({ tool, values, inputs, accent, onChange }: { tool: MechanicalStudioTool; values: MechValues; inputs: MechInput[]; accent: string; onChange: (key: MechInputKey, value: number) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragKey, setDragKey] = useState<MechInputKey | null>(null);
  const primary = inputs[0];
  const secondary = inputs[1];
  const tA = (values[primary.key] - primary.min) / Math.max(primary.max - primary.min, 1);
  const tB = (values[secondary.key] - secondary.min) / Math.max(secondary.max - secondary.min, 1);
  const xA = 96 + clamp(tA, 0, 1) * 448;
  const yB = 232 - clamp(tB, 0, 1) * 160;
  const objectColor = ['pipeFlow', 'pump', 'robotArm', 'pidControl', 'turbineCompressor', 'maintenanceReliability'].includes(tool) ? '#2dd4bf' : ['thermoCycle', 'icEngine', 'welding', 'boilerPlant', 'castingFoundry'].includes(tool) ? '#fb7185' : accent;

  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragKey) return;
    const input = inputs.find((item) => item.key === dragKey);
    if (!input) return;
    const point = svgPointer(event, svgRef.current);
    const ratio = dragKey === primary.key ? (point.x - 96) / 448 : (232 - point.y) / 160;
    const raw = input.min + clamp(ratio, 0, 1) * (input.max - input.min);
    const snapped = Math.round(raw / input.step) * input.step;
    onChange(dragKey, Number(snapped.toFixed(input.step < 1 ? 2 : 0)));
  };

  const start = (key: MechInputKey) => (event: React.PointerEvent<SVGElement>) => {
    setDragKey(key);
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const stop = (event: React.PointerEvent<SVGSVGElement>) => {
    setDragKey(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };

  return (
    <svg ref={svgRef} viewBox="0 0 640 320" className="h-80 w-full touch-none" onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <rect x="18" y="18" width="604" height="284" rx="22" fill="rgba(8,13,20,0.95)" stroke="rgba(148,163,184,0.16)" />
      {['thermoCycle', 'heatExchanger', 'icEngine', 'refrigeration', 'boilerPlant', 'turbineCompressor'].includes(tool) && (
        <g>
          <path d={`M120 230 C190 ${yB} 290 84 390 ${yB} S520 230 548 104`} fill="none" stroke={objectColor} strokeWidth="6" strokeLinecap="round" />
          <circle cx="180" cy="206" r="34" fill="rgba(251,113,133,0.14)" stroke={objectColor} strokeWidth="4" />
          <rect x="404" y="98" width="84" height="86" rx="18" fill="rgba(226,232,240,0.08)" stroke={accent} strokeWidth="4" />
          {['heatExchanger', 'refrigeration', 'boilerPlant'].includes(tool) && <path d="M158 128 H500 M158 158 H500 M158 188 H500" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.6" />}
          {tool === 'turbineCompressor' && <path d="M304 92 L442 140 L304 188 Z M304 188 L196 154 L304 92" fill="rgba(45,212,191,0.12)" stroke={objectColor} strokeWidth="5" strokeLinejoin="round" />}
        </g>
      )}
      {['pipeFlow', 'pump'].includes(tool) && (
        <g>
          <path d={`M88 170 H${xA} C${xA + 48} 170 ${xA + 48} ${yB} 548 ${yB}`} fill="none" stroke={objectColor} strokeWidth={Math.max(8, values.b / 18)} strokeLinecap="round" opacity="0.76" />
          <circle cx={xA} cy="170" r="38" fill="rgba(45,212,191,0.12)" stroke={objectColor} strokeWidth="5" />
          {tool === 'pump' && <path d={`M${xA - 18} 150 L${xA + 22} 170 L${xA - 18} 190 Z`} fill={objectColor} />}
        </g>
      )}
      {['beamStress', 'mohrsCircle', 'vibration', 'materialTesting', 'metrology'].includes(tool) && (
        <g>
          <line x1="96" x2={xA} y1="224" y2="224" stroke="rgba(226,232,240,0.72)" strokeWidth="12" strokeLinecap="round" />
          <path d={`M${(96 + xA) / 2} 92 V210`} stroke={objectColor} strokeWidth="7" strokeLinecap="round" />
          <path d={`M${(96 + xA) / 2 - 18} 184 L${(96 + xA) / 2} 218 L${(96 + xA) / 2 + 18} 184 Z`} fill={objectColor} />
          {tool === 'mohrsCircle' && <circle cx="390" cy="158" r={Math.max(32, Math.abs(values.c) * 0.5)} fill="none" stroke={accent} strokeWidth="5" />}
          {tool === 'vibration' && <path d="M120 124 C160 84 200 164 240 124 S320 84 360 124 S440 164 480 124" fill="none" stroke={accent} strokeWidth="5" />}
          {tool === 'materialTesting' && <path d={`M160 236 C230 224 280 ${230 - tA * 80} 348 ${210 - tB * 80} S460 128 520 112`} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />}
          {tool === 'metrology' && <path d="M150 130 H492 M170 114 V146 M472 114 V146 M234 186 H430" stroke={accent} strokeWidth="6" strokeLinecap="round" />}
        </g>
      )}
      {['shaftGear', 'fourBar', 'cnc', 'welding', 'castingFoundry', 'sheetMetal', 'industrialEngineering', 'maintenanceReliability', 'additiveManufacturing'].includes(tool) && (
        <g>
          <circle cx="178" cy="164" r={Math.max(24, tA * 74)} fill="rgba(167,139,250,0.14)" stroke={objectColor} strokeWidth="5" />
          <circle cx="390" cy="164" r={Math.max(24, tB * 74)} fill="rgba(226,232,240,0.08)" stroke={accent} strokeWidth="5" />
          <line x1="178" y1="164" x2="390" y2="164" stroke="rgba(226,232,240,0.5)" strokeWidth="8" strokeLinecap="round" />
          {tool === 'fourBar' && <polyline points={`178,164 270,${yB} 390,164 470,220`} fill="none" stroke={objectColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
          {tool === 'cnc' && <path d="M470 84 V224 M448 104 H520 M448 204 H520" stroke={objectColor} strokeWidth="7" strokeLinecap="round" />}
          {tool === 'welding' && <path d="M460 118 L532 210 M494 142 L528 112" stroke={objectColor} strokeWidth="8" strokeLinecap="round" />}
          {tool === 'castingFoundry' && <path d="M454 92 C520 126 520 198 454 232 C420 194 420 130 454 92 Z" fill="rgba(251,113,133,0.12)" stroke={objectColor} strokeWidth="5" />}
          {tool === 'sheetMetal' && <path d={`M92 218 H310 Q${360 + tB * 80} 218 ${370 + tA * 80} 120 H540`} fill="none" stroke={objectColor} strokeWidth="10" strokeLinecap="round" />}
          {tool === 'industrialEngineering' && <path d="M456 104 h60 v44 h-60z M456 176 h60 v44 h-60z M514 126 h34 M514 198 h34" fill="none" stroke={objectColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
          {tool === 'maintenanceReliability' && <path d={`M442 214 C466 ${166 - tA * 40} 506 ${198 - tB * 50} 542 126`} fill="none" stroke={objectColor} strokeWidth="6" strokeLinecap="round" />}
          {tool === 'additiveManufacturing' && <path d={`M456 226 H540 M456 ${210 - tB * 60} H540 M456 194 H540 M474 108 L524 136 L524 204 L474 176 Z`} fill="none" stroke={objectColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      )}
      {['robotArm', 'pidControl', 'vehicleDynamics', 'cad3d'].includes(tool) && (
        <g>
          {tool === 'robotArm' && (
            <>
              <line x1="180" y1="224" x2={260 + tA * 120} y2={150 - tB * 30} stroke={objectColor} strokeWidth="12" strokeLinecap="round" />
              <line x1={260 + tA * 120} y1={150 - tB * 30} x2="500" y2="104" stroke={accent} strokeWidth="10" strokeLinecap="round" />
              <circle cx="180" cy="224" r="24" fill={objectColor} />
              <circle cx={260 + tA * 120} cy={150 - tB * 30} r="18" fill={accent} />
            </>
          )}
          {tool === 'pidControl' && <path d={`M92 224 C150 ${224 - tA * 120} 210 ${76 + tB * 90} 290 118 S430 120 532 ${98 + values.d * 0.8}`} fill="none" stroke={objectColor} strokeWidth="6" strokeLinecap="round" />}
          {tool === 'vehicleDynamics' && <path d="M118 198 H430 C488 198 516 166 548 132 M150 198 l-32 32 M390 198 l32 32" fill="none" stroke={objectColor} strokeWidth="9" strokeLinecap="round" />}
          {tool === 'cad3d' && <path d={`M170 112 L${xA} 112 L520 ${yB} L230 ${yB} Z M170 112 V218 L230 ${yB} M${xA} 112 V218 L520 ${yB}`} fill="rgba(56,189,248,0.12)" stroke={objectColor} strokeWidth="5" strokeLinejoin="round" />}
        </g>
      )}
      <line x1="96" y1="272" x2="544" y2="272" stroke={accent} strokeWidth="5" opacity="0.28" />
      <circle cx={xA} cy="272" r="24" fill="transparent" className="cursor-ew-resize" onPointerDown={start(primary.key)} />
      <DragKnob x={xA} y={272} accent={accent} label={primary.label} />
      <line x1="574" y1="232" x2="574" y2="72" stroke={objectColor} strokeWidth="5" opacity="0.28" />
      <circle cx="574" cy={yB} r="24" fill="transparent" className="cursor-ns-resize" onPointerDown={start(secondary.key)} />
      <DragKnob x={574} y={yB} accent={objectColor} label={secondary.label} />
    </svg>
  );
}

function Field({ label, value, unit, min, max, step, onChange }: { label: string; value: number; unit?: string; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2 rounded-2xl border border-white/10 bg-[#090E15] p-3">
      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <div className="flex items-center rounded-xl border border-white/10 bg-black/20 px-3 py-2">
        <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="w-full bg-transparent text-lg font-black text-white outline-none" />
        {unit && <span className="text-xs font-black uppercase text-slate-500">{unit}</span>}
      </div>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-sky-400" />
    </label>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-3 flex items-baseline gap-1 text-2xl font-black ${tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-white'}`}>
        {value}
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[#101722] shadow-2xl shadow-black/20 ${className}`}>{children}</div>;
}

function PanelHeader({ title, caption, icon, accent }: { title: string; caption: string; icon: React.ReactNode; accent: Accent }) {
  return (
    <div className="border-b border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${accent.border} ${accent.soft} ${accent.text}`}>{icon}</div>
        <div>
          <div className="text-base font-black text-white">{title}</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">{caption}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-slate-300">{icon}{label}</div>;
}

function DragKnob({ x, y, accent, label }: { x: number; y: number; accent: string; label?: string }) {
  return (
    <g className="pointer-events-none">
      <circle cx={x} cy={y} r="14" fill={accent} opacity="0.18" />
      <circle cx={x} cy={y} r="7" fill={accent} stroke="rgba(255,255,255,0.82)" strokeWidth="2" />
      {label && <text x={x + 16} y={y - 12} fill={accent} fontSize="11" fontWeight="900">{label}</text>}
    </g>
  );
}

function Insight({ ok, title, body }: { ok: boolean; title: string; body: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${ok ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-amber-400/20 bg-amber-500/10'}`}>
      <div className={`flex items-center gap-2 text-sm font-black ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
        {ok ? <CheckCircle size={18} weight="duotone" /> : <WarningCircle size={18} weight="duotone" />}
        {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
