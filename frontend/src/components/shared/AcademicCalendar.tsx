// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarDots, CaretLeft, CaretRight, Star, GraduationCap, Exam, Sun, Briefcase } from '@phosphor-icons/react';
import api from '../../services/api';
import Lottie from 'lottie-react';
import { searchEmptyAnimation } from '../../assets/lottieAnimations';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_TYPES = {
  holiday:    { label: 'Holiday',      color: 'bg-red-500',     text: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-500/10',     icon: Sun },
  exam:       { label: 'Exam',         color: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-500/10',   icon: Exam },
  event:      { label: 'Event',        color: 'bg-purple-500',  text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', icon: Star },
  placement:  { label: 'Placement',    color: 'bg-indigo-500',  text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', icon: Briefcase },
  semester_start: { label: 'Sem Start', color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: GraduationCap },
  semester_end:   { label: 'Sem End',   color: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-500/10',   icon: GraduationCap },
};

const DEMO_CALENDAR = [{
  id: 'demo-1', semester: 2, academic_year: '2025-26',
  start_date: '2026-01-06', end_date: '2026-05-15',
  working_days: ['MON','TUE','WED','THU','FRI','SAT'],
  events: [
    { date: '2026-01-14', name: 'Sankranti Holiday', type: 'holiday' },
    { date: '2026-01-26', name: 'Republic Day', type: 'holiday' },
    { date: '2026-02-26', name: 'Maha Shivaratri', type: 'holiday' },
    { date: '2026-03-10', name: 'CIA-1 Examinations Begin', type: 'exam' },
    { date: '2026-03-14', name: 'CIA-1 Examinations End', type: 'exam' },
    { date: '2026-03-30', name: 'Ugadi Holiday', type: 'holiday' },
    { date: '2026-04-01', name: 'Annual Day Celebrations', type: 'event' },
    { date: '2026-04-10', name: 'Good Friday', type: 'holiday' },
    { date: '2026-04-14', name: 'Ambedkar Jayanti', type: 'holiday' },
    { date: '2026-04-22', name: 'CIA-2 Examinations Begin', type: 'exam' },
    { date: '2026-04-26', name: 'CIA-2 Examinations End', type: 'exam' },
    { date: '2026-05-01', name: 'May Day', type: 'holiday' },
    { date: '2026-05-05', name: 'End Semester Exams Begin', type: 'exam' },
    { date: '2026-05-15', name: 'End Semester Exams End', type: 'exam' },
  ]
}];

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

/**
 * AcademicCalendar — shared, role-agnostic calendar component.
 * @param {Function} [fetchCalendars] - async fn returning { data: [...] }. Defaults to studentAPI.academicCalendar.
 */
const AcademicCalendar = ({ fetchCalendars }: { fetchCalendars?: () => Promise<any> }) => {
  const { data: calendars = [], isLoading: calLoading } = useQuery({
    queryKey: ['academic-calendars'],
    queryFn: async () => {
      try {
        const fetcher = fetchCalendars || (() => api.get('/api/academic-calendars'));
        const { data } = await fetcher();
        const arr = Array.isArray(data) ? data : data?.data;
        if (arr && arr.length > 0) return arr;
        return DEMO_CALENDAR;
      } catch {
        return DEMO_CALENDAR;
      }
    },
  });

  const { data: placementDrives = [] } = useQuery({
    queryKey: ['student-placement-drives-calendar'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/student/placement-drives');
        const arr = Array.isArray(res.data) ? res.data : res.data?.data;
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    },
  });

  const loading = calLoading;
  const [selectedCalIdx, setSelectedCalIdx] = useState(0);
  const selectedCal = calendars[selectedCalIdx] || calendars[0] || null;
  const setSelectedCal = (cal: any) => {
    const idx = calendars.findIndex((c: any) => c.id === cal.id);
    if (idx >= 0) setSelectedCalIdx(idx);
  };

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  // All events from all calendars + placement drives
  const allEvents = useMemo(() => {
    const events = [];
    calendars.forEach(cal => {
      (cal.events || []).forEach(ev => {
        events.push({ ...ev, semester: cal.semester, academic_year: cal.academic_year });
      });
      events.push({ date: cal.start_date, name: `Semester ${cal.semester} Begins`, type: 'semester_start', semester: cal.semester });
      events.push({ date: cal.end_date, name: `Semester ${cal.semester} Ends`, type: 'semester_end', semester: cal.semester });
    });
    // Inject placement drives as calendar events
    placementDrives.forEach(d => {
      if (d.drive_date) {
        events.push({
          date: d.drive_date.split('T')[0],
          name: `${d.company_name || 'Company'} — ${d.role_title || 'Drive'}`,
          type: 'placement',
        });
      }
    });
    return events;
  }, [calendars, placementDrives]);

  const dayEventsMap = useMemo(() => {
    const map = {};
    allEvents.forEach(ev => {
      if (!ev.date) return;
      const d = new Date(ev.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    });
    return map;
  }, [allEvents, month, year]);

  const workingDays = useMemo(() => {
    return new Set(selectedCal?.working_days || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
  }, [selectedCal]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  }, [month, year]);

  const [selectedDay, setSelectedDay] = useState(null);

  const selectedDayEvents = useMemo(() => {
    return selectedDay ? (dayEventsMap[selectedDay] || []) : [];
  }, [selectedDay, dayEventsMap]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelectedDay(null); };

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allEvents.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  }, [allEvents]);

  if (loading) {
    return (
      <div className="soft-card p-6 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-7 gap-2">{Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        ))}</div>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-28 h-28 mx-auto mb-4"><Lottie animationData={searchEmptyAnimation} loop autoplay /></div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Academic Calendar</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">The academic calendar will appear once your institution configures it.</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 max-w-4xl">
      {/* Semester selector */}
      {calendars.length > 1 && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 overflow-x-auto">
          {calendars.map((cal, i) => (
            <button key={i} onClick={() => setSelectedCal(cal)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCal?.id === cal.id 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/10'
              }`}
            >
              {cal.academic_year} • Sem {cal.semester}
            </button>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Calendar */}
        <motion.div variants={itemVariants} className="soft-card p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <CaretLeft size={16} weight="bold" className="text-slate-600 dark:text-slate-300" />
            </button>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{MONTHS[month]} {year}</h3>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <CaretRight size={16} weight="bold" className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 py-0.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const events = dayEventsMap[day] || [];
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              const isSelected = selectedDay === day;
              const dayOfWeek = new Date(year, month, day).getDay();
              const dayCode = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dayOfWeek];
              const isWorkingDay = workingDays.has(dayCode);
              const hasHoliday = events.some(e => e.type === 'holiday');
              const hasExam = events.some(e => e.type === 'exam');
              const hasEvent = events.some(e => e.type === 'event');
              const hasPlacement = events.some(e => e.type === 'placement');

              let cellBg = isWorkingDay ? 'bg-white dark:bg-white/5' : 'bg-slate-50 dark:bg-slate-800/30';
              if (hasHoliday) cellBg = 'bg-red-50 dark:bg-red-500/10';
              else if (hasExam) cellBg = 'bg-blue-50 dark:bg-blue-500/10';
              else if (hasPlacement) cellBg = 'bg-indigo-50 dark:bg-indigo-500/10';
              else if (hasEvent) cellBg = 'bg-purple-50 dark:bg-purple-500/10';

              return (
                <button key={i} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition-all duration-200 ${cellBg} ${
                    isSelected ? 'z-10 ring-2 ring-indigo-500/70 shadow-md shadow-indigo-500/15' : ''
                  } ${isToday ? 'ring-2 ring-indigo-400/50' : ''} hover:brightness-95 dark:hover:brightness-110`}
                >
                  <span className={`${hasHoliday ? 'text-red-700 dark:text-red-300' : hasExam ? 'text-blue-700 dark:text-blue-300' : !isWorkingDay ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {day}
                  </span>
                  {events.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {events.slice(0, 3).map((e, ei) => {
                        const cfg = EVENT_TYPES[e.type] || EVENT_TYPES.event;
                        return <span key={ei} className={`w-1 h-1 rounded-full ${cfg.color}`}></span>;
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2.5 mt-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex-wrap">
            {Object.entries(EVENT_TYPES).slice(0, 5).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${cfg.color}`}></span>{cfg.label}</span>
            ))}
          </div>

          {/* Selected day detail */}
          {selectedDay && selectedDayEvents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 pt-5 border-t border-slate-100 dark:border-white/10 space-y-2">
              {selectedDayEvents.map((ev, i) => {
                const cfg = EVENT_TYPES[ev.type] || EVENT_TYPES.event;
                const Icon = cfg.icon;
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bg}`}>
                    <div className={`w-8 h-8 rounded-xl ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} weight="fill" className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{ev.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{ev.date}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Upcoming Events Sidebar */}
        <motion.div variants={itemVariants} className="soft-card p-4 lg:col-span-2">
          <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Upcoming</h4>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev, i) => {
                const cfg = EVENT_TYPES[ev.type] || EVENT_TYPES.event;
                const Icon = cfg.icon;
                const d = new Date(ev.date);
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex flex-col items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs font-extrabold ${cfg.text}`}>{d.getDate()}</span>
                      <span className="text-[9px] font-bold text-slate-400">{MONTHS[d.getMonth()]?.slice(0, 3)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{ev.name}</p>
                      <p className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AcademicCalendar;
