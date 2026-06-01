import React, { useState, useEffect } from 'react';
import UserProfileModal from '../components/UserProfileModal';
import DashboardHeader from '../components/DashboardHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { Storefront, Checks, FileText, MagnifyingGlass, Megaphone, ShieldCheck, Sun, Moon, SignOut, UserCircle, Bell, Briefcase, Info, Sparkle, Trash } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import { nodalAPI, notificationsAPI, insightsAPI } from '../services/api';
import { toast, Toaster } from 'sonner';
import InsightsChat from '../components/insights/InsightsChat';
import InsightsCanvas from '../components/insights/InsightsCanvas';
import NAACMatrix from '../components/accreditation/NAACMatrix';
import NBACoPoMatrix from '../components/accreditation/NBACoPoMatrix';
import NBADashboard from '../components/accreditation/NBADashboard';
import NEPTracker from '../components/accreditation/NEPTracker';
import NIRFMatrix from '../components/accreditation/NIRFMatrix';
import CampusMap from '../components/campus/CampusMap';


// ─── Shared Notification Bell ──────────────────────────────────
const NotifBell = () => {
  const [show, setShow] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    notificationsAPI.getAll({ limit: 10 }).then(r => {
      setItems(r.data.data || []);
      setUnread(r.data.unread_count || 0);
    }).catch(() => {});
  }, []);

  const fmt = (iso) => {
    if (!iso) return '';
    const d = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (d < 1) return 'Just now';
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d / 60)}h ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative">
      <button onClick={() => setShow(!show)} className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors relative" aria-label="Notifications">
        <Bell size={20} weight={show ? "fill" : "duotone"} />
        {unread > 0 && <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{unread > 9 ? '9+' : unread}</div>}
      </button>
      <AnimatePresence>
        {show && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setShow(false)} />
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} className="fixed top-16 right-4 sm:right-8 z-[61] w-80 sm:w-96 bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Notifications</h4>
                <button onClick={() => { notificationsAPI.markAllRead(); setUnread(0); setItems(p => p.map(n => ({ ...n, is_read: true }))); setShow(false); }} className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-white/5">
                {items.length === 0 ? <div className="px-5 py-8 text-center text-sm text-slate-400">No notifications yet</div> : items.map(n => (
                  <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${n.type === 'placement' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-blue-50 dark:bg-blue-500/15'}`}>
                      {n.type === 'placement' ? <Briefcase size={14} weight="duotone" className="text-emerald-500" /> : <Info size={14} weight="duotone" className="text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{n.title}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5 block">{fmt(n.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const NodalOfficerDashboard = ({ navigate, user, onLogout }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [complianceSubTab, setComplianceSubTab] = useState('naac');
  const [activeCollegeId, setActiveCollegeId] = useState('');
  const { isDark, toggle: toggleTheme } = useTheme();

  const [colleges, setColleges] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [activities, setActivities] = useState([]);
  
  const [showCircularModal, setShowCircularModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [formData, setFormData] = useState({});

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
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'compliance') fetchCompliance();
    if (activeTab === 'circulars') fetchCirculars();
    if (activeTab === 'submissions') fetchSubmissions();
    if (activeTab === 'inspections') fetchInspections();
    if (activeTab === 'activities') fetchActivities();
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      const res = await nodalAPI.getColleges();
      setColleges(res.data?.data || []);
    } catch (e) {
      toast.error('Failed to load jurisdiction colleges');
    }
  };

  const fetchCompliance = async () => {
    const res = await nodalAPI.getAttendanceCompliance();
    setAttendance(res.data?.data || []);
  };
  const fetchCirculars = async () => {
    const res = await nodalAPI.getCirculars();
    setCirculars(res.data?.data || []);
  };
  const fetchSubmissions = async () => {
    const res = await nodalAPI.getSubmissionsStatus();
    setSubmissions(res.data?.data || []);
  };
  const fetchInspections = async () => {
    const res = await nodalAPI.getInspections();
    setInspections(res.data?.data || []);
  };
  const fetchActivities = async () => {
    const res = await nodalAPI.getActivityReports();
    setActivities(res.data?.data || []);
  };

  // Handlers
  const handleAcknowledgeActivity = async (id) => {
    try {
      await nodalAPI.acknowledgeActivity(id, { notes: 'Acknowledged by DHTE Nodal Officer' });
      toast.success('Activity officially acknowledged');
      fetchActivities();
    } catch {
      toast.error('Action failed');
    }
  };

  const handleCreateCircular = async () => {
    try {
      await nodalAPI.createCircular({
        title: formData.title,
        content: formData.content,
        document_url: formData.document_url || '',
        is_mandatory: true,
        target_colleges: ['all']
      });
      toast.success('Circular distributed universally');
      setShowCircularModal(false);
      fetchCirculars();
    } catch {
      toast.error('Failed to distribute');
    }
  };

  const handleCreateInspection = async () => {
    try {
      await nodalAPI.createInspection({
        college_id: formData.college_id,
        inspection_date: formData.inspection_date,
        inspection_type: formData.inspection_type || 'routine',
        team_members: [user.name],
        findings: [formData.findings],
        action_points: [formData.action_points],
        compliance_score: parseFloat(formData.compliance_score || 85.0)
      });
      toast.success('Audit successfully filed');
      setShowInspectionModal(false);
      fetchInspections();
    } catch {
      toast.error('Failed to log audit');
    }
  };

  const handleCreateRequirement = async () => {
    try {
      await nodalAPI.createSubmissionRequirement({
        title: formData.title,
        description: formData.description,
        data_type: formData.data_type || 'other',
        deadline: formData.deadline,
        target_colleges: ['all']
      });
      toast.success('Requirement issued globally');
      setShowSubmissionModal(false);
      fetchSubmissions();
    } catch {
      toast.error('Failed to issue requirement');
    }
  };

  const handleAssignExpert = async () => {
    try {
      await nodalAPI.assignExpert({
        expert_user_id: formData.expert_user_id,
        college_id: formData.college_id,
        subject_code: formData.subject_code,
        department_id: formData.department_id || 'TEMP',
        academic_year: '2024-2025'
      });
      toast.success('Subject Expert assigned to college');
      setShowExpertModal(false);
    } catch {
      toast.error('Assignment failed');
    }
  };

  const tabs = [
    { id: 'overview', icon: Storefront, label: 'Jurisdiction' },
    { id: 'compliance', icon: ShieldCheck, label: 'Compliance & Accreditations' },
    { id: 'circulars', icon: Megaphone, label: 'Policies & Circulars' },
    { id: 'submissions', icon: FileText, label: 'Dataset Submissions' },
    { id: 'inspections', icon: MagnifyingGlass, label: 'Audits & Inspections' },
    { id: 'activities', icon: Checks, label: 'Activity Reports' },
    { id: 'insights', icon: Sparkle, label: 'AI Insights' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <DashboardHeader 
        user={user} 
        title="NodalOfficer Dashboard" 
        onLogout={onLogout} 
        setShowProfile={setShowProfile} 
      />
      {showProfile && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}


      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl mb-8 hide-scrollbar">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === t.id ? 'bg-white dark:bg-[#1A202C] text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <Icon size={18} weight="duotone" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Active College Territory</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {colleges.map(c => (
                <div key={c.id} className="soft-card p-6 border-t-4 border-indigo-500 group cursor-pointer hover:-translate-y-1 transition-transform">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center mb-4 text-indigo-500"><Storefront size={24} weight="duotone" /></div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 mb-1">{c.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mb-4">{c.domain}</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-xl">NAAC Active</span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase rounded-xl">{c.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Circulars Tab */}
        {activeTab === 'circulars' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
              <div>
                <h2 className="text-2xl font-bold">Policy Distribution Center</h2>
                <p className="text-white/80 font-medium text-sm mt-1">Issue state-wide mandates and circulars to college administrators.</p>
              </div>
              <button onClick={() => setShowCircularModal(true)} className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl active:scale-95 transition-transform shadow-lg">Issue Mandate</button>
            </div>
            
            <div className="space-y-4">
              {circulars.map(c => (
                <div key={c.id} className="soft-card p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{c.title}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">{c.content}</p>
                    </div>
                    {c.is_mandatory && <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-xl">Mandatory</span>}
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">College Acknowledgments</p>
                    <div className="flex flex-wrap gap-2">
                      {c.acknowledgments?.map((ack, i) => (
                        <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl">{ack.college_id} ✅</span>
                      ))}
                      {c.acknowledgments?.length === 0 && <span className="text-xs text-amber-500 font-medium">Pending state-wide review...</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Audits & Inspections Tab */}
        {activeTab === 'inspections' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex gap-4">
              <button onClick={() => setShowInspectionModal(true)} className="px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl active:scale-95 transition-transform flex-1 text-center">Log New Inspection</button>
              <button onClick={() => setShowExpertModal(true)} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl active:scale-95 transition-transform flex-1 text-center">Assign Subject Expert</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {inspections.map(insp => (
                <div key={insp.id} className="soft-card p-6">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">College Target</p>
                      <p className="font-extrabold text-slate-800 dark:text-slate-100">{insp.college_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compliance</p>
                      <p className={`font-extrabold ${insp.compliance_score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{insp.compliance_score}%</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Findings</p>
                      <ul className="text-sm font-medium text-slate-700 dark:text-slate-300 list-disc list-inside">
                        {insp.findings?.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">College Responses</p>
                      {insp.responses?.map((r, i) => (
                        <div key={i} className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3 rounded-xl mt-2">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">"{r.response}"</p>
                        </div>
                      ))}
                      {insp.responses?.length === 0 && <p className="text-xs text-amber-500 italic">No response submitted yet.</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <button onClick={() => setShowSubmissionModal(true)} className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl active:scale-95 transition-transform shadow-lg shadow-violet-500/30">Enforce New Data Collection</button>
            <div className="grid grid-cols-1 gap-4">
              {submissions.map(sub => (
                <div key={sub.id} className="soft-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">{sub.title}</h3>
                      <p className="text-sm font-medium text-slate-500">{sub.description}</p>
                    </div>
                    <span className="px-3 py-1 bg-violet-50 text-violet-600 text-[10px] font-black uppercase rounded-xl">{sub.data_type} Target</span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2">
                     {sub.records?.map((r, i) => (
                       <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100">{r.college_id} ✅</span>
                     ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">State-wide Activity Log</h2>
            {activities.map(act => (
              <div key={act.id} className="soft-card p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{act.event_title}</h3>
                  <p className="text-xs font-medium text-slate-500 mb-2">{act.college_id} | Noted by Principal</p>
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase rounded-xl">{act.activity_type}</span>
                </div>
                {act.nodal_acknowledged_at ? (
                  <span className="flex items-center gap-1 text-emerald-500 font-bold text-sm"><Checks weight="bold"/> Logged Internally</span>
                ) : (
                  <button onClick={() => handleAcknowledgeActivity(act.id)} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold transition-colors">Acknowledge</button>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Compliance & Accreditations Tab */}
        {activeTab === 'compliance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-fit">
              {[
                { id: 'naac', label: 'NAAC' },
                { id: 'nba', label: 'NBA CO-PO' },
                { id: 'nep', label: 'NEP 2020' },
                { id: 'nirf', label: 'NIRF DCS' },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setComplianceSubTab(st.id)}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    complianceSubTab === st.id
                      ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Sub-tab Content */}
            {complianceSubTab === 'naac' && <NAACMatrix viewMode="nodal" collegeId={activeCollegeId} />}
            {complianceSubTab === 'nba' && (
              <div className="space-y-8">
                <NBADashboard collegeId={activeCollegeId} />
                <NBACoPoMatrix viewMode="nodal" />
              </div>
            )}
            {complianceSubTab === 'nep' && <NEPTracker viewMode="nodal" collegeId={activeCollegeId} />}
            {complianceSubTab === 'nirf' && <NIRFMatrix viewMode="nodal" collegeId={activeCollegeId} />}
          </motion.div>
        )}

      </main>

      {/* Modals */}
      {showCircularModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Issue Policy Circular</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Mandate Title" className="soft-input w-full" onChange={e => setFormData({...formData, title: e.target.value})} />
              <textarea placeholder="Directives / Content" className="soft-input w-full" rows="3" onChange={e => setFormData({...formData, content: e.target.value})}></textarea>
              <input type="text" placeholder="Document Bucket URL (Optional)" className="soft-input w-full" onChange={e => setFormData({...formData, document_url: e.target.value})} />
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowCircularModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleCreateCircular} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold">Distribute</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInspectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Log College Audit</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <select className="soft-input flex-1" onChange={e => setFormData({...formData, college_id: e.target.value})}>
                  <option value="">Select Target College</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" className="soft-input flex-1" onChange={e => setFormData({...formData, inspection_date: e.target.value})} />
              </div>
              <input type="text" placeholder="Core Finding" className="soft-input w-full" onChange={e => setFormData({...formData, findings: e.target.value})} />
              <input type="text" placeholder="Required Action Point" className="soft-input w-full" onChange={e => setFormData({...formData, action_points: e.target.value})} />
              <input type="number" placeholder="Compliance Matrix Score (%)" className="soft-input w-full" onChange={e => setFormData({...formData, compliance_score: e.target.value})} />
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowInspectionModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleCreateInspection} className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold">File Audit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSubmissionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Request Data Collection</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Requirement Title" className="soft-input w-full" onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="text" placeholder="Description" className="soft-input w-full" onChange={e => setFormData({...formData, description: e.target.value})} />
              <div className="flex gap-4">
                <select className="soft-input flex-1" onChange={e => setFormData({...formData, data_type: e.target.value})}>
                  <option value="enrollment">Enrollment</option>
                  <option value="faculty">Faculty Metrics</option>
                  <option value="placement">Placements</option>
                </select>
                <input type="date" className="soft-input flex-1" onChange={e => setFormData({...formData, deadline: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowSubmissionModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleCreateRequirement} className="px-5 py-2 bg-violet-600 text-white rounded-xl font-bold">Assign Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExpertModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Deploy Subject Expert</h3>
            <div className="space-y-4">
              <select className="soft-input w-full" onChange={e => setFormData({...formData, college_id: e.target.value})}>
                <option value="">Target College...</option>
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Expert User ID (e.g., EXP001)" className="soft-input w-full" onChange={e => setFormData({...formData, expert_user_id: e.target.value})} />
              <input type="text" placeholder="Subject Code (e.g., CS-201)" className="soft-input w-full" onChange={e => setFormData({...formData, subject_code: e.target.value})} />
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setShowExpertModal(false)} className="px-5 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleAssignExpert} className="px-5 py-2 bg-indigo-500 text-white rounded-xl font-bold">Bind Expert</button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* AI Insights Tab */}
        {activeTab === 'insights' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-[#1A202C] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-4 mt-6">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Select College Scope:</label>
              <select 
                className="soft-input flex-1 max-w-sm" 
                value={activeCollegeId} 
                onChange={e => setActiveCollegeId(e.target.value)}
              >
                <option value="">-- All Colleges (Global Scope) --</option>
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-6">
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
                         <InsightsChat user={user} activeCollegeId={activeCollegeId} onPinsChanged={refreshPins} />
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
            </div>
          </motion.div>
        )}
    </div>
  );
};

export default NodalOfficerDashboard;

