// src/lib/seo.ts
import type { Locale } from '@i18n/config';

export interface HreflangAlternate {
  locale: Locale;
  url: string;
}

const HREFLANG_CODES: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
  ru: 'ru',
  ja: 'ja',
};

export function hreflangCode(locale: Locale): string {
  return HREFLANG_CODES[locale];
}

export function pickXDefault(
  alternates: HreflangAlternate[],
  defaultLocale: Locale,
): Locale | null {
  if (alternates.some((a) => a.locale === defaultLocale)) return defaultLocale;
  return alternates[0]?.locale ?? null;
}

export function buildHreflang(
  alternates: HreflangAlternate[],
  xDefaultLocale: Locale | null,
): string {
  const tags: string[] = alternates.map(
    (a) => `<link rel="alternate" hreflang="${hreflangCode(a.locale)}" href="${a.url}" />`,
  );
  if (xDefaultLocale) {
    const xd = alternates.find((a) => a.locale === xDefaultLocale);
    if (xd) tags.push(`<link rel="alternate" hreflang="x-default" href="${xd.url}" />`);
  }
  return tags.join('\n');
}
// --- CSP Generation (Plan 5) ---

export interface CspEnv {
  PUBLIC_GISCUS_ENABLED?: string;
  PUBLIC_UMAMI_ENABLED?: string;
  PUBLIC_UMAMI_SCRIPT_URL?: string;
  PUBLIC_MUSIC_ENABLED?: string;
}

export interface BuildCspOptions {
  supportsHeaders?: boolean;
}

/**
 * Build Content-Security-Policy string dynamically based on enabled integrations.
 * Pure function: only reads env, no side effects.
 * - Giscus → giscus.app in script/connect/frame-src
 * - Umami → origin from PUBLIC_UMAMI_SCRIPT_URL in script/connect-src
 * - Music → jsDelivr + raw.githubusercontent.com in media-src
 * - frame-ancestors only when supportsHeaders=true
 * - Never includes unpkg.com (admin-only CSP)
 */
export function buildCsp(
  env: CspEnv = (import.meta.env as CspEnv) ?? {},
  opts: BuildCspOptions = {},
): string {
  const scriptDomains = ["'self'", "'unsafe-inline'"];
  const connectDomains = ["'self'"];
  const frameDomains: string[] = [];
  const mediaDomains = ["'self'"];

  if (env.PUBLIC_GISCUS_ENABLED === 'true') {
    scriptDomains.push('https://giscus.app');
    connectDomains.push('https://giscus.app');
    frameDomains.push('https://giscus.app');
  }

  if (env.PUBLIC_UMAMI_ENABLED === 'true' && env.PUBLIC_UMAMI_SCRIPT_URL) {
    try {
      const origin = new URL(env.PUBLIC_UMAMI_SCRIPT_URL).origin;
      scriptDomains.push(origin);
      connectDomains.push(origin);
    } catch {
      /* invalid URL — skip */
    }
  }

  if (env.PUBLIC_MUSIC_ENABLED === 'true') {
    mediaDomains.push('https://cdn.jsdelivr.net', 'https://raw.githubusercontent.com');
  }

  return [
    `default-src 'self'`,
    `script-src ${scriptDomains.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `media-src ${mediaDomains.join(' ')}`,
    `connect-src ${connectDomains.join(' ')}`,
    frameDomains.length > 0 ? `frame-src ${frameDomains.join(' ')}` : '',
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    opts.supportsHeaders ? `frame-ancestors 'self'` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
// --- Sitemap Generation (Plan 5) ---

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}
export interface SitemapPage {
  url: string;
  lastmod?: string;
  noindex: boolean;
  alternates: SitemapAlternate[];
}
export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  alternates: SitemapAlternate[];
}

/**
 * Build sitemap entries from a unified page list.
 * Pure function: filters noindex, prefixes with baseUrl, preserves alternates.
 */
export function buildSitemapEntries(pages: SitemapPage[], baseUrl: string): SitemapEntry[] {
  const base = baseUrl.replace(/\/$/, '');
  return pages
    .filter((p) => !p.noindex)
    .map((p) => ({
      loc: `${base}${p.url}`,
      lastmod: p.lastmod,
      alternates: p.alternates.map((a) => ({ hreflang: a.hreflang, href: `${base}${a.href}` })),
    }));
}

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const alts = e.alternates
        .map(
          (a) =>
            `    <xhtml:link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}" />`,
        )
        .join('\n');
      const lastmod = e.lastmod ? `    <lastmod>${esc(e.lastmod)}</lastmod>\n` : '';
      return `  <url>\n    <loc>${esc(e.loc)}</loc>\n${lastmod}${alts}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
