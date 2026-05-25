// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, EnvelopeSimple, IdentificationCard, House, GraduationCap, Heart, Users, CurrencyCircleDollar, Drop, X } from '@phosphor-icons/react';

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const InfoRow = ({ icon: Icon, label, value, masked }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-white/5 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon size={16} weight="duotone" className="text-slate-500 dark:text-slate-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
        {masked && value ? value.replace(/.(?=.{4})/g, '•') : (value || '—')}
      </p>
    </div>
  </div>
);

const StudentProfile = ({ user, onClose }) => {
  const profile = user?.profile_data || {};
  
  const sections = [
    {
      title: 'Personal Information',
      items: [
        { icon: User, label: 'Full Name', value: user?.name },
        { icon: EnvelopeSimple, label: 'Email', value: user?.email },
        { icon: Phone, label: 'Phone', value: profile.phone },
        { icon: IdentificationCard, label: 'Register Number', value: profile.register_number || user?.college_id },
        { icon: IdentificationCard, label: 'Aadhaar Number', value: profile.aadhaar, masked: true },
        { icon: Drop, label: 'Blood Group', value: profile.blood_group },
        { icon: User, label: 'Date of Birth', value: profile.dob },
        { icon: User, label: 'Gender', value: profile.gender },
      ]
    },
    {
      title: 'Academic Details',
      items: [
        { icon: GraduationCap, label: 'Department', value: user?.department || profile.department },
        { icon: GraduationCap, label: 'Batch', value: user?.batch || profile.batch },
        { icon: GraduationCap, label: 'Section', value: user?.section || profile.section },
        { icon: GraduationCap, label: 'Current Semester', value: profile.current_semester },
        { icon: GraduationCap, label: 'Admission Year', value: profile.admission_year },
      ]
    },
    {
      title: 'Community & Social',
      items: [
        { icon: Heart, label: 'Community', value: profile.community },
        { icon: Heart, label: 'Religion', value: profile.religion },
        { icon: Heart, label: 'Caste', value: profile.caste },
        { icon: Heart, label: 'Nationality', value: profile.nationality || 'Indian' },
        { icon: Heart, label: 'Mother Tongue', value: profile.mother_tongue },
      ]
    },
    {
      title: 'Family Details',
      items: [
        { icon: Users, label: "Father's Name", value: profile.father_name },
        { icon: Users, label: "Mother's Name", value: profile.mother_name },
        { icon: Phone, label: "Parent Phone", value: profile.parent_phone },
        { icon: Users, label: 'Guardian Name', value: profile.guardian_name },
        { icon: CurrencyCircleDollar, label: 'Annual Income', value: profile.annual_income ? `₹${Number(profile.annual_income).toLocaleString()}` : null },
        { icon: Users, label: 'Siblings', value: profile.siblings_count },
      ]
    },
    {
      title: 'Address',
      items: [
        { icon: House, label: 'Address', value: profile.address },
        { icon: House, label: 'City', value: profile.city },
        { icon: House, label: 'State', value: profile.state },
        { icon: House, label: 'Pincode', value: profile.pincode },
      ]
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-start justify-center pt-8 pb-8 overflow-y-auto"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="relative w-full max-w-lg mx-4 bg-white dark:bg-[#1A202C] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-10"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-8 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
            <X size={18} weight="bold" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-extrabold">
              {user?.name?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{user?.name}</h2>
              <p className="text-sm font-medium text-white/70">{profile.register_number || user?.college_id}</p>
              <p className="text-xs font-bold text-white/50 mt-0.5">{user?.department} • Batch {user?.batch} • Section {user?.section}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-6">
          {sections.map((section, si) => (
            <div key={si}>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{section.title}</h3>
              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl px-4">
                {section.items.map((item, ii) => (
                  <InfoRow key={ii} icon={item.icon} label={item.label} value={item.value} masked={item.masked} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10">
          <p className="text-xs text-center text-slate-400 dark:text-slate-500">
            Contact your department admin to update profile information.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StudentProfile;
