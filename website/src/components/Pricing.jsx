import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, X, Lightning } from '@phosphor-icons/react';

const plans = [
  {
    name: 'Starter',
    price: '₹29,999',
    period: '/year',
    desc: 'For colleges starting with modern academic workflows and student-facing digital experiences.',
    color: 'var(--teal)',
    popular: false,
    features: [
      { text: 'Up to 500 students', included: true },
      { text: 'Quiz & Exam Engine', included: true },
      { text: 'Marks Management', included: true },
      { text: 'Student Dashboard', included: true },
      { text: 'Faculty Dashboard', included: true },
      { text: 'Basic Analytics', included: true },
      { text: 'Ami Career Tools', included: false },
      { text: 'Placement Uplift Engine', included: false },
      { text: 'Hostel Management', included: false },
      { text: 'Custom Subdomain', included: false },
    ],
  },
  {
    name: 'Professional',
    price: '₹79,999',
    period: '/year',
    desc: 'The placement-first smart campus plan for colleges ready to improve student outcomes.',
    color: 'var(--indigo)',
    popular: true,
    features: [
      { text: 'Up to 5,000 students', included: true },
      { text: 'All Starter features', included: true },
      { text: 'AI Proctoring', included: true },
      { text: 'Placement Uplift Engine', included: true },
      { text: 'Hostel Management', included: true },
      { text: 'Ami Career Toolkit', included: true },
      { text: 'Advanced Analytics', included: true },
      { text: 'Custom Subdomain', included: true },
      { text: 'Priority Support', included: true },
      { text: 'Custom Domain Mapping', included: false },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For college groups building a full AI-native smart campus ecosystem at scale.',
    color: 'var(--purple)',
    popular: false,
    features: [
      { text: 'Unlimited students', included: true },
      { text: 'All Professional features', included: true },
      { text: 'Multi-college setup', included: true },
      { text: 'NIRF/NBA/NAAC report workflows', included: true },
      { text: 'Custom Domain Mapping', included: true },
      { text: 'White-label branding', included: true },
      { text: 'API access', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'SLA guarantee', included: true },
      { text: 'On-premise option', included: true },
      { text: 'Custom integrations', included: true },
    ],
  },
];

const PricingCard = ({ plan, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 100 }}
      className="glass-card"
      style={{
        padding: '2.5rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: plan.popular
          ? `2px solid rgba(${plan.color}, .4)`
          : undefined,
      }}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.25rem',
          background: `linear-gradient(135deg, rgb(${plan.color}), rgb(var(--purple)))`,
          color: '#fff',
          padding: '.25rem .75rem',
          borderRadius: 999,
          fontSize: '.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          display: 'flex',
          alignItems: 'center',
          gap: '.25rem',
        }}>
          <Lightning size={12} weight="fill" />
          Most Popular
        </div>
      )}

      {/* Glow for popular */}
      {plan.popular && (
        <div style={{
          position: 'absolute',
          inset: -1,
          background: `linear-gradient(135deg, rgba(${plan.color}, .06), rgba(var(--purple), .04))`,
          zIndex: 0,
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Plan name */}
        <div style={{
          fontSize: '.85rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.08em', color: `rgb(${plan.color})`,
          marginBottom: '1rem',
        }}>
          {plan.name}
        </div>

        {/* Price */}
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'rgb(var(--text))' }}>
            {plan.price}
          </span>
          {plan.period && (
            <span style={{ fontSize: '.9rem', color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
              {plan.period}
            </span>
          )}
        </div>

        <p style={{
          fontSize: '.9rem', color: 'rgb(var(--text-secondary))', lineHeight: 1.6,
          marginBottom: '2rem', minHeight: '3rem',
        }}>
          {plan.desc}
        </p>

        {/* Features */}
        <div style={{ flex: 1, marginBottom: '2rem' }}>
          {plan.features.map((feat, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '.625rem',
              padding: '.5rem 0',
              borderBottom: i < plan.features.length - 1 ? '1px solid rgba(var(--border), .15)' : 'none',
            }}>
              {feat.included ? (
                <Check size={16} weight="bold" style={{ color: 'rgb(var(--emerald))', flexShrink: 0 }} />
              ) : (
                <X size={16} weight="bold" style={{ color: 'rgb(var(--text-muted))', opacity: .4, flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: '.875rem',
                fontWeight: 500,
                color: feat.included ? 'rgb(var(--text))' : 'rgb(var(--text-muted))',
                opacity: feat.included ? 1 : .5,
              }}>
                {feat.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href="#contact"
          className={plan.popular ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ width: '100%' }}
        >
          {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
        </a>
      </div>
    </motion.div>
  );
};

const Pricing = () => {
  const titleRef = useRef(null);
  const titleInView = useInView(titleRef, { once: true, margin: '-100px' });

  return (
    <section id="pricing" className="section" style={{ position: 'relative' }}>
      <div className="gradient-bg" style={{ opacity: .4 }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <span className="badge badge-indigo" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
            Pricing Plans
          </span>
          <h2 className="section-title">
            Simple, transparent{' '}
            <span className="text-gradient">pricing</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            Choose the plan that fits your institution. Upgrade anytime as you grow.
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          maxWidth: 1100,
          margin: '0 auto',
        }}>
          {plans.map((plan, i) => (
            <PricingCard key={i} plan={plan} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
