// @ts-nocheck
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Flask, Chalkboard, CheckCircle, Clock, Warning } from '@phosphor-icons/react';
import { studentAPI } from '../../services/api';
import Lottie from 'lottie-react';
import { searchEmptyAnimation } from '../../assets/lottieAnimations';

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const STATUS_BADGE = {
  approved:   { label: 'Approved',   bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
  registered: { label: 'Pending',    bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     icon: Clock },
  rejected:   { label: 'Rejected',   bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400',         icon: Warning },
};

const StudentSubjects = () => {
  const { data: subjects = [], isLoading: loading } = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => studentAPI.subjects().then(r => r.data),
  });

  const totalCredits = subjects.reduce((s, sub) => s + (sub.credits || 0), 0);
  const bySemester = subjects.reduce((acc, s) => {
    const key = `Semester ${s.semester} (${s.academic_year})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="soft-card p-5 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-28 h-28 mx-auto mb-4"><Lottie animationData={searchEmptyAnimation} loop autoplay /></div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Registered Subjects</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Register for courses during the registration window to see your subjects here.</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
      {/* Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Subjects</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{subjects.length}</p>
        </div>
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Total Credits</p>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{totalCredits}</p>
        </div>
        <div className="soft-card p-4 text-center hidden sm:block">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Labs</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{subjects.filter(s => s.is_lab).length}</p>
        </div>
      </motion.div>

      {/* Grouped by Semester */}
      {Object.entries(bySemester).map(([semLabel, subs]) => (
        <motion.div key={semLabel} variants={itemVariants}>
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">{semLabel}</h3>
          <div className="space-y-2.5">
            {subs.map((sub, i) => {
              const statusCfg = STATUS_BADGE[sub.status] || STATUS_BADGE.registered;
              const StatusIcon = statusCfg.icon;
              
              return (
                <motion.div key={i} variants={itemVariants} className="soft-card p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sub.is_lab ? 'bg-purple-50 dark:bg-purple-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10'}`}>
                      {sub.is_lab ? (
                        <Flask size={20} weight="duotone" className="text-purple-500" />
                      ) : (
                        <Chalkboard size={20} weight="duotone" className="text-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{sub.subject_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub.subject_code}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${statusCfg.bg} ${statusCfg.text}`}>
                          <StatusIcon size={12} weight="fill" /> {statusCfg.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-bold">Faculty: <span className="text-slate-700 dark:text-slate-300">{sub.faculty_name}</span></span>
                        {sub.credits && <span className="font-bold">Credits: <span className="text-slate-700 dark:text-slate-300">{sub.credits}</span></span>}
                        {sub.hours_per_week && <span className="font-bold">Hours: <span className="text-slate-700 dark:text-slate-300">{sub.hours_per_week}/wk</span></span>}
                        {sub.is_lab && <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-extrabold text-[10px]">LAB</span>}
                        {sub.is_arrear && <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-[10px]">ARREAR</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StudentSubjects;
