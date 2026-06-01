import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { Buildings, Briefcase, FileText, ChartLineUp, SignOut, DownloadSimple, Users, Trophy, Plus, Sun, Moon, Bell, Info, BookOpen, UserCircle, X, Upload, Table, CalendarBlank, MapPin, CurrencyDollar, GraduationCap, CheckCircle, WarningCircle, SpinnerGap, PencilSimple, Sparkle, Trash, Database, Brain, ShieldCheck } from '@phosphor-icons/react';
import { tpoAPI, notificationsAPI, insightsAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import InsightsChat from '../components/insights/InsightsChat';
import InsightsCanvas from '../components/insights/InsightsCanvas';
import CampusMap from '../components/campus/CampusMap';


const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const cardHover = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 17 }
};

// ─── Create Drive Modal ────────────────────────────────────────
const CreateDriveModal = ({ companies, onClose, onCreated }) => {
  const [step, setStep] = useState(1); // 1=form, 2=excel-preview, 3=uploading
  const [form, setForm] = useState({
    company_id: '', role_title: '', package_lpa: '', drive_date: '',
    work_location: '', drive_type: 'on-campus', min_cgpa: '', job_description: '',
  });
  const [newCompany, setNewCompany] = useState('');
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);
  const [rollColumn, setRollColumn] = useState(0);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFile(file);
    setStep(2);
    // Preview the file
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await tpoAPI.previewExcel('preview', fd);
      setExcelPreview(res.data);
    } catch {
      setError('Could not read the Excel file. Please check the format.');
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.company_id && !newCompany) {
      setError('Please select or create a company');
      return;
    }
    if (!form.role_title) { setError('Role title is required'); return; }

    setCreating(true);
    setStep(3);
    try {
      let companyId = form.company_id;
      // Create company if needed
      if (showNewCompany && newCompany) {
        const compRes = await tpoAPI.createCompany({ name: newCompany });
        companyId = compRes.data.id;
      }

      // Create the drive
      const driveRes = await tpoAPI.createDrive({
        ...form,
        company_id: companyId,
        package_lpa: form.package_lpa ? parseFloat(form.package_lpa) : null,
        min_cgpa: form.min_cgpa ? parseFloat(form.min_cgpa) : null,
        drive_date: form.drive_date || null,
      });

      const driveId = driveRes.data.id;

      // Upload Excel if provided
      if (excelFile) {
        const uploadFd = new FormData();
        uploadFd.append('file', excelFile);
        uploadFd.append('roll_column', rollColumn);
        const uploadRes = await tpoAPI.uploadStudents(driveId, uploadFd);
        setUploadResult(uploadRes.data);
      } else {
        setUploadResult({ matched: 0, total_processed: 0, unmatched_rolls: [] });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create drive');
      setStep(1);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="relative z-10 bg-white dark:bg-[#1A202C] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-white/10"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-[#1A202C] px-6 py-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between rounded-t-3xl">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {uploadResult ? 'Drive Created!' : 'Create Placement Drive'}
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              {uploadResult ? 'Students have been notified' : step === 1 ? 'Step 1 — Drive Details' : step === 2 ? 'Step 2 — Map Roll Numbers' : 'Creating drive...'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <WarningCircle size={18} weight="fill" /> {error}
            </div>
          )}

          {/* ─── Step 3: Result ─── */}
          {uploadResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={40} weight="duotone" className="text-emerald-500" />
                </div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Drive Created Successfully</h4>
                <p className="text-sm text-slate-400 font-medium">Students have been registered and notified</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="soft-card p-4 text-center">
                  <p className="text-3xl font-extrabold text-emerald-500">{uploadResult.matched}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Students Matched</p>
                </div>
                <div className="soft-card p-4 text-center">
                  <p className="text-3xl font-extrabold text-amber-500">{uploadResult.already_registered || 0}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Already Registered</p>
                </div>
                <div className="soft-card p-4 text-center">
                  <p className="text-3xl font-extrabold text-red-400">{uploadResult.unmatched_rolls?.length || 0}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Not Found</p>
                </div>
              </div>

              {uploadResult.unmatched_rolls?.length > 0 && (
                <div className="soft-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Unmatched Roll Numbers ({uploadResult.unmatched_rolls.length})
                    </p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(uploadResult.unmatched_rolls.join('\n')); }}
                      className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors"
                    >
                      Copy All
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-red-100 dark:border-red-500/10 bg-red-50/30 dark:bg-red-500/5 p-2">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-x-3 gap-y-1">
                      {uploadResult.unmatched_rolls.map((r, i) => (
                        <span key={i} className="text-[11px] font-mono font-semibold text-red-500 dark:text-red-400 py-0.5 truncate">{r}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => { onCreated(); onClose(); }} className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors">
                Done
              </button>
            </motion.div>
          )}

          {step === 2 && !uploadResult && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div className="soft-card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/15 rounded-xl flex items-center justify-center">
                    <Table size={20} weight="duotone" className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{excelFile?.name}</p>
                    <p className="text-xs text-slate-400">{excelPreview?.total_data_rows || 0} data rows found</p>
                  </div>
                </div>

                {excelPreview && (
                  <>
                    <div className="mb-3 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
                        <Info size={14} weight="fill" />
                        Click on any column below that contains the <span className="underline">Roll Numbers</span>
                      </p>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            {excelPreview.headers.map((h, i) => (
                              <th
                                key={i}
                                onClick={() => setRollColumn(i)}
                                className={`px-3 py-2.5 text-left font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-all duration-200 border-b-2 ${
                                  i === rollColumn
                                    ? 'bg-indigo-500 text-white border-indigo-600 shadow-[inset_0_0_20px_rgba(99,102,241,0.3)]'
                                    : 'text-slate-400 border-slate-100 dark:border-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-500'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  {i === rollColumn && <CheckCircle size={13} weight="fill" />}
                                  {h}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {excelPreview.preview_rows.map((row, ri) => (
                            <tr key={ri}>
                              {row.map((cell, ci) => (
                                <td
                                  key={ci}
                                  onClick={() => setRollColumn(ci)}
                                  className={`px-3 py-2 whitespace-nowrap cursor-pointer transition-all duration-200 ${
                                    ci === rollColumn
                                      ? 'bg-indigo-50 dark:bg-indigo-500/15 font-bold text-indigo-600 dark:text-indigo-300'
                                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                  }`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] font-semibold text-slate-400 mt-2 text-center">
                      Selected: <span className="text-indigo-500 font-bold">{excelPreview.headers[rollColumn]}</span>
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setExcelFile(null); setExcelPreview(null); setRollColumn(0); }} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors">
                  Remove File
                </button>
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <CheckCircle size={18} weight="fill" />
                  Confirm Upload
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 1: Form ─── */}
          {step === 1 && !uploadResult && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              {/* Company */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Company</label>
                {!showNewCompany ? (
                  <div className="flex gap-2">
                    <select
                      value={form.company_id}
                      onChange={e => setForm({ ...form, company_id: e.target.value })}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="">Select company...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={() => setShowNewCompany(true)} className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors whitespace-nowrap">
                      + New
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={newCompany}
                      onChange={e => setNewCompany(e.target.value)}
                      placeholder="e.g. Infosys, TCS, Google..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <button onClick={() => { setShowNewCompany(false); setNewCompany(''); }} className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Role + Package */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    <Briefcase size={12} weight="bold" className="inline mr-1" />Role Title
                  </label>
                  <input
                    value={form.role_title}
                    onChange={e => setForm({ ...form, role_title: e.target.value })}
                    placeholder="e.g. SDE-1, Analyst"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    <CurrencyDollar size={12} weight="bold" className="inline mr-1" />Package (LPA)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.package_lpa}
                    onChange={e => setForm({ ...form, package_lpa: e.target.value })}
                    placeholder="e.g. 12"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Date + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    <CalendarBlank size={12} weight="bold" className="inline mr-1" />Drive Date
                  </label>
                  <input
                    type="datetime-local"
                    value={form.drive_date}
                    onChange={e => setForm({ ...form, drive_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    <MapPin size={12} weight="bold" className="inline mr-1" />Work Location
                  </label>
                  <input
                    value={form.work_location}
                    onChange={e => setForm({ ...form, work_location: e.target.value })}
                    placeholder="e.g. Hyderabad, Bengaluru"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Drive Type + Min CGPA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Drive Type</label>
                  <select
                    value={form.drive_type}
                    onChange={e => setForm({ ...form, drive_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="on-campus">On-Campus</option>
                    <option value="off-campus">Off-Campus</option>
                    <option value="pool">Pool Drive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    <GraduationCap size={12} weight="bold" className="inline mr-1" />Min CGPA
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.min_cgpa}
                    onChange={e => setForm({ ...form, min_cgpa: e.target.value })}
                    placeholder="e.g. 7.0"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Job Description (optional)</label>
                <textarea
                  value={form.job_description}
                  onChange={e => setForm({ ...form, job_description: e.target.value })}
                  rows={3}
                  placeholder="Brief about the role and responsibilities..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>

              {/* Excel Upload Zone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <Upload size={12} weight="bold" className="inline mr-1" />Upload Eligible Students (Excel)
                </label>
                {excelFile && excelPreview ? (
                  <div className="border-2 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={22} weight="fill" className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{excelFile.name}</p>
                      <p className="text-xs text-slate-400">{excelPreview.total_data_rows} students • Roll column: <span className="font-bold text-indigo-500">{excelPreview.headers[rollColumn]}</span></p>
                    </div>
                    <button onClick={() => { setExcelFile(null); setExcelPreview(null); setRollColumn(0); }} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors" title="Remove file">
                      <X size={16} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all group"
                  >
                    <Upload size={32} weight="duotone" className="text-slate-300 dark:text-slate-600 mx-auto mb-2 group-hover:text-indigo-400 transition-colors" />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Drop .xlsx file or click to browse</p>
                    <p className="text-xs text-slate-400 mt-1">The system will ask you to select the roll number column</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={creating} className={`flex-1 py-3 ${excelFile ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}>
                  {creating ? <><SpinnerGap size={18} className="animate-spin" />Creating...</> : excelFile ? 'Create Drive & Notify Students' : 'Create Drive'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── Creating Spinner ─── */}
          {step === 3 && !uploadResult && creating && (
            <div className="py-12 text-center">
              <SpinnerGap size={48} className="animate-spin text-indigo-500 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Creating drive & notifying students...</p>
              <p className="text-sm text-slate-400 mt-1">This may take a moment for large files</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};


// ─── Edit Drive Modal ──────────────────────────────────────────
const EditDriveModal = ({ drive, companies, onClose, onUpdated }) => {
  const [form, setForm] = useState({
    role_title: drive.role_title || '',
    package_lpa: drive.package_lpa || '',
    drive_date: drive.drive_date ? drive.drive_date.slice(0, 16) : '',
    work_location: drive.work_location || '',
    drive_type: drive.drive_type || 'on-campus',
    min_cgpa: drive.min_cgpa || '',
    job_description: drive.job_description || '',
    status: drive.status || 'upcoming',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await tpoAPI.updateDrive(drive.id, {
        ...form,
        package_lpa: form.package_lpa ? parseFloat(form.package_lpa) : null,
        min_cgpa: form.min_cgpa ? parseFloat(form.min_cgpa) : null,
        drive_date: form.drive_date || null,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="relative z-10 bg-white dark:bg-[#1A202C] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-white/10"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-[#1A202C] px-6 py-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between rounded-t-3xl">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Edit Drive</h3>
            <p className="text-xs font-medium text-slate-400 mt-0.5">{drive.company_name} — {drive.role_title || 'Untitled Role'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <WarningCircle size={18} weight="fill" /> {error}
            </div>
          )}

          {/* Status Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Status</label>
            <div className="flex gap-2">
              {['upcoming', 'ongoing', 'completed'].map(s => (
                <button key={s} onClick={() => setForm({ ...form, status: s })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    form.status === s
                      ? s === 'upcoming' ? 'bg-sky-500 text-white' : s === 'ongoing' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Role + Package */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2"><Briefcase size={12} weight="bold" className="inline mr-1" />Role Title</label>
              <input value={form.role_title} onChange={e => setForm({ ...form, role_title: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2"><CurrencyDollar size={12} weight="bold" className="inline mr-1" />Package (LPA)</label>
              <input type="number" step="0.5" value={form.package_lpa} onChange={e => setForm({ ...form, package_lpa: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Date + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2"><CalendarBlank size={12} weight="bold" className="inline mr-1" />Drive Date</label>
              <input type="datetime-local" value={form.drive_date} onChange={e => setForm({ ...form, drive_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2"><MapPin size={12} weight="bold" className="inline mr-1" />Work Location</label>
              <input value={form.work_location} onChange={e => setForm({ ...form, work_location: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Drive Type + Min CGPA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Drive Type</label>
              <select value={form.drive_type} onChange={e => setForm({ ...form, drive_type: e.target.value })} className={inputCls}>
                <option value="on-campus">On-Campus</option>
                <option value="off-campus">Off-Campus</option>
                <option value="pool">Pool Drive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2"><GraduationCap size={12} weight="bold" className="inline mr-1" />Min CGPA</label>
              <input type="number" step="0.1" value={form.min_cgpa} onChange={e => setForm({ ...form, min_cgpa: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Job Description</label>
            <textarea value={form.job_description} onChange={e => setForm({ ...form, job_description: e.target.value })} rows={3} className={inputCls + ' resize-none'} />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><SpinnerGap size={18} className="animate-spin" />Saving...</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


// ─── Overview Tab ──────────────────────────────────────────────
const OverviewContent = ({ setActiveTab }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tpoAPI.getStats().then(res => { setStats(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton variant="tpo" />;

  const metrics = [
    { label: 'Total Students', value: stats?.total_students || 0, icon: Users, color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500' },
    { label: 'Companies Visited', value: stats?.companies_visited || 0, icon: Buildings, color: 'bg-sky-50 dark:bg-sky-500/15 text-sky-500' },
    { label: 'Students Placed', value: stats?.students_placed || 0, icon: Trophy, color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500' },
    { label: 'Highest CTC', value: (stats?.highest_package || 0) + ' LPA', icon: ChartLineUp, color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-500' },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div variants={itemVariants} whileHover={cardHover} key={i} className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                <div className={`${stat.color} p-2.5 rounded-xl`}><Icon size={20} weight="duotone" /></div>
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <motion.div variants={itemVariants} className="soft-card p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <h4 className="font-extrabold text-xl mb-3">Placement Season</h4>
          <div className="space-y-2 text-sm font-medium text-white/90">
            <p>{stats?.total_drives || 0} drives conducted</p>
            <p>{stats?.students_placed || 0} students placed</p>
            <p>Avg CTC: {stats?.avg_package || 0} LPA</p>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="soft-card p-6 bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <h4 className="font-extrabold text-xl mb-3">Top Recruiter</h4>
          <p className="text-3xl font-extrabold mb-2">{stats?.top_company || '—'}</p>
          <p className="text-sm font-medium text-white/90">Highest offers this season</p>
        </motion.div>
        <motion.div variants={itemVariants} whileHover={cardHover} className="soft-card-hover p-6 flex items-center gap-4 group cursor-pointer">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/15 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <DownloadSimple size={24} weight="duotone" className="text-amber-500" />
          </div>
          <div>
            <p className="font-extrabold text-slate-900 dark:text-white">Export NAAC Report</p>
            <p className="text-sm font-medium text-slate-400">Download placement data as Excel</p>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} whileHover={cardHover} onClick={() => setActiveTab('campus-map')} className="soft-card-hover p-6 flex items-center gap-4 group cursor-pointer">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/15 rounded-xl flex items-center justify-center group-hover:bg-rose-100 transition-colors">
            <MapPin size={24} weight="duotone" className="text-rose-500" />
          </div>
          <div>
            <p className="font-extrabold text-slate-900 dark:text-white">Campus Map</p>
            <p className="text-sm font-medium text-slate-400">Live Infrastructure map</p>
          </div>
        </motion.div>
      </motion.div>

      {/* --- NAAC / NBA Accreditation Matrix --- */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
             <ShieldCheck size={24} weight="fill" className="text-indigo-500" />
             Institutional Readiness Matrix
           </h3>
           <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded-full">
             NAAC / NBA Evidence
           </span>
        </div>

        <div className="bg-white dark:bg-[#1A202C] rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col md:flex-row gap-8 shadow-sm">
           {/* Left: Overall Score */}
           <div className="md:w-1/3 flex flex-col justify-center items-center p-6 bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-slate-100 dark:border-white/5">
              <div className="relative flex items-center justify-center w-32 h-32">
                 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="3"></circle>
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-indigo-500" strokeWidth="3" strokeDasharray="100 100" strokeDashoffset="22" strokeLinecap="round"></circle>
                 </svg>
                 <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">78%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Score</span>
                 </div>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-4 text-center">
                Institutional Placement Readiness Index calculated across 850 students.
              </p>
           </div>

           {/* Right: Breakdown */}
           <div className="md:w-2/3 flex flex-col justify-center gap-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                   <span className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2"><Database size={16} className="text-blue-500"/> SQL Practice (DataLemur)</span>
                   <span className="font-extrabold text-sm text-slate-900 dark:text-white">65% Completion</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                   <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                   <span className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2"><Brain size={16} className="text-amber-500"/> Aptitude & Reasoning</span>
                   <span className="font-extrabold text-sm text-slate-900 dark:text-white">82% Completion</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                   <div className="bg-amber-500 h-2 rounded-full" style={{ width: '82%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                   <span className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2"><Buildings size={16} className="text-emerald-500"/> Target Company Prep</span>
                   <span className="font-extrabold text-sm text-slate-900 dark:text-white">41% Completion</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                   <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '41%' }}></div>
                </div>
              </div>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Companies Tab ─────────────────────────────────────────────
const CompaniesContent = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tpoAPI.getCompanies().then(res => { setCompanies(res.data.data || res.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton variant="content-cards" />;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Company Directory</h3>
        <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
          <Plus size={18} weight="bold" /> Add Company
        </button>
      </motion.div>

      {companies.length === 0 ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Buildings size={36} weight="duotone" className="text-slate-400" />
          </div>
          <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">No companies registered yet</h4>
          <p className="text-sm text-slate-400">Add your first recruiting company to get started.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((c, i) => (
            <motion.div variants={itemVariants} whileHover={cardHover} key={c.id} className="soft-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Buildings size={24} weight="duotone" className="text-indigo-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-lg text-slate-900 dark:text-white truncate">{c.name}</h4>
                  <p className="text-sm font-medium text-slate-400 mt-0.5">{c.sector || 'Technology'}</p>
                  {c.website && <p className="text-xs text-indigo-500 mt-1 truncate">{c.website}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ─── Drives Tab ────────────────────────────────────────────────
const DrivesContent = ({ onRefreshKey }) => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editDrive, setEditDrive] = useState(null);

  const fetchDrives = useCallback(() => {
    setLoading(true);
    tpoAPI.getDrives().then(res => { setDrives(res.data.data || res.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDrives();
    tpoAPI.getCompanies().then(res => setCompanies(res.data.data || res.data || [])).catch(() => {});
  }, [fetchDrives, onRefreshKey]);

  if (loading) return <DashboardSkeleton variant="content-list" />;

  const statusColors = {
    upcoming: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
    ongoing: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    completed: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400',
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Placement Drives</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors"
        >
          <Plus size={18} weight="bold" /> Create Drive
        </button>
      </motion.div>

      {drives.length === 0 ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase size={36} weight="duotone" className="text-slate-400" />
          </div>
          <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">No active placement drives</h4>
          <p className="text-sm text-slate-400">Create your first drive to start the placement process.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {drives.map((d) => (
            <motion.div variants={itemVariants} whileHover={cardHover} key={d.id} className="soft-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/15 rounded-xl flex items-center justify-center">
                    <Briefcase size={24} weight="duotone" className="text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">{d.company_name || 'Company'}</h4>
                    <p className="text-sm font-medium text-slate-400">
                      {d.role_title || d.role || 'Role TBD'}
                      {d.package_lpa && <> • <span className="text-emerald-500 font-bold">₹{d.package_lpa} LPA</span></>}
                      {d.work_location && <> • {d.work_location}</>}
                    </p>
                    {d.drive_date && (
                      <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1">
                        <CalendarBlank size={12} weight="duotone" />
                        {new Date(d.drive_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.drive_type && (
                    <span className="hidden sm:inline-block px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-purple-50 dark:bg-purple-500/10 text-purple-500">{d.drive_type}</span>
                  )}
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${statusColors[d.status] || 'bg-slate-100 text-slate-500'}`}>
                    {d.status || 'upcoming'}
                  </span>
                  <button
                    onClick={() => setEditDrive(d)}
                    className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 transition-all"
                    title="Edit Drive"
                  >
                    <PencilSimple size={18} weight="bold" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateDriveModal
            companies={companies}
            onClose={() => setShowCreate(false)}
            onCreated={fetchDrives}
          />
        )}
        {editDrive && (
          <EditDriveModal
            drive={editDrive}
            companies={companies}
            onClose={() => setEditDrive(null)}
            onUpdated={fetchDrives}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ApplicationsContent = () => {
  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tpoAPI.getDrives().then(res => { 
        const d = res.data.data || res.data || [];
        setDrives(d);
        if (d.length > 0) setSelectedDrive(d[0].id);
        setLoading(false); 
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
      if (selectedDrive) {
          tpoAPI.getApplicants(selectedDrive).then(res => setApplicants(res.data.data || res.data || []));
      }
  }, [selectedDrive]);

  if (loading) return <DashboardSkeleton variant="content-list" />;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Applicant Tracking</h3>
        <select value={selectedDrive} onChange={e => setSelectedDrive(e.target.value)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none">
             {drives.length === 0 && <option value="">No Drives Available</option>}
             {drives.map(d => <option key={d.id} value={d.id}>{d.company_name} — {d.role_title || d.role || 'Drive'}</option>)}
        </select>
      </motion.div>

      {applicants.length === 0 ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={36} weight="duotone" className="text-slate-400" />
          </div>
          <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">Select a placement drive</h4>
          <p className="text-sm text-slate-400">Choose an active drive to view and shortlist applicants.</p>
        </motion.div>
      ) : (
          <div className="space-y-4">
              {applicants.map(app => (
                  <motion.div variants={itemVariants} whileHover={cardHover} key={app.id} className="soft-card p-4 sm:p-6 flex items-center justify-between">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                                  {app.student_name}
                              </h4>
                              {app.telemetry_strikes >= 3 && (
                                  <div title="Integrity Risk: Multiple external paste attempts detected" className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest border border-amber-200 dark:border-amber-500/30">
                                      🚩 <span>{app.telemetry_strikes} Strikes</span>
                                  </div>
                              )}
                          </div>
                          <p className="text-sm font-medium text-slate-400">{app.email}</p>
                      </div>
                      <span className={`soft-badge ${app.status === 'shortlisted' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500'}`}>
                          {app.status || 'applied'}
                      </span>
                  </motion.div>
              ))}
          </div>
      )}
    </motion.div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────
const TPODashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('tpo_tab') || 'overview');
  const [driveRefreshKey, setDriveRefreshKey] = useState(0);
  useEffect(() => { sessionStorage.setItem('tpo_tab', activeTab); }, [activeTab]);
  const { isDark, toggle: toggleTheme } = useTheme();

  // ─── Real notifications ────────────────────────────────────────
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ─── AI Insights State ─────────────────────────────────────────
  const [pins, setPins] = useState([]);
  const [activePinData, setActivePinData] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    if (activeTab === 'insights') {
      insightsAPI.getPins().then(res => setPins(res.data)).catch(() => {});
    }
  }, [activeTab]);

  const refreshPins = async () => {
    try {
      const { data } = await insightsAPI.getPins();
      setPins(data);
    } catch (err) {
      console.error('[Insights] Failed to refresh pins', err);
    }
  };

  const executePin = async (pin) => {
    setPinLoading(true);
    setActivePinData(null);
    try {
      const response = await insightsAPI.query({
        message: pin.nl_query || "Pinned Query",
        cached_sql: pin.cached_sql,
        session_history: []
      });
      setActivePinData(response.data);
    } catch (err) {
      console.error('[Insights] Failed to load pin data', err);
    }
    setPinLoading(false);
  };

  const deletePin = async (id) => {
    try {
      await insightsAPI.deletePin(id);
      setPins(prev => prev.filter(p => p.id !== id));
      setActivePinData(null);
    } catch (err) {
      console.error('[Insights] Delete failed', err);
    }
  };

  useEffect(() => {
    notificationsAPI.getAll({ limit: 10 }).then(res => {
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unread_count || 0);
    }).catch(() => {});
  }, []);

  const handleMarkAllRead = () => {
    notificationsAPI.markAllRead().then(() => {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setShowNotifications(false);
    });
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <DashboardHeader 
        user={user} 
        title="TPO Dashboard" 
        onLogout={onLogout} 
        onProfileClick={() => navigate('faculty-profile')} 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Placement Cell</h2>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">Manage companies, drives, and student placements</p>
        </motion.div>

        {/* Tabs — matching Admin/HOD pill-style */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl mb-8 hide-scrollbar">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'companies', label: 'Companies' },
              { id: 'drives', label: 'Placement Drives' },
              { id: 'applications', label: 'Applications' },
              { id: 'insights', label: 'AI Insights' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#1A202C] text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <OverviewContent key="overview" setActiveTab={setActiveTab} />}
          {activeTab === 'companies' && <CompaniesContent key="companies" />}
          {activeTab === 'drives' && <DrivesContent key="drives" onRefreshKey={driveRefreshKey} />}
          {activeTab === 'applications' && <ApplicationsContent key="applications" />}
          {activeTab === 'insights' && (
            <motion.div key="insights-tab" variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                       <Sparkle weight="fill" className="text-indigo-500" /> Conversational Insights
                   </h3>
                   <button 
                       onClick={() => { setIsChatting(!isChatting); setActivePinData(null); }} 
                       className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors shadow-sm text-sm"
                   >
                       {isChatting ? "View Pinned Dashboards" : "New Query"}
                   </button>
                </div>

                {isChatting ? (
                    <div className="flex overflow-hidden">
                         <InsightsChat user={user} activeCollegeId={null} onPinsChanged={refreshPins} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div className="md:col-span-1 space-y-3">
                           <h4 className="font-bold text-slate-500 uppercase tracking-widest text-xs mb-3">Pinned Dashboards</h4>
                           {pins.length === 0 ? (
                               <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                                   <p className="text-sm text-slate-500">No pinned insights yet.</p>
                                   <p className="text-xs text-slate-400 mt-2 hover:text-indigo-500 cursor-pointer" onClick={() => setIsChatting(true)}>Try asking a question to see magic!</p>
                               </div>
                           ) : (
                               pins.map(pin => (
                                   <div 
                                      key={pin.id} 
                                      onClick={() => executePin(pin)}
                                      className="group p-4 bg-white dark:bg-[#1A202C] border border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all truncate"
                                   >
                                      <div className="flex justify-between items-start">
                                          <p className="font-bold text-sm truncate pr-2" title={pin.title}>{pin.title}</p>
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); deletePin(pin.id); }} 
                                              className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                              <Trash size={16} />
                                          </button>
                                      </div>
                                      <p className="text-xs text-slate-500 truncate mt-1" title={pin.nl_query}>"{pin.nl_query}"</p>
                                   </div>
                               ))
                           )}
                       </div>
                       
                       <div className="md:col-span-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 min-h-[400px]">
                           {pinLoading ? (
                               <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                   <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                   <p>Running query securely...</p>
                               </div>
                           ) : activePinData ? (
                               <InsightsCanvas result={activePinData} />
                           ) : (
                               <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                                   <Sparkle size={48} weight="duotone" className="mb-4 text-indigo-400" />
                                   <p className="font-bold">Select a pinned insight to view data</p>
                                   <p className="text-sm">Data is queried in real-time instantly without AI overhead.</p>
                               </div>
                           )}
                       </div>
                    </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {activeTab === 'campus-map' && (
          <motion.div data-testid="campus-map-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <CampusMap user={user} navigate={navigate} />
            </motion.div>
          </motion.div>
        )}
        <AnimatePresence>
      </AnimatePresence>
    </div>
    </div>
  );
};

export default TPODashboard;
