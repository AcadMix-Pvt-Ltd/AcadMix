// Dashboard Page
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { superadminAPI } from '../services/api';
import {
  Building2, Users, BookOpen, CalendarCheck, Receipt,
  Bed, Bus, Award, Activity, Database
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM DASHBOARD — Real-time KPIs + Tenant Health
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  delay: number;
  subtitle?: string;
}

function StatCard({ icon, label, value, color, delay, subtitle }: StatCardProps) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ marginTop: 8 }}>{value}</div>
          {subtitle && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</div>
          )}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color,
        }}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function Dashboard() {
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['platform-overview'],
    queryFn: async () => {
      const res = await superadminAPI.platformOverview();
      return res.data?.data ?? res.data;
    },
  });

  const { data: collegesData } = useQuery({
    queryKey: ['colleges-list'],
    queryFn: async () => {
      const res = await superadminAPI.listColleges();
      return res.data?.data ?? res.data;
    },
  });

  const stats = overviewData || {};
  const colleges = collegesData || [];

  const STAT_CARDS = [
    { icon: <Building2 size={18} />, label: 'Tenants', value: stats.total_tenants || 0, color: '#6366F1', subtitle: 'Active colleges' },
    { icon: <Users size={18} />, label: 'Total Users', value: formatNum(stats.total_users || 0), color: '#34D399', subtitle: `${stats.total_students || 0} students · ${stats.total_staff || 0} staff` },
    { icon: <CalendarCheck size={18} />, label: 'Attendance Records', value: formatNum(stats.total_attendance || 0), color: '#22D3EE', subtitle: 'All-time entries' },
    { icon: <BookOpen size={18} />, label: 'Courses', value: stats.total_courses || 0, color: '#FBBF24', subtitle: `${stats.total_departments || 0} departments` },
    { icon: <Bed size={18} />, label: 'Hostels', value: stats.total_hostels || 0, color: '#A78BFA', subtitle: `${stats.total_rooms || 0} rooms · ${stats.total_beds || 0} beds` },
    { icon: <Receipt size={18} />, label: 'Fee Invoices', value: formatNum(stats.total_fee_invoices || 0), color: '#FB7185', subtitle: 'Generated' },
    { icon: <Bus size={18} />, label: 'Bus Routes', value: stats.total_bus_routes || 0, color: '#F97316', subtitle: 'Active routes' },
    { icon: <Award size={18} />, label: 'Scholarships', value: stats.total_scholarships || 0, color: '#14B8A6', subtitle: 'Programs defined' },
  ];

  return (
    <div className="mesh-bg" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="page-header">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Activity size={14} style={{ color: 'var(--emerald)' }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              All Systems Operational
            </span>
          </div>
          <h1 className="page-title">Platform Overview</h1>
          <p className="page-subtitle">
            Real-time metrics across all tenants
          </p>
        </motion.div>
      </div>

      <div className="page-body">
        {/* KPI Grid */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="stat-card" style={{ height: 110 }}>
                <div style={{ width: '60%', height: 12, background: 'var(--surface-high)', borderRadius: 6, marginBottom: 12 }} />
                <div style={{ width: '40%', height: 28, background: 'var(--surface-high)', borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {STAT_CARDS.map((card, i) => (
              <StatCard key={card.label} {...card} delay={0.05 * i} />
            ))}
          </div>
        )}

        {/* Tenant Health */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          style={{ marginTop: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Tenant Health</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Active colleges and their metrics
              </p>
            </div>
            <div className="badge badge-primary">
              <Database size={12} />
              {colleges.length} tenants
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>College</th>
                  <th>Domain</th>
                  <th>Users</th>
                  <th>Students</th>
                  <th>Departments</th>
                  <th>Hostels</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((college: any, i: number) => (
                  <motion.tr
                    key={college.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                  >
                    <td style={{ paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--primary-glow)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Building2 size={14} style={{ color: 'var(--primary-light)' }} />
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{college.name}</span>
                      </div>
                    </td>
                    <td>
                      {college.domain ? (
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--primary-light)' }}>
                          {college.domain}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{college.user_count?.toLocaleString()}</span>
                    </td>
                    <td>{college.student_count?.toLocaleString()}</td>
                    <td>{college.dept_count}</td>
                    <td>{college.hostel_count}</td>
                    <td>
                      <span className={`badge ${college.is_deleted ? 'badge-rose' : 'badge-emerald'}`}>
                        <span className={`dot ${college.is_deleted ? 'dot-rose' : 'dot-emerald'}`} />
                        {college.is_deleted ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {college.created_at ? new Date(college.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </motion.tr>
                ))}
                {colleges.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      No tenants found. Create your first college to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
