import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Moon, SignOut, Sun, UserCircle } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import FinanceCoreSuite from '../components/admin/FinanceCoreSuite';

const CashierDashboard = ({ user, onLogout }) => {
  const { isDark, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <header className="glass-header">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <CreditCard size={22} weight="duotone" className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AcadMix</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Cashier Counter</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
              {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
            </button>
            <div className="hidden sm:flex items-center gap-3 bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-2 border border-slate-100 dark:border-white/5">
              <UserCircle size={22} weight="duotone" className="text-emerald-500" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{user?.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-tight mt-0.5">Cashier</p>
              </div>
            </div>
            <button onClick={onLogout} className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
              <SignOut size={20} weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Fee Counter</h2>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">Collect fees, print receipts, and close the counter shift</p>
        </motion.div>
        <FinanceCoreSuite defaultView="cashier" allowedViews={['cashier']} />
      </div>
    </div>
  );
};

export default CashierDashboard;
