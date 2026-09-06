// src/lib/__tests__/seo.test.ts
import { describe, it, expect } from 'vitest';
import { buildHreflang, hreflangCode, pickXDefault } from '@lib/seo';
import type { Locale } from '@i18n/config';

describe('hreflangCode', () => {
  it('maps locales to standard codes', () => {
    expect(hreflangCode('zh')).toBe('zh-CN');
    expect(hreflangCode('en')).toBe('en');
    expect(hreflangCode('ru')).toBe('ru');
    expect(hreflangCode('ja')).toBe('ja');
  });
});

describe('pickXDefault', () => {
  it('prefers defaultLocale when it has a render page', () => {
    const alts = [
      { locale: 'zh' as Locale, url: '/zh/foo/' },
      { locale: 'en' as Locale, url: '/en/foo/' },
    ];
    expect(pickXDefault(alts, 'zh')).toBe('zh');
  });

  it('falls back to first render locale when defaultLocale absent', () => {
    expect(pickXDefault([{ locale: 'en' as Locale, url: '/en/foo/' }], 'zh')).toBe('en');
  });

  it('returns null when no alternates', () => {
    expect(pickXDefault([], 'zh')).toBeNull();
  });
});

describe('buildHreflang', () => {
  it('outputs alternates plus x-default', () => {
    const alts = [
      { locale: 'zh' as Locale, url: '/zh/foo/' },
      { locale: 'en' as Locale, url: '/en/foo/' },
    ];
    const out = buildHreflang(alts, 'zh');
    expect(out).toContain('hreflang="zh-CN"');
    expect(out).toContain('href="/zh/foo/"');
    expect(out).toContain('hreflang="en"');
    expect(out).toContain('hreflang="x-default"');
  });

  it('placeholder page: only render alternates present, x-default points to render', () => {
    const alts = [{ locale: 'zh' as Locale, url: '/zh/foo/' }];
    const out = buildHreflang(alts, 'zh');
    expect(out).not.toContain('hreflang="en"');
    expect(out).toContain('hreflang="x-default"');
    expect(out).toContain('href="/zh/foo/"');
  });
});
