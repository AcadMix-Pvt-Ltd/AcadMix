import React, { createContext, useContext, useMemo, ReactNode } from 'react';

export interface TenantConfig {
  tenantSlug: string | null;
  tenantName: string | null;
  tenantId?: string | null;
  logo: string | null;
  isDemo: boolean;
  isLocalDev: boolean;
}

const TenantContext = createContext<TenantConfig>({
  tenantSlug: null,
  tenantName: null,
  logo: null,
  isDemo: false,
  isLocalDev: false,
});

/**
 * Maps subdomain slugs to college display names and branding.
 * logo: path relative to /public (served at root by Vite)
 * In production, this would be fetched from the API.
 */
const TENANT_MAP: Record<string, { name: string; id: string; logo: string | null }> = {
  demo: { name: 'Demo College', id: 'DEMO', logo: null },
  aits: { name: 'AITS', id: 'aits-hyd-001', logo: '/logos/aits-emblem.png' },
  gnitc: { name: 'GNITC - Guru Nanak Institute of Technology', id: 'GNITC', logo: null },
  gnitr: { name: 'GNITR - Guru Nanak IT Research', id: 'GNITR', logo: null },
  gnits: { name: 'GNITS - Guru Nanak IT Sciences', id: 'GNITS', logo: null },
};

/**
 * Extracts the tenant slug from the current hostname.
 *
 * Patterns handled:
 * - localhost / 127.0.0.1 → null (local dev)
 * - acadmix.org / www.acadmix.org → null (landing site)
 * - demo.acadmix.org → "demo"
 * - gnitc.acadmix.org → "gnitc"
 * - demo.localhost → "demo" (local dev testing)
 * - Custom domains via tenant-config API (future)
 */
function detectTenant(hostname: string): string | null {
  // Local dev without subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  // Local dev with subdomain (e.g., demo.localhost)
  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '');
  }

  // Production: extract subdomain from acadmix.org
  const domainParts = hostname.split('.');
  if (domainParts.length >= 3) {
    const subdomain = domainParts[0];
    // Skip www
    if (subdomain === 'www') return null;
    return subdomain;
  }

  // Bare acadmix.org → landing site (no tenant)
  return null;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const tenant = useMemo(() => {
    const hostname = window.location.hostname;
    const slug = detectTenant(hostname);
    const config = slug ? TENANT_MAP[slug] : null;

    return {
      tenantSlug: slug,
      tenantName: config?.name || (slug ? slug.toUpperCase() : null),
      tenantId: config?.id || (slug ? slug.toUpperCase() : null),
      logo: config?.logo || null,
      isDemo: slug === 'demo',
      isLocalDev: hostname === 'localhost' || hostname === '127.0.0.1',
    };
  }, []);

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

export default TenantContext;
