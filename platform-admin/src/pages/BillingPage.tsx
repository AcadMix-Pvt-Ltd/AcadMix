// Billing Page
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { superadminAPI } from '../services/api';
import { Building2, IndianRupee } from 'lucide-react';

export default function BillingPage() {
  const { data: billingData = [] } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: async () => { const { data } = await superadminAPI.billingOverview(); return data.data; },
  });

  const totalUsers = billingData.reduce((s: number, t: any) => s + (t.users || 0), 0);
  const totalFees = billingData.reduce((s: number, t: any) => s + (t.total_fees || 0), 0);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <h1 className="page-title">Billing & Revenue</h1>
        <p className="page-subtitle">Fee collection and tenant revenue overview</p>
      </div>
      <div className="page-body">
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="stat-label">Total Tenants</div>
            <div className="stat-value" style={{ marginTop: 8 }}>{billingData.length}</div>
          </motion.div>
          <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="stat-label">Total Users (All Tenants)</div>
            <div className="stat-value" style={{ marginTop: 8 }}>{totalUsers.toLocaleString()}</div>
          </motion.div>
          <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="stat-label">Total Fee Volume</div>
            <div className="stat-value" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <IndianRupee size={20} />{(totalFees / 100000).toFixed(1)}L
            </div>
          </motion.div>
        </div>

        {/* Tenant table */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>College</th>
                <th>Domain</th>
                <th>Users</th>
                <th>Total Fees Generated</th>
                <th>Per-User Revenue</th>
              </tr>
            </thead>
            <tbody>
              {billingData.map((t: any, i: number) => (
                <motion.tr key={t.college_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.03 }}>
                  <td style={{ paddingLeft: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={14} style={{ color: 'var(--primary-light)' }} />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{t.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--primary-light)' }}>{t.domain || '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{t.users?.toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: 'var(--emerald)' }}>₹{Number(t.total_fees).toLocaleString('en-IN')}</td>
                  <td>{t.users > 0 ? `₹${Math.round(t.total_fees / t.users).toLocaleString()}` : '—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
