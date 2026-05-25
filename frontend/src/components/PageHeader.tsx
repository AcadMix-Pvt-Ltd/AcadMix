// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Sun, Moon, SignOut, Bell, Briefcase, Info } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import { notificationsAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Lightweight sub-page header.
 * Shows: back button + AcadMix logo + title/subtitle on the left,
 * optional action buttons + notification bell + theme toggle + logout icon on the right.
 * User details card is intentionally omitted — only main dashboards show it.
 *
 * Props:
 *   - navigate(page)   — navigation callback
 *   - user             — current user object (used for role-based back navigation)
 *   - onLogout         — logout callback (optional, hides sign-out if absent)
 *   - title            — page title (e.g. "Available Quizzes")
 *   - subtitle         — small text under the title (optional)
 *   - backTo           — page key to navigate back (auto-resolved from user.role if omitted)
 *   - hideBack         — if true, the back button is hidden (for main dashboard pages)
 *   - rightContent     — extra JSX to render (e.g. action buttons)
 *   - maxWidth         — max-width class (default: "max-w-7xl")
 *   - hideNotifications — if true, notification bell is hidden
 */
const PageHeader = ({ navigate, user, onLogout, title, subtitle, backTo, hideBack, rightContent, maxWidth, hideNotifications }) => {
  const { isDark, toggle: toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications on mount + poll
  useEffect(() => {
    if (hideNotifications) return;
    const fetchNotifs = () => {
      notificationsAPI.getAll({ limit: 10 }).then(res => {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 300000); // Poll every 5 minutes as fallback to WebSocket
    return () => clearInterval(interval);
  }, [hideNotifications]);

  // WebSocket for instant notifications
  useEffect(() => {
    if (hideNotifications) return;
    
    const wsBase = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/^http/, 'ws');
    let ws: any;
    let reconnectTimer: any;

    const connect = () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        ws = new WebSocket(`${wsBase}/ws/notifications?token=${token}`);
        ws.onmessage = (event: any) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification') {
              // Immediately add to the list and bump unread count
              setNotifications(prev => [{
                id: data.entity_id || Date.now().toString(),
                title: data.title,
                message: data.message,
                type: data.type,
                is_read: false,
                created_at: new Date().toISOString(),
              }, ...prev].slice(0, 10));
              setUnreadCount(prev => prev + 1);
            }
          } catch (_) {}
        };
        ws.onclose = () => {
          // Reconnect after 5 seconds
          reconnectTimer = setTimeout(connect, 5000);
        };
        ws.onerror = () => { ws.close(); };
      } catch (_) {}
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) { ws.onclose = null; ws.close(); }
    };
  }, [hideNotifications]);

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

  const defaultBack = {
    student: 'student-dashboard', teacher: 'teacher-dashboard', admin: 'admin-dashboard',
    hod: 'hod-dashboard', exam_cell: 'examcell-dashboard', tpo: 'tpo-dashboard',
    parent: 'parent-dashboard', alumni: 'alumni-dashboard', principal: 'principal-dashboard',
    warden: 'warden-dashboard',
    librarian: 'librarian-dashboard',
    security: 'security-dashboard',
  }[user?.role] || 'student-dashboard';

  const goBack = backTo || defaultBack;
  const mw = maxWidth || 'max-w-7xl';

  return (
    <header className="glass-header border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="w-full px-2 sm:px-3 py-3 flex items-center">
        {/* Back button — pinned to far-left edge (hidden on main dashboards) */}
        {!hideBack && (
          <button
            data-testid="back-button"
            onClick={() => navigate(goBack)}
            className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
        )}

        {/* Logo + Title */}
        <div className="flex items-center gap-3 ml-3 min-w-0">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} weight="duotone" className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">{title || 'AcadMix'}</h1>
            {subtitle && (
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: action buttons + notification bell + theme toggle + logout */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {rightContent}

          {/* Notification Bell */}
          {!hideNotifications && (
            <div className="relative">
              <button
                data-testid="notification-bell"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell size={20} weight={showNotifications ? "fill" : "duotone"} />
                {unreadCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="fixed top-14 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden"
                    >
                      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Notifications</h4>
                        <button onClick={handleMarkAllRead} className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">Mark all read</button>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-white/5">
                        {notifications.length === 0 ? (
                          <div className="px-5 py-8 text-center text-sm text-slate-400">No notifications yet</div>
                        ) : notifications.map((item) => (
                          <div key={item.id} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!item.is_read ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${item.type === 'placement' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-blue-50 dark:bg-blue-500/15'}`}>
                              {item.type === 'placement' ? <Briefcase size={14} weight="duotone" className="text-emerald-500" /> : <Info size={14} weight="duotone" className="text-blue-500" />}
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
          )}

          {/* Logout icon — pinned to far-right edge */}
          {onLogout && (
            <button
              data-testid="logout-button"
              onClick={onLogout}
              className="p-2.5 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 transition-colors"
              aria-label="Sign out"
            >
              <SignOut size={20} weight="duotone" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
