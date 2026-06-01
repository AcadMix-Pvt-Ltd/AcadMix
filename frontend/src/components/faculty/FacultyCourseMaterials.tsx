import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileArrowUp, Trash, CloudArrowDown, Info, UploadSimple, X, ArrowLeft, WarningCircle } from '@phosphor-icons/react';
import { facultyPanelAPI } from '../../services/api';
import { useCourseMaterials } from '../../hooks/useMaterials';
import AlertModal from '../AlertModal';
import { formatBytes } from '../../utils/formatters';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const formatTimestamp = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const FacultyCourseMaterials = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const { materials, loading, uploadMaterial, deleteMaterial } = useCourseMaterials(selectedCourse?.course_id || null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState({ title: '', description: '', material_type: 'document', file: null as File | null, url: '' });

  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null as any });
  const closeAlert = () => setAlertModal(prev => ({ ...prev, open: false }));

  useEffect(() => {
    facultyPanelAPI.ciaDashboard()
      .then(res => setCourses(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoadingCourses(false));
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.title) {
      setAlertModal({ open: true, title: 'Validation', message: 'Title is required', type: 'warning', onConfirm: null });
      return;
    }
    if (uploadData.material_type === 'link' && !uploadData.url) {
      setAlertModal({ open: true, title: 'Validation', message: 'URL is required for link type', type: 'warning', onConfirm: null });
      return;
    }
    if (uploadData.material_type !== 'link' && !uploadData.file) {
      setAlertModal({ open: true, title: 'Validation', message: 'File is required', type: 'warning', onConfirm: null });
      return;
    }

    const formData = new FormData();
    formData.append('title', uploadData.title);
    if (uploadData.description) formData.append('description', uploadData.description);
    formData.append('material_type', uploadData.material_type);
    
    if (uploadData.material_type === 'link') {
      formData.append('web_link', uploadData.url);
    } else if (uploadData.file) {
      formData.append('file', uploadData.file);
    }

    setIsUploading(true);
    try {
      await uploadMaterial(formData);
      setUploadData({ title: '', description: '', material_type: 'document', file: null, url: '' });
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 413) {
         setAlertModal({ open: true, title: 'File Too Large', message: 'The uploaded file exceeds the maximum allowed size (50MB).', type: 'danger', onConfirm: null });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (materialId: string) => {
    setAlertModal({
      open: true,
      title: 'Delete Material',
      message: 'Are you sure you want to delete this material? This cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        closeAlert();
        await deleteMaterial(materialId);
      }
    });
  };

  if (!selectedCourse) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Select Subject for Materials
        </h3>
        {loadingCourses ? (
          <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : courses.length === 0 ? (
          <div className="text-center p-10 text-slate-500">No courses assigned to you.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c, i) => (
              <motion.div key={i} whileHover={{ y: -2 }} onClick={() => setSelectedCourse(c)}
                className="soft-card p-5 cursor-pointer border border-slate-100 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{c.subject}</h4>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{c.subject_code} • Sem {c.semester}</p>
                  </div>
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/15 rounded-full flex items-center justify-center">
                    <BookOpen size={16} className="text-indigo-500" weight="bold" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full relative min-h-screen pb-10">
      <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-4">
           <button onClick={() => setSelectedCourse(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 shadow-sm hover:bg-slate-100 transition-colors">
              <ArrowLeft size={16} weight="bold" />
           </button>
           <div>
             <h3 className="font-extrabold text-slate-800 dark:text-slate-100 leading-tight">Course Materials: {selectedCourse.subject}</h3>
             <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{selectedCourse.subject_code}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl border border-slate-100 dark:border-white/5 p-5 shadow-sm sticky top-24">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <UploadSimple size={18} className="text-indigo-500" /> Upload Material
            </h4>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Title *</label>
                <input type="text" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="E.g. Unit 1 Notes" required />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Description (Optional)</label>
                <textarea value={uploadData.description} onChange={e => setUploadData({...uploadData, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-y min-h-[60px]" placeholder="Brief context about this material..." />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Type *</label>
                <select value={uploadData.material_type} onChange={e => setUploadData({...uploadData, material_type: e.target.value, file: null, url: ''})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                  <option value="document">Document (PDF, PPT, DOC)</option>
                  <option value="video">Video</option>
                  <option value="link">Web Link</option>
                </select>
              </div>

              {uploadData.material_type === 'link' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">URL *</label>
                  <input type="url" value={uploadData.url} onChange={e => setUploadData({...uploadData, url: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="https://" required />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">File * (Max 50MB)</label>
                  <div className="relative">
                    <input type="file" id="file-upload" className="hidden" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        if (e.target.files[0].size > 50 * 1024 * 1024) {
                           setAlertModal({ open: true, title: 'File Too Large', message: 'The uploaded file exceeds the maximum allowed size (50MB).', type: 'danger', onConfirm: null });
                           return;
                        }
                        setUploadData({...uploadData, file: e.target.files[0]});
                      }
                    }} />
                    <label htmlFor="file-upload" className="flex items-center justify-center w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all text-center">
                      {uploadData.file ? (
                        <div className="truncate w-full flex items-center justify-between">
                          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate">{uploadData.file.name}</span>
                          <button type="button" onClick={(e) => { e.preventDefault(); setUploadData({...uploadData, file: null}); }} className="ml-2 text-slate-400 hover:text-red-500">
                             <X size={16} weight="bold" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                          <FileArrowUp size={24} className="mx-auto mb-1 text-slate-400" />
                          Click to select a file
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              <button type="submit" disabled={isUploading} className={`w-full py-2.5 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all ${isUploading ? 'bg-indigo-400 text-white cursor-wait' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}>
                {isUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CloudArrowDown size={18} weight="bold" />}
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm p-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-indigo-500" /> Shared Materials
            </h4>

            {loading ? (
              <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : materials.length === 0 ? (
              <div className="text-center p-12 text-slate-500 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <WarningCircle size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm">No Materials Shared Yet</p>
                <p className="text-xs mt-1">Upload notes, videos or links to share with students.</p>
              </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-3">
                {materials.map((m: any) => (
                  <motion.div key={m.id} variants={itemVariants} className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all group">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          m.material_type === 'document' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                          m.material_type === 'video' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                          {m.material_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{formatTimestamp(m.created_at)}</span>
                      </div>
                      <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{m.title}</h5>
                      {m.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{m.description}</p>}
                      
                      <div className="mt-2 flex items-center gap-3">
                        {m.material_type === 'link' ? (
                          <a href={m.web_link} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-500 hover:underline">
                            Open Link
                          </a>
                        ) : (
                          <a href={m.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-500 hover:underline">
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <button onClick={() => handleDelete(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash size={16} weight="bold" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      <AlertModal
        open={alertModal.open}
        type={alertModal.type as any}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={alertModal.onConfirm || closeAlert}
        onCancel={closeAlert}
      />
    </div>
  );
};

export default FacultyCourseMaterials;
