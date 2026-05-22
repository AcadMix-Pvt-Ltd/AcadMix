import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FilePdf, FileDoc, Download, Sparkle, Eye, PencilSimple,
  GraduationCap, Briefcase, Code, Certificate, Trophy, Globe,
  LinkedinLogo, GithubLogo, Envelope, Phone, MapPin, User,
  CaretDown, Check, Warning, ArrowRight, Notebook
} from '@phosphor-icons/react';
import { careerAPI, resumeProfileAPI } from '../../services/api';
import { toast } from 'sonner';

/* ── Animation Variants ─────────────────────────────────── */
const fadeIn = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

/* ── Template Configs ────────────────────────────────────── */
const TEMPLATES = [
  { id: 'classic', label: 'Classic', desc: 'Clean, ATS-friendly single column', ats_safety: 98 },
  { id: 'modern', label: 'Modern', desc: 'Premium campus layout', ats_safety: 92 },
  { id: 'compact', label: 'Compact', desc: 'Dense one-page layout', ats_safety: 95 },
  { id: 'campus', label: 'Campus', desc: 'Placement-cell friendly format', ats_safety: 94 },
  { id: 'developer', label: 'Developer', desc: 'Projects and GitHub focused', ats_safety: 93 },
  { id: 'core-engineering', label: 'Core Engineering', desc: 'Core branch technical profile', ats_safety: 94 },
  { id: 'management', label: 'Management', desc: 'Leadership and business profile', ats_safety: 91 },
  { id: 'ats-strict', label: 'ATS Strict', desc: 'Maximum parser safety', ats_safety: 100 },
];

/* ═══════════════════════════════════════════════════════════
   LIVE PREVIEW — renders the resume as a scaled A4 page
   ═══════════════════════════════════════════════════════════ */
const ResumePreview = ({ data, template }: { data: any; template: string }) => {
  const personal = data?.personal || {};
  const education = data?.education_history || [];
  const skills = data?.skills || {};
  const projects = data?.projects || [];
  const experience = data?.experience || [];
  const certs = data?.certifications || [];
  const achievements = data?.achievements || [];
  const summary = data?.summary || '';
  const currentEdu = personal.current_education;
  const accent = template === 'developer' ? '#2563eb' : template === 'core-engineering' ? '#0f766e' : template === 'management' ? '#7c3aed' : '#000000';
  const compact = template === 'compact' || template === 'ats-strict';
  const fontFamily = ['modern', 'developer', 'management', 'core-engineering'].includes(template)
    ? "'Inter', 'Arial', sans-serif"
    : "'Times New Roman', 'Georgia', serif";

  const SectionTitle = ({ children }: any) => (
    <div className="mt-[8px] mb-[3px] first:mt-0">
      <h3 className="text-[11px] font-[700] border-b pb-[1px]" style={{ color: accent, borderColor: accent }}>{children}</h3>
    </div>
  );
  const Bullet = ({ children }: any) => (
    <p className="text-[8px] text-black leading-[1.45] pl-[10px] relative before:content-['●'] before:absolute before:left-0 before:text-[6px] before:top-[1px]">{children}</p>
  );
  const TechLine = ({ tech }: { tech: string }) => (
    <p className="text-[8px] text-black leading-[1.45] pl-[10px]">
      <span className="font-[700]">Tech Stack: </span>{tech}
    </p>
  );

  const hasSkills = skills.languages?.length || skills.frameworks?.length || skills.tools?.length || skills.databases?.length;

  return (
    <div className="w-full bg-white shadow-2xl shadow-black/10 rounded-sm overflow-hidden" style={{ aspectRatio: '210 / 297', fontFamily }}>
      <div className={`${compact ? 'p-4' : 'p-5'} h-full overflow-hidden`}>

        {/* Name */}
        <h1 className="text-center text-[16px] font-[800] leading-tight" style={{ color: accent }}>
          {personal.name || <span className="text-slate-300 italic">Your Full Name</span>}
        </h1>

        {/* Contact */}
        {(personal.email || personal.phone || personal.location) && (
          <p className="text-center text-[8px] text-black mt-[2px] leading-snug">
            {[personal.email, personal.phone, personal.location].filter(Boolean).join('  |  ')}
          </p>
        )}

        {/* Links */}
        {(personal.linkedin || personal.github || personal.portfolio) && (
          <p className="text-center text-[8px] text-black mt-[1px] leading-snug">
            {[personal.linkedin, personal.github, personal.portfolio].filter(Boolean).join('  |  ')}
          </p>
        )}

        {/* Summary */}
        {summary.trim() && (
          <>
            <SectionTitle>Summary</SectionTitle>
            <p className="text-[8px] text-black leading-[1.5]">{summary}</p>
          </>
        )}

        {/* Education */}
        <SectionTitle>Education</SectionTitle>
        {currentEdu && currentEdu.institution && (
          <div className="mb-[4px]">
            <div className="flex items-baseline justify-between">
              <p className="text-[9px] text-black">
                <span className="font-[700]">{currentEdu.degree || 'B.Tech'}{currentEdu.branch ? ` in ${currentEdu.branch}` : ''}, </span>
                {currentEdu.institution}
              </p>
              {currentEdu.batch && <span className="text-[8px] text-black italic shrink-0 ml-2">{currentEdu.batch}</span>}
            </div>
          </div>
        )}
        {education.map((edu: any, i: number) => {
          const degree = edu.degree || edu.level || '';
          const field = edu.field || edu.board || '';
          const year = edu.gradYear || edu.year || '';
          const month = edu.gradMonth || '';
          const gradDate = month ? `${month} ${year}`.trim() : year;
          return (
            <div key={i} className="mb-[4px]">
              <div className="flex items-baseline justify-between">
                <p className="text-[9px] text-black">
                  <span className="font-[700]">{degree}</span>
                  {edu.school && <span>, {edu.school}</span>}
                </p>
                {gradDate && <span className="text-[8px] text-black italic shrink-0 ml-2">{gradDate}</span>}
              </div>
              {(field || edu.location || edu.percentage) && (
                <p className="text-[7.5px] text-black italic">
                  {[field, edu.location, edu.percentage].filter(Boolean).join('  |  ')}
                </p>
              )}
            </div>
          );
        })}

        {/* Skills */}
        {hasSkills ? (
          <>
            <SectionTitle>Technical Skills</SectionTitle>
            <div className="space-y-[1px]">
              {([['languages', 'Languages'], ['frameworks', 'Frameworks'], ['tools', 'Tools & Platforms'], ['databases', 'Databases']] as const).map(([key, label]) => {
                const items = skills[key];
                if (!items?.length) return null;
                return (
                  <p key={key} className="text-[8px] text-black leading-[1.5]">
                    <span className="font-[700]">{label}: </span>
                    {items.join(', ')}
                  </p>
                );
              })}
            </div>
          </>
        ) : null}

        {/* Projects */}
        {projects.length > 0 && (
          <>
            <SectionTitle>Projects</SectionTitle>
            {projects.slice(0, 3).map((p: any, i: number) => (
              <div key={i} className="mb-[4px]">
                <p className="text-[9px] font-[700] text-black">{p.title || 'Untitled'}</p>
                {p.bullets?.filter((b: string) => b.trim()).slice(0, 4).map((b: string, j: number) => (
                  <Bullet key={j}>{b}</Bullet>
                ))}
                {p.tech_stack && <TechLine tech={p.tech_stack} />}
              </div>
            ))}
          </>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <>
            <SectionTitle>Experience</SectionTitle>
            {experience.slice(0, 3).map((e: any, i: number) => (
              <div key={i} className="mb-[4px]">
                <p className="text-[9px] text-black">
                  <span className="font-[700]">{e.role || 'Role'}</span>
                  {e.company && <span>, {e.company}</span>}
                </p>
                {(e.duration || e.location) && (
                  <p className="text-[8px] text-black italic">
                    {[e.duration, e.location].filter(Boolean).join('  |  ')}
                  </p>
                )}
                {e.bullets?.filter((b: string) => b.trim()).slice(0, 4).map((b: string, j: number) => (
                  <Bullet key={j}>{b}</Bullet>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Certifications */}
        {certs.length > 0 && (
          <>
            <SectionTitle>Certifications</SectionTitle>
            {certs.map((c: any, i: number) => (
              <p key={i} className="text-[8px] text-black leading-[1.5]">
                <span className="font-[700]">{c.name}</span>
                {(c.issuer || c.year) && <span> — {[c.issuer, c.year].filter(Boolean).join(', ')}</span>}
              </p>
            ))}
          </>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <>
            <SectionTitle>Achievements</SectionTitle>
            {achievements.map((a: any, i: number) => {
              const text = typeof a === 'string' ? a : a.title || '';
              return text.trim() ? <Bullet key={i}>{text}</Bullet> : null;
            })}
          </>
        )}
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════
   DATA SUMMARY — shows what's filled vs empty
   ═══════════════════════════════════════════════════════════ */
const DataSummary = ({ data }: { data: any }) => {
  const sections = [
    { key: 'personal', label: 'Personal Info', icon: User, check: () => data?.personal?.name },
    { key: 'summary', label: 'Summary', icon: Notebook, check: () => data?.summary?.trim() },
    { key: 'education', label: 'Education', icon: GraduationCap, check: () => data?.personal?.current_education || data?.education_history?.length },
    { key: 'skills', label: 'Skills', icon: Code, check: () => {
      const s = data?.skills || {};
      return s.languages?.length || s.frameworks?.length || s.tools?.length || s.databases?.length;
    }},
    { key: 'projects', label: 'Projects', icon: Briefcase, check: () => data?.projects?.length },
    { key: 'experience', label: 'Experience', icon: Briefcase, check: () => data?.experience?.length },
    { key: 'certs', label: 'Certifications', icon: Certificate, check: () => data?.certifications?.length },
    { key: 'achievements', label: 'Achievements', icon: Trophy, check: () => data?.achievements?.length },
  ];

  const filledCount = sections.filter(s => s.check()).length;

  return (
    <div className="space-y-3">
      {/* Completion bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Profile Completeness</span>
          <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400">{Math.round((filledCount / sections.length) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${(filledCount / sections.length) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" />
        </div>
      </div>

      {/* Section checklist */}
      <div className="grid grid-cols-2 gap-1.5">
        {sections.map(s => {
          const filled = !!s.check();
          const Icon = s.icon;
          return (
            <div key={s.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              filled 
                ? 'bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' 
                : 'bg-slate-50 dark:bg-white/[0.02] text-slate-400'
            }`}>
              {filled ? <Check size={12} weight="bold" /> : <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
              {s.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════
   MAIN TAB COMPONENT
   ═══════════════════════════════════════════════════════════ */
const ResumeStudioTab = ({ navigate }: any) => {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [template, setTemplate] = useState('classic');
  const [templates, setTemplates] = useState(TEMPLATES);
  const [downloading, setDownloading] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Merge auto-filled + editable data into a single preview model
  const buildPreviewData = useCallback((autoFilled: any, editable: any) => {
    return {
      personal: {
        name: autoFilled.name || '',
        email: editable.email || autoFilled.email || '',
        phone: editable.phone || autoFilled.phone || '',
        location: editable.location || '',
        linkedin: editable.linkedin || '',
        github: editable.github || '',
        portfolio: editable.portfolio || '',
        current_education: {
          degree: 'B.Tech',
          institution: autoFilled.institution || '',
          branch: autoFilled.department || '',
          batch: autoFilled.batch || '',
        },
      },
      summary: editable.summary || '',
      education_history: editable.education_history || [],
      skills: editable.skills || {},
      projects: editable.projects || [],
      experience: editable.experience || [],
      certifications: editable.certifications || [],
      achievements: editable.achievements || [],
    };
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const { data: res } = await resumeProfileAPI.get();
      const merged = buildPreviewData(res.auto_filled || {}, res.editable || {});
      setProfileData(merged);
    } catch {
      toast.error('Failed to load resume profile');
    }
    setLoading(false);
  }, [buildPreviewData]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => {
    careerAPI.resumeTemplates()
      .then(({ data }) => {
        if (data?.templates?.length) {
          setTemplates(data.templates.map((item: any) => ({
            id: item.id,
            label: item.label,
            desc: item.description || item.desc,
            ats_safety: item.ats_safety,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const handleDownloadDocx = async () => {
    setDownloading('docx');
    try {
      const response = await resumeProfileAPI.generate({ template, format: 'docx' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers['content-disposition'];
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match ? match[1] : 'Resume.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Resume downloaded!');
    } catch {
      toast.error('Failed to generate resume');
    }
    setDownloading(null);
  };

  const handleDownloadPdf = async () => {
    if (!profileData) return;
    setDownloading('pdf');
    try {
      const response = await resumeProfileAPI.generate({ template, format: 'pdf' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers['content-disposition'];
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match ? match[1] : 'Resume.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch { toast.error('Failed to generate PDF'); }
    setDownloading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText size={22} weight="duotone" className="text-teal-500" />
            Resume Studio
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Build and preview your resume from your AcadMix profile</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/profile', { state: { tab: 'resume' } })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors border border-slate-200 dark:border-white/5">
            <PencilSimple size={15} weight="bold" />
            Edit Profile Data
          </motion.button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: Controls & Data Summary */}
        <div className="space-y-5">

          {/* Template selector */}
          <div className="soft-card p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Template</h3>
            <div className="grid grid-cols-2 gap-2">
              {templates.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`px-4 py-3 rounded-xl text-sm font-bold transition-all border text-left ${
                    template === t.id
                      ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/25 shadow-sm'
                      : 'bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-white/10'
                  }`}>
                  <span className="block">{t.label}</span>
                  <span className="text-[10px] block text-slate-400 mt-1 leading-snug">{t.desc}</span>
                  {t.ats_safety && <span className="text-[9px] block text-emerald-500 mt-1">ATS {t.ats_safety}%</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Data summary */}
          <div className="soft-card p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Resume Data</h3>
            <DataSummary data={profileData} />
            <button onClick={() => navigate('/profile', { state: { tab: 'resume' } })}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/15 transition-colors">
              <PencilSimple size={14} weight="bold" />
              Edit Resume Profile
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>

          {/* Download buttons */}
          <div className="soft-card p-5 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Download</h3>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={handleDownloadDocx} disabled={downloading === 'docx'}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-extrabold text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50">
              {downloading === 'docx' ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
              ) : (
                <><FileDoc size={18} weight="fill" /> Download .docx</>
              )}
            </motion.button>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={handleDownloadPdf} disabled={downloading === 'pdf'}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-extrabold text-sm bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50">
              {downloading === 'pdf' ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
              ) : (
                <><FilePdf size={18} weight="fill" /> Download PDF</>
              )}
            </motion.button>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Eye size={14} weight="bold" /> Live Preview
            </h3>
            <span className="text-[10px] text-slate-400">Scaled to fit — actual document is A4</span>
          </div>
          <div className="soft-card p-4 bg-slate-100 dark:bg-slate-900/50">
            <div ref={previewRef}>
              <ResumePreview data={profileData} template={template} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResumeStudioTab;
