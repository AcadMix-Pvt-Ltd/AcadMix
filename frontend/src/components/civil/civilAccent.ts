import type { AccentToken } from './civilTypes';

const accentClasses: Record<string, { text: string; bg: string; border: string; soft: string; fill: string; stroke: string }> = {
  rose: {
    text: 'text-rose-300',
    bg: 'bg-rose-500',
    border: 'border-rose-400/25',
    soft: 'bg-rose-500/10',
    fill: '#fb7185',
    stroke: '#f43f5e',
  },
  amber: {
    text: 'text-amber-300',
    bg: 'bg-amber-500',
    border: 'border-amber-400/25',
    soft: 'bg-amber-500/10',
    fill: '#fbbf24',
    stroke: '#f59e0b',
  },
  sky: {
    text: 'text-sky-300',
    bg: 'bg-sky-500',
    border: 'border-sky-400/25',
    soft: 'bg-sky-500/10',
    fill: '#38bdf8',
    stroke: '#0ea5e9',
  },
  emerald: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500',
    border: 'border-emerald-400/25',
    soft: 'bg-emerald-500/10',
    fill: '#34d399',
    stroke: '#10b981',
  },
  violet: {
    text: 'text-violet-300',
    bg: 'bg-violet-500',
    border: 'border-violet-400/25',
    soft: 'bg-violet-500/10',
    fill: '#a78bfa',
    stroke: '#8b5cf6',
  },
  indigo: {
    text: 'text-indigo-300',
    bg: 'bg-indigo-500',
    border: 'border-indigo-400/25',
    soft: 'bg-indigo-500/10',
    fill: '#818cf8',
    stroke: '#6366f1',
  },
  teal: {
    text: 'text-teal-300',
    bg: 'bg-teal-500',
    border: 'border-teal-400/25',
    soft: 'bg-teal-500/10',
    fill: '#2dd4bf',
    stroke: '#14b8a6',
  },
};

export { accentClasses };
