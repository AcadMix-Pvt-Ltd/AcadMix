import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Play, Terminal, Copy, Trash, CaretDown, CaretUp, Lightning, Clock, CheckCircle, ChartBar, WarningCircle, X, Funnel, ArrowCounterClockwise, Sparkle, ChartLineUp, Eye, CheckSquareOffset, Plus, MagnifyingGlass, Database, Cpu, Circuitry, WaveSine, Atom, Blueprint, HardHat, Drop, Compass, Cube, Broadcast, Equalizer, SunHorizon, Gauge, Path, Tree, Wall, Wrench, Gear, Engine, Robot, ThermometerHot, Car, CornersOut, CornersIn, MagnetStraight, Pulse, WifiHigh, ShareNetwork } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import Editor from '@monaco-editor/react';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import SimulationIDE from '../components/SimulationIDE';
import SpiceChart from '../components/SpiceChart';
import { Simulation as EEcircuitSimulation } from 'eecircuit-engine';
import DSPBlockSimulator from '../components/dsp/DSPBlockSimulator';
import SettlementCalculator from '../components/civil/SettlementCalculator';
import CivilEngineeringStudio, { type CivilStudioTool } from '../components/civil/CivilEngineeringStudio';
import PCBDesignStudio from '../components/pcb/PCBDesignStudio';
import VLSIDesignStudio from '../components/vlsi/VLSIDesignStudio';
import FunctionGenerator from '../components/instrumentation/FunctionGenerator';
import SpectrumAnalyzer from '../components/instrumentation/SpectrumAnalyzer';
import MechanicalEngineeringStudio, { type MechanicalStudioTool } from '../components/mech/MechanicalEngineeringStudio';

const LANGUAGES = [
  { id: 'python', label: 'Python', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg" alt="Python" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'javascript', label: 'JavaScript', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg" alt="JavaScript" className="w-5 h-5 shrink-0 rounded-sm drop-shadow-sm" /> },
  { id: 'java', label: 'Java', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg" alt="Java" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'c', label: 'C', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/c/c-original.svg" alt="C" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'cpp', label: 'C++', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg" alt="C++" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'r', label: 'R', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/r/r-original.svg" alt="R" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'matlab', label: 'MATLAB', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/matlab/matlab-original.svg" alt="MATLAB" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'bash', label: 'Bash', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/bash/bash-original.svg" alt="Bash" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'go', label: 'Go', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/go/go-original.svg" alt="Go" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'csharp', label: 'C#', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg" alt="C#" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'ecelab', label: 'ECE Lab', icon: <Cpu size={20} weight="duotone" className="text-teal-500 shrink-0 drop-shadow-sm" /> },
  { id: 'eeelab', label: 'EEE Lab', icon: <Lightning size={20} weight="duotone" className="text-yellow-500 shrink-0 drop-shadow-sm" /> },
  { id: 'civillab', label: 'Civil Lab', icon: <HardHat size={20} weight="duotone" className="text-orange-500 shrink-0 drop-shadow-sm" /> },
  { id: 'mechlab', label: 'Mech Lab', icon: <Wrench size={20} weight="duotone" className="text-red-500 shrink-0 drop-shadow-sm" /> },
];

const SIMULATOR_CATEGORIES = [
  { id: 'embedded', label: 'Embedded Systems', icon: <Cpu size={16} weight="duotone" />, accent: 'teal' },
  { id: 'analog', label: 'Analog Electronics', icon: <WaveSine size={16} weight="duotone" />, accent: 'violet' },
  { id: 'digital', label: 'Digital Electronics', icon: <Circuitry size={16} weight="duotone" />, accent: 'sky' },
  { id: 'vlsi', label: 'VLSI Design', icon: <Atom size={16} weight="duotone" />, accent: 'amber' },
  { id: 'pcb', label: 'PCB Design', icon: <Blueprint size={16} weight="duotone" />, accent: 'emerald' },
  { id: 'microprocessors', label: 'Microprocessors', icon: <Cpu size={16} weight="duotone" />, accent: 'purple' },
  { id: 'control_systems_ece', label: 'Control Systems', icon: <ChartLineUp size={16} weight="duotone" />, accent: 'indigo' },
  { id: 'em_theory', label: 'EM Theory', icon: <MagnetStraight size={16} weight="duotone" />, accent: 'red' },
  { id: 'network_analysis', label: 'Network Analysis', icon: <ShareNetwork size={16} weight="duotone" />, accent: 'orange' },
  { id: 'communication', label: 'Communication Systems', icon: <Broadcast size={16} weight="duotone" />, accent: 'rose' },
  { id: 'dsp', label: 'DSP / Signal Processing', icon: <Equalizer size={16} weight="duotone" />, accent: 'indigo' },
  { id: 'instrumentation', label: 'Instrumentation', icon: <Pulse size={16} weight="duotone" />, accent: 'cyan' },
  { id: 'power_electronics_ece', label: 'Power Electronics', icon: <Lightning size={16} weight="duotone" />, accent: 'yellow' },
];

const JUPYTERLITE_BASE = 'https://jupyterlite.github.io/demo/repl/index.html?kernel=python&toolbar=1&theme=JupyterLab%20Dark';
const OCTAVE_URL = 'https://octave-online.net/';
const jupyterUrl = (code?: string) => code ? `${JUPYTERLITE_BASE}&code=${encodeURIComponent(code)}` : JUPYTERLITE_BASE;

// ── Default code snippets for each JupyterLite board ─────────────────────────
const JUPYTER_CODES: Record<string, string> = {
  'comm-python': `import numpy as np
# AM Modulation Demo
fc, fm, m = 100, 5, 0.8  # carrier, message freq, mod index
t = np.linspace(0, 1, 1000)
carrier = np.cos(2*np.pi*fc*t)
message = np.cos(2*np.pi*fm*t)
am = (1 + m*message) * carrier
print("AM Signal generated! Peak:", round(max(am),2))
print("Carrier freq:", fc, "Hz | Message freq:", fm, "Hz")
print("Modulation index:", m)`,

  'dsp-python': `import numpy as np
# FIR Low-Pass Filter Demo
N = 256
fs = 1000  # sampling rate
t = np.arange(N) / fs
# Signal: 5 Hz + 50 Hz noise
x = np.sin(2*np.pi*5*t) + 0.5*np.sin(2*np.pi*50*t)
# Simple moving average filter (window=15)
h = np.ones(15)/15
y = np.convolve(x, h, mode='same')
print("Input signal: 5Hz + 50Hz noise")
print("Filter: 15-tap moving average")
print("Input RMS:", round(np.sqrt(np.mean(x**2)),4))
print("Output RMS:", round(np.sqrt(np.mean(y**2)),4))
print("Noise reduced by ~", round((1-np.std(y)/np.std(x))*100,1), "%")`,

  'mp-python': `import numpy as np
# 8085 Assembly Simulator Demo (Python wrapper)
registers = {'A': 0, 'B': 5, 'C': 10}
def execute_add(reg1, reg2):
    return registers[reg1] + registers[reg2]
registers['A'] = execute_add('B', 'C')
print("=== Microprocessor Emulation ===")
print("Executing: MOV A, B \\n ADD C")
print("Result in Accumulator (A):", registers['A'])`,

  'ctrl-python': `import numpy as np
import matplotlib.pyplot as plt
# Root Locus and Bode plot data generation
frequencies = np.logspace(-2, 2, 100)
magnitude = 20 * np.log10(1 / np.sqrt(1 + (frequencies/10)**2))
phase = -np.arctan(frequencies/10) * 180 / np.pi
print("=== Control System Bode Plot ===")
print("Transfer Function: H(s) = 10 / (s + 10)")
print(f"DC Gain: {magnitude[0]:.2f} dB")
print(f"Phase at 10 rad/s: {phase[50]:.1f} deg")`,

  'em-python-ece': `import numpy as np
# Antenna Radiation Pattern
theta = np.linspace(0, 2*np.pi, 100)
# Simple dipole pattern
U = np.sin(theta)**2
print("=== EM Theory: Dipole Antenna ===")
print("Directivity calculation for infinitesimal dipole...")
print(f"Max radiation at θ = 90°: {max(U):.2f}")
print("Nulls at θ = 0° and 180°")`,

  'net-python': `import numpy as np
# KVL/KCL Matrix Solver
# [R1+R2, -R2] [I1] = [V1]
# [-R2, R2+R3] [I2]   [V2]
R = np.array([[30, -10], [-10, 30]])
V = np.array([12, 5])
I = np.linalg.solve(R, V)
print("=== Network Analysis ===")
print("Mesh Currents:")
print(f"I1 = {I[0]:.3f} A")
print(f"I2 = {I[1]:.3f} A")`,

  'inst-python': `import numpy as np
# Signal Processing for Instrumentation
# ADC quantization
V_ref = 5.0
bits = 10
levels = 2**bits
resolution = V_ref / levels
print("=== Instrumentation ADC ===")
print(f"10-bit ADC with 5V Reference")
print(f"Number of levels: {levels}")
print(f"Resolution (LSB): {resolution*1000:.2f} mV")`,

  'pe-python': `import numpy as np
# Full Wave Rectifier with Capacitor Filter
V_peak = 12 * np.sqrt(2)
f = 50
R_load = 100
C = 1000e-6
V_ripple = V_peak / (2 * f * R_load * C)
print("=== Power Electronics ===")
print(f"Transformer Secondary: 12V RMS")
print(f"Peak Voltage: {V_peak:.2f} V")
print(f"Ripple Voltage: {V_ripple:.2f} V")
print(f"DC Output ~ {V_peak - V_ripple/2:.2f} V")`,

  'iot-python': `import numpy as np
# Basic MQTT Payload Formatting
sensor_data = {'temp': 24.5, 'humidity': 60}
payload = f"'{{\"temperature\": {sensor_data['temp']}, \"humidity\": {sensor_data['humidity']}}}'"
print("=== IoT Edge Processing ===")
print("Publishing to topic: sensors/room1")
print("Payload:", payload)
print(f"Data size: {len(payload)} bytes")`,

  'cs-python': `import numpy as np
# Second-Order System Step Response
wn = 10  # natural frequency (rad/s)
zeta = 0.3  # damping ratio
t = np.linspace(0, 2, 500)
wd = wn * np.sqrt(1 - zeta**2)
y = 1 - np.exp(-zeta*wn*t) * (np.cos(wd*t) + (zeta/np.sqrt(1-zeta**2))*np.sin(wd*t))
print("2nd Order System: wn=", wn, "rad/s, zeta=", zeta)
print("Damped freq:", round(wd,2), "rad/s")
print("Peak overshoot:", round((max(y)-1)*100,1), "%")
print("Settling time ~", round(4/(zeta*wn),2), "s")`,

  'em-python': `import numpy as np
# Transformer Efficiency Calculator
V1, I1 = 230, 10  # primary voltage, current
V2, I2 = 115, 18  # secondary voltage, current
P_cu = 50   # copper losses (W)
P_fe = 30   # iron/core losses (W)
P_in = V1 * I1
P_out = V2 * I2
eff = (P_out / (P_out + P_cu + P_fe)) * 100
print("=== Transformer Analysis ===")
print(f"Turns ratio: {V1/V2:.2f}:1")
print(f"Input power:  {P_in} W")
print(f"Output power: {P_out} W")
print(f"Cu loss: {P_cu}W | Fe loss: {P_fe}W")
print(f"Efficiency: {eff:.1f}%")`,

  'ps-python': `import numpy as np
# Gauss-Seidel Load Flow (2-bus)
V = np.array([1.0+0j, 1.0+0j])  # initial voltages
Y = np.array([[10-20j, -10+20j], [-10+20j, 10-20j]])  # Y-bus
P = np.array([0, -0.5])  # scheduled P
Q = np.array([0, -0.3])  # scheduled Q
print("=== Gauss-Seidel Load Flow ===")
for itr in range(5):
    S2 = P[1] + 1j*Q[1]
    V[1] = (1/Y[1,1]) * (np.conj(S2)/np.conj(V[1]) - Y[1,0]*V[0])
    print(f"Iter {itr+1}: V2 = {abs(V[1]):.4f} ∠{np.degrees(np.angle(V[1])):.2f}°")
print(f"\\nFinal V2 = {abs(V[1]):.4f} p.u.")`,

  'mi-python': `import numpy as np
# Wheatstone Bridge Analysis
R1, R2, R3, R4 = 100, 200, 150, 300  # ohms
Vs = 10  # supply voltage
Vth = Vs * (R3/(R3+R1) - R4/(R4+R2))
Rth = (R1*R3)/(R1+R3) + (R2*R4)/(R2+R4)
print("=== Wheatstone Bridge ===")
print(f"R1={R1}, R2={R2}, R3={R3}, R4={R4} Ω")
print(f"Supply: {Vs}V")
print(f"Bridge voltage: {Vth:.4f} V")
print(f"Thevenin resistance: {Rth:.2f} Ω")
balanced = abs(R1*R4 - R2*R3) < 0.01
print(f"Balanced: {'Yes ✓' if balanced else 'No ✗'}")`,

  're-python': `import numpy as np
# Solar PV I-V Curve (Single Diode Model)
Isc, Voc = 8.5, 36.0  # short-circuit current, open-circuit voltage
n, T = 1.2, 298  # ideality, temp (K)
Vt = 0.02585 * T / 298
V = np.linspace(0, Voc, 100)
I = Isc * (1 - np.exp((V - Voc)/(n * 36 * Vt)))
I = np.maximum(I, 0)
P = V * I
idx = np.argmax(P)
print("=== Solar PV Analysis ===")
print(f"Isc = {Isc}A | Voc = {Voc}V")
print(f"MPP: {V[idx]:.1f}V, {I[idx]:.2f}A → {P[idx]:.1f}W")
print(f"Fill Factor: {P[idx]/(Isc*Voc)*100:.1f}%")`,

  'st-python': `import numpy as np
# Simply Supported Beam - Deflection (Euler-Bernoulli)
L = 5.0    # length (m)
w = 10.0   # UDL (kN/m)
E = 200e6  # Young's modulus (kPa)
I = 8.33e-4  # moment of inertia (m^4)
x = np.linspace(0, L, 50)
delta = (w * x * (L**3 - 2*L*x**2 + x**3)) / (24*E*I)
print("=== Beam Deflection (UDL) ===")
print(f"Span: {L}m | Load: {w} kN/m")
print(f"Max deflection: {max(delta)*1000:.3f} mm at x={L/2}m")
print(f"Max BM: {w*L**2/8:.2f} kN·m")
print(f"Reactions: RA = RB = {w*L/2:.1f} kN")`,

  'geo-python': `import numpy as np
# Terzaghi Bearing Capacity
c = 20   # cohesion (kPa)
phi = 30  # friction angle (deg)
gamma = 18  # unit weight (kN/m³)
Df = 1.5  # depth of foundation (m)
B = 2.0   # width (m)
# Terzaghi factors
Nq = np.exp(np.pi*np.tan(np.radians(phi))) * np.tan(np.radians(45+phi/2))**2
Nc = (Nq - 1) / np.tan(np.radians(phi))
Ng = 2*(Nq + 1) * np.tan(np.radians(phi))
qu = c*Nc + gamma*Df*Nq + 0.5*gamma*B*Ng
print("=== Terzaghi Bearing Capacity ===")
print(f"c={c}kPa, φ={phi}°, γ={gamma}kN/m³")
print(f"Nc={Nc:.2f}, Nq={Nq:.2f}, Nγ={Ng:.2f}")
print(f"Ultimate capacity: {qu:.1f} kPa")
print(f"Safe capacity (FOS=3): {qu/3:.1f} kPa")`,

  'fm-python': `import numpy as np
# Pipe Flow - Darcy-Weisbach
D = 0.15   # diameter (m)
L = 100    # length (m)
Q = 0.02   # flow rate (m³/s)
nu = 1e-6  # kinematic viscosity
g = 9.81
A = np.pi * D**2 / 4
V = Q / A
Re = V * D / nu
f = 0.316 / Re**0.25 if Re < 1e5 else 0.0032 + 0.221/Re**0.237
hf = f * L * V**2 / (2 * g * D)
print("=== Pipe Flow Analysis ===")
print(f"Velocity: {V:.2f} m/s")
print(f"Reynolds number: {Re:.0f}")
print(f"Flow regime: {'Laminar' if Re<2300 else 'Turbulent'}")
print(f"Friction factor: {f:.5f}")
print(f"Head loss: {hf:.3f} m")`,

  'cad-python': `import numpy as np
# B-Spline Curve Evaluation
def bspline_basis(i, k, t, knots):
    if k == 1:
        return 1.0 if knots[i] <= t < knots[i+1] else 0.0
    d1 = knots[i+k-1] - knots[i]
    d2 = knots[i+k] - knots[i+1]
    c1 = ((t-knots[i])/d1)*bspline_basis(i,k-1,t,knots) if d1 else 0
    c2 = ((knots[i+k]-t)/d2)*bspline_basis(i+1,k-1,t,knots) if d2 else 0
    return c1 + c2
ctrl = [(0,0),(1,3),(3,3),(4,0)]  # control points
print("=== B-Spline Curve ===")
print("Control points:", ctrl)
print("Degree: 3 (cubic)")
print("Evaluating curve at 5 points...")
knots = [0,0,0,0,1,1,1,1]
for u in [0.0, 0.25, 0.5, 0.75, 0.999]:
    x = sum(bspline_basis(i,4,u,knots)*p[0] for i,p in enumerate(ctrl))
    y = sum(bspline_basis(i,4,u,knots)*p[1] for i,p in enumerate(ctrl))
    print(f"  u={u:.2f} → ({x:.2f}, {y:.2f})")`,

  'tr-python': `import numpy as np
# Traffic Flow - Greenshields Model
vf = 80   # free-flow speed (km/h)
kj = 150  # jam density (veh/km)
k = np.linspace(1, kj, 50)
v = vf * (1 - k/kj)
q = k * v  # flow = density × speed
idx = np.argmax(q)
print("=== Greenshields Traffic Model ===")
print(f"Free-flow speed: {vf} km/h")
print(f"Jam density: {kj} veh/km")
print(f"Max flow: {q[idx]:.0f} veh/h at k={k[idx]:.0f} veh/km")
print(f"Speed at max flow: {v[idx]:.1f} km/h")
print(f"Capacity: {vf*kj/4:.0f} veh/h")`,

  'env-python': `import numpy as np
# BOD Removal - Activated Sludge Process
Q = 5000   # flow rate (m³/day)
S0 = 250   # influent BOD (mg/L)
Se = 20    # effluent BOD (mg/L)
Y = 0.5    # yield coefficient
kd = 0.06  # decay rate (1/day)
theta_c = 10  # SRT (days)
X = Y * (S0 - Se) * theta_c / (1 + kd*theta_c)
print("=== Activated Sludge Design ===")
print(f"Flow: {Q} m³/day | BOD: {S0}→{Se} mg/L")
print(f"Removal: {(1-Se/S0)*100:.1f}%")
print(f"MLSS concentration: {X:.0f} mg/L")
print(f"Sludge production: {Q*Y*(S0-Se)/1000:.1f} kg/day")`,

  'cs-python-civil': `import numpy as np
# RC Beam Design (IS 456)
fck, fy = 25, 500  # M25, Fe500
b, d = 300, 450    # mm
Mu = 150e6         # N·mm (150 kN·m)
xu_max = 0.46 * d
Mu_lim = 0.36*fck*b*xu_max*(d - 0.42*xu_max)
print("=== RC Beam Design (IS 456) ===")
print(f"M25/Fe500 | b={b}mm, d={d}mm")
print(f"Mu = {Mu/1e6:.0f} kN·m")
print(f"Mu,lim = {Mu_lim/1e6:.1f} kN·m")
if Mu <= Mu_lim:
    Ast = (0.5*fck*b*d/fy)*(1-np.sqrt(1-4.6*Mu/(fck*b*d**2)))
    print(f"Singly reinforced: Ast = {Ast:.0f} mm²")
else:
    print("Doubly reinforced beam required")`,

  'th-python': `import numpy as np
# Otto Cycle Analysis
r = 8       # compression ratio
gamma = 1.4 # specific heat ratio
T1 = 300    # initial temp (K)
P1 = 100    # initial pressure (kPa)
Qin = 1800  # heat added (kJ/kg)
T2 = T1 * r**(gamma-1)
T3 = T2 + Qin/0.718  # cv = 0.718 kJ/kg·K
T4 = T3 / r**(gamma-1)
eta = 1 - 1/r**(gamma-1)
print("=== Otto Cycle Analysis ===")
print(f"Compression ratio: {r}")
print(f"T1={T1}K → T2={T2:.0f}K → T3={T3:.0f}K → T4={T4:.0f}K")
print(f"Thermal efficiency: {eta*100:.1f}%")
print(f"Work output: {Qin*eta:.0f} kJ/kg")`,

  'fl-python': `import numpy as np
# Bernoulli Equation - Venturi Meter
D1, D2 = 0.1, 0.05  # diameters (m)
rho = 998  # water density
dP = 5000  # pressure difference (Pa)
Cd = 0.98  # discharge coefficient
A1 = np.pi*D1**2/4
A2 = np.pi*D2**2/4
Q = Cd * A1 * A2 * np.sqrt(2*dP/(rho*(A1**2-A2**2)))
V1 = Q/A1
V2 = Q/A2
print("=== Venturi Meter ===")
print(f"D1={D1*100}cm, D2={D2*100}cm")
print(f"ΔP = {dP} Pa")
print(f"Q = {Q*1000:.3f} L/s")
print(f"V1 = {V1:.2f} m/s | V2 = {V2:.2f} m/s")`,

  'som-python': `import numpy as np
# Mohr's Circle Calculation
sx, sy, txy = 80, -30, 40  # MPa
center = (sx + sy) / 2
R = np.sqrt(((sx-sy)/2)**2 + txy**2)
s1 = center + R
s2 = center - R
tau_max = R
theta_p = 0.5 * np.degrees(np.arctan2(2*txy, sx-sy))
print("=== Mohr's Circle ===")
print(f"σx={sx}, σy={sy}, τxy={txy} MPa")
print(f"Center: {center:.1f} MPa | Radius: {R:.1f} MPa")
print(f"σ1 = {s1:.1f} MPa | σ2 = {s2:.1f} MPa")
print(f"τ_max = {tau_max:.1f} MPa")
print(f"Principal angle: {theta_p:.1f}°")`,

  'md-python': `import numpy as np
# Shaft Design - Torsion
T = 500    # torque (N·m)
tau_allow = 40e6  # allowable shear stress (Pa)
d = (16*T/(np.pi*tau_allow))**(1/3)
print("=== Shaft Design ===")
print(f"Torque: {T} N·m")
print(f"Allowable τ: {tau_allow/1e6} MPa")
print(f"Min diameter: {d*1000:.1f} mm")
print(f"Rounded up: {np.ceil(d*1000/5)*5:.0f} mm")
J = np.pi*d**4/32
print(f"Polar moment: {J*1e12:.1f} mm⁴")`,

  'mfg-python': `import numpy as np
# CNC Machining Parameters
D = 50     # tool diameter (mm)
N = 1200   # spindle speed (RPM)
fz = 0.1   # feed per tooth (mm)
z = 4      # number of teeth
Vc = np.pi * D * N / 1000
Vf = fz * z * N
print("=== CNC Milling Parameters ===")
print(f"Tool: Ø{D}mm, {z} flutes")
print(f"Spindle: {N} RPM")
print(f"Cutting speed: {Vc:.0f} m/min")
print(f"Feed rate: {Vf:.0f} mm/min")
print(f"Feed/tooth: {fz} mm")`,

  'mt-python': `import numpy as np
# PID Controller Simulation
Kp, Ki, Kd = 1.2, 0.5, 0.1
dt = 0.01
setpoint = 1.0
y, integral, prev_err = 0.0, 0.0, 0.0
print("=== PID Step Response ===")
print(f"Kp={Kp}, Ki={Ki}, Kd={Kd}")
for i in range(200):
    err = setpoint - y
    integral += err * dt
    derivative = (err - prev_err) / dt
    u = Kp*err + Ki*integral + Kd*derivative
    y += u * dt * 2  # simple plant
    prev_err = err
    if i % 40 == 0:
        print(f"  t={i*dt:.2f}s: y={y:.3f}, err={err:.3f}")
print(f"Final: y={y:.4f} (target={setpoint})")`,

  'dy-python': `import numpy as np
# Spring-Mass-Damper Free Vibration
m, c, k = 2, 5, 200  # kg, N·s/m, N/m
wn = np.sqrt(k/m)
zeta = c / (2*np.sqrt(k*m))
wd = wn * np.sqrt(1-zeta**2)
t = np.linspace(0, 2, 100)
x = np.exp(-zeta*wn*t) * np.cos(wd*t)
print("=== Free Vibration Analysis ===")
print(f"m={m}kg, c={c}N·s/m, k={k}N/m")
print(f"Natural freq: {wn:.2f} rad/s ({wn/(2*np.pi):.2f} Hz)")
print(f"Damping ratio: {zeta:.3f} ({'Underdamped' if zeta<1 else 'Overdamped'})")
print(f"Damped freq: {wd:.2f} rad/s")
print(f"Log decrement: {2*np.pi*zeta/np.sqrt(1-zeta**2):.3f}")`,

  'au-python': `import numpy as np
# IC Engine Performance
bp = 25    # brake power (kW)
mf = 8     # fuel consumption (kg/hr)
CV = 42000 # calorific value (kJ/kg)
N = 3000   # RPM
eta_mech = 0.82
ip = bp / eta_mech
fp = ip - bp
sfc = mf / bp
eta_th = (bp*3600) / (mf*CV) * 100
T = (bp*1000*60) / (2*np.pi*N)
print("=== IC Engine Performance ===")
print(f"BP={bp}kW | IP={ip:.1f}kW | FP={fp:.1f}kW")
print(f"Mech efficiency: {eta_mech*100:.0f}%")
print(f"Thermal efficiency: {eta_th:.1f}%")
print(f"SFC: {sfc:.3f} kg/kWh")
print(f"Torque: {T:.1f} N·m @ {N} RPM")`,

  'cad-python-3d': `import numpy as np
# Parametric Gear Profile
m, z = 2, 20  # module (mm), teeth
r_pitch = m * z / 2
r_base = r_pitch * np.cos(np.radians(20))
r_addendum = r_pitch + m
r_dedendum = r_pitch - 1.25*m
print("=== Spur Gear Design ===")
print(f"Module: {m}mm | Teeth: {z}")
print(f"Pitch circle: Ø{2*r_pitch}mm")
print(f"Base circle: Ø{2*r_base:.1f}mm")
print(f"Addendum circle: Ø{2*r_addendum}mm")
print(f"Dedendum circle: Ø{2*r_dedendum:.1f}mm")
print(f"Tooth thickness: {np.pi*m/2:.2f}mm")`,
  'sw-python': `import numpy as np
# Overcurrent Relay Pickup and Operating Time
fault_current = 1200  # A
ct_ratio = 200 / 5
plug_setting = 1.0
tds = 0.2
pickup_secondary = 5 * plug_setting
fault_secondary = fault_current / ct_ratio
psm = fault_secondary / pickup_secondary
time_sec = 0.14 * tds / ((psm ** 0.02) - 1)
print("=== IDMT Overcurrent Relay ===")
print(f"Fault current: {fault_current} A")
print(f"Secondary current: {fault_secondary:.2f} A")
print(f"PSM: {psm:.2f}")
print(f"Operating time: {time_sec:.3f} s")`,

  'num-python': `import numpy as np
# EEE Numerical Toolkit: PF Correction
P_kw = 50
pf_initial = 0.72
pf_target = 0.95
phi1 = np.arccos(pf_initial)
phi2 = np.arccos(pf_target)
q_initial = P_kw * np.tan(phi1)
q_target = P_kw * np.tan(phi2)
kvar_required = q_initial - q_target
print("=== Power Factor Correction ===")
print(f"Real power: {P_kw} kW")
print(f"Reactive power before: {q_initial:.2f} kVAR")
print(f"Reactive power after: {q_target:.2f} kVAR")
print(f"Capacitor bank required: {kvar_required:.2f} kVAR")`,

  'placement-python': `import numpy as np
# Quick EEE Placement Calculator: Transformer Regulation
V_no_load = 230
V_full_load = 218
regulation = (V_no_load - V_full_load) / V_full_load * 100
print("=== Transformer Voltage Regulation ===")
print(f"No-load voltage: {V_no_load} V")
print(f"Full-load voltage: {V_full_load} V")
print(f"Voltage regulation: {regulation:.2f}%")`,
};


const SIMULATOR_BOARDS: Record<string, { id: string; label: string; url: string; openLabel?: string; noEmbed?: boolean; octaveUrl?: string; isNativeWasm?: boolean; isNativeBlock?: boolean; nativeLanguage?: 'spice' | 'verilog'; defaultCode?: string }[]> = {
  embedded: [
    { id: 'arduino-uno', label: 'Arduino Uno', url: 'https://wokwi.com/projects/new/arduino-uno', openLabel: 'Open in Wokwi' },
    { id: 'arduino-mega', label: 'Arduino Mega', url: 'https://wokwi.com/projects/new/arduino-mega', openLabel: 'Open in Wokwi' },
    { id: 'arduino-nano', label: 'Arduino Nano', url: 'https://wokwi.com/projects/new/arduino-nano', openLabel: 'Open in Wokwi' },
    { id: 'esp32', label: 'ESP32 (Core)', url: 'https://wokwi.com/projects/new/esp32', openLabel: 'Open in Wokwi' },
    { id: 'esp32-c3', label: 'ESP32-C3 (RISC-V)', url: 'https://wokwi.com/projects/new/esp32-c3', openLabel: 'Open in Wokwi' },
    { id: 'esp32-s3', label: 'ESP32-S3 (Edge AI)', url: 'https://wokwi.com/projects/new/esp32-s3', openLabel: 'Open in Wokwi' },
    { id: 'pi-pico', label: 'RPi Pico', url: 'https://wokwi.com/projects/new/pi-pico', openLabel: 'Open in Wokwi' },
    { id: 'micropython-esp32', label: 'MicroPython', url: 'https://wokwi.com/projects/new/micropython-esp32', openLabel: 'Open in Wokwi' },
    { id: 'attiny85', label: 'ATtiny85', url: 'https://wokwi.com/projects/new/attiny85', openLabel: 'Open in Wokwi' },
    { id: 'iot-pico', label: 'RPi Pico W', url: 'https://wokwi.com/projects/new/pi-pico-w', openLabel: 'Open Wokwi' },
    { id: 'iot-python', label: 'Python (Edge)', url: jupyterUrl(JUPYTER_CODES['iot-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  analog: [
    { id: 'ae-native-spice', label: 'SPICE: RLC Circuit', url: '', isNativeWasm: true, nativeLanguage: 'spice', defaultCode: `* Basic RLC circuit\n\nv1 1 0 pulse (0 5 1m 1m 1m 10m 20m)\nr1 1 2 1k\nl1 2 3 10m\nc1 3 0 1u\n\n.tran 0.1m 50m\n.end` },
    { id: 'ae-native-spice-bjt', label: 'SPICE: CE Amplifier', url: '', isNativeWasm: true, nativeLanguage: 'spice', defaultCode: `* Common Emitter Amplifier\nVCC 1 0 15\nVIN 2 0 SIN(0 10m 1k)\nR1 1 3 47k\nR2 3 0 10k\nRC 1 4 4.7k\nRE 5 0 1k\nC1 2 3 10u\nC2 4 6 10u\nCE 5 0 100u\nQ1 4 3 5 2N3904\n.model 2N3904 NPN\n.tran 10u 5m\n.end` },
    { id: 'ae-native-spice-rc', label: 'SPICE: RC Filter', url: '', isNativeWasm: true, nativeLanguage: 'spice', defaultCode: `* Low Pass Filter\nVIN 1 0 PULSE(0 5 1m 1m 1m 10m 20m)\nR1 1 2 1k\nC1 2 0 1u\n.tran 0.1m 30m\n.end` },
    { id: 'ae-blank', label: 'Blank Circuit', url: 'https://lushprojects.com/circuitjs/circuitjs.html?ctz=CQAgjCAMB0l3BWcA2aAOMB2ALGXyEBOAbmAmwmwFMBaMMAKACcQUFDxCRsKBmEbqh7ce-YUJR1BkEJByYAHiGC4ALpzV8hOvYb37MBg5QCMvIbsPG6Zjlx5A', openLabel: 'Open in CircuitJS' },
    { id: 'ae-opamp', label: 'Op-Amp', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=opamp.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ae-rc', label: 'RC Low-Pass Filter', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=filt-lopass.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ae-bjt', label: 'CE Amplifier', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=ceamp.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ae-mosfet', label: 'n-MOSFET', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=nmosfet.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ae-diode', label: 'Diode', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=diodevar.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ae-555', label: '555 Timer', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=555square.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ae-colpitts', label: 'Colpitts Oscillator', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=colpitts.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ae-hartley', label: 'Hartley Oscillator', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=hartley.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ae-wien', label: 'Wien Bridge Osc', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=wienbridge.txt', openLabel: 'Open in CircuitJS' },
  ],
  digital: [
    { id: 'de-blank', label: 'Blank Circuit', url: 'https://lushprojects.com/circuitjs/circuitjs.html?ctz=CQAgjCAMB0l3BWcA2aAOMB2ALGXyEBOAbmAmwmwFMBaMMAKACcQUFDxCRsKBmEbqh7ce-YUJR1BkEJByYAHiGC4ALpzV8hOvYb37MBg5QCMvIbsPG6Zjlx5A', openLabel: 'Open in CircuitJS' },
    { id: 'de-gates', label: 'XOR Gate', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=xor.txt', openLabel: 'Open in CircuitJS' },
    { id: 'de-flipflop', label: 'SR Flip-Flop', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=nandff.txt', openLabel: 'Open in CircuitJS' },
    { id: 'de-dff', label: 'D Flip-Flop', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=edgedff.txt', openLabel: 'Open in CircuitJS' },
    { id: 'de-counter', label: '4-Bit Counter', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=counter.txt', openLabel: 'Open in CircuitJS' },
    { id: 'de-decoder', label: '7-Seg Decoder', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=7segdecoder.txt', openLabel: 'Open in CircuitJS' },
    { id: 'de-fulladd', label: 'Full Adder', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=fulladd.txt', openLabel: 'Open in CircuitJS' },
    { id: 'de-mux', label: 'Multiplexer', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=mux.txt', openLabel: 'Open in CircuitJS' },
    { id: 'de-shiftreg', label: 'Shift Register', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=shiftreg.txt', openLabel: 'Open in CircuitJS' },
    { id: 'de-comp', label: 'Comparator', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=comparator.txt', openLabel: 'Open in CircuitJS' },
    { id: 'de-alu', label: '4-Bit ALU', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=alu.txt', openLabel: 'Open in CircuitJS' },
  ],
  vlsi: [
    { 
      id: 'vlsi-native-block', 
      label: 'VLSI Logic Studio (Native)', 
      url: '', 
      isNativeBlock: true 
    },
    { 
      id: 'vlsi-native', 
      label: 'AcadMix Verilog (Native)', 
      url: '', 
      isNativeWasm: true, 
      nativeLanguage: 'verilog',
      defaultCode: `// Basic D Flip-Flop Testbench
module dff(input d, clk, rst, output reg q);
  always @(posedge clk or posedge rst) begin
    if (rst) q <= 0;
    else q <= d;
  end
endmodule

module tb;
  reg d, clk, rst;
  wire q;
  
  dff u1(d, clk, rst, q);
  
  initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, tb);
    
    clk = 0; rst = 1; d = 0;
    #10 rst = 0; d = 1;
    #10 d = 0;
    #10 d = 1;
    #10 $finish;
  end
  
  always #5 clk = ~clk;
endmodule`
    },
    { id: 'vlsi-makerchip', label: 'Makerchip IDE', url: 'https://makerchip.com/sandbox/', openLabel: 'Open in Makerchip' },
  ],
  pcb: [
    { id: 'pcb-native', label: 'PCB Studio (Native)', url: '', isNativeBlock: true },
    { id: 'pcb-svg', label: 'SVG PCB Editor', url: 'https://leomcelroy.com/svg-pcb/', openLabel: 'Open SVG PCB' },
    { id: 'pcb-tscircuit', label: 'tscircuit', url: 'https://tscircuit.com/playground', openLabel: 'Open tscircuit' },
    { id: 'pcb-kicanvas', label: 'KiCanvas Viewer', url: 'https://kicanvas.org/', openLabel: 'Open KiCanvas' },
  ],
  communication: [
    { id: 'comm-blank', label: 'Blank Circuit', url: 'https://lushprojects.com/circuitjs/circuitjs.html?ctz=CQAgjCAMB0l3BWcA2aAOMB2ALGXyEBOAbmAmwmwFMBaMMAKACcQUFDxCRsKBmEbqh7ce-YUJR1BkEJByYAHiGC4ALpzV8hOvYb37MBg5QCMvIbsPG6Zjlx5A', openLabel: 'Open in CircuitJS' },
    { id: 'comm-am', label: 'AM Detector', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=amdetect.txt', openLabel: 'Open in CircuitJS' },
    { id: 'comm-vco', label: 'VCO (FM Basis)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=vco.txt', openLabel: 'Open in CircuitJS' },
    { id: 'comm-phaseshiftosc', label: 'Phase-Shift Oscillator', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=phaseshiftosc.txt', openLabel: 'Open in CircuitJS' },
    { id: 'comm-fm', label: 'FM Generator', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=fm.txt', openLabel: 'Open in CircuitJS' },
    { id: 'comm-pll', label: 'Phase-Locked Loop', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=pll.txt', openLabel: 'Open in CircuitJS' },
    { id: 'comm-ask', label: 'ASK Modulation', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=ask.txt', openLabel: 'Open in CircuitJS' },
    { id: 'comm-python', label: 'Python (Comms)', url: jupyterUrl(JUPYTER_CODES['comm-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  dsp: [
    { id: 'dsp-native', label: 'AcadMix DSP (Native)', url: '', isNativeBlock: true },
    { id: 'dsp-octave', label: 'GNU Octave', url: 'https://octave-online.net/', openLabel: 'Open Octave' },
    { id: 'inst-spectrum', label: 'Spectrum Analyzer', url: '', isNativeBlock: true },
    { id: 'dsp-academo-scope', label: 'Virtual Oscilloscope', url: 'https://academo.org/demos/virtual-oscilloscope/?embedded=true', openLabel: 'Open Oscilloscope' },
    { id: 'dsp-musiclab', label: 'MusicLab Spectrogram', url: 'https://musiclab.chromeexperiments.com/Spectrogram/', openLabel: 'Open MusicLab' },
    { id: 'dsp-fft', label: 'Falstad Fourier', url: 'https://www.falstad.com/fourier/', openLabel: 'Open Falstad' },
    { id: 'dsp-filter', label: 'Low-Pass Filter (RC)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=filt-lopass.txt', openLabel: 'Open CircuitJS' },
    { id: 'dsp-python', label: 'Python (DSP)', url: jupyterUrl(JUPYTER_CODES['dsp-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  microprocessors: [
    { id: 'mp-8085', label: '8085 Simulator', url: 'https://sim8085.com/', openLabel: 'Open 8085 Sim' },
    { id: 'mp-arm', label: 'ARM Cortex-A9 (CPUlator)', url: 'https://cpulator.01xz.net/?sys=arm', openLabel: 'Open CPUlator' },
    { id: 'mp-riscv', label: 'RISC-V (CPUlator)', url: 'https://cpulator.01xz.net/?sys=riscv', openLabel: 'Open CPUlator' },
    { id: 'mp-mips', label: 'MIPS (CPUlator)', url: 'https://cpulator.01xz.net/?sys=mips', openLabel: 'Open CPUlator' },
    { id: 'mp-python', label: 'Python (Assembly)', url: jupyterUrl(JUPYTER_CODES['mp-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  control_systems_ece: [
    { id: 'ctrl-octave', label: 'GNU Octave', url: 'https://octave-online.net/', openLabel: 'Open Octave' },
    { id: 'ctrl-feedback', label: 'Op-Amp Feedback', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=opampfeedback.txt', openLabel: 'Open CircuitJS' },
    { id: 'ctrl-osc', label: 'Phase-Shift Osc', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=phaseshiftosc.txt', openLabel: 'Open CircuitJS' },
    { id: 'ctrl-python', label: 'Python (Control)', url: jupyterUrl(JUPYTER_CODES['ctrl-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  em_theory: [
    { id: 'em-1d', label: '1D EM Wave', url: 'https://www.falstad.com/emwave1/', openLabel: 'Open Falstad' },
    { id: 'em-2d', label: '2D EM Wave', url: 'https://www.falstad.com/emwave2/', openLabel: 'Open Falstad' },
    { id: 'em-3d', label: '3D Waveguide', url: 'https://www.falstad.com/embox/', openLabel: 'Open Falstad' },
    { id: 'em-python', label: 'Python (Antennas)', url: jupyterUrl(JUPYTER_CODES['em-python-ece']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  network_analysis: [
    { id: 'net-vdiv', label: 'Voltage Divider', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=voltdivide.txt', openLabel: 'Open CircuitJS' },
    { id: 'net-wheatstone', label: 'Wheatstone Bridge', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=wheatstone.txt', openLabel: 'Open CircuitJS' },
    { id: 'net-rlc', label: 'RLC Series', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=lrc.txt', openLabel: 'Open CircuitJS' },
    { id: 'net-thevenin', label: 'Thevenin Equivalent', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=thevenin.txt', openLabel: 'Open CircuitJS' },
    { id: 'net-python', label: 'Python (Networks)', url: jupyterUrl(JUPYTER_CODES['net-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  instrumentation: [
    { id: 'inst-scope', label: 'Virtual Oscilloscope', url: 'https://academo.org/demos/virtual-oscilloscope/?embedded=true', openLabel: 'Open Scope' },
    { id: 'inst-funcgen', label: 'Function Generator', url: '', isNativeBlock: true },
    { id: 'inst-funcgen-legacy', label: 'Function Gen (Legacy)', url: 'https://academo.org/demos/wave-interference-beat-frequency/?embedded=true', openLabel: 'Open Legacy' },
    { id: 'inst-spectrum', label: 'Spectrum Analyzer', url: '', isNativeBlock: true },
    { id: 'inst-filter', label: 'Low-Pass Filter (RC)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=filt-lopass.txt', openLabel: 'Open CircuitJS' },
    { id: 'inst-python', label: 'Python (Measurements)', url: jupyterUrl(JUPYTER_CODES['inst-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  power_electronics_ece: [
    { id: 'pe-half', label: 'Half-Wave Rectifier', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=rectify.txt', openLabel: 'Open CircuitJS' },
    { id: 'pe-full', label: 'Full-Wave Rectifier', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=fullrect.txt', openLabel: 'Open CircuitJS' },
    { id: 'pe-bridge', label: 'Rectifier w/ Filter', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=fullrectf.txt', openLabel: 'Open CircuitJS' },
    { id: 'pe-reg', label: 'Voltage Regulator (Zener)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=zenerref.txt', openLabel: 'Open CircuitJS' },
    { id: 'pe-python', label: 'Python (Power)', url: jupyterUrl(JUPYTER_CODES['pe-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
};

// ── EEE Lab Categories & Boards ─────────────────────────────────────────────
const EEE_SIMULATOR_CATEGORIES = [
  { id: 'power_electronics', label: 'Power Electronics', icon: <WaveSine size={16} weight="duotone" />, accent: 'rose' },
  { id: 'control_systems', label: 'Control Systems', icon: <ChartLineUp size={16} weight="duotone" />, accent: 'indigo' },
  { id: 'electrical_machines', label: 'Electrical Machines', icon: <Atom size={16} weight="duotone" />, accent: 'amber' },
  { id: 'power_systems', label: 'Power Systems', icon: <Lightning size={16} weight="duotone" />, accent: 'violet' },
  { id: 'industrial_automation', label: 'Industrial Automation', icon: <Cpu size={16} weight="duotone" />, accent: 'teal' },
  { id: 'measurements', label: 'Measurements & Instrumentation', icon: <Gauge size={16} weight="duotone" />, accent: 'sky' },
  { id: 'renewable_energy', label: 'Renewable Energy', icon: <SunHorizon size={16} weight="duotone" />, accent: 'emerald' },
  { id: 'protection_switchgear', label: 'Protection & Switchgear', icon: <WarningCircle size={16} weight="duotone" />, accent: 'rose' },
  { id: 'numerical_lab', label: 'MATLAB/Python Numerical Lab', icon: <Terminal size={16} weight="duotone" />, accent: 'indigo' },
];

const EEE_SIMULATOR_BOARDS: Record<string, { id: string; label: string; url: string; openLabel?: string; externalUrl?: string; externalLabel?: string; noEmbed?: boolean; octaveUrl?: string; isNativeBlock?: boolean }[]> = {
  power_electronics: [
    { id: 'pe-blank', label: 'Blank Circuit', url: 'https://lushprojects.com/circuitjs/circuitjs.html?ctz=CQAgjCAMB0l3BWcA2aAOMB2ALGXyEBOAbmAmwmwFMBaMMAKACcQUFDxCRsKBmEbqh7ce-YUJR1BkEJByYAHiGC4ALpzV8hOvYb37MBg5QCMvIbsPG6Zjlx5A', openLabel: 'Open in CircuitJS' },
    { id: 'pe-halfwave', label: 'Half-Wave Rectifier', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=rectify.txt', openLabel: 'Open in CircuitJS' },
    { id: 'pe-fullrect', label: 'Full-Wave Rectifier', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=fullrect.txt', openLabel: 'Open in CircuitJS' },
    { id: 'pe-fullrectf', label: 'Rectifier w/ Filter', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=fullrectf.txt', openLabel: 'Open in CircuitJS' },
    { id: 'pe-voltdouble', label: 'Voltage Doubler', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=voltdouble.txt', openLabel: 'Open in CircuitJS' },
    { id: 'pe-555pwm', label: '555 PWM', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=555pulsemod.txt', openLabel: 'Open in CircuitJS' },
    { id: 'pe-schmitt', label: 'Schmitt Trigger', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=amp-schmitt.txt', openLabel: 'Open in CircuitJS' },
    { id: 'pe-diode', label: 'Power Diode', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=diodevar.txt', openLabel: 'Open in CircuitJS' },
    { id: 'pe-zener', label: 'Zener Regulator', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=zenerref.txt', openLabel: 'Open in CircuitJS' },
    { id: 'pe-octave', label: 'Octave / MATLAB', url: OCTAVE_URL, openLabel: 'Open Octave' },
  ],
  control_systems: [
    { id: 'cs-python', label: 'Python (Controls)', url: jupyterUrl(JUPYTER_CODES['cs-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'cs-octave', label: 'Octave / MATLAB', url: OCTAVE_URL, openLabel: 'Open Octave' },
    { id: 'cs-opamp', label: 'Op-Amp', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=opamp.txt', openLabel: 'Open in CircuitJS' },
    { id: 'cs-integrator', label: 'Integrator', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=amp-integ.txt', openLabel: 'Open in CircuitJS' },
    { id: 'cs-differentiator', label: 'Differentiator', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=amp-dfdx.txt', openLabel: 'Open in CircuitJS' },
    { id: 'cs-schmitt', label: 'Schmitt Trigger', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=amp-schmitt.txt', openLabel: 'Open in CircuitJS' },
  ],
  electrical_machines: [
    { id: 'em-transformer', label: 'Transformer', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=transformer.txt', openLabel: 'Open in CircuitJS' },
    { id: 'em-stepup', label: 'Step-Up Transformer', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=transformerup.txt', openLabel: 'Open in CircuitJS' },
    { id: 'em-stepdown', label: 'Step-Down Transformer', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=transformerdown.txt', openLabel: 'Open in CircuitJS' },
    { id: 'em-inductive', label: 'Inductive Kickback', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=inductkick.txt', openLabel: 'Open in CircuitJS' },
    { id: 'em-powerfactor', label: 'Power Factor', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=powerfactor1.txt', openLabel: 'Open in CircuitJS' },
    { id: 'em-pfc', label: 'Power Factor Correction', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=powerfactor2.txt', openLabel: 'Open in CircuitJS' },
    { id: 'em-motor-control', label: 'Motor Control (ACC PLC)', url: 'https://accautomation.ca/simulator/acc-plc-simulator.html', openLabel: 'Open ACC PLC' },
    { id: 'em-wokwi-motor', label: 'Motor Driver (Arduino)', url: 'https://wokwi.com/projects/new/arduino-uno', openLabel: 'Open in Wokwi' },
    { id: 'em-python', label: 'Python (Machines)', url: jupyterUrl(JUPYTER_CODES['em-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  power_systems: [
    { id: 'ps-python', label: 'Python (Load Flow)', url: jupyterUrl(JUPYTER_CODES['ps-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'ps-octave', label: 'Octave / MATLAB', url: OCTAVE_URL, openLabel: 'Open Octave' },
    { id: 'ps-phaseseq', label: 'Phase-Sequence Network', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=phaseseq.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ps-longdist', label: 'Long Distance Transmission', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=longdist.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ps-tl', label: 'Transmission Line', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=tl.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ps-tlstand', label: 'Standing Wave (T-Line)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=tlstand.txt', openLabel: 'Open in CircuitJS' },
    { id: 'ps-powerfactor', label: 'Power Factor', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=powerfactor1.txt', openLabel: 'Open in CircuitJS' },
  ],
  industrial_automation: [
    { id: 'ia-acc-plc', label: 'ACC PLC Simulator', url: 'https://accautomation.ca/simulator/acc-plc-simulator.html', openLabel: 'Open ACC PLC' },
    { id: 'ia-acc-panel', label: 'ACC Control Panel', url: 'https://accautomation.ca/simulator/acc-panel-scene.html', openLabel: 'Open Scene' },
    { id: 'ia-acc-traffic', label: 'ACC Traffic Light', url: 'https://accautomation.ca/simulator/acc-traffic-scene.html', openLabel: 'Open Scene' },
    { id: 'ia-acc-conveyor', label: 'ACC Conveyor', url: 'https://accautomation.ca/simulator/acc-conveyor-scene.html', openLabel: 'Open Scene' },
    { id: 'ia-acc-tank', label: 'ACC Tank Fill', url: 'https://accautomation.ca/simulator/acc-tank-scene.html', openLabel: 'Open Scene' },
    { id: 'ia-acc-palletizer', label: 'ACC Pick & Place', url: 'https://accautomation.ca/simulator/acc-palletizer-scene.html', openLabel: 'Open Scene' },
    { id: 'ia-plcfiddle', label: 'PLC Fiddle (Ladder)', url: 'https://www.plcfiddle.com/', openLabel: 'Open PLC Fiddle' },
    { id: 'ia-arduino-plc', label: 'Arduino (PLC Sim)', url: 'https://wokwi.com/projects/new/arduino-uno', openLabel: 'Open in Wokwi' },
    { id: 'ia-esp32-scada', label: 'ESP32 (SCADA Node)', url: 'https://wokwi.com/projects/new/esp32', openLabel: 'Open in Wokwi' },
    { id: 'ia-pico-vfd', label: 'RPi Pico (VFD Sim)', url: 'https://wokwi.com/projects/new/pi-pico', openLabel: 'Open in Wokwi' },
  ],
  measurements: [
    { id: 'mi-scope', label: 'Virtual Oscilloscope', url: 'https://academo.org/demos/virtual-oscilloscope/?embedded=true', openLabel: 'Open Scope' },
    { id: 'inst-funcgen', label: 'Function Generator', url: '', openLabel: 'Open Function Gen', isNativeBlock: true },
    { id: 'inst-spectrum', label: 'Spectrum Analyzer', url: '', isNativeBlock: true },
    { id: 'mi-wheatstone', label: 'Wheatstone Bridge', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=wheatstone.txt', openLabel: 'Open in CircuitJS' },
    { id: 'net-vdiv', label: 'Voltage Divider', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=voltdivide.txt', openLabel: 'Open CircuitJS' },
    { id: 'mi-thevenin', label: 'Thevenin Theorem', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=thevenin.txt', openLabel: 'Open in CircuitJS' },
    { id: 'mi-norton', label: 'Norton Theorem', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=norton.txt', openLabel: 'Open in CircuitJS' },
    { id: 'mi-python', label: 'Python (Analysis)', url: jupyterUrl(JUPYTER_CODES['mi-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  renewable_energy: [
    { id: 're-diode', label: 'Solar Cell (Diode)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=diodevar.txt', openLabel: 'Open in CircuitJS' },
    { id: 're-fullrect', label: 'Full-Wave Rectifier', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=fullrect.txt', openLabel: 'Open in CircuitJS' },
    { id: 're-voltdouble', label: 'Voltage Doubler', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=voltdouble.txt', openLabel: 'Open in CircuitJS' },
    { id: 're-battery', label: 'Battery / Charger Model', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=cap.txt', openLabel: 'Open in CircuitJS' },
    { id: 're-iot', label: 'Solar IoT Monitor', url: 'https://wokwi.com/projects/new/esp32', openLabel: 'Open in Wokwi' },
    { id: 're-python', label: 'Python (Modeling)', url: jupyterUrl(JUPYTER_CODES['re-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 're-esp32', label: 'ESP32 (IoT Monitor)', url: 'https://wokwi.com/projects/new/esp32', openLabel: 'Open in Wokwi' },
  ],
  protection_switchgear: [
    { id: 'sw-python', label: 'Python (Relay Curves)', url: jupyterUrl(JUPYTER_CODES['sw-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'sw-octave', label: 'Octave / MATLAB', url: OCTAVE_URL, openLabel: 'Open Octave' },
    { id: 'sw-relay-plc', label: 'Relay Logic (ACC PLC)', url: 'https://accautomation.ca/simulator/acc-plc-simulator.html', openLabel: 'Open ACC PLC' },
    { id: 'sw-inductive', label: 'Inductive Kickback', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=inductkick.txt', openLabel: 'Open in CircuitJS' },
    { id: 'sw-transformer', label: 'CT/PT Transformer Model', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=transformer.txt', openLabel: 'Open in CircuitJS' },
    { id: 'sw-phase-sequence', label: 'Phase Sequence', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=phaseseq.txt', openLabel: 'Open in CircuitJS' },
  ],
  numerical_lab: [
    { id: 'num-python', label: 'Python EEE Calculator', url: jupyterUrl(JUPYTER_CODES['num-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'num-octave', label: 'Octave / MATLAB', url: OCTAVE_URL, openLabel: 'Open Octave' },
    { id: 'num-loadflow', label: 'Python Load Flow', url: jupyterUrl(JUPYTER_CODES['ps-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'num-control', label: 'Python Control Systems', url: jupyterUrl(JUPYTER_CODES['cs-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'num-machines', label: 'Python Machines', url: jupyterUrl(JUPYTER_CODES['em-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'num-renewable', label: 'Python Renewable', url: jupyterUrl(JUPYTER_CODES['re-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  eee_placement: [
    { id: 'plc-practice', label: 'PLC Practice', url: 'https://accautomation.ca/simulator/acc-plc-simulator.html', openLabel: 'Open ACC PLC' },
    { id: 'placement-numerical', label: 'EEE Numerical Practice', url: jupyterUrl(JUPYTER_CODES['placement-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'placement-circuit', label: 'Circuit Debugging', url: 'https://lushprojects.com/circuitjs/circuitjs.html?ctz=CQAgjCAMB0l3BWcA2aAOMB2ALGXyEBOAbmAmwmwFMBaMMAKACcQUFDxCRsKBmEbqh7ce-YUJR1BkEJByYAHiGC4ALpzV8hOvYb37MBg5QCMvIbsPG6Zjlx5A', openLabel: 'Open CircuitJS' },
    { id: 'placement-octave', label: 'MATLAB/Octave Practice', url: OCTAVE_URL, openLabel: 'Open Octave' },
    { id: 'placement-career', label: 'AcadMix Career Toolkit', url: '/career', openLabel: 'Open Toolkit', noEmbed: true },
    { id: 'placement-hub', label: 'AcadMix Placement Hub', url: '/placement-prep', openLabel: 'Open Placement Hub', noEmbed: true },
  ],
};

// ── Civil Lab Categories & Boards ───────────────────────────────────────────
const CIVIL_SIMULATOR_CATEGORIES = [
  { id: 'structural', label: 'Structural Analysis', icon: <Blueprint size={16} weight="duotone" />, accent: 'rose' },
  { id: 'geotechnical', label: 'Geotechnical', icon: <Atom size={16} weight="duotone" />, accent: 'amber' },
  { id: 'fluid_mechanics', label: 'Fluid Mechanics', icon: <Drop size={16} weight="duotone" />, accent: 'sky' },
  { id: 'surveying', label: 'Surveying & GIS', icon: <Compass size={16} weight="duotone" />, accent: 'emerald' },
  { id: 'cad_bim', label: 'CAD / BIM', icon: <Cube size={16} weight="duotone" />, accent: 'violet' },
  { id: 'transportation', label: 'Transportation Engg', icon: <Path size={16} weight="duotone" />, accent: 'indigo' },
  { id: 'environmental', label: 'Environmental Engg', icon: <Tree size={16} weight="duotone" />, accent: 'teal' },
  { id: 'concrete_steel', label: 'Concrete & Steel Design', icon: <Wall size={16} weight="duotone" />, accent: 'rose' },
  { id: 'estimation_quantity', label: 'Estimation & Quantity', icon: <ChartBar size={16} weight="duotone" />, accent: 'amber' },
  { id: 'construction_management', label: 'Construction Management', icon: <Clock size={16} weight="duotone" />, accent: 'violet' },
];

const CIVIL_SIMULATOR_BOARDS: Record<string, { id: string; label: string; url: string; openLabel?: string; externalUrl?: string; externalLabel?: string; octaveUrl?: string; noEmbed?: boolean; isNativeBlock?: boolean; civilTool?: CivilStudioTool }[]> = {
  structural: [
    { id: 'civil-structural-studio', label: 'Structural Studio', url: '', isNativeBlock: true, civilTool: 'structural' },
    { id: 'civil-frame-studio', label: 'Frame Analysis Studio', url: '', isNativeBlock: true, civilTool: 'frame' },
    { id: 'civil-staad-frame-studio', label: 'STAAD-like Frame Modeler', url: '', isNativeBlock: true, civilTool: 'staadFrame' },
    { id: 'civil-truss-studio', label: 'Truss Analysis Studio', url: '', isNativeBlock: true, civilTool: 'truss' },
    { id: 'civil-bridge-studio', label: 'Bridge Basics Studio', url: '', isNativeBlock: true, civilTool: 'bridge' },
    { id: 'st-python', label: 'Python (Stiffness)', url: jupyterUrl(JUPYTER_CODES['st-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  geotechnical: [
    { id: 'civil-geotech-studio', label: 'Bearing Capacity Studio', url: '', isNativeBlock: true, civilTool: 'geotech' },
    { id: 'civil-retaining-studio', label: 'Retaining Wall & Slope Studio', url: '', isNativeBlock: true, civilTool: 'retaining' },
    { id: 'civil-soil-lab-studio', label: 'Soil Classification & Compaction', url: '', isNativeBlock: true, civilTool: 'soilLab' },
    { id: 'civil-pile-studio', label: 'Pile Group Studio', url: '', isNativeBlock: true, civilTool: 'pile' },
    { id: 'geo-python', label: 'Python (Soil)', url: jupyterUrl(JUPYTER_CODES['geo-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'geo-settle-native', label: 'Settlement Calc (Native)', url: '', isNativeBlock: true },
  ],
  fluid_mechanics: [
    { id: 'civil-hydraulics-studio', label: 'Hydraulics Studio', url: '', isNativeBlock: true, civilTool: 'hydraulics' },
    { id: 'civil-water-network-studio', label: 'Water Network Studio', url: '', isNativeBlock: true, civilTool: 'waterNetwork' },
    { id: 'civil-open-channel-studio', label: 'Open Channel Studio', url: '', isNativeBlock: true, civilTool: 'openChannel' },
    { id: 'civil-stormwater-studio', label: 'Drainage & Stormwater Network', url: '', isNativeBlock: true, civilTool: 'stormwater' },
    { id: 'fm-python', label: 'Python (Flow)', url: jupyterUrl(JUPYTER_CODES['fm-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'fm-rlc', label: 'RLC Circuit (Pipe Analogy)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=lrc.txt', openLabel: 'Open in CircuitJS' },
  ],
  surveying: [
    { id: 'civil-survey-studio', label: 'Survey Traverse Studio', url: '', isNativeBlock: true, civilTool: 'survey' },
    { id: 'civil-leveling-studio', label: 'Survey Leveling Studio', url: '', isNativeBlock: true, civilTool: 'leveling' },
    { id: 'civil-earthwork-studio', label: 'GIS / Contour / Earthwork', url: '', isNativeBlock: true, civilTool: 'earthwork' },
    { id: 'civil-setout-studio', label: 'Site Survey Layout Setout', url: '', isNativeBlock: true, civilTool: 'setout' },
  ],
  cad_bim: [
    { id: 'civil-cad-studio', label: 'CAD/BIM Quantity Sketcher', url: '', isNativeBlock: true, civilTool: 'cad' },
    { id: 'civil-bim-revit-studio', label: 'BIM / Revit Concept Studio', url: '', isNativeBlock: true, civilTool: 'bimRevit' },
    { id: 'civil-drafting-practice-studio', label: 'AutoCAD Drafting Practice', url: '', isNativeBlock: true, civilTool: 'draftingPractice' },
    { id: 'civil-drawing-takeoff-studio', label: 'Quantity Takeoff From Drawing', url: '', isNativeBlock: true, civilTool: 'drawingTakeoff' },
    { id: 'cad-python', label: 'Python (CAD Math)', url: jupyterUrl(JUPYTER_CODES['cad-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  transportation: [
    { id: 'civil-road-studio', label: 'Road Geometry Studio', url: '', isNativeBlock: true, civilTool: 'transport' },
    { id: 'civil-pavement-studio', label: 'Pavement Design Studio', url: '', isNativeBlock: true, civilTool: 'pavement' },
    { id: 'civil-road-cross-section-studio', label: 'Road Estimation & Cross-Section', url: '', isNativeBlock: true, civilTool: 'roadCrossSection' },
    { id: 'tr-python', label: 'Python (Traffic)', url: jupyterUrl(JUPYTER_CODES['tr-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  environmental: [
    { id: 'civil-environment-studio', label: 'Environmental Systems Studio', url: '', isNativeBlock: true, civilTool: 'environment' },
    { id: 'civil-services-studio', label: 'Building Services Civil Studio', url: '', isNativeBlock: true, civilTool: 'services' },
    { id: 'env-python', label: 'Python (WTP/STP)', url: jupyterUrl(JUPYTER_CODES['env-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  concrete_steel: [
    { id: 'civil-rcc-studio', label: 'RCC Beam Design Studio', url: '', isNativeBlock: true, civilTool: 'concrete' },
    { id: 'civil-steel-studio', label: 'Steel Structure Design Studio', url: '', isNativeBlock: true, civilTool: 'steel' },
    { id: 'civil-mix-design-studio', label: 'Concrete Mix Design Studio', url: '', isNativeBlock: true, civilTool: 'mixDesign' },
    { id: 'civil-column-footing-studio', label: 'Column & Footing Design', url: '', isNativeBlock: true, civilTool: 'columnFooting' },
    { id: 'civil-masonry-studio', label: 'Masonry Design Studio', url: '', isNativeBlock: true, civilTool: 'masonry' },
    { id: 'civil-rebar-studio', label: 'Rebar Detailing Studio', url: '', isNativeBlock: true, civilTool: 'rebar' },
    { id: 'civil-bbs-studio', label: 'Bar Bending Schedule Studio', url: '', isNativeBlock: true, civilTool: 'bbs' },
    { id: 'civil-is-code-checker-studio', label: 'IS Code Design Checker', url: '', isNativeBlock: true, civilTool: 'isCodeChecker' },
    { id: 'civil-seismic-studio', label: 'Seismic Design Studio', url: '', isNativeBlock: true, civilTool: 'seismic' },
    { id: 'civil-wind-studio', label: 'Wind Load Studio', url: '', isNativeBlock: true, civilTool: 'wind' },
    { id: 'cs-python', label: 'Python (IS 456)', url: jupyterUrl(JUPYTER_CODES['cs-python-civil']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  estimation_quantity: [
    { id: 'civil-estimation-studio', label: 'Quantity & BBS Studio', url: '', isNativeBlock: true, civilTool: 'estimation' },
    { id: 'civil-cost-estimator-studio', label: 'Construction Cost Estimator', url: '', isNativeBlock: true, civilTool: 'costEstimator' },
    { id: 'civil-formwork-studio', label: 'Formwork & Scaffolding', url: '', isNativeBlock: true, civilTool: 'formwork' },
    { id: 'civil-rate-analysis-studio', label: 'Rate Analysis Studio', url: '', isNativeBlock: true, civilTool: 'rateAnalysis' },
    { id: 'civil-qc-lab-studio', label: 'Quality Control Lab Studio', url: '', isNativeBlock: true, civilTool: 'qcLab' },
    { id: 'civil-qa-docs-studio', label: 'Construction QA Document Studio', url: '', isNativeBlock: true, civilTool: 'qaDocs' },
    { id: 'civil-tender-studio', label: 'Tender & BOQ Comparison', url: '', isNativeBlock: true, civilTool: 'tender' },
  ],
  construction_management: [
    { id: 'civil-planning-studio', label: 'Construction Planning Studio', url: '', isNativeBlock: true, civilTool: 'planning' },
    { id: 'civil-project-control-studio', label: 'Project Planning Cost-Control', url: '', isNativeBlock: true, civilTool: 'projectControl' },
    { id: 'civil-claims-delay-studio', label: 'Contract Claims & Delay Analysis', url: '', isNativeBlock: true, civilTool: 'claimsDelay' },
    { id: 'civil-equipment-studio', label: 'Equipment Productivity Studio', url: '', isNativeBlock: true, civilTool: 'equipment' },
    { id: 'civil-site-layout-studio', label: 'Site Layout Planning Studio', url: '', isNativeBlock: true, civilTool: 'siteLayout' },
    { id: 'civil-safety-inspection-studio', label: 'Safety Inspection Studio', url: '', isNativeBlock: true, civilTool: 'safetyInspection' },
  ],
};

// ── Mech Lab Categories & Boards ─────────────────────────────────────────────
const MECH_SIMULATOR_CATEGORIES = [
  { id: 'thermodynamics', label: 'Thermodynamics', icon: <ThermometerHot size={16} weight="duotone" />, accent: 'rose' },
  { id: 'fluid_mech', label: 'Fluid Mechanics', icon: <Drop size={16} weight="duotone" />, accent: 'sky' },
  { id: 'som', label: 'Strength of Materials', icon: <Blueprint size={16} weight="duotone" />, accent: 'amber' },
  { id: 'machine_design', label: 'Machine Design', icon: <Gear size={16} weight="duotone" />, accent: 'violet' },
  { id: 'manufacturing', label: 'Manufacturing & CNC', icon: <Wrench size={16} weight="duotone" />, accent: 'emerald' },
  { id: 'mechatronics', label: 'Mechatronics & Robotics', icon: <Robot size={16} weight="duotone" />, accent: 'teal' },
  { id: 'dynamics', label: 'Dynamics & Vibrations', icon: <WaveSine size={16} weight="duotone" />, accent: 'indigo' },
  { id: 'automotive', label: 'Automotive & IC Engines', icon: <Car size={16} weight="duotone" />, accent: 'rose' },
  { id: 'cad_3d', label: 'CAD / 3D Modeling', icon: <Cube size={16} weight="duotone" />, accent: 'sky' },
  { id: 'industrial_mech', label: 'Industrial & Reliability', icon: <Gauge size={16} weight="duotone" />, accent: 'violet' },
];

const MECH_SIMULATOR_BOARDS: Record<string, { id: string; label: string; url: string; openLabel?: string; externalUrl?: string; externalLabel?: string; octaveUrl?: string; noEmbed?: boolean; isNativeBlock?: boolean; mechTool?: MechanicalStudioTool; civilTool?: CivilStudioTool }[]> = {
  thermodynamics: [
    { id: 'mech-thermo-cycle', label: 'Thermodynamic Cycle Studio', url: '', isNativeBlock: true, mechTool: 'thermoCycle' },
    { id: 'mech-heat-exchanger', label: 'Heat Exchanger Studio', url: '', isNativeBlock: true, mechTool: 'heatExchanger' },
    { id: 'mech-refrigeration', label: 'Refrigeration & AC Studio', url: '', isNativeBlock: true, mechTool: 'refrigeration' },
    { id: 'mech-boiler-plant', label: 'Boiler / Steam Plant Studio', url: '', isNativeBlock: true, mechTool: 'boilerPlant' },
    { id: 'mech-turbine-compressor', label: 'Turbine & Compressor Studio', url: '', isNativeBlock: true, mechTool: 'turbineCompressor' },
    { id: 'th-python', label: 'Python (Thermo)', url: jupyterUrl(JUPYTER_CODES['th-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'th-rc-thermal', label: 'RC Thermal Analogy', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=lrc.txt', openLabel: 'Open in CircuitJS' },
  ],
  fluid_mech: [
    { id: 'mech-pipe-flow', label: 'Fluid Pipe Flow Studio', url: '', isNativeBlock: true, mechTool: 'pipeFlow' },
    { id: 'mech-pump', label: 'Pump & Turbomachinery Studio', url: '', isNativeBlock: true, mechTool: 'pump' },
    { id: 'mech-bernoulli', label: 'Bernoulli / Venturi Studio', url: '', isNativeBlock: true, mechTool: 'bernoulli' },
    { id: 'mech-open-channel', label: 'Open Channel Flow Studio', url: '', isNativeBlock: true, mechTool: 'openChannel' },
    { id: 'mech-drag-wind-tunnel', label: 'Wind Tunnel & Drag Studio', url: '', isNativeBlock: true, mechTool: 'dragWindTunnel' },
    { id: 'fl-python', label: 'Python (Fluids)', url: jupyterUrl(JUPYTER_CODES['fl-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'fl-pipe-rlc', label: 'Pipe Flow (RLC Analogy)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=lrc.txt', openLabel: 'Open in CircuitJS' },
  ],
  som: [
    { id: 'mech-beam-stress', label: 'AcadMix Beam Calculator', url: '', isNativeBlock: true, mechTool: 'beamStress' },
    { id: 'mech-mohrs-circle', label: "Mohr's Circle Studio", url: '', isNativeBlock: true, mechTool: 'mohrsCircle' },
    { id: 'mech-material-testing', label: 'Material Testing Studio', url: '', isNativeBlock: true, mechTool: 'materialTesting' },
    { id: 'mech-torsion-shaft', label: 'Torsion Shaft Studio', url: '', isNativeBlock: true, mechTool: 'torsionShaft' },
    { id: 'mech-column-buckling', label: 'Column Buckling Studio', url: '', isNativeBlock: true, mechTool: 'columnBuckling' },
    { id: 'mech-pressure-vessel', label: 'Pressure Vessel Studio', url: '', isNativeBlock: true, mechTool: 'pressureVessel' },
    { id: 'som-mohr', label: "Mohr's Circle", url: 'https://mechanicalc.com/calculators/mohrs-circle/', openLabel: 'Open Mechanicalc' },
    { id: 'mech-truss-solver', label: 'AcadMix Truss Solver', url: '', isNativeBlock: true, civilTool: 'truss' },
    { id: 'som-python', label: 'Python (SOM)', url: jupyterUrl(JUPYTER_CODES['som-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  machine_design: [
    { id: 'mech-shaft-gear', label: 'Shaft & Gear Design Studio', url: '', isNativeBlock: true, mechTool: 'shaftGear' },
    { id: 'mech-four-bar', label: 'Four-Bar Mechanism Studio', url: '', isNativeBlock: true, mechTool: 'fourBar' },
    { id: 'md-4bar', label: '4-Bar Linkage Sim', url: 'https://mevirtuoso.com/four-bar-linkage-simulator/', openLabel: 'Open ME Virtuoso' },
    { id: 'md-python', label: 'Python (Mechanisms)', url: jupyterUrl(JUPYTER_CODES['md-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  manufacturing: [
    { id: 'mech-cnc', label: 'CNC Machining Studio', url: '', isNativeBlock: true, mechTool: 'cnc' },
    { id: 'mech-welding', label: 'Welding & Fabrication Studio', url: '', isNativeBlock: true, mechTool: 'welding' },
    { id: 'mech-metrology', label: 'Metrology Studio', url: '', isNativeBlock: true, mechTool: 'metrology' },
    { id: 'mech-casting-foundry', label: 'Casting & Foundry Studio', url: '', isNativeBlock: true, mechTool: 'castingFoundry' },
    { id: 'mech-sheet-metal', label: 'Sheet Metal & Forming Studio', url: '', isNativeBlock: true, mechTool: 'sheetMetal' },
    { id: 'mech-additive-manufacturing', label: 'Additive Manufacturing Studio', url: '', isNativeBlock: true, mechTool: 'additiveManufacturing' },
    { id: 'mfg-ncviewer', label: 'G-code Viewer', url: 'https://ncviewer.com/', openLabel: 'Open NC Viewer' },
    { id: 'mfg-gcodews', label: 'G-code Analyzer', url: 'https://gcode.ws/', openLabel: 'Open gCode.ws' },
    { id: 'mfg-python', label: 'Python (CNC)', url: jupyterUrl(JUPYTER_CODES['mfg-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  mechatronics: [
    { id: 'mech-robot-arm', label: 'Robotics Arm Studio', url: '', isNativeBlock: true, mechTool: 'robotArm' },
    { id: 'mech-pid-control', label: 'PID Control Studio', url: '', isNativeBlock: true, mechTool: 'pidControl' },
    { id: 'mt-arduino', label: 'Arduino Uno', url: 'https://wokwi.com/projects/new/arduino-uno', openLabel: 'Open in Wokwi' },
    { id: 'mt-esp32', label: 'ESP32', url: 'https://wokwi.com/projects/new/esp32', openLabel: 'Open in Wokwi' },
    { id: 'mt-pico', label: 'RPi Pico', url: 'https://wokwi.com/projects/new/pi-pico', openLabel: 'Open in Wokwi' },
    { id: 'mt-python', label: 'Python (Control)', url: jupyterUrl(JUPYTER_CODES['mt-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  dynamics: [
    { id: 'mech-vibration', label: 'Dynamics & Vibration Studio', url: '', isNativeBlock: true, mechTool: 'vibration' },
    { id: 'dy-spring-rlc', label: 'Spring-Mass (RLC)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=lrc.txt', openLabel: 'Open in CircuitJS' },
    { id: 'dy-python', label: 'Python (Vibrations)', url: jupyterUrl(JUPYTER_CODES['dy-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  automotive: [
    { id: 'mech-ic-engine', label: 'IC Engine Performance Studio', url: '', isNativeBlock: true, mechTool: 'icEngine' },
    { id: 'mech-vehicle-dynamics', label: 'Vehicle Dynamics Studio', url: '', isNativeBlock: true, mechTool: 'vehicleDynamics' },
    { id: 'au-python', label: 'Python (Engines)', url: jupyterUrl(JUPYTER_CODES['au-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  cad_3d: [
    { id: 'mech-cad3d-native', label: 'CAD / 3D Modeling Studio', url: '', isNativeBlock: true, mechTool: 'cad3d' },
    { id: 'cad-openscad', label: 'OpenJSCAD (Parametric)', url: 'https://openjscad.xyz/', openLabel: 'Open JSCAD' },
    { id: 'cad-threejs', label: 'Three.js Editor', url: 'https://threejs.org/editor/', openLabel: 'Open 3D Editor' },
    { id: 'cad-python', label: 'Python (CadQuery)', url: jupyterUrl(JUPYTER_CODES['cad-python-3d']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
  ],
  industrial_mech: [
    { id: 'mech-industrial-engineering', label: 'Industrial Engineering Studio', url: '', isNativeBlock: true, mechTool: 'industrialEngineering' },
    { id: 'mech-maintenance-reliability', label: 'Maintenance & Reliability Studio', url: '', isNativeBlock: true, mechTool: 'maintenanceReliability' },
  ],
};

const SIM_ACCENT_CLASSES: Record<string, { active: string; pill: string; btn: string }> = {
  teal:    { active: 'bg-teal-500 text-white shadow-sm shadow-teal-500/25', pill: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', btn: 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/20' },
  violet:  { active: 'bg-violet-500 text-white shadow-sm shadow-violet-500/25', pill: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', btn: 'bg-violet-500 hover:bg-violet-600 shadow-violet-500/20' },
  sky:     { active: 'bg-sky-500 text-white shadow-sm shadow-sky-500/25', pill: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', btn: 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20' },
  amber:   { active: 'bg-amber-500 text-white shadow-sm shadow-amber-500/25', pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' },
  emerald: { active: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25', pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' },
  rose:    { active: 'bg-rose-500 text-white shadow-sm shadow-rose-500/25', pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', btn: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' },
  indigo:  { active: 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/25', pill: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', btn: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20' },
};

const DEFAULT_TEMPLATES = {
  python: '# Write your Python code here\n\ndef main():\n    print("Hello, World!")\n\nmain()\n',
  javascript: '// Write your JavaScript code here\n\nfunction main() {\n  console.log("Hello, World!");\n}\n\nmain();\n',
  java: 'public class Solution {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
  r: '# Write your R code here\n\n# WebR allows plotting natively! Try running this:\nplot(mtcars$wt, mtcars$mpg, \n     main="Car Weight vs MPG", \n     xlab="Weight (1000 lbs)", ylab="Miles/(US) gallon", \n     col="blue", pch=19)\n',
  matlab: '% Write your MATLAB / Octave code here\n\nx = linspace(0, 2*pi, 100);\ny = sin(x);\ndisp("Hello, World from MATLAB/Octave!");\n',
  bash: '#!/bin/bash\n\n# Write your shell script here\necho "Hello, World from Bash!"\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
  csharp: 'using System;\n\nclass Solution {\n    static void Main(string[] args) {\n        Console.WriteLine("Hello, World!");\n    }\n}\n'
};

const CodePlayground = ({ navigate, user }) => {
  const { isDark } = useTheme();

  // ── Refresh-aware session persistence ──────────────────────────────────────
  // sessionStorage keeps the challenge alive across F5 refreshes.
  // On SPA navigation away (back button), we clear it so the playground starts clean.
  const isRefreshingRef = useRef(false);

  const _restoreChallenge = () => {
    try {
      const raw = sessionStorage.getItem('acadmix_active_challenge');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const [activeChallenge, setActiveChallenge] = useState(_restoreChallenge);

  const getCodeStorageKey = (ch, lang) => `acadmix_code_${ch ? ch.id : 'free'}_${lang}`;

  // Derive initial code & test cases from the restored challenge (if any)
  const [code, setCode] = useState(() => {
    const ch = _restoreChallenge();
    const lang = ch?.language || 'python';
    const saved = sessionStorage.getItem(getCodeStorageKey(ch, lang));
    if (saved !== null) return saved;
    if (ch) {
      return ch.init_code?.[lang] || ch.template_code || DEFAULT_TEMPLATES[lang];
    }
    return DEFAULT_TEMPLATES['python'];
  });
  const [language, setLanguage] = useState(() => {
    const ch = _restoreChallenge();
    return ch?.language || 'python';
  });
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [running, setRunning] = useState(false);
  const [execTime, setExecTime] = useState(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef(null);
  const [wokwiBoard, setWokwiBoard] = useState('arduino-uno');
  const [simCategory, setSimCategory] = useState('embedded');
  const [useOctaveMode, setUseOctaveMode] = useState(false);
  const [isLabFullScreen, setIsLabFullScreen] = useState(false);

  // ── ECE / EEE / Civil Lab computed values ──────────────────────────────────
  const _isEEELab = language === 'eeelab';
  const _isCivilLab = language === 'civillab';
  const _isMechLab = language === 'mechlab';
  const _activeCats = _isMechLab ? MECH_SIMULATOR_CATEGORIES : _isCivilLab ? CIVIL_SIMULATOR_CATEGORIES : _isEEELab ? EEE_SIMULATOR_CATEGORIES : SIMULATOR_CATEGORIES;
  const _activeBoards = _isMechLab ? MECH_SIMULATOR_BOARDS : _isCivilLab ? CIVIL_SIMULATOR_BOARDS : _isEEELab ? EEE_SIMULATOR_BOARDS : SIMULATOR_BOARDS;
  const _simCat = _activeCats.find(c => c.id === simCategory) || _activeCats[0];
  const _simBoards = _activeBoards[simCategory] || [];
  const _simActiveBoard = _simBoards.find(b => b.id === wokwiBoard) || _simBoards[0];
  const _simAccent = SIM_ACCENT_CLASSES[_simCat.accent] || SIM_ACCENT_CLASSES.teal;
  const _isNativeSurface = Boolean((_simActiveBoard as any)?.isNativeBlock || (_simActiveBoard as any)?.isNativeWasm);
  const [rPlots, setRPlots] = useState([]);
  const [remoteImages, setRemoteImages] = useState([]);
  const [webrLoading, setWebrLoading] = useState(false);
  const webrRef = useRef(null);

  // Native Simulation State
  const [nativeOutput, setNativeOutput] = useState<string | React.ReactNode>(null);
  const [isNativeSimulating, setIsNativeSimulating] = useState(false);

  // Clear output when switching boards
  useEffect(() => {
    setNativeOutput(null);
  }, [wokwiBoard, simCategory, language]);

  const handleNativeSimulate = async (simCode: string, lang: string) => {
    setIsNativeSimulating(true);
    setNativeOutput(null);
    try {
      if (lang === 'spice') {
        const simPromise = async () => {
          const sim = new EEcircuitSimulation();
          await sim.start();
          sim.setNetList(simCode);
          return await sim.runSim();
        };

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Simulation timed out after 15 seconds. Ensure your syntax is correct and does not include external files.')), 15000)
        );

        const result = await Promise.race([simPromise(), timeoutPromise]) as any;
        
        // Very basic result parsing for demonstration
        if (result && result.error) {
           setNativeOutput(`Error: ${result.error}`);
        } else if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
           setNativeOutput(<SpiceChart data={result.data} />);
        } else if (result && result.stdout) {
           setNativeOutput(result.stdout);
        } else {
           setNativeOutput(JSON.stringify(result, null, 2));
        }
      } else if (lang === 'verilog') {
        const response = await api.post('/v1/simulate/verilog', { code: simCode });
        const result = response.data;
        if (result && result.error) {
           setNativeOutput(`Error:\n${result.stdout || ''}\n${result.error}`);
        } else if (result && result.data && Array.isArray(result.data)) {
           // We can reuse SpiceChart for now since the JSON format returned by the backend matches!
           setNativeOutput(
             <div className="flex flex-col h-full gap-4">
               <div className="flex-1 min-h-[300px]">
                 <SpiceChart data={result.data} />
               </div>
               {result.stdout && (
                 <div className="h-1/3 border-t border-gray-200 dark:border-gray-700 pt-4">
                   <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Compiler Output</h4>
                   <pre className="font-mono text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap overflow-y-auto h-[calc(100%-24px)]">
                     {result.stdout}
                   </pre>
                 </div>
               )}
             </div>
           );
        } else if (result && result.stdout) {
           setNativeOutput(result.stdout);
        } else {
           setNativeOutput(JSON.stringify(result, null, 2));
        }
      } else {
        setNativeOutput(`Simulation for language ${lang} not implemented yet.`);
      }
    } catch (err: any) {
      setNativeOutput(`Simulation failed: ${err.message}`);
    } finally {
      setIsNativeSimulating(false);
    }
  };

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };
    if (showLangMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLangMenu]);
  
  const [showChallengesModal, setShowChallengesModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [aiReview, setAiReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const [showCoach, setShowCoach] = useState(false);
  const [coachMessages, setCoachMessages] = useState([]);
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const [coachInput, setCoachInput] = useState('');
  const endOfMessagesRef = useRef(null);
  
  const [history, setHistory] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [isChallengesLoading, setIsChallengesLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  const [activeConsoleTab, setActiveConsoleTab] = useState('test_cases');
  const formatPythonLiteral = (str) => {
    if (typeof str === 'string' && str.startsWith('"') && str.endsWith('"') && str.includes('\\n')) {
      return str.slice(1, -1).replace(/\\n/g, '\n');
    }
    return str || '';
  };

  const [userTestCases, setUserTestCases] = useState(() => {
    const ch = _restoreChallenge();
    if (ch?.test_cases) {
      const unhidden = ch.test_cases.filter(tc => !tc.is_hidden).map(tc => ({
        input_data: formatPythonLiteral(tc.input_data),
        expected_output: tc.expected_output
      }));
      if (unhidden.length > 0) return unhidden;
    }
    return [{ input_data: '', expected_output: '' }];
  });
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);

  const handleLoadChallenge = (challenge) => {
    setActiveChallenge(challenge);
    const lang = challenge.language || 'python';
    setLanguage(lang);
    // Resolve starter template: init_code[lang] → template_code → default
    const saved = sessionStorage.getItem(getCodeStorageKey(challenge, lang));
    if (saved !== null) {
      setCode(saved);
    } else {
      const starterCode = challenge.init_code?.[lang] || challenge.template_code || DEFAULT_TEMPLATES[lang];
      setCode(starterCode);
    }
    setOutput(null);
    setExecTime(null);
    setRPlots([]);
    setRemoteImages([]);
    setActiveConsoleTab('results');
    setShowChallengesModal(false);
    
    if (challenge.test_cases) {
       const unhidden = challenge.test_cases.filter(tc => !tc.is_hidden).map(tc => ({
           input_data: formatPythonLiteral(tc.input_data),
           expected_output: tc.expected_output
       }));
       setUserTestCases(unhidden.length > 0 ? unhidden : [{ input_data: '', expected_output: '' }]);
    }
    setActiveTestCaseIdx(0);
    setActiveConsoleTab('test_cases');
  };

  const handleExitChallenge = () => {
    setActiveChallenge(null);
    setShowCoach(false);
    
    // Restore free mode code
    const savedFreeCode = sessionStorage.getItem(getCodeStorageKey(null, language));
    if (savedFreeCode !== null) {
      setCode(savedFreeCode);
    } else {
      setCode(DEFAULT_TEMPLATES[language] || '');
    }
    
    setOutput(null);
    setExecTime(null);
    setRPlots([]);
    setRemoteImages([]);
    setActiveConsoleTab('results');
    setUserTestCases([{ input_data: '', expected_output: '' }]);
  };

  // Persist activeChallenge to sessionStorage (survives refresh)
  useEffect(() => {
    if (activeChallenge) {
      sessionStorage.setItem('acadmix_active_challenge', JSON.stringify(activeChallenge));
    } else {
      sessionStorage.removeItem('acadmix_active_challenge');
    }
  }, [activeChallenge]);

  // Persist code state across F5 refreshes
  useEffect(() => {
    sessionStorage.setItem(getCodeStorageKey(activeChallenge, language), code);
  }, [code, language, activeChallenge]);

  // Detect refresh vs SPA navigation for cleanup
  useEffect(() => {
    const handleBeforeUnload = () => { isRefreshingRef.current = true; };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // On SPA navigation away, clear session — on refresh, keep it
      if (!isRefreshingRef.current) {
        sessionStorage.removeItem('acadmix_active_challenge');
        Object.keys(sessionStorage).forEach(k => {
          if (k.startsWith('acadmix_code_')) sessionStorage.removeItem(k);
        });
      }
    };
  }, []);
  
  const [leftWidth, setLeftWidth] = useState(40); // Initial 40% width for left pane
  const [topHeight, setTopHeight] = useState(66); // Initial height for top code editor pane
  const [adHocLeftWidth, setAdHocLeftWidth] = useState(66); // Initial 66% width for ad-hoc editor pane
  const [adHocTopHeight, setAdHocTopHeight] = useState(55); // Initial 55% height for ad-hoc output pane
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingAdHoc, setIsDraggingAdHoc] = useState(false);
  const [isDraggingAdHocH, setIsDraggingAdHocH] = useState(false);
  const containerRef = useRef(null);
  const rightPaneRef = useRef(null);
  const adHocContainerRef = useRef(null);
  const adHocRightPaneRef = useRef(null);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth < 20) newWidth = 20;
        if (newWidth > 80) newWidth = 80;
        setLeftWidth(newWidth);
      } else if (isDraggingAdHoc && adHocContainerRef.current) {
        const containerRect = adHocContainerRef.current.getBoundingClientRect();
        let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth < 20) newWidth = 20;
        if (newWidth > 80) newWidth = 80;
        setAdHocLeftWidth(newWidth);
      } else if (isDraggingH && rightPaneRef.current) {
        const rightRect = rightPaneRef.current.getBoundingClientRect();
        let newHeight = ((e.clientY - rightRect.top) / rightRect.height) * 100;
        if (newHeight < 20) newHeight = 20;
        if (newHeight > 80) newHeight = 80;
        setTopHeight(newHeight);
      } else if (isDraggingAdHocH && adHocRightPaneRef.current) {
        const rightRect = adHocRightPaneRef.current.getBoundingClientRect();
        let newHeight = ((e.clientY - rightRect.top) / rightRect.height) * 100;
        if (newHeight < 20) newHeight = 20;
        if (newHeight > 80) newHeight = 80;
        setAdHocTopHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
      if (isDraggingH) setIsDraggingH(false);
      if (isDraggingAdHoc) setIsDraggingAdHoc(false);
      if (isDraggingAdHocH) setIsDraggingAdHocH(false);
    };
    
    if (isDragging || isDraggingH || isDraggingAdHoc || isDraggingAdHocH) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      if (isDragging || isDraggingAdHoc) document.body.style.cursor = 'col-resize';
      if (isDraggingH || isDraggingAdHocH) document.body.style.cursor = 'row-resize';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, isDraggingH, isDraggingAdHoc, isDraggingAdHocH]);

  const editorRef = useRef(null);

  useEffect(() => {
    fetchChallenges();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchChallenges = async () => {
    setIsChallengesLoading(true);
    try {
      const res = await api.get('/challenges', { params: { limit: 100 } });
      const rawData = res.data?.data || res.data;
      const parsedChallenges = Array.isArray(rawData) ? rawData : [];
      setChallenges(parsedChallenges);
      
      // Auto-update activeChallenge if we now have test_cases from the backend
      if (activeChallenge && parsedChallenges.length > 0) {
        const freshActive = parsedChallenges.find(c => c.id === activeChallenge.id);
        if (freshActive && freshActive.test_cases && !activeChallenge.test_cases) {
          handleLoadChallenge(freshActive);
        }
      }
    } catch(err) { console.error(err); }
    setIsChallengesLoading(false);
  };

  const filteredChallenges = React.useMemo(() => {
    return challenges.filter(c => {
      const matchDiff = !difficultyFilter || c.difficulty === difficultyFilter;
      const term = searchQuery.toLowerCase();
      const matchSearch = !term || (c.title && c.title.toLowerCase().includes(term)) || (c.topics && c.topics.some(t => t.toLowerCase().includes(term)));
      return matchDiff && matchSearch;
    });
  }, [challenges, difficultyFilter, searchQuery]);
  
  const fetchStats = async () => {
    try {
      const res = await api.get('/challenges/stats');
      setStats(res.data);
    } catch(err) { console.error(err); }
  };

  const currentLang = LANGUAGES.find(l => l.id === language);

  const handleLanguageChange = (langId) => {
    setLanguage(langId);
    // Reset simulator category defaults when switching lab modes
    if (langId === 'eeelab') {
      setSimCategory('power_electronics');
      setWokwiBoard(EEE_SIMULATOR_BOARDS['power_electronics']?.[0]?.id || '');
    } else if (langId === 'ecelab') {
      setSimCategory('embedded');
      setWokwiBoard(SIMULATOR_BOARDS['embedded']?.[0]?.id || 'arduino-uno');
    } else if (langId === 'civillab') {
      setSimCategory('structural');
      setWokwiBoard(CIVIL_SIMULATOR_BOARDS['structural']?.[0]?.id || '');
    } else if (langId === 'mechlab') {
      setSimCategory('thermodynamics');
      setWokwiBoard(MECH_SIMULATOR_BOARDS['thermodynamics']?.[0]?.id || '');
    }
    const saved = sessionStorage.getItem(getCodeStorageKey(activeChallenge, langId));
    if (saved !== null) {
      setCode(saved);
    } else {
      const challengeTemplate = activeChallenge?.init_code?.[langId] || activeChallenge?.template_code;
      if (langId === (activeChallenge?.language || 'python') && challengeTemplate) {
        setCode(challengeTemplate);
      } else {
        setCode(activeChallenge?.init_code?.[langId] || DEFAULT_TEMPLATES[langId] || '');
      }
    }
    setOutput(null);
    setExecTime(null);
    setRPlots([]);
    setRemoteImages([]);
    setActiveConsoleTab('results');
    setShowLangMenu(false);
  };

  const _executeCodeHit = async (is_submit = false) => {
    if (!code.trim() || running) return;
    setRunning(true);
    if (is_submit) setActiveConsoleTab('results');
    setOutput(null);
    const startTime = Date.now();
    try {
      if (language === 'r') {
         if (!webrRef.current) {
             setWebrLoading(true);
             setOutput("Booting R Virtual Environment (WASM). This may take 3-8 seconds on first load...");
             try {
                const { WebR } = await import('webr');
                const webr = new WebR();
                await webr.init();
                webrRef.current = webr;
             } catch (e) {
                setOutput(`Failed to initialize WebR: ${e.message}`);
                setRunning(false);
                setWebrLoading(false);
                return;
             }
             setWebrLoading(false);
         }
         
         const webr = webrRef.current;
         setOutput("Executing R script...");
         setRPlots([]);
         
         try {
             // Prepend the svg device creation directly to the user's code so captureR evaluates it in the same context
             // Also append dev.off() so the graphics buffer is flushed to disk before captureR finishes
             const finalCode = `svg("acadmix_plot.svg", width=8, height=5)\n` + code + `\ninvisible(dev.off())`;
             const shelter = await new webr.Shelter();
             const capture = await shelter.captureR(finalCode, { withAutoprint: true, catchStreams: true });
             // Force close the device in case user code threw an error and didn't close it naturally
             await webr.evalRVoid(`try(dev.off(), silent=TRUE)`);
             
             const outText = capture.output
                 .filter(msg => msg.type === 'stdout' || msg.type === 'stderr')
                 .map(msg => msg.data)
                 .join('\n');
                 
             let svgContent = null;
             try {
                 const svgData = await webr.FS.readFile('/home/web_user/acadmix_plot.svg');
                 svgContent = new TextDecoder().decode(svgData);
                 await webr.evalRVoid(`unlink("acadmix_plot.svg")`);
             } catch (e) {}
             
             setOutput(outText || '(Execution completed with no textual output)');
             const hasPlot = svgContent && (svgContent.includes('<path') || svgContent.includes('<polyline') || svgContent.includes('<circle') || svgContent.includes('<polygon') || svgContent.includes('<text'));
             if (hasPlot) {
                 setRPlots([svgContent]);
                 setActiveConsoleTab('plots');
             } else {
                 setRPlots([]);
                 setActiveConsoleTab('results');
             }
             setExecTime(Date.now() - startTime);
             setHistory(prev => [{
                status: 'Accepted',
                success: true,
                language: 'r',
                code: code,
                output: outText,
                timestamp: new Date().toLocaleTimeString()
             }, ...prev]);
         } catch (e) {
             setOutput(`Error: ${e.message}`);
             setExecTime(Date.now() - startTime);
             setHistory(prev => [{
                status: 'Error',
                success: false,
                language: 'r',
                code: code,
                output: e.message,
                timestamp: new Date().toLocaleTimeString()
             }, ...prev]);
         }
         setRunning(false);
         return;
      }

      let data = {};
      if (activeChallenge) {
        const endpoint = is_submit ? '/challenges/submit' : '/challenges/run';
        const res = await api.post(endpoint, {
          code,
          language,
          challenge_id: activeChallenge.id,
          test_cases: is_submit ? [] : userTestCases // Pass custom user test cases for Run mode
        });
        data = res.data;
        if(is_submit && data.success) fetchStats(); 
      } else {
        const res = await api.post('/code/execute', {
          code,
          language,
          test_input: '',
        });
        data = res.data;
      }

      const elapsed = Date.now() - startTime;
      setExecTime(elapsed);
      const result = data.error && data.exit_code !== 0
        ? `Error:\n${data.error}`
        : data.output || '(no output)';
      
      let rawOutput = result;
      let uiSuccess = false;
      let globalPrints = rawOutput;
      
      if (rawOutput && rawOutput.includes('___ACADMIX_START_TESTS___')) {
         const splitIx = rawOutput.split('___ACADMIX_START_TESTS___');
         globalPrints = splitIx[0];
         
         const rawTests = splitIx[1] || '';
         const parts = rawTests.split('___ACADMIX_SEP___');
         uiSuccess = rawOutput.includes('___ACADMIX_OK___');
         
         const numCases = is_submit ? Math.max(0, parts.length - 1) : userTestCases.length;
         
         const parsedResults = Array.from({ length: numCases }).map((_, idx) => {
             let actual = (parts[idx] || '').replace(/___ACADMIX_END___/g, '').replace(/___ACADMIX_OK___/g, '').trim();
             let passed = null;
             
             if (actual.includes('___ACADMIX_STATUS_PASS___')) {
                 passed = true;
                 actual = actual.replace('___ACADMIX_STATUS_PASS___', '').trim();
             } else if (actual.includes('___ACADMIX_STATUS_FAIL___')) {
                 passed = false;
                 actual = actual.replace('___ACADMIX_STATUS_FAIL___', '').trim();
             }
             
             const tcObj = is_submit ? null : userTestCases[idx];
             if (passed === null && tcObj && tcObj.expected_output !== null && tcObj.expected_output !== undefined) {
                 const expStr = String(tcObj.expected_output).trim();
                 if (expStr !== '') {
                     passed = actual === expStr;
                 }
             }
             
             return { actual_output: actual, passed, isHidden: is_submit && idx >= userTestCases.length };
         });
         setTestResults(parsedResults);
         setSubmitSuccess(uiSuccess);
      } else {
         setTestResults([]);
         setSubmitSuccess(data.success && is_submit);
      }
      
      setRemoteImages(data.images || []);
      if (data.images && data.images.length > 0) {
          setActiveConsoleTab('plots');
      } else {
          setActiveConsoleTab('results');
      }
      
      const cleanedOutput = globalPrints ? globalPrints.replace(/___ACADMIX_SEP___/g, '').replace(/___ACADMIX_END___/g, '').replace(/___ACADMIX_OK___/g, '').replace(/___ACADMIX_START_TESTS___/g, '').trim() : '';
      setOutput(cleanedOutput);
      
      setHistory(prev => [{
        language,
        code: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
        rawCode: code,
        output: result.substring(0, 80),
        rawOutput: result,
        time: elapsed,
        timestamp: new Date().toLocaleTimeString(),
        success: data.exit_code === 0,
      }, ...prev].slice(0, 10));

    } catch (err: any) {
      console.error("CodeRunner Error:", err, err.response?.data);
      const errDetail = err.response?.data?.detail 
                     || err.response?.data?.error 
                     || (err.message === 'Network Error' ? 'Network Error: Backend is unreachable or CORS failed' : null)
                     || 'Execution failed. Please try again.';
      
      if (err.response?.status === 404 && typeof errDetail === 'string' && errDetail.includes('Challenge not found')) {
        handleExitChallenge();
        localStorage.removeItem('acadmix_active_challenge');
        toast.error("The challenge you were working on was no longer found. Returning to free-code mode.", { duration: 5000 });
      } else {
        toast.error(String(errDetail));
      }

      setRemoteImages([]);
      setOutput(`Error: ${typeof errDetail === 'string' ? errDetail : JSON.stringify(errDetail)}`);
      setExecTime(Date.now() - startTime);
    }
    setRunning(false);
  };
  
  const handleRun = () => _executeCodeHit(false);
  const handleSubmit = () => _executeCodeHit(true);

  const handleCoachSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!coachInput.trim() || isCoachTyping) return;
    
    const newMessages = [...coachMessages, { role: "user", content: coachInput }];
    setCoachMessages(newMessages);
    setCoachInput('');
    setIsCoachTyping(true);

    try {
      const isError = output && output.startsWith('Error:');
      const token = localStorage.getItem('auth_token');
      const url = `${import.meta.env.VITE_BACKEND_URL || ''}/api/code/coach`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          messages: newMessages,
          language,
          code,
          output: isError ? '' : (output || ''),
          error: isError ? output : '',
          challenge_title: activeChallenge?.title,
          challenge_description: activeChallenge?.description
        })
      });

      if (!res.ok) throw new Error("Network Error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let messageStarted = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        
        if (!messageStarted) {
           messageStarted = true;
           setIsCoachTyping(false);
           setCoachMessages(prev => [...prev, { role: "assistant", content: chunk }]);
        } else {
           setCoachMessages(prev => {
              const updated = [...prev];
              const lastMessage = { ...updated[updated.length - 1] };
              lastMessage.content += chunk;
              updated[updated.length - 1] = lastMessage;
              return updated;
           });
        }
      }
    } catch (err) {
      console.error("AI Coach Error:", err);
      setCoachMessages(prev => [...prev, { role: "assistant", content: "*Transmission failed. Please try again.*" }]);
    }
    setIsCoachTyping(false);
  };

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [coachMessages, isCoachTyping]);

  const handleAnalysis = async (run) => {
    setReviewing(true);
    setShowReviewModal(true);
    
    if (run.aiReview) {
      setAiReview(run.aiReview);
      setReviewing(false);
      return;
    }
    
    setAiReview("");
    try {
      const isError = run.rawOutput && run.rawOutput.startsWith('Error:');
      const resData = await api.post('/code/review', {
        language: run.language,
        code: run.rawCode || run.code,
        output: isError ? '' : (run.rawOutput || ''),
        error: isError ? run.rawOutput : '',
        execution_time_ms: run.time || 0
      });

      const initData = resData.data || resData;
      
      // Short-circuit if the backend executed synchronously (ARQ fallback)
      if (initData.status === "completed" && initData.task_id === "sync-fallback") {
          run.aiReview = initData.review;
          setAiReview(initData.review);
          setReviewing(false);
          return;
      }
      
      const taskId = initData.task_id;
      
      // Polling Mechanism for Async Event Queue Simulation
      let attempts = 0;
      while (attempts < 30) {
          const delay = attempts < 5 ? 500 : 1500;
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          
          try {
              const statusResData = await api.get(`/code/review_status/${taskId}`);
              const statusData = statusResData.data || statusResData;
              
              if (statusData.status === "completed") {
                  run.aiReview = statusData.review;
                  setAiReview(statusData.review);
                  break;
              } else if (statusData.status === "failed") {
                  throw new Error(statusData.error || "Async task failed");
              }
          } catch (pollingErr) {
              // Ignore polling 404s/500s or processing loops
          }
      }
      
    } catch (err) {
      console.error("AI Review Error:", err);
      let errMsg = err.message;
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed.detail) errMsg = parsed.detail;
      } catch (e) {}

      setAiReview({
          time_complexity: "Error",
          space_complexity: "Error",
          logic_summary: `AI Code Analysis failed: ${errMsg}`,
          suggested_improvements: ["Please fix the above error and try again."]
      });
    }
    setReviewing(false);
  };

  const handleCopyOutput = () => {
    if (output) navigator.clipboard.writeText(output);
  };

  const handleClearOutput = () => {
    setOutput(null);
    setExecTime(null);
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleCopyOrCut = () => {
    try {
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        let text = editorRef.current.getModel().getValueInRange(selection);
        // Handle empty selection (Monaco full line copy)
        if (!text && selection.startLineNumber) {
           text = editorRef.current.getModel().getLineContent(selection.startLineNumber) + '\n';
        }
        window.__editorCopiedText = text;
      }
    } catch(err) {}
  };

  const handlePasteCapture = (e) => {
    /*
    let pastedText = e.clipboardData.getData('text') || '';
    let copiedText = window.__editorCopiedText || '';
    
    // Normalize line endings to prevent cross-OS paste mismatch blocks
    pastedText = pastedText.replace(/\r\n/g, '\n');
    copiedText = copiedText.replace(/\r\n/g, '\n');

    if (pastedText && pastedText !== copiedText) {
      // Final fallback for edge-case whitespace/line-endings mismatch in line copies
      if (pastedText.trim() === copiedText.trim()) return;
      e.preventDefault();
      e.stopPropagation();
      toast.error("🛡️ Integrity Lock Active: Pasting from external sources is disabled during this session. You may only move code copied from within this editor.", { duration: 5000 });
    }
    */
  };

  const dashboardPage = user?.role === 'teacher' ? 'teacher-dashboard' : user?.role === 'admin' ? 'admin-dashboard' : 'student-dashboard';

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Collapsible Header Wrapper */}
      <div className="relative z-40 shrink-0">
        <div className={`overflow-hidden transition-all duration-300 origin-top ${isHeaderCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
          <PageHeader
            navigate={navigate} user={user} title="Code Playground"
            subtitle="Practice coding algorithms & data structures"
            maxWidth="max-w-[1600px]"
            rightContent={
              <>
                <button 
                  onClick={() => navigate('/sql-practice')}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <Database size={16} weight="fill" />
                  Practice SQL
                </button>
                <button
                  onClick={() => setShowInsightsModal(true)}
                  className="hidden lg:flex bg-white hover:bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 !px-4 !py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm items-center gap-2"
                >
                  <ChartBar size={16} weight="duotone" />
                  Insights
                </button>
                <button
                  data-testid="challenges-button"
                  onClick={() => setShowChallengesModal(true)}
                  className="hidden lg:flex btn-primary !px-4 !py-2.5 text-sm items-center gap-2"
                >
                  <Lightning size={16} weight="duotone" />
                  Problem List
                </button>
              </>
            }
          />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full flex justify-center pointer-events-none z-50">
          <button 
            onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
            className="pointer-events-auto bg-white dark:bg-[#1A202C] border border-t-0 border-slate-200 dark:border-slate-700 shadow-sm px-6 py-1 rounded-b-2xl text-slate-400 hover:text-indigo-500 transition-colors flex items-center justify-center cursor-pointer"
            title={isHeaderCollapsed ? "Expand Header" : "Collapse Header"}
          >
            {isHeaderCollapsed ? <CaretDown size={16} weight="bold" /> : <CaretUp size={16} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Main Layout Area */}
      {activeChallenge ? (
        // Split-pane layout for selected challenge
        <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 lg:p-6 flex flex-col lg:flex-row" ref={containerRef}>
          {/* Left Side: Question Description (Hidden on mobile) */}
          <div style={{ width: window.innerWidth >= 1024 ? `calc(${leftWidth}% - 12px)` : '100%' }} className="hidden lg:flex flex-col h-full bg-white rounded-2xl dark:bg-[#1A202C] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-1 flex-1 mr-4">{activeChallenge.title}</h2>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-xl border font-bold ${activeChallenge.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25' : activeChallenge.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/25'}`}>
                  {activeChallenge.difficulty}
                </span>
                <button onClick={handleExitChallenge} className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:text-slate-400" title="Exit Challenge">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-slate-700 dark:text-slate-300 space-y-8">
              {/* Markdown Description */}
              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-p:leading-relaxed prose-a:text-indigo-500">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-[16px] font-bold text-slate-900 dark:text-slate-100 mt-6 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1" {...props} />,
                    hr: ({node, ...props}) => <hr className="border-slate-200 dark:border-slate-700 my-4" {...props} />,
                    pre: ({node, ...props}) => (
                      <pre className="bg-[#F9FAFB] dark:bg-[#1A1D24] border-l-[3px] border-[#F59E0B] dark:border-amber-500 pl-4 pr-4 py-3 rounded-r-lg overflow-x-auto text-[14px] my-5 font-sans whitespace-pre-wrap text-slate-700 dark:text-slate-300" {...props} />
                    ),
                    code: ({node, inline, children, ...props}) => {
                      if (inline) {
                        return <code className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400 font-mono text-[13px]" {...props}>{children}</code>;
                      }
                      const raw = String(Array.isArray(children) ? children.join('') : children || '');
                      if (/(Input|Output|Explanation)\s*:/i.test(raw)) {
                        const cleaned = raw.replace(/\n{2,}/g, '\n');
                        const parts = cleaned.split(/((?:Input|Output|Explanation)\s*:)/gi);
                        return (
                          <code className="font-mono text-[14px] block whitespace-pre-wrap" {...props}>
                            {parts.map((part, i) => {
                              if (/^(Input|Output|Explanation)\s*:$/i.test(part)) {
                                return <strong key={i} className="font-bold text-slate-900 dark:text-slate-100">{part}</strong>;
                              }
                              // Semibold for Option X:, Step X:, Slot X:, Case X: labels
                              const labeled = (part as string).replace(
                                /^((?:Option|Step|Slot|Case)\s*\d+[^:\n]*:)/gim,
                                '|||SEMI|||$1|||/SEMI|||'
                              );
                              if (labeled.includes('|||SEMI|||')) {
                                return <span key={i}>{labeled.split(/(\|\|\|SEMI\|\|\||\|\|\|\/SEMI\|\|\|)/).map((seg, j) => {
                                  if (seg === '|||SEMI|||' || seg === '|||/SEMI|||') return null;
                                  // Check if previous delimiter was |||SEMI|||
                                  const prevIdx = labeled.split(/(\|\|\|SEMI\|\|\||\|\|\|\/SEMI\|\|\|)/).indexOf(seg);
                                  const isSemi = prevIdx > 0 && labeled.split(/(\|\|\|SEMI\|\|\||\|\|\|\/SEMI\|\|\|)/)[prevIdx - 1] === '|||SEMI|||';
                                  return isSemi ? <strong key={j} className="font-semibold text-slate-500 dark:text-slate-400">{seg}</strong> : <span key={j}>{seg}</span>;
                                })}</span>;
                              }
                              return <span key={i}>{part}</span>;
                            })}
                          </code>
                        );
                      }
                      return <code className="font-mono text-[14px]" {...props}>{children}</code>;
                    },
                    strong: ({node, ...props}) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
                  }}
                >
                  {activeChallenge.description}
                </ReactMarkdown>
              </div>

              {/* Real World Applications */}
              {activeChallenge.problem_ai_context && (
                <div className="pt-2">
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-wide">Real-World Use Cases</h3>
                  <div className="bg-[#F8F9FA] dark:bg-[#1E232D] rounded-xl overflow-hidden shadow-sm">
                    {['real_world_applications'].map((key, idx) => {
                      let value = activeChallenge.problem_ai_context[key] || "The underlying algorithms and mathematical principles tested in this problem are foundational structures commonly deployed in distributed systems, cryptography, memory-allocation constraints, and real-time load balancing architecture across scalable B2B architecture.";
                      value = value.replace(/^\s*\*\*\s*$/gm, '').replace(/\*\*\s*\*\*/g, '').trim();
                      
                      const title = 'Real-Time Use Cases & Applications';
                      return (
                        <details key={idx} className="group border-b border-white outline-none dark:border-slate-800/50 last:border-0 [&_summary::-webkit-details-marker]:hidden">
                          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none outline-none hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                            <span className="text-[14px] text-slate-600 dark:text-slate-300 font-medium">{title}</span>
                            <CaretDown size={14} className="text-slate-400 transition-transform duration-200 group-open:rotate-180" weight="bold" />
                          </summary>
                          <div className="px-5 pb-5 pt-2 text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-700/50 mx-0 mt-0 text-start bg-transparent">
                             <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                               p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                               strong: ({node, ...props}) => <strong className="font-semibold text-slate-700 dark:text-slate-200" {...props} />,
                             }}>{value}</ReactMarkdown>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Splitter / Resizer (Hidden on mobile) */}
          <div 
            className="hidden lg:flex w-6 shrink-0 flex-col justify-center items-center cursor-col-resize group z-10"
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            title="Drag to resize panels"
          >
            <div className={`h-16 w-1 rounded-full transition-colors ${isDragging ? 'bg-indigo-50 dark:bg-indigo-500/150' : 'bg-slate-200 group-hover:bg-indigo-300'}`}></div>
          </div>

          {/* Right Side: Code Editor (Top) & Output (Bottom) */}
          <div style={{ width: window.innerWidth >= 1024 ? `calc(${100 - leftWidth}% - 12px)` : '100%' }} className="flex flex-col lg:h-full gap-4 lg:gap-0 relative min-h-[600px] lg:min-h-0" ref={rightPaneRef}>
            {/* Editor Container */}
            <div style={{ height: window.innerWidth >= 1024 ? `calc(${topHeight}% - 12px)` : 'auto' }} className="flex-1 lg:flex-none flex flex-col bg-white rounded-2xl dark:bg-[#1A202C] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px] lg:min-h-0">
              <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                <div className="relative" ref={langMenuRef}>
                  <button onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-semibold text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-lg leading-none">{currentLang?.icon}</span>
                    {currentLang?.label}
                    <CaretDown size={14} weight="bold" />
                  </button>
                  {showLangMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl dark:bg-[#151B2B] shadow-xl border border-slate-100 dark:border-white/10 p-1 z-50 min-w-[160px]">
                      {LANGUAGES.map(lang => (
                        <button key={lang.id} onClick={() => handleLanguageChange(lang.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-sm font-medium ${language === lang.id ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300'}`}>
                          <span className="text-lg leading-none">{lang.icon}</span>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setCode(DEFAULT_TEMPLATES[language] || ''); setOutput(null); }} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 transition-colors mr-2" title="Reset Code">
                    <ArrowCounterClockwise size={18} weight="duotone" />
                  </button>

                  <button onClick={handleRun} disabled={running} className="bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 !px-4 !py-1.5 text-sm flex items-center gap-2 font-bold rounded-xl disabled:opacity-60 transition-colors">
                    {running ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <Play size={16} weight="fill" className="text-slate-500 dark:text-slate-400" />}
                    Run
                  </button>
                  {activeChallenge && (
                    <button onClick={handleSubmit} disabled={running} className="bg-indigo-500 hover:bg-indigo-600 text-white !px-4 !py-1.5 text-sm flex items-center gap-2 font-bold rounded-xl disabled:opacity-60 transition-colors shadow-sm shadow-indigo-500/20">
                      {running ? <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div> : <CheckCircle size={16} weight="bold" />}
                      Submit
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 relative" onCopyCapture={handleCopyOrCut} onCutCapture={handleCopyOrCut} onPasteCapture={handlePasteCapture}>
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  onMount={handleEditorMount}
                  theme={isDark ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    tabSize: language === 'python' ? 4 : 2,
                    wordWrap: 'on'
                  }}
                />
              </div>
            </div>

            {/* Horizontal Splitter / Resizer (Hidden on mobile) */}
            <div 
              className="hidden lg:flex h-6 shrink-0 flex-row justify-center items-center cursor-row-resize group z-10"
              onMouseDown={(e) => { e.preventDefault(); setIsDraggingH(true); }}
              title="Drag to resize panes"
            >
              <div className={`w-16 h-1 rounded-full transition-colors ${isDraggingH ? 'bg-indigo-50 dark:bg-indigo-500/150' : 'bg-slate-200 group-hover:bg-indigo-300'}`}></div>
            </div>

            {/* Output Container */}
            <div style={{ height: window.innerWidth >= 1024 ? `calc(${100 - topHeight}% - 12px)` : 'auto' }} className="h-1/3 lg:h-auto min-h-[220px] lg:flex-none shrink-0 flex flex-col bg-slate-900 rounded-2xl shadow-sm overflow-hidden border border-slate-700/50">
              <div className="bg-slate-800/80 px-4 py-2 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setActiveConsoleTab('test_cases')}
                    className={`px-4 py-1.5 flex items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeConsoleTab === 'test_cases' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'}`}
                  >
                    <CheckSquareOffset size={16} weight={activeConsoleTab === 'test_cases' ? 'fill' : 'duotone'} />
                    Testcases
                  </button>
                  <button 
                    onClick={() => setActiveConsoleTab('results')}
                    className={`px-4 py-1.5 flex items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeConsoleTab === 'results' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'}`}
                  >
                    <Terminal size={16} weight={activeConsoleTab === 'results' ? 'fill' : 'duotone'} />
                    Test Results
                  </button>
                  {(language === 'r' || rPlots.length > 0) && (
                    <button 
                      onClick={() => setActiveConsoleTab('plots')}
                      className={`px-4 py-1.5 flex items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeConsoleTab === 'plots' ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'}`}
                    >
                      <ChartLineUp size={16} weight={activeConsoleTab === 'plots' ? 'fill' : 'duotone'} />
                      Plots
                    </button>
                  )}
                </div>
                 <div className="flex items-center gap-2 text-slate-400">
                   {execTime && <span className="text-xs mr-2 border-r border-slate-700 pr-4">{execTime}ms</span>}
                   {output && (
                     <button onClick={handleClearOutput} className="hover:text-white transition-colors" title="Clear console">
                       <span className="text-xs uppercase font-bold tracking-wider">Clear</span>
                     </button>
                   )}
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-900">
                {activeConsoleTab === 'test_cases' ? (
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4 shrink-0 overflow-x-auto custom-scrollbar pb-1">
                    {userTestCases.map((_, idx) => {
                       let pillStyle = '';
                       const tr = testResults[idx];
                       const isActive = activeTestCaseIdx === idx;
                       if (tr) {
                          if (tr.passed === true) {
                              pillStyle = isActive ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-600' : 'ring-1 ring-emerald-500/50 bg-emerald-500/10 text-emerald-400';
                          } else if (tr.passed === false) {
                              pillStyle = isActive ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-600' : 'ring-1 ring-rose-500/50 bg-rose-500/10 text-rose-400';
                          }
                       }
                       const defaultStyle = isActive ? 'bg-slate-700/50 text-white' : 'bg-slate-800/30 hover:bg-slate-800/80 text-slate-400';
                       
                       return (
                          <button key={idx} onClick={() => setActiveTestCaseIdx(idx)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${pillStyle || defaultStyle}`}>
                            Case {idx + 1}
                          </button>
                       );
                    })}
                    <div className="w-[1px] h-6 bg-slate-700/50 mx-1"></div>
                    <button onClick={() => {
                      setUserTestCases([...userTestCases, { input_data: '', expected_output: '' }]);
                      setActiveTestCaseIdx(userTestCases.length);
                    }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/30 hover:bg-slate-800/80 text-slate-400 transition-colors shrink-0">
                      <Plus size={16} weight="bold" />
                    </button>
                    </div>
                    {userTestCases[activeTestCaseIdx] && (
                      <div className="flex flex-col gap-4 flex-1 pb-6">
                        <div className="flex flex-col">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Input Data</label>
                          <textarea 
                            value={userTestCases[activeTestCaseIdx].input_data || ''}
                            onChange={(e) => {
                               const arr = [...userTestCases];
                               arr[activeTestCaseIdx].input_data = e.target.value;
                               setUserTestCases(arr);
                            }}
                            className="bg-slate-800 border border-slate-700/50 outline-none font-mono text-[13px] text-slate-300 rounded-xl px-4 py-3 focus:ring-1 focus:ring-indigo-500/50 min-h-[100px] resize-y custom-scrollbar"
                            placeholder="e.g. build_tree([1, 2, 3])"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expected Output (Optional)</label>
                          <input 
                            value={userTestCases[activeTestCaseIdx].expected_output || ''}
                            onChange={(e) => {
                               const arr = [...userTestCases];
                               arr[activeTestCaseIdx].expected_output = e.target.value;
                               setUserTestCases(arr);
                            }}
                            className="bg-slate-800 border border-slate-700/50 outline-none font-mono text-sm text-slate-300 rounded-xl px-4 py-2.5 focus:ring-1 focus:ring-indigo-500/50"
                            placeholder="Optional expected answer"
                          />
                        </div>
                        {testResults[activeTestCaseIdx] && (
                          <div className="flex flex-col pt-2 pb-2">
                            <label className={`text-[11px] font-bold ${testResults[activeTestCaseIdx].passed === false ? 'text-rose-400' : testResults[activeTestCaseIdx].passed === true ? 'text-emerald-400' : 'text-slate-400'} uppercase tracking-wider mb-1 flex items-center gap-2`}>
                              Actual Output {testResults[activeTestCaseIdx].passed === true ? '(PASSED)' : testResults[activeTestCaseIdx].passed === false ? '(FAILED)' : ''}
                            </label>
                            <textarea
                              readOnly
                              value={testResults[activeTestCaseIdx].actual_output || '(no output)'}
                              className={`bg-slate-900/80 border ${testResults[activeTestCaseIdx].passed === false ? 'border-rose-500/30' : testResults[activeTestCaseIdx].passed === true ? 'border-emerald-500/30' : 'border-slate-700/50'} outline-none font-mono text-[13px] text-slate-300 rounded-xl px-4 py-3 min-h-[80px] resize-none cursor-default custom-scrollbar`}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                 ) : activeConsoleTab === 'plots' ? (
                  <div className="p-5 font-mono text-sm layout-console text-slate-300 flex flex-col items-center">
                    {rPlots.length > 0 ? (
                      rPlots.map((plot, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-2 mb-4 w-full overflow-x-auto shadow-lg">
                          <div dangerouslySetInnerHTML={{ __html: plot }} className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto" />
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 dark:text-slate-400 italic py-10">No plots generated yet. Use plot() or ggplot2 in R!</div>
                    )}
                  </div>
                 ) : (
                  <div className="p-5 font-mono text-sm layout-console text-slate-300">
                     {running ? (
                        <div className="flex items-center gap-3 animate-pulse">
                           <div className="w-2 h-4 bg-indigo-50 dark:bg-indigo-500/150 animate-bounce"></div>
                           <span className="text-slate-400">Evaluating your solution against test cases...</span>
                        </div>
                     ) : submitSuccess ? (
                         <div className="flex flex-col items-center justify-center py-6 text-emerald-400">
                             <CheckCircle size={48} weight="fill" className="mb-2" />
                             <h3 className="text-lg font-bold text-emerald-500 uppercase tracking-widest">Congratulations!</h3>
                             <p className="text-sm font-medium text-emerald-500/70">All test cases passed flawlessly.</p>
                         </div>
                     ) : output !== null ? (
                        testResults.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {testResults.map((tr, idx) => (
                                   <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-1.5 ${tr.passed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : tr.passed === false ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                       <div className="flex items-center gap-2">
                                           {tr.passed ? <CheckCircle size={20} weight="fill" /> : tr.passed === false ? <X size={20} weight="bold" /> : <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>}
                                           <span className="font-bold text-[13px]">Test case {idx}</span>
                                       </div>
                                       {tr.isHidden && <span className="text-[10px] uppercase tracking-wider opacity-60 ml-7">Hidden Set</span>}
                                   </div>
                                ))}
                                {output.trim() !== '' && !output.includes('___ACADMIX_STATUS_') && (
                                   <div className="col-span-full mt-4 flex flex-col gap-2">
                                       <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Global Standard Output</h4>
                                       <div className="bg-slate-900 border border-slate-700/50 outline-none font-mono text-[13px] text-slate-300 rounded-xl px-4 py-3 min-h-[60px] whitespace-pre-wrap flex items-center overflow-auto custom-scrollbar">
                                          {output}
                                       </div>
                                   </div>
                                )}
                            </div>
                        ) : (
                            <pre className="whitespace-pre-wrap">{output}</pre>
                        )
                  ) : (
                    <div className="text-slate-500 dark:text-slate-400 italic">Code output will appear here.</div>
                 )}
              </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (language === 'ecelab' || language === 'eeelab' || language === 'civillab' || language === 'mechlab') ? (
        // ECE / EEE / Civil Lab — multi-simulator panel
        <div className={`flex-1 flex flex-col ${_isNativeSurface && !isLabFullScreen ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'}`} style={{ overscrollBehavior: 'contain' }}>
          <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4 w-full flex flex-col flex-1 min-h-0" style={{ overscrollBehavior: 'contain' }}>
            {/* Category Tabs + Board Selector Toolbar */}
            <div className="soft-card p-3 shrink-0 mb-4 space-y-2">
              {/* Row 1: Lab selector + Python/Octave toggle + Open External */}
              <div className="flex items-center justify-between">
                <div className="relative" ref={langMenuRef}>
                  <button data-testid="language-selector" onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors font-bold text-sm text-slate-700 dark:text-slate-300">
                    {_isMechLab ? <Wrench size={20} weight="duotone" className="text-red-500" /> : _isCivilLab ? <HardHat size={20} weight="duotone" className="text-orange-500" /> : _isEEELab ? <Lightning size={20} weight="duotone" className="text-yellow-500" /> : <Cpu size={20} weight="duotone" className="text-teal-500" />}
                    {_isMechLab ? 'Mech Lab' : _isCivilLab ? 'Civil Lab' : _isEEELab ? 'EEE Lab' : 'ECE Lab'}
                    <CaretDown size={14} weight="bold" />
                  </button>
                  {showLangMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 dark:bg-[#151B2B] dark:border-white/10 p-1 z-50 min-w-[180px]">
                      {LANGUAGES.map(lang => (
                        <button key={lang.id} onClick={() => handleLanguageChange(lang.id)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-sm font-medium ${language === lang.id ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300'}`}>
                          <span className="text-base">{lang.icon}</span>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Python / Octave toggle */}
                  {(_simActiveBoard as any)?.octaveUrl && (
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
                      <button
                        onClick={() => setUseOctaveMode(false)}
                        className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                          !useOctaveMode
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg" alt="" className="w-3.5 h-3.5" />
                        Python
                      </button>
                      <button
                        onClick={() => setUseOctaveMode(true)}
                        className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                          useOctaveMode
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/matlab/matlab-original.svg" alt="" className="w-3.5 h-3.5" />
                        Octave
                      </button>
                    </div>
                  )}
                  {!((_simActiveBoard as any)?.isNativeBlock || (_simActiveBoard as any)?.isNativeWasm) && (
                  <a
                    href={(useOctaveMode && (_simActiveBoard as any)?.octaveUrl) || _simActiveBoard?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-4 py-1.5 text-white rounded-[10px] text-[11px] font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap ${_simAccent.btn}`}
                  >
                    {useOctaveMode && (_simActiveBoard as any)?.octaveUrl ? 'Open Octave' : (_simActiveBoard?.openLabel || 'Open External')} ↗
                  </a>
                  )}
                  <button 
                    onClick={() => setIsLabFullScreen(!isLabFullScreen)} 
                    title={isLabFullScreen ? "Exit Full Screen" : "Full Screen"} 
                    className="p-1.5 ml-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    {isLabFullScreen ? <CornersIn size={18} weight="bold" /> : <CornersOut size={18} weight="bold" />}
                  </button>
                </div>
              </div>
              {/* Row 2: Category pills (full width) */}
              <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 rounded-full p-1.5 gap-1 overflow-x-auto custom-scrollbar shadow-inner">
                {_activeCats.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSimCategory(cat.id); setWokwiBoard(_activeBoards[cat.id]?.[0]?.id || ''); }}
                    className={`relative px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 z-10 ${
                      simCategory === cat.id
                        ? 'text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {simCategory === cat.id && (
                      <motion.div
                        layoutId="activeCategoryTab"
                        className={`absolute inset-0 rounded-full -z-10 ${SIM_ACCENT_CLASSES[cat.accent]?.active.replace('text-white', '') || 'bg-teal-500 shadow-sm'}`}
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>
              {/* Row 3: Sub-board/preset pills (if more than 1 option) */}
              {_simBoards.length > 1 && (
                <div className="flex items-center bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 rounded-full p-1.5 gap-1 mt-3 mb-1 overflow-x-auto custom-scrollbar shadow-sm">
                  {_simBoards.map(board => (
                    <button
                      key={board.id}
                      onClick={() => setWokwiBoard(board.id)}
                      className={`relative px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all z-10 ${
                        wokwiBoard === board.id
                          ? 'text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {wokwiBoard === board.id && (
                        <motion.div
                          layoutId="activeBoardTab"
                          className={`absolute inset-0 rounded-full -z-10 ${_simAccent.active.replace('text-white', '')}`}
                          initial={false}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      {board.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Navigation helper for CircuitJS-based simulators */}
            {((['analog', 'digital', 'power_electronics', 'control_systems', 'electrical_machines', 'power_systems', 'fluid_mechanics', 'communication', 'dsp', 'measurements', 'renewable_energy', 'protection_switchgear', 'dynamics'].includes(simCategory)) && !((_simActiveBoard as any)?.isNativeWasm || (_simActiveBoard as any)?.isNativeBlock)) && (
              <div className={`flex items-center gap-4 text-xs font-medium px-4 py-2 rounded-xl mb-2 ${
                SIM_ACCENT_CLASSES[_simCat.accent]?.pill || 'bg-slate-100 text-slate-600'
              }`}>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-[10px] font-bold shadow-sm">Right-click + Drag</kbd>
                  <span className="opacity-80">Pan / Move</span>
                </span>
                <span className="w-px h-3.5 bg-current opacity-20" />
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-[10px] font-bold shadow-sm">Scroll</kbd>
                  <span className="opacity-80">Zoom</span>
                </span>
                <span className="w-px h-3.5 bg-current opacity-20" />
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-[10px] font-bold shadow-sm">Click</kbd>
                  <span className="opacity-80">Select</span>
                </span>
                <span className="w-px h-3.5 bg-current opacity-20" />
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-[10px] font-bold shadow-sm">Delete</kbd>
                  <span className="opacity-80">Remove</span>
                </span>
                <span className="w-px h-3.5 bg-current opacity-20" />
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-white/10 text-[10px] font-bold shadow-sm">Ctrl + Z</kbd>
                  <span className="opacity-80">Undo</span>
                </span>
              </div>
            )}
            {/* Simulator iframe — or external-launch card for noEmbed boards */}
            <div
              className={
                isLabFullScreen
                  ? "fixed inset-0 z-[100] bg-[#0B0C10] w-screen h-screen flex flex-col"
                  : _isNativeSurface
                    ? "soft-card overflow-hidden shrink-0 min-h-[760px] lg:min-h-[780px] rounded-2xl relative"
                    : "soft-card overflow-hidden flex-1 min-h-0 rounded-2xl relative"
              }
              style={{ overscrollBehavior: 'contain' }}
            >
              {isLabFullScreen && !((_simActiveBoard as any)?.isNativeBlock || (_simActiveBoard as any)?.isNativeWasm) && (
                <button
                  onClick={() => setIsLabFullScreen(false)}
                  className="absolute bottom-10 right-1/2 translate-x-1/2 z-[999] bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-[0_8px_32_rgba(0,0,0,0.4)] transition-all flex items-center gap-2 group border border-white/10 hover:border-indigo-500/50 opacity-40 hover:opacity-100 scale-95 hover:scale-100"
                >
                  <CornersIn size={18} weight="bold" className="group-hover:rotate-12 transition-transform" />
                  <span className="text-[11px] font-black uppercase tracking-[0.1em]">Exit Full Screen</span>
                </button>
              )}
              {(_simActiveBoard as any)?.isNativeBlock ? (
                <div className="w-full h-full min-h-0 overflow-hidden bg-[#0B0C10] p-2">
                  {(_simActiveBoard as any)?.civilTool ? (
                    <CivilEngineeringStudio
                      tool={(_simActiveBoard as any).civilTool}
                      user={user}
                      isFullScreen={isLabFullScreen}
                      onExitFullScreen={() => setIsLabFullScreen(false)}
                      onRequestFullScreen={() => setIsLabFullScreen(true)}
                    />
                  ) : (_simActiveBoard as any)?.mechTool ? (
                    <MechanicalEngineeringStudio
                      tool={(_simActiveBoard as any).mechTool}
                      isFullScreen={isLabFullScreen}
                      onExitFullScreen={() => setIsLabFullScreen(false)}
                      onRequestFullScreen={() => setIsLabFullScreen(true)}
                    />
                  ) : (_simActiveBoard as any)?.id === 'geo-settle-native' ? (
                    <SettlementCalculator
                      isFullScreen={isLabFullScreen}
                      onExitFullScreen={() => setIsLabFullScreen(false)}
                      onRequestFullScreen={() => setIsLabFullScreen(true)}
                    />
                  ) : (_simActiveBoard as any)?.id === 'pcb-native' ? (
                    <PCBDesignStudio 
                      user={user} 
                      isFullScreen={isLabFullScreen} 
                      onExitFullScreen={() => setIsLabFullScreen(false)}
                      onRequestFullScreen={() => setIsLabFullScreen(true)} 
                    />
                  ) : (_simActiveBoard as any)?.id === 'vlsi-native-block' ? (
                    <VLSIDesignStudio 
                      user={user} 
                      isFullScreen={isLabFullScreen} 
                      onExitFullScreen={() => setIsLabFullScreen(false)}
                      onRequestFullScreen={() => setIsLabFullScreen(true)} 
                    />
                  ) : (_simActiveBoard as any)?.id === 'inst-spectrum' ? (
                    <SpectrumAnalyzer
                      isFullScreen={isLabFullScreen}
                      onExitFullScreen={() => setIsLabFullScreen(false)}
                      onRequestFullScreen={() => setIsLabFullScreen(true)}
                    />
                  ) : (_simActiveBoard as any)?.id === 'inst-funcgen' ? (
                    <FunctionGenerator
                      isFullScreen={isLabFullScreen}
                      onExitFullScreen={() => setIsLabFullScreen(false)}
                      onRequestFullScreen={() => setIsLabFullScreen(true)}
                    />
                  ) : (
                    <DSPBlockSimulator 
                      isFullScreen={isLabFullScreen} 
                      onExitFullScreen={() => setIsLabFullScreen(false)} 
                      onRequestFullScreen={() => setIsLabFullScreen(true)} 
                    />
                  )}
                </div>
              ) : (_simActiveBoard as any)?.isNativeWasm ? (
                <div className="w-full h-full min-h-0 overflow-hidden p-2">
                  <SimulationIDE 
                    key={(_simActiveBoard as any)?.id}
                    language={(_simActiveBoard as any)?.nativeLanguage} 
                    defaultCode={(_simActiveBoard as any)?.defaultCode || ''}
                    onSimulate={(code) => handleNativeSimulate(code, (_simActiveBoard as any)?.nativeLanguage)}
                    isSimulating={isNativeSimulating}
                    output={nativeOutput}
                    isFullScreen={isLabFullScreen}
                    onExitFullScreen={() => setIsLabFullScreen(false)}
                  />
                </div>
              ) : (_simActiveBoard as any)?.noEmbed ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-900/60 p-8">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-teal-500/25 flex items-center justify-center">
                    <Cpu size={36} weight="duotone" className="text-white" />
                  </div>
                  <div className="text-center max-w-md">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{_simActiveBoard?.label}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      This tool runs in its own environment and opens in a new tab. Use it for full-screen modeling, simulation, design, or analysis workflows.
                    </p>
                  </div>
                  <a
                    href={_simActiveBoard?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-8 py-3.5 text-white rounded-2xl text-sm font-bold shadow-lg transition-all hover:scale-[1.04] active:scale-[0.97] flex items-center gap-2.5 ${_simAccent.btn}`}
                  >
                    {_simActiveBoard?.openLabel || 'Open External'}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    External web tool
                  </p>
                </div>
              ) : (
                <iframe
                  key={`${simCategory}-${wokwiBoard}-${useOctaveMode ? 'octave' : 'python'}`}
                  src={(useOctaveMode && (_simActiveBoard as any)?.octaveUrl) || _simActiveBoard?.url || _simBoards[0]?.url || ''}
                  title={`${_simCat.label} — ${_simActiveBoard?.label || 'Simulator'}`}
                  className="w-full h-full border-0"
                  style={{ 
                    touchAction: 'none',
                    ...(_simActiveBoard?.url?.includes('falstad.com/em') ? {
                      transform: 'scale(1.3)',
                      transformOrigin: 'top left',
                      width: '76.9%',
                      height: '76.9%'
                    } : {})
                  }}
                  sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-popups"
                  allow="clipboard-read; clipboard-write; fullscreen"
                />
              )}
            </div>
            {/* External launcher for PCB — EasyEDA full editor */}
            {(_simActiveBoard as any)?.externalUrl && (
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  KiCanvas is a viewer/learning tool. For full PCB design →
                </p>
                <a
                  href={(_simActiveBoard as any).externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-[1.03] active:scale-[0.98] ${
                    SIM_ACCENT_CLASSES[_simCat.accent]?.btn || 'bg-indigo-500 hover:bg-indigo-600'
                  }`}
                >
                  {(_simActiveBoard as any).externalLabel || 'Open Full Editor'}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>
            )}
            {/* External fallback tools — quick-launch bar */}
            {(() => {
              const externalTools: { label: string; url: string }[] = [];
              if (language === 'ecelab' && simCategory === 'embedded') {
                externalTools.push({ label: 'Tinkercad', url: 'https://www.tinkercad.com/circuits' });
              }
              if (externalTools.length === 0) return null;
              return (
                <div className="flex items-center gap-2 mt-2 px-1 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">External:</span>
                  {externalTools.map(t => (
                    <a key={t.label} href={t.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/70 dark:border-white/10 transition-all">
                      {t.label}
                      <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        // Original layout (Grid) for ad-hoc coding (No challenge active)
        <div className="flex-1 overflow-y-auto lg:overflow-hidden">
          <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 lg:h-full">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 lg:h-full" ref={adHocContainerRef}>
              {/* Left Column: Editor Panel */}
              <div style={{ width: window.innerWidth >= 1024 ? `calc(${adHocLeftWidth}% - 12px)` : '100%' }} className="flex flex-col space-y-4">
                <div className="soft-card p-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative" ref={langMenuRef}>
                      <button data-testid="language-selector" onClick={() => setShowLangMenu(!showLangMenu)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors font-bold text-sm text-slate-700 dark:text-slate-300">
                        <span className="text-base">{currentLang?.icon}</span>
                        {currentLang?.label}
                        <CaretDown size={14} weight="bold" />
                      </button>
                      {showLangMenu && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 dark:bg-[#151B2B] dark:border-white/10 p-1 z-50 min-w-[180px]">
                          {LANGUAGES.map(lang => (
                            <button key={lang.id} onClick={() => handleLanguageChange(lang.id)}
                              className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-sm font-medium ${language === lang.id ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300'}`}>
                              <span className="text-base">{lang.icon}</span>
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setCode(DEFAULT_TEMPLATES[language] || ''); setOutput(null); }}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 text-slate-500 dark:text-slate-400 transition-colors" title="Reset to template">
                      <ArrowCounterClockwise size={18} weight="duotone" />
                    </button>

                    <button onClick={handleRun} disabled={running}
                      className="btn-primary !px-5 !py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                      {running ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Play size={16} weight="fill" />}
                      {running ? 'Running...' : 'Run Code'}
                    </button>
                  </div>
                </div>

                <div className="soft-card overflow-hidden flex-1 min-h-[400px]" onCopyCapture={handleCopyOrCut} onCutCapture={handleCopyOrCut} onPasteCapture={handlePasteCapture}>
                  <Editor
                    height="100%"
                    language={language === 'bash' ? 'shell' : language}
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    onMount={handleEditorMount}
                    theme={isDark ? 'vs-dark' : 'vs-light'}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 },
                      tabSize: language === 'python' ? 4 : 2,
                      wordWrap: 'on',
                      smoothScrolling: true,
                    }}
                  />
                </div>

                <div className="soft-card p-4 shrink-0">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Standard Input (stdin)</label>
                  <textarea value={stdin} onChange={(e) => setStdin(e.target.value)}
                    placeholder="Enter input for your program here..."
                    rows="3" className="soft-input w-full resize-none text-sm font-mono" />
                </div>
              </div>

              {/* Vertical Splitter / Resizer (Hidden on mobile) */}
              <div 
                className="hidden lg:flex w-6 shrink-0 flex-col justify-center items-center cursor-col-resize group z-10"
                onMouseDown={(e) => { e.preventDefault(); setIsDraggingAdHoc(true); }}
                title="Drag to resize panes"
              >
                <div className={`h-16 w-1 rounded-full transition-colors ${isDraggingAdHoc ? 'bg-indigo-50 dark:bg-indigo-500/150' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-300'}`}></div>
              </div>

              {/* Right Column: Output & History Panel */}
              <div ref={adHocRightPaneRef} style={{ width: window.innerWidth >= 1024 ? `calc(${100 - adHocLeftWidth}% - 12px)` : '100%' }} className="gap-4 lg:gap-0 flex flex-col lg:h-full lg:overflow-hidden pb-10 lg:pb-0 relative min-h-[600px] lg:min-h-0">
                <div style={{ height: window.innerWidth >= 1024 ? `calc(${adHocTopHeight}% - 12px)` : 'auto' }} className="soft-card flex flex-col flex-1 lg:flex-none min-h-[300px] lg:min-h-0">
                  <div className="p-5 pb-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Terminal size={18} weight="duotone" className="text-slate-500 dark:text-slate-400" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Output</h3>
                      {(language === 'r' || rPlots.length > 0 || remoteImages.length > 0) && (
                        <div className="ml-4 flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                           <button 
                             onClick={() => setActiveConsoleTab('results')}
                             className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeConsoleTab !== 'plots' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                           >
                             Console
                           </button>
                           <button 
                             onClick={() => setActiveConsoleTab('plots')}
                             className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${activeConsoleTab === 'plots' ? 'bg-amber-50 dark:bg-amber-500/20 shadow-sm text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                           >
                             <ChartLineUp size={14} weight={activeConsoleTab === 'plots' ? 'fill' : 'duotone'} />
                             Plots
                           </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {output && (
                        <>
                          <button onClick={handleCopyOutput} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title="Copy output">
                            <Copy size={16} weight="duotone" />
                          </button>
                          <button onClick={handleClearOutput} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title="Clear output">
                            <Trash size={16} weight="duotone" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="px-5 pb-5 flex-1 overflow-hidden flex flex-col">
                    <div className="bg-slate-900 rounded-2xl p-4 flex-1 overflow-y-auto">
                      {running ? (
                        <div className="flex items-center gap-3 text-slate-400">
                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-medium">Executing code...</span>
                        </div>
                      ) : activeConsoleTab === 'plots' ? (
                        <div className="flex flex-col items-center">
                          {rPlots.length > 0 ? (
                            rPlots.map((plot, idx) => (
                              <div key={idx} className="bg-white rounded-xl p-2 mb-4 w-full overflow-x-auto shadow-lg">
                                <div dangerouslySetInnerHTML={{ __html: plot }} className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto" />
                              </div>
                            ))
                          ) : remoteImages.length > 0 ? (
                            remoteImages.map((imgSrc, idx) => (
                              <div key={`rm-${idx}`} className="bg-white rounded-xl p-2 mb-4 w-full overflow-x-auto shadow-lg flex justify-center">
                                <img src={imgSrc} alt={`Plot ${idx}`} className="max-w-full h-auto object-contain" />
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-500 dark:text-slate-400 italic py-10">No plots generated yet.</div>
                          )}
                        </div>
                      ) : output !== null ? (
                        <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">{output}</pre>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Click "Run Code" to see output here</p>
                      )}
                    </div>
                    {execTime !== null && (
                      <div className="flex items-center gap-2 mt-3 text-xs font-medium text-slate-400">
                        <Clock size={14} weight="duotone" />
                        <span>Executed in {execTime}ms</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Horizontal Splitter / Resizer (Hidden on mobile) */}
                <div 
                  className="hidden lg:flex h-6 shrink-0 flex-row justify-center items-center cursor-row-resize group z-10"
                  onMouseDown={(e) => { e.preventDefault(); setIsDraggingAdHocH(true); }}
                  title="Drag to resize panes"
                >
                  <div className={`w-16 h-1 rounded-full transition-colors ${isDraggingAdHocH ? 'bg-indigo-50 dark:bg-indigo-500/150' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-300'}`}></div>
                </div>

                <div style={{ height: window.innerWidth >= 1024 ? `calc(${100 - adHocTopHeight}% - 12px)` : 'auto' }} className="soft-card flex flex-col h-[280px] lg:h-auto min-h-[220px] lg:flex-none shrink-0">
                  <div className="p-5 pb-3 shrink-0">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Run History</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 custom-scrollbar">
                    {history.length === 0 ? (
                      <p className="text-sm text-slate-400 font-medium py-2">No runs yet. Start coding!</p>
                    ) : (
                      <div className="overflow-x-auto w-full border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#1A202C]">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                            <tr>
                              <th className="px-4 py-3">No.</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-center">Language</th>
                              <th className="px-4 py-3 text-center">Code</th>
                              <th className="px-4 py-3 text-center">Analysis</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {history.map((h, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{i + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className={`font-bold ${h.success ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {h.success ? 'Accepted' : 'Failed'}
                                    </span>
                                    <span className="text-[11px] text-slate-400">{h.timestamp}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-center items-center w-full" title={LANGUAGES.find(l => l.id === h.language)?.label || 'Lang'}>
                                    {LANGUAGES.find(l => l.id === h.language)?.icon || <Terminal size={18} className="text-slate-400" />}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button onClick={() => setCode(h.rawCode || '')} className="text-slate-400 hover:text-indigo-500 transition-colors" title="Load this code">
                                    <Eye size={18} weight="duotone" />
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button onClick={() => handleAnalysis(h)} className="text-slate-400 hover:text-indigo-500 transition-colors" title="Run AI Analysis">
                                    <ChartLineUp size={18} weight="bold" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals Code Omitted for brevity: Challenges Modal & Insights Modal ... */}
      {/* Constraints & Modals */}

      {/* Challenges Modal */}
      {showChallengesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={() => setShowChallengesModal(false)}>
          <div className="w-full max-w-4xl max-h-[85vh] bg-white rounded-3xl dark:bg-[#1A202C] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                   <Lightning size={20} weight="fill" />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Problem List</h2>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white dark:bg-[#1A202C] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400/50 transition-all">
                  <MagnifyingGlass size={16} className="text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search problems or topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-0 border-transparent focus:border-transparent outline-none focus:ring-0 text-sm font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-400 w-48 sm:w-64 p-0"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-[#1A202C] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                   <Funnel size={16} className="text-slate-400" />
                   <select className="bg-transparent border-0 border-transparent focus:border-transparent outline-none focus:ring-0 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer p-0"
                     value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}>
                     <option value="">All Difficulties</option>
                     <option value="Easy">Easy</option>
                     <option value="Medium">Medium</option>
                     <option value="Hard">Hard</option>
                   </select>
                </div>
                <button onClick={() => setShowChallengesModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors shrink-0">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
               {isChallengesLoading ? (
                 <div className="py-20 text-center text-slate-500 dark:text-slate-400">
                    Loading problems...
                 </div>
               ) : filteredChallenges.length === 0 ? (
                 <div className="py-20 text-center text-slate-500 dark:text-slate-400">
                    No problems found.
                 </div>
               ) : (
                 <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                   {filteredChallenges.map((ch, i) => (
                     <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group cursor-pointer" onClick={() => handleLoadChallenge(ch)}>
                        <div className="flex-1 pr-6">
                           <div className="flex items-center gap-3 mb-2">
                             <h4 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{ch.title}</h4>
                             <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-xl ${ch.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : ch.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'}`}>
                               {ch.difficulty}
                             </span>
                           </div>
                           <div className="flex gap-2 text-xs text-slate-400 mt-2 truncate">
                              {ch.topics?.slice(0, 3).map(t => <span key={t} className="bg-slate-100 dark:bg-white/[0.06] dark:text-slate-400 px-2.5 py-1 rounded-xl font-medium">{t}</span>)}
                           </div>
                        </div>
                        <button className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 transition-all shadow-sm">
                           Solve
                        </button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Insights Modal */}
      {showInsightsModal && stats && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={() => setShowInsightsModal(false)}>
           <div className="w-full max-w-3xl bg-white rounded-3xl dark:bg-[#1A202C] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
               <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                 <ChartBar className="text-indigo-500 text-2xl" weight="duotone" />
                 My Insights
               </h2>
               <button onClick={() => setShowInsightsModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                 <X size={24} />
               </button>
             </div>
             <div className="p-8 flex flex-col md:flex-row gap-8">
               <div className="flex-1">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                   <CheckCircle size={20} weight="fill" className="text-emerald-500" />
                   Overall Progress
                 </h3>
                 <div className="flex items-center gap-6">
                   <div className="relative w-28 h-28 flex items-center justify-center bg-white dark:bg-[#1A202C] rounded-full border-8 border-slate-50 shadow-inner">
                     <div className="text-center">
                       <span className="block text-2xl font-black text-indigo-600">{stats.total_solved}</span>
                       <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Solved</span>
                     </div>
                     <svg className="absolute inset-0 w-full h-full -rotate-90">
                       <circle cx="56" cy="56" r="48" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-emerald-500" strokeDasharray="301" strokeDashoffset={301 - (stats.total_solved * 3)} />
                     </svg>
                   </div>
                   <div className="flex-1 space-y-4">
                     {['Easy', 'Medium', 'Hard'].map(diff => (
                       <div key={diff}>
                         <div className="flex justify-between text-xs mb-1 font-bold">
                           <span className={diff === 'Easy' ? 'text-emerald-500' : diff === 'Medium' ? 'text-amber-500' : 'text-rose-500'}>{diff}</span>
                           <span className="text-slate-500 dark:text-slate-400">{stats.difficulty[diff] || 0}</span>
                         </div>
                         <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full ${diff === 'Easy' ? 'bg-emerald-500' : diff === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width: `${Math.min(((stats.difficulty[diff] || 0) / 20) * 100, 100)}%`}}></div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
               {stats.topics && Object.keys(stats.topics).length > 0 && (
                 <div className="w-[250px] border-l border-slate-100 dark:border-slate-700 pl-8">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Strong Topics</h3>
                   <div className="flex flex-col gap-2">
                     {Object.entries(stats.topics).map(([topic, count]) => (
                       <div key={topic} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                         <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{topic}</span>
                         <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-xl">{count}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
      )}
       {/* AI Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={() => setShowReviewModal(false)}>
          <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-3xl dark:bg-[#1A202C] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <Sparkle className="text-indigo-500 text-2xl" weight="fill" />
                Code Review by Ami
              </h2>
              <button onClick={() => setShowReviewModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {reviewing ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="font-semibold">Analyzing your code...</p>
                </div>
              ) : aiReview ? (
                typeof aiReview === 'object' ? (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Time Complexity</h3>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">{aiReview.time_complexity}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Space Complexity</h3>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">{aiReview.space_complexity}</p>
                      </div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-500/30">
                      <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Sparkle weight="fill" />
                        Logic Summary
                      </h3>
                      <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">{aiReview.logic_summary}</p>
                    </div>
                    {aiReview.suggested_improvements && (
                      <div className="bg-white dark:bg-[#1A202C] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-widest uppercase flex items-center gap-2">
                          <CheckCircle weight="fill" className="text-emerald-500 text-base" />
                          Suggested Improvements
                        </h3>
                        {aiReview.suggested_improvements.length > 0 ? (
                          <ul className="space-y-2.5">
                            {aiReview.suggested_improvements.map((imp, idx) => (
                              <li key={idx} className="flex gap-3 items-start text-[14px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                <span className="text-indigo-500 mt-1 font-black">→</span>
                                {imp}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed flex items-center gap-2">
                            <Sparkle weight="duotone" className="text-emerald-500" />
                            No major improvements needed! Your code looks solid.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-a:text-indigo-500">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="w-full text-left border-collapse" {...props} /></div>,
                        th: ({node, ...props}) => <th className="bg-slate-50 dark:bg-slate-800/80 py-3 px-4 font-bold text-slate-800 dark:text-slate-200 border-b-2 border-slate-200 dark:border-slate-700 whitespace-nowrap" {...props} />,
                        td: ({node, ...props}) => <td className="py-4 px-4 border-b border-slate-100 dark:border-slate-700/60 align-top text-slate-700 dark:text-slate-300" {...props} />,
                        tr: ({node, ...props}) => <tr className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30" {...props} />
                      }}
                    >
                      {aiReview}
                    </ReactMarkdown>
                  </div>
                )
              ) : (
                <div className="text-center py-10 text-slate-500">No review generated.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Floating Action Button (FAB) for AI Coach */}
      {!showCoach && activeChallenge && (
        <button 
          onClick={() => setShowCoach(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center z-[90] transition-transform hover:scale-110 active:scale-95 group"
          title="Chat with Ami"
        >
          <Sparkle size={24} weight="fill" className="text-amber-300 group-hover:animate-pulse" />
        </button>
      )}

      {/* AI Coach Floating Window */}
      {showCoach && activeChallenge && (
        <div className="fixed bottom-6 right-6 w-[400px] max-h-[600px] h-[75vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col z-[100] animate-fade-in overflow-hidden">
          <div className="px-5 py-4 border-b border-indigo-600 bg-indigo-600 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <Sparkle weight="fill" size={20} className="text-amber-300" />
              <h3 className="font-bold text-lg">Ami</h3>
            </div>
            <button onClick={() => setShowCoach(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors flex items-center justify-center">
              <X size={18} weight="bold" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-slate-800/20">
            {coachMessages.length === 0 && (
              <div className="text-center text-slate-500 dark:text-slate-400 py-10 px-4 text-[13px] font-medium leading-relaxed bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mx-2">
                <span className="text-2xl block mb-3">👋</span>
                Hi! I'm Ami — your partner in crime for coding 😜.<br/>
                {activeChallenge ? (
                  <span>I see you're working on <span className="font-bold text-indigo-500 dark:text-indigo-400">{activeChallenge.title}</span>. Ask for a hint if you're stuck!</span>
                ) : (
                  <span>Describe what you're trying to build, or ask for a hint if you're stuck!</span>
                )}
                <br/><br/><span className="text-indigo-500 dark:text-indigo-400 font-bold">I can automatically see your code and output.</span>
              </div>
            )}
            {coachMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-[14px] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm shadow-md' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/60 rounded-bl-sm shadow-sm'}`}>
                  {msg.role === 'user' ? (
                     msg.content
                  ) : (
                     <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-pre:bg-slate-100 dark:prose-pre:bg-slate-900 prose-pre:text-slate-800 dark:prose-pre:text-slate-200">
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                       </ReactMarkdown>
                     </div>
                  )}
                </div>
              </div>
            ))}
            {isCoachTyping && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-bl-sm shadow-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-[bounce_1s_infinite]"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-[bounce_1s_infinite]" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-[bounce_1s_infinite]" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>
          
          <form onSubmit={handleCoachSubmit} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-[20px] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
              <input 
                type="text" 
                value={coachInput} 
                onChange={(e) => setCoachInput(e.target.value)} 
                placeholder="Ask for a hint..." 
                className="flex-1 bg-transparent px-3 py-1.5 text-[15px] border-transparent focus:border-transparent focus:ring-0 outline-none shadow-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                disabled={isCoachTyping}
              />
              <button 
                type="submit" 
                disabled={!coachInput.trim() || isCoachTyping}
                className="bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-white/60 text-white p-2.5 rounded-2xl transition-colors hover:bg-indigo-700 shadow-sm"
              >
                {isCoachTyping ? <ArrowCounterClockwise size={18} weight="bold" className="animate-spin" /> : <Play size={18} weight="fill" />}
              </button>
            </div>
            <div className="text-center mt-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">
              Ami sees your code automatically
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CodePlayground;
