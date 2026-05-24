import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AlertModal from './components/AlertModal';
import PageTransition from './components/PageTransition';
import ErrorBoundary from './components/ErrorBoundary';
import IdleTimer from './components/auth/IdleTimer';
import './App.css';
import { authAPI, setAuthToken, clearAuthToken } from './services/api';
import { Toaster } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// Lazy-loaded pages (code-split per route)
// ═══════════════════════════════════════════════════════════════════════════════
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboard')); // Force Vite cache invalidation
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const HodDashboard = React.lazy(() => import('./pages/HodDashboard'));
const ExamCellDashboard = React.lazy(() => import('./pages/ExamCellDashboard'));
const QuizAttempt = React.lazy(() => import('./pages/QuizAttempt'));
const QuizResults = React.lazy(() => import('./pages/QuizResults'));
const SemesterResults = React.lazy(() => import('./pages/SemesterResults'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const QuizBuilder = React.lazy(() => import("./pages/QuizBuilder.tsx"));
const LiveMonitor = React.lazy(() => import('./pages/LiveMonitor'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const CodePlayground = React.lazy(() => import('./pages/CodePlayground')); // renamed to tsx, bust cache
const MarksEntry = React.lazy(() => import('./pages/MarksEntry'));
const StudentManagement = React.lazy(() => import('./pages/StudentManagement'));
const ClassResults = React.lazy(() => import('./pages/ClassResults'));
const AvailableQuizzes = React.lazy(() => import('./pages/AvailableQuizzes'));
const Placements = React.lazy(() => import('./pages/Placements'));
const TeacherQuizzes = React.lazy(() => import('./pages/TeacherQuizzes'));
const QuizCalendar = React.lazy(() => import('./pages/QuizCalendar'));
const QuizSummary = React.lazy(() => import('./pages/QuizSummary'));
const AttendanceMarker = React.lazy(() => import('./components/faculty/AttendanceMarker'));
const TPODashboard = React.lazy(() => import('./pages/TPODashboard'));
const AlumniDashboard = React.lazy(() => import('./pages/AlumniDashboard'));
const ParentDashboard = React.lazy(() => import('./pages/ParentDashboard'));
const IndustryDashboard = React.lazy(() => import('./pages/IndustryDashboard'));
const PrincipalDashboard = React.lazy(() => import('./pages/PrincipalDashboard'));
const RetiredFacultyDashboard = React.lazy(() => import('./pages/RetiredFacultyDashboard'));
const ExpertDashboard = React.lazy(() => import('./pages/ExpertDashboard'));
const NodalOfficerDashboard = React.lazy(() => import('./pages/NodalOfficerDashboard'));
const FacultyProfilePage = React.lazy(() => import('./pages/FacultyProfilePage'));
const StudentProfilePage = React.lazy(() => import('./pages/StudentProfilePage'));
const DocumentPreviewPage = React.lazy(() => import('./pages/DocumentPreviewPage'));
const InterviewWarRoom = React.lazy(() => import('./pages/InterviewWarRoom'));
const AIInterviewSession = React.lazy(() => import('./pages/AIInterviewSession'));
const HostelBooking = React.lazy(() => import('./pages/HostelBooking'));
const PreEnrollBooking = React.lazy(() => import('./pages/PreEnrollBooking'));
const WardenDashboard = React.lazy(() => import('./pages/WardenDashboard'));
const ResumeATSScorer = React.lazy(() => import('./pages/ResumeATSScorer'));
const CareerToolkit = React.lazy(() => import('./pages/CareerToolkit')); 
const PlacementHub = React.lazy(() => import('./pages/PlacementHub'));
const SQLPractice = React.lazy(() => import('./pages/SQLPractice'));
const HardwareArena = React.lazy(() => import('./pages/HardwareArena'));
const TransportAdminDashboard = React.lazy(() => import('./pages/TransportAdminDashboard'));
const LibrarianDashboard = React.lazy(() => import('./pages/LibrarianDashboard'));
const SecurityDashboard = React.lazy(() => import('./pages/SecurityDashboard'));
const VisitorManagement = React.lazy(() => import('./pages/VisitorManagement'));
const DirectorDashboard = React.lazy(() => import('./pages/DirectorDashboard'));
const CashierDashboard = React.lazy(() => import('./pages/CashierDashboard'));
const FinanceOfficerDashboard = React.lazy(() => import('./pages/FinanceOfficerDashboard'));
const ReceiptVerificationPage = React.lazy(() => import('./pages/ReceiptVerificationPage'));
const OrbShowcase = React.lazy(() => import('./pages/OrbShowcase'));
const CadStudio = React.lazy(() => import('./pages/cad-studio/CadStudio'));
const ReportDashboard = React.lazy(() => import('./pages/ReportDashboard'));

// ═══════════════════════════════════════════════════════════════════════════════
// Route Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps old page-name strings to URL paths.
 * This enables backwards compatibility — existing navigate('page-name') calls
 * in child components continue to work via the compatibility bridge below.
 */
const PAGE_TO_PATH = {
  'login': '/login',
  'student-dashboard': '/student',
  'teacher-dashboard': '/teacher',
  'admin-dashboard': '/admin',
  'hod-dashboard': '/hod',
  'examcell-dashboard': '/exam-cell',
  'nodal-officer-dashboard': '/nodal-officer',
  'tpo-dashboard': '/tpo',
  'alumni-dashboard': '/alumni',
  'parent-dashboard': '/parent',
  'industry-dashboard': '/industry',
  'principal-dashboard': '/principal',
  'retired-faculty-dashboard': '/retired-faculty',
  'expert-dashboard': '/expert',
  'warden-dashboard': '/warden',
  'transport-admin-dashboard': '/transport-admin',
  'librarian-dashboard': '/librarian',
  'security-dashboard': '/security',
  'cashier-dashboard': '/cashier',
  'finance-officer-dashboard': '/finance',
  'quiz-attempt': '/quiz/attempt',
  'quiz-results': '/quiz/results',
  'semester-results': '/results/semester',
  'analytics': '/analytics',
  'leaderboard': '/leaderboard',
  'quiz-builder': '/quiz/builder',
  'live-monitor': '/quiz/monitor',
  'user-management': '/admin/users',
  'code-playground': '/code',
  'marks-entry': '/marks/entry',
  'student-management': '/admin/students',
  'class-results': '/results/class',
  'available-quizzes': '/quizzes',
  'placements': '/placements',
  'teacher-quizzes': '/teacher/quizzes',
  'quiz-calendar': '/quiz/calendar',
  'quiz-summary': '/quiz/summary',
  'faculty-profile': '/faculty/profile',
  'interview-warroom': '/interview',
  'ai-interview-session': '/interview/session',
  'attendance-marker': '/attendance/mark',
  'hostel-booking': '/hostel',
  'resume-ats-scorer': '/resume-scorer',
  'career-toolkit': '/career',
  'placement-hub': '/placement-prep',
  'hardware-arena': '/hardware-arena',
  'visitor-management': '/visitors',
  'student-profile': '/student/profile',
  'director-dashboard': '/director',
  'cad-studio': '/cad-studio',
  'accreditation': '/accreditation',
};

const ROLE_DASHBOARD = {
  student: '/student',
  teacher: '/teacher',
  admin: '/admin',
  hod: '/hod',
  exam_cell: '/exam-cell',
  nodal_officer: '/nodal-officer',
  tp_officer: '/tpo',
  alumni: '/alumni',
  parent: '/parent',
  industry: '/industry',
  principal: '/principal',
  retired_faculty: '/retired-faculty',
  expert: '/expert',
  warden: '/warden',
  transport_admin: '/transport-admin',
  librarian: '/librarian',
  security: '/security',
  cashier: '/cashier',
  finance_officer: '/finance',
  director: '/director',
};


// ═══════════════════════════════════════════════════════════════════════════════
// Compatibility Bridge — navigate('page-name', data) → useNavigate()
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a compatibility wrapper that translates old-style navigate('page-name')
 * calls into React Router navigation. This allows all existing page components
 * to work without changing their internal navigate() calls.
 */
function useCompatNavigate() {
  const routerNavigate = useNavigate();

  return useCallback((pageName, data = null) => {
    const path = PAGE_TO_PATH[pageName] || `/${pageName}`;
    routerNavigate(path, { state: data });
  }, [routerNavigate]);
}


// ═══════════════════════════════════════════════════════════════════════════════
// Auth Guard
// ═══════════════════════════════════════════════════════════════════════════════

function ProtectedRoute({ children, user, allowedRoles }) {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashPath = ROLE_DASHBOARD[user.role] || '/login';
    return <Navigate to={dashPath} replace />;
  }
  return <ErrorBoundary>{children}</ErrorBoundary>;
}


// ═══════════════════════════════════════════════════════════════════════════════
// React Query Client
// ═══════════════════════════════════════════════════════════════════════════════

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — dashboard data is fresh for 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});


// ═══════════════════════════════════════════════════════════════════════════════
// Loading Spinner
// ═══════════════════════════════════════════════════════════════════════════════

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19]">
    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);


// ═══════════════════════════════════════════════════════════════════════════════
// App Routes
// ═══════════════════════════════════════════════════════════════════════════════

function AppRoutes({ user, onLogin, onLogout }) {
  const navigate = useCompatNavigate();
  const location = useLocation();
  const selectedData = location.state;

  return (
    <Routes>
      {/* ── Auth ──────────────────────────────────────────────────── */}
      <Route path="/login" element={
        user ? <Navigate to={ROLE_DASHBOARD[user.role] || '/student'} replace />
             : <LoginPage onLogin={onLogin} />
      } />

      {/* ── Pre-Enrollment ────────────────────────────────────────── */}
      <Route path="/pre-enroll/hostel" element={<PreEnrollBooking navigate={navigate} />} />
      <Route path="/fees/verify/:token" element={<ReceiptVerificationPage />} />
      <Route path="/orb-test" element={<OrbShowcase />} />

      {/* ── Role Dashboards ──────────────────────────────────────── */}
      <Route path="/student" element={
        <ProtectedRoute user={user} allowedRoles={['student']}>
          <StudentDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/teacher" element={
        <ProtectedRoute user={user} allowedRoles={['teacher']}>
          <TeacherDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute user={user} allowedRoles={['admin']}>
          <AdminDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/hod" element={
        <ProtectedRoute user={user} allowedRoles={['hod']}>
          <HodDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/exam-cell" element={
        <ProtectedRoute user={user} allowedRoles={['exam_cell']}>
          <ExamCellDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/tpo" element={
        <ProtectedRoute user={user} allowedRoles={['tp_officer']}>
          <TPODashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/alumni" element={
        <ProtectedRoute user={user} allowedRoles={['alumni']}>
          <AlumniDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/parent" element={
        <ProtectedRoute user={user} allowedRoles={['parent']}>
          <ParentDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/industry" element={
        <ProtectedRoute user={user} allowedRoles={['industry']}>
          <IndustryDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/principal" element={
        <ProtectedRoute user={user} allowedRoles={['principal']}>
          <PrincipalDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/retired-faculty" element={
        <ProtectedRoute user={user} allowedRoles={['retired_faculty']}>
          <RetiredFacultyDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/expert" element={
        <ProtectedRoute user={user} allowedRoles={['expert']}>
          <ExpertDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/nodal-officer" element={
        <ProtectedRoute user={user} allowedRoles={['nodal_officer']}>
          <NodalOfficerDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/warden" element={
        <ProtectedRoute user={user} allowedRoles={['warden']}>
          <WardenDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/transport-admin" element={
        <ProtectedRoute user={user} allowedRoles={['transport_admin', 'admin']}>
          <TransportAdminDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/librarian" element={
        <ProtectedRoute user={user} allowedRoles={['librarian']}>
          <LibrarianDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/security" element={
        <ProtectedRoute user={user} allowedRoles={['security']}>
          <VisitorManagement navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/cashier" element={
        <ProtectedRoute user={user} allowedRoles={['cashier']}>
          <CashierDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/finance" element={
        <ProtectedRoute user={user} allowedRoles={['finance_officer']}>
          <FinanceOfficerDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />
      <Route path="/director" element={
        <ProtectedRoute user={user} allowedRoles={['director']}>
          <DirectorDashboard navigate={navigate} user={user} onLogout={onLogout} />
        </ProtectedRoute>
      } />

      {/* ── Quiz Routes ──────────────────────────────────────────── */}
      <Route path="/quiz/attempt" element={
        <ProtectedRoute user={user}><QuizAttempt quizData={selectedData} navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/quiz/results" element={
        <ProtectedRoute user={user}><QuizResults navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/quiz/builder" element={
        <ProtectedRoute user={user} allowedRoles={['teacher', 'hod', 'admin']}>
          <QuizBuilder navigate={navigate} user={user} editQuiz={selectedData} />
        </ProtectedRoute>
      } />
      <Route path="/quiz/monitor" element={
        <ProtectedRoute user={user} allowedRoles={['teacher', 'hod', 'admin']}>
          <LiveMonitor quiz={selectedData} navigate={navigate} user={user} />
        </ProtectedRoute>
      } />
      <Route path="/quiz/calendar" element={
        <ProtectedRoute user={user}><QuizCalendar navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/quiz/summary" element={
        <ProtectedRoute user={user}><QuizSummary navigate={navigate} user={user} attemptData={selectedData} /></ProtectedRoute>
      } />
      <Route path="/quizzes" element={
        <ProtectedRoute user={user}><AvailableQuizzes navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/teacher/quizzes" element={
        <ProtectedRoute user={user} allowedRoles={['teacher', 'hod']}>
          <TeacherQuizzes navigate={navigate} user={user} />
        </ProtectedRoute>
      } />

      {/* ── Academic Routes ──────────────────────────────────────── */}
      <Route path="/marks/entry" element={
        <ProtectedRoute user={user} allowedRoles={['teacher', 'hod', 'admin']}>
          <MarksEntry navigate={navigate} user={user} preselectedAssignment={selectedData} />
        </ProtectedRoute>
      } />
      <Route path="/results/semester" element={
        <ProtectedRoute user={user}><SemesterResults navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/results/class" element={
        <ProtectedRoute user={user}><ClassResults navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute user={user}><Analytics navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/leaderboard" element={
        <ProtectedRoute user={user}><Leaderboard navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/attendance/mark" element={
        <ProtectedRoute user={user} allowedRoles={['teacher', 'hod']}>
          <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] py-8">
            <div className="max-w-7xl mx-auto px-4">
              <button onClick={() => navigate('teacher-dashboard')} className="mb-4 text-indigo-500 font-bold hover:underline">← Back to Dashboard</button>
              <AttendanceMarker user={user} />
            </div>
          </div>
        </ProtectedRoute>
      } />

      {/* ── Admin Routes ─────────────────────────────────────────── */}
      <Route path="/admin/users" element={
        <ProtectedRoute user={user} allowedRoles={['admin']}>
          <UserManagement navigate={navigate} user={user} />
        </ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute user={user} allowedRoles={['admin', 'hod']}>
          <StudentManagement navigate={navigate} user={user} />
        </ProtectedRoute>
      } />

      {/* ── Career & Interview Routes ────────────────────────────── */}
      <Route path="/interview" element={
        <ProtectedRoute user={user}><InterviewWarRoom navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/interview/session" element={
        <ProtectedRoute user={user}><AIInterviewSession navigate={navigate} user={user} quizData={selectedData} /></ProtectedRoute>
      } />
      <Route path="/resume-scorer" element={
        <ProtectedRoute user={user}><ResumeATSScorer navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/career" element={
        <ProtectedRoute user={user}><CareerToolkit navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/placement-prep" element={
        <ProtectedRoute user={user}><PlacementHub navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/sql-practice" element={
        <ProtectedRoute user={user}><SQLPractice navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/hardware-arena" element={
        <ProtectedRoute user={user}><HardwareArena navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/placements" element={
        <ProtectedRoute user={user}><Placements navigate={navigate} user={user} /></ProtectedRoute>
      } />

      {/* ── Campus Life Routes ───────────────────────────────────── */}
      <Route path="/hostel" element={
        <ProtectedRoute user={user}><HostelBooking navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/visitors" element={
        <ProtectedRoute user={user}><VisitorManagement navigate={navigate} user={user} onLogout={onLogout} gateType={selectedData?.gateType} /></ProtectedRoute>
      } />

      <Route path="/code" element={
        <ProtectedRoute user={user}><CodePlayground navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/faculty/profile" element={
        <ProtectedRoute user={user}><FacultyProfilePage navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/student/profile" element={
        <ProtectedRoute user={user}><StudentProfilePage navigate={navigate} user={user} /></ProtectedRoute>
      } />
      <Route path="/preview/:filename" element={
        <ProtectedRoute user={user}><DocumentPreviewPage /></ProtectedRoute>
      } />
      <Route path="/cad-studio" element={
        <ProtectedRoute user={user}><CadStudio /></ProtectedRoute>
      } />
      <Route path="/accreditation" element={
        <ProtectedRoute user={user} allowedRoles={['nodal_officer', 'principal', 'admin', 'hod']}>
          <ReportDashboard user={user} />
        </ProtectedRoute>
      } />

      {/* ── Fallback ─────────────────────────────────────────────── */}
      <Route path="*" element={
        user ? <Navigate to={ROLE_DASHBOARD[user.role] || '/student'} replace />
             : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// Main App Component
// ═══════════════════════════════════════════════════════════════════════════════

function AppShell() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const routerNavigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // Handle Hardware Back Button naitvely inside Capacitor
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let lastBackPressTime = 0;
    
    const listener = CapacitorApp.addListener('backButton', () => {
      const path = locationRef.current;
      const isRoot = Object.values(ROLE_DASHBOARD).includes(path) || path === '/login' || path === '/';

      if (!isRoot) {
        // We are deep in the app. Just navigate back.
        routerNavigate(-1);
        return;
      }

      // We are at the root dashboard
      const now = new Date().getTime();
      if (now - lastBackPressTime < 2000) {
        CapacitorApp.exitApp();
      } else {
        lastBackPressTime = now;
        Toast.show({
          text: 'Tap back again to exit',
          duration: 'short',
          position: 'bottom'
        });
      }
    });

    return () => {
      listener.then(handle => handle.remove());
    };
  }, [routerNavigate]);

  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    setAuthToken(savedToken);
    try {
      const { data } = await authAPI.me();
      setUser(data);
      // If we're on /login and already authenticated, redirect to dashboard
      if (location.pathname === '/login' || location.pathname === '/') {
        routerNavigate(ROLE_DASHBOARD[data.role] || '/student', { replace: true });
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        clearAuthToken();
        localStorage.removeItem('auth_token');
        sessionStorage.clear();
        setUser(null);
        routerNavigate('/login', { replace: true });
      }
    }
    setLoading(false);
  }, [routerNavigate, location.pathname]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData.access_token) {
      setAuthToken(userData.access_token);
      localStorage.setItem('auth_token', userData.access_token);
    }
    
    // Redirect back to the requested page if deep-linked, otherwise go to dashboard
    if (location.state?.from) {
      // Add a slight delay to ensure states propagate if there are heavy renders
      setTimeout(() => {
        routerNavigate(location.state.from.pathname + location.state.from.search, { replace: true });
      }, 100);
    } else {
      routerNavigate(ROLE_DASHBOARD[userData.role] || '/student', { replace: true });
    }
  };

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = async (reason = null) => {
    setShowLogoutModal(false);
    
    // 1. Wipe storage immediately to prevent writes during the async API call
    sessionStorage.clear();
    localStorage.removeItem('auth_token');
    
    try { await authAPI.logout(); } catch {}
    
    // 2. Wipe again to clear anything written by components during the await
    sessionStorage.clear();
    
    setUser(null);
    clearAuthToken();
    
    if (reason === 'idle') {
      routerNavigate('/login?reason=idle', { replace: true });
    } else {
      routerNavigate('/login', { replace: true });
    }
    
    // 3. Final nuke to guarantee storage is dead after React unmounts complete
    setTimeout(() => {
      sessionStorage.clear();
    }, 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <IdleTimer user={user} onLogout={() => confirmLogout('idle')} />
      <PageTransition pageKey={location.pathname}>
        <Suspense fallback={<LoadingSpinner />}>
          <AppRoutes user={user} onLogin={handleLogin} onLogout={handleLogout} />
        </Suspense>
      </PageTransition>
      <AlertModal
        open={showLogoutModal}
        type="logout"
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to log in again to access your dashboard."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// App Wrapper (provides Router + QueryClient context)
// ═══════════════════════════════════════════════════════════════════════════════

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
