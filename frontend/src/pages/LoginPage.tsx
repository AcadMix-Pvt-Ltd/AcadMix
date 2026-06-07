import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, UserCircle, Lock, Eye, EyeSlash, PaperPlaneTilt, Phone, Receipt } from '@phosphor-icons/react';
import { authAPI, formatApiError } from '../services/api';
import { useTenant } from '../contexts/TenantContext';
import { useIsPreEnrollOpen } from '../hooks/useCollegeModules';
import { preEnrollAPI } from '../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const KnowledgeNetworkBackground = () => {
  const meshRows = 22;
  const meshColumns = 34;
  const mesh = useMemo(() => {
    const idAt = (row: number, column: number) => row * meshColumns + column + 1;
    const nodes = Array.from({ length: meshRows * meshColumns }, (_, index) => {
      const row = Math.floor(index / meshColumns);
      const column = index % meshColumns;
      const xOffset = row % 2 === 0 ? 0 : 1.85;

      return {
        id: index + 1,
        x: -10 + column * 3.7 + xOffset,
        y: -6 + row * 5.35,
      };
    });
    const horizontalConnections = Array.from({ length: meshRows }, (_, row) =>
      Array.from({ length: meshColumns - 1 }, (_, column) => [idAt(row, column), idAt(row, column + 1)])
    ).flat();
    const diagonalConnections = Array.from({ length: meshRows - 1 }, (_, row) =>
      Array.from({ length: meshColumns - 1 }, (_, column) => {
        if (row % 2 === 0) {
          return [
            [idAt(row, column), idAt(row + 1, column)],
            [idAt(row, column + 1), idAt(row + 1, column)],
          ];
        }

        return [
          [idAt(row, column), idAt(row + 1, column)],
          [idAt(row, column), idAt(row + 1, column + 1)],
        ];
      })
    ).flat(2);
    const connections = [...horizontalConnections, ...diagonalConnections];
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const segments = connections.flatMap(([n1, n2], index) => {
      const node1 = nodeById.get(n1);
      const node2 = nodeById.get(n2);
      if (!node1 || !node2) return [];

      const midX = (node1.x + node2.x) / 2;
      const midY = (node1.y + node2.y) / 2;
      const distanceFromCenter = Math.hypot(midX - 50, midY - 54);
      const angle = Math.atan2(midY - 54, midX - 50);
      const noise = Math.abs(Math.sin(index * 12.9898 + midX * 0.43 + midY * 0.71));
      const branchBias = (Math.sin(angle * 3.2 + noise * 5.1) + 1) * 0.75;

      return [{
        id: index,
        node1,
        node2,
        delay: (distanceFromCenter * 0.07 + branchBias + noise * 2.4) % 8.5,
        duration: 3.8 + noise * 1.6,
        energy: noise,
        strength: 0.13 + noise * 0.17,
      }];
    });

    return { nodes, segments };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#f8fafc]">
      {/* Soft radial background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_54%,rgba(99,102,241,0.06)_0%,rgba(99,102,241,0.015)_25%,transparent_45%)]" />
      
      {/* Animating knowledge network layer */}
      <motion.div 
        animate={{
          x: ["-0.18%", "0.18%", "-0.18%"],
          y: ["-0.12%", "0.16%", "-0.12%"],
        }}
        transition={{ duration: 36, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      >
        <svg className="absolute -inset-[8%] h-[116%] w-[116%]" preserveAspectRatio="none">
          <defs>
            <filter id="mesh-energy-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.0" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {mesh.segments.map(segment => (
            <line
              key={`line1-${segment.id}`}
              x1={`${segment.node1.x}%`}
              y1={`${segment.node1.y}%`}
              x2={`${segment.node2.x}%`}
              y2={`${segment.node2.y}%`}
              stroke="#cbd5e1"
              strokeWidth="0.32"
              strokeOpacity="0.32"
            />
          ))}
          <g filter="url(#mesh-energy-glow)">
            {mesh.segments.filter(segment => segment.energy > 0.55).map(segment => (
              <motion.line
                key={`energy-line-${segment.id}`}
                x1={`${segment.node1.x}%`}
                y1={`${segment.node1.y}%`}
                x2={`${segment.node2.x}%`}
                y2={`${segment.node2.y}%`}
                stroke={segment.id % 3 === 0 ? '#818cf8' : '#6366f1'}
                strokeWidth="0.52"
                strokeLinecap="round"
                initial={{ strokeOpacity: 0 }}
                animate={{ strokeOpacity: [0, segment.strength * 0.8, 0.04, 0] }}
                transition={{
                  duration: segment.duration,
                  repeat: Infinity,
                  repeatDelay: 2.4,
                  ease: "easeInOut",
                  delay: segment.delay,
                }}
              />
            ))}
          </g>
          {mesh.nodes.map((n, index) => (
            <circle
              key={`node1-${n.id}`}
              cx={`${n.x}%`}
              cy={`${n.y}%`}
              r={index % 5 === 0 ? 0.68 : 0.45}
              fill="#94a3b8"
              fillOpacity={index % 7 === 0 ? 0.28 : 0.16}
            />
          ))}
        </svg>
      </motion.div>

      {/* Soft overlay gradient to ensure text readability */}
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.52),rgba(255,255,255,0.28)_48%,rgba(248,250,252,0.62))]"></div>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { data: preEnrollStatus } = useIsPreEnrollOpen();
  const isPreEnrollActive = preEnrollStatus?.is_open ?? false;
  const [isPreEnrollMode, setIsPreEnrollMode] = useState(false);
  
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  
  const tenant = useTenant();
  const showQuickLogin = tenant.isDemo || ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const quickLoginRoles = [
    { role: 'Student', collegeId: '22WJ8A6745', password: '22WJ8A6745', color: 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800', icon: '🎓' },
    { role: 'Teacher', collegeId: 'T001', password: 'teacher123', color: 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800', icon: '👨‍🏫' },
    { role: 'HOD', collegeId: 'HOD001', password: 'hod123', color: 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800', icon: '👔' },
    { role: 'Principal', collegeId: 'PRIN001', password: 'teacher123', color: 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800', icon: '🏫' },
    { role: 'Cashier', collegeId: 'CASHIER001', password: 'cashier123', color: 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800', icon: '💸' },
    { role: 'Finance', collegeId: 'FINANCE001', password: 'finance123', color: 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800', icon: '📈' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!isPreEnrollMode) {
      try {
        const { data } = await authAPI.login(collegeId, password);
        onLogin(data);
      } catch (err: any) {
        setError(formatApiError(err.response?.data?.detail) || err.message || 'Login failed');
      }
      setLoading(false);
      return;
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeId || !admissionNumber || !mobileNumber) {
      setError("Please fill all fields");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await preEnrollAPI.requestOTP({ college_id: collegeId, admission_number: admissionNumber, phone_number: mobileNumber });
      setOtpSent(true);
    } catch (err: any) {
      setError(formatApiError(err.response?.data?.detail) || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await preEnrollAPI.verifyOTP({ college_id: collegeId, admission_number: admissionNumber, phone_number: mobileNumber, otp });
      sessionStorage.setItem('pre_enroll_token', data.access_token);
      window.location.href = "/pre-enroll/hostel";
    } catch (err: any) {
      setError(formatApiError(err.response?.data?.detail) || 'Invalid OTP');
    }
    setLoading(false);
  };

  const handleQuickLogin = async (id, pass) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.login(id, pass);
      onLogin(data);
    } catch (err: any) {
      setError(formatApiError(err.response?.data?.detail) || err.message || 'Quick login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* EdTech Knowledge Network Background */}
      <KnowledgeNetworkBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Collab Signature */}
        <div className="flex flex-col items-center justify-center mb-8 mt-2">
          {tenant.tenantSlug ? (
            <div className="flex items-center gap-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="bg-transparent rounded-xl transition-all duration-300"
              >
                <img
                  src="/logos/acadmix-wordmark.png"
                  alt="AcadMix"
                  className="h-12 sm:h-14 w-auto object-contain drop-shadow-sm transition-all duration-300"
                />
              </motion.div>

              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                className="text-2xl sm:text-3xl font-extralight text-slate-400 select-none"
              >
                ×
              </motion.span>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="flex items-center justify-center transition-all duration-300"
              >
                <img
                  src={`/logos/${tenant.tenantSlug}-emblem.png`}
                  alt={tenant.tenantName || tenant.tenantSlug}
                  className="h-10 sm:h-12 w-auto object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 shadow-md"
                  style={{ display: 'none' }}
                >
                  <span className="text-white font-bold text-sm tracking-tight">
                    {tenant.tenantSlug.slice(0, 4).toUpperCase()}
                  </span>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className={`flex items-center justify-center w-20 h-20 rounded-[1.5rem] shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 bg-white mb-6 ${tenant.logo ? 'p-2' : 'p-0'}`}
            >
              {tenant.logo ? (
                <img src={tenant.logo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <GraduationCap size={40} weight="duotone" className="text-slate-800" />
              )}
            </motion.div>
          )}

          <h1 className={`text-2xl font-extrabold tracking-tight text-slate-900 text-center mb-2 ${tenant.tenantSlug ? 'mt-6' : ''}`}>
            Welcome to {tenant.tenantName || 'AcadMix'}
          </h1>
          <p className="text-sm font-medium text-slate-500 text-center">
            {isPreEnrollMode ? "Pre-Enrollment Access" : "Sign in to access your dashboard"}
          </p>
        </div>

        {/* The Card */}
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-slate-900/5 p-8 relative overflow-hidden">
          
          {isPreEnrollActive && (
            <div className="flex p-1 bg-slate-100 rounded-full mb-6 relative z-10 border border-slate-200/40">
              <button
                type="button"
                onClick={() => {
                  setIsPreEnrollMode(false);
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all relative ${
                  !isPreEnrollMode
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPreEnrollMode(true);
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all relative ${
                  isPreEnrollMode
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hostel Booking
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 text-sm font-semibold flex items-center justify-center text-center">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isPreEnrollMode ? (otpSent ? 'otp' : 'pre-enroll') : 'standard'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {isPreEnrollMode && otpSent ? (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Enter OTP</label>
                    <div className="relative group">
                      <Lock size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                        placeholder="6-digit code" className="w-full bg-slate-50/50 border border-slate-200/80 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-2xl py-3 pl-11 pr-4 text-slate-900 text-sm font-medium transition-all !outline-none" maxLength={6} />
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3.5 text-sm font-bold shadow-sm shadow-slate-900/10 transition-all flex items-center justify-center gap-2">
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <>Verify Access <PaperPlaneTilt size={16} weight="bold" /></>}
                  </motion.button>
                </form>
              ) : isPreEnrollMode && !otpSent ? (
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">College ID</label>
                    <div className="relative group">
                      <UserCircle size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input type="text" value={collegeId} onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                        placeholder="e.g. 22WJ8A6745" className="w-full bg-slate-50/50 border border-slate-200/80 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-2xl py-3 pl-11 pr-4 text-slate-900 text-sm font-medium transition-all !outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Admission No.</label>
                    <div className="relative group">
                      <Receipt size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input type="text" value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)}
                        placeholder="e.g. ADM2026102" className="w-full bg-slate-50/50 border border-slate-200/80 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-2xl py-3 pl-11 pr-4 text-slate-900 text-sm font-medium transition-all !outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Mobile Number</label>
                    <div className="relative group">
                      <Phone size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input type="text" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="Linked mobile number" className="w-full bg-slate-50/50 border border-slate-200/80 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-2xl py-3 pl-11 pr-4 text-slate-900 text-sm font-medium transition-all !outline-none" maxLength={10} />
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3.5 text-sm font-bold shadow-sm shadow-slate-900/10 transition-all flex items-center justify-center gap-2 mt-2">
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <>Send OTP <PaperPlaneTilt size={16} weight="bold" /></>}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">College ID</label>
                    <div className="relative group">
                      <UserCircle size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input type="text" value={collegeId} onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                        placeholder="Enter Roll Number or ID" className="w-full bg-slate-50/50 border border-slate-200/80 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-2xl py-3.5 pl-11 pr-4 text-slate-900 text-sm font-semibold transition-all !outline-none placeholder:text-slate-400 placeholder:font-medium" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">Password</label>
                      <a href="#" className="text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors">Forgot?</a>
                    </div>
                    <div className="relative group">
                      <Lock size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Password" className="w-full bg-slate-50/50 border border-slate-200/80 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-2xl py-3.5 pl-11 pr-12 text-slate-900 text-sm font-semibold transition-all !outline-none placeholder:text-slate-400 placeholder:font-medium" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-200/50">
                        {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" disabled={loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3.5 text-sm font-bold shadow-sm shadow-slate-900/10 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <>Sign In <PaperPlaneTilt size={16} weight="bold" /></>}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {showQuickLogin && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="text-center mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Access Demo</span>
              </div>
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-2">
                {quickLoginRoles.map((roleData) => (
                  <motion.button
                    key={roleData.role}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleQuickLogin(roleData.collegeId, roleData.password)}
                    disabled={loading}
                    className={`${roleData.color} rounded-xl px-3 py-2.5 text-xs font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2`}
                  >
                    <span className="text-sm">{roleData.icon}</span>
                    <span>{roleData.role}</span>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <p className="text-center mt-8 text-xs font-semibold text-slate-400">
          Secure Access • {new Date().getFullYear()} AcadMix
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
