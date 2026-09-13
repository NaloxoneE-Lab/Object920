// src/content.config.ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod'; // Astro 7 弃用 astro:content 的 z 再导出,官方推荐 astro/zod(Zod v4)
import { glob, file } from 'astro/loaders';
import { existsSync, readFileSync } from 'node:fs';
import { mergeAnimeNotes, validateCollectionItemIds, type AnimeNote } from './lib/content';

// Sveltia 会把留空的可选字段写成空串,而 schema 的 optional() 只接受 undefined。
// 统一预处理:空串/纯空白 → undefined;对象内剔除全部空串键(ogImage: '' 曾导致构建失败)
const emptyToUndefined = (value: unknown): unknown => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const optionalString = () => z.preprocess(emptyToUndefined, z.string().optional());

const articles = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/articles',
    generateId: ({ entry }) => entry.replace(/[/\\]index\.md$/, ''),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      translationKey: z.string().trim().min(1).optional(),
      category: z.string().default('uncategorized'),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      coverAlt: z.string().trim().min(1),
      excerpt: optionalString(),
      draft: z.boolean().default(false),
      seoTitle: optionalString(),
      seoDescription: optionalString(),
      ogImage: z.preprocess(emptyToUndefined, z.url().optional()),
      ogImageLocal: image().optional(),
    }),
});

const projects = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.replace(/[/\\]index\.md$/, ''),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      translationKey: z.string().trim().min(1).optional(),
      category: z.string().default('hardware'),
      tags: z.array(z.string()).default([]),
      status: z.enum(['ongoing', 'completed', 'archived', 'planned']).default('ongoing'),
      cover: image().optional(),
      coverAlt: z.string().trim().min(1),
      gallery: z
        .array(
          z.object({
            image: image(),
            alt: z.string().trim().min(1),
            caption: z.string().optional(),
          }),
        )
        .default([]),
      excerpt: optionalString(),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
      datasheets: z
        .array(
          z.object({
            name: z.string(),
            filename: z.string(),
            ref: z.string().default('main'),
            size: optionalString(),
            mirror: z.array(z.enum(['jsdelivr', 'raw', 'release'])).default(['jsdelivr', 'raw']),
            releaseTag: optionalString(),
          }),
        )
        .default([]),
      relatedLinks: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
      draft: z.boolean().default(false),
      ogImage: z.preprocess(emptyToUndefined, z.url().optional()),
      ogImageLocal: image().optional(),
    }),
});

const anime = defineCollection({
  // 数据源两份,构建期合并:
  //   anime.json      — src/scripts/sync-bangumi.mjs 从 Bangumi API 生成(AUTO-GENERATED,勿手改)
  //   anime-notes.json — 手写个人手记:私房话(comment,优先于 bgm 短评)与重点标记(highlight)
  loader: {
    name: 'anime-bangumi-merge',
    load: async ({ store, parseData, watcher, logger }) => {
      const animeFile = 'src/content/data/anime.json';
      const notesFile = 'src/content/data/anime-notes.json';
      watcher?.add([animeFile, notesFile]);
      const raw = JSON.parse(readFileSync(animeFile, 'utf-8')) as {
        items?: Array<{ id: string } & Record<string, unknown>>;
      };
      const notes = existsSync(notesFile)
        ? ((JSON.parse(readFileSync(notesFile, 'utf-8')).items as AnimeNote[] | undefined) ?? [])
        : [];
      validateCollectionItemIds('anime', raw.items ?? []);
      const { items, unmatchedNotes } = mergeAnimeNotes(raw.items ?? [], notes);
      for (const note of unmatchedNotes) {
        logger.warn(
          `anime-notes.json: bangumiId=${note.bangumiId} 在 anime.json 中无对应条目(尚未同步或已取消收藏),手记暂不生效`,
        );
      }
      store.clear();
      for (const item of items) {
        // filePath 是 cover 相对路径的解析基准,也是 store 侧图片导入的记录锚点
        store.set({
          id: item.id,
          data: await parseData({ id: item.id, data: item, filePath: animeFile }),
          filePath: animeFile,
        });
      }
    },
  },
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      bangumiId: z.number().int().positive().optional(),
      title: z.string(),
      titleOriginal: optionalString(),
      titleZh: optionalString(),
      cover: image().optional(),
      score: z.number().min(0).max(10).optional(),
      status: z.enum(['finished', 'watching', 'planned', 'dropped']),
      watchedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      episodes: z.number().optional(),
      episodesWatched: z.number().min(0).optional(),
      year: z.number().optional(),
      studio: optionalString(),
      source: z.preprocess(emptyToUndefined, z.url().optional()),
      comment: optionalString(),
      highlight: z.boolean().default(false),
    }),
});

const vocaloid = defineCollection({
  loader: file('src/content/data/vocaloid.json', {
    parser: (text) => {
      const items = JSON.parse(text).items;
      validateCollectionItemIds('vocaloid', items);
      return items;
    },
  }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    producer: z.string(),
    vocaloid: z.array(z.string()).default([]),
    cover: z.preprocess(emptyToUndefined, z.url().optional()),
    score: z.number().min(0).max(10).optional(),
    status: z.enum(['favorite', 'liked', 'neutral', 'archived']),
    listenedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    year: z.number().optional(),
    platform: z.array(z.object({ name: z.string(), url: z.url() })).default([]),
    lyricSnippet: optionalString(),
    comment: optionalString(),
    highlight: z.boolean().default(false),
  }),
});

const friends = defineCollection({
  loader: file('src/content/data/friends.json', {
    parser: (text) => {
      const items = JSON.parse(text).items;
      validateCollectionItemIds('friends', items);
      return items;
    },
  }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    url: z.url(),
    avatar: z.preprocess(emptyToUndefined, z.url().optional()),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    status: z.enum(['active', 'inactive', 'mutual']).default('active'),
    addedDate: z.coerce.date().optional(),
  }),
});

export const collections = { articles, projects, anime, vocaloid, friends };
