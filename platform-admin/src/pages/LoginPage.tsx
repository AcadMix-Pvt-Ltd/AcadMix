import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../services/api';
import {
  Command, Shield, Lock, Mail, Eye, EyeOff, ArrowRight,
  Database, Users, Building2, Activity, AlertCircle, Loader2
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE — The Sovereign Gate
// Premium split-screen login for admin.acadmix.org
// ═══════════════════════════════════════════════════════════════════════════════

interface LoginPageProps {
  onLogin: (user: any) => void;
}

// Floating stat cards for the hero panel
const HERO_STATS = [
  { icon: <Database size={14} />, label: 'Tables', value: '142', color: '#6366F1' },
  { icon: <Users size={14} />, label: 'Records', value: '800K+', color: '#34D399' },
  { icon: <Building2 size={14} />, label: 'Tenants', value: '25', color: '#FBBF24' },
  { icon: <Activity size={14} />, label: 'Uptime', value: '99.9%', color: '#22D3EE' },
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: resp } = await authAPI.login(email, password);
      const user = resp.data || resp; // handle both enveloped and flat responses

      if (user.role !== 'super_admin') {
        setError('Access denied. This portal is for platform administrators only.');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_token', user.access_token);
      onLogin(user);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Invalid credentials';
      setError(typeof msg === 'string' ? msg : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── LEFT PANEL: Hero with mesh gradient ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          flex: '0 0 55%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0B0F19',
          overflow: 'hidden',
        }}
      >
        {/* Mesh gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 70%, rgba(128,131,255,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.04) 0%, transparent 70%)
          `,
          pointerEvents: 'none',
        }} />

        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        {/* Logo + tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{ position: 'relative', textAlign: 'center', marginBottom: 48 }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #6366F1, #8083FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', boxShadow: '0 16px 48px rgba(99,102,241,0.4)',
          }}>
            <Command size={28} color="white" />
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
            AcadMix
          </h1>
          <p style={{
            fontSize: '0.9375rem', fontWeight: 500,
            color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Shield size={14} style={{ color: 'var(--primary-light)' }} />
            Platform Command Center
          </p>
        </motion.div>

        {/* Floating stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 14,
            maxWidth: 340,
            width: '100%',
            padding: '0 20px',
          }}
        >
          {HERO_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '16px 18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: stat.color }}>
                {stat.icon}
                <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {stat.value}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Version tag */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          style={{
            position: 'absolute', bottom: 24, left: 0, right: 0,
            textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)',
          }}
        >
          AcadMix Platform v3.0 · Enterprise
        </motion.div>
      </motion.div>

      {/* ── RIGHT PANEL: Login form ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          flex: '0 0 45%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
          position: 'relative',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380, padding: '0 32px' }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 32 }}>
              Sign in to the Command Center
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Email */}
            <div>
              <label className="label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  ref={emailRef}
                  type="email"
                  className="input"
                  style={{ paddingLeft: 40 }}
                  placeholder="admin@acadmix.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  id="login-email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(251,113,133,0.08)',
                    border: '1px solid rgba(251,113,133,0.15)',
                    fontSize: '0.8125rem', fontWeight: 500, color: 'var(--rose)',
                  }}
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary"
              style={{ width: '100%', height: 44, marginTop: 4, fontSize: '0.9375rem' }}
              id="login-submit"
            >
              {loading ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Forgot password */}
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <button
                type="button"
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: '0.8125rem', cursor: 'pointer',
                }}
              >
                Forgot password?
              </button>
            </div>
          </motion.form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              marginTop: 48, textAlign: 'center',
              fontSize: '0.6875rem', color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            This portal is restricted to platform administrators.
            <br />
            Tenant users should access their institution portal directly.
          </motion.div>
        </div>
      </motion.div>

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
