// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarX, PaperPlaneTilt, CheckCircle, Clock, X, Warning, Plus } from '@phosphor-icons/react';
import { leaveAPI } from '../../services/api';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

const LEAVE_TYPES = ['Casual Leave', 'Medical Leave', 'Earned Leave', 'On Duty', 'Compensatory Off'];

const STATUS_CONFIG = {
  pending:   { color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20', icon: Clock, label: 'Pending' },
  approved:  { color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', icon: CheckCircle, label: 'Approved' },
  rejected:  { color: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20', icon: X, label: 'Rejected' },
  cancelled: { color: 'bg-slate-100 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600', icon: CalendarX, label: 'Cancelled' },
};

const DEMO_LEAVES = [
  { id: '1', leave_type: 'Casual Leave', from_date: '2026-03-20', to_date: '2026-03-21', reason: 'Personal work', status: 'approved', reviewed_at: '2026-03-19', review_remarks: null },
  { id: '2', leave_type: 'Medical Leave', from_date: '2026-04-05', to_date: '2026-04-07', reason: 'Fever and cold', status: 'approved', reviewed_at: '2026-04-04', review_remarks: 'Get well soon' },
  { id: '3', leave_type: 'On Duty', from_date: '2026-04-15', to_date: '2026-04-15', reason: 'AICTE Workshop at Hyderabad', status: 'pending', reviewed_at: null, review_remarks: null },
];

const FacultyLeaveManager = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: 'Casual Leave', from_date: '', to_date: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await leaveAPI.myLeaves();
        setLeaves(data?.length > 0 ? data : DEMO_LEAVES);
      } catch { setLeaves(DEMO_LEAVES); }
      setLoading(false);
    };
    load();
  }, []);

  const handleApply = async () => {
    if (!form.from_date || !form.to_date || !form.reason.trim()) {
      setError('All fields are required'); return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      await leaveAPI.apply(form);
      setSuccess('Leave applied successfully');
      setShowForm(false);
      setForm({ leave_type: 'Casual Leave', from_date: '', to_date: '', reason: '' });
      const { data } = await leaveAPI.myLeaves();
      setLeaves(data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to apply');
    }
    setSaving(false);
  };

  const handleCancel = async (leaveId) => {
    try {
      await leaveAPI.cancel(leaveId);
      setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: 'cancelled' } : l));
    } catch (e) { setError(e.response?.data?.detail || 'Failed to cancel'); }
  };

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;

  if (loading) {
    return (
      <div className="soft-card p-6 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
        {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3"></div>)}
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* Stats row */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: leaves.length, color: 'text-slate-700 dark:text-slate-200' },
          { label: 'Pending', value: pendingCount, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Approved', value: approvedCount, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className="soft-card p-4 text-center">
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Apply button */}
      <motion.div variants={itemVariants}>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-colors">
          <Plus size={16} weight="bold" /> Apply for Leave
        </button>
      </motion.div>

      {/* Apply form */}
      {showForm && (
        <motion.div variants={itemVariants} className="soft-card p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">New Leave Application</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Leave Type</label>
              <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400">
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">From</label>
              <input type="date" value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">To</label>
              <input type="date" value={form.to_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Reason</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              placeholder="Reason for leave..." />
          </div>
          {error && <p className="text-sm font-bold text-red-500 flex items-center gap-1"><Warning size={14} weight="fill" /> {error}</p>}
          {success && <p className="text-sm font-bold text-emerald-500 flex items-center gap-1"><CheckCircle size={14} weight="fill" /> {success}</p>}
          <div className="flex gap-2">
            <button onClick={handleApply} disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-colors disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Leave list */}
      <motion.div variants={itemVariants} className="soft-card p-5">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4">Leave History</h3>
        <div className="space-y-2">
          {leaves.map((l, i) => {
            const cfg = STATUS_CONFIG[l.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.color}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/60 dark:bg-black/20">
                  <Icon size={16} weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{l.leave_type}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{l.from_date} → {l.to_date} · {l.reason}</p>
                  {l.review_remarks && <p className="text-[10px] text-slate-400 italic mt-0.5">"{l.review_remarks}"</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest">{cfg.label}</span>
                  {l.status === 'pending' && (
                    <button onClick={() => handleCancel(l.id)} className="text-[10px] font-bold text-red-500 hover:text-red-600 underline">Cancel</button>
                  )}
                </div>
              </div>
            );
          })}
          {leaves.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No leave records</p>}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FacultyLeaveManager;
