import React, { useState } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import { motion } from 'framer-motion';
import { Buildings, SignOut, Sun, Moon, MapPin, Users, ChartLine, Bell } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';
import CampusMap from '../components/campus/CampusMap';
import EventApprovalPanel from '../components/campus/EventApprovalPanel';

const DirectorDashboard = ({ navigate, user, onLogout }: any) => {
  const { isDark, toggle: toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'approvals', label: '📋 Approvals' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      {/* Header */}
      <DashboardHeader 
        user={user} 
        title="Director Dashboard" 
        onLogout={onLogout} 
        onProfileClick={() => navigate('faculty-profile')} 
      />


      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Group-level event approvals & campus overview</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 p-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-xl mb-8 hide-scrollbar">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border border-transparent ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shadow-sm dark:border-indigo-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>{tab.label}</button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveTab('approvals')}
                className="soft-card p-6 flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                    <span className="text-2xl">📋</span>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Event Approvals</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Review and approve events</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-colors">
                  <span className="text-amber-500 font-bold">→</span>
                </div>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveTab('campus')}
                className="soft-card p-6 flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                    <MapPin size={24} weight="duotone" className="text-rose-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Campus Map</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Live infrastructure view</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 transition-colors">
                  <span className="text-rose-500 font-bold">→</span>
                </div>
              </motion.button>
            </div>
          </div>
        )}
        {activeTab === 'approvals' && <EventApprovalPanel user={user} />}
        {activeTab === 'campus' && <CampusMap user={user} navigate={navigate} />}
      </div>
    </div>
  );
};

export default DirectorDashboard;
