import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from '@phosphor-icons/react';

const Hero = () => {
  return (
    <section id="hero" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      {/* Animated background */}
      <div className="gradient-bg" />
      <div className="grid-overlay" />

      {/* Floating orbs */}
      <motion.div
        animate={{ y: [-20, 20, -20], x: [-10, 15, -10] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '15%', right: '10%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--indigo), .12) 0%, transparent 70%)',
          filter: 'blur(40px)', zIndex: 0,
        }}
      />
      <motion.div
        animate={{ y: [15, -25, 15], x: [10, -20, 10] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute', bottom: '20%', left: '5%',
          width: 250, height: 250, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--teal), .1) 0%, transparent 70%)',
          filter: 'blur(40px)', zIndex: 0,
        }}
      />

      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="badge badge-indigo font-mono" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--emerald))', display: 'inline-block' }} />
              Placement-first AI Smart Campus ERP
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 100 }}
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              marginBottom: '1.5rem',
            }}
          >
            Turn your college into an{' '}
            <span className="text-gradient">AI-native smart campus</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'rgb(var(--text-secondary))',
              lineHeight: 1.7,
              maxWidth: 600,
              margin: '0 auto 2.5rem',
            }}
          >
            AcadMix helps colleges improve placements, automate academic and compliance workflows, and give students a gamified, career-focused campus experience through Ami, the AcadMix Intelligence layer.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <a href="#contact" className="btn btn-primary btn-lg">
              Book a Placement Demo <ArrowRight size={20} weight="bold" />
            </a>
            <a href="https://demo.acadmix.org" className="btn btn-secondary btn-lg" target="_blank" rel="noopener noreferrer">
              <Play size={18} weight="fill" /> Live Demo
            </a>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            style={{
              marginTop: '4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem',
              flexWrap: 'wrap',
              color: 'rgb(var(--text-muted))',
              fontSize: '.85rem',
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgb(var(--emerald))' }} />
              Ami Intelligence
            </span>
            <span style={{ width: 1, height: 16, background: 'rgba(var(--border), .5)' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgb(var(--indigo))' }} />
              Placement Uplift
            </span>
            <span style={{ width: 1, height: 16, background: 'rgba(var(--border), .5)' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgb(var(--purple))' }} />
              Smart Campus ERP
            </span>
            <span style={{ width: 1, height: 16, background: 'rgba(var(--border), .5)' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgb(var(--teal))' }} />
              NAAC / NBA / NIRF Ready
            </span>
          </motion.div>
        </div>

        {/* Floating dashboard preview cards */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, type: 'spring', stiffness: 60 }}
          style={{
            marginTop: '4rem',
            position: 'relative',
            maxWidth: 900,
            margin: '4rem auto 0',
            perspective: 1200,
          }}
        >
          {/* Main card */}
          <div className="glass-card" style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-xl)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Mock dashboard header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem',
              paddingBottom: '.75rem', borderBottom: '1px solid rgba(var(--border), .3)',
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
                demo.acadmix.org
              </span>
            </div>

            {/* Mock dashboard content */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Placement Ready', value: '1,248', color: 'var(--indigo)', growth: '+18%' },
                { label: 'AI Interviews', value: '5/mo', color: 'var(--teal)', growth: 'free per student' },
                { label: 'Ami Readiness', value: '87.3%', color: 'var(--emerald)', growth: '+2.1%' },
                { label: 'Campus Drives', value: '156', color: 'var(--purple)', growth: '+23' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius)',
                    background: `rgba(${stat.color}, .06)`,
                    border: `1px solid rgba(${stat.color}, .12)`,
                  }}
                >
                  <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'rgb(var(--text-muted))', marginBottom: '.5rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: `rgb(${stat.color})`, lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '.7rem', fontWeight: 600, color: 'rgb(var(--emerald))', marginTop: '.375rem' }}>
                    {stat.growth}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Glow effect behind */}
          <div style={{
            position: 'absolute',
            inset: '-20px',
            background: 'linear-gradient(135deg, rgba(var(--indigo), .1), rgba(var(--purple), .08), rgba(var(--teal), .06))',
            borderRadius: 'var(--radius-xl)',
            filter: 'blur(40px)',
            zIndex: -1,
          }} />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
