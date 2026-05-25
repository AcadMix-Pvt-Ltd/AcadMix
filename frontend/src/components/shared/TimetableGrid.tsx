// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Notebook, CheckCircle, Clock, X, PencilLine, Warning, CaretDown } from '@phosphor-icons/react';
import { timetableAPI, facultyPanelAPI } from '../../services/api';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
const METHODOLOGIES = ['Lecture', 'Demo', 'Lab', 'Discussion', 'Tutorial'];

const SUBJECT_COLORS = [
  { bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/30', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/30', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-teal-50 dark:bg-teal-500/10', border: 'border-teal-200 dark:border-teal-500/30', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/30', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-cyan-50 dark:bg-cyan-500/10', border: 'border-cyan-200 dark:border-cyan-500/30', text: 'text-cyan-700 dark:text-cyan-300' },
];

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

/**
 * TimetableGrid — shared, role-agnostic timetable component.
 *
 * @param {string}   mode          - 'view' | 'plan' | 'record'. Student/HOD panels will always use 'view'.
 * @param {Function} [fetchSlots]  - async fn returning { data: [...slots] }. Defaults to timetableAPI.getFacultyWeek.
 * @param {Function} [fetchRecords]- async fn(month, year) returning { data: [...records] }. Defaults to facultyPanelAPI.teachingRecords.
 * @param {Function} [onSavePlan]  - async fn(payload) for saving teaching plan. Defaults to facultyPanelAPI methods.
 * @param {Function} [onSaveRecord]- async fn(payload) for saving class record. Defaults to facultyPanelAPI methods.
 */
const TimetableGrid = ({ mode = 'view', fetchSlots, fetchRecords, onSavePlan, onSaveRecord }) => {
  const [slots, setSlots] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ planned_topic: '', actual_topic: '', methodology: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const today = useMemo(() => new Date(todayISO), [todayISO]);
  const todayDay = useMemo(() => ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][today.getDay()], [today]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const slotsFetcher = fetchSlots || (() => timetableAPI.getFacultyWeek());
      const recordsFetcher = fetchRecords || ((m, y) => facultyPanelAPI.teachingRecords({ month: m, year: y }));

      const [slotsRes, recordsRes] = await Promise.all([
        slotsFetcher(),
        mode !== 'view' ? recordsFetcher(today.getMonth() + 1, today.getFullYear()) : Promise.resolve({ data: [] }),
      ]);
      setSlots(slotsRes.data);
      setRecords(recordsRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [mode, today, fetchSlots, fetchRecords]);

  useEffect(() => { loadData(); }, [loadData]);

  const subjectColorMap = useMemo(() => {
    const subjects = [...new Set(slots.map(s => s.subject_code).filter(Boolean))];
    const map = {};
    subjects.forEach((s, i) => { map[s] = i % SUBJECT_COLORS.length; });
    return map;
  }, [slots]);

  const grid = useMemo(() => {
    const g = {};
    DAYS.forEach(d => { g[d] = {}; });
    slots.forEach(s => { if (g[s.day]) g[s.day][s.period_no] = s; });
    return g;
  }, [slots]);

  const periods = useMemo(() => {
    const nums = [...new Set(slots.map(s => s.period_no))].sort((a, b) => a - b);
    return nums.length > 0 ? nums : [1, 2, 3, 4, 5, 6];
  }, [slots]);

  const periodTimings = useMemo(() => {
    const map = {};
    slots.forEach(s => {
      if (s.period_no && s.start_time && !map[s.period_no]) {
        map[s.period_no] = `${s.start_time}–${s.end_time}`;
      }
    });
    return map;
  }, [slots]);

  const recordMap = useMemo(() => {
    const m = {};
    records.forEach(r => { m[`${r.period_slot_id}-${r.date}`] = r; });
    return m;
  }, [records]);

  const weekDates = useMemo(() => {
    const map = {};
    const d = new Date(today);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    DAYS.forEach((day, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      map[day] = dt.toISOString().split('T')[0];
    });
    return map;
  }, [today]);

  const getRecordStatus = (slot, day) => {
    const dateStr = weekDates[day];
    const rec = recordMap[`${slot.id}-${dateStr}`];
    if (!rec) return { status: 'empty', record: null };
    if (rec.is_class_record_submitted) return { status: 'submitted', record: rec };
    if (rec.planned_topic) return { status: 'planned', record: rec };
    return { status: 'empty', record: rec };
  };

  const canEditPlan = (day) => {
    const dateStr = weekDates[day];
    if (!dateStr) return false;
    const target = new Date(dateStr);
    const diff = Math.floor((target - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 14;
  };

  const canEditRecord = (day) => {
    const dateStr = weekDates[day];
    if (!dateStr) return false;
    const target = new Date(dateStr);
    const diff = Math.floor((today - target) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 3;
  };

  const handleCellClick = (slot, day) => {
    if (mode === 'view') return;
    const dateStr = weekDates[day];
    const rec = recordMap[`${slot.id}-${dateStr}`];

    if (mode === 'plan' && !canEditPlan(day)) return;
    if (mode === 'record' && !canEditRecord(day)) return;

    setSelectedSlot({ slot, day, date: dateStr, record: rec });
    setFormData({
      planned_topic: rec?.planned_topic || '',
      actual_topic: rec?.actual_topic || '',
      methodology: rec?.methodology || '',
      remarks: rec?.remarks || '',
    });
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'plan') {
        if (!formData.planned_topic.trim()) { setError('Planned topic is required'); setSaving(false); return; }
        const savePlan = onSavePlan || (async (payload) => {
          if (payload.recordId) {
            await facultyPanelAPI.updateTeachingRecord(payload.recordId, { planned_topic: payload.planned_topic });
          } else {
            await facultyPanelAPI.saveTeachingPlan({ period_slot_id: payload.period_slot_id, date: payload.date, planned_topic: payload.planned_topic });
          }
        });
        await savePlan({
          recordId: selectedSlot.record?.id,
          period_slot_id: selectedSlot.slot.id,
          date: selectedSlot.date,
          planned_topic: formData.planned_topic,
        });
        setSuccess('Teaching plan saved');
      } else if (mode === 'record') {
        if (!formData.actual_topic.trim()) { setError('Actual topic is required'); setSaving(false); return; }
        if (!formData.methodology) { setError('Methodology is required'); setSaving(false); return; }
        const saveRec = onSaveRecord || (async (payload) => {
          if (payload.recordId && payload.isSubmitted) {
            await facultyPanelAPI.updateTeachingRecord(payload.recordId, { actual_topic: payload.actual_topic, methodology: payload.methodology, remarks: payload.remarks });
          } else {
            await facultyPanelAPI.saveClassRecord({ period_slot_id: payload.period_slot_id, date: payload.date, actual_topic: payload.actual_topic, methodology: payload.methodology, remarks: payload.remarks });
          }
        });
        await saveRec({
          recordId: selectedSlot.record?.id,
          isSubmitted: selectedSlot.record?.is_class_record_submitted,
          period_slot_id: selectedSlot.slot.id,
          date: selectedSlot.date,
          actual_topic: formData.actual_topic,
          methodology: formData.methodology,
          remarks: formData.remarks,
        });
        setSuccess('Class record submitted');
      }
      await loadData();
      setTimeout(() => setSelectedSlot(null), 800);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="soft-card p-6 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-7 gap-2">{Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        ))}</div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* Mode indicator */}
      {mode !== 'view' && (
        <motion.div variants={itemVariants} className={`soft-card p-3 flex items-center gap-2 text-sm font-bold ${
          mode === 'plan' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30'
          : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
        }`}>
          {mode === 'plan' ? <Notebook size={16} weight="duotone" /> : <PencilLine size={16} weight="duotone" />}
          {mode === 'plan' ? 'Click a cell to set the planned topic (up to 14 days ahead)' : 'Click a cell to enter what was actually covered (today to 3 days ago)'}
        </motion.div>
      )}

      {/* Desktop Grid */}
      <motion.div variants={itemVariants} className="soft-card p-4 sm:p-5 overflow-x-auto hidden md:block">
        <table className="w-full table-fixed" style={{ minWidth: `${80 + periods.length * 130}px` }}>
          <thead>
            <tr>
              <th className="text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 py-3 px-2" style={{ width: '72px' }}>Day</th>
              {periods.map(p => (
                <th key={p} className="text-center py-3 px-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 block">P{p}</span>
                  {periodTimings[p] && (
                    <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 block mt-0.5">{periodTimings[p]}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => {
              const isToday = day === todayDay;
              return (
                <tr key={day} className={isToday ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}>
                  <td className="py-1.5 px-2">
                    <div>
                      <span className={`text-xs font-extrabold block ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {DAY_LABELS[day]?.slice(0, 3)}
                      </span>
                      <span className="text-[9px] text-slate-400">{weekDates[day]?.slice(5)}</span>
                    </div>
                  </td>
                  {periods.map(p => {
                    const slot = grid[day]?.[p];
                    if (!slot || !slot.subject_code) {
                      return <td key={p} className="py-1.5 px-1"><div className="h-[72px] rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-slate-700"></div></td>;
                    }

                    const colorIdx = subjectColorMap[slot.subject_code] || 0;
                    const sc = SUBJECT_COLORS[colorIdx];
                    const { status, record } = mode !== 'view' ? getRecordStatus(slot, day) : { status: 'none', record: null };
                    const isClickable = mode !== 'view' && (mode === 'plan' ? canEditPlan(day) : canEditRecord(day));

                    return (
                      <td key={p} className="py-1.5 px-1">
                        <div 
                          onClick={() => isClickable && handleCellClick(slot, day)}
                          className={`h-[60px] rounded-xl p-2 border flex flex-col items-center justify-center text-center ${sc.bg} ${sc.border} ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1 dark:hover:ring-offset-[#0B0F19] transition-all' : ''}`}
                        >
                          <div>
                            <p className={`text-xs font-extrabold truncate ${sc.text}`}>{slot.subject_code}</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">{slot.batch}/{slot.section}</p>
                          </div>
                          {mode !== 'view' && (
                            <div className="flex items-center gap-1">
                              {status === 'submitted' && <CheckCircle size={12} weight="fill" className="text-emerald-500" />}
                              {status === 'planned' && <Clock size={12} weight="duotone" className="text-indigo-400" />}
                              {status === 'empty' && isClickable && <PencilLine size={12} weight="duotone" className="text-slate-400" />}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>

      {/* Mobile Day Cards */}
      <div className="md:hidden space-y-3">
        {DAYS.map(day => {
          const daySlots = periods.map(p => grid[day]?.[p]).filter(s => s && s.subject_code);
          if (daySlots.length === 0) return null;
          const isToday = day === todayDay;

          return (
            <motion.div key={day} variants={itemVariants} className={`soft-card p-4 ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-[#0B0F19]' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-sm font-extrabold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                  {DAY_LABELS[day]} {isToday && <span className="text-xs font-bold text-indigo-400 ml-1">(Today)</span>}
                </h4>
                <span className="text-[10px] font-bold text-slate-400">{weekDates[day]}</span>
              </div>
              <div className="space-y-2">
                {daySlots.map((slot, i) => {
                  const colorIdx = subjectColorMap[slot.subject_code] || 0;
                  const sc = SUBJECT_COLORS[colorIdx];
                  const { status } = mode !== 'view' ? getRecordStatus(slot, day) : { status: 'none' };
                  const isClickable = mode !== 'view' && (mode === 'plan' ? canEditPlan(day) : canEditRecord(day));

                  return (
                    <div key={i} onClick={() => isClickable && handleCellClick(slot, day)}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${sc.bg} ${sc.border} ${isClickable ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}>
                      <div className="w-8 h-8 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">P{slot.period_no}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${sc.text}`}>{slot.subject_code}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{slot.start_time}–{slot.end_time} • {slot.batch}/{slot.section}</p>
                      </div>
                      {mode !== 'view' && (
                        <div className="flex-shrink-0">
                          {status === 'submitted' && <CheckCircle size={16} weight="fill" className="text-emerald-500" />}
                          {status === 'planned' && <Clock size={16} weight="duotone" className="text-indigo-400" />}
                          {status === 'empty' && isClickable && <PencilLine size={16} weight="duotone" className="text-slate-400" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSlot(null)} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1A202C] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 z-10 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {mode === 'plan' ? 'Teaching Plan' : 'Class Record'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedSlot.slot.subject_name} • P{selectedSlot.slot.period_no} • {DAY_LABELS[selectedSlot.day]} {selectedSlot.date}
                  </p>
                </div>
                <button onClick={() => setSelectedSlot(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <X size={18} weight="bold" className="text-slate-400" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {mode === 'plan' && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Planned Topic *</label>
                    <textarea
                      value={formData.planned_topic}
                      onChange={e => setFormData(f => ({ ...f, planned_topic: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none resize-none transition-all"
                      placeholder="Enter the topic you plan to teach..."
                    />
                  </div>
                )}

                {mode === 'record' && (
                  <>
                    {selectedSlot.record?.planned_topic && (
                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">Planned Topic</p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">{selectedSlot.record.planned_topic}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Actual Topic Covered *</label>
                      <textarea
                        value={formData.actual_topic}
                        onChange={e => setFormData(f => ({ ...f, actual_topic: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none resize-none transition-all"
                        placeholder="Enter what was actually covered..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Methodology *</label>
                      <div className="flex flex-wrap gap-2">
                        {METHODOLOGIES.map(m => (
                          <button key={m} onClick={() => setFormData(f => ({ ...f, methodology: m }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              formData.methodology === m 
                                ? 'bg-indigo-500 text-white shadow-md' 
                                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                            }`}
                          >{m}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Remarks (optional)</label>
                      <input
                        type="text"
                        value={formData.remarks}
                        onChange={e => setFormData(f => ({ ...f, remarks: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all"
                        placeholder="Any additional notes..."
                      />
                    </div>
                  </>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-bold">
                    <Warning size={16} weight="fill" /> {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                    <CheckCircle size={16} weight="fill" /> {success}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3">
                <button onClick={() => setSelectedSlot(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-md transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : mode === 'plan' ? 'Save Plan' : 'Submit Record'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TimetableGrid;
