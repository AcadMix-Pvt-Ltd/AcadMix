import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

function useCounter(end, duration = 2000, startCounting = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startCounting) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, startCounting]);
  return count;
}

const stats = [
  { value: 5, suffix: '/mo', label: 'Free AI Interviews', desc: 'Monthly Ami mock interviews per student' },
  { value: 14, suffix: '+', label: 'Campus Roles', desc: 'Tailored workflows for every stakeholder' },
  { value: 8, suffix: '+', label: 'Smart Modules', desc: 'Placements, academics, hostel, transport & more' },
  { value: 99.9, suffix: '%', label: 'Uptime SLA', desc: 'Enterprise-grade reliability' },
];

const StatCard = ({ stat, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const count = useCounter(stat.value, 2000, isInView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 100 }}
      style={{
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
      }}
    >
      <div style={{
        fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
        fontWeight: 900,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        marginBottom: '.75rem',
      }}>
        <span className="text-gradient">{Number.isInteger(stat.value) ? count : count.toFixed(1)}</span>
        <span className="text-gradient">{stat.suffix}</span>
      </div>
      <div style={{
        fontSize: '1rem',
        fontWeight: 700,
        color: 'rgb(var(--text))',
        marginBottom: '.375rem',
      }}>
        {stat.label}
      </div>
      <div style={{
        fontSize: '.85rem',
        color: 'rgb(var(--text-muted))',
        lineHeight: 1.5,
      }}>
        {stat.desc}
      </div>
    </motion.div>
  );
};

const Stats = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="section" style={{ position: 'relative' }}>
      <div className="container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          className="glass-card"
          style={{
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(var(--indigo), .03), rgba(var(--purple), .02), rgba(var(--teal), .03))',
            zIndex: 0,
          }} />

          {stats.map((stat, i) => (
            <div key={i} style={{
              position: 'relative', zIndex: 1,
              borderRight: i < stats.length - 1 ? '1px solid rgba(var(--border), .3)' : 'none',
            }}>
              <StatCard stat={stat} index={i} />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Stats;
