// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, GraduationCap, Briefcase, BookOpen, Certificate, UsersThree, Chalkboard, Plus, Trash, FloppyDisk, CheckCircle, Warning, PencilLine, Phone, EnvelopeSimple, IdentificationCard, Drop, House } from '@phosphor-icons/react';
import { facultyPanelAPI } from '../../services/api';

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const STATUS_COLORS = {
  draft: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  submitted: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  approved: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
};

const SECTIONS = [
  { key: 'personal', label: 'Personal Information', icon: User, type: 'object',
    fields: [
      { key: 'phone', label: 'Phone', icon: Phone },
      { key: 'dob', label: 'Date of Birth', icon: User, type: 'date' },
      { key: 'gender', label: 'Gender', icon: User },
      { key: 'aadhaar', label: 'Aadhaar Number', icon: IdentificationCard },
      { key: 'blood_group', label: 'Blood Group', icon: Drop },
      { key: 'address', label: 'Address', icon: House },
      { key: 'city', label: 'City', icon: House },
      { key: 'state', label: 'State', icon: House },
      { key: 'pincode', label: 'Pincode', icon: House },
    ]
  },
  { key: 'educational', label: 'Educational Details', icon: GraduationCap, type: 'list',
    fields: [
      { key: 'degree', label: 'Degree' },
      { key: 'university', label: 'University/Institution' },
      { key: 'year', label: 'Year of Passing' },
      { key: 'percentage', label: 'Percentage/CGPA' },
    ]
  },
  { key: 'experience', label: 'Experience', icon: Briefcase, type: 'list',
    fields: [
      { key: 'position', label: 'Position' },
      { key: 'institution', label: 'Institution' },
      { key: 'from_date', label: 'From', type: 'date' },
      { key: 'to_date', label: 'To (blank=present)', type: 'date' },
    ]
  },
  { key: 'research', label: 'Research', icon: BookOpen, type: 'list',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'journal', label: 'Journal/Conference' },
      { key: 'year', label: 'Year' },
      { key: 'doi', label: 'DOI' },
    ]
  },
  { key: 'publications', label: 'Publications', icon: BookOpen, type: 'list',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'publisher', label: 'Publisher' },
      { key: 'year', label: 'Year' },
      { key: 'isbn', label: 'ISBN' },
    ]
  },
  { key: 'memberships', label: 'Professional Memberships', icon: UsersThree, type: 'list',
    fields: [
      { key: 'body', label: 'Professional Body' },
      { key: 'membership_id', label: 'Membership ID' },
      { key: 'from_date', label: 'Member Since', type: 'date' },
    ]
  },
  { key: 'training', label: 'Training & FDP', icon: Certificate, type: 'list',
    fields: [
      { key: 'program', label: 'Program Name' },
      { key: 'organizer', label: 'Organizer' },
      { key: 'dates', label: 'Dates' },
      { key: 'certificate_url', label: 'Certificate URL' },
    ]
  },
];

const FacultyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await facultyPanelAPI.getProfile();
      setProfile(data);
      // Initialize edit data from profile
      const ed = {};
      SECTIONS.forEach(s => {
        if (s.type === 'object') {
          ed[s.key] = data[s.key] || {};
        } else {
          ed[s.key] = data[s.key] || [];
        }
      });
      setEditData(ed);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleFieldChange = (sectionKey, fieldKey, value) => {
    setEditData(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [fieldKey]: value }
    }));
  };

  const handleListFieldChange = (sectionKey, index, fieldKey, value) => {
    setEditData(prev => {
      const list = [...(prev[sectionKey] || [])];
      list[index] = { ...list[index], [fieldKey]: value };
      return { ...prev, [sectionKey]: list };
    });
  };

  const addListItem = (sectionKey) => {
    setEditData(prev => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), { status: 'draft' }]
    }));
  };

  const removeListItem = (sectionKey, index) => {
    setEditData(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await facultyPanelAPI.updateProfile(editData);
      setMessage({ type: 'success', text: 'Profile saved successfully' });
      await loadProfile();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Failed to save profile' });
    }
    setSaving(false);
  };

  const currentSection = SECTIONS.find(s => s.key === activeSection);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="soft-card p-6 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
      {/* Profile Header */}
      <motion.div variants={itemVariants} className="soft-card overflow-hidden">
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-extrabold">
              {profile?.name?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{profile?.name}</h2>
              <p className="text-sm font-medium text-white/70">{profile?.designation || 'Faculty'} • {profile?.department}</p>
              <p className="text-xs font-medium text-white/50 mt-0.5">{profile?.email}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Section Nav */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <div className="soft-card p-3 space-y-1 lg:sticky lg:top-24">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const isActive = activeSection === s.key;
              const count = s.type === 'list' ? (editData[s.key] || []).length : null;
              return (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${
                    isActive ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} weight="duotone" />
                  <span className="flex-1 truncate">{s.label}</span>
                  {count !== null && count > 0 && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-xl ${
                      isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Section Content */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-4">
          <div className="soft-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{currentSection?.label}</h3>
              {currentSection?.type === 'list' && (
                <button onClick={() => addListItem(currentSection.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <Plus size={14} weight="bold" /> Add Entry
                </button>
              )}
            </div>

            {/* Object Section (Personal) */}
            {currentSection?.type === 'object' && (
              <div className="space-y-4">
                {currentSection.fields.map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">{field.label}</label>
                    <input
                      type={field.type === 'date' ? 'date' : 'text'}
                      value={editData[currentSection.key]?.[field.key] || ''}
                      onChange={e => handleFieldChange(currentSection.key, field.key, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all"
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* List Section (Educational, Experience, etc.) */}
            {currentSection?.type === 'list' && (
              <div className="space-y-4">
                {(editData[currentSection.key] || []).length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No entries yet</p>
                    <button onClick={() => addListItem(currentSection.key)}
                      className="mt-2 text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                      Add your first entry →
                    </button>
                  </div>
                ) : (
                  (editData[currentSection.key] || []).map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">#{idx + 1}</span>
                          {item.status && (
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-xl uppercase ${STATUS_COLORS[item.status] || STATUS_COLORS.draft}`}>
                              {item.status}
                            </span>
                          )}
                        </div>
                        <button onClick={() => removeListItem(currentSection.key, idx)}
                          className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors">
                          <Trash size={14} weight="duotone" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentSection.fields.map(field => (
                          <div key={field.key}>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">{field.label}</label>
                            <input
                              type={field.type === 'date' ? 'date' : 'text'}
                              value={item[field.key] || ''}
                              onChange={e => handleListFieldChange(currentSection.key, idx, field.key, e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1A202C] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all"
                              placeholder={field.label}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Save Button + Messages */}
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50">
              <FloppyDisk size={16} weight="duotone" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <AnimatePresence>
              {message.text && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className={`flex items-center gap-1.5 text-sm font-bold ${
                    message.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                  {message.type === 'success' ? <CheckCircle size={16} weight="fill" /> : <Warning size={16} weight="fill" />}
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FacultyProfile;
