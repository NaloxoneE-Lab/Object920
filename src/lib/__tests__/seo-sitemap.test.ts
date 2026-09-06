// src/lib/__tests__/seo-sitemap.test.ts
import { describe, it, expect } from 'vitest';
import { buildSitemapEntries, type SitemapPage } from '../seo';

describe('buildSitemapEntries', () => {
  const pages: SitemapPage[] = [
    {
      url: '/zh/articles/hello/',
      lastmod: '2026-01-15',
      noindex: false,
      alternates: [
        { hreflang: 'zh-CN', href: '/zh/articles/hello/' },
        { hreflang: 'en', href: '/en/articles/hello/' },
      ],
    },
    {
      url: '/en/articles/hello/',
      lastmod: '2026-01-15',
      noindex: false,
      alternates: [
        { hreflang: 'zh-CN', href: '/zh/articles/hello/' },
        { hreflang: 'en', href: '/en/articles/hello/' },
      ],
    },
    { url: '/ru/articles/hello/', lastmod: undefined, noindex: true, alternates: [] },
    { url: '/404/', lastmod: undefined, noindex: true, alternates: [] },
  ];

  it('includes non-noindex pages', () => {
    const urls = buildSitemapEntries(pages, 'https://example.com').map((e) => e.loc);
    expect(urls).toContain('https://example.com/zh/articles/hello/');
    expect(urls).toContain('https://example.com/en/articles/hello/');
  });

  it('excludes noindex pages', () => {
    const urls = buildSitemapEntries(pages, 'https://example.com').map((e) => e.loc);
    expect(urls).not.toContain('https://example.com/ru/articles/hello/');
    expect(urls).not.toContain('https://example.com/404/');
  });

  it('includes lastmod when provided', () => {
    const entry = buildSitemapEntries(pages, 'https://example.com').find((e) =>
      e.loc.includes('/zh/articles/hello/'),
    );
    expect(entry?.lastmod).toBe('2026-01-15');
  });

  it('omits lastmod when not provided', () => {
    const entries = buildSitemapEntries(
      [{ url: '/zh/', lastmod: undefined, noindex: false, alternates: [] }],
      'https://example.com',
    );
    expect(entries[0].lastmod).toBeUndefined();
  });

  it('includes alternates with standard hreflang codes', () => {
    const entry = buildSitemapEntries(pages, 'https://example.com').find((e) =>
      e.loc.includes('/zh/articles/hello/'),
    );
    expect(entry?.alternates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hreflang: 'zh-CN' }),
        expect.objectContaining({ hreflang: 'en' }),
      ]),
    );
  });

  it('prefixes URLs with baseUrl', () => {
    const entries = buildSitemapEntries(
      [{ url: '/zh/', lastmod: undefined, noindex: false, alternates: [] }],
      'https://example.com',
    );
    expect(entries[0].loc).toBe('https://example.com/zh/');
  });
});
