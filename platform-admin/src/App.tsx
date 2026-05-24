import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { authAPI } from './services/api';
import {
  LayoutDashboard, Building2, Bed, Receipt, LogOut, Shield, Command,
  Moon, Sun
} from 'lucide-react';
import './index.css';

// Lazy-loaded pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CollegeManager = React.lazy(() => import('./pages/CollegeManager'));
const HostelDesigner = React.lazy(() => import('./pages/HostelDesigner'));
const BillingPage = React.lazy(() => import('./pages/BillingPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sidebar Navigation
// ═══════════════════════════════════════════════════════════════════════════════

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
  { id: 'colleges', label: 'Colleges', path: '/colleges', icon: <Building2 size={18} /> },
  { id: 'hostel', label: 'Hostel Designer', path: '/hostel', icon: <Bed size={18} /> },
  { id: 'billing', label: 'Billing', path: '/billing', icon: <Receipt size={18} /> },
];

function Sidebar({ user, onLogout, theme, onToggleTheme }: { user: any; onLogout: () => void; theme: string; onToggleTheme: () => void }) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Command size={16} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>AcadMix</div>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Command Center
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        <div style={{ padding: '0 12px', marginBottom: 8 }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-muted)', paddingLeft: 8 }}>
            Platform
          </span>
        </div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
          {theme === 'dark' ? 'Dark' : 'Light'} Mode
        </span>
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          id="theme-toggle-btn"
        >
          <div className={`theme-toggle-knob ${theme === 'light' ? 'light' : ''}`}>
            {theme === 'dark'
              ? <Moon size={11} color="white" />
              : <Sun size={11} color="white" />
            }
          </div>
        </button>
      </div>

      {/* User */}
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: 'white',
          }}>
            {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'SA'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Super Admin'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <Shield size={10} style={{ display: 'inline', marginRight: 4 }} />
              super_admin
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 8 }}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// App Shell
// ═══════════════════════════════════════════════════════════════════════════════

function AppShell() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('admin_theme') || 'dark');
  const navigate = useNavigate();

  // Sync data-theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data: resp } = await authAPI.me();
      const me = resp.data || resp;
      if (me.role !== 'super_admin') {
        localStorage.removeItem('admin_token');
        setLoading(false);
        return;
      }
      setUser(me);
    } catch {
      localStorage.removeItem('admin_token');
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLogin = (userData: any) => {
    setUser(userData);
    navigate('/', { replace: true });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('admin_token');
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Not authenticated → show login
  if (!user) {
    return (
      <Suspense fallback={<div />}>
        <Routes>
          <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
        </Routes>
      </Suspense>
    );
  }

  // Authenticated → show dashboard layout
  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
      <main className="main-content">
        <Suspense fallback={
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/colleges" element={<CollegeManager />} />
            <Route path="/hostel" element={<HostelDesigner />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Toaster position="bottom-right" theme={theme === 'dark' ? 'dark' : 'light'} richColors />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
