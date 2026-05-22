import React from 'react';
import AcadMixLogo from './AcadMixLogo';
import { GithubLogo, LinkedinLogo, TwitterLogo, EnvelopeSimple } from '@phosphor-icons/react';

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Roles', href: '#roles' },
      { label: 'Demo', href: 'https://demo.acadmix.org' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Status Page', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'GDPR', href: '#' },
    ],
  },
];

const socialLinks = [
  { icon: TwitterLogo, href: '#', label: 'Twitter' },
  { icon: LinkedinLogo, href: '#', label: 'LinkedIn' },
  { icon: GithubLogo, href: '#', label: 'GitHub' },
  { icon: EnvelopeSimple, href: 'mailto:hello@acadmix.org', label: 'Email' },
];

const Footer = () => {
  return (
    <footer style={{
      paddingTop: '4rem',
      borderTop: '1px solid rgba(var(--border), .3)',
      background: 'rgba(var(--bg-alt), .5)',
    }}>
      <div className="container">
        {/* Main grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2.5rem',
          paddingBottom: '3rem',
        }}>
          {/* Brand column */}
          <div style={{ gridColumn: 'span 1' }}>
            <AcadMixLogo size={32} />
            <p style={{
              marginTop: '1rem',
              fontSize: '.875rem',
              color: 'rgb(var(--text-secondary))',
              lineHeight: 1.7,
              maxWidth: 260,
            }}>
              AI-powered placement and smart-campus ERP for colleges, powered by Ami, the AcadMix Intelligence layer.
            </p>

            {/* Socials */}
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '1.5rem' }}>
              {socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  aria-label={social.label}
                  style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(var(--surface), .8)',
                    border: '1px solid rgba(var(--border), .3)',
                    color: 'rgb(var(--text-muted))',
                    transition: 'all .2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'rgb(var(--indigo))';
                    e.currentTarget.style.borderColor = 'rgba(var(--indigo), .3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'rgb(var(--text-muted))';
                    e.currentTarget.style.borderColor = 'rgba(var(--border), .3)';
                  }}
                >
                  <social.icon size={18} weight="bold" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((group, i) => (
            <div key={i}>
              <h4 style={{
                fontSize: '.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'rgb(var(--text-muted))',
                marginBottom: '1rem',
              }}>
                {group.title}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {group.links.map((link, j) => (
                  <a
                    key={j}
                    href={link.href}
                    style={{
                      fontSize: '.875rem',
                      color: 'rgb(var(--text-secondary))',
                      fontWeight: 500,
                      transition: 'color .2s',
                      padding: '.125rem 0',
                    }}
                    onMouseEnter={e => e.target.style.color = 'rgb(var(--indigo))'}
                    onMouseLeave={e => e.target.style.color = 'rgb(var(--text-secondary))'}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingTop: '1.5rem',
          paddingBottom: '1.5rem',
          borderTop: '1px solid rgba(var(--border), .2)',
        }}>
          <p style={{ fontSize: '.8rem', color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
            © {new Date().getFullYear()} AcadMix. All rights reserved.
          </p>
          <p style={{ fontSize: '.8rem', color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
            Built with ❤️ for education
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
