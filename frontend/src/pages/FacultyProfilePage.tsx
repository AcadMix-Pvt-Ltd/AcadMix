import React from 'react';
import PageHeader from '../components/PageHeader';
import FacultyProfile from '../components/faculty/FacultyProfile';
import { motion } from 'framer-motion';

interface FacultyProfilePageProps {
  navigate: (path: string, state?: any) => void;
  user: any;
}

const FacultyProfilePage: React.FC<FacultyProfilePageProps> = ({ navigate, user }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user}
        title="Faculty Profile"
        subtitle="Manage your academic profile & publications"
        backTo="teacher-dashboard"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
          <FacultyProfile />
        </motion.div>
      </div>
    </div>
  );
};

export default FacultyProfilePage;
