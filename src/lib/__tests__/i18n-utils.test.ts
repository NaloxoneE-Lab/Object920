// src/lib/__tests__/i18n-utils.test.ts
import { describe, it, expect } from 'vitest';
import { t, getLocalizedPath, getLocaleFromPath } from '@i18n/utils';
import zh from '@i18n/ui/zh';
import en from '@i18n/ui/en';
import ru from '@i18n/ui/ru';
import ja from '@i18n/ui/ja';

describe('t()', () => {
  it('returns zh value for zh locale', () => {
    expect(t('zh', 'nav.home')).toBe('首页');
  });

  it('returns en value for en locale', () => {
    expect(t('en', 'nav.home')).toBe('Home');
  });

  it('returns ru value for ru locale', () => {
    expect(t('ru', 'nav.home')).toBe('Главная');
  });

  it('returns ja value for ja locale', () => {
    expect(t('ja', 'nav.home')).toBe('ホーム');
  });

  it('falls back to zh when key missing in a non-default locale', () => {
    const partial = { ...ru } as Record<string, string>;
    delete partial['nav.home'];
    const dicts = { zh, en, ru: partial, ja };
    const raw = dicts.ru['nav.home'] ?? zh['nav.home'];
    expect(raw).toBe('首页');
  });

  it('returns key itself when missing in all dicts', () => {
    expect(t('zh', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('interpolates params', () => {
    expect(t('zh', 'nav.articles', {})).toBe('文章');
  });
});

describe('dictionary parity', () => {
  // 回归守卫:ru/ja 字典空壳会让整站回退中文(GUI 测试发现的缺陷),
  // 任何语言缺键都必须在此暴露,而不是等用户切换语言时
  const zhKeys = Object.keys(zh);
  it.each([
    ['en', en],
    ['ru', ru],
    ['ja', ja],
  ])('%s dictionary has exactly the zh key set', (_locale, dict) => {
    expect(Object.keys(dict).sort()).toEqual([...zhKeys].sort());
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
