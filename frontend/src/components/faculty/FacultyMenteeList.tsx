// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Student, ChartLineUp, WarningCircle, Phone, Envelope } from '@phosphor-icons/react';
import { facultyPanelAPI } from '../../services/api';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

const DEMO_MENTEES = [
  { id: '1', name: 'Rahul Sharma', college_id: 'CSE2301', batch: '2023-27', section: 'A', department: 'CSE', cgpa: 8.5, attendance: 92, phone: '9876543210', email: 'rahul@gnitc.ac.in' },
  { id: '2', name: 'Priya Reddy', college_id: 'CSE2302', batch: '2023-27', section: 'A', department: 'CSE', cgpa: 7.8, attendance: 88, phone: '9876543211', email: 'priya@gnitc.ac.in' },
  { id: '3', name: 'Karthik Kumar', college_id: 'CSE2303', batch: '2023-27', section: 'A', department: 'CSE', cgpa: 5.2, attendance: 65, phone: '9876543212', email: 'karthik@gnitc.ac.in', atRisk: true },
  { id: '4', name: 'Sneha Patel', college_id: 'CSE2304', batch: '2023-27', section: 'B', department: 'CSE', cgpa: 9.1, attendance: 96, phone: '9876543213', email: 'sneha@gnitc.ac.in' },
  { id: '5', name: 'Arun Verma', college_id: 'CSE2305', batch: '2023-27', section: 'B', department: 'CSE', cgpa: 6.0, attendance: 72, phone: '9876543214', email: 'arun@gnitc.ac.in', atRisk: true },
];

const FacultyMenteeList = () => {
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await facultyPanelAPI.myMentees();
        setMentees(data?.length > 0 ? data : DEMO_MENTEES);
      } catch { setMentees(DEMO_MENTEES); }
      setLoading(false);
    };
    load();
  }, []);

  const atRiskCount = mentees.filter(m => m.atRisk || m.attendance < 75 || m.cgpa < 6).length;

  if (loading) {
    return (
      <div className="soft-card p-6 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
        {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3"></div>)}
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <div className="soft-card p-4 text-center">
          <p className="text-2xl font-extrabold text-slate-700 dark:text-slate-200">{mentees.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total Mentees</p>
        </div>
        <div className="soft-card p-4 text-center">
          <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">{atRiskCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">At Risk</p>
        </div>
      </motion.div>

      {/* Mentee cards */}
      <motion.div variants={itemVariants} className="soft-card p-5">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-4">My Mentees</h3>
        <div className="space-y-2">
          {mentees.map((m, i) => {
            const isRisk = m.atRisk || m.attendance < 75 || m.cgpa < 6;
            return (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                isRisk 
                  ? 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20' 
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.07]'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isRisk ? 'bg-red-100 dark:bg-red-500/15' : 'bg-indigo-50 dark:bg-indigo-500/15'
                }`}>
                  {isRisk ? <WarningCircle size={18} weight="fill" className="text-red-500" /> : <Student size={18} weight="duotone" className="text-indigo-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{m.name}</p>
                    <span className="text-[10px] font-bold text-slate-400">{m.college_id}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{m.department} · {m.batch} · Sec {m.section}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className={`text-xs font-extrabold ${m.cgpa >= 7 ? 'text-emerald-600 dark:text-emerald-400' : m.cgpa >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      {m.cgpa} CGPA
                    </p>
                    <p className={`text-[10px] font-bold ${m.attendance >= 85 ? 'text-emerald-500' : m.attendance >= 75 ? 'text-amber-500' : 'text-red-500'}`}>
                      {m.attendance}% att.
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {m.phone && <a href={`tel:${m.phone}`} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><Phone size={14} className="text-slate-400" /></a>}
                    {m.email && <a href={`mailto:${m.email}`} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><Envelope size={14} className="text-slate-400" /></a>}
                  </div>
                </div>
              </div>
            );
          })}
          {mentees.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No mentees assigned yet</p>}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FacultyMenteeList;
