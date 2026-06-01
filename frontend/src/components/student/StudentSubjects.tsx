// @ts-nocheck
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Flask, Chalkboard, CheckCircle, Clock, Warning, ArrowRight } from '@phosphor-icons/react';
import { studentAPI, materialsAPI } from '../../services/api';
import Lottie from 'lottie-react';
import { searchEmptyAnimation } from '../../assets/lottieAnimations';
import { FileText, DownloadSimple, Link as LinkIcon, X } from '@phosphor-icons/react';

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const STATUS_BADGE = {
  approved:   { label: 'Approved',   bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
  registered: { label: 'Pending',    bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     icon: Clock },
  rejected:   { label: 'Rejected',   bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400',         icon: Warning },
};

const StudentSubjects = () => {
  const { data: subjects = [], isLoading: loading } = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => studentAPI.subjects().then(r => r.data),
  });

  const [materialsModal, setMaterialsModal] = React.useState({ open: false, courseId: null, subjectName: '' });
  const [materials, setMaterials] = React.useState([]);
  const [materialsLoading, setMaterialsLoading] = React.useState(false);

  const openMaterials = async (courseId, subjectName) => {
    setMaterialsModal({ open: true, courseId, subjectName });
    setMaterialsLoading(true);
    try {
      const { data } = await materialsAPI.list(courseId);
      setMaterials(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const totalCredits = subjects.reduce((s, sub) => s + (sub.credits || 0), 0);
  const bySemester = subjects.reduce((acc, s) => {
    const key = `Semester ${s.semester} (${s.academic_year})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="soft-card p-5 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-28 h-28 mx-auto mb-4"><Lottie animationData={searchEmptyAnimation} loop autoplay /></div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Registered Subjects</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Register for courses during the registration window to see your subjects here.</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
      {/* Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Subjects</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{subjects.length}</p>
        </div>
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Total Credits</p>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{totalCredits}</p>
        </div>
        <div className="soft-card p-4 text-center hidden sm:block">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Labs</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{subjects.filter(s => s.is_lab).length}</p>
        </div>
      </motion.div>

      {/* Grouped by Semester */}
      {Object.entries(bySemester).map(([semLabel, subs]) => (
        <motion.div key={semLabel} variants={itemVariants}>
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">{semLabel}</h3>
          <div className="space-y-2.5">
            {subs.map((sub, i) => {
              const statusCfg = STATUS_BADGE[sub.status] || STATUS_BADGE.registered;
              const StatusIcon = statusCfg.icon;
              
              return (
                <motion.div key={i} variants={itemVariants} className="soft-card p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sub.is_lab ? 'bg-purple-50 dark:bg-purple-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10'}`}>
                      {sub.is_lab ? (
                        <Flask size={20} weight="duotone" className="text-purple-500" />
                      ) : (
                        <Chalkboard size={20} weight="duotone" className="text-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{sub.subject_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub.subject_code}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${statusCfg.bg} ${statusCfg.text}`}>
                          <StatusIcon size={12} weight="fill" /> {statusCfg.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-bold">Faculty: <span className="text-slate-700 dark:text-slate-300">{sub.faculty_name}</span></span>
                        {sub.credits && <span className="font-bold">Credits: <span className="text-slate-700 dark:text-slate-300">{sub.credits}</span></span>}
                        {sub.hours_per_week && <span className="font-bold">Hours: <span className="text-slate-700 dark:text-slate-300">{sub.hours_per_week}/wk</span></span>}
                        {sub.is_lab && <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-extrabold text-[10px]">LAB</span>}
                        {sub.is_arrear && <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-[10px]">ARREAR</span>}
                      </div>
                      {sub.status === 'approved' && (
                        <div className="mt-4">
                           <button onClick={() => openMaterials(sub.course_id, sub.subject_name)} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors">
                              <BookOpen size={14} weight="bold" /> View Materials
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
      
      {/* Materials Modal */}
      {materialsModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMaterialsModal({open: false, courseId: null, subjectName: ''})}></div>
           <div className="relative bg-white dark:bg-[#1A202C] rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                 <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100">Course Materials</h3>
                    <p className="text-xs text-slate-500">{materialsModal.subjectName}</p>
                 </div>
                 <button onClick={() => setMaterialsModal({open: false, courseId: null, subjectName: ''})} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 shadow-sm hover:bg-slate-100 transition-colors">
                    <X size={16} weight="bold" />
                 </button>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                 {materialsLoading ? (
                    <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
                 ) : materials.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">No materials uploaded for this subject yet.</div>
                 ) : (
                    <div className="space-y-3">
                       {materials.map(m => (
                          <div key={m.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.material_type === 'link' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                                {m.material_type === 'link' ? <LinkIcon size={20} weight="duotone" /> : <FileText size={20} weight="duotone" />}
                             </div>
                             <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{m.title}</h4>
                                {m.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{m.description}</p>}
                                <div className="mt-2">
                                   {m.material_type === 'link' ? (
                                      <a href={m.web_link} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1">Open Link <ArrowRight size={12} weight="bold"/></a>
                                   ) : (
                                      <a href={m.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"><DownloadSimple size={12} weight="bold"/> Download</a>
                                   )}
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </motion.div>
};

export default StudentSubjects;
