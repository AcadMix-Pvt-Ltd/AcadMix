import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import AcadMixCadStudio from './AcadMixCadStudio';

export type MechanicalStudioTool =
  | 'thermoCycle'
  | 'heatExchanger'
  | 'pipeFlow'
  | 'pump'
  | 'bernoulli'
  | 'openChannel'
  | 'dragWindTunnel'
  | 'beamStress'
  | 'mohrsCircle'
  | 'torsionShaft'
  | 'columnBuckling'
  | 'pressureVessel'
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
  bernoulli: { title: 'Bernoulli / Venturi Studio', subtitle: 'Pressure, velocity, head balance and throat flow visualization', accent: 'sky', icon: <Drop size={24} weight="duotone" /> },
  openChannel: { title: 'Open Channel Flow Studio', subtitle: 'Manning discharge, hydraulic radius, Froude number and flow regime', accent: 'teal', icon: <WaveSine size={24} weight="duotone" /> },
  dragWindTunnel: { title: 'Wind Tunnel & Drag Studio', subtitle: 'Drag force, Reynolds number, dynamic pressure and wake behavior', accent: 'indigo', icon: <Gauge size={24} weight="duotone" /> },
  beamStress: { title: 'Strength of Materials Studio', subtitle: 'Beam stress, deflection, shear and factor of safety checks', accent: 'amber', icon: <Wrench size={24} weight="duotone" /> },
  mohrsCircle: { title: "Mohr's Circle Studio", subtitle: 'Principal stress, max shear and rotated stress visualization', accent: 'indigo', icon: <WaveSine size={24} weight="duotone" /> },
  torsionShaft: { title: 'Torsion Shaft Studio', subtitle: 'Shaft shear stress, polar moment, twist angle and torque capacity', accent: 'violet', icon: <Gear size={24} weight="duotone" /> },
  columnBuckling: { title: 'Column Buckling Studio', subtitle: 'Euler critical load, end conditions, slenderness and load utilization', accent: 'amber', icon: <Wrench size={24} weight="duotone" /> },
  pressureVessel: { title: 'Pressure Vessel Studio', subtitle: 'Thin cylinder hoop stress, longitudinal stress and joint efficiency checks', accent: 'rose', icon: <Gauge size={24} weight="duotone" /> },
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
  bernoulli: { caption: 'Drag upstream velocity and throat ratio to inspect pressure recovery.', inputs: [
    { key: 'a', label: 'Velocity', unit: 'm/s', min: 0.5, max: 35, step: 0.5 },
    { key: 'b', label: 'Throat ratio', min: 0.25, max: 0.95, step: 0.01 },
    { key: 'c', label: 'Elevation diff', unit: 'm', min: -12, max: 12, step: 0.5 },
    { key: 'd', label: 'Loss coeff.', min: 0, max: 2.5, step: 0.05 },
  ], initial: { a: 6, b: 0.55, c: 1.5, d: 0.2 } },
  openChannel: { caption: 'Drag slope and depth to classify open-channel flow.', inputs: [
    { key: 'a', label: 'Channel slope', unit: 'x1000', min: 0.2, max: 30, step: 0.2 },
    { key: 'b', label: 'Flow depth', unit: 'm', min: 0.1, max: 5, step: 0.05 },
    { key: 'c', label: 'Width', unit: 'm', min: 0.5, max: 25, step: 0.5 },
    { key: 'd', label: 'Manning n', min: 0.01, max: 0.08, step: 0.001 },
  ], initial: { a: 4, b: 1.2, c: 4, d: 0.018 } },
  dragWindTunnel: { caption: 'Drag air speed and body area to inspect drag and wake intensity.', inputs: [
    { key: 'a', label: 'Air speed', unit: 'm/s', min: 2, max: 80, step: 1 },
    { key: 'b', label: 'Drag coeff.', min: 0.05, max: 1.8, step: 0.05 },
    { key: 'c', label: 'Frontal area', unit: 'm2', min: 0.02, max: 8, step: 0.02 },
    { key: 'd', label: 'Length scale', unit: 'm', min: 0.02, max: 6, step: 0.02 },
  ], initial: { a: 28, b: 0.42, c: 1.8, d: 1.4 } },
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
  torsionShaft: { caption: 'Drag torque and shaft diameter to inspect shear stress and twist.', inputs: [
    { key: 'a', label: 'Torque', unit: 'kN-m', min: 0.1, max: 80, step: 0.1 },
    { key: 'b', label: 'Diameter', unit: 'mm', min: 10, max: 220, step: 1 },
    { key: 'c', label: 'Length', unit: 'm', min: 0.2, max: 8, step: 0.1 },
    { key: 'd', label: 'G modulus', unit: 'GPa', min: 25, max: 90, step: 1 },
  ], initial: { a: 4.5, b: 55, c: 1.8, d: 80 } },
  columnBuckling: { caption: 'Drag column length and end factor to check Euler buckling safety.', inputs: [
    { key: 'a', label: 'Length', unit: 'm', min: 0.5, max: 12, step: 0.1 },
    { key: 'b', label: 'K factor', min: 0.5, max: 2.2, step: 0.05 },
    { key: 'c', label: 'E', unit: 'GPa', min: 60, max: 220, step: 5 },
    { key: 'd', label: 'Load', unit: 'kN', min: 1, max: 1500, step: 5 },
  ], initial: { a: 3.2, b: 1, c: 200, d: 180 } },
  pressureVessel: { caption: 'Drag pressure and shell thickness to evaluate thin pressure vessel stress.', inputs: [
    { key: 'a', label: 'Pressure', unit: 'MPa', min: 0.1, max: 25, step: 0.1 },
    { key: 'b', label: 'Diameter', unit: 'mm', min: 100, max: 4000, step: 10 },
    { key: 'c', label: 'Thickness', unit: 'mm', min: 2, max: 120, step: 1 },
    { key: 'd', label: 'Joint eff.', unit: '%', min: 55, max: 100, step: 1 },
  ], initial: { a: 2.4, b: 900, c: 14, d: 85 } },
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
  useEffect(() => {
    setValues(config.initial);
  }, [tool, config.initial]);
  const metrics = mechMetrics(tool, values);
  const update = (key: MechInputKey, value: number) => {
    const input = config.inputs.find((item) => item.key === key);
    const next = input ? clamp(value, input.min, input.max) : value;
    setValues((prev) => ({ ...prev, [key]: next }));
  };

  if (tool === 'cad3d') {
    return (
      <AcadMixCadStudio
        isFullScreen={isFullScreen}
        onExitFullScreen={onExitFullScreen}
        onRequestFullScreen={onRequestFullScreen}
      />
    );
  }

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
    case 'bernoulli': {
      const throatVelocity = v.a / Math.max(v.b * v.b, 0.05);
      const pressureDrop = 0.5 * 1000 * (throatVelocity * throatVelocity - v.a * v.a) / 1000 + 9.81 * v.c;
      const headLoss = v.d * v.a * v.a / (2 * 9.81);
      const recovery = clamp(100 - v.d * 18 - Math.abs(1 - v.b) * 35, 0, 100);
      return { m1: metric('Throat velocity', throatVelocity, 'm/s'), m2: metric('Pressure drop', pressureDrop, 'kPa'), m3: metric('Head loss', headLoss, 'm'), m4: metric('Recovery', recovery, '%'), ok: throatVelocity < 45 && headLoss < 12 };
    }
    case 'openChannel': {
      const slope = v.a / 1000;
      const area = v.c * v.b;
      const perimeter = v.c + 2 * v.b;
      const hydraulicRadius = area / Math.max(perimeter, 0.1);
      const discharge = (1 / Math.max(v.d, 0.001)) * area * Math.pow(hydraulicRadius, 2 / 3) * Math.sqrt(slope);
      const froude = discharge / Math.max(area * Math.sqrt(9.81 * v.b), 0.1);
      return { m1: metric('Discharge', discharge, 'm3/s'), m2: metric('Froude', froude, ''), m3: metric('Hydraulic radius', hydraulicRadius, 'm'), m4: metric('Regime', froude < 1 ? 'Subcritical' : 'Supercritical'), ok: froude < 1.2 && discharge > 0.2 };
    }
    case 'dragWindTunnel': {
      const rho = 1.225;
      const drag = 0.5 * rho * v.a * v.a * v.b * v.c;
      const dynamicPressure = 0.5 * rho * v.a * v.a;
      const reynolds = v.a * v.d / 1.5e-5;
      const power = drag * v.a / 1000;
      return { m1: metric('Drag force', drag, 'N'), m2: metric('Dynamic pressure', dynamicPressure, 'Pa'), m3: metric('Reynolds', reynolds, '', 0), m4: metric('Fan power', power, 'kW'), ok: drag < 3500 && reynolds > 10000 };
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
    case 'torsionShaft': {
      const torqueNmm = v.a * 1e6;
      const polarJ = Math.PI * Math.pow(v.b, 4) / 32;
      const shear = (16 * torqueNmm) / Math.max(Math.PI * Math.pow(v.b, 3), 1);
      const twist = torqueNmm * (v.c * 1000) / Math.max(polarJ * v.d * 1000, 1) * (180 / Math.PI);
      const capacity = Math.PI * Math.pow(v.b, 3) * 80 / 16 / 1e6;
      return { m1: metric('Max shear', shear, 'MPa'), m2: metric('Twist angle', twist, 'deg'), m3: metric('Polar J', polarJ / 10000, 'cm4'), m4: metric('Torque cap.', capacity, 'kN-m'), ok: shear < 80 && twist < 4 };
    }
    case 'columnBuckling': {
      const assumedI = 8500 * 1e-8;
      const effectiveLength = v.b * v.a;
      const pcr = Math.PI * Math.PI * v.c * 1e9 * assumedI / Math.max(effectiveLength * effectiveLength, 0.01) / 1000;
      const utilization = v.d / Math.max(pcr, 1) * 100;
      const slenderness = effectiveLength * 1000 / 45;
      return { m1: metric('Euler Pcr', pcr, 'kN'), m2: metric('Utilization', utilization, '%'), m3: metric('Slenderness', slenderness, ''), m4: metric('Effective L', effectiveLength, 'm'), ok: utilization < 80 && slenderness < 180 };
    }
    case 'pressureVessel': {
      const efficiency = Math.max(v.d / 100, 0.1);
      const hoop = v.a * v.b / Math.max(2 * v.c * efficiency, 0.1);
      const longitudinal = v.a * v.b / Math.max(4 * v.c * efficiency, 0.1);
      const thinRatio = v.b / Math.max(v.c, 0.1);
      const margin = 160 / Math.max(hoop, 1);
      return { m1: metric('Hoop stress', hoop, 'MPa'), m2: metric('Long. stress', longitudinal, 'MPa'), m3: metric('D/t ratio', thinRatio, ''), m4: metric('Margin', margin, 'x'), ok: hoop < 160 && thinRatio > 20 };
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
  const objectColor = ['pipeFlow', 'pump', 'bernoulli', 'openChannel', 'dragWindTunnel', 'robotArm', 'pidControl', 'turbineCompressor', 'maintenanceReliability'].includes(tool) ? '#2dd4bf' : ['thermoCycle', 'icEngine', 'welding', 'boilerPlant', 'castingFoundry'].includes(tool) ? '#fb7185' : accent;

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
      {tool === 'thermoCycle' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">P-V cycle</text>
          <line x1="86" y1="238" x2="322" y2="238" stroke="rgba(226,232,240,0.26)" strokeWidth="3" />
          <line x1="86" y1="238" x2="86" y2="78" stroke="rgba(226,232,240,0.26)" strokeWidth="3" />
          <path
            d={`M118 222 C132 ${190 - tA * 44} 158 ${162 - tB * 40} 206 ${142 - tB * 46} C252 ${124 - tA * 32} 292 ${132 + tB * 8} 296 166 C300 210 198 232 118 222 Z`}
            fill="rgba(251,113,133,0.12)"
            stroke={objectColor}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <circle cx="118" cy="222" r="7" fill={objectColor} />
          <circle cx="206" cy={142 - tB * 46} r="7" fill={objectColor} />
          <circle cx="296" cy="166" r="7" fill={objectColor} />
          <path d="M388 94 h120 v140 h-120z" fill="rgba(226,232,240,0.06)" stroke={accent} strokeWidth="4" />
          <rect x="402" y={118 + tA * 44} width="92" height="24" rx="5" fill={objectColor} opacity="0.85" />
          <line x1="448" y1={118 + tA * 44} x2="448" y2="226" stroke="rgba(226,232,240,0.72)" strokeWidth="8" strokeLinecap="round" />
          <path d="M364 126 C336 146 336 182 364 204" fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
          <path d="M530 132 C560 150 560 184 530 206" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
          <text x="406" y="82" fill="rgba(226,232,240,0.66)" fontSize="12" fontWeight="800">piston state</text>
        </g>
      )}
      {tool === 'heatExchanger' && (
        <g>
          <text x="76" y="68" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">counter-flow tube bundle</text>
          <rect x="112" y="96" width="404" height="126" rx="34" fill="rgba(251,191,36,0.08)" stroke={objectColor} strokeWidth="5" />
          <path d="M94 132 H540 M94 186 H540" stroke="rgba(226,232,240,0.42)" strokeWidth="9" strokeLinecap="round" />
          <path d="M118 132 C166 102 204 162 252 132 S336 102 384 132 S468 162 516 132" fill="none" stroke="#fb7185" strokeWidth="7" strokeLinecap="round" />
          <path d="M516 186 C468 216 430 156 382 186 S298 216 250 186 S166 156 118 186" fill="none" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" />
          {[170, 238, 306, 374, 442].map((x) => (
            <path key={x} d={`M${x} 104 v110`} stroke="rgba(226,232,240,0.22)" strokeWidth="5" strokeLinecap="round" />
          ))}
          <path d="M88 132 l22 -16 v32z M548 186 l-22 -16 v32z" fill={objectColor} />
          <path d="M548 132 l-22 -16 v32z M88 186 l22 -16 v32z" fill={accent} />
          <text x="122" y="256" fill="rgba(251,113,133,0.8)" fontSize="12" fontWeight="900">hot stream</text>
          <text x="428" y="256" fill="rgba(56,189,248,0.85)" fontSize="12" fontWeight="900">cold stream</text>
        </g>
      )}
      {tool === 'refrigeration' && (
        <g>
          <text x="72" y="62" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">vapour compression loop</text>
          <path d="M168 132 H430 V222 H168 Z" fill="none" stroke="rgba(226,232,240,0.26)" strokeWidth="8" strokeLinejoin="round" />
          <circle cx="168" cy="132" r="34" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth="5" />
          <path d="M152 132 l26 -16 v32z" fill="#38bdf8" />
          <rect x="374" y="102" width="112" height="60" rx="15" fill="rgba(251,113,133,0.12)" stroke="#fb7185" strokeWidth="5" />
          <path d="M392 118 H468 M392 132 H468 M392 146 H468" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
          <path d="M430 222 l-20 -24 h40z" fill="rgba(226,232,240,0.08)" stroke={accent} strokeWidth="5" strokeLinejoin="round" />
          <rect x="112" y="192" width="112" height="60" rx="15" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth="5" />
          <path d="M130 208 H206 M130 222 H206 M130 236 H206" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
          <path d="M214 132 H330 M300 92 C318 118 318 146 300 172" stroke={objectColor} strokeWidth="5" strokeLinecap="round" fill="none" />
          <text x="130" y="86" fill="rgba(226,232,240,0.62)" fontSize="12" fontWeight="800">compressor</text>
          <text x="392" y="88" fill="rgba(251,113,133,0.76)" fontSize="12" fontWeight="800">condenser</text>
          <text x="126" y="272" fill="rgba(56,189,248,0.78)" fontSize="12" fontWeight="800">evaporator</text>
          <text x="386" y="272" fill="rgba(226,232,240,0.62)" fontSize="12" fontWeight="800">expansion</text>
        </g>
      )}
      {tool === 'boilerPlant' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">steam plant heat balance</text>
          <rect x="104" y="112" width="112" height="118" rx="22" fill="rgba(251,113,133,0.12)" stroke={objectColor} strokeWidth="5" />
          <path d="M126 216 C136 188 152 202 160 176 C170 204 190 188 196 216" fill="#f97316" opacity="0.9" />
          <circle cx="160" cy="126" r="34" fill="rgba(226,232,240,0.08)" stroke="rgba(226,232,240,0.34)" strokeWidth="4" />
          <path d="M216 152 H310" stroke="rgba(226,232,240,0.48)" strokeWidth="8" strokeLinecap="round" />
          <path d="M310 102 L418 152 L310 202 Z" fill="rgba(45,212,191,0.12)" stroke="#2dd4bf" strokeWidth="5" strokeLinejoin="round" />
          <path d="M418 152 H502 V230 H286 V202" fill="none" stroke="rgba(226,232,240,0.34)" strokeWidth="7" strokeLinejoin="round" />
          <rect x="454" y="206" width="80" height="48" rx="14" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth="5" />
          <circle cx="286" cy="202" r="19" fill="rgba(226,232,240,0.08)" stroke={accent} strokeWidth="5" />
          <path d="M273 202 l22 -13 v26z" fill={accent} />
          <text x="122" y="258" fill="rgba(251,113,133,0.78)" fontSize="12" fontWeight="900">boiler</text>
          <text x="330" y="230" fill="rgba(45,212,191,0.82)" fontSize="12" fontWeight="900">turbine</text>
          <text x="454" y="276" fill="rgba(56,189,248,0.8)" fontSize="12" fontWeight="900">condenser</text>
        </g>
      )}
      {tool === 'turbineCompressor' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">stage work and velocity triangles</text>
          <rect x="96" y="98" width="248" height="126" rx="32" fill="rgba(45,212,191,0.08)" stroke={objectColor} strokeWidth="5" />
          {[130, 172, 214, 256, 298].map((x, index) => (
            <path key={x} d={`M${x} 118 C${x + 28} ${132 + index * 6} ${x - 18} ${184 - index * 4} ${x + 20} 204`} fill="none" stroke={index % 2 ? accent : objectColor} strokeWidth="6" strokeLinecap="round" />
          ))}
          <path d="M70 160 H96 M344 160 H404" stroke="rgba(226,232,240,0.5)" strokeWidth="9" strokeLinecap="round" />
          <path d="M404 218 l74 -124 l74 124z" fill="rgba(226,232,240,0.05)" stroke="rgba(226,232,240,0.38)" strokeWidth="4" strokeLinejoin="round" />
          <path d={`M432 208 L${482 + tA * 46} ${116 + tB * 20} L532 208`} fill="none" stroke={objectColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M432 208 H532 M482 116 V208" stroke="rgba(226,232,240,0.18)" strokeWidth="3" />
          <text x="124" y="250" fill="rgba(45,212,191,0.82)" fontSize="12" fontWeight="900">rotor and stator row</text>
          <text x="424" y="250" fill="rgba(226,232,240,0.62)" fontSize="12" fontWeight="900">velocity triangle</text>
        </g>
      )}
      {tool === 'icEngine' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">engine brake power setup</text>
          <rect x="118" y="90" width="176" height="146" rx="24" fill="rgba(251,113,133,0.1)" stroke={objectColor} strokeWidth="5" />
          <rect x="154" y={124 + tA * 50} width="104" height="28" rx="7" fill={objectColor} opacity="0.88" />
          <line x1="206" y1={152 + tA * 50} x2="206" y2="236" stroke="rgba(226,232,240,0.62)" strokeWidth="8" strokeLinecap="round" />
          <circle cx="206" cy="236" r="34" fill="rgba(226,232,240,0.07)" stroke={accent} strokeWidth="5" />
          <path d="M206 236 L240 236" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <path d="M356 114 H508 M356 154 H508 M356 194 H508" stroke="rgba(226,232,240,0.18)" strokeWidth="5" strokeLinecap="round" />
          <path d={`M366 218 C412 ${196 - tB * 70} 456 ${196 - tA * 38} 520 108`} fill="none" stroke={objectColor} strokeWidth="6" strokeLinecap="round" />
          <text x="142" y="266" fill="rgba(251,113,133,0.78)" fontSize="12" fontWeight="900">piston and crank</text>
          <text x="364" y="266" fill="rgba(226,232,240,0.62)" fontSize="12" fontWeight="900">torque speed map</text>
        </g>
      )}
      {tool === 'pipeFlow' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">pipe friction and energy grade line</text>
          <path d="M82 180 H552" stroke="rgba(226,232,240,0.18)" strokeWidth="30" strokeLinecap="round" />
          <path d={`M82 180 H552`} stroke={objectColor} strokeWidth={Math.max(10, Math.min(34, values.b / 12))} strokeLinecap="round" opacity="0.74" />
          <path d={`M108 ${104 + tB * 20} C210 ${112 + tA * 24} 330 ${126 + tA * 54} 532 ${158 + tA * 62}`} fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
          {[150, 230, 310, 390, 470].map((x, index) => (
            <path key={x} d={`M${x} 164 v${32 + index * 6}`} stroke="rgba(8,13,20,0.58)" strokeWidth="4" strokeLinecap="round" />
          ))}
          <path d="M100 180 l24 -16 v32z M540 180 l-24 -16 v32z" fill="#38bdf8" />
          <text x="112" y="234" fill="rgba(56,189,248,0.82)" fontSize="12" fontWeight="900">flow</text>
          <text x="402" y="116" fill="rgba(251,191,36,0.82)" fontSize="12" fontWeight="900">head loss slope</text>
        </g>
      )}
      {tool === 'pump' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">pump curve and operating point</text>
          <circle cx="166" cy="168" r="54" fill="rgba(45,212,191,0.12)" stroke={objectColor} strokeWidth="6" />
          <path d={`M138 138 L198 168 L138 198 Z`} fill={objectColor} opacity="0.9" />
          <path d="M76 168 H112 M220 168 H298" stroke="rgba(226,232,240,0.44)" strokeWidth="13" strokeLinecap="round" />
          <line x1="338" y1="238" x2="552" y2="238" stroke="rgba(226,232,240,0.26)" strokeWidth="3" />
          <line x1="338" y1="238" x2="338" y2="86" stroke="rgba(226,232,240,0.26)" strokeWidth="3" />
          <path d={`M350 ${112 + tA * 18} C396 ${104 + tB * 38} 458 ${142 + tB * 28} 540 ${214 - tA * 20}`} fill="none" stroke={objectColor} strokeWidth="5" strokeLinecap="round" />
          <path d={`M350 ${224 - tB * 18} C420 ${210 - tA * 72} 474 ${158 - tB * 35} 540 ${118 + tA * 22}`} fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" opacity="0.88" />
          <circle cx={410 + tB * 96} cy={178 - tA * 54} r="9" fill="#fb7185" />
          <text x="358" y="76" fill="rgba(226,232,240,0.62)" fontSize="12" fontWeight="800">H-Q curve</text>
          <text x="116" y="250" fill="rgba(45,212,191,0.82)" fontSize="12" fontWeight="900">impeller</text>
        </g>
      )}
      {tool === 'bernoulli' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">venturi pressure recovery</text>
          <path d={`M76 176 H220 C264 176 260 ${156 + tB * 28} 310 ${156 + tB * 28} C360 ${156 + tB * 28} 356 176 400 176 H552`} fill="none" stroke="rgba(226,232,240,0.18)" strokeWidth="54" strokeLinecap="round" />
          <path d={`M76 176 H220 C264 176 260 ${156 + tB * 28} 310 ${156 + tB * 28} C360 ${156 + tB * 28} 356 176 400 176 H552`} fill="none" stroke={objectColor} strokeWidth={Math.max(14, 34 * values.b)} strokeLinecap="round" opacity="0.75" />
          <path d="M150 176 l24 -15 v30z M306 176 l30 -18 v36z M496 176 l24 -15 v30z" fill="#38bdf8" />
          <path d={`M150 ${90 + tA * 4} v${72 - tA * 1.5} M310 ${90 + tB * 58} v${72 - tB * 42} M494 ${96 + tA * 6} v${66 - tA * 2}`} stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
          <circle cx="150" cy={90 + tA * 4} r="7" fill="#fbbf24" />
          <circle cx="310" cy={90 + tB * 58} r="7" fill="#fbbf24" />
          <circle cx="494" cy={96 + tA * 6} r="7" fill="#fbbf24" />
          <text x="126" y="252" fill="rgba(226,232,240,0.62)" fontSize="12" fontWeight="800">pressure taps</text>
          <text x="278" y="136" fill="rgba(56,189,248,0.82)" fontSize="12" fontWeight="900">throat</text>
        </g>
      )}
      {tool === 'openChannel' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">open channel profile and regime</text>
          <path d={`M86 ${220 - tA * 24} L552 ${186 + tA * 30}`} stroke="rgba(226,232,240,0.42)" strokeWidth="8" strokeLinecap="round" />
          <path d={`M102 ${206 - tB * 86} C176 ${194 - tB * 62} 238 ${220 - tB * 96} 308 ${202 - tB * 76} S456 ${198 - tB * 58} 538 ${176 - tB * 84}`} fill="none" stroke={objectColor} strokeWidth="7" strokeLinecap="round" />
          <path d={`M104 ${206 - tB * 86} C176 ${194 - tB * 62} 238 ${220 - tB * 96} 308 ${202 - tB * 76} S456 ${198 - tB * 58} 538 ${176 - tB * 84} L552 238 L88 238 Z`} fill="rgba(45,212,191,0.12)" />
          <path d="M154 238 V102 M202 238 V128 M250 238 V112 M298 238 V136 M346 238 V118 M394 238 V130 M442 238 V110" stroke="rgba(226,232,240,0.13)" strokeWidth="3" />
          <path d="M474 132 C500 142 512 154 526 178" fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
          <text x="112" y="262" fill="rgba(45,212,191,0.82)" fontSize="12" fontWeight="900">water surface</text>
          <text x="420" y="118" fill="rgba(251,191,36,0.82)" fontSize="12" fontWeight="900">specific energy</text>
        </g>
      )}
      {tool === 'dragWindTunnel' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">wind tunnel wake and drag balance</text>
          <rect x="76" y="112" width="488" height="114" rx="22" fill="rgba(99,102,241,0.08)" stroke="rgba(226,232,240,0.24)" strokeWidth="4" />
          {[132, 190, 248].map((x) => (
            <path key={x} d={`M${x} 146 H292`} stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
          ))}
          <path d={`M314 130 C344 ${116 + tB * 16} 378 ${146 - tB * 18} 374 170 C370 ${206 - tB * 10} 330 216 304 194 C286 178 288 146 314 130 Z`} fill="rgba(226,232,240,0.14)" stroke={accent} strokeWidth="5" />
          <path d={`M374 150 C420 ${122 + tB * 36} 478 ${126 + tA * 18} 542 112 M374 174 C422 ${176 + tB * 34} 478 ${196 + tA * 18} 542 220 M376 162 C442 ${160 + tB * 14} 494 ${156 + tA * 18} 550 166`} fill="none" stroke={objectColor} strokeWidth="5" strokeLinecap="round" opacity="0.72" />
          <path d="M300 170 H228" stroke="#fb7185" strokeWidth="7" strokeLinecap="round" />
          <path d="M228 170 l24 -16 v32z" fill="#fb7185" />
          <text x="118" y="94" fill="rgba(56,189,248,0.82)" fontSize="12" fontWeight="900">air stream</text>
          <text x="406" y="94" fill="rgba(45,212,191,0.82)" fontSize="12" fontWeight="900">wake</text>
          <text x="214" y="204" fill="rgba(251,113,133,0.82)" fontSize="12" fontWeight="900">drag</text>
        </g>
      )}
      {tool === 'beamStress' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">beam SFD/BMD and deflection</text>
          <line x1="92" x2="548" y1="170" y2="170" stroke="rgba(226,232,240,0.72)" strokeWidth="12" strokeLinecap="round" />
          <path d="M110 170 l-30 58 h60z M530 170 l-30 58 h60z" fill="none" stroke="rgba(226,232,240,0.64)" strokeWidth="5" strokeLinejoin="round" />
          <path d={`M${xA} 72 V154`} stroke={objectColor} strokeWidth="8" strokeLinecap="round" />
          <path d={`M${xA - 22} 132 L${xA} 170 L${xA + 22} 132 Z`} fill={objectColor} />
          <path d={`M108 192 C206 ${206 + tB * 26} 412 ${206 + tB * 26} 532 192`} fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
          <path d={`M112 250 L${xA} ${250 - tB * 82} L536 250`} fill="rgba(251,191,36,0.12)" stroke="#fbbf24" strokeWidth="4" strokeLinejoin="round" />
          <text x="126" y="96" fill="rgba(226,232,240,0.62)" fontSize="12" fontWeight="800">point load</text>
          <text x="368" y="236" fill="rgba(251,191,36,0.82)" fontSize="12" fontWeight="900">bending moment</text>
        </g>
      )}
      {tool === 'mohrsCircle' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">stress transform and Mohr circle</text>
          <line x1="88" y1="220" x2="306" y2="220" stroke="rgba(226,232,240,0.26)" strokeWidth="3" />
          <line x1="197" y1="248" x2="197" y2="88" stroke="rgba(226,232,240,0.26)" strokeWidth="3" />
          <circle cx="197" cy="166" r={Math.max(28, Math.min(82, Math.sqrt(Math.pow((values.a - values.b) / 2, 2) + values.c * values.c) * 0.55))} fill="rgba(129,140,248,0.1)" stroke={accent} strokeWidth="5" />
          <circle cx={197 + (values.a - values.b) * 0.12} cy={166 - values.c * 0.35} r="7" fill={objectColor} />
          <circle cx={197 - (values.a - values.b) * 0.12} cy={166 + values.c * 0.35} r="7" fill={objectColor} />
          <rect x="398" y="116" width="92" height="92" rx="12" fill="rgba(226,232,240,0.07)" stroke="rgba(226,232,240,0.42)" strokeWidth="5" transform={`rotate(${values.d} 444 162)`} />
          <path d="M444 80 V112 M444 212 V244 M360 162 H392 M496 162 H532" stroke={objectColor} strokeWidth="6" strokeLinecap="round" />
          <path d="M382 112 l20 -12 M506 212 l-20 12 M382 212 l20 12 M506 112 l-20 -12" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
          <text x="118" y="260" fill="rgba(129,140,248,0.82)" fontSize="12" fontWeight="900">sigma-tau plane</text>
          <text x="392" y="260" fill="rgba(226,232,240,0.62)" fontSize="12" fontWeight="900">rotated element</text>
        </g>
      )}
      {tool === 'materialTesting' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">tensile test and stress-strain curve</text>
          <rect x="112" y="122" width="92" height="92" rx="12" fill="rgba(226,232,240,0.06)" stroke="rgba(226,232,240,0.32)" strokeWidth="4" />
          <path d={`M158 82 V126 M158 210 V252`} stroke="rgba(226,232,240,0.52)" strokeWidth="10" strokeLinecap="round" />
          <path d={`M142 126 C146 ${146 + tB * 24} 146 ${188 - tA * 28} 142 210 H174 C170 ${188 - tA * 28} 170 ${146 + tB * 24} 174 126 Z`} fill="rgba(251,191,36,0.12)" stroke={objectColor} strokeWidth="5" />
          <path d="M138 88 l20 -28 l20 28 M138 246 l20 28 l20 -28" fill="none" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="292" y1="244" x2="540" y2="244" stroke="rgba(226,232,240,0.26)" strokeWidth="3" />
          <line x1="292" y1="244" x2="292" y2="88" stroke="rgba(226,232,240,0.26)" strokeWidth="3" />
          <path d={`M306 232 C346 214 374 ${190 - tB * 54} 404 ${176 - tA * 40} C444 ${156 - tA * 34} 488 ${136 + tB * 18} 526 ${112 + tA * 24}`} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
          <circle cx={404 + tA * 82} cy={176 - tB * 70} r="8" fill="#fb7185" />
          <text x="318" y="264" fill="rgba(251,191,36,0.82)" fontSize="12" fontWeight="900">stress-strain</text>
        </g>
      )}
      {tool === 'torsionShaft' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">torsion shaft twist and shear</text>
          <path d={`M134 160 C196 ${122 - tB * 12} 390 ${122 - tB * 12} 512 160 C390 ${198 + tB * 12} 196 ${198 + tB * 12} 134 160 Z`} fill="rgba(167,139,250,0.14)" stroke={objectColor} strokeWidth="6" />
          {[188, 246, 304, 362, 420].map((x, index) => (
            <path key={x} d={`M${x} ${132 - tB * 9} C${x + 26} 152 ${x - 26} 168 ${x} ${188 + tB * 9}`} stroke="rgba(226,232,240,0.36)" strokeWidth="4" strokeLinecap="round" fill="none" transform={`rotate(${index * 7 + tA * 22} ${x} 160)`} />
          ))}
          <path d="M108 160 C108 114 158 112 166 152 M166 152 l-20 -16 M166 152 l-8 -24" fill="none" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M538 160 C538 206 488 208 480 168 M480 168 l20 16 M480 168 l8 24" fill="none" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="322" cy="160" r={26 + tB * 32} fill="none" stroke="rgba(226,232,240,0.22)" strokeWidth="5" />
          <path d={`M322 160 L${322 + 54 * Math.cos(tA * 4)} ${160 + 54 * Math.sin(tA * 4)}`} stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
          <text x="152" y="246" fill="rgba(251,191,36,0.82)" fontSize="12" fontWeight="900">applied torque</text>
          <text x="386" y="246" fill="rgba(167,139,250,0.82)" fontSize="12" fontWeight="900">angle of twist</text>
        </g>
      )}
      {tool === 'columnBuckling' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">Euler column buckling mode</text>
          <path d="M268 86 H388 M268 238 H388" stroke="rgba(226,232,240,0.46)" strokeWidth="8" strokeLinecap="round" />
          <path d={`M328 92 C${328 + (tB - 0.5) * 120} 132 ${328 - tA * 70} 190 328 232`} fill="none" stroke={objectColor} strokeWidth="10" strokeLinecap="round" />
          <path d="M328 56 V86 M328 238 V272" stroke="#fb7185" strokeWidth="7" strokeLinecap="round" />
          <path d="M306 70 L328 94 L350 70 M306 258 L328 234 L350 258" fill="none" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="92" y1="244" x2="210" y2="244" stroke="rgba(226,232,240,0.24)" strokeWidth="3" />
          <line x1="92" y1="244" x2="92" y2="96" stroke="rgba(226,232,240,0.24)" strokeWidth="3" />
          <path d={`M104 226 C132 ${210 - tB * 50} 160 ${170 - tA * 50} 204 ${112 + tB * 20}`} fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
          <text x="106" y="82" fill="rgba(251,191,36,0.82)" fontSize="12" fontWeight="900">Pcr curve</text>
          <text x="414" y="162" fill="rgba(226,232,240,0.62)" fontSize="12" fontWeight="900">end condition K</text>
        </g>
      )}
      {tool === 'pressureVessel' && (
        <g>
          <text x="72" y="64" fill="rgba(226,232,240,0.68)" fontSize="13" fontWeight="800">thin pressure vessel stress state</text>
          <ellipse cx="320" cy="160" rx={132 + tB * 54} ry={54 + tA * 18} fill="rgba(251,113,133,0.12)" stroke={objectColor} strokeWidth="6" />
          <ellipse cx={190 - tB * 18} cy="160" rx="28" ry={54 + tA * 18} fill="rgba(226,232,240,0.06)" stroke="rgba(226,232,240,0.34)" strokeWidth="4" />
          <ellipse cx={450 + tB * 18} cy="160" rx="28" ry={54 + tA * 18} fill="rgba(226,232,240,0.06)" stroke="rgba(226,232,240,0.34)" strokeWidth="4" />
          {[240, 288, 336, 384].map((x) => (
            <path key={x} d={`M${x} ${106 - tA * 8} V${214 + tA * 8}`} stroke="rgba(226,232,240,0.20)" strokeWidth="4" strokeLinecap="round" />
          ))}
          <path d="M320 92 V56 M320 228 V264 M148 160 H104 M492 160 H536" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
          <path d="M320 56 l-18 24 h36z M320 264 l-18 -24 h36z M104 160 l24 -18 v36z M536 160 l-24 -18 v36z" fill="#fbbf24" opacity="0.9" />
          <path d="M248 110 C292 82 348 82 392 110 M248 210 C292 238 348 238 392 210" stroke="#38bdf8" strokeWidth="5" fill="none" strokeLinecap="round" />
          <text x="118" y="258" fill="rgba(251,191,36,0.82)" fontSize="12" fontWeight="900">internal pressure</text>
          <text x="386" y="258" fill="rgba(56,189,248,0.82)" fontSize="12" fontWeight="900">hoop stress</text>
        </g>
      )}
      {['vibration', 'metrology'].includes(tool) && (
        <g>
          <line x1="96" x2={xA} y1="224" y2="224" stroke="rgba(226,232,240,0.72)" strokeWidth="12" strokeLinecap="round" />
          <path d={`M${(96 + xA) / 2} 92 V210`} stroke={objectColor} strokeWidth="7" strokeLinecap="round" />
          <path d={`M${(96 + xA) / 2 - 18} 184 L${(96 + xA) / 2} 218 L${(96 + xA) / 2 + 18} 184 Z`} fill={objectColor} />
          {tool === 'vibration' && <path d="M120 124 C160 84 200 164 240 124 S320 84 360 124 S440 164 480 124" fill="none" stroke={accent} strokeWidth="5" />}
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

type CadSketchTool = 'select' | 'line' | 'rectangle' | 'circle' | 'slot' | 'rib' | 'hole';
type CadRenderMode = 'wireframe' | 'shaded' | 'realistic' | 'section';
type CadViewMode = 'iso' | 'top' | 'front' | 'right';
type CadConstraintKind = 'locked' | 'equal' | 'horizontal' | 'vertical' | 'centered';
type CadResizeHandle = 'e' | 's' | 'se' | 'radius' | 'line-end';
type CadShape = {
  id: string;
  type: Exclude<CadSketchTool, 'select'>;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  depth: number;
  label: string;
  material: string;
  operation: 'add' | 'cut';
  constraints?: CadConstraintKind[];
};

const cadToolLabels: Record<CadSketchTool, string> = {
  select: 'Select',
  line: 'Line',
  rectangle: 'Rectangle',
  circle: 'Circle',
  slot: 'Slot',
  rib: 'Rib',
  hole: 'Hole',
};

const defaultCadShapes: CadShape[] = [
  { id: 'base', type: 'rectangle', x: 160, y: 118, w: 220, h: 112, radius: 0, depth: 28, label: 'Base plate', material: 'aluminium', operation: 'add', constraints: ['centered'] },
  { id: 'boss', type: 'circle', x: 270, y: 174, w: 72, h: 72, radius: 36, depth: 48, label: 'Center boss', material: 'steel', operation: 'add', constraints: ['equal'] },
  { id: 'mount-a', type: 'slot', x: 186, y: 142, w: 56, h: 26, radius: 13, depth: 32, label: 'Mount slot A', material: 'rubber', operation: 'cut', constraints: ['horizontal'] },
  { id: 'mount-b', type: 'slot', x: 300, y: 142, w: 56, h: 26, radius: 13, depth: 32, label: 'Mount slot B', material: 'rubber', operation: 'cut', constraints: ['horizontal'] },
];

const cadMaterials: Record<string, { name: string; density: number; color: string; dark: string; light: string; finish: string; pattern: string }> = {
  aluminium: { name: 'Aluminium 6061', density: 2.7, color: '#aeb8c4', dark: '#64748b', light: '#f8fafc', finish: 'brushed', pattern: 'linear-gradient(135deg,#f8fafc,#94a3b8,#e2e8f0)' },
  steel: { name: 'Polished Steel', density: 7.85, color: '#8f9aa8', dark: '#475569', light: '#f1f5f9', finish: 'polished', pattern: 'linear-gradient(135deg,#ffffff,#64748b,#cbd5e1)' },
  brass: { name: 'Brass', density: 8.5, color: '#c89b3c', dark: '#92400e', light: '#fde68a', finish: 'satin', pattern: 'linear-gradient(135deg,#fde68a,#b7791f,#facc15)' },
  copper: { name: 'Copper', density: 8.96, color: '#c56a3c', dark: '#9a3412', light: '#fed7aa', finish: 'warm metal', pattern: 'linear-gradient(135deg,#fed7aa,#c2410c,#fb923c)' },
  plastic: { name: 'ABS Plastic', density: 1.04, color: '#2563eb', dark: '#1e3a8a', light: '#93c5fd', finish: 'matte', pattern: 'linear-gradient(135deg,#93c5fd,#2563eb,#1e40af)' },
  rubber: { name: 'Rubber / Cut', density: 1.12, color: '#111827', dark: '#030712', light: '#6b7280', finish: 'matte', pattern: 'linear-gradient(135deg,#111827,#4b5563)' },
  glass: { name: 'Glass', density: 2.5, color: '#67e8f9', dark: '#0891b2', light: '#ecfeff', finish: 'transparent', pattern: 'linear-gradient(135deg,rgba(236,254,255,.9),rgba(103,232,249,.45))' },
};

function CadModelingStudio({ isFullScreen, onExitFullScreen, onRequestFullScreen }: Pick<MechanicalEngineeringStudioProps, 'isFullScreen' | 'onExitFullScreen' | 'onRequestFullScreen'>) {
  const [shapes, setShapes] = useState<CadShape[]>(defaultCadShapes);
  const [selectedId, setSelectedId] = useState(defaultCadShapes[0].id);
  const [activeTool, setActiveTool] = useState<CadSketchTool>('select');
  const [selectedMaterial, setSelectedMaterial] = useState('aluminium');
  const [renderMode, setRenderMode] = useState<CadRenderMode>('realistic');
  const [viewMode, setViewMode] = useState<CadViewMode>('iso');
  const [snap, setSnap] = useState(5);
  const [history, setHistory] = useState<CadShape[][]>([]);
  const [future, setFuture] = useState<CadShape[][]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{ mode: 'move' | 'resize' | 'draw'; id: string; dx: number; dy: number; handle?: CadResizeHandle } | null>(null);
  const selected = shapes.find((shape) => shape.id === selectedId) || shapes[0];
  const solidVolume = shapes.reduce((sum, shape) => sum + (shape.operation === 'cut' ? -1 : 1) * cadArea(shape) * shape.depth, 0);
  const mass = shapes.reduce((sum, shape) => {
    if (shape.operation === 'cut') return sum;
    return sum + cadArea(shape) * shape.depth / 1000 * cadMaterials[shape.material].density;
  }, 0);
  const maxDepth = Math.max(...shapes.map((shape) => shape.depth), 1);
  const constructionCount = shapes.filter((shape) => shape.type === 'line').length;
  const constraintCount = shapes.reduce((sum, shape) => sum + (shape.constraints?.length || 0), 0);
  const underDefined = shapes.filter((shape) => !shape.constraints?.length || shape.w <= 0 || shape.h <= 0 || shape.depth <= 0).length;
  const sketchScore = Math.max(35, Math.min(98, 58 + constraintCount * 6 + shapes.length * 2 - underDefined * 8));
  const modelFeatures = useMemo(() => shapes.filter((shape) => shape.type !== 'line'), [shapes]);

  const pushHistory = (snapshot = shapes) => {
    setHistory((prev) => [...prev.slice(-24), snapshot.map((shape) => ({ ...shape, constraints: [...(shape.constraints || [])] }))]);
    setFuture([]);
  };

  const updateShape = (id: string, patch: Partial<CadShape>, record = true) => {
    if (record) pushHistory();
    setShapes((prev) => prev.map((shape) => {
      if (shape.id !== id) return shape;
      const next = { ...shape, ...patch };
      return applyCadConstraints(next);
    }));
  };

  const undo = () => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const previous = prev[prev.length - 1];
      setFuture((items) => [shapes, ...items.slice(0, 24)]);
      setShapes(previous);
      setSelectedId(previous[0]?.id || '');
      return prev.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((prev) => {
      if (!prev.length) return prev;
      const next = prev[0];
      setHistory((items) => [...items.slice(-24), shapes]);
      setShapes(next);
      setSelectedId(next[0]?.id || '');
      return prev.slice(1);
    });
  };

  const makeShape = (type: Exclude<CadSketchTool, 'select'>, x: number, y: number): CadShape => {
    const nextId = `${type}-${Date.now().toString(36).slice(-5)}`;
    const base: Record<Exclude<CadSketchTool, 'select'>, Pick<CadShape, 'w' | 'h' | 'radius' | 'label' | 'operation' | 'constraints'>> = {
      line: { w: 92, h: 0, radius: 0, label: 'Construction line', operation: 'add', constraints: ['horizontal'] },
      rectangle: { w: 108, h: 64, radius: 0, label: 'New pad', operation: 'add' },
      circle: { w: 74, h: 74, radius: 37, label: 'New boss', operation: 'add' },
      slot: { w: 118, h: 34, radius: 17, label: 'New slot', operation: 'cut' },
      rib: { w: 142, h: 28, radius: 0, label: 'New rib', operation: 'add' },
      hole: { w: 44, h: 44, radius: 22, label: 'New hole', operation: 'cut' },
    }[type];
    return { id: nextId, type, x, y, depth: type === 'hole' ? 36 : type === 'line' ? 0 : 24, material: type === 'hole' || type === 'slot' ? 'rubber' : selectedMaterial, ...base };
  };

  const addShape = (type: Exclude<CadSketchTool, 'select'>, origin?: { x: number; y: number }) => {
    const x = origin ? snapPoint(origin, snap).x : 210 + shapes.length * 8;
    const y = origin ? snapPoint(origin, snap).y : 140 + shapes.length * 6;
    const shape = makeShape(type, x, y);
    pushHistory();
    setShapes((prev) => [...prev, shape]);
    setSelectedId(shape.id);
    return shape;
  };

  const pointerDown = (event: React.PointerEvent<SVGElement>, shape: CadShape) => {
    event.stopPropagation();
    if (shape.constraints?.includes('locked')) {
      setSelectedId(shape.id);
      return;
    }
    pushHistory();
    setSelectedId(shape.id);
    const point = svgPointer(event, svgRef.current);
    setDrag({ mode: 'move', id: shape.id, dx: point.x - shape.x, dy: point.y - shape.y });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleDown = (event: React.PointerEvent<SVGElement>, shape: CadShape, handle: CadResizeHandle) => {
    event.stopPropagation();
    if (shape.constraints?.includes('locked')) return;
    pushHistory();
    setSelectedId(shape.id);
    const point = svgPointer(event, svgRef.current);
    setDrag({ mode: 'resize', id: shape.id, dx: point.x, dy: point.y, handle });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const sketchPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool === 'select') {
      setSelectedId(selectedId);
      return;
    }
    const point = snapPoint(svgPointer(event, svgRef.current), snap);
    const shape = addShape(activeTool, point);
    if (activeTool === 'line') {
      setDrag({ mode: 'draw', id: shape.id, dx: point.x, dy: point.y, handle: 'line-end' });
      svgRef.current?.setPointerCapture(event.pointerId);
    }
  };

  const pointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const point = svgPointer(event, svgRef.current);
    const target = shapes.find((shape) => shape.id === drag.id);
    if (!target) return;
    const snapped = snapPoint(point, snap);
    if (drag.mode === 'move') {
      const x = Math.round((point.x - drag.dx) / snap) * snap;
      const y = Math.round((point.y - drag.dy) / snap) * snap;
      updateShape(drag.id, { x: clamp(x, 28, 532), y: clamp(y, 28, 312) }, false);
      return;
    }
    if (drag.mode === 'draw' || drag.handle === 'line-end') {
      const w = snapped.x - target.x;
      const h = snapped.y - target.y;
      updateShape(drag.id, { w: clamp(w, -440, 440), h: clamp(h, -260, 260) }, false);
      return;
    }
    if (drag.handle === 'radius') {
      const radius = clamp(Math.hypot(snapped.x - target.x, snapped.y - target.y), 6, 160);
      updateShape(drag.id, { radius, w: radius * 2, h: radius * 2 }, false);
      return;
    }
    const width = drag.handle === 's' ? target.w : clamp(Math.abs(snapped.x - target.x) * 2, 8, 420);
    const height = drag.handle === 'e' ? target.h : clamp(Math.abs(snapped.y - target.y) * 2, 8, 260);
    updateShape(drag.id, {
      w: width,
      h: height,
      radius: target.type === 'circle' || target.type === 'hole' ? Math.min(width, height) / 2 : target.type === 'slot' ? height / 2 : target.radius,
    }, false);
  };

  const stopDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    setDrag(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
  };

  const toggleConstraint = (constraint: CadConstraintKind) => {
    if (!selected) return;
    pushHistory();
    setShapes((prev) => prev.map((shape) => {
      if (shape.id !== selected.id) return shape;
      const current = new Set(shape.constraints || []);
      if (current.has(constraint)) current.delete(constraint);
      else current.add(constraint);
      let next: CadShape = { ...shape, constraints: Array.from(current) };
      if (constraint === 'centered' && current.has('centered')) next = { ...next, x: 280, y: 170 };
      return applyCadConstraints(next);
    }));
  };

  const exportSketch = shapes.map((shape) => `${shape.label}: ${shape.type} x=${fmt(shape.x, 0)} y=${fmt(shape.y, 0)} w=${fmt(shape.w, 0)} h=${fmt(shape.h, 0)} depth=${fmt(shape.depth, 0)} constraints=${(shape.constraints || []).join(',') || 'none'}`).join('\n');

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F4F7FB] text-slate-900">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-600 shadow-sm">
              <Cube size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">AcadMix CAD / 3D Modeling Studio</h2>
              <p className="text-xs font-semibold text-slate-500 sm:text-sm">Lightweight premium CAD: sketch, constrain by dimensions, assign realistic materials, and preview extruded parts.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CadTopPill label="Native CAD" value="Sketch + Extrude" />
            <CadTopPill label="Sketch" value={`${sketchScore}% defined`} tone={underDefined ? 'warn' : 'good'} />
            {(onExitFullScreen || onRequestFullScreen) && (
              <button
                type="button"
                onClick={() => (isFullScreen ? onExitFullScreen?.() : onRequestFullScreen?.())}
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                {isFullScreen ? <CornersIn size={16} weight="bold" /> : <CornersOut size={16} weight="bold" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full min-h-[760px] grid-cols-1 xl:grid-cols-[280px_1fr_340px]">
          <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-4 xl:border-b-0 xl:border-r">
            <div className="space-y-5">
              <div>
                <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Create</div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(cadToolLabels) as CadSketchTool[]).map((toolKey) => (
                    <button
                      key={toolKey}
                      type="button"
                      onClick={() => setActiveTool(toolKey)}
                      className={`rounded-xl border px-3 py-3 text-left text-xs font-black shadow-sm transition-colors ${activeTool === toolKey ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'}`}
                    >
                      {cadToolLabels[toolKey]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Feature Tree</div>
                <div className="space-y-2">
                  {shapes.map((shape, index) => (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => setSelectedId(shape.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left shadow-sm transition-colors ${shape.id === selectedId ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-slate-950">{shape.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${shape.operation === 'cut' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{shape.operation}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>F{index + 1} / {shape.type}</span>
                        <span>{shape.type === 'line' ? 'Construction' : cadMaterials[shape.material].name}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(shape.constraints || []).map((constraint) => (
                          <span key={constraint} className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase text-slate-500 ring-1 ring-slate-200">{constraint}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (shapes.length <= 1 || !selected) return;
                  setShapes((prev) => prev.filter((shape) => shape.id !== selected.id));
                  setSelectedId(shapes[0].id === selected.id ? shapes[1].id : shapes[0].id);
                }}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition-colors hover:bg-rose-100"
              >
                Delete selected
              </button>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden bg-[#F4F7FB]">
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
              <CadSegmented
                label="Render"
                value={renderMode}
                options={['wireframe', 'shaded', 'realistic', 'section']}
                onChange={(value) => setRenderMode(value as CadRenderMode)}
              />
              <CadSegmented
                label="View"
                value={viewMode}
                options={['iso', 'top', 'front', 'right']}
                onChange={(value) => setViewMode(value as CadViewMode)}
              />
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
                Snap
                <input type="number" min={1} max={25} value={snap} onChange={(event) => setSnap(clamp(Number(event.target.value), 1, 25))} className="w-12 bg-transparent text-sky-700 outline-none" />
                mm
              </label>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button type="button" onClick={undo} disabled={!history.length} className="rounded-lg px-3 py-1.5 text-xs font-black text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">Undo</button>
                <button type="button" onClick={redo} disabled={!future.length} className="rounded-lg px-3 py-1.5 text-xs font-black text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">Redo</button>
              </div>
              <div className="ml-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-bold text-slate-500">Command: {activeTool === 'select' ? 'SELECT' : cadToolLabels[activeTool].toUpperCase()}</div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 2xl:grid-cols-[1.05fr_0.95fr]">
              <section className="min-h-0 border-b border-slate-200 p-4 2xl:border-b-0 2xl:border-r">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-950">2D Sketch Plane</div>
                    <div className="text-xs text-slate-500">Click the plane to place tools. Drag features and resize grips with snap.</div>
                  </div>
                  <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">XY Plane</div>
                </div>
                <svg ref={svgRef} viewBox="0 0 560 340" onPointerDown={sketchPointerDown} onPointerMove={pointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} className="h-[500px] w-full touch-none rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <defs>
                    <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="560" height="340" fill="url(#cad-grid)" />
                  <line x1="24" x2="536" y1="300" y2="300" stroke="rgba(37,99,235,0.32)" />
                  <line x1="40" x2="40" y1="24" y2="316" stroke="rgba(37,99,235,0.32)" />
                  {shapes.map((shape) => (
                    <CadSketchShape key={shape.id} shape={shape} selected={shape.id === selectedId} onPointerDown={pointerDown} onHandlePointerDown={handleDown} />
                  ))}
                </svg>
              </section>

              <section className="min-h-0 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-950">3D Feature Preview</div>
                    <div className="text-xs text-slate-500">Extruded manufacturing model from sketch profiles</div>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">Live Solid</div>
                </div>
                <svg viewBox="0 0 560 340" className="h-[500px] w-full rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_35%_20%,rgba(14,165,233,0.18),transparent_32%),linear-gradient(180deg,#ffffff,#eef4fb)] shadow-sm">
                  <defs>
                    <filter id="cad-shadow" x="-20%" y="-20%" width="140%" height="160%">
                      <feDropShadow dx="8" dy="12" stdDeviation="8" floodColor="#64748b" floodOpacity="0.22" />
                    </filter>
                  </defs>
                  <line x1="64" x2="504" y1="286" y2="286" stroke="rgba(100,116,139,0.28)" />
                  {modelFeatures.map((shape, index) => (
                    <CadSolidShape key={shape.id} shape={shape} selected={shape.id === selectedId} z={index * 6} maxDepth={maxDepth} renderMode={renderMode} viewMode={viewMode} />
                  ))}
                  <CadViewCube viewMode={viewMode} />
                </svg>
              </section>
            </div>
          </main>

          <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-4 xl:border-l xl:border-t-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <CadMetric label="Features" value={String(shapes.length)} />
                <CadMetric label="Sketch lines" value={String(constructionCount)} />
                <CadMetric label="Mass" value={fmt(mass / 1000, 2)} unit="kg" tone="good" />
                <CadMetric label="Volume" value={fmt(Math.max(solidVolume, 0) / 1000, 1)} unit="cm3" />
                <CadMetric label="Constraints" value={String(constraintCount)} />
              </div>

              <Panel className="border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Material Library</div>
                  <div className="mt-1 text-sm font-bold text-slate-600">Assign realistic finishes to selected features.</div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4">
                  {Object.entries(cadMaterials).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedMaterial(key);
                        if (selected) updateShape(selected.id, { material: key, operation: key === 'rubber' ? 'cut' : selected.operation });
                      }}
                      className={`rounded-xl border p-2 text-left shadow-sm transition-colors ${selected?.material === key ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
                    >
                      <div className="h-9 rounded-lg border border-white/70 shadow-inner" style={{ background: item.pattern }} />
                      <div className="mt-2 truncate text-xs font-black text-slate-800">{item.name}</div>
                      <div className="text-[10px] font-bold uppercase text-slate-500">{item.finish}</div>
                    </button>
                  ))}
                </div>
              </Panel>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Validation</div>
                  <div className="space-y-2 text-sm font-bold">
                    <div className="flex justify-between"><span className="text-slate-500">Sketch state</span><span className={underDefined ? 'text-amber-600' : 'text-emerald-600'}>{underDefined ? 'Needs dimensions' : 'Dimensioned'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Definition score</span><span className="text-sky-700">{sketchScore}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Manufacturing</span><span className="text-emerald-600">{modelFeatures.length ? 'Printable' : 'Sketch only'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Render</span><span className="capitalize text-sky-700">{renderMode}</span></div>
                </div>
              </div>

              {selected && (
                <Panel className="border-slate-200 bg-white">
                  <div className="border-b border-slate-200 p-4">
                    <div className="text-base font-black text-slate-950">Inspector</div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Parametric dimensions for the selected feature.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-4">
                    <CadNumber label="X" value={selected.x} unit="mm" onChange={(value) => updateShape(selected.id, { x: value })} />
                    <CadNumber label="Y" value={selected.y} unit="mm" onChange={(value) => updateShape(selected.id, { y: value })} />
                    <CadNumber label="Width" value={selected.w} unit="mm" onChange={(value) => updateShape(selected.id, { w: Math.max(8, value), radius: selected.type === 'circle' ? Math.max(4, value / 2) : selected.radius })} />
                    <CadNumber label="Height" value={selected.h} unit="mm" onChange={(value) => updateShape(selected.id, { h: Math.max(8, value) })} />
                    <CadNumber label="Radius" value={selected.radius} unit="mm" onChange={(value) => updateShape(selected.id, { radius: Math.max(0, value) })} />
                    <CadNumber label="Extrude" value={selected.depth} unit="mm" onChange={(value) => updateShape(selected.id, { depth: Math.max(1, value) })} />
                  </div>
                  <div className="border-t border-slate-200 p-4">
                    <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Constraints</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['locked', 'equal', 'horizontal', 'vertical', 'centered'] as const).map((constraint) => (
                        <button
                          key={constraint}
                          type="button"
                          onClick={() => toggleConstraint(constraint)}
                          className={`rounded-xl border px-3 py-2 text-xs font-black capitalize ${selected.constraints?.includes(constraint) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'}`}
                        >
                          {constraint}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-slate-200 p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {(['add', 'cut'] as const).map((op) => (
                        <button key={op} type="button" onClick={() => updateShape(selected.id, { operation: op })} className={`rounded-xl border px-3 py-2 text-xs font-black uppercase ${selected.operation === op ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{op}</button>
                      ))}
                    </div>
                  </div>
                </Panel>
              )}

              <Panel className="border-slate-200 bg-white p-4">
                <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Model Definition</div>
                <textarea readOnly value={exportSketch} className="h-36 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-600 outline-none" />
              </Panel>

            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CadTopPill({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className={`text-xs font-black ${tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-700'}`}>{value}</div>
    </div>
  );
}

function CadSegmented({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
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

function CadMetric({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: 'good' | 'warn' }) {
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

function cadArea(shape: CadShape) {
  if (shape.type === 'line') return 0;
  if (shape.type === 'circle' || shape.type === 'hole') return Math.PI * Math.pow(shape.radius || shape.w / 2, 2);
  if (shape.type === 'slot') return Math.max(shape.w - shape.h, 0) * shape.h + Math.PI * Math.pow(shape.h / 2, 2);
  if (shape.type === 'rib') return shape.w * shape.h * 0.72;
  return shape.w * shape.h;
}

function snapPoint(point: { x: number; y: number }, snap: number) {
  const step = Math.max(1, snap || 1);
  return {
    x: Math.round(point.x / step) * step,
    y: Math.round(point.y / step) * step,
  };
}

function applyCadConstraints(shape: CadShape): CadShape {
  const constraints = shape.constraints || [];
  let next = { ...shape };
  if (constraints.includes('equal')) {
    const size = Math.max(8, Math.max(Math.abs(next.w), Math.abs(next.h)));
    next = { ...next, w: size, h: size, radius: next.type === 'circle' || next.type === 'hole' ? size / 2 : next.radius };
  }
  if (constraints.includes('horizontal') && next.type === 'line') next = { ...next, h: 0 };
  if (constraints.includes('vertical') && next.type === 'line') next = { ...next, w: 0 };
  if (constraints.includes('centered')) next = { ...next, x: 280, y: 170 };
  return next;
}

function cadBounds(shape: CadShape) {
  if (shape.type === 'line') {
    return {
      left: Math.min(shape.x, shape.x + shape.w),
      right: Math.max(shape.x, shape.x + shape.w),
      top: Math.min(shape.y, shape.y + shape.h),
      bottom: Math.max(shape.y, shape.y + shape.h),
    };
  }
  return {
    left: shape.x - Math.abs(shape.w) / 2,
    right: shape.x + Math.abs(shape.w) / 2,
    top: shape.y - Math.abs(shape.h) / 2,
    bottom: shape.y + Math.abs(shape.h) / 2,
  };
}

function lineLength(shape: CadShape) {
  return Math.hypot(shape.w, shape.h);
}

function CadNumber({ label, value, unit, onChange }: { label: string; value: number; unit: string; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" value={Number(value.toFixed(2))} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-lg font-black text-slate-950 outline-none" />
        <span className="text-[10px] font-black uppercase text-slate-400">{unit}</span>
      </div>
    </label>
  );
}

function CadSketchShape({
  shape,
  selected,
  onPointerDown,
  onHandlePointerDown,
}: {
  shape: CadShape;
  selected: boolean;
  onPointerDown: (event: React.PointerEvent<SVGElement>, shape: CadShape) => void;
  onHandlePointerDown: (event: React.PointerEvent<SVGElement>, shape: CadShape, handle: CadResizeHandle) => void;
}) {
  const material = cadMaterials[shape.material];
  const stroke = selected ? '#2563eb' : shape.operation === 'cut' ? '#f43f5e' : material.dark;
  const fill = selected ? 'rgba(37,99,235,0.12)' : shape.operation === 'cut' ? 'rgba(244,63,94,0.08)' : `${material.color}22`;
  const locked = shape.constraints?.includes('locked');
  if (shape.type === 'line') {
    return (
      <g>
        <g onPointerDown={(event) => onPointerDown(event, shape)} className={locked ? 'cursor-not-allowed' : 'cursor-move'}>
          <line x1={shape.x} y1={shape.y} x2={shape.x + shape.w} y2={shape.y + shape.h} stroke={selected ? '#2563eb' : '#64748b'} strokeWidth={selected ? 3 : 2} strokeLinecap="round" />
          <CadShapeLabel shape={shape} />
        </g>
        {selected && <CadShapeHandles shape={shape} onHandlePointerDown={onHandlePointerDown} />}
      </g>
    );
  }
  if (shape.type === 'circle' || shape.type === 'hole') {
    return (
      <g>
        <g onPointerDown={(event) => onPointerDown(event, shape)} className={locked ? 'cursor-not-allowed' : 'cursor-move'}>
          <circle cx={shape.x} cy={shape.y} r={shape.radius} fill={fill} stroke={stroke} strokeDasharray={shape.operation === 'cut' ? '6 4' : undefined} strokeWidth={selected ? 3 : 2} />
          <CadShapeLabel shape={shape} />
        </g>
        {selected && <CadShapeHandles shape={shape} onHandlePointerDown={onHandlePointerDown} />}
      </g>
    );
  }
  if (shape.type === 'slot') {
    return (
      <g>
        <g onPointerDown={(event) => onPointerDown(event, shape)} className={locked ? 'cursor-not-allowed' : 'cursor-move'}>
          <rect x={shape.x - shape.w / 2} y={shape.y - shape.h / 2} width={shape.w} height={shape.h} rx={shape.h / 2} fill={fill} stroke={stroke} strokeDasharray={shape.operation === 'cut' ? '6 4' : undefined} strokeWidth={selected ? 3 : 2} />
          <CadShapeLabel shape={shape} />
        </g>
        {selected && <CadShapeHandles shape={shape} onHandlePointerDown={onHandlePointerDown} />}
      </g>
    );
  }
  if (shape.type === 'rib') {
    const points = `${shape.x - shape.w / 2},${shape.y + shape.h / 2} ${shape.x},${shape.y - shape.h / 2} ${shape.x + shape.w / 2},${shape.y + shape.h / 2}`;
    return (
      <g>
        <g onPointerDown={(event) => onPointerDown(event, shape)} className={locked ? 'cursor-not-allowed' : 'cursor-move'}>
          <polygon points={points} fill={fill} stroke={stroke} strokeWidth={selected ? 3 : 2} />
          <CadShapeLabel shape={shape} />
        </g>
        {selected && <CadShapeHandles shape={shape} onHandlePointerDown={onHandlePointerDown} />}
      </g>
    );
  }
  return (
    <g>
      <g onPointerDown={(event) => onPointerDown(event, shape)} className={locked ? 'cursor-not-allowed' : 'cursor-move'}>
        <rect x={shape.x - shape.w / 2} y={shape.y - shape.h / 2} width={shape.w} height={shape.h} rx="4" fill={fill} stroke={stroke} strokeWidth={selected ? 3 : 2} />
        <CadShapeLabel shape={shape} />
      </g>
      {selected && <CadShapeHandles shape={shape} onHandlePointerDown={onHandlePointerDown} />}
    </g>
  );
}

function CadShapeLabel({ shape }: { shape: CadShape }) {
  const bounds = cadBounds(shape);
  const isLine = shape.type === 'line';
  const length = isLine ? lineLength(shape) : shape.w;
  return (
    <g className="pointer-events-none">
      <text x={shape.x} y={bounds.bottom + 18} textAnchor="middle" fill="#475569" fontSize="10" fontWeight="800">{shape.label}</text>
      {isLine ? (
        <text x={(shape.x + shape.x + shape.w) / 2} y={(shape.y + shape.y + shape.h) / 2 - 10} textAnchor="middle" fill="#2563eb" fontSize="10" fontWeight="900">{fmt(length, 0)} mm</text>
      ) : (
        <>
          <text x={shape.x} y={bounds.top - 8} textAnchor="middle" fill="#2563eb" fontSize="10" fontWeight="900">{fmt(shape.w, 0)} x {fmt(shape.h, 0)}</text>
          <CadDimensionLines shape={shape} />
        </>
      )}
    </g>
  );
}

function CadDimensionLines({ shape }: { shape: CadShape }) {
  const bounds = cadBounds(shape);
  const y = bounds.bottom + 30;
  const x = bounds.right + 22;
  return (
    <g opacity="0.86">
      <line x1={bounds.left} y1={y} x2={bounds.right} y2={y} stroke="#2563eb" strokeWidth="1.4" />
      <path d={`M${bounds.left} ${y - 4} L${bounds.left} ${y + 4} M${bounds.right} ${y - 4} L${bounds.right} ${y + 4}`} stroke="#2563eb" strokeWidth="1.4" />
      <text x={shape.x} y={y - 5} textAnchor="middle" fill="#2563eb" fontSize="9" fontWeight="900">{fmt(shape.w, 0)} mm</text>
      <line x1={x} y1={bounds.top} x2={x} y2={bounds.bottom} stroke="#0f766e" strokeWidth="1.4" />
      <path d={`M${x - 4} ${bounds.top} L${x + 4} ${bounds.top} M${x - 4} ${bounds.bottom} L${x + 4} ${bounds.bottom}`} stroke="#0f766e" strokeWidth="1.4" />
      <text x={x + 10} y={shape.y + 4} fill="#0f766e" fontSize="9" fontWeight="900">{fmt(shape.h, 0)} mm</text>
    </g>
  );
}

function CadShapeHandles({ shape, onHandlePointerDown }: { shape: CadShape; onHandlePointerDown: (event: React.PointerEvent<SVGElement>, shape: CadShape, handle: CadResizeHandle) => void }) {
  const bounds = cadBounds(shape);
  if (shape.constraints?.includes('locked')) return null;
  if (shape.type === 'line') {
    return (
      <g>
        <circle cx={shape.x} cy={shape.y} r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
        <circle cx={shape.x + shape.w} cy={shape.y + shape.h} r="6" fill="#2563eb" stroke="#ffffff" strokeWidth="2" className="cursor-crosshair" onPointerDown={(event) => onHandlePointerDown(event, shape, 'line-end')} />
      </g>
    );
  }
  if (shape.type === 'circle' || shape.type === 'hole') {
    return <circle cx={shape.x + shape.radius} cy={shape.y} r="6" fill="#ffffff" stroke="#2563eb" strokeWidth="2" className="cursor-ew-resize" onPointerDown={(event) => onHandlePointerDown(event, shape, 'radius')} />;
  }
  return (
    <g>
      <rect x={bounds.right - 5} y={shape.y - 5} width="10" height="10" rx="3" fill="#ffffff" stroke="#2563eb" strokeWidth="2" className="cursor-ew-resize" onPointerDown={(event) => onHandlePointerDown(event, shape, 'e')} />
      <rect x={shape.x - 5} y={bounds.bottom - 5} width="10" height="10" rx="3" fill="#ffffff" stroke="#2563eb" strokeWidth="2" className="cursor-ns-resize" onPointerDown={(event) => onHandlePointerDown(event, shape, 's')} />
      <rect x={bounds.right - 5} y={bounds.bottom - 5} width="10" height="10" rx="3" fill="#2563eb" stroke="#ffffff" strokeWidth="2" className="cursor-nwse-resize" onPointerDown={(event) => onHandlePointerDown(event, shape, 'se')} />
    </g>
  );
}

function CadSolidShape({ shape, selected, z, maxDepth, renderMode, viewMode }: { shape: CadShape; selected: boolean; z: number; maxDepth: number; renderMode: CadRenderMode; viewMode: CadViewMode }) {
  const depth = viewMode === 'top' ? 0 : 16 + (shape.depth / maxDepth) * 46;
  const x = 150 + (shape.x - 250) * (viewMode === 'right' ? 0.22 : 0.54) + z;
  const y = viewMode === 'front' ? 212 - shape.depth * 0.55 : 210 + (shape.y - 170) * (viewMode === 'top' ? 0.72 : 0.34) - z;
  const w = Math.max(18, shape.w * 0.58);
  const h = Math.max(12, shape.h * 0.48);
  const material = cadMaterials[shape.material];
  const color = selected ? '#2563eb' : shape.operation === 'cut' ? '#f43f5e' : material.dark;
  const face = renderMode === 'wireframe' ? 'transparent' : shape.operation === 'cut' ? 'rgba(244,63,94,0.08)' : material.color;
  const opacity = renderMode === 'realistic' ? 0.94 : renderMode === 'section' ? 0.64 : 0.78;
  if (shape.type === 'circle' || shape.type === 'hole') {
    return (
      <g filter={renderMode === 'realistic' && shape.operation === 'add' ? 'url(#cad-shadow)' : undefined} opacity={shape.operation === 'cut' ? 0.72 : 1}>
        <ellipse cx={x + depth} cy={y - depth * 0.5} rx={w / 2} ry={h / 2} fill={renderMode === 'wireframe' ? 'transparent' : material.light} stroke={color} strokeWidth="2" opacity={opacity} strokeDasharray={shape.operation === 'cut' ? '6 4' : undefined} />
        <path d={`M${x - w / 2} ${y} L${x + depth - w / 2} ${y - depth * 0.5} M${x + w / 2} ${y} L${x + depth + w / 2} ${y - depth * 0.5}`} stroke={color} strokeWidth="2" opacity="0.75" />
        <ellipse cx={x} cy={y} rx={w / 2} ry={h / 2} fill={face} stroke={color} strokeWidth={selected ? 4 : 2} opacity={opacity} strokeDasharray={shape.operation === 'cut' ? '6 4' : undefined} />
      </g>
    );
  }
  const top = `${x - w / 2 + depth},${y - h / 2 - depth * 0.5} ${x + w / 2 + depth},${y - h / 2 - depth * 0.5} ${x + w / 2},${y - h / 2} ${x - w / 2},${y - h / 2}`;
  const side = `${x + w / 2},${y - h / 2} ${x + w / 2 + depth},${y - h / 2 - depth * 0.5} ${x + w / 2 + depth},${y + h / 2 - depth * 0.5} ${x + w / 2},${y + h / 2}`;
  return (
    <g filter={renderMode === 'realistic' && shape.operation === 'add' ? 'url(#cad-shadow)' : undefined} opacity={shape.operation === 'cut' ? 0.72 : 1}>
      {viewMode !== 'top' && <polygon points={top} fill={renderMode === 'wireframe' ? 'transparent' : material.light} stroke={color} strokeWidth="2" opacity={opacity} />}
      {viewMode !== 'top' && <polygon points={side} fill={renderMode === 'wireframe' ? 'transparent' : material.dark} stroke={color} strokeWidth="2" opacity={renderMode === 'realistic' ? 0.42 : opacity} />}
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={shape.type === 'slot' ? h / 2 : 4} fill={face} stroke={color} strokeWidth={selected ? 4 : 2} opacity={opacity} strokeDasharray={shape.operation === 'cut' ? '6 4' : undefined} />
    </g>
  );
}

function CadViewCube({ viewMode }: { viewMode: CadViewMode }) {
  return (
    <g transform="translate(448 42)">
      <rect x="0" y="0" width="92" height="76" rx="14" fill="rgba(255,255,255,0.78)" stroke="rgba(148,163,184,0.45)" />
      <polygon points="22,36 46,20 70,36 46,52" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
      <polygon points="22,36 46,52 46,68 22,52" fill="#bfdbfe" stroke="#2563eb" strokeWidth="1.5" />
      <polygon points="70,36 46,52 46,68 70,52" fill="#93c5fd" stroke="#2563eb" strokeWidth="1.5" />
      <text x="46" y="12" textAnchor="middle" fill="#334155" fontSize="9" fontWeight="900">{viewMode.toUpperCase()}</text>
    </g>
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
