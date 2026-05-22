import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { PaperPlaneTilt, ArrowRight, CheckCircle } from '@phosphor-icons/react';

const CTA = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', college: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production, this would submit to an API
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ name: '', email: '', college: '', message: '' });
  };

  return (
    <section id="contact" className="section" style={{ position: 'relative' }}>
      <div className="gradient-bg" />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, type: 'spring', stiffness: 80 }}
          className="glass-card"
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            padding: '3rem 2rem',
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '3rem',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Decorative glow */}
          <div style={{
            position: 'absolute',
            top: -100, right: -100,
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(var(--indigo), .1), transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
          }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', position: 'relative', zIndex: 1 }}>
            {/* Left: Info */}
            <div>
              <span className="badge badge-indigo" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
                Start with Placement Uplift
              </span>
              <h2 style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                marginBottom: '1rem',
              }}>
                Ready to turn your college into a{' '}
                <span className="text-gradient">smart campus?</span>
              </h2>
              <p style={{
                fontSize: '1rem',
                color: 'rgb(var(--text-secondary))',
                lineHeight: 1.7,
                marginBottom: '2rem',
              }}>
                Start with a leadership demo focused on placement readiness, Ami-powered student experiences, and the path to a full AI-native campus ERP.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[
                  'Placement-readiness walkthrough for your leadership team',
                  'Ami career tools and 5 free AI mock interviews per student',
                  'NIRF, NBA, NAAC, and NEP reporting workflows',
                  'Smart campus expansion plan across modules',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
                    <CheckCircle size={20} weight="fill" style={{ color: 'rgb(var(--emerald))', flexShrink: 0 }} />
                    <span style={{ fontSize: '.9rem', fontWeight: 500, color: 'rgb(var(--text-secondary))' }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Demo CTA */}
              <div style={{ marginTop: '2rem' }}>
                <a
                  href="https://demo.acadmix.org"
                  className="btn btn-secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Or try the live demo first <ArrowRight size={16} weight="bold" />
                </a>
              </div>
            </div>

            {/* Right: Form */}
            <div>
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '2rem',
                  }}
                >
                  <CheckCircle size={64} weight="fill" style={{ color: 'rgb(var(--emerald))', marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '.5rem' }}>Thank you!</h3>
                  <p style={{ color: 'rgb(var(--text-secondary))' }}>We'll get back to you within 24 hours.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgb(var(--text-muted))', marginBottom: '.5rem' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Dr. John Doe"
                      style={{
                        width: '100%',
                        padding: '.875rem 1rem',
                        borderRadius: 'var(--radius)',
                        background: 'rgba(var(--bg-alt), .8)',
                        border: '1px solid rgba(var(--border), .4)',
                        color: 'rgb(var(--text))',
                        fontSize: '.9rem',
                        fontWeight: 500,
                        outline: 'none',
                        transition: 'border-color .2s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--indigo), .5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--border), .4)'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgb(var(--text-muted))', marginBottom: '.5rem' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="admin@yourcollege.edu"
                      style={{
                        width: '100%',
                        padding: '.875rem 1rem',
                        borderRadius: 'var(--radius)',
                        background: 'rgba(var(--bg-alt), .8)',
                        border: '1px solid rgba(var(--border), .4)',
                        color: 'rgb(var(--text))',
                        fontSize: '.9rem',
                        fontWeight: 500,
                        outline: 'none',
                        transition: 'border-color .2s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--indigo), .5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--border), .4)'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgb(var(--text-muted))', marginBottom: '.5rem' }}>
                      College / Institution Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.college}
                      onChange={e => setFormData(p => ({ ...p, college: e.target.value }))}
                      placeholder="e.g., GNITC, JNTUH, IIT-H"
                      style={{
                        width: '100%',
                        padding: '.875rem 1rem',
                        borderRadius: 'var(--radius)',
                        background: 'rgba(var(--bg-alt), .8)',
                        border: '1px solid rgba(var(--border), .4)',
                        color: 'rgb(var(--text))',
                        fontSize: '.9rem',
                        fontWeight: 500,
                        outline: 'none',
                        transition: 'border-color .2s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--indigo), .5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--border), .4)'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgb(var(--text-muted))', marginBottom: '.5rem' }}>
                      Message (Optional)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                      placeholder="Tell us about your placement goals, ERP needs, or smart campus plans..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '.875rem 1rem',
                        borderRadius: 'var(--radius)',
                        background: 'rgba(var(--bg-alt), .8)',
                        border: '1px solid rgba(var(--border), .4)',
                        color: 'rgb(var(--text))',
                        fontSize: '.9rem',
                        fontWeight: 500,
                        outline: 'none',
                        transition: 'border-color .2s',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--indigo), .5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--border), .4)'}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '.5rem' }}
                  >
                    Book a Placement Demo <PaperPlaneTilt size={18} weight="fill" />
                  </motion.button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
