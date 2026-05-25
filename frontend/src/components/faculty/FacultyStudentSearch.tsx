// @ts-nocheck
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlass, Student, ChartLineUp, Phone, Envelope, X } from '@phosphor-icons/react';
import { studentsAPI } from '../../services/api';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

const FacultyStudentSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const { data } = await studentsAPI.search(query);
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    setLoading(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* Search bar */}
      <motion.div variants={itemVariants} className="soft-card p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Search by name, roll number, or college ID..."
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
            )}
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-colors disabled:opacity-50">
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </motion.div>

      {/* Results */}
      {searched && (
        <motion.div variants={itemVariants} className="soft-card p-5">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-3">
            {results.length > 0 ? `${results.length} student${results.length > 1 ? 's' : ''} found` : 'No results'}
          </h3>
          <div className="space-y-2">
            {results.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.07] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                  <Student size={18} weight="duotone" className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{s.name}</p>
                    <span className="text-[10px] font-bold text-slate-400">{s.college_id}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.department || 'N/A'} · Batch {s.batch || 'N/A'} · Sec {s.section || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {s.cgpa && (
                    <div className="text-right hidden sm:block">
                      <p className={`text-xs font-extrabold ${s.cgpa >= 7 ? 'text-emerald-600' : s.cgpa >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{s.cgpa} CGPA</p>
                    </div>
                  )}
                  <div className="flex gap-1">
                    {s.phone && <a href={`tel:${s.phone}`} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><Phone size={14} className="text-slate-400" /></a>}
                    {s.email && <a href={`mailto:${s.email}`} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><Envelope size={14} className="text-slate-400" /></a>}
                  </div>
                </div>
              </div>
            ))}
            {results.length === 0 && searched && !loading && (
              <div className="py-10 text-center">
                <MagnifyingGlass size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-500">No students found for "{query}"</p>
                <p className="text-xs text-slate-400 mt-1">Try a different name or ID</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FacultyStudentSearch;
