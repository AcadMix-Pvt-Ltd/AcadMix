// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { timetableAPI, attendanceAPI, syllabusAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { ClipboardText, ArrowLeft, Check, X as XIcon, UserCircle, CalendarCheck, Clock, Users, BookOpenText, CaretDown, CaretUp, CheckCircle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface PeriodSlot {
  id: string;
  period_no: number;
  start_time: string;
  end_time: string;
  subject_code: string;
  subject_name?: string;
  batch: string;
  section: string;
  room?: string;
}

interface Student {
  id: string;
  name: string;
  rollNo: string;
}

interface SyllabusTopic {
  id: string;
  topic_no: number;
  title: string;
  hours: number;
}

interface SyllabusUnit {
  unit_id: string;
  unit_no: number;
  unit_title: string;
  topics: SyllabusTopic[];
}

interface AttendanceMarkerProps {
  user: {
    id: string;
    name: string;
    role: string;
    college_id: string;
  };
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function AttendanceMarker({ user }: AttendanceMarkerProps) {
  const [todayPeriods, setTodayPeriods] = useState<PeriodSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<PeriodSlot | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Syllabus topic states
  const [syllabusUnits, setSyllabusUnits] = useState<SyllabusUnit[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [topicSelectorOpen, setTopicSelectorOpen] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);

  useEffect(() => { fetchTodayPeriods(); }, []);

  const fetchTodayPeriods = async () => {
    try {
      const res = await timetableAPI.getFacultyToday();
      setTodayPeriods(res.data);
    } catch (err) {
      setTodayPeriods([
        { id: '1', period_no: 1, start_time: '09:00', end_time: '09:50', subject_code: 'DS301', subject_name: 'Data Structures', batch: '2026', section: 'A', room: 'LH-1' },
        { id: '2', period_no: 2, start_time: '09:50', end_time: '10:40', subject_code: 'DS302', subject_name: 'DBMS', batch: '2026', section: 'A', room: 'LH-2' },
        { id: '3', period_no: 3, start_time: '11:00', end_time: '11:50', subject_code: 'DS303', subject_name: 'Computer Networks', batch: '2026', section: 'A', room: 'Lab-1' },
        { id: '4', period_no: 4, start_time: '11:50', end_time: '12:40', subject_code: 'DS304', subject_name: 'Operating Systems', batch: '2026', section: 'A', room: 'LH-3' },
        { id: '5', period_no: 5, start_time: '13:30', end_time: '14:20', subject_code: 'DS305', subject_name: 'Discrete Math', batch: '2026', section: 'A', room: 'LH-1' },
        { id: '6', period_no: 6, start_time: '14:20', end_time: '15:10', subject_code: 'DS306', subject_name: 'DS Lab', batch: '2026', section: 'A', room: 'Lab-3' },
      ]);
    } finally { setLoading(false); }
  };

  const fetchSyllabusTopics = async (subjectCode: string) => {
    setLoadingTopics(true);
    try {
      const res = await syllabusAPI.getTopicsBySubject(subjectCode);
      setSyllabusUnits(res.data || []);
    } catch {
      setSyllabusUnits([]);
    } finally { setLoadingTopics(false); }
  };

  const handleSelectSlot = (slot: PeriodSlot) => {
    setSelectedSlot(slot);
    setSelectedTopicIds([]);
    setTopicSelectorOpen(false);
    setActiveUnitId(null);
    setUnitDropdownOpen(false);
    fetchSyllabusTopics(slot.subject_code);

    const mockStudents: Student[] = [
      { id: 'S001', name: 'Aarav Patel', rollNo: '22WJ1A0501' },
      { id: 'S002', name: 'Diya Sharma', rollNo: '22WJ1A0502' },
      { id: 'S003', name: 'Kabir Singh', rollNo: '22WJ1A0503' },
      { id: 'S004', name: 'Ananya Gupta', rollNo: '22WJ1A0504' },
      { id: 'S005', name: 'Rohan Verma', rollNo: '22WJ1A0505' },
    ];
    setStudents(mockStudents);
    const defaultState: Record<string, string> = {};
    mockStudents.forEach(s => defaultState[s.id] = 'present');
    setAttendanceState(defaultState);
  };

  const toggleStudent = (studentId: string, status: string) => {
    setAttendanceState(prev => ({ ...prev, [studentId]: status }));
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await attendanceAPI.mark({
        period_slot_id: selectedSlot!.id,
        date: new Date().toISOString().split('T')[0],
        entries: Object.entries(attendanceState).map(([student_id, status]) => ({ student_id, status })),
        covered_topic_ids: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
      });
      toast({ title: 'Attendance Saved', description: `Records logged${selectedTopicIds.length ? ` · ${selectedTopicIds.length} topic(s) marked` : ''}.` });
      setSelectedSlot(null);
      setSyllabusUnits([]);
      setSelectedTopicIds([]);
    } catch (err) {
      toast({ title: 'Saved (Demo)', description: 'Mock submission — backend may not be connected.', variant: 'default' });
      setSelectedSlot(null);
    } finally { setSubmitting(false); }
  };

  const presentCount = Object.values(attendanceState).filter(v => v === 'present').length;
  const absentCount = Object.values(attendanceState).filter(v => v === 'absent').length;
  const odCount = Object.values(attendanceState).filter(v => v === 'od').length;

  const PERIOD_COLORS = [
    'from-indigo-500 to-blue-500',
    'from-emerald-500 to-teal-500',
    'from-violet-500 to-purple-500',
    'from-rose-500 to-pink-500',
    'from-amber-500 to-orange-500',
    'from-cyan-500 to-sky-500',
    'from-fuchsia-500 to-pink-500',
    'from-lime-500 to-green-500',
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
          Attendance Portal
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {todayPeriods.length} periods today
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selectedSlot ? (
          /* ── Period Selection Grid ─────────── */
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayPeriods.length === 0 ? (
              <div className="col-span-full soft-card p-12 text-center">
                <CalendarCheck size={48} weight="duotone" className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p className="text-lg font-bold text-slate-500 dark:text-slate-400">No periods assigned today</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Enjoy your free day!</p>
              </div>
            ) : (
              todayPeriods.map((slot, idx) => (
                <motion.div
                  key={slot.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: idx * 0.06 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectSlot(slot)}
                  className="soft-card group cursor-pointer overflow-hidden relative"
                >
                  {/* Gradient accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${PERIOD_COLORS[idx % PERIOD_COLORS.length]}`} />
                  
                  <div className="p-5 pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${PERIOD_COLORS[idx % PERIOD_COLORS.length]} flex items-center justify-center shadow-lg shadow-indigo-500/10`}>
                          <span className="text-sm font-extrabold text-white">P{slot.period_no}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{slot.subject_code}</h3>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{slot.subject_name || slot.subject_code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-xl">
                        <Clock size={12} weight="bold" />
                        {slot.start_time} – {slot.end_time}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                        <Users size={16} weight="duotone" />
                        {slot.batch} Section {slot.section}
                      </div>
                      <span className="text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-xl">
                        {slot.room || 'TBA'}
                      </span>
                    </div>
                  </div>

                  {/* Hover CTA */}
                  <div className="px-5 pb-4 pt-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 group-hover:text-emerald-600 transition-colors">
                      <ClipboardText size={14} weight="duotone" />
                      Tap to mark attendance →
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        ) : (
          /* ── Attendance Roster ─────────── */
          <motion.div key="roster" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="soft-card overflow-hidden">
            {/* Roster Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setSelectedSlot(null); setSyllabusUnits([]); setSelectedTopicIds([]); }}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                  >
                    <ArrowLeft size={18} weight="bold" />
                  </button>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {selectedSlot.subject_name || selectedSlot.subject_code}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Period {selectedSlot.period_no} · {selectedSlot.batch} Section {selectedSlot.section} · {selectedSlot.start_time}–{selectedSlot.end_time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { const s: Record<string, string> = {}; students.forEach(st => s[st.id] = 'absent'); setAttendanceState(s); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Mark All Absent
                  </button>
                  <button
                    onClick={() => { const s: Record<string, string> = {}; students.forEach(st => s[st.id] = 'present'); setAttendanceState(s); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-colors"
                  >
                    Mark All Present
                  </button>
                </div>
              </div>
            </div>

            {/* ── Topic Selector (NEW) ─────────── */}
            {syllabusUnits.length > 0 && (
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] bg-indigo-50/50 dark:bg-indigo-500/[0.04]">
                <button
                  onClick={() => setTopicSelectorOpen(!topicSelectorOpen)}
                  className="flex items-center justify-between w-full group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
                      <BookOpenText size={16} weight="duotone" className="text-indigo-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        Topics Covered This Period
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {selectedTopicIds.length > 0
                          ? `${selectedTopicIds.length} topic${selectedTopicIds.length > 1 ? 's' : ''} selected`
                          : 'Select topics taught in this class'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedTopicIds.length > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-indigo-500 text-white">
                        {selectedTopicIds.length}
                      </span>
                    )}
                    {topicSelectorOpen
                      ? <CaretUp size={16} weight="bold" className="text-slate-400" />
                      : <CaretDown size={16} weight="bold" className="text-slate-400" />
                    }
                  </div>
                </button>

                <AnimatePresence>
                  {topicSelectorOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      {/* ── Unit Dropdown ─────────── */}
                      <div className="mt-3">
                        <button
                          onClick={() => setUnitDropdownOpen(!unitDropdownOpen)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all duration-200 shadow-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
                              <BookOpenText size={14} weight="duotone" className="text-indigo-500" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {activeUnitId
                                ? (() => {
                                    const u = syllabusUnits.find(u => u.unit_id === activeUnitId);
                                    return u ? `Unit ${u.unit_no}: ${u.unit_title}` : 'Select Unit / Chapter';
                                  })()
                                : 'Select Unit / Chapter'
                              }
                            </span>
                          </div>
                          <CaretDown size={16} weight="bold" className={`text-slate-400 transition-transform duration-200 ${unitDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown menu */}
                        <AnimatePresence>
                          {unitDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="mt-1.5 rounded-xl bg-white dark:bg-[#1E2432] border border-slate-200/80 dark:border-white/[0.08] shadow-xl shadow-slate-900/10 dark:shadow-black/30 overflow-hidden"
                            >
                              {syllabusUnits.map((unit, idx) => {
                                const unitSelectedCount = unit.topics.filter(t => selectedTopicIds.includes(t.id)).length;
                                const isActive = activeUnitId === unit.unit_id;
                                return (
                                  <button
                                    key={unit.unit_id}
                                    onClick={() => { setActiveUnitId(unit.unit_id); setUnitDropdownOpen(false); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-150 ${
                                      idx < syllabusUnits.length - 1 ? 'border-b border-slate-50 dark:border-white/[0.04]' : ''
                                    } ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-indigo-50/70 dark:hover:bg-indigo-500/10'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                                        isActive
                                          ? 'bg-indigo-500 text-white'
                                          : 'bg-gradient-to-br from-indigo-500/15 to-violet-500/15 dark:from-indigo-500/20 dark:to-violet-500/20 text-indigo-600 dark:text-indigo-400'
                                      }`}>
                                        {unit.unit_no}
                                      </span>
                                      <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{unit.unit_title}</p>
                                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{unit.topics.length} topics</p>
                                      </div>
                                    </div>
                                    {unitSelectedCount > 0 && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white">
                                        {unitSelectedCount} ✓
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── Active Unit Topics ─────────── */}
                      <AnimatePresence mode="wait">
                        {activeUnitId && (() => {
                          const unit = syllabusUnits.find(u => u.unit_id === activeUnitId);
                          if (!unit) return null;
                          return (
                            <motion.div
                              key={unit.unit_id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.2 }}
                              className="mt-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                  Unit {unit.unit_no}: {unit.unit_title}
                                </p>
                                <button
                                  onClick={() => setUnitDropdownOpen(true)}
                                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 transition-colors"
                                >
                                  Change ↓
                                </button>
                              </div>
                              <div className="space-y-1">
                                {unit.topics.map(topic => {
                                  const isSelected = selectedTopicIds.includes(topic.id);
                                  return (
                                    <button
                                      key={topic.id}
                                      onClick={() => toggleTopic(topic.id)}
                                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150 ${
                                        isSelected
                                          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                          : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-100 dark:border-white/[0.06]'
                                      }`}
                                    >
                                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                        isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10'
                                      }`}>
                                        {isSelected && <Check size={12} weight="bold" className="text-white" />}
                                      </div>
                                      <span className="text-xs font-semibold flex-1 truncate">
                                        {topic.topic_no}. {topic.title}
                                      </span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400'
                                      }`}>
                                        {topic.hours}h
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Show a subtle hint if no syllabus is defined */}
            {syllabusUnits.length === 0 && !loadingTopics && (
              <div className="px-5 sm:px-6 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-amber-50/50 dark:bg-amber-500/[0.03]">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <BookOpenText size={14} weight="duotone" />
                  No syllabus defined for this subject — topic tracking will be skipped
                </div>
              </div>
            )}

            {loadingTopics && (
              <div className="px-5 sm:px-6 py-3 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                  Loading syllabus topics...
                </div>
              </div>
            )}

            {/* Student Roster */}
            <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {students.map((student, idx) => {
                const st = attendanceState[student.id];
                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Index + Avatar */}
                    <div className="flex items-center gap-3 w-16 sm:w-20 flex-shrink-0">
                      <span className="text-xs font-bold text-slate-400 w-5 text-right">{idx + 1}</span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                        st === 'present' ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500' :
                        st === 'absent' ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-500' :
                        'bg-amber-50 dark:bg-amber-500/15 text-amber-500'
                      } transition-colors`}>
                        {student.name.charAt(0)}
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{student.name}</p>
                      <p className="text-xs font-medium text-slate-400 font-mono">{student.rollNo}</p>
                    </div>

                    {/* Status Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {[
                        { key: 'present', label: 'P', activeColor: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20' },
                        { key: 'absent', label: 'A', activeColor: 'bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-500/20' },
                        { key: 'od', label: 'OD', activeColor: 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-500/20' },
                      ].map(btn => (
                        <button
                          key={btn.key}
                          onClick={() => toggleStudent(student.id, btn.key)}
                          className={`w-10 h-9 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                            st === btn.key
                              ? btn.activeColor
                              : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 sm:px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-5 text-sm font-bold">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {presentCount} Present
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> {absentCount} Absent
                </span>
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {odCount} On Duty
                </span>
                {selectedTopicIds.length > 0 && (
                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <BookOpenText size={14} weight="duotone" /> {selectedTopicIds.length} Topics
                  </span>
                )}
              </div>
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Attendance'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
