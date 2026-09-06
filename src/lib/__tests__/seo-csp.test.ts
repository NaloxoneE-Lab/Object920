// src/lib/__tests__/seo-csp.test.ts
import { describe, it, expect } from 'vitest';
import { buildCsp } from '../seo';

describe('buildCsp', () => {
  it('returns base CSP with no integrations enabled', () => {
    const csp = buildCsp({});
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data: https:");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("media-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toContain('giscus.app');
    expect(csp).not.toContain('umami');
    expect(csp).not.toContain('jsdelivr');
  });

  it('adds giscus.app when GISCUS enabled', () => {
    const csp = buildCsp({ PUBLIC_GISCUS_ENABLED: 'true' });
    const parts = csp.split('; ');
    expect(parts.find((p) => p.startsWith('script-src'))).toContain('giscus.app');
    expect(parts.find((p) => p.startsWith('connect-src'))).toContain('giscus.app');
    expect(parts.find((p) => p.startsWith('frame-src'))).toContain('giscus.app');
  });

  it('adds umami cloud domain when UMAMI enabled with cloud URL', () => {
    const csp = buildCsp({
      PUBLIC_UMAMI_ENABLED: 'true',
      PUBLIC_UMAMI_SCRIPT_URL: 'https://cloud.umami.is/script.js',
    });
    expect(csp).toContain('https://cloud.umami.is');
  });

  it('adds umami self-hosted domain from script URL', () => {
    const csp = buildCsp({
      PUBLIC_UMAMI_ENABLED: 'true',
      PUBLIC_UMAMI_SCRIPT_URL: 'https://analytics.example.com/script.js',
    });
    expect(csp).toContain('https://analytics.example.com');
    expect(csp).not.toContain('cloud.umami.is');
  });

  it('adds media CDN domains when MUSIC enabled', () => {
    const csp = buildCsp({ PUBLIC_MUSIC_ENABLED: 'true' });
    const parts = csp.split('; ');
    const mediaSrc = parts.find((p) => p.startsWith('media-src'));
    expect(mediaSrc).toContain('jsdelivr');
    expect(mediaSrc).toContain('raw.githubusercontent.com');
  });

  it('does not add frame-ancestors when supportsHeaders is false', () => {
    expect(buildCsp({}, { supportsHeaders: false })).not.toContain('frame-ancestors');
  });

  it('adds frame-ancestors when supportsHeaders is true', () => {
    expect(buildCsp({}, { supportsHeaders: true })).toContain("frame-ancestors 'self'");
  });

  it('never includes unpkg.com in main site CSP', () => {
    const csp = buildCsp({
      PUBLIC_GISCUS_ENABLED: 'true',
      PUBLIC_UMAMI_ENABLED: 'true',
      PUBLIC_MUSIC_ENABLED: 'true',
    });
    expect(csp).not.toContain('unpkg.com');
  });
});
