import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Brain, FileText, Clock, Trophy, ArrowRight, Lightning, Target, ChartLineUp, Microphone, Sparkle, Upload, CaretRight, Medal, Fire, Star, Users, Toolbox, MagnifyingGlass, X, Buildings } from '@phosphor-icons/react';
import { interviewAPI, resumeAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const cardHover = { scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 17 } };

// ─── Persona Pool ────────────────────────────────────────────────────────────
const PERSONA_POOL = [
  { name: 'Adam', persona: 'Tech Lead', seed: 'Adam', voice_id: 'pNInz6obpgDQGcFmaJgB' },
  { name: 'Bella', persona: 'HR Manager', seed: 'Bella', voice_id: 'EXAVITQu4vr4xnSDxMaL' },
  { name: 'Antoni', persona: 'Behavioral Analyst', seed: 'Antoni', voice_id: 'ErXwobaYiN019PkySvjV' },
  { name: 'Arnold', persona: 'Executive VP', seed: 'Arnold', voice_id: 'VR6AewLTigWG4xSOukaG' },
  { name: 'Rachel', persona: 'Senior Recruiter', seed: 'Rachel', voice_id: '21m00Tcm4TlvDq8ikWAM' },
  { name: 'Clyde', persona: 'Engineering Manager', seed: 'Clyde', voice_id: '2EiwWnXFnvU5JabPnv8n' },
];

const COMPANY_DOMAINS: Record<string, string> = {
  'Amazon': 'amazon.com', 'Apple': 'apple.com', 'Atlassian': 'atlassian.com', 'Barclays': 'barclays.co.uk',
  'Bloomberg': 'bloomberg.com', 'Cisco': 'cisco.com', 'Cognizant': 'cognizant.com', 'Cred': 'cred.club',
  'Databricks': 'databricks.com', 'Deloitte': 'deloitte.com', 'D.E. Shaw': 'deshaw.com', 'Directi': 'directi.com',
  'Disney': 'disney.com', 'Dropbox': 'dropbox.com', 'eBay': 'ebay.com', 'Expedia': 'expediagroup.com',
  'Facebook (Meta)': 'meta.com', 'Flipkart': 'flipkart.com', 'Goldman Sachs': 'goldmansachs.com',
  'Google': 'google.com', 'IBM': 'ibm.com', 'Infosys': 'infosys.com', 'Intel': 'intel.com',
  'Intuit': 'intuit.com', 'J.P. Morgan': 'jpmorgan.com', 'LinkedIn': 'linkedin.com', 'MakeMyTrip': 'makemytrip.com',
  'Microsoft': 'microsoft.com', 'Morgan Stanley': 'morganstanley.com', 'Netflix': 'netflix.com',
  'Nvidia': 'nvidia.com', 'NVIDIA': 'nvidia.com', 'Oracle': 'oracle.com', 'Palo Alto Networks': 'paloaltonetworks.com', 
  'Paytm': 'paytm.com', 'Salesforce': 'salesforce.com', 'Samsung': 'samsung.com',
  'SAP': 'sap.com', 'ServiceNow': 'servicenow.com', 'Stripe': 'stripe.com', 'Swiggy': 'swiggy.com',
  'Target': 'target.com', 'TCS': 'tcs.com', 'TCS Digital': 'tcs.com', 'TCS NQT': 'tcs.com', 'Tech Mahindra': 'techmahindra.com',
  'Twilio': 'twilio.com', 'Uber': 'uber.com', 'UnitedHealth': 'uhg.com', 'Walmart': 'walmart.com', 'Wipro': 'wipro.com',
  'Workday': 'workday.com', 'Zendesk': 'zendesk.com', 'Zomato': 'zomato.com', 'Zoho': 'zoho.com',
  'Meta': 'meta.com', 'HCL': 'hcltech.com', 'LTIMindtree': 'ltimindtree.com', 'Mphasis': 'mphasis.com',
  'PwC': 'pwc.com', 'Razorpay': 'razorpay.com', 'Postman': 'postman.com', 'BrowserStack': 'browserstack.com',
  'Jio': 'jio.com', 'Snowflake': 'snowflake.com', 'Capgemini': 'capgemini.com', 'Accenture': 'accenture.com'
};

const getLogoUrl = (name: string) => {
  if (!name || name === 'Other') return '';
  const domain = COMPANY_DOMAINS[name] || `${name.toLowerCase().replace(/[\s.]+/g, '')}.com`;
  return `https://img.logo.dev/${domain}?token=pk_WWYqoiQzSIyMyloG92OOgg&size=128&format=png`;
};

const ROLES_DATA = [
  // Software Engineering (CSE/IT)
  { name: 'Software Developer (SDE-1)', tags: ['software'] },
  { name: 'Frontend Developer', tags: ['software', 'design'] },
  { name: 'Backend Developer', tags: ['software', 'infra'] },
  { name: 'Full Stack Developer', tags: ['software'] },
  { name: 'Mobile Developer (Android/iOS)', tags: ['software'] },
  { name: 'System Design', tags: ['software', 'infra'] },
  { name: 'QA / Automation Engineer', tags: ['software', 'qa'] },
  // Advanced Tech & AI
  { name: 'Data Analyst', tags: ['data-ai'] },
  { name: 'Data Scientist', tags: ['data-ai'] },
  { name: 'Machine Learning Engineer', tags: ['data-ai', 'software'] },
  { name: 'AI/LLM Engineer', tags: ['data-ai', 'software'] },
  { name: 'Data Engineer', tags: ['data-ai', 'infra'] },
  { name: 'NLP Engineer', tags: ['data-ai'] },
  { name: 'Computer Vision Engineer', tags: ['data-ai'] },
  // Infrastructure & Cloud
  { name: 'DevOps Engineer', tags: ['infra', 'software'] },
  { name: 'Cloud Architect', tags: ['infra'] },
  { name: 'Site Reliability Engineer (SRE)', tags: ['infra', 'software'] },
  { name: 'Cyber Security Analyst', tags: ['infra', 'security'] },
  { name: 'Network Engineer', tags: ['infra', 'networking', 'ece'] },
  // Niche Tech
  { name: 'Blockchain Developer', tags: ['blockchain'] },
  { name: 'Game Developer', tags: ['gaming'] },
  { name: 'AR/VR Engineer', tags: ['ar-vr'] },
  // Product & Design
  { name: 'Product Manager (PM)', tags: ['product'] },
  { name: 'UI/UX Designer', tags: ['product', 'design'] },
  { name: 'Business Analyst', tags: ['product', 'business', 'data-ai'] },
  { name: 'Technical Program Manager (TPM)', tags: ['product', 'infra'] },
  // Core Engineering - ECE / EEE
  { name: 'Embedded Systems Engineer', tags: ['ece', 'hardware'] },
  { name: 'VLSI Design Engineer', tags: ['vlsi', 'hardware'] },
  { name: 'Electronics Engineer', tags: ['ece'] },
  { name: 'Electrical Engineer', tags: ['eee'] },
  { name: 'Control Systems Engineer', tags: ['eee', 'mech', 'manufacturing'] },
  { name: 'Power Electronics Engineer', tags: ['eee', 'power'] },
  { name: 'Telecom Engineer', tags: ['ece', 'telecom'] },
  // Core Engineering - Mechanical & Civil
  { name: 'Mechanical Engineer', tags: ['mech'] },
  { name: 'Automotive Engineer', tags: ['auto'] },
  { name: 'HVAC Engineer', tags: ['mech', 'manufacturing'] },
  { name: 'Civil Engineer', tags: ['civil'] },
  { name: 'Structural Engineer', tags: ['civil', 'construction'] },
  { name: 'Construction Manager', tags: ['civil', 'construction'] },
  { name: 'Manufacturing Engineer', tags: ['mech', 'manufacturing'] },
  // Business & Management
  { name: 'Management Trainee', tags: ['management', 'business'] },
  { name: 'Marketing Analyst', tags: ['marketing'] },
  { name: 'Sales Executive / B2B', tags: ['sales'] },
  { name: 'HR Generalist', tags: ['hr'] },
  { name: 'Financial Analyst', tags: ['finance'] },
  { name: 'Operations Manager', tags: ['operations'] },
  { name: 'Other', tags: ['all'] }
];

const COMPANY_ROLE_OVERRIDES: Record<string, Record<string, string>> = {
  'Google': {
    'Software Developer (SDE-1)': 'Software Engineer (L3)',
    'Backend Developer': 'Software Engineer (Backend, L3)',
    'Frontend Developer': 'Software Engineer (Frontend, L3)',
    'Product Manager (PM)': 'Associate Product Manager (APM)',
    'Data Scientist': 'Data Scientist (L3)'
  },
  'Amazon': {
    'Software Developer (SDE-1)': 'Software Development Engineer (SDE-1)',
    'Backend Developer': 'SDE-1 (Backend)',
    'Frontend Developer': 'Front-End Engineer (FEE)',
    'Data Analyst': 'Business Intelligence Engineer (BIE)',
    'Data Scientist': 'Applied Scientist'
  },
  'Microsoft': {
    'Software Developer (SDE-1)': 'Software Engineer',
    'Product Manager (PM)': 'Program Manager',
    'Backend Developer': 'Software Engineer (Backend)',
  },
  'Meta': {
    'Software Developer (SDE-1)': 'Software Engineer (E3)',
    'Product Manager (PM)': 'Rotational Product Manager (RPM)'
  },
  'Apple': {
    'Software Developer (SDE-1)': 'Software Engineer (ICT2)',
    'Hardware Engineer': 'Hardware Engineer (ICT2)',
  },
  'TCS': {
    'Software Developer (SDE-1)': 'TCS Ninja / Digital / Prime',
    'Backend Developer': 'TCS Digital (Backend)',
    'Data Analyst': 'TCS Ninja (Data)',
  },
  'Infosys': {
    'Software Developer (SDE-1)': 'System Engineer / DSE / Power Programmer',
  },
  'Cognizant': {
    'Software Developer (SDE-1)': 'GenC / GenC Elevate / GenC Pro / GenC Next / GenC Ace',
  },
  'Wipro': {
    'Software Developer (SDE-1)': 'Project Engineer / Turbo',
  },
  'Accenture': {
    'Software Developer (SDE-1)': 'Associate Software Engineer (ASE)',
  },
  'Deloitte': {
    'Software Developer (SDE-1)': 'Business Technology Analyst (BTA)',
    'Business Analyst': 'Business Technology Analyst (BTA)',
    'Cyber Security Analyst': 'Risk & Financial Advisory Analyst',
    'Data Analyst': 'Analyst - Data & Analytics'
  },
  'PwC': {
    'Software Developer (SDE-1)': 'Associate - Technology Consulting',
    'Business Analyst': 'Associate - Management Consulting'
  },
  'Goldman Sachs': {
    'Software Developer (SDE-1)': 'Analyst (Engineering)',
    'Data Analyst': 'Analyst (Data)',
    'Financial Analyst': 'Analyst (Investment Banking)'
  },
  'J.P. Morgan': {
    'Software Developer (SDE-1)': 'Software Engineer Program (SEP) Analyst',
  }
};

const getRoleDisplayLabel = (roleName: string, companyName: string) => {
  if (companyName && COMPANY_ROLE_OVERRIDES[companyName] && COMPANY_ROLE_OVERRIDES[companyName][roleName]) {
    return COMPANY_ROLE_OVERRIDES[companyName][roleName];
  }
  return roleName;
};

const COMPANIES_DATA = [
  // Big Tech & MAANG
  { name: 'Google', tags: ['software', 'data-ai', 'infra', 'product', 'hardware', 'ece'] },
  { name: 'Amazon', tags: ['software', 'data-ai', 'infra', 'product', 'hardware', 'operations'] },
  { name: 'Microsoft', tags: ['software', 'data-ai', 'infra', 'product', 'hardware', 'gaming'] },
  { name: 'Meta', tags: ['software', 'data-ai', 'infra', 'product', 'hardware', 'ar-vr'] },
  { name: 'Apple', tags: ['software', 'data-ai', 'infra', 'product', 'hardware', 'ece', 'ar-vr', 'vlsi'] },
  { name: 'Netflix', tags: ['software', 'data-ai', 'infra', 'product'] },
  { name: 'Uber', tags: ['software', 'data-ai', 'infra', 'product', 'operations'] },
  { name: 'Atlassian', tags: ['software', 'infra', 'product'] },
  { name: 'Adobe', tags: ['software', 'data-ai', 'product', 'design'] },
  { name: 'Salesforce', tags: ['software', 'infra', 'product', 'sales'] },
  // Trending & Actively Hiring
  { name: 'NVIDIA', tags: ['software', 'data-ai', 'hardware', 'ece', 'eee', 'vlsi'] },
  { name: 'Databricks', tags: ['software', 'data-ai'] },
  { name: 'Snowflake', tags: ['software', 'data-ai'] },
  { name: 'Palo Alto Networks', tags: ['software', 'infra', 'security'] },
  { name: 'Oracle', tags: ['software', 'data-ai', 'infra', 'sales'] },
  { name: 'SAP', tags: ['software', 'data-ai', 'sales'] },
  { name: 'Cisco', tags: ['software', 'infra', 'hardware', 'ece', 'eee', 'sales', 'telecom', 'security'] },
  { name: 'Samsung', tags: ['software', 'hardware', 'ece', 'eee', 'mech'] },
  // Indian Service & Global IT
  { name: 'TCS', tags: ['software', 'data-ai', 'infra', 'it'] },
  { name: 'Infosys', tags: ['software', 'data-ai', 'infra', 'it'] },
  { name: 'Wipro', tags: ['software', 'data-ai', 'infra', 'it'] },
  { name: 'Cognizant', tags: ['software', 'data-ai', 'infra', 'it'] },
  { name: 'Accenture', tags: ['software', 'data-ai', 'infra', 'it', 'consulting'] },
  { name: 'Capgemini', tags: ['software', 'data-ai', 'infra', 'it'] },
  { name: 'Tech Mahindra', tags: ['software', 'infra', 'it', 'telecom'] },
  { name: 'HCL', tags: ['software', 'infra', 'hardware', 'ece', 'it'] },
  { name: 'IBM', tags: ['software', 'data-ai', 'infra', 'hardware', 'ece', 'sales', 'consulting', 'security'] },
  { name: 'LTIMindtree', tags: ['software', 'data-ai', 'it'] },
  { name: 'Mphasis', tags: ['software', 'it'] },
  // Finance & Consulting
  { name: 'Goldman Sachs', tags: ['software', 'data-ai', 'infra', 'finance'] },
  { name: 'Morgan Stanley', tags: ['software', 'data-ai', 'infra', 'finance'] },
  { name: 'J.P. Morgan', tags: ['software', 'data-ai', 'infra', 'finance'] },
  { name: 'Deloitte', tags: ['software', 'data-ai', 'finance', 'consulting', 'it', 'business', 'management'] },
  { name: 'PwC', tags: ['software', 'data-ai', 'finance', 'consulting', 'business', 'management'] },
  { name: 'Barclays', tags: ['software', 'infra', 'finance'] },
  // Startups & Product
  { name: 'Flipkart', tags: ['software', 'data-ai', 'infra', 'product', 'operations'] },
  { name: 'Zomato', tags: ['software', 'data-ai', 'product', 'operations'] },
  { name: 'Swiggy', tags: ['software', 'data-ai', 'product', 'operations'] },
  { name: 'Paytm', tags: ['software', 'data-ai', 'product', 'finance'] },
  { name: 'Cred', tags: ['software', 'data-ai', 'product', 'finance', 'design'] },
  { name: 'Razorpay', tags: ['software', 'data-ai', 'product', 'finance'] },
  { name: 'Postman', tags: ['software', 'product'] },
  { name: 'BrowserStack', tags: ['software', 'infra', 'product'] },
  { name: 'Jio', tags: ['software', 'infra', 'hardware', 'ece', 'eee', 'telecom'] },
  { name: 'MakeMyTrip', tags: ['software', 'data-ai', 'product'] },
  // Core ECE & Hardware
  { name: 'Intel', tags: ['hardware', 'ece', 'software', 'vlsi'] },
  { name: 'Qualcomm', tags: ['hardware', 'ece', 'software', 'telecom', 'vlsi'] },
  { name: 'Texas Instruments', tags: ['hardware', 'ece', 'eee', 'vlsi'] },
  { name: 'AMD', tags: ['hardware', 'ece', 'software', 'vlsi'] },
  { name: 'Broadcom', tags: ['hardware', 'ece', 'telecom', 'vlsi'] },
  { name: 'NXP Semiconductors', tags: ['hardware', 'ece', 'vlsi'] },
  { name: 'Bosch', tags: ['hardware', 'ece', 'eee', 'mech'] },
  // Core EEE & Power
  { name: 'Siemens', tags: ['eee', 'ece', 'mech', 'manufacturing', 'software'] },
  { name: 'ABB', tags: ['eee', 'mech', 'manufacturing'] },
  { name: 'Schneider Electric', tags: ['eee', 'ece', 'manufacturing'] },
  { name: 'General Electric (GE)', tags: ['eee', 'mech', 'manufacturing'] },
  { name: 'Adani Power', tags: ['eee', 'power'] },
  { name: 'Tata Power', tags: ['eee', 'power'] },
  // Core Mechanical & Automotive
  { name: 'Tata Motors', tags: ['mech', 'eee', 'auto'] },
  { name: 'Mahindra & Mahindra', tags: ['mech', 'eee', 'auto'] },
  { name: 'Maruti Suzuki', tags: ['mech', 'auto'] },
  { name: 'Bajaj Auto', tags: ['mech', 'auto'] },
  { name: 'Hero MotoCorp', tags: ['mech', 'auto'] },
  { name: 'Larsen & Toubro (L&T)', tags: ['mech', 'civil', 'eee', 'manufacturing', 'construction'] },
  { name: 'Honda', tags: ['mech', 'auto'] },
  // Core Civil & Construction
  { name: 'Tata Projects', tags: ['civil', 'construction'] },
  { name: 'Shapoorji Pallonji', tags: ['civil', 'construction'] },
  { name: 'Adani Enterprises', tags: ['civil', 'mech', 'power'] },
  { name: 'GMR Group', tags: ['civil', 'construction', 'infra'] },
  { name: 'DLF', tags: ['civil', 'construction'] },
  { name: 'Ultratech Cement', tags: ['civil', 'mech', 'manufacturing'] },
  { name: 'Other', tags: ['all'] }
];

// ─── AI Interview Setup Tab ──────────────────────────────────────────────────

const AIInterviewTab = ({ navigate, quota, readiness }) => {
  const [interviewType, setInterviewType] = useState('technical');
  const [targetRole, setTargetRole] = useState('Software Developer (SDE-1)');
  const [targetCompany, setTargetCompany] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');

  const [types, setTypes] = useState([
    { id: 'technical', typeLabel: '...', label: '...', persona: '...', avatar: '', desc: '...', voice_id: '' },
    { id: 'hr', typeLabel: '...', label: '...', persona: '...', avatar: '', desc: '...', voice_id: '' },
    { id: 'behavioral', typeLabel: '...', label: '...', persona: '...', avatar: '', desc: '...', voice_id: '' },
    { id: 'mixed', typeLabel: '...', label: '...', persona: '...', avatar: '', desc: '...', voice_id: '' },
  ]);

  useEffect(() => {
    // For now, statically assign the corresponding persona to its interview type.
    // Later, when the pool expands, we will shuffle from type-specific pools.
    const tech = PERSONA_POOL[0]; // Adam - Tech Lead
    const hr = PERSONA_POOL[1];   // Bella - HR Manager
    const behavioral = PERSONA_POOL[2]; // Antoni - Behavioral Analyst
    const vp = PERSONA_POOL[3];   // Arnold - Executive VP

    setTypes([
      { id: 'technical', typeLabel: 'Technical Round', label: `Ami ${tech.name}`, persona: tech.persona, avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${tech.seed}&backgroundColor=e0e7ff`, desc: 'Data structures, algorithms & system design.', voice_id: tech.voice_id },
      { id: 'hr', typeLabel: 'HR Round', label: `Ami ${hr.name}`, persona: hr.persona, avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${hr.seed}&backgroundColor=e0e7ff`, desc: 'Culture fit & soft skills evaluation.', voice_id: hr.voice_id },
      { id: 'behavioral', typeLabel: 'Behavioral Round', label: `Ami ${behavioral.name}`, persona: behavioral.persona, avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${behavioral.seed}&backgroundColor=e0e7ff`, desc: 'STAR method & leadership assessment.', voice_id: behavioral.voice_id },
      { id: 'mixed', typeLabel: 'Full Mock Loop', label: `Ami ${vp.name}`, persona: vp.persona, avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${vp.seed}&backgroundColor=e0e7ff`, desc: 'Full technical & behavioral simulation.', voice_id: vp.voice_id },
    ]);
  }, []);

  const filteredRoles = ROLES_DATA.filter(r => {
    if (!targetCompany || targetCompany === 'Other') return true;
    const company = COMPANIES_DATA.find(c => c.name === targetCompany);
    if (!company) return true;
    if (r.tags.includes('all') || company.tags.includes('all')) return true;
    return r.tags.some(tag => company.tags.includes(tag));
  }).map(r => r.name);

  const filteredCompanies = ['', ...COMPANIES_DATA.filter(c => {
    if (!targetRole || targetRole === 'Other') return true;
    const role = ROLES_DATA.find(r => r.name === targetRole);
    if (!role) return true;
    if (c.tags.includes('all') || role.tags.includes('all')) return true;
    return c.tags.some(tag => role.tags.includes(tag));
  }).map(c => c.name)];

  const handleRoleSelect = (newRole: string) => {
    setTargetRole(newRole);
    setIsRoleModalOpen(false);
    setRoleSearch('');
    if (targetCompany && targetCompany !== 'Other') {
      const roleObj = ROLES_DATA.find(r => r.name === newRole);
      const compObj = COMPANIES_DATA.find(c => c.name === targetCompany);
      if (roleObj && compObj && !roleObj.tags.includes('all') && !compObj.tags.includes('all')) {
        const isValid = roleObj.tags.some(tag => compObj.tags.includes(tag));
        if (!isValid) setTargetCompany('');
      }
    }
  };

  const handleCompanySelect = (newCompany: string) => {
    setTargetCompany(newCompany);
    setIsCompanyModalOpen(false);
    setCompanySearch('');
    if (targetRole && targetRole !== 'Other' && newCompany && newCompany !== 'Other') {
      const compObj = COMPANIES_DATA.find(c => c.name === newCompany);
      const roleObj = ROLES_DATA.find(r => r.name === targetRole);
      if (compObj && roleObj && !compObj.tags.includes('all') && !roleObj.tags.includes('all')) {
        const isValid = compObj.tags.some(tag => roleObj.tags.includes(tag));
        if (!isValid) setTargetRole('');
      }
    }
  };

  const displayFilteredRoles = filteredRoles.filter(r => r.toLowerCase().includes(roleSearch.toLowerCase()));
  const displayFilteredCompanies = filteredCompanies.filter(c => c.toLowerCase().includes(companySearch.toLowerCase()));

  const handleStart = () => {
    const selectedType = types.find(t => t.id === interviewType);
    navigate('ai-interview-session', {
      interview_type: interviewType,
      target_role: targetRole,
      target_company: targetCompany || undefined,
      difficulty,
      voice_id: selectedType?.voice_id,
    });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      {/* Readiness Score Hero */}
      {readiness && readiness.total_interviews > 0 && (
        <motion.div variants={itemVariants} className="soft-card p-6 mb-6 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/5 dark:to-violet-500/5 border-indigo-200/50 dark:border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Interview Readiness</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{readiness.readiness_score}</span>
                <span className="text-sm font-bold text-slate-400">/100</span>
              </div>
              {readiness.badge === 'interview_ready' && (
                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <Medal size={12} weight="fill" /> Interview Ready
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-500">{readiness.total_interviews} sessions</p>
              <p className="text-sm font-medium text-slate-500">Avg: {readiness.avg_score}%</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quota limit UI temporarily removed pending redesign */}

      {/* Interview Type Selection */}
      <motion.div variants={itemVariants} className="mb-6">
        <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-3">Interview Type</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {types.map(t => {
            return (
              <motion.button key={t.id} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                onClick={() => setInterviewType(t.id)}
                className={`relative soft-card p-5 text-center transition-all duration-300 border flex flex-col justify-between h-full min-h-[180px] overflow-hidden group ${
                  interviewType === t.id 
                    ? 'border-indigo-400 dark:border-indigo-500/50 bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-500/10 dark:to-transparent shadow-[0_0_15px_rgba(99,102,241,0.25)]' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md bg-white dark:bg-[#111827]'
                }`}>
                
                {/* Glow behind avatar for active state */}
                {interviewType === t.id && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
                )}

                <div className="flex flex-col items-center text-center relative z-10 h-full w-full">
                  <div className="mb-3 w-full flex justify-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${interviewType === t.id ? 'bg-indigo-500 text-white dark:bg-indigo-500 dark:text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {t.typeLabel}
                    </span>
                  </div>

                  <div className={`w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 transition-all duration-300 shadow-sm mb-3 ${interviewType === t.id ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-100 dark:border-slate-700'}`}>
                    <img src={t.avatar} alt={t.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  
                  <h4 className="font-extrabold text-[16px] text-slate-800 dark:text-white leading-tight mb-1">{t.label}</h4>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mb-3">{t.persona}</p>
                  
                  <div className="mt-auto pt-3 w-full border-t border-slate-100 dark:border-slate-800/50">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{t.desc}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Config Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Target Role</label>
          <button 
            onClick={() => setIsRoleModalOpen(true)}
            className="w-full h-[46px] text-left bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm text-slate-800 dark:text-slate-200 hover:border-indigo-500/50 hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <span className="truncate pr-2 font-medium">{getRoleDisplayLabel(targetRole, targetCompany)}</span>
            <CaretRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 shrink-0 transition-colors" />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">Target Company <span className="text-slate-400 font-normal normal-case opacity-70">(optional)</span></label>
          <button 
            onClick={() => setIsCompanyModalOpen(true)}
            className="w-full h-[46px] text-left bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm text-slate-800 dark:text-slate-200 hover:border-indigo-500/50 hover:shadow-sm transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 truncate pr-2">
              {targetCompany && targetCompany !== 'Other' ? (
                <img src={getLogoUrl(targetCompany)} onError={(e) => { e.currentTarget.style.display = 'none' }} alt="" className="w-5 h-5 rounded object-contain bg-white shrink-0" />
              ) : null}
              <span className="truncate font-medium">{targetCompany || '— General —'}</span>
            </div>
            <CaretRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 shrink-0 transition-colors" />
          </button>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">Difficulty</label>
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-full relative">
            {['beginner', 'intermediate', 'advanced'].map(d => {
              const isActive = difficulty === d;
              return (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`relative flex-1 py-2.5 rounded-full text-xs font-bold transition-colors duration-300 z-10 ${
                    isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}>
                  {isActive && (
                    <motion.div layoutId="activeDifficulty" className="absolute inset-0 bg-white dark:bg-indigo-500/20 rounded-full shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  )}
                  <span className="relative z-10">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isRoleModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md"
            onClick={(e) => { if(e.target === e.currentTarget) setIsRoleModalOpen(false) }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] sm:max-h-[80vh]"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <MagnifyingGlass className="w-6 h-6 text-indigo-500" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search roles (e.g. SDE, Data, Civil)..." 
                  value={roleSearch}
                  onChange={e => setRoleSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-base font-medium px-0"
                />
                <button onClick={() => setIsRoleModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 bg-slate-50/50 dark:bg-transparent">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {displayFilteredRoles.map(r => (
                    <button 
                      key={r}
                      onClick={() => handleRoleSelect(r)}
                      className={`text-left px-5 py-3.5 rounded-xl transition-all flex items-center gap-3 border ${targetRole === r ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 shadow-sm' : 'bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm hover:shadow'}`}
                    >
                      <Briefcase className={`w-5 h-5 ${targetRole === r ? 'text-indigo-500' : 'text-slate-400'}`} />
                      <span className="font-semibold text-sm">{getRoleDisplayLabel(r, targetCompany)}</span>
                    </button>
                  ))}
                  {displayFilteredRoles.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-500">
                      <MagnifyingGlass className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium text-lg">No roles found matching "{roleSearch}"</p>
                      <p className="text-sm opacity-70 mt-1">Try a different search term or change your target company.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isCompanyModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md"
            onClick={(e) => { if(e.target === e.currentTarget) setIsCompanyModalOpen(false) }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] sm:max-h-[80vh]"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <MagnifyingGlass className="w-6 h-6 text-indigo-500" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search target company..." 
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-base font-medium px-0"
                />
                <button onClick={() => setIsCompanyModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 bg-slate-50/50 dark:bg-[#0B1120]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {displayFilteredCompanies.map(c => (
                    <button 
                      key={c || 'general'}
                      onClick={() => handleCompanySelect(c)}
                      className={`flex flex-col items-center justify-center gap-4 p-5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1 ${targetCompany === c ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-400 shadow-sm ring-1 ring-indigo-400' : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-sm'}`}
                    >
                      {c && c !== 'Other' ? (
                        <img src={getLogoUrl(c)} onError={(e) => { e.currentTarget.style.display = 'none' }} alt="" className="w-14 h-14 object-contain drop-shadow-sm rounded-xl mix-blend-multiply dark:mix-blend-normal" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                          <Buildings className="w-7 h-7" />
                        </div>
                      )}
                      <span className={`font-bold text-xs text-center line-clamp-2 ${targetCompany === c ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {c || 'General / None'}
                      </span>
                    </button>
                  ))}
                  {displayFilteredCompanies.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-500">
                      <Buildings className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium text-lg">No companies found matching "{companySearch}"</p>
                      <p className="text-sm opacity-70 mt-1">Try a different search term or change your target role.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Button */}
      <motion.div variants={itemVariants}>
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-2xl font-extrabold text-lg transition-all flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(20,184,166,0.25)] hover:shadow-[0_8px_40px_rgb(20,184,166,0.35)] disabled:opacity-50 disabled:cursor-not-allowed">
          <Sparkle size={24} weight="fill" />
          Start Ami Mock Interview
          <ArrowRight size={20} weight="bold" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ─── ATS Resume Scorer Tab (Moved to Career Toolkit) ───────────────────────

// ─── Interview History Tab ───────────────────────────────────────────────────

const HistoryTab = ({ navigate }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    interviewAPI.history().then(res => { setHistory(res.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton variant="content-list" />;

  const completed = history.filter(h => h.status === 'completed');
  const scoreData = completed.slice(0, 10).reverse().map((h, i) => ({
    name: `#${i + 1}`,
    score: h.overall_score || 0,
  }));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      {/* Score Trend */}
      {scoreData.length >= 2 && (
        <motion.div variants={itemVariants} className="soft-card p-5 mb-6">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mb-3">Score Trend</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreData}>
                <defs>
                  <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="bg-white dark:bg-[#1A202C] rounded-xl p-3 shadow-lg border border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-sm text-indigo-600">{payload[0].value}%</p>
                  </div>
                ) : null} />
                <Area type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2} fill="url(#scoreFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <motion.div variants={itemVariants} className="soft-card p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain size={28} weight="duotone" className="text-slate-400" />
          </div>
          <h4 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">No interviews yet</h4>
          <p className="text-sm text-slate-400">Complete your first Ami mock interview to see results here.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {history.map(h => (
            <motion.div key={h.id} variants={itemVariants} whileHover={{ x: 4 }}
              onClick={() => navigate('ai-interview-session', { viewId: h.id })}
              className="soft-card p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${h.status === 'completed' ? 'bg-indigo-50 dark:bg-indigo-500/15' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Brain size={18} weight="duotone" className={h.status === 'completed' ? 'text-indigo-500' : 'text-slate-400'} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-white truncate">
                    {h.interview_type?.charAt(0).toUpperCase() + h.interview_type?.slice(1)} — {h.target_role}
                    {h.target_company && <span className="text-slate-400"> @ {h.target_company}</span>}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {h.question_count} questions • {h.duration_seconds ? `${Math.floor(h.duration_seconds / 60)}m` : '—'} • {h.created_at ? new Date(h.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {h.overall_score != null && (
                  <span className={`text-lg font-extrabold ${h.overall_score >= 70 ? 'text-emerald-600' : h.overall_score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {Math.round(h.overall_score)}%
                  </span>
                )}
                <ArrowRight size={14} weight="bold" className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ─── Prep Resources Tab ──────────────────────────────────────────────────────

const PrepTab = () => {
  const categories = [
    { title: 'Data Structures & Algorithms', desc: 'Arrays, Trees, Graphs, DP, Sorting', icon: Brain, color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500', tips: ['Practice 2-3 problems daily on LeetCode', 'Focus on time & space complexity analysis', 'Master common patterns: sliding window, two pointers, BFS/DFS'] },
    { title: 'System Design', desc: 'Architecture, scalability, trade-offs', icon: Target, color: 'bg-purple-50 dark:bg-purple-500/15 text-purple-500', tips: ['Learn to estimate capacity and throughput', 'Study common designs: URL shortener, chat system, feed', 'Practice drawing architecture diagrams'] },
    { title: 'HR & Behavioral', desc: 'STAR method, culture fit, motivation', icon: Users, color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500', tips: ['Prepare 5-6 STAR stories from projects/internships', 'Practice: "Tell me about yourself" (2 min version)', '"Why this company?" — Research the company beforehand'] },
    { title: 'Aptitude & Reasoning', desc: 'Quantitative, logical, verbal', icon: Lightning, color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-500', tips: ['Practice speed math: percentages, averages, ratios', 'Solve 10 logical reasoning puzzles daily', 'Read comprehension passages to improve verbal'] },
  ];

  const starMethod = [
    { letter: 'S', word: 'Situation', desc: 'Set the scene. What was the context? When and where did it happen?' },
    { letter: 'T', word: 'Task', desc: 'What was your specific role? What was expected of you?' },
    { letter: 'A', word: 'Action', desc: 'What steps did you take? Be specific about YOUR contribution.' },
    { letter: 'R', word: 'Result', desc: 'What was the outcome? Quantify if possible. What did you learn?' },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <motion.div key={i} variants={itemVariants} className="soft-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                  <Icon size={20} weight="duotone" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{cat.title}</h4>
                  <p className="text-xs text-slate-400">{cat.desc}</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {cat.tips.map((tip, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <CaretRight size={12} weight="bold" className="text-indigo-500 mt-1 shrink-0" />{tip}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </motion.div>

      {/* STAR Method Guide */}
      <motion.div variants={itemVariants} className="soft-card p-6">
        <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Star size={22} weight="fill" className="text-amber-500" /> STAR Method for Behavioral Questions
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {starMethod.map((s, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-2 text-white font-extrabold text-lg">{s.letter}</div>
              <p className="font-extrabold text-sm text-slate-800 dark:text-white mb-1">{s.word}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main War Room Page ──────────────────────────────────────────────────────

const InterviewWarRoom = ({ navigate, user }) => {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('warroom_tab') || 'interview');
  const [quota, setQuota] = useState(null);
  const [readiness, setReadiness] = useState(null);

  useEffect(() => { sessionStorage.setItem('warroom_tab', activeTab); }, [activeTab]);
  useEffect(() => {
    interviewAPI.getQuota().then(res => setQuota(res.data)).catch(() => {});
    interviewAPI.readiness().then(res => setReadiness(res.data)).catch(() => {});
  }, []);

  const tabs = [
    { id: 'interview', label: 'Ami Interview', icon: Microphone },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'prep', label: 'Prep Hub', icon: Fire },
    { id: 'toolkit', label: 'Career Toolkit', icon: Toolbox },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader navigate={navigate} user={user} title="Interview War Room" subtitle="Powered by Ami" maxWidth="max-w-7xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 p-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-full mb-8 hide-scrollbar relative">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 whitespace-nowrap z-10 ${
                  isActive
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {isActive && (
                  <motion.div layoutId="activeWarRoomTab" className="absolute inset-0 bg-white dark:bg-indigo-500/20 rounded-full shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={16} weight={isActive ? 'fill' : 'duotone'} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'interview' && <AIInterviewTab key="interview" navigate={navigate} quota={quota} readiness={readiness} />}
          {activeTab === 'history' && <HistoryTab key="history" navigate={navigate} />}
          {activeTab === 'prep' && <PrepTab key="prep" />}
          {activeTab === 'toolkit' && (
            <motion.div key="toolkit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
                <motion.div variants={itemVariants} className="soft-card p-8 sm:p-12 text-center bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/5 dark:to-violet-500/5 border-indigo-200/50 dark:border-indigo-500/20">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Toolbox size={32} weight="duotone" className="text-white" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Career Toolkit</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">8 AI-powered tools: Cover Letter Generator, JD Analyzer, Cold Email Drafter, Skill Gap Analyzer, HR Round Simulator, DSA Recommender, Career Path Explorer & Company Intel Cards.</p>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('career-toolkit')}
                    className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl font-extrabold text-base shadow-lg shadow-indigo-500/20 inline-flex items-center gap-2">
                    <Sparkle size={18} weight="fill" /> Open Career Toolkit <ArrowRight size={16} weight="bold" />
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InterviewWarRoom;
