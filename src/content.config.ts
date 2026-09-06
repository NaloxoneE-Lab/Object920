// src/content.config.ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod'; // Astro 7 弃用 astro:content 的 z 再导出,官方推荐 astro/zod(Zod v4)
import { glob, file } from 'astro/loaders';

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
      excerpt: z.string().optional(),
      draft: z.boolean().default(false),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      ogImage: z.url().optional(),
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
      excerpt: z.string().optional(),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
      datasheets: z
        .array(
          z.object({
            name: z.string(),
            filename: z.string(),
            ref: z.string().default('main'),
            size: z.string().optional(),
            mirror: z.array(z.enum(['jsdelivr', 'raw', 'release'])).default(['jsdelivr', 'raw']),
            releaseTag: z.string().optional(),
          }),
        )
        .default([]),
      relatedLinks: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
      draft: z.boolean().default(false),
      ogImage: z.url().optional(),
      ogImageLocal: image().optional(),
    }),
});

const anime = defineCollection({
  // Sveltia 写 { items: [...] },file() 期望顶层数组(每对象有 id),用 parser 桥接
  loader: file('src/content/data/anime.json', {
    parser: (text) => JSON.parse(text).items,
  }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    titleOriginal: z.string().optional(),
    titleZh: z.string().optional(),
    cover: z.url().optional(),
    score: z.number().min(0).max(10).optional(),
    status: z.enum(['finished', 'watching', 'planned', 'dropped']),
    watchedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    episodes: z.number().optional(),
    year: z.number().optional(),
    studio: z.string().optional(),
    source: z.url().optional(),
    comment: z.string().optional(),
    highlight: z.boolean().default(false),
  }),
});

const vocaloid = defineCollection({
  loader: file('src/content/data/vocaloid.json', {
    parser: (text) => JSON.parse(text).items,
  }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    producer: z.string(),
    vocaloid: z.array(z.string()).default([]),
    cover: z.url().optional(),
    score: z.number().min(0).max(10).optional(),
    status: z.enum(['favorite', 'liked', 'neutral', 'archived']),
    listenedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    year: z.number().optional(),
    platform: z.array(z.object({ name: z.string(), url: z.url() })).default([]),
    lyricSnippet: z.string().optional(),
    comment: z.string().optional(),
    highlight: z.boolean().default(false),
  }),
});

const friends = defineCollection({
  loader: file('src/content/data/friends.json', {
    parser: (text) => JSON.parse(text).items,
  }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    url: z.url(),
    avatar: z.url().optional(),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    status: z.enum(['active', 'inactive', 'mutual']).default('active'),
    addedDate: z.coerce.date().optional(),
  }),
});

export const collections = { articles, projects, anime, vocaloid, friends };
