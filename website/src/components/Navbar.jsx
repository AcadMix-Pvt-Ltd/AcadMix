import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X, Sun, Moon } from '@phosphor-icons/react';
import AcadMixLogo from './AcadMixLogo';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Roles', href: '#roles' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
];

const Navbar = ({ isDark, toggleTheme }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: scrolled ? '.75rem 0' : '1.25rem 0',
          background: scrolled ? 'rgba(var(--bg), .85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(var(--border), .3)' : '1px solid transparent',
          transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <a href="#hero" style={{ display: 'flex', alignItems: 'center' }}>
            <AcadMixLogo size={36} />
          </a>

          {/* Desktop links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="nav-desktop">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '.9rem',
                  fontWeight: 500,
                  color: 'rgb(var(--text-secondary))',
                  transition: 'color .2s',
                  position: 'relative',
                }}
                onMouseEnter={e => e.target.style.color = 'rgb(var(--indigo))'}
                onMouseLeave={e => e.target.style.color = 'rgb(var(--text-secondary))'}
              >
                {link.label}
              </a>
            ))}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: 40, height: 40,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(var(--surface), .8)',
                border: '1px solid rgba(var(--border), .5)',
                color: 'rgb(var(--text-secondary))',
                transition: 'all .2s',
              }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
            </button>

            {/* CTA */}
            <a href="https://demo.acadmix.org" className="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer">
              See Ami
            </a>
          </div>

          {/* Mobile hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }} className="nav-mobile">
            <button
              onClick={toggleTheme}
              style={{
                width: 36, height: 36,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(var(--surface), .8)',
                border: '1px solid rgba(var(--border), .5)',
                color: 'rgb(var(--text-secondary))',
              }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                width: 36, height: 36,
                borderRadius: 'var(--radius)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(var(--surface), .8)',
                border: '1px solid rgba(var(--border), .5)',
                color: 'rgb(var(--text))',
              }}
            >
              {mobileOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 70,
              left: '1rem', right: '1rem',
              zIndex: 999,
              background: 'rgba(var(--surface), .95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(var(--border), .3)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '.75rem 1rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'rgb(var(--text))',
                  borderRadius: 'var(--radius)',
                  transition: 'background .2s',
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(var(--indigo), .08)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://demo.acadmix.org"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              See Ami
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .nav-mobile { display: flex; }
        .nav-desktop { display: none !important; }
        @media (min-width: 768px) {
          .nav-mobile { display: none !important; }
          .nav-desktop { display: flex !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
