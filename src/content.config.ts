// src/content.config.ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod'; // Astro 7 弃用 astro:content 的 z 再导出,官方推荐 astro/zod(Zod v4)
import { glob, file } from 'astro/loaders';
import { existsSync, readFileSync } from 'node:fs';
import {
  mergeAnimeNotes,
  mergeVocaloidNotes,
  validateCollectionItemIds,
  type AnimeNote,
} from './lib/content';

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
      pinned: z.boolean().default(false),
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
      // CI 的 pnpm check(astro sync 触发 loader)不拉取 content 仓:文件缺失按空集合处理,
      // 真实构建时 prebuild 的 pull-content 保证文件存在
      const hasData = existsSync(animeFile);
      if (!hasData) {
        logger.warn('src/content/data/anime.json 不存在(content 仓未拉取),番剧集合按空处理');
      }
      const raw = hasData
        ? (JSON.parse(readFileSync(animeFile, 'utf-8')) as {
            items?: Array<{ id: string } & Record<string, unknown>>;
          })
        : { items: [] };
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
  // 数据源三份,构建期合并(与 anime 同模式):
  //   vocaloid.json         — src/scripts/sync-vocaloid.mjs 从网易云歌单生成(AUTO-GENERATED,勿手改)
  //   vocaloid-manual.json  — 手动补充不在网易云的曲目(完整条目,封面放 covers/ 下用非纯数字文件名)
  //   vocaloid-notes.json   — 手写手记:评分/感想/歌词片段/重点/状态修正,按 item.id 叠加
  loader: {
    name: 'vocaloid-netease-merge',
    load: async ({ store, parseData, watcher, logger }) => {
      const generatedFile = 'src/content/data/vocaloid.json';
      const manualFile = 'src/content/data/vocaloid-manual.json';
      const notesFile = 'src/content/data/vocaloid-notes.json';
      watcher?.add([generatedFile, manualFile, notesFile]);
      // CI 的 pnpm check(astro sync 触发 loader)不拉取 content 仓:文件缺失按空集合处理,
      // 真实构建时 prebuild 的 pull-content 保证文件存在
      const readItems = (file: string, missingWarn: string | null) => {
        if (!existsSync(file)) {
          if (missingWarn) logger.warn(missingWarn);
          return [];
        }
        return (JSON.parse(readFileSync(file, 'utf-8')).items ?? []) as Array<
          { id: string } & Record<string, unknown>
        >;
      };
      const synced = readItems(
        generatedFile,
        'src/content/data/vocaloid.json 不存在(content 仓未拉取或未跑 pnpm sync:vocaloid),术曲集合仅含手动条目',
      );
      const manual = readItems(manualFile, null);
      const notes = readItems(notesFile, null);
      validateCollectionItemIds('vocaloid(synced)', synced);
      validateCollectionItemIds('vocaloid(manual)', manual);
      // tagged 记录来源文件,parseData 以它为封面相对路径的解析基准
      const tagged = [
        ...synced.map((item) => ({ item, file: generatedFile })),
        ...manual.map((item) => ({ item, file: manualFile })),
      ];
      const { items, unmatchedNotes } = mergeVocaloidNotes(
        tagged.map((t) => t.item),
        notes,
      );
      for (const note of unmatchedNotes) {
        logger.warn(
          `vocaloid-notes.json: id="${note.id}" 无对应条目(未同步或已移出歌单),手记暂不生效`,
        );
      }
      store.clear();
      for (const [i, item] of items.entries()) {
        store.set({
          id: item.id,
          data: await parseData({ id: item.id, data: item, filePath: tagged[i].file }),
          filePath: tagged[i].file,
        });
      }
    },
  },
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      neteaseId: z.number().int().positive().optional(),
      title: z.string(),
      producer: z.string(),
      vocaloid: z.array(z.string()).default([]),
      cover: z.preprocess(emptyToUndefined, image().optional()),
      score: z.number().min(0).max(10).optional(),
      status: z.enum(['favorite', 'liked', 'neutral', 'archived']),
      listenedDate: z.coerce.date().optional(),
      // 网易云同步条目的歌单内位置(0 起),“歌单顺序 = 展示顺序”的排序依据
      order: z.number().int().min(0).optional(),
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
