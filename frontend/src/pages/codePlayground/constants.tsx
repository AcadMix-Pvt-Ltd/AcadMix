import React from 'react';
import { Cpu, Lightning, Circuitry, WaveSine, Atom, Blueprint, HardHat, Drop, Compass, Cube, Broadcast, Equalizer, SunHorizon, Gauge, Path, Tree, Wall, Wrench, Gear, Robot, ThermometerHot, Car, ChartLineUp, MagnetStraight, Pulse, ShareNetwork, ChartBar, WarningCircle, Terminal, Clock } from '@phosphor-icons/react';
import type { CivilStudioTool } from '../../components/civil/civilTypes';
import type { MechanicalStudioTool } from '../../components/mech/MechanicalEngineeringStudio';

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
    { id: 'fl-python', label: 'Python (Fluids)', url: jupyterUrl(JUPYTER_CODES['fl-python']), openLabel: 'Open Python', octaveUrl: OCTAVE_URL },
    { id: 'fl-pipe-rlc', label: 'Pipe Flow (RLC Analogy)', url: 'https://lushprojects.com/circuitjs/circuitjs.html?startCircuit=lrc.txt', openLabel: 'Open in CircuitJS' },
  ],
  som: [
    { id: 'mech-beam-stress', label: 'AcadMix Beam Calculator', url: '', isNativeBlock: true, mechTool: 'beamStress' },
    { id: 'mech-mohrs-circle', label: "Mohr's Circle Studio", url: '', isNativeBlock: true, mechTool: 'mohrsCircle' },
    { id: 'mech-material-testing', label: 'Material Testing Studio', url: '', isNativeBlock: true, mechTool: 'materialTesting' },
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

export {
  LANGUAGES,
  SIMULATOR_CATEGORIES,
  JUPYTERLITE_BASE,
  OCTAVE_URL,
  jupyterUrl,
  JUPYTER_CODES,
  SIMULATOR_BOARDS,
  EEE_SIMULATOR_CATEGORIES,
  EEE_SIMULATOR_BOARDS,
  CIVIL_SIMULATOR_CATEGORIES,
  CIVIL_SIMULATOR_BOARDS,
  MECH_SIMULATOR_CATEGORIES,
  MECH_SIMULATOR_BOARDS,
  SIM_ACCENT_CLASSES,
  DEFAULT_TEMPLATES,
};

