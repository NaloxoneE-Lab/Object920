// src/lib/__tests__/content.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateOgImageFields,
  validateCollectionItemIds,
  mergeAnimeNotes,
  mergeVocaloidNotes,
} from '@lib/content';

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

describe('mergeVocaloidNotes', () => {
  const items = [
    {
      id: 'ne-26096272',
      title: '千本桜',
      producer: '黒うさP',
      vocaloid: ['初音ミク'],
      status: 'liked',
      score: undefined,
      comment: undefined,
      lyricSnippet: undefined,
      highlight: false,
    },
    { id: 'manual-1', title: '站外曲', producer: '某人', vocaloid: [], status: 'liked' },
  ];

  it('note overrides score/comment/lyricSnippet/status/highlight by id', () => {
    const { items: merged } = mergeVocaloidNotes(items, [
      {
        id: 'ne-26096272',
        score: 9.5,
        comment: '入坑曲',
        lyricSnippet: '夕焼けの硝子',
        status: 'favorite',
        highlight: true,
      },
    ]);
    expect(merged[0].score).toBe(9.5);
    expect(merged[0].comment).toBe('入坑曲');
    expect(merged[0].lyricSnippet).toBe('夕焼けの硝子');
    expect(merged[0].status).toBe('favorite');
    expect(merged[0].highlight).toBe(true);
    expect(merged[0].producer).toBe('黒うさP');
  });

  it('note can fix producer/vocaloid classification', () => {
    const { items: merged } = mergeVocaloidNotes(items, [
      { id: 'ne-26096272', producer: '黒うさP feat.', vocaloid: ['初音ミク', '鏡音リン'] },
    ]);
    expect(merged[0].producer).toBe('黒うさP feat.');
    expect(merged[0].vocaloid).toEqual(['初音ミク', '鏡音リン']);
  });

  it('empty-string comment/lyricSnippet falls back to item values', () => {
    const withComment = [{ ...items[1], comment: '原有', lyricSnippet: '原有词' }];
    const { items: merged } = mergeVocaloidNotes(withComment, [
      { id: 'manual-1', comment: '  ', lyricSnippet: '' },
    ]);
    expect(merged[0].comment).toBe('原有');
    expect(merged[0].lyricSnippet).toBe('原有词');
  });

  it('reports notes whose id has no item', () => {
    const { unmatchedNotes } = mergeVocaloidNotes(items, [{ id: 'ne-404', comment: 'x' }]);
    expect(unmatchedNotes).toEqual([{ id: 'ne-404', comment: 'x' }]);
  });

  it('fails on invalid, duplicate id or invalid status', () => {
    expect(() => mergeVocaloidNotes(items, [{ comment: 'no id' }])).toThrow(/id/);
    expect(() => mergeVocaloidNotes(items, [{ id: 'ne-1' }, { id: 'ne-1' }])).toThrow(/重复/);
    expect(() => mergeVocaloidNotes(items, [{ id: 'ne-1', status: 'watching' }])).toThrow(/status/);
  });
});
