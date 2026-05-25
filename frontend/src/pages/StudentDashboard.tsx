import React, { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import { useQuery } from '@tanstack/react-query';
import UserProfileModal from '../components/UserProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Trophy, ChartLine, Fire, BookOpen, Calendar, Target, SignOut, Terminal, ArrowRight, GraduationCap, Play, Medal, Lightning, Warning, Bell, Exam, Briefcase, Sun, Moon, CalendarDots, Chalkboard, UserCircle, ListBullets, Microphone, House, FileText, Toolbox, Bus, MapPin, Cpu } from '@phosphor-icons/react';
import { analyticsAPI, interviewAPI, resumeAPI, notificationsAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';

import { searchEmptyAnimation, sleepAnimation } from '../assets/lottieAnimations';
import StudentAttendance from '../components/student/StudentAttendance';
import StudentCIAMarks from '../components/student/StudentCIAMarks';
import StudentTimetable from '../components/student/StudentTimetable';

import StudentAcademicCalendar from '../components/student/StudentAcademicCalendar';
import StudentSubjects from '../components/student/StudentSubjects';
import FeePaymentModule from '../components/student/FeePaymentModule';
import StudentTransport from '../components/student/StudentTransport';
import { useIsModuleVisible } from '../hooks/useCollegeModules';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const getCollegeDisplayName = (user: any) => {
  if (user?.college) return user.college;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const tenant = host.endsWith('.localhost') ? host.replace('.localhost', '') : host.split('.')[0];
  if (tenant === 'aits') return 'AITS';
  return tenant && tenant !== 'localhost' && tenant !== '127' ? tenant.toUpperCase() : 'AcadMix';
};

// Lazy load heavy components
const WeakTopicsChart = React.lazy(() => import('../components/student/WeakTopicsChart'));
const LazyLottie = React.lazy(() => import('../components/LazyLottie'));
const CampusMap = React.lazy(() => import('../components/campus/CampusMap'));

/* ── Time-ago helper ──────────────────────────────────── */
const timeAgo = (ts) => {
  if (!ts) return '';
  const parsedTs = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
  const diff = Date.now() - new Date(parsedTs).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ── Deadline helper ──────────────────────────────────── */
const getDeadlineInfo = (quiz) => {
  const end = quiz.end_date || quiz.deadline;
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  if (diff < 0) return { text: 'Expired', urgent: true };
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return { text: `${hrs}h left`, urgent: true };
  const days = Math.floor(hrs / 24);
  return { text: `${days}d left`, urgent: days <= 2 };
};



/* ── Framer Motion Variants ─────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 }, willChange: 'transform, opacity' }
};

const cardHover = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 17 }
};

const StudentDashboard = ({ navigate, user, onLogout }: any) => {
  const isHostelVisible = useIsModuleVisible("hostel");
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('student_tab') || 'overview');
  useEffect(() => { sessionStorage.setItem('student_tab', activeTab); }, [activeTab]);
  const { data: dashboard = null, isLoading: loading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => analyticsAPI.studentDashboard().then(r => r.data),
  });
  const { data: interviewQuota = null } = useQuery({
    queryKey: ['student-interview-quota'],
    queryFn: () => interviewAPI.getQuota().then(r => r.data),
  });
  const { data: latestAtsScoreData = null } = useQuery({
    queryKey: ['student-latest-ats'],
    queryFn: () => resumeAPI.latest().then(r => r.data),
  });
  const latestAtsScore = latestAtsScoreData?.ats_score ?? null;
  const [showNotifications, setShowNotifications] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();
  const [realNotifs, setRealNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isEceStudent = ['ECE', 'ET', 'EEE', 'EIE', 'IOT'].includes(String(user?.department || '').toUpperCase());

  // Fetch real notifications from API
  useEffect(() => {
    const fetchNotifs = () => {
      notificationsAPI.getAll({ limit: 10 }).then(res => {
        setRealNotifs(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 300000); // 5 minutes fallback
    return () => clearInterval(interval);
  }, []);

  // WebSocket for instant notifications
  useEffect(() => {
    const wsBase = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace(/^http/, 'ws');
    let ws: any;
    let reconnectTimer: any;
    const connect = () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        ws = new WebSocket(`${wsBase}/ws/notifications?token=${token}`);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification') {
              setRealNotifs(prev => [{
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
        ws.onclose = () => { reconnectTimer = setTimeout(connect, 5000); };
        ws.onerror = () => { ws.close(); };
      } catch (_) {}
    };
    connect();
    return () => { clearTimeout(reconnectTimer); if (ws) { ws.onclose = null; ws.close(); } };
  }, []);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleMarkAllRead = () => {
    notificationsAPI.markAllRead().then(() => {
      setUnreadCount(0);
      setRealNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setShowNotifications(false);
    }).catch(() => {});
  };

  // Tab badge (dot) state — persisted per user in localStorage
  const badgeKey = useCallback((tab) => `acadmix_tab_seen_${tab}_${user?.id || 'default'}`, [user?.id]);
  const [seenTabs, setSeenTabs] = useState(() => ({
    quizzes: localStorage.getItem(badgeKey('quizzes')) === 'true',
    fees: localStorage.getItem(badgeKey('fees')) === 'true',
  }));

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'quizzes' || tabId === 'fees') {
      setSeenTabs(prev => ({ ...prev, [tabId]: true }));
      localStorage.setItem(badgeKey(tabId), 'true');
    }
  };

  // Reset badge when new data arrives (active quizzes change)
  useEffect(() => {
    if (!dashboard) return;
    const quizCount = dashboard.upcoming_quizzes?.length || 0;
    const storedQuizCount = localStorage.getItem(`acadmix_quiz_count_${user?.id || 'default'}`);
    if (storedQuizCount !== String(quizCount)) {
      setSeenTabs(prev => ({ ...prev, quizzes: false }));
      localStorage.setItem(badgeKey('quizzes'), 'false');
      localStorage.setItem(`acadmix_quiz_count_${user?.id || 'default'}`, String(quizCount));
    }
  }, [dashboard, badgeKey, user?.id]);

  // Badge visibility: show dot if tab has content AND hasn't been seen
  const showQuizBadge = !seenTabs.quizzes && (dashboard?.upcoming_quizzes?.length > 0 || dashboard?.in_progress?.length > 0);
  const showFeesBadge = !seenTabs.fees && (dashboard?.pending_fees > 0 || dashboard?.fee_due);

  // Data fetching is now handled by useQuery hooks above (lines 80-91).
  // React Query caches responses so tab switches and page revisits are instant.

  const quizzesTaken = dashboard?.total_quizzes || 0;
  const activeQuizzes = dashboard?.upcoming_quizzes?.length || 0;
  const avgScore = dashboard?.avg_score ? `${dashboard.avg_score}%` : '-';

  const stats = [
    { label: 'Campus Drives', value: dashboard?.active_drives || 0, sub: 'open for applications', icon: Briefcase, color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400', gradient: 'from-purple-500 to-fuchsia-500', onClick: () => navigate('placements') },
    { label: 'Interview Prep', value: interviewQuota?.used || 0, sub: 'sessions this month', icon: Microphone, color: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400', gradient: 'from-teal-500 to-cyan-500', onClick: () => navigate('interview-warroom') },
    { label: 'Resume Score', value: latestAtsScore != null ? latestAtsScore : '—', sub: 'ATS compatibility', icon: FileText, color: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', gradient: 'from-cyan-500 to-blue-500', onClick: () => navigate('resume-ats-scorer') },
  ];

  /* ── Skeleton screen while loading ─────────────────────── */
  if (loading) return <DashboardSkeleton variant="student" />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Notification overlay */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)}></div>
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Notifications</h4>
                <button onClick={handleMarkAllRead} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-white/5">
                {realNotifs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No new notifications.</div>
                ) : (
                  realNotifs.slice(0, 8).map((n, i) => (
                    <div key={n.id || i} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        n.type === 'placement' ? 'bg-indigo-50 dark:bg-indigo-500/15' : 'bg-emerald-50 dark:bg-emerald-500/15'
                      }`}>
                        {n.type === 'placement' ? (
                          <Briefcase size={14} weight="duotone" className="text-indigo-500" />
                        ) : (
                          <Bell size={14} weight="duotone" className="text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{n.title}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Header ──────────────────────────── */}
      <DashboardHeader 
        user={user} 
        title="Student Dashboard" 
        onLogout={onLogout} 
        setShowProfile={() => {}} 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Hero Greeting + CGPA ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
        >
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">{getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}!</span></h2>
            <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">
              {getCollegeDisplayName(user)} • {user?.department || 'DS'} • Batch {user?.batch || '2026'} • Section {user?.section || 'A'}
            </p>
          </div>
          <motion.div whileHover={cardHover} className="soft-card px-4 py-4 flex items-center gap-4 w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.75rem)] md:w-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0">
              <Trophy size={20} weight="fill" className="text-white sm:hidden" />
              <Trophy size={24} weight="fill" className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">CGPA</p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{dashboard?.cgpa > 0 ? dashboard.cgpa.toFixed(1) : 'N/A'} <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">/ 10</span></p>
            </div>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl mb-8 hide-scrollbar">
            {[
              { id: 'overview', label: 'Overview' }, 
              { id: 'quizzes', label: 'Quizzes' },
              { id: 'attendance', label: 'Attendance' },
              { id: 'cia-marks', label: 'CIA Marks' },
              { id: 'timetable', label: 'Timetable' },
              { id: 'subjects', label: 'Subjects' },
              { id: 'calendar', label: 'Calendar' },
              { id: 'fees', label: 'Fees & Payments' },
            ].map(tab => {
              const hasBadge = (tab.id === 'quizzes' && showQuizBadge) || (tab.id === 'fees' && showFeesBadge);
              return (
              <button 
                key={tab.id} 
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border border-transparent relative ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shadow-sm dark:border-indigo-500/25' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
                }`}
              >
                {tab.label}
                {hasBadge && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                )}
              </button>
              );
            })}
          </div>

        {activeTab === 'overview' && (
          <motion.div data-testid="overview-content" variants={containerVariants} initial="hidden" animate="show">
        {/* ── Stat Cards ───────────────── */}
        {stats.length > 0 && (
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={cardHover}
                onClick={stat.onClick || undefined}
                className={`soft-card-hover p-4 sm:p-6 relative overflow-hidden group text-left ${stat.onClick ? 'cursor-pointer' : ''}`}
                data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{stat.label}</span>
                  <div className={`${stat.color} p-2 sm:p-2.5 rounded-xl`}><Icon size={18} weight="duotone" /></div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{stat.sub}</p>
                {stat.onClick && <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">View all <ArrowRight size={10} weight="bold" /></p>}
              </motion.div>
            );
          })}
        </motion.div>
        )}

        {/* ── Quick Access — Academics & Tools ─────────────── */}
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Academics & Tools</h3>
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6"
        >
          {[
            isEceStudent ? { id: 'hardware-arena', icon: Cpu, label: 'ECE Lab', sub: 'Core placement tools', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20', iconText: 'text-emerald-500', testId: 'view-ece-lab-button' } : null,
            { id: 'quiz-results', icon: BookOpen, label: 'Quiz Results', sub: 'View all attempts', iconBg: 'bg-indigo-50 dark:bg-indigo-500/10 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20', iconText: 'text-indigo-500', testId: 'view-all-quizzes-button' },
            { id: 'semester-results', icon: Calendar, label: 'Semester Results', sub: 'Check your grades', iconBg: 'bg-teal-50 dark:bg-teal-500/10 group-hover:bg-teal-100 dark:group-hover:bg-teal-500/20', iconText: 'text-teal-500', testId: 'view-semester-results-button' },
            { id: 'analytics', icon: ChartLine, label: 'Analytics', sub: 'Track performance', iconBg: 'bg-amber-50 dark:bg-amber-500/10 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20', iconText: 'text-amber-500', testId: 'view-analytics-button' },
            { id: 'code-playground', icon: Terminal, label: 'Code Playground', sub: 'Practice coding', iconBg: 'bg-purple-50 dark:bg-purple-500/10 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20', iconText: 'text-purple-500', testId: 'view-code-playground-button' },
            { id: 'career-toolkit', icon: Toolbox, label: 'Career Toolkit', sub: '10 AI career tools', iconBg: 'bg-cyan-50 dark:bg-cyan-500/10 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-500/20', iconText: 'text-cyan-500', testId: 'view-career-toolkit-button' },
          ].filter(Boolean).map((item: any) => {
            const Icon = item.icon;
            return (
              <motion.button key={item.id} variants={itemVariants} whileHover={cardHover} whileTap={{ scale: 0.97 }}
                data-testid={item.testId} onClick={() => navigate(item.id)}
                className="soft-card-hover p-4 sm:p-5 text-left flex items-center gap-3 group"
              >
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${item.iconBg}`}>
                  <Icon size={20} weight="duotone" className={item.iconText} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{item.label}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{item.sub}</p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Quick Access — Campus Life ───────────────── */}
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Campus Life</h3>
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          {[
            isHostelVisible ? { id: 'hostel-booking', icon: House, label: 'Hostel Booking', sub: 'Book your bed', iconBg: 'bg-pink-50 dark:bg-pink-500/10 group-hover:bg-pink-100 dark:group-hover:bg-pink-500/20', iconText: 'text-pink-500', testId: 'view-hostel-booking-button' } : null,
            { id: 'transport', label: 'Bus Tracker', sub: 'Track your bus', icon: Bus, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20', iconText: 'text-emerald-500', testId: 'view-transport-button', isTab: true },
            { id: 'campus-map', label: 'Campus Map', sub: 'Pin events on map', icon: MapPin, iconBg: 'bg-rose-50 dark:bg-rose-500/10 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20', iconText: 'text-rose-500', testId: 'view-campus-map-button', isTab: true, tabId: 'campus' },
          ].filter(Boolean).map((item: any) => {
            const Icon = item.icon;
            return (
              <motion.button key={item.id} variants={itemVariants} whileHover={cardHover} whileTap={{ scale: 0.97 }}
                data-testid={item.testId} onClick={() => item.isTab ? handleTabChange(item.tabId || item.id) : navigate(item.id)}
                className="soft-card-hover p-4 sm:p-5 text-left flex items-center gap-3 group"
              >
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${item.iconBg}`}>
                  <Icon size={20} weight="duotone" className={item.iconText} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{item.label}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{item.sub}</p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Continue Where You Left Off ──────────────── */}
        <AnimatePresence>
          {dashboard?.in_progress?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="mb-6 sm:mb-8"
            >
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white mb-4">Continue Where You Left Off</h3>
              <div className="space-y-3">
                {dashboard.in_progress.map((attempt) => (
                  <motion.div key={attempt.id} whileHover={{ x: 4 }} className="soft-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-amber-400">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                        <Play size={20} weight="fill" className="text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{attempt.quiz_title || 'Untitled Quiz'}</h4>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                          {attempt.quiz_subject} • {(attempt.answers || []).filter(a => a !== null).length}/{attempt.total_questions} answered
                        </p>
                      </div>
                    </div>
                    <button
                      data-testid={`resume-quiz-${attempt.quiz_id}`}
                      onClick={() => navigate('quiz-attempt', { id: attempt.quiz_id, title: attempt.quiz_title })}
                      className="btn-primary !px-5 !py-2.5 text-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                      Resume <ArrowRight size={16} weight="bold" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bottom Grid: Topic Mastery + Activity + Leaderboard ── */}
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          {/* Topic Mastery */}
          <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Warning size={20} weight="duotone" className="text-amber-500" />
              <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Topic Mastery</h3>
            </div>
            {dashboard?.weak_topics?.length > 0 ? (
              <>
                <div className="h-48 sm:h-52 mb-4">
                  <React.Suspense fallback={<div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold bg-slate-50 dark:bg-[#1A202C]/50 rounded-xl animate-pulse">Loading Chart...</div>}>
                    <WeakTopicsChart data={dashboard.weak_topics} isDark={isDark} />
                  </React.Suspense>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500"></span>Needs Work</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span>Average</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>Strong</span>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-3">
                  <React.Suspense fallback={<div className="w-full h-full rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/10 animate-pulse"></div>}>
                    <LazyLottie animationData={searchEmptyAnimation} loop autoplay />
                  </React.Suspense>
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Take some quizzes first</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Topic analysis will appear after completing quizzes</p>
                <button onClick={() => navigate('available-quizzes')} className="mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 mx-auto">Take a quiz <ArrowRight size={10} weight="bold" /></button>
              </div>
            )}
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lightning size={20} weight="duotone" className="text-indigo-500" />
              <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Recent Activity</h3>
            </div>
            {dashboard?.activity?.length > 0 ? (
              <div className="space-y-1">
                {dashboard.activity.slice(0, 6).map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === 'quiz_result' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-indigo-50 dark:bg-indigo-500/15'
                    }`}>
                      {item.type === 'quiz_result' ? (
                        <Exam size={16} weight="duotone" className="text-emerald-500" />
                      ) : (
                        <Bell size={16} weight="duotone" className="text-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 pr-2">
                        {item.subtitle && <span>{item.subtitle} <span className="mx-1 text-slate-400 dark:text-slate-500">•</span></span>}
                        <span className="whitespace-nowrap">{timeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                    {item.score !== undefined && (
                      <span className={`text-sm font-extrabold flex-shrink-0 ${
                        item.score >= 60 ? 'text-emerald-600' : item.score >= 40 ? 'text-amber-600' : 'text-red-600'
                      }`}>{item.score?.toFixed(0)}%</span>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-3">
                  <React.Suspense fallback={<div className="w-full h-full rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 animate-pulse"></div>}>
                    <LazyLottie animationData={sleepAnimation} loop autoplay />
                  </React.Suspense>
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No activity yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Your quiz activity will show up here</p>
                <button onClick={() => navigate('available-quizzes')} className="mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 mx-auto">Get started <ArrowRight size={10} weight="bold" /></button>
              </div>
            )}
          </motion.div>

          {/* Leaderboard CTA */}
          <motion.div variants={itemVariants} whileHover={cardHover}
            className="soft-card-hover p-5 sm:p-6 bg-gradient-to-br from-indigo-500/80 to-purple-600/80 dark:from-indigo-600/30 dark:to-purple-700/30 !border-transparent dark:!border-indigo-500/20 text-white flex flex-col justify-between transition-all duration-300"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Trophy size={28} weight="duotone" />
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl">Leaderboard</h3>
                  <p className="text-xs sm:text-sm font-medium text-white/70">See where you stand</p>
                </div>
              </div>
              {dashboard?.rank && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/70">Your Position</p>
                      <p className="text-4xl font-extrabold">#{dashboard.rank}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white/70">Total Students</p>
                      <p className="text-2xl font-extrabold">{dashboard.total_students}</p>
                    </div>
                  </div>
                  {dashboard.rank <= 3 && (
                    <div className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-300">
                      <Trophy size={16} weight="fill" />
                      {dashboard.rank === 1 ? 'You\'re #1! 🏆' : dashboard.rank === 2 ? 'Almost there! 🥈' : 'Top 3! 🥉'}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button data-testid="view-leaderboard-button" onClick={() => navigate('leaderboard')} className="w-full py-3 bg-white/20 backdrop-blur-sm rounded-xl font-bold text-sm hover:bg-white/30 transition-colors mt-auto">
              View Full Leaderboard
            </button>
          </motion.div>
        </motion.div>
        </motion.div>
        )}

        {activeTab === 'quizzes' && (
          <motion.div data-testid="quizzes-content" variants={containerVariants} initial="hidden" animate="show">
            {/* Stats row */}
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 sm:gap-5 mb-6">
              <div className="soft-card p-4 sm:p-5 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Avg Score</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{avgScore}</p>
              </div>
              <div className="soft-card p-4 sm:p-5 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Quizzes Taken</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{quizzesTaken}</p>
              </div>
              <div className="soft-card p-4 sm:p-5 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Active</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">{activeQuizzes}</p>
              </div>
            </motion.div>

            {/* Quick actions */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <motion.button whileHover={cardHover} onClick={() => navigate('quiz-results')} className="soft-card-hover p-4 flex items-center justify-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center"><BookOpen size={20} weight="duotone" className="text-indigo-500" /></div>
                <div><p className="font-bold text-sm text-slate-900 dark:text-white">Past Results</p><p className="text-xs text-slate-500">View attempts</p></div>
              </motion.button>
              <motion.button whileHover={cardHover} onClick={() => navigate('analytics')} className="soft-card-hover p-4 flex items-center justify-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center"><ChartLine size={20} weight="duotone" className="text-amber-500" /></div>
                <div><p className="font-bold text-sm text-slate-900 dark:text-white">Analytics</p><p className="text-xs text-slate-500">Performance trends</p></div>
              </motion.button>
            </motion.div>

            {/* Continue in progress */}
            {dashboard?.in_progress?.length > 0 && (
              <motion.div variants={itemVariants} className="mb-6">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-3">Continue Where You Left Off</h3>
                <div className="space-y-3">
                  {dashboard.in_progress.map((attempt) => (
                    <motion.div key={attempt.id} whileHover={{ x: 4 }} className="soft-card p-4 flex items-center justify-between gap-3 border-l-4 border-amber-400">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0"><Play size={18} weight="fill" className="text-amber-500" /></div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{attempt.quiz_title || 'Untitled Quiz'}</p>
                          <p className="text-xs text-slate-500">{attempt.quiz_subject} · {(attempt.answers || []).filter(a => a !== null).length}/{attempt.total_questions} answered</p>
                        </div>
                      </div>
                      <button onClick={() => navigate('quiz-attempt', { id: attempt.quiz_id, title: attempt.quiz_title })} className="btn-primary !px-4 !py-2 text-sm flex items-center gap-1.5 flex-shrink-0">Resume <ArrowRight size={14} weight="bold" /></button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Available quizzes list */}
            <motion.div variants={itemVariants} className="soft-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Available Quizzes</h3>
                <span className="text-xs font-bold text-slate-500">{activeQuizzes} available</span>
              </div>
              <div className="space-y-2">
                {(dashboard?.upcoming_quizzes || []).map((q, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => navigate('quiz-attempt', { id: q.id, title: q.title })}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${q.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{q.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{q.duration_minutes || q.duration || '--'} min · {q.total_marks || '--'} marks · {q.type || 'mcq'}</p>
                    </div>
                    <ArrowRight size={14} weight="bold" className="text-slate-400 flex-shrink-0" />
                  </div>
                ))}
                {(!dashboard?.upcoming_quizzes || dashboard.upcoming_quizzes.length === 0) && (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3"><Exam size={22} weight="duotone" className="text-slate-400" /></div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No quizzes available right now</p>
                    <p className="text-xs text-slate-400 mt-1">Check back later or view your past results</p>
                  </div>
                )}
              </div>
              {dashboard?.upcoming_quizzes?.length > 0 && (
                <button onClick={() => navigate('available-quizzes')} className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-white/5 text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1">
                  View all quizzes <ArrowRight size={12} weight="bold" />
                </button>
              )}
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'attendance' && <StudentAttendance />}

        {activeTab === 'cia-marks' && <StudentCIAMarks />}

        {activeTab === 'timetable' && <StudentTimetable />}

        {activeTab === 'subjects' && <StudentSubjects />}

        {activeTab === 'calendar' && <StudentAcademicCalendar />}

        {activeTab === 'transport' && <StudentTransport />}

        {activeTab === 'campus' && (
          <React.Suspense fallback={<div style={{display:'flex',justifyContent:'center',padding:32}}><div style={{width:32,height:32,border:'3px solid #6366f1',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/></div>}>
            <CampusMap user={user} navigate={navigate} />
          </React.Suspense>
        )}

        {activeTab === 'fees' && <FeePaymentModule user={user} />}




      </div>
    </div>
  );
};

export default StudentDashboard;

