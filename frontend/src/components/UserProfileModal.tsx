// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { X, UserCircle, Buildings, GraduationCap, ChalkboardTeacher, ShieldCheck } from '@phosphor-icons/react';

const UserProfileModal = ({ user, onClose }) => {
  // Determine role icon and color based on role
  let Icon = UserCircle;
  let colorClass = "text-indigo-500";
  let bgClass = "bg-indigo-50 dark:bg-indigo-500/10";
  
  if (user?.role === 'student') { Icon = GraduationCap; colorClass = "text-cyan-500"; bgClass = "bg-cyan-50 dark:bg-cyan-500/10"; }
  else if (user?.role === 'teacher' || user?.role === 'hod') { Icon = ChalkboardTeacher; colorClass = "text-blue-500"; bgClass = "bg-blue-50 dark:bg-blue-500/10"; }
  else if (user?.role === 'industry') { Icon = Buildings; colorClass = "text-purple-500"; bgClass = "bg-purple-50 dark:bg-purple-500/10"; }
  else if (user?.role === 'admin' || user?.role === 'nodal') { Icon = ShieldCheck; colorClass = "text-rose-500"; bgClass = "bg-rose-50 dark:bg-rose-500/10"; }

  const formatKeyName = (key) => key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="w-full max-w-md bg-white dark:bg-[#1A202C] rounded-3xl shadow-2xl overflow-hidden pointer-events-auto border border-slate-100 dark:border-slate-800"
        >
          <div className="relative p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <X size={20} weight="bold" />
            </button>
            <div className="flex items-center gap-5">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 ${bgClass}`}>
                <Icon size={40} weight="duotone" className={colorClass} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white shrink-0">{user?.name}</h2>
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Email ID</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-200">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Login ID</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase">{user?.id}</span>
              </div>
              {user?.profile_data && Object.entries(user.profile_data).map(([k, v]) => {
                if (typeof v === 'object' || v === null || v === '') return null;
                return (
                  <div key={k} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{formatKeyName(k)}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-200 capitalize">{v.toString()}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-8">
              <button onClick={onClose} className="w-full btn-ghost !py-3">
                Close Profile
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default UserProfileModal;
