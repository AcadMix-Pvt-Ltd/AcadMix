import React, { useState, useEffect } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Users, ChartBar, GraduationCap, SignOut, Database, Sun, Moon, Bell, Info, UserCircle, Sparkle, Trash, MapPin, Buildings } from '@phosphor-icons/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StudentResultsSearch } from '../components/StudentResultsSearch';
import { analyticsAPI, insightsAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import AdminExpertManagement from '../components/admin/AdminExpertManagement';
import { Toaster, toast } from 'sonner';

import UserPermissionsManager from '../components/admin/UserPermissionsManager';
import CIATemplateBuilder from '../components/admin/CIATemplateBuilder';
import AdminFinanceModule from '../components/admin/AdminFinanceModule';
import HRPayrollModule from '../components/admin/HRPayrollModule';
import InsightsChat from '../components/insights/InsightsChat';
import InsightsCanvas from '../components/insights/InsightsCanvas';
import CampusLayoutDesigner from '../components/campus/CampusLayoutDesigner';
import CampusMap from '../components/campus/CampusMap';
import TimetableSettings from '../components/admin/TimetableSettings';

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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl dark:bg-[#1A202C] p-3 shadow-lg border border-slate-100 dark:border-slate-700">
        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{label}</p>
        {payload.map((p, i) => (<p key={i} className="text-sm font-medium" style={{ color: p.color }}>{p.name}: {p.value}</p>))}
      </div>
    );
  }
  return null;
};

const COMMAND_MODULES = [
  { id: 'admissions', name: 'Admissions CRM', status: 'beta', accent: 'bg-cyan-50 text-cyan-600', route: null, work: 'Enquiries, applications, document checks' },
  { id: 'student_lifecycle', name: 'Student Lifecycle', status: 'production', accent: 'bg-indigo-50 text-indigo-600', route: 'user-management', work: 'Profiles, batches, sections, certificates' },
  { id: 'academics', name: 'Academics', status: 'production', accent: 'bg-emerald-50 text-emerald-600', route: null, work: 'Timetable, attendance, syllabus, outcomes' },
  { id: 'exams', name: 'Exams', status: 'production', accent: 'bg-violet-50 text-violet-600', route: null, work: 'CIA, hall tickets, marks, transcripts' },
  { id: 'finance', name: 'Finance', status: 'production', accent: 'bg-amber-50 text-amber-600', route: 'finance', work: 'Fees, invoices, concessions, refunds' },
  { id: 'hr-payroll', name: 'HRMS & Payroll', status: 'beta', accent: 'bg-rose-50 text-rose-600', route: 'hr-payroll', work: 'Staff, salaries, payroll, payslips' },
  { id: 'hostel', name: 'Hostel', status: 'production', accent: 'bg-pink-50 text-pink-600', route: 'hostel-booking', work: 'Rooms, beds, gatepass, mess billing' },
  { id: 'transport', name: 'Transport', status: 'production', accent: 'bg-sky-50 text-sky-600', route: 'transport-admin', work: 'Routes, passes, live trips, devices' },
  { id: 'library', name: 'Library', status: 'production', accent: 'bg-teal-50 text-teal-600', route: 'library', work: 'Catalog, issue, return, fines' },
  { id: 'inventory', name: 'Inventory & Procurement', status: 'planned', accent: 'bg-slate-100 text-slate-600', route: null, work: 'Vendors, POs, stock, assets' },
  { id: 'communication', name: 'Communication', status: 'beta', accent: 'bg-blue-50 text-blue-600', route: null, work: 'Announcements, notifications, parent messages' },
  { id: 'placement-career', name: 'Placement & Career', status: 'production', accent: 'bg-purple-50 text-purple-600', route: 'placements', work: 'Drives, ATS, interviews, company prep' },
  { id: 'alumni-industry', name: 'Alumni & Industry', status: 'beta', accent: 'bg-lime-50 text-lime-700', route: null, work: 'Mentorship, referrals, MOUs, feedback' },
  { id: 'accreditation', name: 'Accreditation', status: 'beta', accent: 'bg-orange-50 text-orange-600', route: null, work: 'NAAC, NBA, OBE, evidence' },
  { id: 'governance', name: 'Governance', status: 'beta', accent: 'bg-stone-100 text-stone-700', route: null, work: 'Approvals, audit, tasks, compliance' },
  { id: 'ami', name: 'Ami AI Layer', status: 'beta', accent: 'bg-fuchsia-50 text-fuchsia-600', route: 'insights', work: 'Read-only answers, action previews, dashboards' },
];

const AdminCommandCenter = ({ navigate, setActiveTab }) => {
  const [context, setContext] = useState<any>(null);
  const [question, setQuestion] = useState('Show ERP module coverage and pending gaps');
  const [answer, setAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminAmiAPI.contextMap().then(r => setContext(r.data)).catch(() => {});
  }, []);

  const askAmi = async () => {
    setLoading(true);
    try {
      const { data } = await insightsAPI.query({
        message: question,
        session_history: []
      });
      setAnswer(data);
      toast.success('Ami prepared a secure admin insight');
    } catch (err: any) {
      toast.error('Ami could not answer this query yet');
    }
    setLoading(false);
  };

  const openModule = (mod) => {
    if (mod.route === 'finance' || mod.route === 'hr-payroll' || mod.route === 'insights') setActiveTab(mod.route);
    else if (mod.route) navigate(mod.route);
  };

  const health = context?.health || { module_coverage: { production: 5, beta: 9, planned: 2 } };

  return (
    <motion.div data-testid="command-center-content" variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {[
          { label: 'Production Modules', value: health.module_coverage?.production || 0, sub: 'ready for daily workflows' },
          { label: 'Beta Modules', value: health.module_coverage?.beta || 0, sub: 'usable, needs depth' },
          { label: 'Planned Modules', value: health.module_coverage?.planned || 0, sub: 'next build targets' },
          { label: 'Safe Ami Actions', value: context?.safe_actions?.length || 4, sub: 'preview only, no writes' },
        ].map((s) => (
          <div key={s.label} className="soft-card p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{s.value}</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="soft-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Admin Command Center</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">One account, every college operation, with module status and safe Ami previews.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('finance')} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold">Finance</button>
            <button onClick={() => setActiveTab('hr-payroll')} className="px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-bold">HRMS</button>
            <button onClick={() => setActiveTab('insights')} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold">Ami</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {COMMAND_MODULES.map((mod) => (
            <button key={mod.id} onClick={() => openModule(mod)} className="text-left rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.accent}`}><Database size={18} weight="duotone" /></div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${mod.status === 'production' ? 'bg-emerald-50 text-emerald-600' : mod.status === 'planned' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'}`}>{mod.status}</span>
              </div>
              <p className="font-black text-slate-900 dark:text-white mt-3">{mod.name}</p>
              <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">{mod.work}</p>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 soft-card p-6">
          <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2"><Sparkle weight="fill" className="text-indigo-500" /> Ask Admin Ami</h4>
          <p className="text-xs text-slate-400 mt-1 mb-4">Read-only, tenant-scoped answers with action previews.</p>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="soft-input w-full min-h-28 text-sm" />
          <button onClick={askAmi} disabled={loading || !question.trim()} className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-black disabled:opacity-50">
            {loading ? 'Ami is checking...' : 'Ask Ami'}
          </button>
        </div>
        <div className="lg:col-span-3 soft-card p-6">
          <h4 className="font-black text-slate-900 dark:text-white mb-3">Ami Response</h4>
          {!answer ? (
            <div className="h-52 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center text-sm font-bold text-slate-400">Ask a question to see read-only admin intelligence.</div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">{answer.summary}</p>
              {answer.data?.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-white/10 max-h-80">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
                        {answer.columns?.map((col) => (
                          <th key={col} className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400 capitalize">{col.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {answer.data.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          {answer.columns?.map((col) => (
                            <td key={col} className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-300">{String(row[col] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const AdminDashboard = ({ navigate, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('admin_tab') || 'command-center');
  useEffect(() => { sessionStorage.setItem('admin_tab', activeTab); }, [activeTab]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark, toggle: toggleTheme } = useTheme();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const notifications = [
    { title: 'System Security Updated', desc: 'New schemas applied for isolated partitions.', time: 'Just now' },
    { title: 'New Registration Settings', desc: 'Sections schema applied via alembic.', time: '2 hours ago' }
  ];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await analyticsAPI.adminDashboard();
        setDashboardData(data);
      } catch (err) { console.error('Failed to load admin dashboard:', err); }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

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

  const totalStudents = dashboardData?.total_students || 0;
  const totalTeachers = (dashboardData?.total_teachers || 0) + (dashboardData?.total_hods || 0);
  const activeQuizzes = dashboardData?.active_quizzes || 0;
  const deptCount = dashboardData?.departments?.length || 0;

  const stats = [
    { label: 'Total Students', value: totalStudents.toLocaleString(), icon: Users, color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500' },
    { label: 'Total Teachers', value: totalTeachers.toLocaleString(), icon: GraduationCap, color: 'bg-emerald-50 text-emerald-500' },
    { label: 'Departments', value: deptCount.toLocaleString(), icon: Database, color: 'bg-sky-50 text-sky-500' },
  ];
  const departmentPerformance = (dashboardData?.departments || []).map(d => ({
    dept: d.name, students: d.count
  }));
  const enrollmentTrend = dashboardData?.enrollment_trend || [];

  if (loading) return <DashboardSkeleton variant="admin" />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <Toaster position="top-right" richColors />
      <DashboardHeader 
        user={user} 
        title="Admin Dashboard" 
        onLogout={onLogout} 
        onProfileClick={() => navigate('faculty-profile')} 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">College Overview</h2>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">Manage your institution's academic platform</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl mb-8 hide-scrollbar">
            {[
              { id: 'command-center', label: 'Command Center' },
              { id: 'overview', label: 'Overview' }, 
              { id: 'metrics', label: 'Metrics' },
              { id: 'student-profiles', label: 'Student Profiles' },
              { id: 'results', label: 'Student Results' },
              { id: 'finance', label: 'Fee Invoicing' },
              { id: 'hr-payroll', label: 'HR & Payroll' },
              { id: 'permissions', label: 'Permission Matrix' },
              { id: 'cia-builder', label: 'CIA Engine' },
              { id: 'experts', label: 'Expert Management' },
              { id: 'insights', label: 'AI Insights' },
              { id: 'timetable-settings', label: 'Timetable Settings' }
            ].map(tab => (
              <button 
                key={tab.id} 
                data-testid={`tab-${tab.id}`} 
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-[#1A202C] text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        {activeTab === 'overview' && (
          <motion.div data-testid="overview-content" variants={containerVariants} initial="hidden" animate="show">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div variants={itemVariants} whileHover={cardHover} key={i} className="stat-card" data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
                      <div className={`${stat.color} p-2.5 rounded-xl`}><Icon size={20} weight="duotone" /></div>
                    </div>
                    <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
              <motion.button variants={itemVariants} whileHover={cardHover} data-testid="user-management-button" onClick={() => navigate('user-management')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/15 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/30 transition-colors"><Users size={24} weight="duotone" className="text-indigo-500" /></div>
                <div><p className="font-extrabold text-slate-900 dark:text-white">Manage</p><p className="text-sm font-medium text-slate-400">Students, Faculty & Depts</p></div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={cardHover} data-testid="student-results-button" onClick={() => setActiveTab('results')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-violet-50 dark:bg-violet-500/15 rounded-xl flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-500/30 transition-colors"><GraduationCap size={24} weight="duotone" className="text-violet-500" /></div>
                <div><p className="font-extrabold text-slate-900 dark:text-white">Student Results</p><p className="text-sm font-medium text-slate-400">Search & view profiles</p></div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={cardHover} data-testid="analytics-button" onClick={() => navigate('analytics')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/15 rounded-xl flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-500/30 transition-colors"><Database size={24} weight="duotone" className="text-amber-500" /></div>
                <div><p className="font-extrabold text-slate-900 dark:text-white">Analytics</p><p className="text-sm font-medium text-slate-400">Insights & trends</p></div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={cardHover} onClick={() => setActiveTab('campus-map')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/15 rounded-xl flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-500/30 transition-colors"><MapPin size={24} weight="duotone" className="text-rose-500" /></div>
                <div><p className="font-extrabold text-slate-900 dark:text-white">Campus Map</p><p className="text-sm font-medium text-slate-400">Live infrastructure</p></div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={cardHover} onClick={() => setActiveTab('campus-layout')} className="soft-card-hover p-6 text-left flex items-center gap-4 group">
                <div className="w-12 h-12 bg-teal-50 dark:bg-teal-500/15 rounded-xl flex items-center justify-center group-hover:bg-teal-100 dark:group-hover:bg-teal-500/30 transition-colors"><Buildings size={24} weight="duotone" className="text-teal-500" /></div>
                <div><p className="font-extrabold text-slate-900 dark:text-white">Layout Designer</p><p className="text-sm font-medium text-slate-400">Edit campus map</p></div>
              </motion.button>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Department Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="dept" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />
                    <Bar dataKey="students" fill="#6366F1" radius={[8, 8, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Student Enrollment Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={enrollmentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="students" stroke="#14B8A6" strokeWidth={3} dot={{ fill: '#14B8A6', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 soft-card p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[{ action: 'New quiz created', user: 'Dr. Sarah Johnson', time: '10 mins ago' },
                    { action: '42 students completed quiz', user: 'DBMS - Normalization', time: '25 mins ago' },
                    { action: 'Semester results uploaded', user: 'Admin', time: '1 hour ago' },
                    { action: '8 new students added', user: 'Admin', time: '2 hours ago' }].map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl" data-testid={`activity-${i}`}>
                      <div><p className="font-bold text-sm text-slate-800 dark:text-slate-100">{a.action}</p><p className="text-xs font-medium text-slate-400">{a.user}</p></div>
                      <span className="text-xs font-medium text-slate-400">{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="soft-card p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <h4 className="font-extrabold text-xl mb-3">This Month</h4>
                  <div className="space-y-2 text-sm font-medium text-white/90">
                    <p>125 quizzes conducted</p><p>1,248 active students</p><p>College avg: 82.5%</p><p>8 new faculty joined</p>
                  </div>
                </div>
                <div className="soft-card p-6 bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  <h4 className="font-extrabold text-xl mb-3">Top Department</h4>
                  <p className="text-3xl font-extrabold mb-2">CSE</p>
                  <p className="text-sm font-medium text-white/90">Average Score: 85%</p>
                  <p className="text-sm font-medium text-white/90">320 Students</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}



        {activeTab === 'department-metrics' && (
          <motion.div data-testid="department-metrics-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.h3 variants={itemVariants} className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Department-wise Performance Metrics</motion.h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { name: 'DS', students: 180, avg: 85.2, pass: 92, color: 'indigo' },
                { name: 'CS', students: 165, avg: 83.7, pass: 89, color: 'emerald' },
                { name: 'ET', students: 145, avg: 81.5, pass: 87, color: 'amber' },
                { name: 'AIML', students: 125, avg: 86.1, pass: 93, color: 'purple' }
              ].map((dept) => (
                <motion.div variants={itemVariants} whileHover={cardHover} key={dept.name} className="soft-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{dept.name}</h4>
                    <div className={`w-10 h-10 bg-${dept.color}-100 rounded-xl flex items-center justify-center`}>
                      <span className={`text-${dept.color}-600 font-bold`}>{dept.students}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Score</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{dept.avg}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pass Rate</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{dept.pass}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                      <div className={`bg-${dept.color}-500 h-2 rounded-full`} style={{ width: `${dept.pass}%` }}></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <motion.div variants={itemVariants} className="soft-card p-6">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Department Performance Trend</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { month: 'Aug', DS: 82, CS: 80, ET: 78, AIML: 83 },
                  { month: 'Sep', DS: 83, CS: 81, ET: 79, AIML: 84 },
                  { month: 'Oct', DS: 84, CS: 82, ET: 80, AIML: 85 },
                  { month: 'Nov', DS: 85, CS: 83, ET: 81, AIML: 86 },
                  { month: 'Dec', DS: 85.2, CS: 83.7, ET: 81.5, AIML: 86.1 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '14px', fontWeight: '600' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px', fontWeight: '600' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '14px', fontWeight: '600' }} />
                  <Line type="monotone" dataKey="DS" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="CS" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ET" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="AIML" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'section-metrics' && (
          <motion.div data-testid="section-metrics-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.h3 variants={itemVariants} className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Section-wise Performance Metrics</motion.h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {['DS-1', 'DS-2', 'CS-1', 'CS-2', 'AIML-1', 'AIML-2'].map((section, idx) => (
                <motion.div variants={itemVariants} whileHover={cardHover} key={section} className="soft-card p-6">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{section}</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/15 rounded-xl text-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Students</p>
                      <p className="text-2xl font-extrabold text-indigo-600">{45 - idx * 2}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Avg Score</p>
                      <p className="text-2xl font-extrabold text-emerald-600">{85 - idx}%</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl text-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Pass Rate</p>
                      <p className="text-2xl font-extrabold text-amber-600">{90 - idx}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Quizzes Conducted</span>
                      <span className="font-bold text-slate-900 dark:text-white">{12 + idx}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mid-term Avg</span>
                      <span className="font-bold text-slate-900 dark:text-white">{24 + idx}/30</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Attendance</span>
                      <span className="font-bold text-slate-900 dark:text-white">{92 - idx}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'student-profiles' && (
          <motion.div data-testid="student-profiles-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.h3 variants={itemVariants} className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Student Profiles Management</motion.h3>
            
            <motion.div variants={itemVariants} className="soft-card p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <input 
                  type="text" 
                  placeholder="Search by name, ID, or department..." 
                  className="soft-input flex-1"
                />
                <select className="soft-input w-48">
                  <option>All Departments</option>
                  <option>DS</option>
                  <option>CS</option>
                  <option>ET</option>
                  <option>AIML</option>
                </select>
                <select className="soft-input w-32">
                  <option>All Batches</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                </select>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">College ID</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Name</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Department</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Section</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Batch</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Avg Score</th>
                      <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: '22WJ8A6745', name: 'Rajesh Kumar', dept: 'DS', section: 'DS-1', batch: '2024', avg: 85.5, status: 'Active' },
                      { id: '22WJ8A6746', name: 'Priya Sharma', dept: 'DS', section: 'DS-1', batch: '2024', avg: 88.2, status: 'Active' },
                      { id: '22WJ8A6747', name: 'Amit Patel', dept: 'CS', section: 'CS-1', batch: '2024', avg: 82.7, status: 'Active' },
                      { id: '22WJ8A6748', name: 'Sneha Singh', dept: 'ET', section: 'A', batch: '2024', avg: 79.3, status: 'Active' },
                      { id: '22WJ8A6749', name: 'Rahul Verma', dept: 'AIML', section: 'AIML-1', batch: '2024', avg: 91.0, status: 'Active' }
                    ].map((student) => (
                      <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800/50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-indigo-600">{student.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-100">{student.name}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">{student.dept}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">{student.section}</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">{student.batch}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`soft-badge ${
                            student.avg >= 85 ? 'bg-emerald-50 text-emerald-600' :
                            student.avg >= 70 ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {student.avg}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="soft-badge bg-emerald-50 text-emerald-600">{student.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'results' && (
          <motion.div data-testid="results-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <StudentResultsSearch user={user} departmentLocked={false} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'permissions' && (
          <motion.div data-testid="permissions-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <UserPermissionsManager />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'cia-builder' && (
          <motion.div data-testid="cia-builder-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <CIATemplateBuilder />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'finance' && (
          <motion.div data-testid="finance-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <AdminFinanceModule collegeId={user?.college_id} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'command-center' && (
          <AdminCommandCenter navigate={navigate} setActiveTab={setActiveTab} />
        )}

        {activeTab === 'hr-payroll' && (
          <motion.div data-testid="hr-payroll-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <HRPayrollModule />
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

        {activeTab === 'campus-map' && (
          <motion.div data-testid="campus-map-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <CampusMap user={user} navigate={navigate} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'campus-layout' && (
          <motion.div data-testid="campus-layout-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <CampusLayoutDesigner onPreviewToggle={() => setActiveTab('campus-map')} />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'timetable-settings' && (
          <motion.div data-testid="timetable-settings-content" variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants}>
              <TimetableSettings />
            </motion.div>
          </motion.div>
        )}

        <AnimatePresence>
      </AnimatePresence>
    </div>
    </div>
  );
};

export default AdminDashboard;

