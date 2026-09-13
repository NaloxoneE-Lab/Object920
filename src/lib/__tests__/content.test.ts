// src/lib/__tests__/content.test.ts
import { describe, it, expect } from 'vitest';
import { validateOgImageFields, validateCollectionItemIds, mergeAnimeNotes } from '@lib/content';

describe('validateOgImageFields (spec P1-10)', () => {
  it('passes when only one or none is set', () => {
    expect(() =>
      validateOgImageFields([
        { id: 'zh/a', data: { ogImage: 'https://example.com/og.png' } },
        { id: 'zh/b', data: { ogImageLocal: { src: '/x.png' } } },
        { id: 'zh/c', data: {} },
      ]),
    ).not.toThrow();
  });

  it('fails when both ogImage and ogImageLocal set', () => {
    expect(() =>
      validateOgImageFields([
        {
          id: 'zh/d',
          data: { ogImage: 'https://example.com/og.png', ogImageLocal: { src: '/x.png' } },
        },
      ]),
    ).toThrow(/mutually exclusive/);
  });
});

describe('validateCollectionItemIds (spec P1-2)', () => {
  it('passes for unique ids', () => {
    expect(() => validateCollectionItemIds('anime', [{ id: 'a' }, { id: 'b' }])).not.toThrow();
  });

  it('fails for missing or duplicate ids', () => {
    expect(() => validateCollectionItemIds('anime', [{ id: '' }])).toThrow(/missing/);
    expect(() => validateCollectionItemIds('anime', [{ id: 'a' }, { id: 'a' }])).toThrow(
      /duplicate/,
    );
  });
});

describe('mergeAnimeNotes (Bangumi 同步数据 + 本地手记)', () => {
  const items = [
    { id: 'bgm-265', comment: 'bgm 短评', highlight: false },
    { id: 'bgm-975', comment: undefined, highlight: false },
  ];

  it('note comment overrides bgm comment, highlight only comes from note', () => {
    const { items: merged } = mergeAnimeNotes(items, [
      { bangumiId: 265, comment: '站内私房话', highlight: true },
    ]);
    expect(merged[0]).toEqual({ id: 'bgm-265', comment: '站内私房话', highlight: true });
    expect(merged[1]).toEqual({ id: 'bgm-975', comment: undefined, highlight: false });
  });

  it('note without comment/highlight keeps bgm values', () => {
    const { items: merged } = mergeAnimeNotes(items, [{ bangumiId: 265 }]);
    expect(merged[0].comment).toBe('bgm 短评');
    expect(merged[0].highlight).toBe(false);
  });

  it('reports notes whose bangumiId has no synced item', () => {
    const { unmatchedNotes } = mergeAnimeNotes(items, [{ bangumiId: 999999, comment: 'x' }]);
    expect(unmatchedNotes).toEqual([{ bangumiId: 999999, comment: 'x' }]);
  });

  it('fails on invalid or duplicate bangumiId', () => {
    expect(() => mergeAnimeNotes(items, [{ comment: 'no id' }])).toThrow(/bangumiId/);
    expect(() => mergeAnimeNotes(items, [{ bangumiId: -1 }])).toThrow(/bangumiId/);
    expect(() => mergeAnimeNotes(items, [{ bangumiId: 1 }, { bangumiId: 1 }])).toThrow(/重复/);
  });
});
