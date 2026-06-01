import React, { useState, useEffect, useMemo } from 'react';
import { Bank, Bell, Sun, Moon, SignOut, Info, Briefcase, UserCircle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from 'boring-avatars';
import { useTheme } from '../contexts/ThemeContext';
import { notificationsAPI } from '../services/api';

/**
 * Reusable Dashboard Header matching the premium UI pattern.
 * Squircle buttons (rounded-2xl) and a fully pill-shaped profile container.
 */
const DashboardHeader = ({ user, title, onLogout, onProfileClick }) => {
  const { isDark, toggle: toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll notifications
  useEffect(() => {
    const fetchNotifs = () => {
      notificationsAPI.getAll({ limit: 10 }).then(res => {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000); // 1 minute
    return () => clearInterval(interval);
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

  const iconBaseClass = "w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50/80 border border-slate-200 shadow-sm hover:bg-slate-100 dark:bg-[#1A202C] dark:border-slate-700 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all cursor-pointer";

  // Generate a random seed for the boring avatar per session
  const sessionAvatarSeed = useMemo(() => {
    const key = 'student_avatar_seed';
    let seed = sessionStorage.getItem(key);
    if (!seed) {
      seed = Math.random().toString(36).substring(7);
      sessionStorage.setItem(key, seed);
    }
    return seed;
  }, []);

  return (
    <header className="glass-header z-40 relative">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Bank size={22} weight="duotone" className="text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              AcadMix
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {title}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={iconBaseClass}
              aria-label="Notifications"
            >
              <Bell size={20} weight={showNotifications ? "fill" : "duotone"} />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-[#0B0F19]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)}></div>
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white dark:bg-[#1A202C] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Notifications</h4>
                      <button onClick={handleMarkAllRead} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">Mark all as read</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-slate-400">No notifications yet</div>
                      ) : notifications.map((item) => (
                        <div key={item.id} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!item.is_read ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${item.type === 'alert' ? 'bg-rose-50 dark:bg-rose-500/15' : 'bg-indigo-50 dark:bg-indigo-500/15'}`}>
                            <Info size={14} weight="duotone" className={item.type === 'alert' ? 'text-rose-500' : 'text-indigo-500'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.message}</p>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5 block">{formatTime(item.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className={iconBaseClass}
          >
            {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
          </motion.button>

          {/* User Profile Card */}
          <button
            onClick={onProfileClick}
            className="hidden sm:flex items-center gap-3 bg-slate-50/80 hover:bg-slate-100 dark:bg-[#1A202C] dark:border-slate-700 dark:hover:bg-slate-800 transition-all rounded-2xl p-1 pr-5 cursor-pointer border border-slate-200 dark:border-slate-700/50 shadow-sm"
          >
            <div className="w-9 h-9 rounded-[10px] overflow-hidden flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-slate-800">
              {user?.role === 'student' ? (
                <Avatar 
                  size={36} 
                  name={sessionAvatarSeed} 
                  variant="beam" 
                  colors={['#6366f1', '#14b8a6', '#8b5cf6', '#06b6d4', '#34d399']} 
                />
              ) : (
                <img 
                  src={`https://avatar.iran.liara.run/public/${user?.gender?.toLowerCase() === 'female' ? 'girl' : 'boy'}?username=${user?.name || 'Faculty'}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="text-left">
              <p className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight tracking-tight">
                {user?.name || "User"}
              </p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {user?.designation || user?.role || "Role"}
              </p>
            </div>
          </button>
          
          <button
            onClick={onProfileClick}
            className={`sm:hidden ${iconBaseClass} text-indigo-500`}
            aria-label="Profile Menu"
          >
            <UserCircle size={22} weight="duotone" />
          </button>

          {/* Sign Out */}
          <button 
            onClick={onLogout} 
            className={`${iconBaseClass} text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600`}
            title="Sign Out"
          >
            <SignOut size={20} weight="duotone" />
          </button>
          
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
