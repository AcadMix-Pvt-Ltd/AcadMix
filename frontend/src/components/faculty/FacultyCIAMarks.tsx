// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartPie, CheckCircle, Clock, Warning, ArrowRight, PencilLine, CaretDown, CaretUp, Eye, Users, Exam, X } from '@phosphor-icons/react';
import { facultyPanelAPI, marksAPI } from '../../services/api';

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-500 dark:text-slate-400', icon: PencilLine },
  draft:       { label: 'Draft',       bg: 'bg-amber-50 dark:bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',   icon: PencilLine },
  submitted:   { label: 'Submitted',   bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', icon: Clock },
  approved:    { label: 'Approved',    bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
  rejected:    { label: 'Rejected',    bg: 'bg-red-50 dark:bg-red-500/10',       text: 'text-red-600 dark:text-red-400',       icon: Warning },
};

const COMP_TYPE_COLORS = {
  test:       'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30',
  assignment: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30',
  attendance: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  practical:  'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  seminar:    'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
  mini_project:'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/30',
  viva:       'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
  case_study: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30',
  group_discussion: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/30',
};

const FacultyCIAMarks = ({ navigate }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [entryModal, setEntryModal] = useState(null); // { subject, component }
  const [students, setStudents] = useState([]);
  const [markEntries, setMarkEntries] = useState({}); // studentId -> marks
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadDashboard = useCallback(async () => {
    try {
      const { data } = await facultyPanelAPI.ciaDashboard();
      setSubjects(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const openMarkEntry = async (subject, component) => {
    setEntryModal({ subject, component });
    setLoadingStudents(true);
    setMessage({ type: '', text: '' });
    try {
      const { data: studentList } = await marksAPI.students(subject.department, subject.batch, subject.section);
      setStudents(studentList);
      // If there's an existing entry, load it
      if (component.entry_id) {
        const { data: entry } = await marksAPI.getEntry(subject.assignment_id, component.type);
        if (entry && entry.entries) {
          const map = {};
          entry.entries.forEach(e => { map[e.student_id] = e.marks ?? ''; });
          setMarkEntries(map);
        } else {
          setMarkEntries({});
        }
      } else {
        setMarkEntries({});
      }
    } catch (e) {
      console.error(e);
      setStudents([]);
    }
    setLoadingStudents(false);
  };

  const handleMarkChange = (studentId, value) => {
    const numVal = value === '' ? '' : parseFloat(value);
    setMarkEntries(prev => ({ ...prev, [studentId]: numVal }));
  };

  const handleSaveMarks = async () => {
    if (!entryModal) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const entries = students.map(s => ({
        student_id: s.id,
        college_id: s.college_id || '',
        student_name: s.name,
        marks: markEntries[s.id] !== '' && markEntries[s.id] !== undefined ? Number(markEntries[s.id]) : null,
      }));
      await marksAPI.saveEntry({
        assignment_id: entryModal.subject.assignment_id,
        exam_type: entryModal.component.type,
        semester: entryModal.subject.semester,
        max_marks: entryModal.component.max_marks,
        entries,
      });
      setMessage({ type: 'success', text: 'Marks saved as draft' });
      await loadDashboard();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Failed to save marks' });
    }
    setSaving(false);
  };

  const handleSubmitMarks = async (entryId) => {
    try {
      await marksAPI.submit(entryId);
      setMessage({ type: 'success', text: 'Marks submitted for HOD approval' });
      await loadDashboard();
      setEntryModal(null);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Failed to submit' });
    }
  };

  const filledCount = students.filter(s => markEntries[s.id] !== '' && markEntries[s.id] !== undefined && markEntries[s.id] !== null).length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="soft-card p-5 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
      {/* Summary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Subjects</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{subjects.length}</p>
        </div>
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">With Template</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{subjects.filter(s => s.has_cia_template).length}</p>
        </div>
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Components</p>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{subjects.reduce((sum, s) => sum + (s.components?.length || 0), 0)}</p>
        </div>
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Pending</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {subjects.reduce((sum, s) => sum + (s.components || []).filter(c => c.entry_status === 'not_started' || c.entry_status === 'draft').length, 0)}
          </p>
        </div>
      </motion.div>

      {/* Subject Cards */}
      {subjects.length === 0 ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <Exam size={40} weight="duotone" className="mx-auto mb-3 text-slate-400" />
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-1">No Subject Assignments</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Subject assignments will appear here once assigned by the HOD.</p>
        </motion.div>
      ) : (
        subjects.map((sub, idx) => {
          const isExpanded = expandedSubject === idx;
          const completedComps = (sub.components || []).filter(c => c.entry_status === 'approved' || c.entry_status === 'submitted').length;
          const totalComps = (sub.components || []).length;
          const progressPct = totalComps > 0 ? Math.round((completedComps / totalComps) * 100) : 0;

          return (
            <motion.div key={idx} variants={itemVariants} className="soft-card overflow-hidden">
              {/* Subject Header */}
              <button onClick={() => setExpandedSubject(isExpanded ? null : idx)}
                className="w-full p-5 text-left flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <ChartPie size={24} weight="duotone" className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{sub.subject_name}</h3>
                    {!sub.has_cia_template && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">No Template</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{sub.subject_code} • {sub.batch}/{sub.section} • Sem {sub.semester}</p>
                  {totalComps > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{completedComps}/{totalComps}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {sub.template && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                      {sub.template.total_marks} marks
                    </span>
                  )}
                  {isExpanded ? <CaretUp size={16} className="text-slate-400" /> : <CaretDown size={16} className="text-slate-400" />}
                </div>
              </button>

              {/* Expanded Components */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-0 space-y-2 border-t border-slate-100 dark:border-white/5">
                      {(sub.components || []).length === 0 ? (
                        <div className="py-6 text-center">
                          <p className="text-sm text-slate-500 dark:text-slate-400">No CIA template assigned to this subject.</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Contact your admin to configure CIA assessment.</p>
                        </div>
                      ) : (
                        (sub.components || []).map((comp, ci) => {
                          const statusCfg = STATUS_CONFIG[comp.entry_status] || STATUS_CONFIG.not_started;
                          const StatusIcon = statusCfg.icon;
                          const typeColor = COMP_TYPE_COLORS[comp.type] || COMP_TYPE_COLORS.test;

                          return (
                            <div key={ci} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors mt-2 first:mt-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${typeColor}`}>
                                <Exam size={16} weight="duotone" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{comp.name}</p>
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{comp.type}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span>Max: <strong className="text-slate-700 dark:text-slate-300">{comp.max_marks}</strong></span>
                                  {comp.count && <span>Count: <strong className="text-slate-700 dark:text-slate-300">{comp.count}</strong></span>}
                                  {comp.best_of && <span>Best of: <strong className="text-slate-700 dark:text-slate-300">{comp.best_of}</strong></span>}
                                  {comp.student_count > 0 && <span className="flex items-center gap-0.5"><Users size={10} /> {comp.student_count} entries</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-xl ${statusCfg.bg} ${statusCfg.text}`}>
                                  <StatusIcon size={10} weight="fill" /> {statusCfg.label}
                                </span>
                                {comp.type !== 'attendance' && (
                                  <button
                                    onClick={() => openMarkEntry(sub, comp)}
                                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors"
                                    title={comp.entry_status === 'not_started' ? 'Enter Marks' : 'Edit Marks'}
                                  >
                                    <PencilLine size={14} weight="duotone" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })
      )}

      {/* Mark Entry Modal */}
      <AnimatePresence>
        {entryModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={() => setEntryModal(null)} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1A202C] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 z-10 overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{entryModal.component.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {entryModal.subject.subject_name} • {entryModal.subject.batch}/{entryModal.subject.section} • Max: {entryModal.component.max_marks}
                  </p>
                </div>
                <button onClick={() => setEntryModal(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <X size={18} weight="bold" className="text-slate-400" />
                </button>
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {loadingStudents ? (
                  <div className="py-8 text-center">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">Loading students...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No students found for this section.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{students.length} students</p>
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{filledCount}/{students.length} filled</p>
                    </div>
                    {students.map((student, si) => (
                      <div key={student.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                        <span className="text-[10px] font-extrabold text-slate-400 w-6 text-center">{si + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{student.name}</p>
                          <p className="text-[10px] text-slate-400">{student.register_number || student.email}</p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={entryModal.component.max_marks}
                          step="0.5"
                          value={markEntries[student.id] ?? ''}
                          onChange={e => handleMarkChange(student.id, e.target.value)}
                          className="w-20 px-3 py-2 rounded-xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white text-center focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all"
                          placeholder="--"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {message.text && (
                  <div className={`mt-4 flex items-center gap-2 p-3 rounded-xl text-sm font-bold ${
                    message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {message.type === 'success' ? <CheckCircle size={16} weight="fill" /> : <Warning size={16} weight="fill" />}
                    {message.text}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between flex-shrink-0">
                <button onClick={() => setEntryModal(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveMarks} disabled={saving || students.length === 0}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  {entryModal.component.entry_status === 'draft' && entryModal.component.entry_id && (
                    <button onClick={() => handleSubmitMarks(entryModal.component.entry_id)}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-md transition-colors">
                      Submit for Review
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FacultyCIAMarks;
