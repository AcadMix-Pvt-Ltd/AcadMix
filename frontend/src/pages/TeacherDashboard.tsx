import React, { useState, useEffect } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, NotePencil, ChartLine, Users, Eye, SignOut, Clipboard, Calendar, CalendarDots, PencilLine, Bell, GraduationCap, ArrowRight, Exam, Fire, Sun, Moon, Notebook, UserCircle, Sparkle, Trash, MapPin } from '@phosphor-icons/react';
import { analyticsAPI, insightsAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import FacultyExpertSubmissions from '../components/faculty/FacultyExpertSubmissions';
import AttendanceMarker from '../components/faculty/AttendanceMarker';
import TimetableGrid from '../components/shared/TimetableGrid';
import FacultyCIAMarks from '../components/faculty/FacultyCIAMarks';
import AcademicCalendar from '../components/shared/AcademicCalendar';
import FacultyLeaveManager from '../components/faculty/FacultyLeaveManager';
import FacultyMenteeList from '../components/faculty/FacultyMenteeList';
import FacultyAnnouncements from '../components/faculty/FacultyAnnouncements';
import InsightsChat from '../components/insights/InsightsChat';
import InsightsCanvas from '../components/insights/InsightsCanvas';
import FacultyCourseSetup from '../components/faculty/FacultyCourseSetup';
import FacultyCourseMaterials from '../components/faculty/FacultyCourseMaterials';
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

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const timeAgo = (ts) => {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const TeacherDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('teacher_tab') || 'overview');
  const [isOutcomesDirty, setIsOutcomesDirty] = useState(false);

  const handleTabChange = (targetTab) => {
    if (activeTab === 'outcomes' && isOutcomesDirty) {
      if (!window.confirm("You have unsaved changes to your CO/PO matrix. Leave without saving?")) {
        return;
      }
      setIsOutcomesDirty(false);
    }
    setActiveTab(targetTab);
  };
  
  useEffect(() => { sessionStorage.setItem('teacher_tab', activeTab); }, [activeTab]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { isDark, toggle: toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [teachingMode, setTeachingMode] = useState('plan');
  const notifKey = `acadmix_notif_read_${user?.id || 'default'}`;
  const [notifRead, setNotifReadState] = useState(() => localStorage.getItem(notifKey) === 'true');
  const setNotifRead = (val) => { setNotifReadState(val); localStorage.setItem(notifKey, String(val)); };

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
    const fetchDashboard = async () => {
      try {
        const { data } = await analyticsAPI.teacherDashboard();
        setDashboardData(data);
      } catch (err) { console.error('Failed to load teacher dashboard:', err); }
      setLoading(false);
      setInitialLoading(false);
    };
    fetchDashboard();
  }, []);

  const myQuizzes = (dashboardData?.quizzes || []);
  const totalQuizzes = myQuizzes.length;
  const activeQuizzes = myQuizzes.filter(q => q.status === 'active').length;

  const recentActivity = (dashboardData?.recent_submissions || []).slice(0, 8).map((r, i) => ({
    type: 'submission',
    title: r.student_name || 'Student',
    subtitle: `Submitted – ${r.quiz_title || r.quiz_subject || 'Quiz'}`,
    timestamp: r.submitted_at,
    score: r.percentage,
  }));

  const stats = [];

  if (initialLoading) return <DashboardSkeleton variant="teacher" />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Notification overlay */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)}></motion.div>
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 dark:bg-[#1A202C] dark:border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Recent Activity</h4>
                <button
                  onClick={() => { setNotifRead(true); setShowNotifications(false); }}
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-white/[0.04]">
                {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 bg-emerald-50 dark:bg-emerald-500/15">
                      <Exam size={14} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{item.title}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{item.subtitle} • {timeAgo(item.timestamp)}</p>
                    </div>
                    {item.score !== undefined && item.score !== null && (
                      <span className={`text-sm font-extrabold flex-shrink-0 ${
                        item.score >= 60 ? 'text-emerald-500' : item.score >= 40 ? 'text-amber-500' : 'text-red-500'
                      }`}>{item.score?.toFixed(0)}%</span>
                    )}
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-slate-400">No recent submissions</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DashboardHeader 
        user={user} 
        title="Teacher Dashboard" 
        onLogout={onLogout} 
        onProfileClick={() => navigate('faculty-profile')} 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Hero Greeting ───────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ').pop() || 'Faculty'}!</span>
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">
            {user?.designation || 'Assistant Professor'}
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 p-1 bg-slate-100/80 dark:bg-white/[0.04] rounded-xl mb-8 hide-scrollbar backdrop-blur-sm border border-slate-200/50 dark:border-white/[0.06]">
            {[
              { id: 'overview', label: 'Overview' }, 
              { id: 'timetable', label: 'Timetable' },
              { id: 'attendance', label: 'Attendance' },
              { id: 'teaching', label: 'Teaching Work' },
              { id: 'cia', label: 'CIA Marks' },
              { id: 'outcomes', label: 'Course Setup' },
              { id: 'materials', label: 'Materials' },
              { id: 'mentees', label: 'Mentees' },
              { id: 'leave', label: 'Leave' },
              { id: 'calendar', label: 'Calendar' },
              { id: 'announcements', label: 'Noticeboard' },
              { id: 'expert', label: 'Expert Module' },
              { id: 'insights', label: 'AI Insights' },
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 justify-center min-w-max flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/60 dark:border-emerald-500/20"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        {activeTab === 'overview' && (
          <motion.div data-testid="overview-content" variants={containerVariants} initial="hidden" animate="show">


        {/* ── Quick Actions ────────────────────────── */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[
            { id: 'quiz-builder', icon: NotePencil, label: 'Create Quiz', sub: 'Build from scratch', colorBg: 'bg-indigo-50 dark:bg-indigo-500/15 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/25', colorText: 'text-indigo-500 dark:text-indigo-400', testId: 'create-quiz-button' },
            { id: 'class-results', icon: ChartLine, label: 'View Results', sub: 'Class-wise analytics', colorBg: 'bg-sky-50 dark:bg-sky-500/15 group-hover:bg-sky-100 dark:group-hover:bg-sky-500/25', colorText: 'text-sky-500 dark:text-sky-400', testId: 'view-all-results-button' },
            { id: 'student-management', icon: Users, label: 'Students', sub: 'Manage enrollment', colorBg: 'bg-amber-50 dark:bg-amber-500/15 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/25', colorText: 'text-amber-500 dark:text-amber-400', testId: 'manage-students-button' },
            { id: 'quiz-calendar', icon: CalendarDots, label: 'Calendar', sub: 'Quiz schedule', colorBg: 'bg-emerald-50 dark:bg-emerald-500/15 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/25', colorText: 'text-emerald-500 dark:text-emerald-400', testId: 'quiz-calendar-button' },
            { id: 'campus', icon: MapPin, label: 'Campus Map', sub: 'Live infrastructure', colorBg: 'bg-rose-50 dark:bg-rose-500/15 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/25', colorText: 'text-rose-500 dark:text-rose-400', testId: 'campus-map-button', isTab: true },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button variants={itemVariants} whileHover={cardHover} key={item.id} data-testid={item.testId} onClick={() => item.isTab ? setActiveTab(item.id) : navigate(item.id)}
                className="soft-card-hover p-4 sm:p-6 text-left flex items-center gap-3 sm:gap-4 group">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${item.colorBg}`}>
                  <Icon size={22} weight="duotone" className={item.colorText} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">{item.label}</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 truncate">{item.sub}</p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Activity Feed + Quizzes ─────────── */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Recent Submissions */}
          <motion.div variants={itemVariants} className="lg:col-span-3 soft-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Recent Submissions</h3>
              <button onClick={() => navigate('teacher-quizzes')} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                View all <ArrowRight size={12} weight="bold" />
              </button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 dark:bg-emerald-500/15">
                    <Exam size={14} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">{item.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.score !== undefined && item.score !== null && (
                      <span className={`text-sm font-extrabold ${
                        item.score >= 60 ? 'text-emerald-500' : item.score >= 40 ? 'text-amber-500' : 'text-red-500'
                      }`}>{item.score?.toFixed(0)}%</span>
                    )}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{timeAgo(item.timestamp)}</span>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <Clipboard size={22} weight="duotone" className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No submissions yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create a quiz to get started</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quizzes Card — consolidated */}
          <motion.div variants={itemVariants} className="lg:col-span-2 soft-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Quizzes</h3>
              <button onClick={() => navigate('teacher-quizzes')} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                Manage <ArrowRight size={12} weight="bold" />
              </button>
            </div>
            {/* Quick stats row */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-center">
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{activeQuizzes}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 dark:text-emerald-400/60 mt-0.5">Active</p>
              </div>
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3 text-center">
                <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{totalQuizzes}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/70 dark:text-indigo-400/60 mt-0.5">Total</p>
              </div>
            </div>
            {/* Quiz list */}
            <div className="space-y-2">
              {myQuizzes.slice(0, 5).map((q, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => navigate('teacher-quizzes')}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    q.status === 'active' ? 'bg-emerald-500' : q.status === 'scheduled' ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{q.title}</p>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 capitalize">{q.subject} · {q.status}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-xl ${
                    q.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                    q.status === 'scheduled' ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>{q.attempt_count || 0} attempts</span>
                </div>
              ))}
              {myQuizzes.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No quizzes yet</p>
                  <button onClick={() => navigate('quiz-builder')} className="mt-2 text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">Create your first quiz →</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
          </motion.div>
        )}

        {activeTab === 'attendance' && (
          <motion.div data-testid="attendance-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <AttendanceMarker user={user} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'timetable' && (
          <motion.div data-testid="timetable-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <TimetableGrid mode="view" />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'teaching' && (
          <motion.div data-testid="teaching-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants} className="mb-4">
              <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/50 dark:border-white/[0.06] rounded-xl p-1 shadow-sm w-fit">
                <button onClick={() => setTeachingMode('plan')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                    teachingMode === 'plan' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/60 dark:border-emerald-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                  }`}>
                  <Notebook size={14} weight="duotone" /> Teaching Plan
                </button>
                <button onClick={() => setTeachingMode('record')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                    teachingMode === 'record' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/60 dark:border-emerald-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                  }`}>
                  <PencilLine size={14} weight="duotone" /> Class Record
                </button>
              </div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <TimetableGrid mode={teachingMode} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'cia' && (
          <motion.div data-testid="cia-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <FacultyCIAMarks navigate={navigate} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'outcomes' && (
          <motion.div data-testid="outcomes-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <FacultyCourseSetup onDirtyChange={(dirty) => setIsOutcomesDirty(dirty)} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'materials' && (
          <motion.div data-testid="materials-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <FacultyCourseMaterials />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'calendar' && (
          <motion.div data-testid="calendar-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <AcademicCalendar />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'leave' && (
          <motion.div data-testid="leave-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <FacultyLeaveManager />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'mentees' && (
          <motion.div data-testid="mentees-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <FacultyMenteeList />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'announcements' && (
          <motion.div data-testid="announcements-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <FacultyAnnouncements />
            </motion.div>
          </motion.div>
        )}


        {activeTab === 'expert' && (
          <motion.div data-testid="expert-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <FacultyExpertSubmissions />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'insights' && (
          <motion.div data-testid="insights-content" variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
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

        {activeTab === 'campus' && (
          <motion.div data-testid="campus-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <CampusMap />
            </motion.div>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default TeacherDashboard;

