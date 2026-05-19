import React from 'react';
import { motion } from 'framer-motion';
import {
  Microphone, Database, Brain, Buildings, Target, Lightning,
  ArrowRight, Sparkle, Lock, Cpu
} from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';

/* ── Animation Variants ─────────────────────────────────── */
const containerV = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemV = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

/* ── Arena Card Config ──────────────────────────────────── */
const ARENAS = [
  {
    id: 'mock-interview',
    title: 'AI Mock Interview',
    subtitle: 'Practice with Ami — HR, Technical & Behavioral rounds',
    icon: Microphone,
    color: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    iconColor: 'text-violet-500',
    borderHover: 'hover:border-violet-500',
    shadowHover: 'hover:shadow-violet-500/10',
    route: '/interview',
    ready: true,
    tags: ['HR Round', 'Tech Round', 'Behavioral', 'AI Feedback'],
  },
  {
    id: 'sql-sandbox',
    title: 'SQL Sandbox',
    subtitle: 'DataLemur-style environment with mass-recruiter patterns',
    icon: Database,
    color: 'from-indigo-500 to-blue-600',
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    iconColor: 'text-indigo-500',
    borderHover: 'hover:border-indigo-500',
    shadowHover: 'hover:shadow-indigo-500/10',
    route: '/sql-practice',
    ready: true,
    tags: ['TCS NQT', 'Infosys', 'Wipro', 'Cognizant'],
  },
  {
    id: 'hardware-arena',
    title: 'ECE Placement Lab',
    subtitle: 'Guided ECE practice for embedded, VLSI, analog, DSP, PCB, IoT, and core-company interviews',
    icon: Cpu,
    color: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    borderHover: 'hover:border-emerald-500',
    shadowHover: 'hover:shadow-emerald-500/10',
    route: '/hardware-arena',
    ready: true,
    tags: ['Embedded', 'VLSI', 'DSP', 'Analog', 'PCB', 'IoT'],
  },
  {
    id: 'aptitude',
    title: 'Aptitude & Reasoning',
    subtitle: 'Quant, logical, and verbal diagnostic quizzes',
    icon: Brain,
    color: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-500',
    borderHover: 'hover:border-amber-500',
    shadowHover: 'hover:shadow-amber-500/10',
    route: null,
    ready: false,
    tags: ['Quantitative', 'Logical', 'Verbal', 'Timed'],
  },
  {
    id: 'company-prep',
    title: 'Target Company Prep',
    subtitle: 'Company-specific patterns, history & previous year questions',
    icon: Buildings,
    color: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    borderHover: 'hover:border-emerald-500',
    shadowHover: 'hover:shadow-emerald-500/10',
    route: null,
    ready: false,
    tags: ['TCS', 'Amazon', 'Google', 'Microsoft'],
  },
];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
const PlacementHub = ({ navigate, user }: any) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader navigate={navigate} user={user} title="Placement Prep" subtitle="Crack any campus drive" maxWidth="max-w-6xl" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Hero Banner */}
        <motion.div variants={itemV} initial="hidden" animate="show"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-8 sm:p-10 mb-10 shadow-2xl shadow-indigo-500/15">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-6 right-8 w-40 h-40 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-4 left-12 w-32 h-32 rounded-full bg-pink-400/20 blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Target size={28} weight="fill" className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">Placement Preparation Suite</h2>
              <p className="text-sm sm:text-base text-white/70 mt-1.5 max-w-xl">
                AI-powered mock interviews, SQL challenges, aptitude drills, and company-specific prep — everything you need to crack campus placements.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Sparkle size={16} weight="fill" className="text-amber-300" />
              <span className="text-sm font-bold text-white/90">Powered by Ami</span>
            </div>
          </div>
        </motion.div>

        {/* Arena Cards */}
        <motion.div variants={containerV} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ARENAS.map(arena => {
            const Icon = arena.icon;
            return (
              <motion.div
                key={arena.id}
                variants={itemV}
                whileHover={arena.ready ? { scale: 1.015, y: -3 } : {}}
                onClick={() => {
                  if (arena.ready && arena.route) navigate(arena.route.replace('/', ''));
                }}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-[#1E293B] p-6 sm:p-8 transition-all duration-300 shadow-sm ${
                  arena.ready
                    ? `cursor-pointer ${arena.borderHover} hover:shadow-2xl ${arena.shadowHover}`
                    : 'opacity-75 cursor-default'
                }`}
              >
                {/* Top row: icon + badge */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-14 h-14 ${arena.iconBg} rounded-2xl flex items-center justify-center`}>
                    <Icon size={28} weight="duotone" className={arena.iconColor} />
                  </div>
                  {arena.ready ? (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r ${arena.color} text-white text-[10px] font-extrabold uppercase tracking-wider`}>
                      <Lightning size={10} weight="fill" /> Ready
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                      <Lock size={10} weight="bold" /> Coming Soon
                    </div>
                  )}
                </div>

                {/* Title + subtitle */}
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1.5">{arena.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">{arena.subtitle}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {arena.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-white/[0.04] text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/5">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                {arena.ready && (
                  <div className="flex items-center gap-2 text-sm font-extrabold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
                    Launch Arena <ArrowRight size={14} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}

                {/* Gradient corner glow on hover */}
                <div className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${arena.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`} />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom Stats */}
        <motion.div variants={itemV} initial="hidden" animate="show" className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Interview Types', value: '3', sub: 'HR · Tech · Behavioral' },
            { label: 'SQL Problems', value: '50+', sub: 'Mass recruiter patterns' },
            { label: 'ECE Companies', value: '15+', sub: 'Core + campus lanes' },
            { label: 'AI Feedback', value: '∞', sub: 'Unlimited practice' },
          ].map(stat => (
            <div key={stat.label} className="soft-card p-5 text-center">
              <p className="text-2xl font-black bg-gradient-to-r from-violet-500 to-indigo-600 bg-clip-text text-transparent">{stat.value}</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">{stat.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default PlacementHub;
