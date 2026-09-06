// src/lib/__tests__/i18n-resolution.test.ts
import { describe, it, expect } from 'vitest';
import {
  getEntriesGroupedByTranslationKey,
  resolveLocalizedEntry,
  getLocalizedEntryPath,
  slugOf,
  deriveLocaleFromPath,
  validateSlugs,
  validateTranslationGroups,
} from '@lib/i18n';

type Entry = { id: string; data: { translationKey?: string } };
const mk = (id: string, translationKey?: string): Entry => ({ id, data: { translationKey } });

describe('slugOf', () => {
  it('extracts slug from {locale}/{slug} id', () => {
    expect(slugOf(mk('zh/hello-world'))).toBe('hello-world');
    expect(slugOf(mk('en/astro-architecture'))).toBe('astro-architecture');
  });
});

describe('getEntriesGroupedByTranslationKey', () => {
  it('groups by translationKey', () => {
    const entries = [mk('zh/foo', 'tk1'), mk('en/foo', 'tk1')];
    const groups = getEntriesGroupedByTranslationKey(entries);
    expect(groups.size).toBe(1);
    const g = groups.get('tk1')!;
    expect(g.zh?.id).toBe('zh/foo');
    expect(g.en?.id).toBe('en/foo');
  });

  it('uses synthetic key single:{id} for entries without translationKey', () => {
    const groups = getEntriesGroupedByTranslationKey([mk('zh/only-zh')]);
    expect(groups.get('single:zh/only-zh')?.zh?.id).toBe('zh/only-zh');
  });

  it('groups zh and en with different slugs under one translationKey', () => {
    const groups = getEntriesGroupedByTranslationKey([
      mk('zh/astro-arch', 'tk2'),
      mk('en/astro-architecture', 'tk2'),
    ]);
    const g = groups.get('tk2')!;
    expect(slugOf(g.zh!)).toBe('astro-arch');
    expect(slugOf(g.en!)).toBe('astro-architecture');
  });
});

describe('resolveLocalizedEntry', () => {
  const both = { zh: mk('zh/foo'), en: mk('en/foo') };
  const zhOnly = { zh: mk('zh/foo') };
  const enOnly = { en: mk('en/foo') };

  it('renders when uiLocale has entry', () => {
    expect(resolveLocalizedEntry(both, 'zh').mode).toBe('render');
    expect(resolveLocalizedEntry(both, 'zh').contentLocale).toBe('zh');
    expect(resolveLocalizedEntry(both, 'en').mode).toBe('render');
  });

  it('placeholder when content locale missing but other exists', () => {
    const r = resolveLocalizedEntry(zhOnly, 'en');
    expect(r.mode).toBe('placeholder');
    expect(r.contentLocale).toBe('zh');
  });

  it('placeholder for ru/ja prefers zh when available', () => {
    expect(resolveLocalizedEntry(both, 'ru').mode).toBe('placeholder');
    expect(resolveLocalizedEntry(both, 'ru').contentLocale).toBe('zh');
    expect(resolveLocalizedEntry(enOnly, 'ja').contentLocale).toBe('en');
  });

  it('skip when no entry at all', () => {
    expect(resolveLocalizedEntry({}, 'zh').mode).toBe('skip');
    expect(resolveLocalizedEntry({}, 'ru').mode).toBe('skip');
  });
});

describe('getLocalizedEntryPath', () => {
  const both = { zh: mk('zh/foo'), en: mk('en/bar') };

  it('returns real slug path for locale with entry', () => {
    expect(getLocalizedEntryPath(both, 'zh', 'articles')).toBe('/zh/articles/foo/');
    expect(getLocalizedEntryPath(both, 'en', 'articles')).toBe('/en/articles/bar/');
  });

  it('returns placeholder path using existing slug for missing content locale', () => {
    expect(getLocalizedEntryPath({ zh: mk('zh/foo') }, 'en', 'articles')).toBe('/en/articles/foo/');
  });

  it('returns placeholder path for ru/ja using preferred existing slug', () => {
    expect(getLocalizedEntryPath(both, 'ru', 'articles')).toBe('/ru/articles/foo/');
  });

  it('returns null when group empty', () => {
    expect(getLocalizedEntryPath({}, 'zh', 'articles')).toBeNull();
  });
});

describe('deriveLocaleFromPath (spec 6.5, locale 唯一真相 = 目录)', () => {
  it('derives locale from content path', () => {
    expect(deriveLocaleFromPath('articles/zh/foo')).toBe('zh');
    expect(deriveLocaleFromPath('projects/en/bar')).toBe('en');
  });

  it('rejects invalid paths', () => {
    expect(() => deriveLocaleFromPath('articles/fr/foo')).toThrow();
    expect(() => deriveLocaleFromPath('articles/foo')).toThrow();
  });
});

describe('validateSlugs (spec 6.5, unique(collection, locale, slug))', () => {
  it('accepts valid ASCII slugs', () => {
    expect(() =>
      validateSlugs([
        { collection: 'articles', id: 'zh/hello-world' },
        { collection: 'articles', id: 'en/hello-world' },
        { collection: 'projects', id: 'zh/hello-world' },
      ]),
    ).not.toThrow();
  });

  it('rejects non-ASCII or malformed slugs', () => {
    expect(() => validateSlugs([{ collection: 'articles', id: 'zh/中文标题' }])).toThrow();
    expect(() => validateSlugs([{ collection: 'articles', id: 'zh/Hello' }])).toThrow();
    expect(() => validateSlugs([{ collection: 'articles', id: 'zh/-bad-' }])).toThrow();
  });

  it('rejects duplicate slug within same collection+locale', () => {
    expect(() =>
      validateSlugs([
        { collection: 'articles', id: 'zh/dup' },
        { collection: 'articles', id: 'zh/dup' },
      ]),
    ).toThrow();
  });
});

describe('validateTranslationGroups (spec 6.5, 同 collection+key+locale 唯一)', () => {
  it('passes unique groups', () => {
    expect(() =>
      validateTranslationGroups([
        { collection: 'articles', id: 'zh/a', data: { translationKey: 'tk' } },
        { collection: 'articles', id: 'en/a', data: { translationKey: 'tk' } },
      ]),
    ).not.toThrow();
  });

  it('fails on duplicate translationKey within same locale', () => {
    expect(() =>
      validateTranslationGroups([
        { collection: 'articles', id: 'zh/a', data: { translationKey: 'tk' } },
        { collection: 'articles', id: 'zh/b', data: { translationKey: 'tk' } },
      ]),
    ).toThrow();
  });
});
