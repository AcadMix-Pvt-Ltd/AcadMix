// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, CalendarDots, Info } from '@phosphor-icons/react';
import { announcementsAPI } from '../../services/api';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

const PRIORITY_COLORS = {
  high:   { bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20', dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', dot: 'bg-amber-500' },
  low:    { bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20', dot: 'bg-blue-500' },
};

const DEMO_ANNOUNCEMENTS = [
  { id: '1', title: 'CIA-2 Internal Marks submission deadline', content: 'All faculty must submit CIA-2 marks by April 28th. Late submissions will not be accepted.', priority: 'high', created_at: '2026-04-10T10:00:00', author: 'Dr. Raghav (HOD)' },
  { id: '2', title: 'Faculty Development Program - AI/ML', content: 'A 3-day FDP on Artificial Intelligence & Machine Learning will be conducted from May 2-4. Registration is mandatory for all CSE faculty.', priority: 'medium', created_at: '2026-04-08T14:30:00', author: 'Dean Academics' },
  { id: '3', title: 'Annual Day Preparations', content: 'Faculty coordinators for Annual Day cultural programs to meet on April 16th at 3:00 PM in the Seminar Hall.', priority: 'low', created_at: '2026-04-05T09:00:00', author: 'Principal Office' },
  { id: '4', title: 'Semester End Exam Duty Roster', content: 'End semester exam duty roster has been published. Please check your invigilation schedule on the notice board.', priority: 'medium', created_at: '2026-04-01T11:00:00', author: 'Exam Cell' },
];

const FacultyAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await announcementsAPI.list();
        setAnnouncements(data?.length > 0 ? data : DEMO_ANNOUNCEMENTS);
      } catch { setAnnouncements(DEMO_ANNOUNCEMENTS); }
      setLoading(false);
    };
    load();
  }, []);

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
      <motion.div variants={itemVariants} className="soft-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone size={18} weight="duotone" className="text-indigo-500" />
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Announcements</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
            {announcements.length}
          </span>
        </div>
        <div className="space-y-3">
          {announcements.map((a, i) => {
            const colors = PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.low;
            const date = new Date(a.created_at);
            return (
              <motion.div key={i} variants={itemVariants}
                className={`p-4 rounded-xl border ${colors.bg} ${colors.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{a.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{a.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-400">
                      <span className="flex items-center gap-1"><CalendarDots size={10} /> {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {a.author && <span>{a.author}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {announcements.length === 0 && (
            <div className="py-10 text-center">
              <Info size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No announcements yet</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FacultyAnnouncements;
