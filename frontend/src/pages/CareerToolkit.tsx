import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Briefcase, Envelope, ChartPolar, Users, Code, Path,
  Sparkle, Copy, Check, CaretDown, CaretRight, ArrowRight, Lightning, Target,
  Star, Trophy, Warning, MagnifyingGlass, BookOpen, GraduationCap,
  ClipboardText, Lightbulb, Rocket, Fire, Clock, Buildings
} from '@phosphor-icons/react';
import { careerAPI, resumeAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader';
import { ResumeATSContent } from './ResumeATSScorer';
import ResumeStudioTab from '../components/student/ResumeStudioTab';

/* ── Animation Variants ─────────────────────────────────── */
const containerV = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemV = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

const ROLES = ['Software Developer', 'Data Analyst', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer', 'Data Scientist', 'ML Engineer', 'Product Manager', 'Cloud Engineer', 'Cybersecurity Analyst'];
const COMPANIES = ['', 'TCS', 'Infosys', 'Wipro', 'Cognizant', 'Accenture', 'HCLTech', 'Tech Mahindra', 'Google', 'Amazon', 'Microsoft', 'Deloitte', 'Capgemini'];

/* ── Shared: Copy Button ─────────────────────────────────── */
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-500/15 dark:hover:text-teal-400 transition-colors">
      {copied ? <><Check size={12} weight="bold" /> Copied!</> : <><Copy size={12} weight="bold" /> Copy</>}
    </button>
  );
};

/* ── Shared: Loading Spinner ──────────────────────────────── */
const LoadingState = ({ text = 'Ami is thinking...' }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="soft-card p-12 text-center">
    <div className="w-12 h-12 mx-auto mb-4 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{text}</p>
  </motion.div>
);

/* ── Shared: Empty State ──────────────────────────────────── */
const EmptyState = ({ icon: Icon, title, sub }) => (
  <div className="soft-card p-12 text-center">
    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon size={28} weight="duotone" className="text-slate-400" />
    </div>
    <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">{title}</h4>
    <p className="text-sm text-slate-400">{sub}</p>
  </div>
);

/* ── Shared: Generate Button ──────────────────────────────── */
const GenBtn = ({ onClick, loading, text = 'Generate', disabled }) => (
  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onClick} disabled={loading || disabled}
    className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-2xl font-extrabold text-base transition-all flex items-center justify-center gap-3 shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
    {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Ami is generating...</>
      : <><Sparkle size={20} weight="fill" /> {text}</>}
  </motion.button>
);

/* ═══════════════════════════════════════════════════════════════
   1. COVER LETTER TAB
   ═══════════════════════════════════════════════════════════════ */
const CoverLetterTab = () => {
  const [role, setRole] = useState('Software Developer');
  const [company, setCompany] = useState('');
  const [jd, setJd] = useState('');
  const [tone, setTone] = useState('professional');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { resumeAPI.latest().then(r => { if (r.data?.parsed_text) setResumeText(r.data.parsed_text); }).catch(() => {}); }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await careerAPI.coverLetter({ target_role: role, company_name: company || undefined, job_description: jd || undefined, resume_text: resumeText || undefined, tone });
      setResult(data);
      toast.success('Cover letter generated!');
    } catch (e) { toast.error(e.response?.data?.detail || 'Generation failed'); }
    setLoading(false);
  };

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={itemV} className="soft-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <FileText size={20} weight="fill" className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Cover Letter Generator</h3>
            <p className="text-xs text-slate-400">AI-crafted, personalized to your resume & the JD</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Target Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="soft-input w-full text-sm">{ROLES.map(r => <option key={r}>{r}</option>)}</select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g., Google" className="soft-input w-full text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Tone</label>
            <div className="flex gap-2">
              {['professional', 'enthusiastic', 'concise'].map(t => (
                <button key={t} onClick={() => setTone(t)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tone === t ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mb-5">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Job Description <span className="normal-case font-medium">(optional)</span></label>
          <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the job description for better personalization..." className="soft-input w-full text-sm resize-none" rows={3} />
        </div>
        {resumeText && <p className="text-xs text-emerald-500 font-bold mb-4 flex items-center gap-1.5"><Check size={12} weight="bold" /> Resume auto-loaded from your latest ATS scan</p>}
        <GenBtn onClick={handleGenerate} loading={loading} text="Generate Cover Letter" />
      </motion.div>

      {loading && <LoadingState text="Ami is crafting your cover letter..." />}

      {result?.full_letter && (
        <motion.div variants={itemV} className="soft-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-extrabold text-slate-800 dark:text-white">Your Cover Letter</h4>
            <CopyBtn text={result.full_letter} />
          </div>
          {result.subject_line && <p className="text-xs font-bold text-teal-500 mb-3">Subject: {result.subject_line}</p>}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {result.full_letter}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   2. JD ANALYZER TAB
   ═══════════════════════════════════════════════════════════════ */
const JDAnalyzerTab = () => {
  const [jd, setJd] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { resumeAPI.latest().then(r => { if (r.data?.parsed_text) setResumeText(r.data.parsed_text); }).catch(() => {}); }, []);

  const handleAnalyze = async () => {
    if (jd.length < 50) { toast.error('Please paste a longer job description (at least 50 characters)'); return; }
    setLoading(true);
    try {
      const { data } = await careerAPI.analyzeJD({ job_description: jd, resume_text: resumeText || undefined });
      setResult(data);
      toast.success('JD analyzed!');
    } catch (e) { toast.error(e.response?.data?.detail || 'Analysis failed'); }
    setLoading(false);
  };

  const SkillBadge = ({ skill, type }) => (
    <span className={`soft-badge text-xs font-bold px-2.5 py-1 ${type === 'must' ? 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20' : 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20'}`}>
      {skill}
    </span>
  );

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={itemV} className="soft-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <MagnifyingGlass size={20} weight="fill" className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">JD Analyzer</h3>
            <p className="text-xs text-slate-400">Decode any job description — extract what actually matters</p>
          </div>
        </div>
        <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the full job description here..." className="soft-input w-full text-sm resize-none mb-5" rows={6} />
        <GenBtn onClick={handleAnalyze} loading={loading} text="Analyze JD" disabled={jd.length < 50} />
      </motion.div>

      {loading && <LoadingState text="Ami is decoding the JD..." />}

      {result && !loading && (
        <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-4">
          {/* Header */}
          <motion.div variants={itemV} className="soft-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-extrabold text-slate-800 dark:text-white">{result.role_title || 'Role Analysis'}</h4>
              {result.experience_level && <span className="soft-badge bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-500/20 text-xs font-bold">{result.experience_level}</span>}
            </div>
            {result.company && <p className="text-sm text-slate-500">{result.company}</p>}
            {result.salary_estimate && <p className="text-xs font-bold text-emerald-500 mt-2">💰 {result.salary_estimate}</p>}
          </motion.div>

          {/* Skills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.must_have_skills?.length > 0 && (
              <motion.div variants={itemV} className="soft-card p-5">
                <h5 className="text-sm font-extrabold text-red-600 dark:text-red-400 mb-3 flex items-center gap-1.5"><Warning size={14} weight="fill" /> Must-Have Skills</h5>
                <div className="flex flex-wrap gap-1.5">{result.must_have_skills.map((s, i) => <SkillBadge key={i} skill={s} type="must" />)}</div>
              </motion.div>
            )}
            {result.nice_to_have_skills?.length > 0 && (
              <motion.div variants={itemV} className="soft-card p-5">
                <h5 className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-1.5"><Star size={14} weight="fill" /> Nice-to-Have</h5>
                <div className="flex flex-wrap gap-1.5">{result.nice_to_have_skills.map((s, i) => <SkillBadge key={i} skill={s} type="nice" />)}</div>
              </motion.div>
            )}
          </div>

          {/* Red flags & culture */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.red_flags?.length > 0 && (
              <motion.div variants={itemV} className="soft-card p-5">
                <h5 className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mb-3">🚩 Red Flags</h5>
                <ul className="space-y-1.5">{result.red_flags.map((f, i) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"><Warning size={14} weight="duotone" className="text-amber-500 mt-0.5 shrink-0" />{f}</li>)}</ul>
              </motion.div>
            )}
            {result.culture_hints?.length > 0 && (
              <motion.div variants={itemV} className="soft-card p-5">
                <h5 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mb-3">🌱 Culture Signals</h5>
                <ul className="space-y-1.5">{result.culture_hints.map((h, i) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"><Check size={14} weight="bold" className="text-emerald-500 mt-0.5 shrink-0" />{h}</li>)}</ul>
              </motion.div>
            )}
          </div>

          {/* Application tips */}
          {result.application_tips?.length > 0 && (
            <motion.div variants={itemV} className="soft-card p-5">
              <h5 className="text-sm font-extrabold text-slate-800 dark:text-white mb-3 flex items-center gap-1.5"><Lightbulb size={14} weight="duotone" className="text-amber-500" /> Application Tips</h5>
              <div className="space-y-2">{result.application_tips.map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="w-6 h-6 bg-teal-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-extrabold text-white">{i + 1}</span></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t}</p>
                </div>
              ))}</div>
            </motion.div>
          )}

          {result.match_assessment && (
            <motion.div variants={itemV} className="soft-card p-5 bg-teal-50/50 dark:bg-teal-500/5 border-teal-200/50 dark:border-teal-500/20">
              <p className="text-sm font-bold text-teal-700 dark:text-teal-300">{result.match_assessment}</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   3. COLD EMAIL TAB
   ═══════════════════════════════════════════════════════════════ */
const ColdEmailTab = () => {
  const [purpose, setPurpose] = useState('referral');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('Software Developer');
  const [recipientRole, setRecipientRole] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const purposes = [
    { id: 'referral', label: 'Referral Request', icon: Users, desc: 'Ask for an employee referral' },
    { id: 'introduction', label: 'Introduction', icon: Envelope, desc: 'Introduce yourself' },
    { id: 'follow_up', label: 'Follow Up', icon: ArrowRight, desc: 'Post-interview follow-up' },
    { id: 'thank_you', label: 'Thank You', icon: Star, desc: 'Interview thank you note' },
  ];

  const handleGenerate = async () => {
    if (!company) { toast.error('Please enter a company name'); return; }
    setLoading(true);
    try {
      const { data } = await careerAPI.coldEmail({ purpose, target_company: company, target_role: role, recipient_role: recipientRole || undefined, context: context || undefined });
      setResult(data);
      toast.success('Email drafted!');
    } catch (e) { toast.error(e.response?.data?.detail || 'Generation failed'); }
    setLoading(false);
  };

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={itemV} className="soft-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Envelope size={20} weight="fill" className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Cold Email Drafter</h3>
            <p className="text-xs text-slate-400">Professional outreach & networking emails</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {purposes.map(p => {
            const Icon = p.icon;
            return (
              <button key={p.id} onClick={() => setPurpose(p.id)}
                className={`soft-card p-3 text-left transition-all ${purpose === p.id ? 'ring-2 ring-teal-500 border-teal-200 dark:border-teal-500/30 bg-teal-50/50 dark:bg-teal-500/10' : ''}`}>
                <Icon size={18} weight="duotone" className={purpose === p.id ? 'text-teal-500 mb-1.5' : 'text-slate-400 mb-1.5'} />
                <p className="font-bold text-xs text-slate-800 dark:text-white">{p.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{p.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Company *</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g., Google" className="soft-input w-full text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Target Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="soft-input w-full text-sm">{ROLES.map(r => <option key={r}>{r}</option>)}</select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Recipient Role</label>
            <input value={recipientRole} onChange={e => setRecipientRole(e.target.value)} placeholder="e.g., SDE-2" className="soft-input w-full text-sm" />
          </div>
        </div>
        <div className="mb-5">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Context <span className="normal-case font-medium">(optional)</span></label>
          <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="e.g., We met at the campus career fair last week..." className="soft-input w-full text-sm resize-none" rows={2} />
        </div>
        <GenBtn onClick={handleGenerate} loading={loading} text="Draft Email" disabled={!company} />
      </motion.div>

      {loading && <LoadingState text="Ami is drafting your email..." />}

      {result?.body && (
        <motion.div variants={itemV} className="soft-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-extrabold text-slate-800 dark:text-white">Your Email</h4>
            <CopyBtn text={`Subject: ${result.subject_line || ''}\n\n${result.body}`} />
          </div>
          {result.subject_line && (
            <div className="mb-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Subject: {result.subject_line}</p>
            </div>
          )}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {result.body}
          </div>
          {result.tips?.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Personalization Tips:</p>
              {result.tips.map((t, i) => <p key={i} className="text-xs text-slate-500 flex items-start gap-1.5"><Lightbulb size={12} weight="duotone" className="text-amber-500 mt-0.5 shrink-0" />{t}</p>)}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   4. SKILL GAP TAB
   ═══════════════════════════════════════════════════════════════ */
const SkillGapTab = () => {
  const { isDark } = useTheme();
  const [role, setRole] = useState('Software Developer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [atsData, setAtsData] = useState(null);

  useEffect(() => { resumeAPI.latest().then(r => { if (r.data) setAtsData(r.data); }).catch(() => {}); }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const payload = { target_role: role };
      if (atsData) {
        payload.keywords_found = atsData.keywords_found || [];
        payload.keywords_missing = atsData.keywords_missing || [];
      }
      const { data } = await careerAPI.skillGap(payload);
      setResult(data);
      toast.success('Skill gap analyzed!');
    } catch (e) { toast.error(e.response?.data?.detail || 'Analysis failed'); }
    setLoading(false);
  };

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={itemV} className="soft-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <ChartPolar size={20} weight="fill" className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Skill Gap Analyzer</h3>
            <p className="text-xs text-slate-400">Find gaps, get a curated learning path</p>
          </div>
        </div>
        {atsData && <p className="text-xs text-emerald-500 font-bold mb-4 flex items-center gap-1.5"><Check size={12} weight="bold" /> Auto-loading skills from your latest ATS scan ({atsData.keywords_found?.length || 0} found, {atsData.keywords_missing?.length || 0} missing)</p>}
        <div className="flex gap-3 mb-5">
          <select value={role} onChange={e => setRole(e.target.value)} className="soft-input flex-1 text-sm">{ROLES.map(r => <option key={r}>{r}</option>)}</select>
        </div>
        <GenBtn onClick={handleAnalyze} loading={loading} text="Analyze Skill Gaps" />
      </motion.div>

      {loading && <LoadingState text="Ami is mapping your skill gaps..." />}

      {result && !loading && (
        <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-4">
          {/* Match + Radar */}
          <motion.div variants={itemV} className="soft-card p-6">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Role Match</p>
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" className="stroke-slate-100 dark:stroke-slate-800" />
                    <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" strokeLinecap="round"
                      className={result.match_percentage >= 70 ? 'stroke-emerald-500' : result.match_percentage >= 40 ? 'stroke-amber-500' : 'stroke-red-500'}
                      strokeDasharray={`${(result.match_percentage / 100) * 314} 314`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{result.match_percentage}%</span>
                  </div>
                </div>
              </div>
              {result.radar_data?.length > 0 && (
                <div className="flex-1 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={result.radar_data} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                      <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Current" dataKey="current" stroke="#14b8a6" fill="#14b8a6" fillOpacity={isDark ? 0.15 : 0.2} strokeWidth={2} />
                      <Radar name="Required" dataKey="required" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} strokeWidth={1.5} strokeDasharray="4 4" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {result.summary && <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">{result.summary}</p>}
          </motion.div>

          {/* Learning Path */}
          {result.learning_path?.length > 0 && (
            <motion.div variants={itemV} className="soft-card p-6">
              <h4 className="text-base font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Rocket size={18} weight="duotone" className="text-teal-500" /> Learning Path</h4>
              <div className="space-y-3">
                {result.learning_path.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-white ${item.priority === 'critical' ? 'bg-red-500' : item.priority === 'important' ? 'bg-amber-500' : 'bg-blue-500'}`}>{i + 1}</div>
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{item.skill}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-xl ${item.priority === 'critical' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : item.priority === 'important' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'}`}>
                        {item.priority} · {item.estimated_weeks}w
                      </span>
                    </div>
                    {item.resources?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.resources.map((r, j) => (
                          <a key={j} href={r.url !== '#' ? r.url : undefined} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${r.free ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
                            {r.platform} {r.free && '· Free'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   5. HR ROUND TAB
   ═══════════════════════════════════════════════════════════════ */
const HRRoundTab = () => {
  const [role, setRole] = useState('Software Developer');
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [count, setCount] = useState(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await careerAPI.hrQuestions({ target_role: role, company: company || undefined, difficulty, question_count: count });
      setResult(data);
      toast.success('Questions generated!');
    } catch (e) { toast.error(e.response?.data?.detail || 'Generation failed'); }
    setLoading(false);
  };

  const catColors = { tell_me_about_yourself: 'bg-indigo-500', strengths_weaknesses: 'bg-amber-500', conflict_resolution: 'bg-red-500', leadership: 'bg-purple-500', teamwork: 'bg-blue-500', problem_solving: 'bg-emerald-500', motivation: 'bg-pink-500', situational: 'bg-teal-500' };

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={itemV} className="soft-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <Users size={20} weight="fill" className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">HR Round Simulator</h3>
            <p className="text-xs text-slate-400">Behavioral questions with STAR-format model answers</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
          <select value={role} onChange={e => setRole(e.target.value)} className="soft-input text-sm">{ROLES.map(r => <option key={r}>{r}</option>)}</select>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company (optional)" className="soft-input text-sm" />
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="soft-input text-sm">
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select>
          <select value={count} onChange={e => setCount(Number(e.target.value))} className="soft-input text-sm">
            {[5, 7, 10, 12].map(n => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </div>
        <GenBtn onClick={handleGenerate} loading={loading} text="Generate Questions" />
      </motion.div>

      {loading && <LoadingState text="Ami is preparing HR questions..." />}

      {result?.questions && (
        <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-3">
          {result.questions.map((q, i) => (
            <motion.div key={i} variants={itemV} className="soft-card overflow-hidden">
              <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full p-5 text-left flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-extrabold ${catColors[q.category] || 'bg-slate-500'}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-white">{q.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{(q.category || '').replace(/_/g, ' ')}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xl ${q.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-500/20 text-red-600' : q.difficulty === 'medium' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600'}`}>
                      {q.difficulty}
                    </span>
                  </div>
                </div>
                <CaretDown size={16} weight="bold" className={`text-slate-400 transition-transform shrink-0 ${expanded === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {expanded === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-5 pb-5 border-t border-slate-100 dark:border-white/5 pt-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-teal-500 mb-3">Model Answer (STAR)</p>
                      {q.model_answer && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {['situation', 'task', 'action', 'result'].map(s => (
                            <div key={s} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                              <p className="text-[10px] font-extrabold uppercase text-teal-500 mb-1">{s}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{q.model_answer[s]}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.tips?.length > 0 && (
                        <div className="space-y-1 mb-3">{q.tips.map((t, j) => <p key={j} className="text-xs text-slate-500 flex items-start gap-1.5"><Lightbulb size={11} weight="duotone" className="text-amber-500 mt-0.5 shrink-0" />{t}</p>)}</div>
                      )}
                      {q.follow_up_questions?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Likely Follow-ups:</p>
                          {q.follow_up_questions.map((f, j) => <p key={j} className="text-xs text-slate-500 ml-3">→ {f}</p>)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          {result.general_tips?.length > 0 && (
            <motion.div variants={itemV} className="soft-card p-5">
              <h5 className="text-sm font-extrabold text-slate-800 dark:text-white mb-3">💡 General Tips</h5>
              <ul className="space-y-1.5">{result.general_tips.map((t, i) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"><CaretRight size={12} weight="bold" className="text-teal-500 mt-1 shrink-0" />{t}</li>)}</ul>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   6. DSA RECOMMENDER TAB
   ═══════════════════════════════════════════════════════════════ */
const DSATab = () => {
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [focus, setFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await careerAPI.dsaRecommend({ target_company: company || undefined, difficulty, focus_area: focus || undefined, count: 10 });
      setResult(data);
      toast.success('Problems recommended!');
    } catch (e) { toast.error(e.response?.data?.detail || 'Generation failed'); }
    setLoading(false);
  };

  const diffColors = { Easy: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15', Medium: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15', Hard: 'text-red-600 bg-red-50 dark:bg-red-500/15' };
  const patternIcons = { sliding_window: '🪟', two_pointers: '👆', binary_search: '🔍', dfs_bfs: '🌲', dynamic_programming: '📊', greedy: '💰', stack_queue: '📚', linked_list: '🔗', tree: '🌳', graph: '🕸️', sorting: '↕️', hashing: '🏷️', string: '📝', math: '🔢', backtracking: '↩️' };

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={itemV} className="soft-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Code size={20} weight="fill" className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">DSA Problem Recommender</h3>
            <p className="text-xs text-slate-400">Curated by company, difficulty & pattern</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Company</label>
            <select value={company} onChange={e => setCompany(e.target.value)} className="soft-input w-full text-sm">{COMPANIES.map(c => <option key={c} value={c}>{c || '— Any —'}</option>)}</select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="soft-input w-full text-sm">
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Focus Area</label>
            <input value={focus} onChange={e => setFocus(e.target.value)} placeholder="e.g., Dynamic Programming" className="soft-input w-full text-sm" />
          </div>
        </div>
        <GenBtn onClick={handleGenerate} loading={loading} text="Get Recommendations" />
      </motion.div>

      {loading && <LoadingState text="Ami is curating problems..." />}

      {result?.problems && (
        <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-3">
          {result.problems.map((p, i) => (
            <motion.div key={i} variants={itemV} className="soft-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0 text-lg">
                {patternIcons[p.pattern] || '💻'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{p.leetcode_number ? `#${p.leetcode_number}. ` : ''}{p.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-xl shrink-0 ${diffColors[p.difficulty] || ''}`}>{p.difficulty}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-bold">{(p.pattern || '').replace(/_/g, ' ')}</span>
                  {p.time_complexity && <span>· {p.time_complexity}</span>}
                </div>
                {p.approach_hint && <p className="text-xs text-slate-500 mt-1 italic">💡 {p.approach_hint}</p>}
              </div>
              {p.companies_asked?.length > 0 && (
                <div className="hidden sm:flex flex-wrap gap-1 shrink-0 max-w-[120px]">
                  {p.companies_asked.slice(0, 3).map((c, j) => <span key={j} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{c}</span>)}
                </div>
              )}
            </motion.div>
          ))}

          {result.tips?.length > 0 && (
            <motion.div variants={itemV} className="soft-card p-5">
              <h5 className="text-sm font-extrabold text-slate-800 dark:text-white mb-3">🎯 DSA Interview Tips</h5>
              <ul className="space-y-1.5">{result.tips.map((t, i) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"><CaretRight size={12} weight="bold" className="text-teal-500 mt-1 shrink-0" />{t}</li>)}</ul>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   7. CAREER PATH EXPLORER TAB
   ═══════════════════════════════════════════════════════════════ */
const CareerPathTab = () => {
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleExplore = async () => {
    setLoading(true);
    try {
      const skillList = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const { data } = await careerAPI.careerPaths({ current_skills: skillList, interests: interests || undefined });
      setResult(data);
      toast.success('Career paths explored!');
    } catch (e) { toast.error(e.response?.data?.detail || 'Exploration failed'); }
    setLoading(false);
  };

  const demandColors = { high: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15', medium: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15', low: 'text-red-600 bg-red-50 dark:bg-red-500/15' };
  const catIcons = { software: '💻', data: '📊', devops: '⚙️', product: '📦', design: '🎨', security: '🔒', cloud: '☁️' };

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={itemV} className="soft-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Path size={20} weight="fill" className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Career Path Explorer</h3>
            <p className="text-xs text-slate-400">Discover roles that match your skills & interests</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Your Skills <span className="normal-case font-medium">(comma-separated)</span></label>
            <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g., Python, SQL, React, Machine Learning" className="soft-input w-full text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Interests</label>
            <input value={interests} onChange={e => setInterests(e.target.value)} placeholder="e.g., AI, web development, data" className="soft-input w-full text-sm" />
          </div>
        </div>
        <GenBtn onClick={handleExplore} loading={loading} text="Explore Paths" />
      </motion.div>

      {loading && <LoadingState text="Ami is mapping career paths..." />}

      {result?.paths && (
        <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-4">
          {result.paths.map((p, i) => (
            <motion.div key={i} variants={itemV} className="soft-card p-5 sm:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{catIcons[p.category] || '💼'}</span>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-800 dark:text-white">{p.role}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-emerald-500">💰 {p.avg_salary_inr}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-xl ${demandColors[p.demand] || ''}`}>
                        {p.demand} demand
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">{p.match_percentage}%</div>
                  <p className="text-[10px] text-slate-400 font-bold">match</p>
                </div>
              </div>

              {/* Match bar */}
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" initial={{ width: 0 }} animate={{ width: `${p.match_percentage}%` }} transition={{ duration: 0.8, delay: 0.1 * i }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {p.skills_you_have?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-emerald-500 mb-1.5">✅ Skills you have</p>
                    <div className="flex flex-wrap gap-1">{p.skills_you_have.map((s, j) => <span key={j} className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">{s}</span>)}</div>
                  </div>
                )}
                {p.skills_to_learn?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-amber-500 mb-1.5">📚 Skills to learn</p>
                    <div className="flex flex-wrap gap-1">{p.skills_to_learn.map((s, j) => <span key={j} className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">{s}</span>)}</div>
                  </div>
                )}
              </div>

              {p.entry_path && <p className="text-xs text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5"><span className="font-bold text-teal-500">Entry path:</span> {p.entry_path}</p>}
              {p.typical_companies?.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">{p.typical_companies.map((c, j) => <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{c}</span>)}</div>
              )}
            </motion.div>
          ))}
          {result.recommendation && (
            <motion.div variants={itemV} className="soft-card p-5 bg-teal-50/50 dark:bg-teal-500/5 border-teal-200/50 dark:border-teal-500/20">
              <p className="text-sm font-bold text-teal-700 dark:text-teal-300 flex items-start gap-2"><Lightbulb size={16} weight="fill" className="text-teal-500 mt-0.5 shrink-0" />{result.recommendation}</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   8. COMPANY INTEL TAB — Master → Detail Layout
   ═══════════════════════════════════════════════════════════════ */

/* ── Detail Sub-Components ─────────────────────────────────── */

const IntelOverviewPane = ({ co }: { co: any }) => (
  <div className="space-y-5">
    {/* Company Description */}
    <div className="soft-card p-5">
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{co.description || `${co.name} is a leading company in the ${co.category} sector.`}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {co.headquarters && <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">HQ</p><p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{co.headquarters}</p></div>}
        {co.founded && <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Founded</p><p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{co.founded}</p></div>}
        {co.employee_count && <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employees</p><p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{co.employee_count}</p></div>}
        {co.glassdoor_rating && <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Glassdoor</p><p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">⭐ {co.glassdoor_rating}/5</p></div>}
      </div>
    </div>

    {/* Work Culture */}
    {co.work_culture && (
      <div className="soft-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Work Culture</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{co.work_culture}</p>
      </div>
    )}

    {/* Tech Stack */}
    {co.tech_stack?.length > 0 && (
      <div className="soft-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Tech Stack</h4>
        <div className="flex flex-wrap gap-1.5">{co.tech_stack.map((t: string, i: number) => <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">{t}</span>)}</div>
      </div>
    )}

    {/* Quick Stats Row */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="soft-card p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg Package</p>
        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{co.avg_package_lpa} <span className="text-xs font-bold text-slate-400">LPA</span></p>
      </div>
      {co.dream_package_lpa && (
        <div className="soft-card p-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dream Package</p>
          <p className="text-lg font-extrabold text-purple-600 dark:text-purple-400 mt-1">{co.dream_package_lpa} <span className="text-xs font-bold text-slate-400">LPA</span></p>
        </div>
      )}
      <div className="soft-card p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selection Rate</p>
        <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-1">{co.selection_rate || 'N/A'}</p>
      </div>
    </div>
  </div>
);

const IntelRolesPane = ({ co }: { co: any }) => {
  const roles = co.roles_offered || [];
  return (
    <div className="space-y-4">
      {roles.length > 0 ? roles.map((role: any, i: number) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="soft-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{role.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{role.description}</p>
            </div>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 ml-3">{role.package_lpa} <span className="text-[10px] text-slate-400">LPA</span></span>
          </div>
          {role.skills_required?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Skills Required</p>
              <div className="flex flex-wrap gap-1">{role.skills_required.map((s: string, j: number) => <span key={j} className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">{s}</span>)}</div>
            </div>
          )}
          {role.growth_path && (
            <p className="text-xs text-slate-500 dark:text-slate-400 p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03]">
              <span className="font-bold text-teal-500">Growth:</span> {role.growth_path}
            </p>
          )}
        </motion.div>
      )) : (
        <div className="soft-card p-8 text-center">
          <p className="text-sm text-slate-400">Role details not available yet.</p>
        </div>
      )}

      {/* Career Growth Timeline */}
      {co.career_growth?.length > 0 && (
        <div className="soft-card p-5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Career Growth Timeline</h4>
          <div className="space-y-2">
            {co.career_growth.map((g: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-extrabold text-white">{g.years}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{g.role}</p>
                </div>
                <span className="text-xs font-bold text-emerald-500 shrink-0">{g.salary_range}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const IntelInterviewPane = ({ co }: { co: any }) => (
  <div className="space-y-5">
    {/* Interview Rounds Timeline */}
    <div className="soft-card p-5">
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Interview Rounds</h4>
      <div className="space-y-3">
        {(co.interview_rounds || []).map((r: string, i: number) => {
          const strategy = co.round_strategy?.[i];
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-teal-500 text-white text-xs font-extrabold flex items-center justify-center shrink-0">{i + 1}</div>
                {i < co.interview_rounds.length - 1 && <div className="w-0.5 h-6 bg-slate-200 dark:bg-slate-700 mt-1" />}
              </div>
              <div className="flex-1 pb-2">
                <p className="font-bold text-sm text-slate-800 dark:text-white">{r}</p>
                {strategy?.what_to_prepare && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{strategy.what_to_prepare}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Tips */}
    {co.tips?.length > 0 && (
      <div className="soft-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Prep Tips</h4>
        <ul className="space-y-2">{co.tips.map((t: string, i: number) => <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2"><CaretRight size={10} weight="bold" className="text-teal-500 mt-0.5 shrink-0" />{t}</li>)}</ul>
      </div>
    )}

    {/* Common Rejection Reasons */}
    {co.common_rejection_reasons?.length > 0 && (
      <div className="soft-card p-5 border-red-100 dark:border-red-500/10">
        <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 dark:text-red-400 mb-3">Common Rejection Reasons</h4>
        <ul className="space-y-2">{co.common_rejection_reasons.map((r: string, i: number) => <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2"><Warning size={12} className="text-red-500 mt-0.5 shrink-0" />{r}</li>)}</ul>
      </div>
    )}

    {/* Selection Rate & Difficulty */}
    <div className="grid grid-cols-2 gap-3">
      <div className="soft-card p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Difficulty</p>
        <p className={`text-sm font-extrabold mt-1 ${co.difficulty === 'very hard' ? 'text-red-500' : co.difficulty === 'hard' ? 'text-orange-500' : co.difficulty === 'moderate' ? 'text-amber-500' : 'text-emerald-500'}`}>{co.difficulty}</p>
      </div>
      <div className="soft-card p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prep Time</p>
        <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-1">{co.preparation_time_weeks} weeks</p>
      </div>
    </div>
  </div>
);

const IntelPrepPane = ({ co, branch }: { co: any; branch: string }) => (
  <div className="space-y-5">
    {/* Key Topics */}
    <div className="soft-card p-5">
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Key Topics</h4>
      <div className="flex flex-wrap gap-1.5">{(co.key_topics || []).map((t: string, i: number) => <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">{t}</span>)}</div>
    </div>

    {/* Week-by-week Plan */}
    {co.preparation_plan?.length > 0 && (
      <div className="soft-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Week-by-Week Plan</h4>
        <div className="space-y-2">
          {co.preparation_plan.map((p: any, i: number) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-teal-50/50 dark:bg-teal-500/5 border border-teal-100/50 dark:border-teal-500/10">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-extrabold text-white">W{p.week || i + 1}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{p.focus}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Branch-Specific Playbook */}
    {co.branch_playbooks?.[branch] && (
      <div className="soft-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">{branch} Branch Playbook</h4>
        <div className="flex flex-wrap gap-1.5">{co.branch_playbooks[branch].map((t: string, i: number) => <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">{t}</span>)}</div>
      </div>
    )}
  </div>
);

const IntelQuestionsPane = ({ co }: { co: any }) => {
  const categorized = co.past_questions_categorized || {};
  const flatQuestions = co.past_questions || [];
  const hasCategorized = Object.keys(categorized).length > 0;
  const categoryColors: Record<string, string> = {
    aptitude: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
    coding: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    technical: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    hr: 'bg-pink-50 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400',
  };

  return (
    <div className="space-y-4">
      {hasCategorized ? (
        Object.entries(categorized).map(([cat, questions]: [string, any]) => (
          <div key={cat} className="soft-card p-5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${categoryColors[cat] || 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{cat}</span>
            </h4>
            <ul className="space-y-1.5">
              {(questions as string[]).map((q: string, i: number) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <span className="text-amber-500 shrink-0">→</span>{q}
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : flatQuestions.length > 0 ? (
        <div className="soft-card p-5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Past Questions</h4>
          <ul className="space-y-1.5">
            {flatQuestions.map((q: string, i: number) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <span className="text-amber-500 shrink-0">→</span>{q}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="soft-card p-8 text-center"><p className="text-sm text-slate-400">No past questions available yet.</p></div>
      )}
    </div>
  );
};

const IntelEligibilityPane = ({ co }: { co: any }) => (
  <div className="space-y-5">
    {/* Eligibility */}
    {co.eligibility && (
      <div className="soft-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Eligibility Criteria</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(co.eligibility).map(([k, v]: [string, any]) => (
            <div key={k} className="rounded-xl bg-slate-50 dark:bg-white/[0.03] p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{k.replace(/_/g, ' ')}</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">{Array.isArray(v) ? v.join(', ') : String(v)}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Bond / Service Agreement */}
    {co.bond && (
      <div className="soft-card p-5 border-amber-100 dark:border-amber-500/10">
        <h4 className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3">Bond / Service Agreement</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-500/5">
            <p className="text-[10px] font-black uppercase text-slate-400">Duration</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{co.bond.duration}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-500/5">
            <p className="text-[10px] font-black uppercase text-slate-400">Penalty</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{co.bond.penalty}</p>
          </div>
        </div>
        {co.bond.details && <p className="text-xs text-slate-500 dark:text-slate-400">{co.bond.details}</p>}
      </div>
    )}

    {/* Training */}
    {co.training && (
      <div className="soft-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Training Program</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]"><p className="text-[10px] font-black uppercase text-slate-400">Duration</p><p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{co.training.duration}</p></div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]"><p className="text-[10px] font-black uppercase text-slate-400">Location</p><p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{co.training.location}</p></div>
          {co.training.stipend && <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]"><p className="text-[10px] font-black uppercase text-slate-400">Stipend</p><p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{co.training.stipend}</p></div>}
        </div>
        {co.training.details && <p className="text-xs text-slate-500 dark:text-slate-400">{co.training.details}</p>}
      </div>
    )}

    {/* Work Locations, WFH, Benefits, Bench Risk */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {co.work_locations?.length > 0 && (
        <div className="soft-card p-5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Work Locations</h4>
          <div className="flex flex-wrap gap-1">{co.work_locations.map((l: string, i: number) => <span key={i} className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">{l}</span>)}</div>
        </div>
      )}
      {co.wfh_policy && (
        <div className="soft-card p-5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">WFH Policy</h4>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{co.wfh_policy}</p>
        </div>
      )}
    </div>

    {co.benefits?.length > 0 && (
      <div className="soft-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Benefits & Perks</h4>
        <div className="flex flex-wrap gap-1.5">{co.benefits.map((b: string, i: number) => <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">{b}</span>)}</div>
      </div>
    )}

    {co.bench_risk && (
      <div className="soft-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Bench Risk</h4>
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{co.bench_risk}</p>
      </div>
    )}
  </div>
);


/* ── Detail Tabs Container ─────────────────────────────────── */
const DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'roles', label: 'Roles & Packages' },
  { id: 'interview', label: 'Interview Process' },
  { id: 'prep', label: 'Prep Strategy' },
  { id: 'questions', label: 'Past Questions' },
  { id: 'eligibility', label: 'Eligibility & Logistics' },
];

const CompanyDetailPanel = ({ co, branch, onBack }: { co: any; branch: string; onBack: () => void }) => {
  const [detailTab, setDetailTab] = useState('overview');
  const diffColors: Record<string, string> = { 'easy-moderate': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15', moderate: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15', hard: 'text-orange-600 bg-orange-50 dark:bg-orange-500/15', 'very hard': 'text-red-600 bg-red-50 dark:bg-red-500/15' };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <CaretRight size={16} weight="bold" className="rotate-180" />
        </button>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-base" style={{ backgroundColor: co.logo_color }}>
          {co.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">{co.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-400">{co.category}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${diffColors[co.difficulty] || 'bg-slate-100 text-slate-500'}`}>{co.difficulty}</span>
            <span className="text-xs font-bold text-emerald-500">💰 {co.avg_package_lpa} LPA</span>
          </div>
        </div>
        {co.website && (
          <a href={co.website} target="_blank" rel="noopener noreferrer" className="hidden sm:flex text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-teal-500 transition-colors">
            Visit Website →
          </a>
        )}
      </div>

      {/* Detail Tab Switcher */}
      <div className="flex overflow-x-auto gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl mb-5 hide-scrollbar">
        {DETAIL_TABS.map(tab => (
          <button key={tab.id} onClick={() => setDetailTab(tab.id)}
            className={`flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              detailTab === tab.id
                ? 'bg-white dark:bg-teal-500/15 text-teal-600 dark:text-teal-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={detailTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {detailTab === 'overview' && <IntelOverviewPane co={co} />}
            {detailTab === 'roles' && <IntelRolesPane co={co} />}
            {detailTab === 'interview' && <IntelInterviewPane co={co} />}
            {detailTab === 'prep' && <IntelPrepPane co={co} branch={branch} />}
            {detailTab === 'questions' && <IntelQuestionsPane co={co} />}
            {detailTab === 'eligibility' && <IntelEligibilityPane co={co} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};


/* ── Main CompanyIntelTab ─────────────────────────────────── */
const CompanyIntelTab = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [branch, setBranch] = useState('CSE');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    careerAPI.companyIntel({ branch: branch === 'ALL' ? undefined : branch, difficulty: difficultyFilter || undefined })
      .then(r => {
        const list = r.data?.companies || [];
        setCompanies(list);
        if (list.length > 0 && !selected) setSelected(list[0].name);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [branch, difficultyFilter]);

  const categories = ['all', ...new Set(companies.map((c: any) => c.category))];
  const filtered = filter === 'all' ? companies : companies.filter((c: any) => c.category === filter);
  const selectedCompany = companies.find((c: any) => c.name === selected);

  const diffColors: Record<string, string> = { 'easy-moderate': 'text-emerald-600', moderate: 'text-amber-600', hard: 'text-orange-600', 'very hard': 'text-red-600' };

  if (loading) return <LoadingState text="Loading company data..." />;

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={itemV} className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-600 rounded-xl flex items-center justify-center">
          <Buildings size={20} weight="fill" className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Company Intel</h3>
          <p className="text-xs text-slate-400">Comprehensive placement data for {companies.length} companies</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemV} className="flex gap-2 flex-wrap items-center">
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="soft-input text-xs font-bold w-28">
          {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'ALL'].map(b => <option key={b}>{b}</option>)}
        </select>
        <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="soft-input text-xs font-bold w-36">
          <option value="">All difficulty</option>
          <option value="easy">Easy-moderate</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
        </select>
        {categories.map(c => (
          <button key={c as string} onClick={() => setFilter(c as string)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === c ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
            {c === 'all' ? 'All' : c as string}
          </button>
        ))}
      </motion.div>

      {/* Master → Detail Layout */}
      <div className="flex gap-5 min-h-[600px]">
        {/* Left: Company List */}
        <div className={`${selectedCompany ? 'hidden lg:block' : ''} w-full lg:w-80 shrink-0 space-y-2 overflow-y-auto max-h-[700px] pr-1`}>
          {filtered.map((co: any) => (
            <motion.button key={co.name} variants={itemV}
              onClick={() => setSelected(co.name)}
              className={`w-full p-4 rounded-2xl text-left transition-all border ${
                selected === co.name
                  ? 'bg-teal-50/50 dark:bg-teal-500/5 border-teal-200 dark:border-teal-500/25 shadow-sm'
                  : 'soft-card hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shrink-0" style={{ backgroundColor: co.logo_color }}>
                  {co.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white truncate">{co.name}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{co.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2.5 text-[11px]">
                <span className="font-bold text-emerald-500">💰 {co.avg_package_lpa} LPA</span>
                <span className={`font-bold ${diffColors[co.difficulty] || 'text-slate-500'}`}>📊 {co.difficulty}</span>
                <span className="text-slate-400">⏱ {co.preparation_time_weeks}w</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Right: Detail Panel */}
        <div className={`${!selectedCompany ? 'hidden lg:flex' : ''} flex-1 min-w-0`}>
          {selectedCompany ? (
            <CompanyDetailPanel co={selectedCompany} branch={branch} onBack={() => setSelected(null)} />
          ) : (
            <div className="flex items-center justify-center h-full soft-card rounded-2xl">
              <div className="text-center">
                <Buildings size={48} weight="duotone" className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">Select a company to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
// Embedded natively via ResumeATSContent

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'resume-builder', label: 'Resume Builder', icon: FileText, Component: ResumeStudioTab },
  { id: 'resume-scorer', label: 'Resume Scorer', icon: ChartPolar, Component: ResumeATSContent },
  { id: 'cover-letter', label: 'Cover Letter', icon: FileText, Component: CoverLetterTab },
  { id: 'jd-analyzer', label: 'JD Analyzer', icon: MagnifyingGlass, Component: JDAnalyzerTab },
  { id: 'cold-email', label: 'Cold Email', icon: Envelope, Component: ColdEmailTab },
  { id: 'skill-gap', label: 'Skill Gap', icon: ChartPolar, Component: SkillGapTab },
  { id: 'hr-round', label: 'HR Round', icon: Users, Component: HRRoundTab },
  { id: 'dsa', label: 'DSA Prep', icon: Code, Component: DSATab },
  { id: 'career-paths', label: 'Career Paths', icon: Path, Component: CareerPathTab },
  { id: 'company-intel', label: 'Company Intel', icon: Buildings, Component: CompanyIntelTab },
];

const CareerToolkit = ({ navigate, user }: any) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('career_tab') || 'resume-scorer');
  useEffect(() => { sessionStorage.setItem('career_tab', activeTab); }, [activeTab]);

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.Component || ResumeTab;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader navigate={navigate} user={user} title="Career Toolkit" subtitle="Powered by Ami" maxWidth="max-w-7xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Placement Hub CTA */}
        <motion.div
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => navigate('placement-hub')}
          className="mb-10 relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 p-6 sm:p-8 cursor-pointer shadow-lg shadow-indigo-500/15 hover:shadow-2xl hover:shadow-indigo-500/25 transition-all group"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-3 right-6 w-28 h-28 rounded-full bg-white/20 blur-3xl" />
          </div>
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Target size={24} weight="fill" className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-white">Placement Preparation Suite</h3>
              <p className="text-sm text-white/60 mt-0.5">AI Mock Interviews · SQL Sandbox · Aptitude & Reasoning · Company Prep</p>
            </div>
            <ArrowRight size={22} weight="bold" className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        </motion.div>

        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2 mt-4 mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
           <Code size={18} className="text-slate-400"/> AI Toolkit
        </h3>

        {/* Tab Bar */}
        <div className="flex overflow-x-auto gap-1 p-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-xl mb-8 hide-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-none sm:flex-1 justify-center flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border border-transparent ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-teal-500/15 text-teal-600 dark:text-teal-300 shadow-sm dark:border-teal-500/25'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
                }`}>
                <Icon size={16} weight={activeTab === tab.id ? 'fill' : 'duotone'} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ActiveComponent navigate={navigate} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CareerToolkit;
