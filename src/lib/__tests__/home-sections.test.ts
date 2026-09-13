// src/lib/__tests__/home-sections.test.ts
import { describe, it, expect } from 'vitest';
import {
  pickPinnedArticles,
  pickLatestArticles,
  pickRecentAnime,
  pickRecentVocaloid,
} from '@lib/home-sections';

const article = (id: string, pubDate: string, pinned = false) => ({
  id,
  data: { pubDate: new Date(pubDate), pinned },
});

describe('pickPinnedArticles', () => {
  it('只取 pinned,按 pubDate 倒序,上限 3', () => {
    const result = pickPinnedArticles([
      article('a', '2026-01-01', true),
      article('b', '2026-03-01', true),
      article('c', '2026-02-01', true),
      article('d', '2026-04-01', true),
      article('e', '2026-05-01'),
    ]);
    expect(result.map((e) => e.id)).toEqual(['d', 'b', 'c']);
  });

  it('无置顶文章时为空', () => {
    expect(pickPinnedArticles([article('a', '2026-01-01')])).toEqual([]);
  });
});

describe('pickLatestArticles', () => {
  it('排除置顶,按 pubDate 倒序,上限 3', () => {
    const result = pickLatestArticles([
      article('a', '2026-05-01', true),
      article('b', '2026-04-01'),
      article('c', '2026-03-01'),
      article('d', '2026-02-01'),
      article('e', '2026-01-01'),
    ]);
    expect(result.map((e) => e.id)).toEqual(['b', 'c', 'd']);
  });
});

describe('pickRecentAnime', () => {
  const anime = (
    id: string,
    status: 'finished' | 'watching' | 'planned' | 'dropped',
    watchedDate?: string,
  ) => ({
    id,
    data: { status, watchedDate: watchedDate ? new Date(watchedDate) : undefined },
  });

  it('排除想看与抛弃,按 watchedDate 倒序,上限 4', () => {
    const result = pickRecentAnime([
      anime('a', 'finished', '2026-09-13'),
      anime('b', 'planned', '2026-09-14'),
      anime('c', 'dropped', '2026-09-12'),
      anime('d', 'watching', '2026-09-11'),
      anime('e', 'finished', '2026-09-10'),
      anime('f', 'watching', '2026-09-09'),
    ]);
    expect(result.map((e) => e.id)).toEqual(['a', 'd', 'e', 'f']);
  });

  it('无 watchedDate 的条目垫底', () => {
    const result = pickRecentAnime([
      anime('nodate', 'watching'),
      anime('dated', 'finished', '2026-01-01'),
    ]);
    expect(result.map((e) => e.id)).toEqual(['dated', 'nodate']);
  });
});

describe('pickRecentVocaloid', () => {
  const song = (
    id: string,
    status: 'favorite' | 'liked' | 'neutral' | 'archived',
    order?: number,
    listenedDate?: string,
  ) => ({
    id,
    data: {
      status,
      order,
      listenedDate: listenedDate ? new Date(listenedDate) : undefined,
    },
  });

  it('排除归档;歌单条目按 order 在前,有日期的手动条目按日期倒序在后,上限 4', () => {
    const result = pickRecentVocaloid([
      song('dated-new', 'favorite', undefined, '2026-09-13'),
      song('p2', 'liked', 2),
      song('p0', 'liked', 0),
      song('archived', 'archived', 1),
      song('dated-old', 'liked', undefined, '2026-01-01'),
      song('p1', 'favorite', 1),
    ]);
    expect(result.map((e) => e.id)).toEqual(['p0', 'p1', 'p2', 'dated-new']);
  });

  it('未标日期且无 order 的条目垫底', () => {
    const result = pickRecentVocaloid([
      song('manual', 'liked'),
      song('p1', 'liked', 1),
      song('p0', 'liked', 0),
    ]);
    expect(result.map((e) => e.id)).toEqual(['p0', 'p1', 'manual']);
  });
});
