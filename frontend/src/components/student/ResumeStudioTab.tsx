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
import html2pdf from 'html2pdf.js';

/* ── Animation Variants ─────────────────────────────────── */
const fadeIn = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

/* ── Template Configs ────────────────────────────────────── */
const TEMPLATES = [
  { id: 'classic', label: 'Classic ATS', desc: 'Clean, ATS-friendly single column', ats_safety: 98 },
  { id: 'modern', label: 'Modern', desc: 'Premium project-first profile', ats_safety: 92 },
  { id: 'compact', label: 'Compact', desc: 'Dense one-page campus resume', ats_safety: 96 },
  { id: 'campus', label: 'Campus', desc: 'Mass recruiter screening layout', ats_safety: 94 },
  { id: 'developer', label: 'Developer', desc: 'Tech stack and projects first', ats_safety: 93 },
  { id: 'core-engineering', label: 'Core Engg', desc: 'Core branch lab/project profile', ats_safety: 93 },
  { id: 'management', label: 'Management', desc: 'Leadership and operations focus', ats_safety: 90 },
  { id: 'ats-strict', label: 'ATS Strict', desc: 'Maximum parser compatibility', ats_safety: 100 },
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

  const isModern = ['modern', 'developer', 'management'].includes(template);
  const isCompact = ['compact', 'ats-strict'].includes(template);
  const accent = template === 'developer' ? '#2563eb' : template === 'core-engineering' ? '#0f766e' : template === 'management' ? '#7c3aed' : '#000000';

  const SectionTitle = ({ children }: any) => (
    <div className="mt-[8px] mb-[3px] first:mt-0">
      <h3 className="text-[11px] font-[700] border-b pb-[1px]" style={{ color: accent, borderColor: isModern ? accent : '#000' }}>{children}</h3>
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
    <div className="w-full bg-white shadow-2xl shadow-black/10 rounded-sm overflow-hidden" style={{ aspectRatio: '210 / 297', fontFamily: isModern ? "'Inter', 'Arial', sans-serif" : "'Times New Roman', 'Georgia', serif" }}>
      <div className={`${isCompact ? 'p-4' : 'p-5'} h-full overflow-hidden`}>

        {/* Name */}
        <h1 className={`text-center font-[700] leading-tight ${isCompact ? 'text-[14px]' : 'text-[16px]'}`} style={{ color: accent }}>
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
  const [templates, setTemplates] = useState<any[]>(TEMPLATES);
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

  useEffect(() => {
    loadProfile();
    careerAPI.resumeTemplates().then((r) => {
      if (r.data?.templates?.length) setTemplates(r.data.templates);
    }).catch(() => {});
  }, [loadProfile]);

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
      const p = profileData.personal || {};
      const eduList = profileData.education_history || [];
      const sk = profileData.skills || {};
      const proj = profileData.projects || [];
      const exp = profileData.experience || [];
      const certsList = profileData.certifications || [];
      const achv = profileData.achievements || [];
      const sum = profileData.summary || '';
      const ce = p.current_education;
      const studentName = p.name?.replace(/\s+/g, '_') || 'Resume';

      const esc = (s: string) => s?.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') || '';
      const sectionHead = (t: string) => `<div style="margin-top:14px;margin-bottom:4px;border-bottom:1.5px solid #000;padding-bottom:2px"><span style="font-size:13px;font-weight:700">${t}</span></div>`;
      const bulletPt = (t: string) => `<div style="font-size:11px;padding-left:14px;position:relative;line-height:1.5"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(t)}</div>`;

      let html = `<div style="font-family:'Times New Roman',Georgia,serif;color:#000;padding:48px 56px;width:794px;min-height:1123px;box-sizing:border-box;background:#fff">`;
      html += `<h1 style="text-align:center;font-size:22px;font-weight:700;margin:0;line-height:1.3">${esc(p.name || '')}</h1>`;
      const contact = [p.email, p.phone, p.location].filter(Boolean).map(esc);
      if (contact.length) html += `<p style="text-align:center;font-size:11px;margin:2px 0 0">${contact.join('  |  ')}</p>`;
      const links = [p.linkedin, p.github, p.portfolio].filter(Boolean).map(esc);
      if (links.length) html += `<p style="text-align:center;font-size:11px;margin:2px 0 0">${links.join('  |  ')}</p>`;
      if (sum.trim()) { html += sectionHead('Summary'); html += `<p style="font-size:11px;line-height:1.6;margin:0">${esc(sum)}</p>`; }
      html += sectionHead('Education');
      if (ce?.institution) {
        html += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px"><span style="font-size:12px"><b>${esc(ce.degree||'B.Tech')}${ce.branch?' in '+esc(ce.branch):''}</b>, ${esc(ce.institution)}</span>${ce.batch?`<span style="font-size:11px;font-style:italic">${esc(ce.batch)}</span>`:''}</div>`;
      }
      eduList.forEach((e: any) => {
        const deg = e.degree||e.level||''; const fld = e.field||e.board||'';
        const yr = e.gradYear||e.year||''; const mo = e.gradMonth||'';
        const gd = mo ? `${mo} ${yr}`.trim() : yr;
        html += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px"><span style="font-size:12px"><b>${esc(deg)}</b>${e.school?', '+esc(e.school):''}</span>${gd?`<span style="font-size:11px;font-style:italic">${esc(String(gd))}</span>`:''}</div>`;
        const sub = [fld, e.location, e.percentage].filter(Boolean).map(esc);
        if (sub.length) html += `<p style="font-size:10px;font-style:italic;margin:0 0 4px">${sub.join('  |  ')}</p>`;
      });
      const skRows = [['languages','Languages'],['frameworks','Frameworks'],['tools','Tools &amp; Platforms'],['databases','Databases']] as const;
      if (skRows.some(([k]) => sk[k]?.length)) {
        html += sectionHead('Technical Skills');
        skRows.forEach(([k, label]) => { if (sk[k]?.length) html += `<p style="font-size:11px;line-height:1.6;margin:0"><b>${label}:</b> ${esc(sk[k].join(', '))}</p>`; });
      }
      if (proj.length) {
        html += sectionHead('Projects');
        proj.forEach((pr: any) => {
          html += `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:12px">${esc(pr.title||'')}</b>${pr.duration?`<span style="font-size:11px;font-style:italic">${esc(pr.duration)}</span>`:''}</div>`;
          pr.bullets?.filter((b: string) => b.trim()).forEach((b: string) => { html += bulletPt(b); });
          if (pr.tech_stack) html += `<div style="font-size:11px;padding-left:14px;line-height:1.5"><b>Tech Stack:</b> ${esc(pr.tech_stack)}</div>`;
          html += `</div>`;
        });
      }
      if (exp.length) {
        html += sectionHead('Experience');
        exp.forEach((e: any) => {
          html += `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:12px"><b>${esc(e.role||'')}</b>${e.company?', '+esc(e.company):''}</span>${e.duration?`<span style="font-size:11px;font-style:italic">${esc(e.duration)}</span>`:''}</div>`;
          if (e.location) html += `<p style="font-size:10px;font-style:italic;margin:0">${esc(e.location)}</p>`;
          e.bullets?.filter((b: string) => b.trim()).forEach((b: string) => { html += bulletPt(b); });
          html += `</div>`;
        });
      }
      if (certsList.length) {
        html += sectionHead('Certifications');
        certsList.forEach((c: any) => { html += `<p style="font-size:11px;line-height:1.6;margin:0"><b>${esc(c.name||'')}</b>${(c.issuer||c.year)?' &mdash; '+[c.issuer,c.year].filter(Boolean).map(esc).join(', '):''}</p>`; });
      }
      if (achv.length) {
        html += sectionHead('Achievements');
        achv.forEach((a: any) => { const t = typeof a === 'string' ? a : a.title || ''; if (t.trim()) html += bulletPt(t); });
      }
      html += `</div>`;

      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
      container.innerHTML = html;
      document.body.appendChild(container);

      await html2pdf().set({
        margin: 0, filename: `${studentName}_Resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' as const },
      }).from(container.firstChild).save();

      document.body.removeChild(container);
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
            <div className="flex gap-2">
              {templates.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`min-w-[150px] flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all border text-left ${
                    template === t.id
                      ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/25 shadow-sm'
                      : 'bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-white/10'
                  }`}>
                  <span>{t.label}</span>
                  <span className="block text-[10px] font-semibold text-slate-400 mt-1 leading-snug">{t.desc || t.description}</span>
                  <span className="block text-[9px] font-black text-emerald-500 mt-1">ATS {t.ats_safety || 90}%</span>
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
