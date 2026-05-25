// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, CaretLeft, CaretRight, Funnel, CheckCircle, XCircle, Warning, X } from '@phosphor-icons/react';
import { studentAPI, attendanceAPI } from '../../services/api';
import Lottie from 'lottie-react';
import { searchEmptyAnimation } from '../../assets/lottieAnimations';

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', dot: '#10b981' },
  od:      { label: 'OD',      color: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-500/10',   dot: '#f59e0b' },
  absent:  { label: 'Absent',  color: 'bg-red-500',     text: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-500/10',       dot: '#ef4444' },
  medical: { label: 'Medical', color: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-500/10',     dot: '#3b82f6' },
  late:    { label: 'Late',    color: 'bg-orange-500',  text: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-500/10', dot: '#f97316' },
};

const AT_RISK_THRESHOLD = 75;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const StudentAttendance = () => {
  const [view, setView] = useState<'calendar' | 'subjects'>('calendar');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [showAtRisk, setShowAtRisk] = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [hasInitializedMonth, setHasInitializedMonth] = useState(false);

  // Cached consolidated attendance (subject-level summary)
  const { data: consolidated = [], isLoading: consLoading } = useQuery({
    queryKey: ['student-attendance-consolidated'],
    queryFn: () => attendanceAPI.getStudentConsolidated().then(r => r.data),
  });

  useEffect(() => {
    if (consolidated.length > 0 && !hasInitializedMonth) {
      const dates = consolidated
        .filter((c: any) => c.latest_date)
        .map((c: any) => new Date(c.latest_date));
      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
        setMonth(maxDate.getMonth());
        setYear(maxDate.getFullYear());
      }
      setHasInitializedMonth(true);
    } else if (!consLoading && consolidated.length === 0 && !hasInitializedMonth) {
      setHasInitializedMonth(true);
    }
  }, [consolidated, consLoading, hasInitializedMonth]);

  // Cached per-month detail (keyed by month+year for automatic cache)
  const { data: detail = [], isFetching: calendarLoading } = useQuery({
    queryKey: ['student-attendance-detail', month, year],
    queryFn: () => studentAPI.attendanceDetail({ month: month + 1, year }).then(r => r.data),
  });

  const loading = consLoading;

  const subjects = useMemo(() => [...new Set(consolidated.map(c => c.subject_code))], [consolidated]);

  const overallPct = useMemo(() => {
    const tot = consolidated.reduce((s, c) => s + c.total_count, 0);
    const pres = consolidated.reduce((s, c) => s + c.present_count, 0);
    return tot > 0 ? Math.round(pres * 100 / tot) : 0;
  }, [consolidated]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  }, [month, year]);

  // Map date -> status for calendar colouring
  const dateStatusMap = useMemo(() => {
    const map = {};
    detail.forEach(r => {
      const day = parseInt(r.date.split('-')[2], 10);
      if (!map[day]) map[day] = [];
      map[day].push(r.status);
    });
    const result = {};
    Object.entries(map).forEach(([day, statuses]) => {
      const allAbsent = statuses.every(s => s === 'absent');
      const allPresent = statuses.every(s => s === 'present' || s === 'od');
      if (allAbsent) result[day] = 'absent';
      else if (allPresent) result[day] = 'present';
      else result[day] = 'mixed';
    });
    return result;
  }, [detail]);

  const dayDetail = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return detail.filter(r => r.date === dateStr);
  }, [selectedDay, detail, month, year]);

  const prevMonth = () => {
    setMonth(m => m === 0 ? 11 : m - 1);
    setYear(y => month === 0 ? y - 1 : y);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setMonth(m => m === 11 ? 0 : m + 1);
    setYear(y => month === 11 ? y + 1 : y);
    setSelectedDay(null);
  };

  const filteredConsolidated = filterSubject ? consolidated.filter(c => c.subject_code === filterSubject) : consolidated;

  const getPctColor = (pct) => pct >= 75 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 65 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  const getPctBg = (pct) => pct >= 75 ? 'bg-emerald-50 dark:bg-emerald-500/10' : pct >= 65 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-red-50 dark:bg-red-500/10';

  const atRiskSubjects = consolidated.filter(c => c.percentage < AT_RISK_THRESHOLD);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Summary skeleton */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="soft-card p-4 sm:p-5 text-center animate-pulse">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mx-auto mb-3"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto"></div>
            </div>
          ))}
        </div>
        {/* Calendar skeleton */}
        <div className="soft-card p-5 animate-pulse">
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mx-auto mb-4"></div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`h${i}`} className="h-3 bg-slate-100 dark:bg-slate-800 rounded mx-auto w-6"></div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-9 sm:h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* ── Summary Stats ───────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="soft-card p-4 sm:p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Overall</p>
          <p className={`text-3xl font-extrabold ${getPctColor(overallPct)}`}>{overallPct}%</p>
        </div>
        <div className="soft-card p-4 sm:p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Classes Attended</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {consolidated.reduce((s, c) => s + c.present_count, 0)}
            <span className="text-base font-bold text-slate-400 dark:text-slate-500">/{consolidated.reduce((s, c) => s + c.total_count, 0)}</span>
          </p>
        </div>
        <button onClick={() => atRiskSubjects.length > 0 && setShowAtRisk(true)} className={`soft-card p-4 sm:p-5 text-center transition-all ${atRiskSubjects.length > 0 ? 'cursor-pointer hover:ring-2 hover:ring-red-300 dark:hover:ring-red-500/30' : ''}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">At Risk</p>
          <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">{atRiskSubjects.length}</p>
        </button>
      </motion.div>

      {/* ── View Toggle ───────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl p-1.5">
          {[{ id: 'calendar', label: 'Calendar View', icon: Calendar }, { id: 'subjects', label: 'Subject Grid', icon: Funnel }].map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 border border-transparent ${
                view === v.id ? 'bg-white dark:bg-indigo-500/15 text-slate-900 dark:text-indigo-300 shadow-sm dark:border-indigo-500/25' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <v.icon size={14} weight="duotone" /> {v.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Calendar View ───────────────────────── */}
      {view === 'calendar' && (
        <motion.div variants={itemVariants} className="soft-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <CaretLeft size={18} weight="bold" className="text-slate-600 dark:text-slate-300" />
            </button>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{MONTHS[month]} {year}</h3>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <CaretRight size={18} weight="bold" className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid — compact */}
          <div className="relative">
          {calendarLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-[#0B0F19]/60 backdrop-blur-[2px] rounded-xl">
              <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className={`grid grid-cols-7 gap-1 transition-opacity duration-200 ${calendarLoading ? 'opacity-40' : 'opacity-100'}`}>
            {calendarDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const status = dateStatusMap[day];
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              
              let cellBg = 'bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06]';
              let textColor = 'text-slate-600 dark:text-slate-400';
              if (status === 'present') {
                cellBg = 'bg-emerald-100 dark:bg-emerald-500/15 hover:bg-emerald-200 dark:hover:bg-emerald-500/25';
                textColor = 'text-emerald-700 dark:text-emerald-300';
              } else if (status === 'absent') {
                cellBg = 'bg-red-100 dark:bg-red-500/15 hover:bg-red-200 dark:hover:bg-red-500/25';
                textColor = 'text-red-700 dark:text-red-300';
              } else if (status === 'mixed') {
                cellBg = 'bg-amber-100 dark:bg-amber-500/15 hover:bg-amber-200 dark:hover:bg-amber-500/25';
                textColor = 'text-amber-700 dark:text-amber-300';
              }

              return (
                <button key={i} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${cellBg} ${textColor} ${
                    isToday ? 'ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-[#0B0F19]' : ''
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>All Present</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span>Partial</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500"></span>All Absent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded ring-2 ring-indigo-400"></span>Today</span>
          </div>
        </motion.div>
      )}

      {/* ── Day Detail Popup ───────────────────── */}
      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
              onClick={() => setSelectedDay(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-full max-w-md bg-white dark:bg-[#151B2B] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white">
                    {selectedDay} {MONTHS[month]} {year}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {dayDetail.length} class{dayDetail.length !== 1 ? 'es' : ''} recorded
                  </p>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <X size={18} weight="bold" className="text-slate-400" />
                </button>
              </div>
              {/* Body */}
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {dayDetail.length === 0 ? (
                  <div className="py-8 text-center">
                    <Calendar size={32} weight="duotone" className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">No attendance data for this date</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayDetail.map((r, i) => {
                      const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.absent;
                      return (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bg}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                            <span className="text-white text-xs font-extrabold">P{r.period_no}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{r.subject_name || r.subject_code}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{r.start_time} – {r.end_time}</p>
                          </div>
                          <span className={`text-xs font-extrabold uppercase ${cfg.text}`}>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── At-Risk Popup ───────────────────── */}
      <AnimatePresence>
        {showAtRisk && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
              onClick={() => setShowAtRisk(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-full max-w-md bg-white dark:bg-[#151B2B] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                      <Warning size={18} weight="fill" className="text-red-500" /> At-Risk Subjects
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {atRiskSubjects.length} subject{atRiskSubjects.length !== 1 ? 's' : ''} below {AT_RISK_THRESHOLD}%
                    </p>
                  </div>
                  <button onClick={() => setShowAtRisk(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                    <X size={18} weight="bold" className="text-slate-400" />
                  </button>
                </div>
                <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2.5">
                  {atRiskSubjects.map((subj, i) => {
                    const needed = subj.total_count > 0 ? Math.ceil((AT_RISK_THRESHOLD * subj.total_count / 100) - subj.present_count) : 0;
                    return (
                      <div key={i} className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-extrabold text-slate-800 dark:text-white">{subj.subject_name || subj.subject_code}</p>
                          <span className="text-sm font-extrabold text-red-600 dark:text-red-400">{subj.percentage}%</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{subj.subject_code} &middot; {subj.present_count}/{subj.total_count} classes</p>
                        {needed > 0 && (
                          <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                            Need {needed} more consecutive classes to reach {AT_RISK_THRESHOLD}%
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Subject Grid View ───────────────────────── */}
      {view === 'subjects' && (
        <motion.div variants={itemVariants}>
          {filteredConsolidated.length === 0 ? (
            <div className="soft-card p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-3"><Lottie animationData={searchEmptyAnimation} loop autoplay /></div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No attendance records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConsolidated.map((subj, i) => {
                const pct = subj.percentage;
                const barWidth = Math.max(pct, 3);
                return (
                  <motion.div key={i} variants={itemVariants} className="soft-card p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{subj.subject_name || subj.subject_code}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{subj.subject_code} &middot; {subj.present_count} / {subj.total_count} classes</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-sm font-extrabold ${getPctBg(pct)} ${getPctColor(pct)}`}>
                        {pct}%
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }}
                        className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-500' : 'bg-red-500'}`}
                      />
                    </div>
                    {pct < 75 && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-red-600 dark:text-red-400">
                        <Warning size={12} weight="fill" /> Below 75% threshold
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default StudentAttendance;
