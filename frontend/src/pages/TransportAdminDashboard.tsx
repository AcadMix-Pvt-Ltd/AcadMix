import React, { useState, useEffect } from 'react';
import UserProfileModal from '../components/UserProfileModal';
import DashboardHeader from '../components/DashboardHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, SignOut, Sun, Moon, UserCircle, BookOpen, Bell, Briefcase, Info } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import { notificationsAPI } from '../services/api';
import AdminTransportPanel from '../components/admin/AdminTransportPanel';
import CampusMap from '../components/campus/CampusMap';


// ─── Notification Bell ─────────────────────────────────────────
const NotifBell = () => {
  const [show, setShow] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  useEffect(() => { notificationsAPI.getAll({ limit: 10 }).then(r => { setItems(r.data.data || []); setUnread(r.data.unread_count || 0); }).catch(() => {}); }, []);
  const fmt = (iso) => { if (!iso) return ''; const d = Math.floor((Date.now() - new Date(iso)) / 60000); if (d < 1) return 'Just now'; if (d < 60) return `${d}m ago`; if (d < 1440) return `${Math.floor(d / 60)}h ago`; return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  return (
    <div className="relative">
      <button onClick={() => setShow(!show)} className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors relative" aria-label="Notifications">
        <Bell size={20} weight={show ? 'fill' : 'duotone'} />
        {unread > 0 && <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{unread > 9 ? '9+' : unread}</div>}
      </button>
      <AnimatePresence>
        {show && (<>
          <div className="fixed inset-0 z-[60]" onClick={() => setShow(false)} />
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Notifications</h4>
              <button onClick={() => { notificationsAPI.markAllRead(); setUnread(0); setItems(p => p.map(n => ({ ...n, is_read: true }))); setShow(false); }} className="text-xs font-bold text-blue-500">Mark all read</button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-white/5">
              {items.length === 0 ? <div className="px-5 py-8 text-center text-sm text-slate-400">No notifications</div> : items.map(n => (
                <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${n.type === 'placement' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-blue-50 dark:bg-blue-500/15'}`}>
                    {n.type === 'placement' ? <Briefcase size={14} weight="duotone" className="text-emerald-500" /> : <Info size={14} weight="duotone" className="text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{n.title}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5 block">{fmt(n.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>)}
      </AnimatePresence>
    </div>
  );
};

const TransportAdminDashboard = ({ navigate, user, onLogout }) => {
  const [showProfile, setShowProfile] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <DashboardHeader 
        user={user} 
        title="TransportAdmin Dashboard" 
        onLogout={onLogout} 
        setShowProfile={setShowProfile} 
      />
      {showProfile && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}


      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Transport Management</h2>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">Manage fleet, routes, trips, and GPS devices</p>
        </motion.div>

        <AdminTransportPanel />
      </div>
    </div>
  );
};

export default TransportAdminDashboard;
