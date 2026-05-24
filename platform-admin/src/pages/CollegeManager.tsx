import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminAPI } from '../services/api';
import { toast } from 'sonner';
import {
  Building2, Plus, Search, Users, GraduationCap,
  X, ToggleLeft, ToggleRight,
  Globe, BookOpen, Bed
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// COLLEGE MANAGER — CRUD tenants + module toggles
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_MODULES = [
  { key: 'attendance', label: 'Attendance Tracking', icon: '📋' },
  { key: 'quizzes', label: 'Quiz Engine', icon: '📝' },
  { key: 'hostel', label: 'Hostel Management', icon: '🏠' },
  { key: 'transport', label: 'Transport & GPS', icon: '🚌' },
  { key: 'placements', label: 'Placements & TPO', icon: '💼' },
  { key: 'library', label: 'Library System', icon: '📚' },
  { key: 'fees', label: 'Fee Management', icon: '💰' },
  { key: 'accreditation', label: 'NAAC/NBA Accreditation', icon: '🏅' },
  { key: 'grievances', label: 'Grievance Portal', icon: '📢' },
  { key: 'alumni', label: 'Alumni Network', icon: '🎓' },
  { key: 'cia', label: 'CIA & Marks', icon: '📊' },
  { key: 'career_toolkit', label: 'Career Toolkit', icon: '🚀' },
  { key: 'code_playground', label: 'Code Playground', icon: '💻' },
  { key: 'visitors', label: 'Visitor Management', icon: '🚪' },
];

interface College {
  id: string;
  name: string;
  domain: string | null;
  settings: any;
  user_count: number;
  student_count: number;
  dept_count: number;
  hostel_count: number;
  is_deleted: boolean;
  created_at: string;
}

export default function CollegeManager() {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'modules'>('overview');
  const queryClient = useQueryClient();
  void queryClient;

  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ['colleges-list'],
    queryFn: async () => { const { data } = await superadminAPI.listColleges(); return data.data; },
  });

  const filtered = colleges.filter((c: College) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Colleges</h1>
            <p className="page-subtitle">Manage tenant institutions and their module access</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)} id="create-college-btn">
            <Plus size={16} />
            Add College
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder="Search colleges..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="college-search"
          />
        </div>

        {/* College Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map((college: College, i: number) => (
            <motion.div
              key={college.id}
              className="glass-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ cursor: 'pointer' }}
              onClick={() => { setSelectedCollege(college); setActiveTab('overview'); }}
              whileHover={{ borderColor: 'var(--border-hover)', y: -2 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: 'var(--primary-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 size={18} style={{ color: 'var(--primary-light)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)' }}>{college.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{college.id}</div>
                  </div>
                </div>
                <span className={`badge ${college.is_deleted ? 'badge-rose' : 'badge-emerald'}`}>
                  <span className={`dot ${college.is_deleted ? 'dot-rose' : 'dot-emerald'}`} />
                  {college.is_deleted ? 'Inactive' : 'Active'}
                </span>
              </div>

              {college.domain && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Globe size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--primary-light)' }}>{college.domain}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
                {[
                  { icon: <Users size={12} />, val: college.user_count, label: 'Users' },
                  { icon: <GraduationCap size={12} />, val: college.student_count, label: 'Students' },
                  { icon: <BookOpen size={12} />, val: college.dept_count, label: 'Depts' },
                  { icon: <Bed size={12} />, val: college.hostel_count, label: 'Hostels' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '8px 0', background: 'var(--surface-mid)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>{s.val}</div>
                    <div style={{ fontSize: '0.5625rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <Building2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontWeight: 600 }}>No colleges found</p>
          </div>
        )}
      </div>

      {/* College Detail Drawer */}
      <AnimatePresence>
        {selectedCollege && (
          <CollegeDrawer
            college={selectedCollege}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onClose={() => setSelectedCollege(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCollegeModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}


// ── College Detail Drawer ────────────────────────────────────────────────────

function CollegeDrawer({
  college, activeTab, setActiveTab, onClose
}: {
  college: College; activeTab: string; setActiveTab: (t: any) => void; onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['college-stats', college.id],
    queryFn: async () => { const { data } = await superadminAPI.collegeStats(college.id); return data.data; },
  });

  const { data: modules = {} } = useQuery({
    queryKey: ['college-modules', college.id],
    queryFn: async () => { const { data } = await superadminAPI.getModules(college.id); return data.data; },
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { module: string; enabled: boolean }) =>
      superadminAPI.toggleModules(college.id, { [vars.module]: vars.enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['college-modules', college.id] });
      toast.success('Module updated');
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 200, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.01em' }}>{college.name}</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{college.id}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '16px 28px' }}>
          <div className="tab-bar">
            <button className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-item ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => setActiveTab('modules')}>Modules</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 28px 28px' }}>
          {activeTab === 'overview' && stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Users by role */}
              <div>
                <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Users by Role
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(stats.users_by_role || []).map((r: any) => (
                    <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-low)', borderRadius: 10 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' as const }}>{r.role.replace('_', ' ')}</span>
                      <span className="badge badge-primary">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Departments */}
              <div>
                <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Departments
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(stats.departments || []).map((d: any) => (
                    <div key={d.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-low)', borderRadius: 10 }}>
                      <div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{d.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>{d.code}</span>
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{d.students} students</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance */}
              {stats.attendance_summary?.[0] && (
                <div>
                  <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                    Attendance
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Total', val: stats.attendance_summary[0].total, color: 'var(--primary-light)' },
                      { label: 'Present', val: stats.attendance_summary[0].present, color: 'var(--emerald)' },
                      { label: 'Absent', val: stats.attendance_summary[0].absent, color: 'var(--rose)' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--surface-low)', borderRadius: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: s.color }}>{Number(s.val).toLocaleString()}</div>
                        <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hostel Occupancy */}
              {stats.hostel_occupancy?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                    Hostel Occupancy
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {stats.hostel_occupancy.map((h: any) => {
                      const pct = h.total_capacity > 0 ? Math.round((h.occupied / h.total_capacity) * 100) : 0;
                      return (
                        <div key={h.name} style={{ padding: '10px 12px', background: 'var(--surface-low)', borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{h.name}</span>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{h.occupied}/{h.total_capacity}</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--surface-high)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--amber)' : 'var(--emerald)', borderRadius: 99, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'modules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ALL_MODULES.map((mod) => {
                const enabled = modules[mod.key] ?? false;
                return (
                  <div
                    key={mod.key}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', background: 'var(--surface-low)', borderRadius: 12,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.125rem' }}>{mod.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{mod.label}</span>
                    </div>
                    <button
                      onClick={() => toggleMutation.mutate({ module: mod.key, enabled: !enabled })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: enabled ? 'var(--emerald)' : 'var(--text-muted)', transition: 'color 0.2s' }}
                    >
                      {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}


// ── Create College Modal ─────────────────────────────────────────────────────

function CreateCollegeModal({ onClose }: { onClose: () => void }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => superadminAPI.createCollege({ id, name, domain: domain || null, settings: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleges-list'] });
      toast.success(`${name} onboarded successfully`);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to create college');
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Onboard New College</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
          Create a new tenant in the platform
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">College ID</label>
            <input className="input" placeholder="e.g. aits-hyd-001" value={id} onChange={e => setId(e.target.value)} id="create-college-id" />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder="e.g. AITS Hyderabad" value={name} onChange={e => setName(e.target.value)} id="create-college-name" />
          </div>
          <div>
            <label className="label">Domain (optional)</label>
            <input className="input" placeholder="e.g. aits.acadmix.org" value={domain} onChange={e => setDomain(e.target.value)} id="create-college-domain" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => createMutation.mutate()} disabled={!id || !name || createMutation.isPending} id="create-college-submit">
            {createMutation.isPending ? 'Creating...' : 'Create College'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
