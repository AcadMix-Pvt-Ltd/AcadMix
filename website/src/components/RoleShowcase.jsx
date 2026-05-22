import React, { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Student, Chalkboard, Crown, Buildings, Briefcase,
  UserCircleGear, UsersThree, ShieldStar, GraduationCap,
  Factory, HouseLine, Certificate
} from '@phosphor-icons/react';

const roles = [
  {
    id: 'student',
    icon: Student,
    name: 'Student',
    color: 'var(--teal)',
    desc: 'Learn through a gamified campus experience, track progress, prepare for placements with Ami, and access 5 free AI mock interviews every month.',
    features: ['5 Free AI Mock Interviews', 'Gamified Progress', 'Resume ATS Scorer', 'Career Tools', 'Placement Readiness', 'Semester Results'],
  },
  {
    id: 'teacher',
    icon: Chalkboard,
    name: 'Faculty',
    color: 'var(--indigo)',
    desc: 'Create quizzes, assignments, assessments, teaching records, and class analytics faster with Ami-assisted academic workflows.',
    features: ['Quiz Builder', 'Assignments', 'Marks Entry & Approval', 'Class Results', 'Attendance Marking', 'Teaching Records'],
  },
  {
    id: 'hod',
    icon: Crown,
    name: 'HOD',
    color: 'var(--amber)',
    desc: 'Manage department faculty, review and approve marks, handle student management, and access department-level analytics.',
    features: ['Mark Reviews & Approval', 'Faculty Management', 'Student Management', 'Department Analytics', 'Section Management', 'Revision Tracking'],
  },
  {
    id: 'principal',
    icon: ShieldStar,
    name: 'Principal',
    color: 'var(--purple)',
    desc: 'College-wide oversight for placements, academics, compliance, faculty performance, and smart-campus modernization.',
    features: ['Placement Outcomes', 'Institution Analytics', 'Department Comparison', 'Compliance Reports', 'Result Overview', 'Policy Management'],
  },
  {
    id: 'tpo',
    icon: Briefcase,
    name: 'T&P Officer',
    color: 'var(--emerald)',
    desc: 'Track, train, shortlist, and prepare students with AI mock interviews, resume scoring, recruiter analytics, and campus-drive workflows.',
    features: ['Campus Drive Management', 'Ami Readiness Scores', 'Student Shortlisting', 'Company Database', 'Offer Tracking', 'Recruiter Analytics'],
  },
  {
    id: 'admin',
    icon: UserCircleGear,
    name: 'Admin',
    color: 'var(--rose)',
    desc: 'Configure the smart-campus operating layer, manage users, control modules, and generate institutional reports with less manual effort.',
    features: ['User Management', 'NIRF/NBA/NAAC Support', 'System Configuration', 'Multi-Tenant Setup', 'Platform Analytics', 'Access Control'],
  },
  {
    id: 'parent',
    icon: UsersThree,
    name: 'Parent',
    color: 'var(--indigo)',
    desc: 'Track ward\'s academic progress, view attendance records, fee status, and receive notifications about performance.',
    features: ['Academic Progress', 'Attendance Tracking', 'Fee Management', 'Performance Alerts', 'Communication', 'Report Cards'],
  },
  {
    id: 'industry',
    icon: Factory,
    name: 'Industry Partner',
    color: 'var(--teal)',
    desc: 'Post job openings, schedule campus drives, review student profiles, and manage recruitment pipelines.',
    features: ['Job Posting', 'Campus Scheduling', 'Student Profiles', 'Recruitment Pipeline', 'Interview Scheduling', 'Offer Management'],
  },
  {
    id: 'warden',
    icon: HouseLine,
    name: 'Warden',
    color: 'var(--amber)',
    desc: 'Manage hostel allocations, handle complaints, track room inventory, and oversee mess management.',
    features: ['Room Allocation', 'Complaint Management', 'Inventory Tracking', 'Mess Management', 'Visitor Logs', 'Maintenance Requests'],
  },
  {
    id: 'alumni',
    icon: GraduationCap,
    name: 'Alumni',
    color: 'var(--purple)',
    desc: 'Stay connected with alma mater, mentor students, share job referrals, and participate in college events.',
    features: ['Mentor Students', 'Job Referrals', 'Event Participation', 'Network Directory', 'Success Stories', 'Guest Lectures'],
  },
  {
    id: 'examcell',
    icon: Certificate,
    name: 'Exam Cell',
    color: 'var(--emerald)',
    desc: 'Manage end-term marks, publish results, handle hall tickets, and coordinate examination schedules.',
    features: ['End-term Marks Upload', 'Result Publication', 'Hall Tickets', 'Exam Scheduling', 'Grade Computation', 'Transcript Generation'],
  },
  {
    id: 'nodal',
    icon: Buildings,
    name: 'Nodal Officer',
    color: 'var(--rose)',
    desc: 'Government oversight dashboard with multi-college comparison, regulatory compliance tracking, and policy monitoring.',
    features: ['Multi-College Oversight', 'Compliance Tracking', 'Policy Monitoring', 'Data Aggregation', 'Regulatory Reports', 'College Rankings'],
  },
];

const RoleShowcase = () => {
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const titleRef = useRef(null);
  const titleInView = useInView(titleRef, { once: true, margin: '-100px' });

  return (
    <section id="roles" className="section">
      <div className="container">
        {/* Section header */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <span className="badge badge-purple" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
            Smart Campus Roles
          </span>
          <h2 className="section-title">
            Ami-powered workflows for{' '}
            <span className="text-gradient">every stakeholder</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            AcadMix gives leadership, placement teams, students, faculty, and admins the exact tools they need to improve outcomes without clutter.
          </p>
        </motion.div>

        {/* Role selector pills */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.5rem',
          justifyContent: 'center',
          marginBottom: '2.5rem',
        }}>
          {roles.map(role => (
            <motion.button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '.375rem',
                padding: '.5rem 1rem',
                borderRadius: 999,
                fontSize: '.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all .2s',
                background: selectedRole.id === role.id
                  ? `rgba(${role.color}, .15)`
                  : 'rgba(var(--surface), .6)',
                color: selectedRole.id === role.id
                  ? `rgb(${role.color})`
                  : 'rgb(var(--text-secondary))',
                border: `1px solid ${selectedRole.id === role.id
                  ? `rgba(${role.color}, .3)`
                  : 'rgba(var(--border), .4)'}`,
              }}
            >
              <role.icon size={16} weight="duotone" />
              {role.name}
            </motion.button>
          ))}
        </div>

        {/* Role detail card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedRole.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="glass-card"
            style={{
              maxWidth: 900,
              margin: '0 auto',
              padding: '2.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '2rem',
            }}
          >
            <div>
              {/* Role header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: 64, height: 64,
                  borderRadius: 'var(--radius-lg)',
                  background: `rgba(${selectedRole.color}, .1)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid rgba(${selectedRole.color}, .2)`,
                }}>
                  <selectedRole.icon size={32} weight="duotone" style={{ color: `rgb(${selectedRole.color})` }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {selectedRole.name} Dashboard
                  </h3>
                  <span style={{
                    fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '.08em', color: `rgb(${selectedRole.color})`,
                  }}>
                    Dedicated Portal
                  </span>
                </div>
              </div>

              <p style={{
                fontSize: '1rem',
                color: 'rgb(var(--text-secondary))',
                lineHeight: 1.7,
                marginBottom: '1.5rem',
              }}>
                {selectedRole.desc}
              </p>

              {/* Features grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.75rem' }}>
                {selectedRole.features.map((feat, i) => (
                  <motion.div
                    key={feat}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '.625rem',
                      padding: '.75rem 1rem',
                      borderRadius: 'var(--radius)',
                      background: `rgba(${selectedRole.color}, .04)`,
                      border: `1px solid rgba(${selectedRole.color}, .08)`,
                      fontSize: '.875rem',
                      fontWeight: 500,
                      color: 'rgb(var(--text))',
                    }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: `rgb(${selectedRole.color})`,
                      flexShrink: 0,
                    }} />
                    {feat}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default RoleShowcase;
