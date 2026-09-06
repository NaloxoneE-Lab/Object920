// src/lib/__tests__/i18n-utils.test.ts
import { describe, it, expect } from 'vitest';
import { t, getLocalizedPath, getLocaleFromPath } from '@i18n/utils';

describe('t()', () => {
  it('returns zh value for zh locale', () => {
    expect(t('zh', 'nav.home')).toBe('首页');
  });

  it('returns en value for en locale', () => {
    expect(t('en', 'nav.home')).toBe('Home');
  });

  it('falls back to zh when key missing in ru', () => {
    expect(t('ru', 'nav.home')).toBe('首页');
  });

  it('returns key itself when missing in all dicts', () => {
    expect(t('zh', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('interpolates params', () => {
    expect(t('zh', 'nav.articles', {})).toBe('文章');
  });
});

describe('getLocalizedPath()', () => {
  it('replaces zh with en', () => {
    expect(getLocalizedPath('/zh/articles/', 'en')).toBe('/en/articles/');
  });

  it('replaces en with ja', () => {
    expect(getLocalizedPath('/en/articles/hello/', 'ja')).toBe('/ja/articles/hello/');
  });

  it('handles root path', () => {
    expect(getLocalizedPath('/zh/', 'en')).toBe('/en/');
  });
});

describe('getLocaleFromPath()', () => {
  it('extracts zh from /zh/articles/', () => {
    expect(getLocaleFromPath('/zh/articles/')).toBe('zh');
  });

  it('extracts en from /en/articles/hello/', () => {
    expect(getLocaleFromPath('/en/articles/hello/')).toBe('en');
  });

  it('returns defaultLocale for non-locale path', () => {
    expect(getLocaleFromPath('/404/')).toBe('zh');
  });
});
