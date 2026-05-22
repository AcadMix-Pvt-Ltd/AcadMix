import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Exam, ChartLineUp, Briefcase, Buildings,
  ClipboardText, Robot, ShieldCheck, UsersThree
} from '@phosphor-icons/react';

const features = [
  {
    icon: Briefcase,
    title: 'Placement Uplift Engine',
    description: 'Track student readiness, campus drives, recruiter pipelines, resume scores, mock interviews, and offer outcomes from one T&P command center.',
    color: 'var(--purple)',
    tag: 'ROI Wedge',
  },
  {
    icon: Robot,
    title: 'Ami Intelligence Layer',
    description: 'Ami acts as student career coach, faculty assistant, admin analyst, compliance helper, and placement intelligence system across the campus.',
    color: 'var(--rose)',
    tag: 'Vertex AI',
  },
  {
    icon: Exam,
    title: 'Quiz, Assignment & Exam Engine',
    description: 'Faculty can create quizzes, assignments, coding questions, and proctored exams with real-time monitoring, auto-grading, and anti-cheat telemetry.',
    color: 'var(--indigo)',
    tag: 'AI-Proctored',
  },
  {
    icon: ChartLineUp,
    title: 'Career & Academic Analytics',
    description: 'Connect classroom performance, skills, attendance, interview readiness, and placement outcomes so leaders can see where students need support.',
    color: 'var(--emerald)',
    tag: 'Real-time',
  },
  {
    icon: Buildings,
    title: 'Smart Campus Modules',
    description: 'Hostel, transport, library, visitors, IoT hooks, payments, notifications, and student life modules make the campus feel modern and connected.',
    color: 'var(--teal)',
    tag: 'Integrated',
  },
  {
    icon: ClipboardText,
    title: 'Accreditation & Compliance',
    description: 'Generate NIRF, NBA, NAAC, NEP, and internal evidence reports with less manual work and cleaner institutional data trails.',
    color: 'var(--amber)',
    tag: 'Reports',
  },
  {
    icon: UsersThree,
    title: 'Role-Based Access',
    description: 'Student, faculty, HOD, principal, TPO, admin, parent, alumni, industry, warden, exam cell, and more each get a tailored workflow.',
    color: 'var(--indigo)',
    tag: '14 Roles',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-Tenant Security',
    description: 'Each college gets its own subdomain with isolated data. Row-level security, JWT auth, and configurable RBAC policies.',
    color: 'var(--emerald)',
    tag: 'Enterprise',
  },
];

const FeatureCard = ({ feature, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.5, type: 'spring', stiffness: 100 }}
      className="glass-card"
      style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{
        position: 'absolute',
        top: 0, right: 0,
        width: 120, height: 120,
        background: `radial-gradient(circle, rgba(${feature.color}, .08), transparent 70%)`,
        borderRadius: '50%',
        transform: 'translate(30%, -30%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{
            width: 52, height: 52,
            borderRadius: 'var(--radius)',
            background: `rgba(${feature.color}, .1)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid rgba(${feature.color}, .15)`,
          }}>
            <feature.icon size={26} weight="duotone" style={{ color: `rgb(${feature.color})` }} />
          </div>
          <span style={{
            fontSize: '.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            color: `rgb(${feature.color})`,
            background: `rgba(${feature.color}, .08)`,
            padding: '.25rem .625rem',
            borderRadius: 999,
            border: `1px solid rgba(${feature.color}, .15)`,
          }}>
            {feature.tag}
          </span>
        </div>

        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'rgb(var(--text))',
          marginBottom: '.625rem',
          letterSpacing: '-0.01em',
        }}>
          {feature.title}
        </h3>

        <p style={{
          fontSize: '.9rem',
          color: 'rgb(var(--text-secondary))',
          lineHeight: 1.65,
        }}>
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
};

const Features = () => {
  const titleRef = useRef(null);
  const titleInView = useInView(titleRef, { once: true, margin: '-100px' });

  return (
    <section id="features" className="section" style={{ position: 'relative' }}>
      <div className="gradient-bg" style={{ opacity: .5 }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <span className="badge badge-teal" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
            Platform Features
          </span>
          <h2 className="section-title">
            Start with placements,{' '}
            <span className="text-gradient">expand into a smart campus</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            AcadMix leads with measurable student career readiness, then unifies academic ERP, compliance, operations, and campus life around Ami.
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}>
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
