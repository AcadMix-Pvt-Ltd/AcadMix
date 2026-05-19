import React, { useEffect, useRef, useState } from 'react';
import { ChartBar, Pause, Play, SlidersHorizontal, UploadSimple, WaveSine, CornersIn, CornersOut } from '@phosphor-icons/react';

type SignalShape = 'sine' | 'square' | 'saw' | 'triangle';
type AudioSample = 'custom' | 'tone' | 'dualTone' | 'chord' | 'voice' | 'drum' | 'noise' | 'uploaded';
type UploadedAudio = {
  name: string;
  samples: Float32Array;
  sampleRate: number;
  duration: number;
};

const SAMPLE_COUNT = 256;
const SAMPLE_RATE = 8000;
const HANN_WINDOW = Array.from({ length: SAMPLE_COUNT }, (_, index) => (
  0.5 * (1 - Math.cos((2 * Math.PI * index) / (SAMPLE_COUNT - 1)))
));
const HANN_WINDOW_SUM = HANN_WINDOW.reduce((sum, value) => sum + value, 0);
const AUDIO_SAMPLES: { id: AudioSample; label: string; description: string }[] = [
  { id: 'custom', label: 'Custom', description: 'Manual waveform controls' },
  { id: 'tone', label: 'Sine Tone', description: 'Clean single-frequency signal' },
  { id: 'dualTone', label: 'Dual Tone', description: 'Two close tones and side-by-side peaks' },
  { id: 'chord', label: 'Major Chord', description: 'Musical C-E-G harmonic cluster' },
  { id: 'voice', label: 'Synth Vowel', description: 'Formant-style speech spectrum' },
  { id: 'drum', label: 'Kick Hit', description: 'Low transient with broad energy' },
  { id: 'noise', label: 'White Noise', description: 'Random wide-band spectrum' },
];

function signalAt(shape: SignalShape, phase: number) {
  const x = phase % (Math.PI * 2);

  if (shape === 'square') {
    return Math.sin(x) >= 0 ? 1 : -1;
  }

  if (shape === 'saw') {
    return 2 * (x / (Math.PI * 2)) - 1;
  }

  if (shape === 'triangle') {
    return (2 / Math.PI) * Math.asin(Math.sin(x));
  }

  return Math.sin(x);
}

function computeSpectrum(samples: number[]) {
  const bins = SAMPLE_COUNT / 2;
  const spectrum: number[] = [];

  for (let k = 0; k < bins; k += 1) {
    let real = 0;
    let imaginary = 0;

    for (let n = 0; n < SAMPLE_COUNT; n += 1) {
      const angle = (2 * Math.PI * k * n) / SAMPLE_COUNT;
      const windowedSample = samples[n] * HANN_WINDOW[n];
      real += windowedSample * Math.cos(angle);
      imaginary -= windowedSample * Math.sin(angle);
    }

    const magnitude = Math.sqrt(real * real + imaginary * imaginary) / (HANN_WINDOW_SUM / 2);
    spectrum.push(magnitude);
  }

  return spectrum;
}

function seededNoise(index: number, time: number) {
  const value = Math.sin((index + 1) * 12.9898 + time * 31.4159) * 43758.5453;
  return value - Math.floor(value) - 0.5;
}

function sampledAudioAt(sample: AudioSample, index: number, time: number) {
  const t = index / SAMPLE_RATE + time;

  if (sample === 'tone') {
    return Math.sin(2 * Math.PI * 440 * t) * 0.85;
  }

  if (sample === 'dualTone') {
    return Math.sin(2 * Math.PI * 440 * t) * 0.55 + Math.sin(2 * Math.PI * 620 * t) * 0.45;
  }

  if (sample === 'chord') {
    return (
      Math.sin(2 * Math.PI * 261.63 * t) * 0.42 +
      Math.sin(2 * Math.PI * 329.63 * t) * 0.34 +
      Math.sin(2 * Math.PI * 392 * t) * 0.28 +
      Math.sin(2 * Math.PI * 523.25 * t) * 0.16
    );
  }

  if (sample === 'voice') {
    return (
      Math.sin(2 * Math.PI * 180 * t) * 0.35 +
      Math.sin(2 * Math.PI * 720 * t) * 0.42 +
      Math.sin(2 * Math.PI * 1180 * t) * 0.28 +
      Math.sin(2 * Math.PI * 2450 * t) * 0.18 +
      seededNoise(index, time) * 0.05
    );
  }

  if (sample === 'drum') {
    const hitPosition = (t * 2.5) % 1;
    const hitSeconds = hitPosition / 2.5;
    const envelope = Math.exp(-hitPosition * 10);
    const sweepPhase = 2 * Math.PI * (110 * hitSeconds - 87.5 * hitSeconds * hitSeconds);
    return (
      Math.sin(sweepPhase) * envelope * 1.05 +
      Math.sin(2 * Math.PI * 55 * t) * envelope * 0.35 +
      seededNoise(index, time) * envelope * 0.45
    );
  }

  if (sample === 'noise') {
    return seededNoise(index, time) * 1.4;
  }

  return 0;
}

function uploadedAudioAt(audio: UploadedAudio, index: number, time: number) {
  const sampleTime = (time + index / SAMPLE_RATE) % audio.duration;
  const exactIndex = sampleTime * audio.sampleRate;
  const leftIndex = Math.floor(exactIndex) % audio.samples.length;
  const rightIndex = (leftIndex + 1) % audio.samples.length;
  const blend = exactIndex - Math.floor(exactIndex);

  return audio.samples[leftIndex] * (1 - blend) + audio.samples[rightIndex] * blend;
}

export default function SpectrumAnalyzer({
  isFullScreen,
  onExitFullScreen,
  onRequestFullScreen,
}: {
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onRequestFullScreen?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const peakRef = useRef<number[]>(Array(SAMPLE_COUNT / 2).fill(0));

  const [shape, setShape] = useState<SignalShape>('sine');
  const [frequency, setFrequency] = useState(440);
  const [amplitude, setAmplitude] = useState(0.8);
  const [harmonics, setHarmonics] = useState(2);
  const [noise, setNoise] = useState(0);
  const [audioSample, setAudioSample] = useState<AudioSample>('tone');
  const [uploadedAudio, setUploadedAudio] = useState<UploadedAudio | null>(null);
  const [uploadPosition, setUploadPosition] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(0.18);
  const [isRunning, setIsRunning] = useState(true);
  const [peakHold, setPeakHold] = useState(true);

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const decodedAudio = await audioContext.decodeAudioData(await file.arrayBuffer());
      const channelCount = Math.min(decodedAudio.numberOfChannels, 2);
      const maxFrames = Math.min(decodedAudio.length, decodedAudio.sampleRate * 180);
      if (maxFrames <= 0 || channelCount <= 0) {
        throw new Error('Empty audio');
      }
      const mixedSamples = new Float32Array(maxFrames);

      for (let channel = 0; channel < channelCount; channel += 1) {
        const channelData = decodedAudio.getChannelData(channel);
        for (let index = 0; index < maxFrames; index += 1) {
          mixedSamples[index] += channelData[index] / channelCount;
        }
      }

      let peak = 0;
      for (let index = 0; index < mixedSamples.length; index += 1) {
        peak = Math.max(peak, Math.abs(mixedSamples[index]));
      }

      if (peak > 1) {
        for (let index = 0; index < mixedSamples.length; index += 1) {
          mixedSamples[index] /= peak;
        }
      }

      await audioContext.close();

      setUploadedAudio({
        name: file.name,
        samples: mixedSamples,
        sampleRate: decodedAudio.sampleRate,
        duration: maxFrames / decodedAudio.sampleRate,
      });
      setAudioSample('uploaded');
      setUploadPosition(0);
      timeRef.current = 0;
      peakRef.current = Array(SAMPLE_COUNT / 2).fill(0);
    } catch {
      setUploadError('Could not decode this audio file. Try WAV, MP3, M4A, or OGG.');
    } finally {
      event.target.value = '';
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const drawGrid = (width: number, height: number, top: number, bottom: number) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.13)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= width; x += width / 10) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }

      for (let y = top; y <= bottom; y += (bottom - top) / 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.restore();
    };

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const waveformHeight = height * 0.34;
      const spectrumTop = waveformHeight + 54;
      const spectrumBottom = height - 64;

      if (isRunning) {
        timeRef.current += 0.00008 * playbackSpeed;
      }

      const samples = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
        const t = index / SAMPLE_RATE + timeRef.current;
        let value = 0;

        if (audioSample === 'custom') {
          value = signalAt(shape, 2 * Math.PI * frequency * t);
        } else if (audioSample === 'uploaded' && uploadedAudio) {
          value = uploadedAudioAt(uploadedAudio, index, uploadPosition * uploadedAudio.duration + timeRef.current);
        } else {
          value = sampledAudioAt(audioSample, index, timeRef.current);
        }

        if (audioSample === 'custom') {
          for (let harmonic = 2; harmonic <= harmonics; harmonic += 1) {
            value += signalAt(shape, 2 * Math.PI * frequency * harmonic * t) * (1 / (harmonic * 1.35));
          }
        }

        value += seededNoise(index, timeRef.current) * noise;

        return Math.max(-1, Math.min(1, value * amplitude));
      });

      const spectrum = computeSpectrum(samples);
      const maxMagnitude = Math.max(...spectrum, 0.001);
      const peakBin = spectrum.reduce((best, current, index) => (current > spectrum[best] ? index : best), 1);
      const peakFrequency = Math.round((peakBin * SAMPLE_RATE) / SAMPLE_COUNT);

      peakRef.current = peakRef.current.map((peak, index) => {
        const nextPeak = Math.max(peak * 0.985, spectrum[index]);
        return peakHold ? nextPeak : spectrum[index];
      });

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, 'rgba(14, 165, 233, 0.10)');
      background.addColorStop(0.48, 'rgba(99, 102, 241, 0.06)');
      background.addColorStop(1, 'rgba(16, 185, 129, 0.08)');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      drawGrid(width, height, 42, waveformHeight);
      drawGrid(width, height, spectrumTop, spectrumBottom);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 18px sans-serif';
      ctx.fillText('Input waveform', 28, 30);
      ctx.fillText('Frequency spectrum', 28, spectrumTop - 18);

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 4;
      ctx.beginPath();
      samples.forEach((sample, index) => {
        const x = (index / (SAMPLE_COUNT - 1)) * width;
        const y = 48 + (waveformHeight - 72) / 2 - sample * ((waveformHeight - 72) / 2);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const visibleBins = 96;
      const gap = 3;
      const barWidth = Math.max(4, width / visibleBins - gap);

      for (let i = 1; i < visibleBins; i += 1) {
        const normalized = spectrum[i] / maxMagnitude;
        const peakNormalized = peakRef.current[i] / maxMagnitude;
        const barHeight = normalized * (spectrumBottom - spectrumTop - 16);
        const x = (i - 1) * (width / visibleBins) + 8;
        const y = spectrumBottom - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, spectrumBottom);
        gradient.addColorStop(0, '#5eead4');
        gradient.addColorStop(0.55, '#38bdf8');
        gradient.addColorStop(1, '#6366f1');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        if (peakHold) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
          ctx.fillRect(x, spectrumBottom - peakNormalized * (spectrumBottom - spectrumTop - 16) - 3, barWidth, 3);
        }
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 14px sans-serif';
      ctx.fillText('0 Hz', 28, spectrumBottom + 28);
      ctx.fillText(`${Math.round((visibleBins * SAMPLE_RATE) / SAMPLE_COUNT)} Hz`, width - 92, spectrumBottom + 28);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '800 22px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Peak: ${peakFrequency} Hz`, width - 28, 32);
      ctx.textAlign = 'left';

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameRef.current);
  }, [amplitude, audioSample, frequency, harmonics, isRunning, noise, peakHold, playbackSpeed, shape, uploadedAudio, uploadPosition]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#0B0C10] text-white rounded-xl overflow-hidden p-4 gap-4 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <ChartBar size={24} weight="bold" className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-slate-100 truncate">AcadMix Spectrum Analyzer</h2>
            <p className="text-xs font-medium text-slate-400 truncate">Native FFT view with built-in audio samples, waveform controls, and peak hold</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {(onExitFullScreen || onRequestFullScreen) && (
            <button
              type="button"
              onClick={() => (isFullScreen ? onExitFullScreen?.() : onRequestFullScreen?.())}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100"
            >
              {isFullScreen ? <CornersIn size={16} weight="bold" /> : <CornersOut size={16} weight="bold" />}
            </button>
          )}
          <button
            onClick={() => setIsRunning((value) => !value)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg hover:scale-105 active:scale-95 ${
              isRunning ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/25'
            }`}
          >
            {isRunning ? <Pause weight="fill" size={18} /> : <Play weight="fill" size={18} />}
            {isRunning ? 'PAUSE' : 'RUN'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        <div className="flex-1 bg-slate-950 rounded-2xl border-2 border-slate-800 relative overflow-hidden shadow-inner">
          <canvas ref={canvasRef} width={1600} height={980} className="w-full h-full object-fill" />
        </div>

        <div className="w-80 bg-slate-800/40 rounded-2xl border border-slate-700/50 p-5 flex flex-col gap-4 overflow-y-auto shadow-inner backdrop-blur-xl">
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <ChartBar size={18} className="text-emerald-400" /> Audio Samples
            </h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-black bg-slate-900/70 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all"
            >
              <UploadSimple size={18} weight="bold" />
              Upload Audio Sample
            </button>

            {uploadedAudio && (
              <button
                onClick={() => {
                  setAudioSample('uploaded');
                  peakRef.current = Array(SAMPLE_COUNT / 2).fill(0);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                  audioSample === 'uploaded'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
                }`}
              >
                <span className="block text-xs font-black uppercase leading-tight truncate">{uploadedAudio.name}</span>
                <span className={`block text-[10px] font-semibold mt-1 leading-tight ${audioSample === 'uploaded' ? 'text-emerald-50/85' : 'text-slate-500'}`}>
                  Uploaded sample, {uploadedAudio.duration.toFixed(1)}s at {Math.round(uploadedAudio.sampleRate / 1000)} kHz
                </span>
              </button>
            )}

            {uploadError && (
              <p className="text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {uploadError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {AUDIO_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    setAudioSample(sample.id);
                    peakRef.current = Array(SAMPLE_COUNT / 2).fill(0);
                  }}
                  title={sample.description}
                  className={`px-3 py-2 rounded-lg text-left transition-all border min-h-[54px] ${
                    audioSample === sample.id
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
                  }`}
                >
                  <span className="block text-xs font-black uppercase leading-tight">{sample.label}</span>
                  <span className={`block text-[10px] font-semibold mt-1 leading-tight ${audioSample === sample.id ? 'text-emerald-50/85' : 'text-slate-500'}`}>
                    {sample.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <WaveSine size={18} className="text-cyan-400" /> Signal
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {(['sine', 'square', 'saw', 'triangle'] as SignalShape[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setAudioSample('custom');
                    setShape(mode);
                    peakRef.current = Array(SAMPLE_COUNT / 2).fill(0);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-black uppercase transition-all border ${
                    audioSample === 'custom' && shape === mode
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-indigo-400" /> Controls
            </h3>

            <ControlSlider label="Animation speed" value={playbackSpeed} min={0} max={1} step={0.01} unit="x" accent="cyan" onChange={setPlaybackSpeed} />
            {uploadedAudio && audioSample === 'uploaded' && (
              <ControlSlider label="Sample position" value={uploadPosition * 100} min={0} max={100} step={0.1} unit="%" accent="emerald" onChange={(value) => {
                setUploadPosition(value / 100);
                timeRef.current = 0;
                peakRef.current = Array(SAMPLE_COUNT / 2).fill(0);
              }} />
            )}
            <ControlSlider label="Frequency" value={frequency} min={80} max={1800} step={5} unit="Hz" accent="cyan" onChange={(value) => {
              setAudioSample('custom');
              setFrequency(value);
            }} />
            <ControlSlider label="Amplitude" value={amplitude} min={0.1} max={1} step={0.05} unit="V" accent="indigo" onChange={setAmplitude} />
            <ControlSlider label="Harmonics" value={harmonics} min={1} max={8} step={1} unit="" accent="emerald" onChange={(value) => {
              setAudioSample('custom');
              setHarmonics(value);
            }} />
            <ControlSlider label="Noise floor" value={noise} min={0} max={0.4} step={0.01} unit="" accent="rose" onChange={setNoise} />
          </div>

          <label className="flex items-center justify-between gap-4 bg-slate-900/60 rounded-xl border border-slate-700/50 px-4 py-3 cursor-pointer select-none">
            <span>
              <span className="block text-sm font-bold text-slate-200">Peak hold</span>
              <span className="block text-xs font-medium text-slate-500">Keeps highest recent bin markers</span>
            </span>
            <input
              type="checkbox"
              checked={peakHold}
              onChange={(event) => setPeakHold(event.target.checked)}
              className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
            />
          </label>

          <div className="mt-auto bg-gradient-to-br from-cyan-500/10 to-indigo-600/10 border border-cyan-500/20 rounded-2xl p-5">
            <p className="text-xs font-black text-cyan-300 uppercase tracking-widest mb-3">Bin resolution</p>
            <p className="text-3xl font-black font-mono text-white">{(SAMPLE_RATE / SAMPLE_COUNT).toFixed(2)} <span className="text-base text-cyan-300">Hz</span></p>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Sample rate {SAMPLE_RATE} Hz, {SAMPLE_COUNT} samples.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  accent: 'cyan' | 'indigo' | 'emerald' | 'rose';
  onChange: (value: number) => void;
}) {
  const accentClass = {
    cyan: 'accent-cyan-500 text-cyan-300 bg-cyan-500/10',
    indigo: 'accent-indigo-500 text-indigo-300 bg-indigo-500/10',
    emerald: 'accent-emerald-500 text-emerald-300 bg-emerald-500/10',
    rose: 'accent-rose-500 text-rose-300 bg-rose-500/10',
  }[accent];

  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
      <div className="flex justify-between mb-3 gap-3">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${accentClass}`}>
          {Number.isInteger(value) ? value : value.toFixed(2)}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`w-full ${accentClass.split(' ')[0]}`}
      />
    </div>
  );
}
