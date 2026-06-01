import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, Brain, Target, CaretRight, ArrowRight, Clock, Trophy,
  CheckCircle, WarningCircle, Lightning, Sparkle, ChartBar, Eye, ArrowsClockwise,
  FilePdf, Trash, CaretDown, Star, Lightbulb, MagnifyingGlass
} from '@phosphor-icons/react';
import { resumeAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader';

/* ── Animation Variants ─────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};
const cardHover = { scale: 1.015, transition: { type: 'spring', stiffness: 400, damping: 17 } };

/* ── Helpers ─────────────────────────────────────────────────── */
const SECTION_LABELS = {
  contact_info: 'Contact Info',
  professional_summary: 'Summary',
  work_experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  formatting: 'Formatting',
};

const ROLES = [
  'Software Developer', 'Data Analyst', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'DevOps Engineer', 'Data Scientist', 'Machine Learning Engineer',
  'Product Manager', 'UI/UX Designer', 'Cloud Engineer', 'Cybersecurity Analyst',
];

const getScoreColor = (score) => {
  if (score >= 75) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', stroke: '#10b981', label: 'ATS Ready', badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' };
  if (score >= 50) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', stroke: '#f59e0b', label: 'Needs Polish', badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' };
  return { text: 'text-red-500 dark:text-red-400', bg: 'bg-red-500', stroke: '#ef4444', label: 'Needs Work', badge: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' };
};

const getBarColor = (val) => {
  if (val >= 75) return 'bg-emerald-500';
  if (val >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

/* ── Animated Counter Hook ─────────────────────────────────── */
const useCountUp = (target, duration = 1200) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target == null) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(Math.round(target)); clearInterval(timer); }
      else setCount(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};

/* ═══════════════════════════════════════════════════════════════
   RADIAL GAUGE COMPONENT — Animated SVG circular score
   ═══════════════════════════════════════════════════════════════ */
const RadialGauge = ({ score, size = 180 }) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colors = getScoreColor(score);
  const animatedScore = useCountUp(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        {/* Background track */}
        <circle cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth="10"
          className="stroke-slate-100 dark:stroke-slate-800" />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'} />
            <stop offset="100%" stopColor={score >= 75 ? '#06b6d4' : score >= 50 ? '#f97316' : '#f43f5e'} />
          </linearGradient>
        </defs>
        {/* Progress arc */}
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth="10" strokeLinecap="round"
          stroke="url(#gaugeGradient)"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${progress} ${circumference}` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-extrabold ${colors.text}`}>{animatedScore}</span>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">/ 100</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   UPLOAD ZONE — Drag & drop with file validation
   ═══════════════════════════════════════════════════════════════ */
const UploadZone = ({ file, setFile, targetRole, setTargetRole, jd, setJd, loading, onUpload }) => {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && f.name.toLowerCase().endsWith('.pdf')) setFile(f);
    else toast.error('Only PDF files are accepted');
  }, [setFile]);

  return (
    <motion.div variants={itemVariants} className="soft-card overflow-hidden">
      {/* Gradient header band */}
      <div className="h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500" />
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <FileText size={22} weight="fill" className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Upload Your Resume</h2>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">PDF only • Max 5MB • Text-based (not scanned)</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer mb-6 group ${
            dragging ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-500/5 scale-[1.01]'
            : file ? 'border-teal-400 bg-teal-50/30 dark:bg-teal-500/5'
            : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500/30 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)} />

          {file ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center">
              <div className="w-14 h-14 bg-teal-100 dark:bg-teal-500/20 rounded-2xl flex items-center justify-center mb-3">
                <FilePdf size={28} weight="duotone" className="text-teal-600 dark:text-teal-400" />
              </div>
              <p className="font-bold text-sm text-slate-800 dark:text-white">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="mt-3 text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                <Trash size={12} weight="bold" /> Remove
              </button>
            </motion.div>
          ) : (
            <>
              <motion.div animate={{ y: dragging ? -4 : 0 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Upload size={36} weight="duotone" className="mx-auto mb-3 text-slate-300 dark:text-slate-600 group-hover:text-teal-400 transition-colors" />
              </motion.div>
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                Drop your resume here or <span className="text-teal-500">click to browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">Supports standard PDF resumes</p>
            </>
          )}
        </div>

        {/* Config row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block flex items-center gap-1.5">
              <Target size={12} weight="bold" /> Target Role
            </label>
            <select value={targetRole} onChange={e => setTargetRole(e.target.value)}
              className="soft-input w-full text-sm">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block flex items-center gap-1.5">
              <MagnifyingGlass size={12} weight="bold" /> Job Description <span className="normal-case font-medium">(optional)</span>
            </label>
            <input value={jd} onChange={e => setJd(e.target.value)}
              placeholder="Paste the JD here for precise keyword matching..."
              className="soft-input w-full text-sm" />
          </div>
        </div>

        {/* CTA */}
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={onUpload} disabled={!file || loading}
          className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-2xl font-extrabold text-base transition-all flex items-center justify-center gap-3 shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Ami is analyzing...
            </>
          ) : (
            <>
              <Sparkle size={20} weight="fill" />
              Analyze Resume
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SCORE DASHBOARD — Full analysis view
   ═══════════════════════════════════════════════════════════════ */
const ScoreDashboard = ({ result }) => {
  const { isDark } = useTheme();
  const colors = getScoreColor(result.ats_score);
  const [expandedSection, setExpandedSection] = useState(null);

  // Radar chart data
  const radarData = result.section_scores
    ? Object.entries(result.section_scores).map(([key, val]) => ({
        label: SECTION_LABELS[key] || key,
        value: val,
        fullMark: 100,
      }))
    : [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
      {/* ── Score Hero ────────────────────────────────── */}
      <motion.div variants={itemVariants}
        className="soft-card p-6 sm:p-8 bg-gradient-to-br from-white to-slate-50/50 dark:from-[#151B2B] dark:to-[#0F1320]">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Radial gauge */}
          <div className="flex flex-col items-center">
            <RadialGauge score={result.ats_score} size={180} />
            <motion.span
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
              className={`inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-xl text-xs font-extrabold ${colors.badge}`}>
              {result.ats_score >= 75 ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}
              {colors.label}
            </motion.span>
          </div>

          {/* Radar chart */}
          {radarData.length > 0 && (
            <div className="flex-1 w-full lg:w-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 text-center lg:text-left">Section Radar</p>
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="value" stroke="#14b8a6" fill="#14b8a6"
                      fillOpacity={isDark ? 0.15 : 0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {result.summary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{result.summary}</p>
          </motion.div>
        )}
      </motion.div>

      {/* ── Section Breakdown ─────────────────────────── */}
      {result.section_scores && (
        <motion.div variants={itemVariants} className="soft-card p-6">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <ChartBar size={18} weight="duotone" className="text-teal-500" /> Section Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(result.section_scores).map(([key, val], i) => (
              <motion.div key={key}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i, type: 'spring', stiffness: 200 }}
                className="group cursor-pointer"
                onClick={() => setExpandedSection(expandedSection === key ? null : key)}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-24 shrink-0">
                    {SECTION_LABELS[key] || key}
                  </span>
                  <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${getBarColor(val)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * i, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 w-8 text-right">{val}</span>
                  <CaretDown size={12} weight="bold"
                    className={`text-slate-400 transition-transform ${expandedSection === key ? 'rotate-180' : ''}`} />
                </div>
                <AnimatePresence>
                  {expandedSection === key && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden">
                      <div className="mt-2 ml-[108px] p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {val >= 75 ? '✅ Strong section. Well-optimized for ATS parsing.'
                           : val >= 50 ? '⚠️ Decent but could be improved. Add more specific keywords and quantified achievements.'
                           : '🔴 Needs significant improvement. Review the improvement tips below.'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Keywords Panel ─────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Found */}
        {result.keywords_found?.length > 0 && (
          <div className="soft-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} weight="fill" className="text-emerald-500" />
              <h4 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                Keywords Found <span className="text-xs font-bold text-slate-400 ml-1">({result.keywords_found.length})</span>
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.keywords_found.map((k, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * i }}
                  className="soft-badge bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                  {k}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Missing */}
        {result.keywords_missing?.length > 0 && (
          <div className="soft-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <WarningCircle size={16} weight="fill" className="text-amber-500" />
              <h4 className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                Missing Keywords <span className="text-xs font-bold text-slate-400 ml-1">({result.keywords_missing.length})</span>
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.keywords_missing.map((k, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * i }}
                  className="soft-badge bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                  + {k}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Improvement Tips ──────────────────────────── */}
      {result.improvement_tips?.length > 0 && (
        <motion.div variants={itemVariants} className="soft-card p-6">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb size={18} weight="duotone" className="text-amber-500" /> Ami Recommendations
          </h3>
          <div className="space-y-3">
            {result.improvement_tips.map((tip, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i, type: 'spring', stiffness: 200 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 hover:border-teal-200 dark:hover:border-teal-500/20 transition-colors">
                <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-extrabold text-white">{i + 1}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tip}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SCORE HISTORY — Trend chart + past scans list
   ═══════════════════════════════════════════════════════════════ */
const ScoreHistory = ({ history, onSelect, selectedId }) => {
  const { isDark } = useTheme();

  const trendData = [...history]
    .filter(h => h.ats_score != null)
    .reverse()
    .slice(-10)
    .map((h, i) => ({
      name: `#${i + 1}`,
      score: h.ats_score,
      filename: h.filename,
    }));

  if (history.length === 0) {
    return (
      <motion.div variants={itemVariants} className="soft-card p-8 sm:p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={28} weight="duotone" className="text-slate-400" />
        </div>
        <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">No scans yet</h4>
        <p className="text-sm text-slate-400">Upload your first resume to start tracking your ATS score.</p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* Trend chart */}
      {trendData.length >= 2 && (
        <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <ChartBar size={16} weight="duotone" className="text-teal-500" /> Score Trend
          </h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="atsTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="bg-white dark:bg-[#1A202C] rounded-xl p-3 shadow-lg border border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-sm text-teal-600">{payload[0].value}%</p>
                    <p className="text-xs text-slate-400 mt-0.5">{payload[0].payload.filename}</p>
                  </div>
                ) : null} />
                <Area type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2.5}
                  fill="url(#atsTrendFill)" dot={{ fill: '#14b8a6', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#14b8a6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* History list */}
      <motion.div variants={itemVariants} className="soft-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock size={16} weight="duotone" className="text-slate-400" /> Past Scans
            <span className="soft-badge bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">{history.length}</span>
          </h3>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-white/5 max-h-[400px] overflow-y-auto">
          {history.map((h, i) => {
            const scoreColors = h.ats_score != null ? getScoreColor(h.ats_score) : null;
            const isActive = selectedId === h.id;
            return (
              <motion.button key={h.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i }}
                onClick={() => onSelect(h.id)}
                className={`w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left transition-colors group ${
                  isActive ? 'bg-teal-50/50 dark:bg-teal-500/5' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-teal-100 dark:bg-teal-500/20' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <FilePdf size={16} weight="duotone" className={isActive ? 'text-teal-500' : 'text-slate-400'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{h.filename}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {h.target_role && <span>{h.target_role} · </span>}
                      {h.created_at ? new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {h.ats_score != null ? (
                    <span className={`text-lg font-extrabold ${scoreColors.text}`}>{Math.round(h.ats_score)}</span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">—</span>
                  )}
                  <ArrowRight size={12} weight="bold"
                    className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export const ResumeATSContent = ({ navigate }: any) => {
  const [activeView, setActiveView] = useState('upload'); // upload | results | history
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState('Software Developer');
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);

  // Load latest + history on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [latestRes, historyRes] = await Promise.allSettled([
          resumeAPI.latest(),
          resumeAPI.history(),
        ]);
        if (latestRes.status === 'fulfilled' && latestRes.value.data) {
          setResult(latestRes.value.data);
          if (latestRes.value.data.ats_score != null) setActiveView('results');
        }
        if (historyRes.status === 'fulfilled') {
          setHistory(historyRes.value.data || []);
        }
      } catch (e) { /* silently fail */ }
      setPageLoading(false);
    };
    loadData();
  }, []);

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a PDF file'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_role', targetRole);
      if (jd.trim()) formData.append('job_description', jd.trim());
      const { data } = await resumeAPI.upload(formData);
      setResult(data);
      setActiveView('results');
      setFile(null);
      toast.success('Resume analyzed successfully!');
      // Refresh history
      resumeAPI.history().then(res => setHistory(res.data || [])).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed. Please try again.');
    }
    setLoading(false);
  };

  const handleHistorySelect = async (id) => {
    setSelectedHistoryId(id);
    // Fetch full details if we only have summary
    try {
      const { data } = await resumeAPI.latest(); // For detailed view, we could add a get-by-id endpoint
      // For now, find in history
      const item = history.find(h => h.id === id);
      if (item) {
        // If we have the full result (latest), show it
        if (data && data.id === id) {
          setResult(data);
          setActiveView('results');
        } else {
          // Show partial from history
          setResult({ ...item, section_scores: null, keywords_found: null, keywords_missing: null, improvement_tips: null });
          setActiveView('results');
          toast.info('Showing summary. Upload again to see full analysis.');
        }
      }
    } catch(e) { /* silent */ }
  };

  const handleRescore = async () => {
    if (!result?.id) return;
    setLoading(true);
    try {
      const { data } = await resumeAPI.score(result.id, { target_role: targetRole, job_description: jd || undefined });
      setResult(prev => ({ ...prev, ...data }));
      toast.success('Resume re-scored!');
      resumeAPI.history().then(res => setHistory(res.data || [])).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Re-scoring failed');
    }
    setLoading(false);
  };

  if (pageLoading) return <DashboardSkeleton variant="content-list" />;

  const views = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'results', label: 'Analysis', icon: Brain },
    { id: 'history', label: 'History', icon: Clock },
  ];

  return (
    <div className="w-full">
      {/* ── View Switcher ──────────────────────────── */}
      <div className="flex overflow-x-auto gap-1 p-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-xl mb-8 hide-scrollbar max-w-2xl mx-auto">
        {views.map(view => {
          const Icon = view.icon;
          const isActive = activeView === view.id;
          const isDisabled = view.id === 'results' && !result;
          return (
            <button key={view.id} onClick={() => !isDisabled && setActiveView(view.id)}
              disabled={isDisabled}
              className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border border-transparent ${
                isActive
                  ? 'bg-white dark:bg-teal-500/15 text-teal-600 dark:text-teal-300 shadow-sm dark:border-teal-500/25'
                  : isDisabled
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
              }`}>
              <Icon size={16} weight={isActive ? 'fill' : 'duotone'} />
              {view.label}
              {view.id === 'history' && history.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── View Content ────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeView === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <UploadZone
              file={file} setFile={setFile}
              targetRole={targetRole} setTargetRole={setTargetRole}
              jd={jd} setJd={setJd}
              loading={loading} onUpload={handleUpload}
            />
            {/* Quick stats strip */}
            {result && (
              <motion.div variants={itemVariants} initial="hidden" animate="show"
                className="mt-5 soft-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-50 dark:bg-teal-500/15 rounded-xl flex items-center justify-center">
                    <Trophy size={18} weight="duotone" className="text-teal-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Latest Score</p>
                    <p className={`text-xl font-extrabold ${getScoreColor(result.ats_score).text}`}>
                      {result.ats_score}
                      <span className="text-xs font-bold text-slate-400 ml-1">/ 100</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setActiveView('results')}
                  className="text-sm font-bold text-teal-500 hover:text-teal-600 flex items-center gap-1 transition-colors">
                  View Analysis <ArrowRight size={14} weight="bold" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeView === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Re-score bar */}
            <motion.div variants={itemVariants} initial="hidden" animate="show"
              className="soft-card p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FilePdf size={20} weight="duotone" className="text-teal-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{result.filename}</p>
                  <p className="text-xs text-slate-400">
                    {result.target_role && <span>Scored for: {result.target_role}</span>}
                    {result.created_at && <span> · {new Date(result.created_at).toLocaleDateString()}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select value={targetRole} onChange={e => setTargetRole(e.target.value)}
                  className="soft-input text-xs py-2 flex-1 sm:flex-none sm:w-44">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleRescore} disabled={loading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50">
                  {loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <ArrowsClockwise size={14} weight="bold" />}
                  Re-score
                </motion.button>
              </div>
            </motion.div>

            <ScoreDashboard result={result} />
          </motion.div>
        )}

        {activeView === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ScoreHistory history={history} onSelect={handleHistorySelect} selectedId={selectedHistoryId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Original standalone page wrapper
const ResumeATSScorer = ({ navigate, user }: any) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader navigate={navigate} user={user} title="Resume ATS Scorer" subtitle="Powered by Ami" maxWidth="max-w-6xl" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ResumeATSContent navigate={navigate} />
      </div>
    </div>
  );
};

export default ResumeATSScorer;
