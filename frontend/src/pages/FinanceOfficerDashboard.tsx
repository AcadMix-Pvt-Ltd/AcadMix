import React from 'react';
import DashboardHeader from '../components/DashboardHeader';
import { motion } from 'framer-motion';
import { Bank, Moon, SignOut, Sun, UserCircle } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import FinanceCoreSuite from '../components/admin/FinanceCoreSuite';

const FinanceOfficerDashboard = ({ user, onLogout }) => {
  const { isDark, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <DashboardHeader 
        user={user} 
        title="FinanceOfficer Dashboard" 
        onLogout={onLogout} 
        onProfileClick={() => navigate('faculty-profile')} 
      />


      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Finance Office</h2>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">Fee structures, allocations, reports, concessions, and refunds</p>
        </motion.div>
        <FinanceCoreSuite defaultView="finance" allowedViews={['finance', 'cashier']} />
      </div>
    </div>
  );
};

export default FinanceOfficerDashboard;
