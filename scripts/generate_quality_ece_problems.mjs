import fs from 'node:fs';
import path from 'node:path';

const CATEGORY_META = {
  embedded: { label: 'Embedded Systems', language: 'c' },
  vlsi: { label: 'VLSI / RTL', language: 'verilog' },
  analog: { label: 'Analog Circuits', language: 'spice' },
  digital: { label: 'Digital Logic', language: 'verilog' },
  pcb: { label: 'PCB Design', language: 'markdown' },
  dsp: { label: 'DSP', language: 'python' },
  communication: { label: 'Communication Systems', language: 'python' },
  control: { label: 'Control Systems', language: 'python' },
  iot: { label: 'IoT Systems', language: 'c' },
};

const DIFFICULTIES = [
  {
    name: 'Beginner',
    prefix: 'B0',
    time: '35-45 min',
    focus: 'build the core idea correctly and explain it cleanly',
  },
  {
    name: 'Intermediate',
    prefix: 'I1',
    time: '60-75 min',
    focus: 'handle edge cases, measurement, and failure modes',
  },
  {
    name: 'Advanced',
    prefix: 'A1',
    time: '90-120 min',
    focus: 'optimize under realistic constraints and justify tradeoffs',
  },
  {
    name: 'Interview',
    prefix: 'INT',
    time: '45 min discussion + 45 min implementation',
    focus: 'defend architecture decisions like a core-company interview',
  },
];

const PROBLEM_FAMILIES = {
  embedded: [
    {
      component: 'UART DMA Telemetry Logger',
      scenario: 'A battery-powered vibration monitor streams binary frames from a sensor hub to flash through UART.',
      task: 'Implement a circular DMA receiver with idle-line packet detection and a safe handoff to the logging task.',
      given: ['MCU clock is 72 MHz', 'UART baud rate is 921600', 'DMA buffer is 256 bytes', 'Packets are 12-96 bytes with CRC-8'],
      constraints: ['No byte-wise polling in the main loop', 'No packet loss across two back-to-back frames', 'CPU wakeups only on idle-line interrupt or buffer half/full events'],
      checks: ['12, 64, and 96 byte packets are reconstructed exactly', 'CRC failures are counted without corrupting the next packet', 'CPU active time remains below 4% during continuous streaming'],
      deliverables: ['driver code', 'state diagram', 'one trace showing DMA pointer wraparound'],
      companies: ['Qualcomm', 'Bosch', 'Texas Instruments'],
      skills: ['embedded-c', 'uart', 'dma', 'interrupts', 'crc'],
    },
    {
      component: 'I2C Sensor Fault Recovery',
      scenario: 'An environmental sensing node occasionally locks up when a humidity sensor stretches SCL too long.',
      task: 'Write a non-blocking I2C transaction manager that can recover a stuck bus and retry safely.',
      given: ['400 kHz I2C bus', 'two sensors share the bus', 'timeout threshold is 2 ms', 'sensor address is 0x44'],
      constraints: ['Do not reset the whole MCU', 'Recovery must pulse SCL exactly 9 times before STOP', 'Retries must be bounded to 3 attempts'],
      checks: ['normal read returns temperature and humidity words', 'stuck-SDA fault recovers within 5 ms', 'NACK does not block the scheduler'],
      deliverables: ['transaction state machine', 'bus recovery routine', 'fault log format'],
      companies: ['NXP', 'STMicroelectronics', 'Microchip'],
      skills: ['i2c', 'state-machine', 'fault-recovery', 'sensors'],
    },
    {
      component: 'Low-Power Wakeup Scheduler',
      scenario: 'A wearable health patch must sample ECG for 20 ms every second and sleep the rest of the time.',
      task: 'Design the timer, ADC, and sleep-mode sequence that meets the sampling schedule without drift.',
      given: ['32.768 kHz RTC', 'ADC sample rate is 1 kS/s during active window', 'radio upload happens every 60 samples'],
      constraints: ['Average current must stay below 180 uA', 'Timestamp drift must be below 20 ms per hour', 'ADC cannot run while the core is in deep sleep'],
      checks: ['active/sleep timeline is correct for 120 seconds', 'missed wakeups are detected', 'radio upload does not disturb the next sample window'],
      deliverables: ['timing diagram', 'scheduler pseudocode', 'power budget table'],
      companies: ['Apple', 'Analog Devices', 'Nordic Semiconductor'],
      skills: ['low-power', 'rtc', 'adc', 'scheduling', 'wearables'],
    },
    {
      component: 'CAN Bus Safety Node',
      scenario: 'An automotive actuator receives torque-limit commands on CAN and must fail safe on message loss.',
      task: 'Implement message validation, timeout handling, and a degraded-mode state machine.',
      given: ['500 kbps CAN', 'message period is 10 ms', 'timeout limit is 35 ms', 'payload includes counter and CRC nibble'],
      constraints: ['Reject repeated counters', 'Enter safe torque mode on timeout', 'Recover only after 5 consecutive valid frames'],
      checks: ['counter rollover from 15 to 0 is accepted', 'single corrupt frame is ignored', 'three missed frames trigger safe state'],
      deliverables: ['state table', 'C validation function', 'test vector table'],
      companies: ['Bosch', 'NXP', 'Continental'],
      skills: ['can', 'automotive', 'safety-state', 'crc', 'embedded-c'],
    },
  ],
  vlsi: [
    {
      component: 'Pipelined 4-Tap FIR Core',
      scenario: 'A baseband accelerator needs one filtered sample every clock after pipeline fill.',
      task: 'Write synthesizable RTL for a signed 4-tap FIR filter with valid/ready flow control.',
      given: ['input is signed Q1.15', 'coefficients are signed Q1.15', 'output is rounded Q2.14', 'clock target is 150 MHz'],
      constraints: ['No combinational multiplier chain longer than one multiplier', 'Reset must flush valid bits', 'Overflow must saturate, not wrap'],
      checks: ['impulse response matches coefficients', 'step input saturates correctly', 'backpressure holds all pipeline stages'],
      deliverables: ['RTL module', 'testbench vectors', 'latency and resource explanation'],
      companies: ['NVIDIA', 'Qualcomm', 'AMD'],
      skills: ['verilog', 'fir', 'fixed-point', 'pipelining', 'valid-ready'],
    },
    {
      component: 'Asynchronous FIFO CDC',
      scenario: 'A camera interface crosses pixels from a 96 MHz sensor clock into a 125 MHz processing clock.',
      task: 'Design an async FIFO using Gray-coded pointers and two-flop synchronizers.',
      given: ['FIFO depth is 16', 'data width is 12 bits', 'read clock may pause for up to 8 cycles'],
      constraints: ['Full and empty flags must be glitch-free', 'Binary pointers must not cross domains directly', 'Reset can deassert asynchronously'],
      checks: ['no data reordering over 1000 random writes/reads', 'full prevents overwrite', 'empty prevents underflow'],
      deliverables: ['RTL', 'CDC explanation', 'randomized testbench'],
      companies: ['Intel', 'Broadcom', 'Apple'],
      skills: ['cdc', 'fifo', 'gray-code', 'synchronizers', 'rtl'],
    },
    {
      component: 'SPI Master FSM',
      scenario: 'A mixed-signal SoC needs a configurable SPI master for ADC configuration.',
      task: 'Implement CPOL/CPHA modes, programmable divider, chip-select timing, and transaction done interrupt.',
      given: ['system clock is 50 MHz', 'SPI target is 1-10 MHz', 'word length is 8 or 16 bits'],
      constraints: ['SCLK must not glitch when idle', 'CS setup is at least one SCLK half-period', 'MISO sampled on the selected phase only'],
      checks: ['all four SPI modes pass waveform checks', 'divider produces exact even divisors', 'back-to-back transactions keep CS timing valid'],
      deliverables: ['FSM diagram', 'RTL module', 'waveform screenshot notes'],
      companies: ['Texas Instruments', 'STMicroelectronics', 'Qualcomm'],
      skills: ['spi', 'fsm', 'rtl', 'timing', 'testbench'],
    },
    {
      component: 'AXI-Lite Register Block',
      scenario: 'A verification interview asks you to build a small memory-mapped control block.',
      task: 'Create an AXI-Lite compatible register block with status, control, and clear-on-write interrupt bits.',
      given: ['4 registers, 32-bit each', 'byte strobes are supported', 'read latency may be 1 cycle'],
      constraints: ['Writes must honor WSTRB', 'interrupt status clears only when writing 1', 'invalid addresses return SLVERR'],
      checks: ['unaligned address is rejected', 'partial byte writes update only selected lanes', 'clear-on-write does not clear unrelated bits'],
      deliverables: ['RTL', 'protocol timing notes', 'directed tests'],
      companies: ['AMD', 'Intel', 'NVIDIA'],
      skills: ['axi-lite', 'registers', 'bus-protocol', 'rtl', 'verification'],
    },
  ],
  analog: [
    {
      component: 'Anti-Alias RC Filter',
      scenario: 'A 12-bit ADC samples a 0-2 kHz sensor signal at 10 kS/s in a noisy motor controller.',
      task: 'Choose RC values, estimate cutoff, and verify attenuation at the PWM noise frequency.',
      given: ['signal bandwidth is 2 kHz', 'PWM noise is at 40 kHz', 'ADC input capacitance is 8 pF', 'source resistance should be below 10 kOhm'],
      constraints: ['Use E24 resistor values', 'loading error below 0.5%', 'attenuation at 40 kHz at least 22 dB'],
      checks: ['cutoff is between 2.5 and 4 kHz', 'settling error before ADC sample is below 0.5 LSB', 'component tolerance impact is explained'],
      deliverables: ['calculation table', 'SPICE netlist', 'Bode plot interpretation'],
      companies: ['Texas Instruments', 'Analog Devices', 'Bosch'],
      skills: ['filters', 'adc', 'bode-plot', 'tolerance', 'spice'],
    },
    {
      component: 'Instrumentation Amplifier Front End',
      scenario: 'A bridge sensor produces 0-20 mV differential signal on a 1.65 V common-mode level.',
      task: 'Design the gain stage and biasing so the signal maps into a 0.2-3.1 V ADC range.',
      given: ['ADC reference is 3.3 V', 'bridge source impedance is 350 Ohm', 'target gain is near 120 V/V'],
      constraints: ['Input bias current error below 1% full-scale', 'common-mode range must be valid', 'output cannot clip for +/-10% bridge variation'],
      checks: ['gain and offset calculations are correct', 'worst-case output swing fits ADC range', 'CMRR requirement is stated'],
      deliverables: ['schematic notes', 'gain resistor calculation', 'error budget'],
      companies: ['Analog Devices', 'Texas Instruments', 'Maxim Integrated'],
      skills: ['instrumentation-amplifier', 'bridge-sensor', 'cmrr', 'adc-interface'],
    },
    {
      component: 'Op-Amp Stability With Capacitive Load',
      scenario: 'A sensor buffer oscillates when driving a long cable modeled as 470 pF.',
      task: 'Stabilize the op-amp output using isolation resistor or compensation and justify phase margin.',
      given: ['op-amp GBW is 10 MHz', 'load capacitance is 470 pF', 'load resistance is 20 kOhm'],
      constraints: ['Settling to 0.1% within 50 us', 'overshoot below 10%', 'noise gain must be documented'],
      checks: ['phase margin estimate exceeds 50 degrees', 'step response meets overshoot limit', 'isolation resistor does not break DC accuracy'],
      deliverables: ['compensation choice', 'SPICE AC/step results', 'tradeoff explanation'],
      companies: ['Analog Devices', 'Infineon', 'Texas Instruments'],
      skills: ['op-amp', 'stability', 'phase-margin', 'capacitive-load', 'spice'],
    },
    {
      component: 'Buck Converter Feedback Divider',
      scenario: 'A 5 V to 1.8 V buck regulator powers an RF transceiver with strict standby current.',
      task: 'Select the feedback divider and feed-forward capacitor for stable regulation and low quiescent loss.',
      given: ['reference voltage is 0.6 V', 'switching frequency is 1.2 MHz', 'feedback pin leakage is 50 nA max'],
      constraints: ['divider current below 30 uA', 'output setpoint error below 1%', 'feed-forward zero must be near crossover guidance'],
      checks: ['R values are from E96 series', 'leakage-induced error is calculated', 'transient response tradeoff is explained'],
      deliverables: ['resistor selection', 'error calculation', 'layout notes for FB trace'],
      companies: ['Texas Instruments', 'NXP', 'Infineon'],
      skills: ['power-electronics', 'buck', 'feedback', 'low-power', 'layout'],
    },
  ],
  digital: [
    {
      component: 'Debounced Button Event Generator',
      scenario: 'A product UI has a noisy mechanical button that must emit one pulse per valid press.',
      task: 'Build a debouncer and edge detector that works for active-low input and configurable debounce time.',
      given: ['clock is 1 MHz', 'bounce lasts up to 6 ms', 'long press may last several seconds'],
      constraints: ['Only one event per press', 'release bounce must not create a press event', 'reset clears internal counters'],
      checks: ['6 ms bounce creates one pulse', 'short 2 ms glitch is ignored', 'long press creates no repeated pulses'],
      deliverables: ['RTL', 'timing diagram', 'testbench cases'],
      companies: ['Bosch', 'Apple', 'NXP'],
      skills: ['debounce', 'counter', 'edge-detect', 'rtl', 'testbench'],
    },
    {
      component: 'Sequence Detector 1011',
      scenario: 'A serial protocol detector must identify overlapping 1011 patterns in a bitstream.',
      task: 'Design Moore and Mealy FSM versions and compare latency/output behavior.',
      given: ['one bit arrives per clock', 'patterns may overlap', 'reset is synchronous active high'],
      constraints: ['No missed overlap cases', 'state encoding must be documented', 'Mealy output must be glitch-safe at register boundary'],
      checks: ['1011011 produces two detections', 'all-zero stream produces none', 'reset mid-pattern returns to idle'],
      deliverables: ['state diagram', 'RTL', 'test vector table'],
      companies: ['Intel', 'Qualcomm', 'TCS Digital'],
      skills: ['fsm', 'sequence-detector', 'moore', 'mealy', 'rtl'],
    },
    {
      component: 'Hamming SECDED Encoder',
      scenario: 'A memory controller needs single-error correction and double-error detection for 8-bit data.',
      task: 'Implement parity generation and syndrome decoding for SECDED.',
      given: ['data width is 8 bits', 'codeword includes parity bits plus overall parity', 'single-bit error location must be reported'],
      constraints: ['Correct one flipped bit', 'Flag but do not correct double-bit errors', 'No latches inferred'],
      checks: ['all single-bit positions correct over exhaustive test', 'double-bit fault raises uncorrectable flag', 'clean codeword passes unchanged'],
      deliverables: ['encoder/decoder RTL', 'syndrome table', 'exhaustive testbench'],
      companies: ['AMD', 'Micron', 'Intel'],
      skills: ['ecc', 'hamming-code', 'parity', 'rtl', 'memory'],
    },
    {
      component: 'Fixed-Point Saturating ALU',
      scenario: 'A DSP datapath needs an ALU that supports add, subtract, abs, and arithmetic shift with saturation.',
      task: 'Design the ALU and flags for signed Q7.8 fixed-point values.',
      given: ['input width is 16 bits', 'operations are selected by 3-bit opcode', 'flags are zero, negative, overflow'],
      constraints: ['Overflow saturates to 0x7FFF or 0x8000', 'abs(-32768) saturates correctly', 'shift preserves sign'],
      checks: ['positive overflow saturates', 'negative overflow saturates', 'flag behavior matches operation result'],
      deliverables: ['RTL', 'flag truth table', 'corner-case tests'],
      companies: ['NVIDIA', 'Qualcomm', 'AMD'],
      skills: ['alu', 'fixed-point', 'saturation', 'flags', 'rtl'],
    },
  ],
  pcb: [
    {
      component: 'Two-Layer Sensor Board Layout',
      scenario: 'A compact sensor board mixes an MCU, I2C sensor, LDO, USB connector, and status LED.',
      task: 'Create placement and routing rules that pass manufacturability and reduce noise coupling.',
      given: ['board size is 35 mm x 25 mm', '2-layer FR4', 'minimum trace/space is 6/6 mil', 'sensor sits near board edge'],
      constraints: ['Keep analog sensor traces away from USB D+/D-', 'place decoupling within 2 mm of power pins', 'maintain one continuous ground return where possible'],
      checks: ['all power pins have local decoupling', 'no high-speed trace crosses split return path', 'test points exist for 3V3, GND, SDA, SCL, UART TX/RX'],
      deliverables: ['placement screenshot notes', 'routing checklist', 'BOM risk notes'],
      companies: ['Apple', 'Bosch', 'Amazon Lab126'],
      skills: ['pcb-layout', 'decoupling', 'return-path', 'manufacturing', 'i2c'],
    },
    {
      component: 'USB 2.0 Differential Pair Routing',
      scenario: 'A product prototype fails USB enumeration intermittently after cable movement.',
      task: 'Review and fix the USB D+/D- routing plan for impedance, skew, ESD, and connector placement.',
      given: ['target differential impedance is 90 Ohm', 'max pair skew is 100 mil', 'ESD array is near connector'],
      constraints: ['Avoid stubs longer than 2 mm', 'route over continuous ground', 'series resistors must be close to MCU pins if used'],
      checks: ['D+/D- length mismatch is within limit', 'ESD device placement is correct', 'no via pair asymmetry without reason'],
      deliverables: ['routing rule table', 'before/after review notes', 'DFM checklist'],
      companies: ['Apple', 'Cisco', 'Tesla'],
      skills: ['usb', 'differential-pair', 'impedance', 'esd', 'pcb-review'],
    },
    {
      component: 'Buck Converter Layout Review',
      scenario: 'A board has 80 mV ripple and radiated noise near the DC/DC converter.',
      task: 'Identify hot loops and propose a corrected placement/routing strategy.',
      given: ['input is 12 V', 'output is 3.3 V at 1.5 A', 'switching frequency is 600 kHz'],
      constraints: ['Minimize switch-node copper area', 'input capacitor loop must be shortest path', 'feedback trace must avoid inductor and switch node'],
      checks: ['hot-loop path is annotated', 'FB divider Kelvin connection is specified', 'thermal copper and vias are adequate'],
      deliverables: ['layout review comments', 'corrected placement sketch', 'measurement plan'],
      companies: ['Texas Instruments', 'Bosch', 'NXP'],
      skills: ['buck-layout', 'emi', 'power-integrity', 'thermal', 'pcb'],
    },
    {
      component: 'High-Voltage Isolation Clearance',
      scenario: 'An industrial board separates 400 V motor drive signals from a 3.3 V controller domain.',
      task: 'Define isolation, creepage, clearance, slot, and component placement rules for the board.',
      given: ['working voltage is 400 VDC', 'pollution degree is 2', 'isolation barrier uses digital isolator and isolated DC/DC'],
      constraints: ['No copper crossing isolation barrier', 'silkscreen cannot reduce clearance', 'test points must stay on correct side'],
      checks: ['clearance/creepage table is complete', 'slot placement is justified', 'isolation components align with barrier'],
      deliverables: ['isolation checklist', 'barrier drawing notes', 'manufacturing review points'],
      companies: ['Siemens', 'Infineon', 'Bosch'],
      skills: ['isolation', 'creepage', 'clearance', 'industrial', 'pcb-safety'],
    },
  ],
  dsp: [
    {
      component: 'Windowed FFT Spectrum Analyzer',
      scenario: 'A vibration monitoring tool must detect a 1.2 kHz bearing fault in noisy acceleration data.',
      task: 'Implement windowing, FFT magnitude scaling, and peak detection with frequency-bin reporting.',
      given: ['sample rate is 8 kHz', 'frame length is 1024', 'input is signed 16-bit ADC data', 'target tone is near 1.2 kHz'],
      constraints: ['Use Hann window', 'report peak frequency within one bin', 'ignore DC and first two bins'],
      checks: ['single-tone frequency is detected within 7.8125 Hz', 'two-tone input reports top two peaks', 'noise floor estimate is stable'],
      deliverables: ['Python or MATLAB code', 'plot of spectrum', 'explanation of bin resolution'],
      companies: ['NVIDIA', 'Bosch', 'Texas Instruments'],
      skills: ['fft', 'windowing', 'spectrum', 'python', 'signal-processing'],
    },
    {
      component: 'Fixed-Point FIR Implementation',
      scenario: 'A wearable device filters PPG data on an MCU without floating-point hardware.',
      task: 'Convert floating coefficients to Q15 and implement a fixed-point FIR with saturation.',
      given: ['8 taps', 'input range is signed 12-bit', 'coefficient sum is near 1.0', 'output must remain signed 16-bit'],
      constraints: ['No floating point in runtime path', 'round before shifting', 'saturate overflow'],
      checks: ['impulse response matches quantized taps', 'step response settles within expected range', 'max error vs float reference is below threshold'],
      deliverables: ['C or Python fixed-point code', 'error table', 'overflow explanation'],
      companies: ['Apple', 'Analog Devices', 'Qualcomm'],
      skills: ['fir', 'fixed-point', 'q15', 'saturation', 'mcu'],
    },
    {
      component: 'IIR Filter Stability Check',
      scenario: 'A second-order low-pass filter becomes unstable after coefficient quantization.',
      task: 'Analyze pole locations, quantize coefficients, and recommend a stable implementation form.',
      given: ['target cutoff is 100 Hz', 'sample rate is 1 kHz', 'coefficients use Q2.14 format'],
      constraints: ['Poles must stay inside unit circle', 'use Direct Form II Transposed or justify alternative', 'limit cycle behavior must be discussed'],
      checks: ['quantized coefficients are listed', 'pole magnitudes are below 1', 'step response is bounded'],
      deliverables: ['coefficient table', 'pole-zero plot notes', 'implementation recommendation'],
      companies: ['Texas Instruments', 'Analog Devices', 'NVIDIA'],
      skills: ['iir', 'stability', 'quantization', 'z-transform', 'fixed-point'],
    },
    {
      component: 'Real-Time Audio AGC',
      scenario: 'An audio input varies from whisper to loud speech and needs stable output level.',
      task: 'Design an automatic gain control loop with attack/release behavior and clipping protection.',
      given: ['sample rate is 16 kHz', 'frame size is 160 samples', 'target RMS is -18 dBFS'],
      constraints: ['attack faster than release', 'gain changes must be smoothed', 'clipping detector must reduce gain immediately'],
      checks: ['quiet-to-loud transition avoids clipping', 'loud-to-quiet transition recovers smoothly', 'steady sine reaches target RMS'],
      deliverables: ['algorithm code', 'gain curve plot', 'latency and artifact discussion'],
      companies: ['Apple', 'Qualcomm', 'NVIDIA'],
      skills: ['audio-dsp', 'agc', 'rms', 'real-time', 'python'],
    },
  ],
  communication: [
    {
      component: 'BPSK Modem Chain',
      scenario: 'A telemetry link sends binary data through an AWGN channel using BPSK.',
      task: 'Implement modulation, AWGN injection, matched filtering, and BER estimation.',
      given: ['bit count is 10000', 'Eb/N0 sweep is 0-10 dB', 'samples per symbol is 8'],
      constraints: ['Use reproducible random seed', 'threshold detector at zero after matched filter', 'plot simulated and theoretical BER'],
      checks: ['BER decreases monotonically with Eb/N0', 'simulated BER is near theory at 6 dB', 'constellation is centered'],
      deliverables: ['simulation code', 'BER plot', 'short explanation of Eb/N0'],
      companies: ['Qualcomm', 'Broadcom', 'NVIDIA'],
      skills: ['bpsk', 'ber', 'awgn', 'matched-filter', 'python'],
    },
    {
      component: 'QPSK Symbol Mapper',
      scenario: 'A wireless interview question asks for Gray-coded QPSK mapping and demapping.',
      task: 'Build mapper/demapper functions and prove bit errors for nearest-neighbor noise are minimized.',
      given: ['input bits arrive in pairs', 'constellation energy normalized to 1', 'Gray mapping required'],
      constraints: ['Reject odd-length input cleanly', 'demapper must use quadrant decisions', 'symbol power must be normalized'],
      checks: ['00,01,11,10 map to adjacent Gray points', 'round-trip returns original bits', 'noise near boundary flips one bit where expected'],
      deliverables: ['mapper code', 'constellation diagram', 'decision-region explanation'],
      companies: ['Qualcomm', 'MediaTek', 'Broadcom'],
      skills: ['qpsk', 'gray-code', 'constellation', 'demapper', 'communications'],
    },
    {
      component: 'Link Budget for IoT Node',
      scenario: 'A 915 MHz IoT sensor must communicate over 1.5 km in an open field.',
      task: 'Calculate link margin using path loss, antenna gains, receiver sensitivity, and fade margin.',
      given: ['TX power is 14 dBm', 'TX antenna gain is 2 dBi', 'RX antenna gain is 2 dBi', 'receiver sensitivity is -118 dBm'],
      constraints: ['Use free-space path loss first', 'reserve at least 10 dB fade margin', 'state assumptions clearly'],
      checks: ['FSPL is calculated correctly', 'received power is above sensitivity', 'margin after fade is reported'],
      deliverables: ['calculation sheet', 'assumption list', 'risk recommendations'],
      companies: ['Nordic Semiconductor', 'Qualcomm', 'Bosch'],
      skills: ['link-budget', 'rf', 'path-loss', 'iot', 'communications'],
    },
    {
      component: 'OFDM Cyclic Prefix Reasoning',
      scenario: 'A channel has multipath delay spread that causes inter-symbol interference in OFDM.',
      task: 'Choose cyclic prefix length and explain throughput tradeoff.',
      given: ['FFT size is 64', 'sample period is 50 ns', 'max delay spread is 650 ns'],
      constraints: ['CP must exceed channel delay spread', 'throughput loss must be calculated', 'recommend closest power-of-two CP length'],
      checks: ['minimum CP samples are correct', 'selected CP prevents ISI', 'efficiency percentage is calculated'],
      deliverables: ['calculation', 'tradeoff explanation', 'interview whiteboard answer'],
      companies: ['Qualcomm', 'Broadcom', 'Intel'],
      skills: ['ofdm', 'cyclic-prefix', 'multipath', 'throughput', 'wireless'],
    },
  ],
  control: [
    {
      component: 'PID Temperature Controller',
      scenario: 'A heater plate must reach 80 C quickly without overshoot that can damage a sample.',
      task: 'Tune a discrete PID loop and add anti-windup for actuator saturation.',
      given: ['sample time is 100 ms', 'heater PWM is 0-100%', 'sensor delay is 300 ms', 'target overshoot below 2 C'],
      constraints: ['Integral term must clamp under saturation', 'derivative term uses filtered measurement', 'settling time target is under 60 s'],
      checks: ['step response overshoot below 2 C', 'actuator saturation recovers without windup', 'disturbance rejection is shown'],
      deliverables: ['control code', 'step response plot', 'tuning rationale'],
      companies: ['Bosch', 'Texas Instruments', 'Honeywell'],
      skills: ['pid', 'anti-windup', 'discrete-control', 'pwm', 'python'],
    },
    {
      component: 'DC Motor Speed Loop',
      scenario: 'A conveyor motor must hold speed when load torque changes suddenly.',
      task: 'Model the motor, design a PI speed controller, and discuss encoder quantization.',
      given: ['nominal speed is 1500 rpm', 'encoder has 1024 pulses/rev', 'control loop runs at 1 kHz'],
      constraints: ['steady-state error below 1%', 'current command must be limited', 'speed estimate must filter quantization noise'],
      checks: ['load step recovers within 300 ms', 'no sustained oscillation', 'speed ripple is quantified'],
      deliverables: ['block diagram', 'controller equation', 'simulation plot'],
      companies: ['Tesla', 'Bosch', 'NXP'],
      skills: ['motor-control', 'pi-controller', 'encoder', 'simulation', 'control'],
    },
    {
      component: 'Stability Margin Analysis',
      scenario: 'An analog control loop shows ringing after a new output capacitor is selected.',
      task: 'Use Bode plot data to estimate gain margin, phase margin, and compensation need.',
      given: ['unity crossover is near 18 kHz', 'phase at crossover is -150 degrees', 'gain crosses 0 dB once'],
      constraints: ['Phase margin target is at least 45 degrees', 'do not reduce bandwidth below 5 kHz', 'recommend compensation direction'],
      checks: ['phase margin is computed correctly', 'risk of ringing is explained', 'compensation tradeoff is stated'],
      deliverables: ['margin calculation', 'Bode annotation', 'design recommendation'],
      companies: ['Analog Devices', 'Texas Instruments', 'Infineon'],
      skills: ['bode', 'stability', 'phase-margin', 'compensation', 'control'],
    },
    {
      component: 'Kalman Filter Sensor Fusion',
      scenario: 'An IMU estimates angle using a gyro with drift and an accelerometer with vibration noise.',
      task: 'Implement a 1D Kalman filter and explain the role of process and measurement noise.',
      given: ['gyro rate input in deg/s', 'accelerometer angle input in deg', 'sample time is 10 ms'],
      constraints: ['Estimate angle and gyro bias', 'handle missing accelerometer samples', 'document Q/R tuning impact'],
      checks: ['constant-rate rotation tracks within tolerance', 'bias estimate converges', 'missing accel samples do not reset state'],
      deliverables: ['filter code', 'state equation explanation', 'tuning notes'],
      companies: ['Apple', 'Bosch', 'NVIDIA'],
      skills: ['kalman-filter', 'sensor-fusion', 'imu', 'estimation', 'python'],
    },
  ],
  iot: [
    {
      component: 'MQTT Sensor Publisher',
      scenario: 'A factory sensor sends temperature and vibration summaries to a cloud broker every 30 seconds.',
      task: 'Design a reliable MQTT publish loop with offline buffering and reconnect behavior.',
      given: ['QoS 1 required', 'network may drop for 5 minutes', 'flash buffer stores 512 records'],
      constraints: ['No data loss until buffer fills', 'oldest record drops first on overflow', 'client ID must be stable per device'],
      checks: ['reconnect publishes buffered records in order', 'duplicate PUBACK does not corrupt queue', 'buffer overflow is counted'],
      deliverables: ['state machine', 'topic/payload design', 'retry policy'],
      companies: ['Bosch', 'Amazon Lab126', 'NXP'],
      skills: ['mqtt', 'iot', 'offline-buffer', 'qos', 'embedded'],
    },
    {
      component: 'BLE Beacon Battery Budget',
      scenario: 'A retail beacon must run for one year from a CR2032 coin cell.',
      task: 'Calculate advertising interval and payload strategy that meets battery life.',
      given: ['battery capacity is 220 mAh', 'TX current is 7 mA for 3 ms', 'sleep current is 2 uA'],
      constraints: ['average current below 25 uA', 'advertising interval cannot exceed 2 s', 'payload includes 16-byte telemetry'],
      checks: ['average current calculation is correct', 'battery-life estimate includes sleep current', 'tradeoff between interval and discoverability is explained'],
      deliverables: ['power budget table', 'advertising plan', 'firmware settings'],
      companies: ['Nordic Semiconductor', 'Apple', 'Qualcomm'],
      skills: ['ble', 'battery-budget', 'advertising', 'low-power', 'iot'],
    },
    {
      component: 'Secure OTA Update Flow',
      scenario: 'An IoT gateway must update firmware safely over an unreliable network.',
      task: 'Design download, verification, swap, rollback, and version checks for OTA.',
      given: ['dual-bank flash', 'firmware image has SHA-256 and ECDSA signature', 'power can fail during download'],
      constraints: ['Never boot unsigned image', 'rollback after two failed boots', 'version downgrade blocked unless factory override is set'],
      checks: ['power loss during download keeps old firmware', 'bad signature is rejected', 'new firmware commits only after health check'],
      deliverables: ['state diagram', 'metadata format', 'failure-mode table'],
      companies: ['Amazon Lab126', 'Bosch', 'NXP'],
      skills: ['ota', 'security', 'bootloader', 'rollback', 'iot'],
    },
    {
      component: 'Edge Anomaly Detector',
      scenario: 'A pump-monitoring node must detect abnormal vibration locally before uploading a summary.',
      task: 'Compute lightweight features and threshold logic suitable for an MCU.',
      given: ['accelerometer sample rate is 1 kHz', 'window length is 256 samples', 'features are RMS, peak, crest factor'],
      constraints: ['RAM use below 4 KB', 'no dynamic allocation', 'false alarm rate must be tunable'],
      checks: ['normal sine window stays below threshold', 'impact spike raises anomaly flag', 'feature values match reference calculations'],
      deliverables: ['feature extraction code', 'threshold tuning notes', 'payload schema'],
      companies: ['Bosch', 'Texas Instruments', 'NVIDIA'],
      skills: ['edge-ai', 'features', 'vibration', 'mcu', 'iot'],
    },
  ],
};

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function makeDescription(family, difficulty) {
  const harder = {
    Beginner: [
      'Keep the implementation minimal but correct.',
      'Write down the assumptions you made.',
    ],
    Intermediate: [
      'Include at least two edge-case tests.',
      'Explain what can fail in hardware and how you detect it.',
    ],
    Advanced: [
      'Quantify timing, power, noise, memory, or error budget.',
      'Compare at least two design choices and choose one.',
    ],
    Interview: [
      'Prepare a 5-minute whiteboard explanation before coding.',
      'State tradeoffs, corner cases, and how you would validate on real hardware.',
    ],
  }[difficulty.name];

  const lines = [
    `**Scenario:** ${family.scenario}`,
    '',
    `**Task:** ${family.task}`,
    '',
    '**Given:**',
    ...family.given.map((item) => `- ${item}`),
    '',
    `**Difficulty Focus:** ${difficulty.focus}.`,
    '',
    '**Constraints:**',
    ...family.constraints.map((item) => `- ${item}`),
    ...harder.map((item) => `- ${item}`),
    '',
    '**Expected Checks:**',
    ...family.checks.map((item) => `- ${item}`),
    '',
    '**Deliverables:**',
    ...family.deliverables.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

function starterFor(category, family, difficulty) {
  const title = `${difficulty.prefix}: ${family.component}`;
  if (['vlsi', 'digital'].includes(category)) {
    return `// ${title}\n// Write synthesizable RTL and keep this assertion marker for AcadMix checks.\n// <ACADMIX_ASSERT_${slug(family.component).toUpperCase().replace(/-/g, '_')}_${difficulty.prefix}=PASS>\n\nmodule solution (\n  input  logic clk,\n  input  logic rst_n\n);\n  // TODO: declare ports and implement the design from the problem statement.\nendmodule\n`;
  }
  if (['dsp', 'communication', 'control'].includes(category)) {
    return `# ${title}\n# Implement the algorithm and keep this marker for AcadMix checks.\n# <ACADMIX_ASSERT_${slug(family.component).toUpperCase().replace(/-/g, '_')}_${difficulty.prefix}=PASS>\n\nimport math\n\n\ndef solve(samples=None):\n    # TODO: implement the calculation/simulation described in the prompt.\n    return {}\n`;
  }
  if (['analog', 'pcb'].includes(category)) {
    return `# ${title}\n# Use this area for calculations, SPICE notes, layout rules, or review findings.\n# <ACADMIX_ASSERT_${slug(family.component).toUpperCase().replace(/-/g, '_')}_${difficulty.prefix}=PASS>\n\n## Assumptions\n- TODO\n\n## Calculations / Design Notes\n- TODO\n\n## Verification Evidence\n- TODO\n`;
  }
  return `// ${title}\n// Implement in embedded C style and keep this assertion marker for AcadMix checks.\n// <ACADMIX_ASSERT_${slug(family.component).toUpperCase().replace(/-/g, '_')}_${difficulty.prefix}=PASS>\n\n#include <stdint.h>\n#include <stdbool.h>\n\nvoid solution_init(void) {\n  // TODO: initialize state and hardware abstraction.\n}\n\nvoid solution_step(void) {\n  // TODO: implement non-blocking behavior.\n}\n`;
}

function generateProblems() {
  const problems = [];
  for (const [category, families] of Object.entries(PROBLEM_FAMILIES)) {
    for (const family of families) {
      for (const difficulty of DIFFICULTIES) {
        const id = `ece_${category}_${slug(family.component)}_${difficulty.prefix.toLowerCase()}`;
        problems.push({
          id,
          category,
          category_label: CATEGORY_META[category].label,
          component: family.component,
          difficulty: difficulty.name,
          title: `${difficulty.prefix}: ${family.component}`,
          skills: family.skills,
          company_tags: family.companies,
          description: makeDescription(family, difficulty),
          starter_code: starterFor(category, family, difficulty),
          simulator_preset: `${category}-${difficulty.prefix.toLowerCase()}`,
          estimated_time: difficulty.time,
          quality_score: difficulty.name === 'Interview' ? 95 : difficulty.name === 'Advanced' ? 92 : 88,
          test_cases: family.checks.map((check, idx) => ({
            name: `Check ${idx + 1}`,
            expectation: check,
          })),
          interview_prompts: [
            'What assumption would you validate first on real hardware?',
            'Which corner case is most likely to fail in production?',
            'How would you prove the fix to a hiring panel?',
          ],
          rubric: [
            'Correct core design or calculation',
            'Explicit edge-case handling',
            'Clear verification evidence',
            'Concise tradeoff explanation',
          ],
        });
      }
    }
  }
  return problems;
}

const outputArg = process.argv[2] || 'frontend/src/data/ece_problems.json';
const outputPath = path.resolve(outputArg);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const problems = generateProblems();
fs.writeFileSync(outputPath, `${JSON.stringify(problems, null, 2)}\n`);
console.log(`Generated ${problems.length} curated ECE placement problems at ${outputPath}`);
