// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Exam, CaretDown, CheckCircle, MinusCircle, Clock } from '@phosphor-icons/react';
import { studentAPI } from '../../services/api';
import Lottie from 'lottie-react';
import { searchEmptyAnimation } from '../../assets/lottieAnimations';

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const StudentCIAMarks = () => {
  const { data: marks = [], isLoading: loading } = useQuery({
    queryKey: ['student-cia-marks'],
    queryFn: async () => {
      const { data } = await studentAPI.ciaMarks({});
      return (Array.isArray(data) ? data : []).map((s: any) => ({
        ...s,
        components: Array.isArray(s.components) ? s.components : [],
        total_cia: s.total_cia ?? 0,
        total_max: s.total_max ?? 0,
      }));
    },
  });
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);

  const getMarkColor = (obtained, max) => {
    if (obtained === null || obtained === undefined) return 'text-slate-400 dark:text-slate-500';
    const pct = max > 0 ? (obtained / max) * 100 : 0;
    if (pct >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 45) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMarkBg = (obtained, max) => {
    if (obtained === null || obtained === undefined) return 'bg-slate-50 dark:bg-slate-800/50';
    const pct = max > 0 ? (obtained / max) * 100 : 0;
    if (pct >= 70) return 'bg-emerald-50 dark:bg-emerald-500/10';
    if (pct >= 45) return 'bg-amber-50 dark:bg-amber-500/10';
    return 'bg-red-50 dark:bg-red-500/10';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="soft-card p-6 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (marks.length === 0) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-28 h-28 mx-auto mb-4"><Lottie animationData={searchEmptyAnimation} loop autoplay /></div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No CIA Marks Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">CIA marks will appear here once your faculty enters them.</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* ── Summary Bar ───────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Subjects</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{marks.length}</p>
        </div>
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Total CIA</p>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {marks.reduce((s, m) => s + m.total_cia, 0).toFixed(1)} / {marks.reduce((s, m) => s + m.total_max, 0)}
          </p>
        </div>
        <div className="soft-card p-4 text-center hidden sm:block">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Avg CIA %</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {marks.length > 0 ? Math.round(marks.reduce((s, m) => s + (m.total_max > 0 ? m.total_cia / m.total_max * 100 : 0), 0) / marks.length) : 0}%
          </p>
        </div>
      </motion.div>

      {/* ── Subject-wise Cards ───────────────── */}
      {marks.map((subj, idx) => {
        const isExpanded = expandedSubject === idx;
        const ciaPct = subj.total_max > 0 ? Math.round(subj.total_cia / subj.total_max * 100) : 0;
        
        return (
          <motion.div key={idx} variants={itemVariants} className="soft-card overflow-hidden">
            {/* Subject Header */}
            <button
              onClick={() => setExpandedSubject(isExpanded ? null : idx)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <Exam size={20} weight="duotone" className="text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{subj.subject_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{subj.subject_code} • Sem {subj.semester}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className={`px-3 py-1.5 rounded-xl text-sm font-extrabold ${getMarkBg(subj.total_cia, subj.total_max)} ${getMarkColor(subj.total_cia, subj.total_max)}`}>
                  {subj.total_cia} / {subj.total_max}
                </div>
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <CaretDown size={16} weight="bold" className="text-slate-400" />
                </motion.div>
              </div>
            </button>

            {/* Expanded Component Breakdown */}
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-slate-100 dark:border-white/10"
              >
                <div className="p-4 sm:p-5 space-y-2.5">
                  {subj.components.map((comp, ci) => (
                    <div key={ci} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {comp.marks_obtained !== null && comp.marks_obtained !== undefined ? (
                          <CheckCircle size={16} weight="fill" className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Clock size={16} weight="duotone" className="text-slate-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{comp.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{comp.type}</p>
                        </div>
                      </div>
                      <div className={`text-sm font-extrabold ${getMarkColor(comp.marks_obtained, comp.max_marks)}`}>
                        {comp.marks_obtained !== null && comp.marks_obtained !== undefined ? comp.marks_obtained : '—'} 
                        <span className="text-slate-400 dark:text-slate-500 font-bold"> / {comp.max_marks}</span>
                      </div>
                    </div>
                  ))}

                  {/* Total bar */}
                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">CIA Total</span>
                      <span className={`text-sm font-extrabold ${getMarkColor(subj.total_cia, subj.total_max)}`}>
                        {ciaPct}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(ciaPct, 2)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${ciaPct >= 70 ? 'bg-emerald-500' : ciaPct >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default StudentCIAMarks;
