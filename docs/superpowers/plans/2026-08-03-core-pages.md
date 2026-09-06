# Object920 核心页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Plan 1(基础架构)+ Plan 2(内容管线)之上,实现 Object920 全部核心页面与组件:首页、文章(列表/详情/占位/tag/category/archive)、工程、番剧墙、术曲墙、友链、关于、404,以及 Markdown 图片/代码块 rehype 增强管线、全局 Lightbox、双语渐进解析与 prose 排版。

**Architecture:** Astro 7.x 纯静态 SSG + Content Layer API。页面文件只做路由 + 数据获取 + 组件组合(≤60 行);视觉与交互下沉到按领域分目录的组件。Markdown 经 `markdown.processor: unified({...})` 注入自写 rehype 插件(构建期改 HTML AST 结构),客户端增强(`ArticleImageEnhancer`/`CodeBlockEnhancer`)用 `astro:page-load` + document 级事件委托(singleton guard)。全局 Lightbox 单例 + `open-lightbox` CustomEvent。双语渐进:每篇内容按 `translationKey` 分组,`getStaticPaths` 遍历 group × 4 locale,`resolveLocalizedEntry` 决定 render / placeholder / skip。

**Tech Stack:** Astro `^7.x`(`markdown.processor: unified()`) | `@astrojs/markdown-remark`(direct dep) | Tailwind v4 + `@tailwindcss/typography` | `astro:assets`(`Image`/`image()`) | Vitest | 零 React/Vue 运行时

**Spec:** `docs/superpowers/specs/2026-08-19-personal-site-design.md`(第 5.1/5.7-5.20、6.5-6.6、7.2、7.11、4.2-4.6、9.7 节)

## Global Constraints

- **Astro 7.x 必须显式 `markdown.processor: unified({...})`**:Sätteri 默认处理器不支持 remark/rehype;Plan 1 用 `processor: 'unified'` 占位,本 Plan 改为 `unified({ rehypePlugins: [rehypeArticleImage, rehypeCodeblock] })`
- **`@astrojs/markdown-remark` 是 direct dependency**:提供 `unified` processor API;`unified` 本身不单独声明
- **零框架运行时**:enhancement 全部 vanilla JS,禁止 React/Vue/Solid
- **rehype 插件只做结构增强,不重复优化**:`rehype-article-image` 只包 figure/caption + 注入 data 属性,不改 `src`/srcset;图片优化完全由 astro:assets 渲染阶段承担
- **代码块单模型(P0-4)**:rehype 插件(构建期注入数据属性 + 复制按钮骨架)+ `CodeBlockEnhancer.ts`(客户端事件委托绑复制);不存在 `CodeBlock.astro` 包装组件
- **图片单模型(P0-4)**:不存在 `ArticleImage.astro`;`rehype-article-image.ts` + `ArticleImageEnhancer.ts`(事件委托)
- **enhancement 命名去 `.client` 歧义(P1-6)**:`ArticleImageEnhancer.ts` / `CodeBlockEnhancer.ts`
- **ClientRouter 生命周期(5.20)**:页面级增强每次 `astro:page-load` 初始化;全局 singleton(Lightbox / document 级委托)只初始化一次(标志位保护);`astro:after-swap` 时 Lightbox 打开则关闭
- **StatusFilter 单选 tab,默认"全部"**:URL 同步用 `history.replaceState()` 更新 `?status=`,不触发 ClientRouter 导航
- **双语渐进**:`resolveLocalizedEntry(collection, group, uiLocale)` 返回 `{mode, uiLocale, contentLocale}`;区分 UI 语言与内容语言
- **占位页**:`noindex, follow`;canonical 指向实际 render 语言版;hreflang 只指向 render 页(不指向自己/其他 placeholder);`<html lang={uiLocale}>` + `<article lang={contentLocale}>`
- **不同语言允许不同 slug(P2-15)**:`getLocalizedEntryPath` 经 translationKey 查目标 entry 真实 slug,禁止 `pathname.replace(locale)`
- **Git 操作只在 `src/scripts/`**:`src/lib/`、`src/components/` 禁止 git 命令
- **scoped CSS 禁止硬编码 token 维度**:必须 `var(--*)` 引用;`>100` 行外置 `X.module.css`
- **trailingSlash: 'always'**:所有 URL 带尾斜杠
- **JSON collection 远程图直接 `<img loading="lazy">`**:不走 astro:assets
- **路径别名**:用 `@components/<subdir>/File`、`@lib/...`、`@i18n/...`、`@config/...`、`@styles/...`(Plan 1 tsconfig 已配 `@components/*` 等,覆盖所有子目录)

---

## File Structure

| 文件                                               | 职责                                                                                                     | 创建/修改 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------- |
| `src/lib/i18n.ts`                                  | 双语渐进解析(resolveLocalizedEntry / getEntriesGroupedByTranslationKey / getLocalizedEntryPath / slugOf) | 创建      |
| `src/lib/seo.ts`                                   | buildHreflang / hreflangCode / pickXDefault                                                              | 创建      |
| `src/styles/prose.css`                             | 文章 prose 排版微调 + Shiki 双主题切换                                                                   | 创建      |
| `src/lib/rehype-article-image.ts`                  | 图片 rehype 插件(figure/caption/data 属性)                                                               | 创建      |
| `src/lib/rehype-codeblock.ts`                      | 代码块 rehype 插件(包裹 + 复制按钮骨架)                                                                  | 创建      |
| `src/components/ui/Lightbox.astro`                 | 全局 Lightbox(单例 + open-lightbox 事件)                                                                 | 创建      |
| `src/components/article/ArticleImageEnhancer.ts`   | 图片客户端增强(lightbox 点击委托 + onerror 占位)                                                         | 创建      |
| `src/components/article/CodeBlockEnhancer.ts`      | 代码块客户端增强(复制按钮事件委托)                                                                       | 创建      |
| `src/components/common/EmptyState.astro`           | 空状态                                                                                                   | 创建      |
| `src/components/article/ArticleCard.astro`         | 文章卡片                                                                                                 | 创建      |
| `src/components/article/ArticleList.astro`         | 文章列表网格                                                                                             | 创建      |
| `src/components/article/ArticleProse.astro`        | Markdown 渲染包裹(prose + lang)                                                                          | 创建      |
| `src/components/article/Toc.astro`                 | 目录(IntersectionObserver 高亮)                                                                          | 创建      |
| `src/components/article/ReadingProgress.astro`     | 阅读进度条                                                                                               | 创建      |
| `src/layouts/ArticleLayout.astro`                  | 文章详情布局                                                                                             | 创建      |
| `src/components/project/ProjectCard.astro`         | 工程卡片                                                                                                 | 创建      |
| `src/components/project/ProjectList.astro`         | 工程列表网格                                                                                             | 创建      |
| `src/components/project/Gallery.astro`             | 图廊(走全局 Lightbox)                                                                                    | 创建      |
| `src/components/project/SpecsTable.astro`          | 规格表                                                                                                   | 创建      |
| `src/components/project/DatasheetDownload.astro`   | 数据手册下载                                                                                             | 创建      |
| `src/layouts/ProjectLayout.astro`                  | 工程详情布局                                                                                             | 创建      |
| `src/components/collection/AnimeCard.astro`        | 番剧卡片                                                                                                 | 创建      |
| `src/components/collection/StatusFilter.astro`     | 番剧状态筛选(单选 tab)                                                                                   | 创建      |
| `src/components/collection/AnimeWall.astro`        | 番剧墙                                                                                                   | 创建      |
| `src/components/collection/VocaloidCard.astro`     | 术曲卡片                                                                                                 | 创建      |
| `src/components/collection/VocaloidWall.astro`     | 术曲墙                                                                                                   | 创建      |
| `src/components/friends/FriendCard.astro`          | 友链卡片                                                                                                 | 创建      |
| `src/components/friends/FriendList.astro`          | 友链列表                                                                                                 | 创建      |
| `src/components/home/Hero.astro`                   | 首页 Hero(大图 + 轻量动效)                                                                               | 创建      |
| `src/components/home/Hero.module.css`              | Hero scoped 样式(超 100 行外置)                                                                          | 创建      |
| `src/components/home/HomeSections.astro`           | 首页聚合区                                                                                               | 创建      |
| `src/components/errors/NotFound.astro`             | 404 内容                                                                                                 | 创建      |
| `src/pages/[locale]/index.astro`                   | 首页(替换 Plan 1 占位)                                                                                   | 修改      |
| `src/pages/[locale]/articles/index.astro`          | 文章列表                                                                                                 | 创建      |
| `src/pages/[locale]/articles/[...slug].astro`      | 文章详情 + 占位页                                                                                        | 创建      |
| `src/pages/[locale]/articles/tag/[tag].astro`      | 标签过滤                                                                                                 | 创建      |
| `src/pages/[locale]/articles/category/[cat].astro` | 分类过滤                                                                                                 | 创建      |
| `src/pages/[locale]/articles/archive.astro`        | 归档                                                                                                     | 创建      |
| `src/pages/[locale]/projects/index.astro`          | 工程列表                                                                                                 | 创建      |
| `src/pages/[locale]/projects/[slug].astro`         | 工程详情 + 占位页                                                                                        | 创建      |
| `src/pages/[locale]/collection/index.astro`        | 番&术总览                                                                                                | 创建      |
| `src/pages/[locale]/collection/anime.astro`        | 番剧墙                                                                                                   | 创建      |
| `src/pages/[locale]/collection/vocaloid.astro`     | 术曲墙                                                                                                   | 创建      |
| `src/pages/[locale]/friends/index.astro`           | 友链                                                                                                     | 创建      |
| `src/pages/[locale]/about/index.astro`             | 关于                                                                                                     | 创建      |
| `src/pages/404.astro`                              | 404 页                                                                                                   | 创建      |
| `src/components/layout/BaseLayout.astro`           | 挂载 Lightbox + 全局增强脚本 + aria-live + head-extras 槽                                                | 修改      |
| `src/i18n/ui/zh.ts` / `en.ts`                      | 补全 articles/projects/anime/vocaloid/friends/about/home 文案                                            | 修改      |
| `public/images/image-broken.svg`                   | 图片加载失败占位图                                                                                       | 创建      |
| `src/lib/__tests__/i18n-resolution.test.ts`        | resolveLocalizedEntry 等单测                                                                             | 创建      |
| `src/lib/__tests__/seo.test.ts`                    | buildHreflang 单测                                                                                       | 创建      |
| `src/lib/__tests__/rehype-article-image.test.ts`   | 图片插件单测                                                                                             | 创建      |
| `src/lib/__tests__/rehype-codeblock.test.ts`       | 代码块插件单测                                                                                           | 创建      |

**Plan 1 已产出(本 Plan 消费)**:`BaseLayout`/`BaseHead`/`Header`/`Footer`/`LangSwitch`/`ThemeToggle`/`MobileNav`/`Icon`、`t()`/`getLocalizedPath()`/`getLocaleFromPath()`、`Locale`/`ContentLocale`、`siteConfig`、`tokens.css`/`global.css`/`animations.css`、`[locale]/index.astro` 占位、根路径 `index.astro`。

**Plan 2 已产出(本 Plan 消费)**:`src/content.config.ts`(collections: `articles`/`projects` glob loader + `anime`/`vocaloid`/`friends` file loader,Zod schema 见 spec 4.2-4.6;`entry.id` = `{locale}/{slug}`)、`src/lib/content.ts`(`deriveLocaleFromPath`/`validateSlugs`/`validateTranslationGroups`/`validateCollectionItemIds`/`validateOgImageFields`)、`src/lib/assets.ts`(`buildDownloadUrls(datasheet): { url, mirror }[]`)、`src/lib/image.ts`(`buildOgImageUrl`)、`src/scripts/pull-content.mjs`、内容 fixture。

**关键 schema 字段(组件消费)**:

- article entry:`{ id: '{locale}/{slug}', data: { title, pubDate, updatedDate?, translationKey?, category, tags[], cover?(ImageMetadata), coverAlt, excerpt?, draft, ogImage?, ogImageLocal? }, render(): { Content, headings } }`
- project entry:同 article + `status: 'ongoing'|'completed'|'archived'|'planned'`、`gallery[{image,alt,caption?}]`、`specs[{label,value}]`、`datasheets[{name,filename,ref,size?,mirror[],releaseTag?}]`、`relatedLinks[{label,url}]`
- anime entry:`{ id, data: { id, title, titleOriginal?, titleZh?, cover?(url), score?(0-10), status: 'finished'|'watching'|'planned'|'dropped', watchedDate?, tags[], episodes?, year?, studio?, source?, comment?, highlight } }`
- vocaloid entry:`{ id, data: { id, title, producer, vocaloid[], cover?(url), score?, status: 'favorite'|'liked'|'neutral'|'archived', listenedDate?, tags[], year?, platform[{name,url}], lyricSnippet?, comment?, highlight } }`
- friend entry:`{ id, data: { id, name, url, avatar?(url), description, tags[], status: 'active'|'inactive'|'mutual', addedDate? } }`

---

### Task 1: 双语渐进解析(lib/i18n.ts)

**Files:**

- Create: `src/lib/i18n.ts`
- Create: `src/lib/__tests__/i18n-resolution.test.ts`

**Interfaces:**

- Consumes: Plan 2 的 content collections(`entry.id` = `{locale}/{slug}`、`entry.data.translationKey?`)、Plan 1 的 `Locale`/`ContentLocale`(`@i18n/config`)
- Produces:
  - `getEntriesGroupedByTranslationKey(entries): Map<string, TranslationGroup<T>>` — groupKey = `translationKey ?? 'single:' + entry.id`;group = `{ zh?, en? }`
  - `resolveLocalizedEntry(group, uiLocale): { mode: 'render'|'placeholder'|'skip', uiLocale, contentLocale, entry? }`
  - `getLocalizedEntryPath(group, targetLocale, routeSegment): string | null` — 经 translationKey 取目标 slug;无目标 entry 返回占位 URL(用已有 entry slug)
  - `slugOf(entry): string` — 从 `entry.id` 取 slug

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/__tests__/i18n-resolution.test.ts
import { describe, it, expect } from 'vitest';
import {
  getEntriesGroupedByTranslationKey,
  resolveLocalizedEntry,
  getLocalizedEntryPath,
  slugOf,
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/lib/__tests__/i18n-resolution.test.ts`
Expected: FAIL(`@lib/i18n` 未导出函数)

- [ ] **Step 3: 实现 lib/i18n.ts**

```ts
// src/lib/i18n.ts
import type { Locale, ContentLocale } from '@i18n/config';

export interface TranslationGroup<T = unknown> {
  zh?: T;
  en?: T;
}

export type EntryResolutionMode = 'render' | 'placeholder' | 'skip';

export interface ResolvedEntry<T = unknown> {
  mode: EntryResolutionMode;
  uiLocale: Locale;
  contentLocale: ContentLocale;
  entry?: T;
}

interface IdLike {
  id: string;
  data: { translationKey?: string };
}

function localeFromEntryId(id: string): ContentLocale {
  const seg = id.split('/')[0];
  if (seg === 'zh' || seg === 'en') return seg;
  throw new Error(`Unexpected locale segment in entry id: ${id}`);
}

export function slugOf<T extends { id: string }>(entry: T): string {
  return entry.id.slice(entry.id.indexOf('/') + 1);
}

export function getEntriesGroupedByTranslationKey<T extends IdLike>(
  entries: T[],
): Map<string, TranslationGroup<T>> {
  const groups = new Map<string, TranslationGroup<T>>();
  for (const entry of entries) {
    const key = entry.data.translationKey ?? `single:${entry.id}`;
    const locale = localeFromEntryId(entry.id);
    let group = groups.get(key);
    if (!group) {
      group = {};
      groups.set(key, group);
    }
    group[locale] = entry;
  }
  return groups;
}

export function resolveLocalizedEntry<T>(
  group: TranslationGroup<T>,
  uiLocale: Locale,
): ResolvedEntry<T> {
  const { zh, en } = group;
  if (uiLocale === 'zh') {
    if (zh) return { mode: 'render', uiLocale, contentLocale: 'zh', entry: zh };
    if (en) return { mode: 'placeholder', uiLocale, contentLocale: 'en' };
    return { mode: 'skip', uiLocale, contentLocale: 'zh' };
  }
  if (uiLocale === 'en') {
    if (en) return { mode: 'render', uiLocale, contentLocale: 'en', entry: en };
    if (zh) return { mode: 'placeholder', uiLocale, contentLocale: 'zh' };
    return { mode: 'skip', uiLocale, contentLocale: 'en' };
  }
  if (zh) return { mode: 'placeholder', uiLocale, contentLocale: 'zh' };
  if (en) return { mode: 'placeholder', uiLocale, contentLocale: 'en' };
  return { mode: 'skip', uiLocale, contentLocale: 'zh' };
}

export function getLocalizedEntryPath<T extends { id: string }>(
  group: TranslationGroup<T>,
  targetLocale: Locale,
  routeSegment: string,
): string | null {
  if (targetLocale === 'zh' && group.zh) return `/zh/${routeSegment}/${slugOf(group.zh)}/`;
  if (targetLocale === 'en' && group.en) return `/en/${routeSegment}/${slugOf(group.en)}/`;
  const existing = group.zh ?? group.en;
  if (!existing) return null;
  return `/${targetLocale}/${routeSegment}/${slugOf(existing)}/`;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/lib/__tests__/i18n-resolution.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/lib/__tests__/i18n-resolution.test.ts
git commit -m "feat: add bilingual progressive resolution (resolveLocalizedEntry)"
```

---

### Task 2: SEO hreflang 辅助(lib/seo.ts)

**Files:**

- Create: `src/lib/seo.ts`
- Create: `src/lib/__tests__/seo.test.ts`

**Interfaces:**

- Consumes: Plan 1 的 `Locale`/`defaultLocale`
- Produces:
  - `hreflangCode(locale): string` — zh→zh-CN 等
  - `pickXDefault(alternates, defaultLocale): Locale | null` — defaultLocale 有 render 则用它,否则第一个 render locale
  - `buildHreflang(alternates, xDefaultLocale): string` — 输出 `<link rel="alternate">` HTML(只含 render 页 + x-default)

- [ ] **Step 1: 写失败测试**

```ts
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/lib/__tests__/seo.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 lib/seo.ts**

```ts
// src/lib/seo.ts
import type { Locale } from '@i18n/config';

export interface HreflangAlternate {
  locale: Locale;
  url: string;
}

const HREFLANG_CODES: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
  ru: 'ru',
  ja: 'ja',
};

export function hreflangCode(locale: Locale): string {
  return HREFLANG_CODES[locale];
}

export function pickXDefault(
  alternates: HreflangAlternate[],
  defaultLocale: Locale,
): Locale | null {
  if (alternates.some((a) => a.locale === defaultLocale)) return defaultLocale;
  return alternates[0]?.locale ?? null;
}

export function buildHreflang(
  alternates: HreflangAlternate[],
  xDefaultLocale: Locale | null,
): string {
  const tags: string[] = alternates.map(
    (a) => `<link rel="alternate" hreflang="${hreflangCode(a.locale)}" href="${a.url}" />`,
  );
  if (xDefaultLocale) {
    const xd = alternates.find((a) => a.locale === xDefaultLocale);
    if (xd) tags.push(`<link rel="alternate" hreflang="x-default" href="${xd.url}" />`);
  }
  return tags.join('\n');
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/lib/__tests__/seo.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts src/lib/__tests__/seo.test.ts
git commit -m "feat: add hreflang/canonical SEO helpers"
```

---

### Task 3: prose.css 文章排版 + Shiki 双主题

**Files:**

- Create: `src/styles/prose.css`
- Create: `public/images/image-broken.svg`

**Interfaces:**

- Consumes: `tokens.css` 的 CSS 变量
- Produces: `prose.css`(由 `ArticleProse.astro` 引入)、`image-broken.svg`(由 `ArticleImageEnhancer` onerror 引用)

- [ ] **Step 1: 创建 image-broken 占位图**

```xml
<!-- public/images/image-broken.svg -->
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#1a1a1f" opacity="0.06"/>
  <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4">
    <rect x="140" y="90" width="120" height="90" rx="6"/>
    <circle cx="170" cy="115" r="8"/>
    <path d="M150 175 L190 140 L215 160 L240 130 L260 175 Z"/>
  </g>
  <text x="200" y="215" font-family="sans-serif" font-size="16" text-anchor="middle" opacity="0.4">图片加载失败</text>
</svg>
```

- [ ] **Step 2: 创建 prose.css**

```css
/* src/styles/prose.css — 文章 prose 排版微调(@tailwindcss/typography 基础之上) */
.prose {
  max-width: var(--container-prose);
  margin-inline: auto;
  color: var(--color-text);
  font-size: var(--text-md);
  line-height: var(--leading-prose);
}

.prose :where(h2, h3, h4) {
  color: var(--color-text);
  font-weight: 600;
  scroll-margin-top: var(--spacing-2xl);
}
.prose h2 {
  font-size: var(--text-2xl);
  margin-top: var(--spacing-xl);
  margin-bottom: var(--spacing-sm);
}
.prose h3 {
  font-size: var(--text-xl);
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-xs);
}

.prose :where(p) {
  margin-top: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.prose :where(a) {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.prose a:hover {
  color: var(--color-accent-hover);
}

.prose :where(strong) {
  font-weight: 600;
}

.prose :where(blockquote) {
  border-left: 3px solid var(--color-accent);
  padding-left: var(--spacing-md);
  color: var(--color-text-muted);
  font-style: italic;
  margin: var(--spacing-md) 0;
}

.prose :where(ul, ol) {
  padding-left: var(--spacing-md);
  margin: var(--spacing-sm) 0;
}
.prose li {
  margin-top: var(--spacing-2xs);
}

.prose :where(table) {
  width: 100%;
  border-collapse: collapse;
  margin: var(--spacing-md) 0;
  font-size: var(--text-sm);
}
.prose th,
.prose td {
  border: 1px solid var(--color-border);
  padding: var(--spacing-2xs) var(--spacing-xs);
  text-align: left;
}
.prose th {
  background: var(--color-surface);
  font-weight: 600;
}

.prose :where(figure) {
  margin: var(--spacing-md) 0;
}
.prose :where(figcaption) {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: var(--spacing-2xs);
}

.prose :where(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--color-surface);
  padding: 0.15em 0.35em;
  border-radius: var(--radius-sm);
}
.prose pre {
  font-family: var(--font-mono);
  margin: var(--spacing-md) 0;
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.prose hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--spacing-lg) 0;
}

.prose img {
  border-radius: var(--radius-md);
  height: auto;
}

/* Shiki 双主题切换(markdown.shikiConfig themes: { light, dark }) */
.astro-code,
.astro-code span {
  color: var(--shiki-light);
  background-color: var(--shiki-light-bg);
}
:root[data-theme='dark'] .astro-code,
:root[data-theme='dark'] .astro-code span {
  color: var(--shiki-dark);
  background-color: var(--shiki-dark-bg);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .astro-code,
  :root:not([data-theme]) .astro-code span {
    color: var(--shiki-dark);
    background-color: var(--shiki-dark-bg);
  }
}

/* 代码块包裹(由 rehype-codeblock 注入) */
.code-block {
  position: relative;
  margin: var(--spacing-md) 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}
.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-2xs) var(--spacing-xs);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--text-xs);
}
.code-block-lang {
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.code-block-copy {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: var(--text-xs);
  padding: var(--spacing-3xs) var(--spacing-2xs);
  border-radius: var(--radius-sm);
  transition: color calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
}
.code-block-copy:hover {
  color: var(--color-text);
}
.code-block pre {
  margin: 0;
  border-radius: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/prose.css public/images/image-broken.svg
git commit -m "feat: add prose.css typography + Shiki dual-theme + image-broken placeholder"
```

---

### Task 4: 图片 rehype 插件(rehype-article-image.ts)

**Files:**

- Create: `src/lib/rehype-article-image.ts`
- Create: `src/lib/__tests__/rehype-article-image.test.ts`

**Interfaces:**

- Consumes: hast(HTML AST,由 remark→rehype 生成)
- Produces: `rehypeArticleImage(options?)` — rehype 插件函数;把独立图片段 `<p><img></p>` 包成 `<figure>`+`<figcaption>`(title→caption),注入 `data-article-image`/`data-lightbox`/`data-lightbox-group`;远程图保持 `<img loading="lazy">`;装饰图(`alt=""`)不包 caption。**不改 src/srcset(优化由 astro:assets 承担)**

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/__tests__/rehype-article-image.test.ts
import { describe, it, expect } from 'vitest';
import { rehypeArticleImage } from '@lib/rehype-article-image';

type N = any;
const img = (src: string, alt: string, title?: string): N => ({
  type: 'element',
  tagName: 'img',
  properties: { src, alt, ...(title ? { title } : {}) },
  children: [],
});
const p = (...children: N[]): N => ({ type: 'element', tagName: 'p', properties: {}, children });
const run = (tree: N) => {
  rehypeArticleImage()(tree);
  return tree;
};

describe('rehypeArticleImage', () => {
  it('wraps local image with alt+title in figure with figcaption', () => {
    const t = run({ type: 'root', children: [p(img('./cat.webp', 'A cat', 'My cat'))] });
    const fig = t.children[0];
    expect(fig.tagName).toBe('figure');
    expect(fig.children[0].tagName).toBe('img');
    expect(fig.children[0].properties.dataArticleImage).toBe('');
    expect(fig.children[0].properties.dataLightbox).toBe('');
    expect(fig.children[1].tagName).toBe('figcaption');
    expect(fig.children[1].children[0].value).toBe('My cat');
  });

  it('wraps local image with alt but no title in figure without figcaption', () => {
    const t = run({ type: 'root', children: [p(img('./cat.webp', 'A cat'))] });
    const fig = t.children[0];
    expect(fig.tagName).toBe('figure');
    expect(fig.children).toHaveLength(1);
    expect(fig.children[0].properties.dataLightbox).toBe('');
  });

  it('leaves decorative image (alt="") in p with data-article-image but no lightbox/figure', () => {
    const t = run({ type: 'root', children: [p(img('./deco.webp', ''))] });
    const node = t.children[0];
    expect(node.tagName).toBe('p');
    expect(node.children[0].properties.dataArticleImage).toBe('');
    expect(node.children[0].properties.dataLightbox).toBeUndefined();
  });

  it('keeps remote image in p with loading=lazy + data-lightbox, no figure', () => {
    const t = run({ type: 'root', children: [p(img('https://cdn.example.com/x.png', 'remote'))] });
    const node = t.children[0];
    expect(node.tagName).toBe('p');
    expect(node.children[0].properties.loading).toBe('lazy');
    expect(node.children[0].properties.dataLightbox).toBe('');
  });

  it('does not wrap inline image inside text paragraph', () => {
    const t = run({
      type: 'root',
      children: [
        p({ type: 'text', value: 'see ' }, img('./x.webp', 'x'), { type: 'text', value: ' here' }),
      ],
    });
    expect(t.children[0].tagName).toBe('p');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/lib/__tests__/rehype-article-image.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 rehype-article-image.ts**

```ts
// src/lib/rehype-article-image.ts
import type { Root, Element, Properties } from 'hast';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Properties;
  children?: HastNode[];
  value?: string;
}

function isElement(n: unknown): n is Element {
  return !!n && typeof n === 'object' && (n as HastNode).type === 'element';
}
function isText(n: unknown): n is { type: 'text'; value: string } {
  return !!n && typeof n === 'object' && (n as HastNode).type === 'text';
}

export function rehypeArticleImage(options: { groupId?: string } = {}) {
  const groupId = options.groupId ?? 'content-images';
  return (tree: Root) => {
    const root = tree as unknown as HastNode;
    root.children = (root.children ?? []).map((node) => {
      if (!isElement(node) || node.tagName !== 'p') return node;
      const children = (node as HastNode).children ?? [];
      const imgs = children.filter((c) => isElement(c) && (c as Element).tagName === 'img');
      if (imgs.length !== 1) return node;
      const hasOtherContent = children.some(
        (c) =>
          !(isText(c) && /^\s*$/.test(c.value)) &&
          !(isElement(c) && (c as Element).tagName === 'img'),
      );
      if (hasOtherContent) return node;

      const imgEl = imgs[0] as unknown as HastNode;
      const props = (imgEl.properties ?? {}) as Record<string, unknown>;
      const src = String(props.src ?? '');
      const alt = String(props.alt ?? '');
      const isRemote = /^https?:\/\//i.test(src);

      props.dataArticleImage = '';
      if (alt !== '') {
        props.dataLightbox = '';
        props.dataLightboxGroup = groupId;
      }
      if (isRemote) {
        props.loading = 'lazy';
        return node;
      }
      if (alt === '') return node;

      const title = props.title != null ? String(props.title) : undefined;
      const figChildren: HastNode[] = [imgEl];
      if (title) {
        figChildren.push({
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: title }],
        });
      }
      return {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['article-figure'] },
        children: figChildren,
      } as unknown as Element;
    });
    return tree;
  };
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/lib/__tests__/rehype-article-image.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rehype-article-image.ts src/lib/__tests__/rehype-article-image.test.ts
git commit -m "feat: add rehype-article-image plugin (figure/caption/data attrs)"
```

---

### Task 4b: 代码块 rehype 插件 + markdown.processor 接入

**Files:**

- Create: `src/lib/rehype-codeblock.ts`
- Create: `src/lib/__tests__/rehype-codeblock.test.ts`
- Modify: `astro.config.mjs`(把 `processor: 'unified'` 改为 `unified({ rehypePlugins })` + shikiConfig)
- Modify: `package.json`(加 `@astrojs/markdown-remark` direct dependency)

**Interfaces:**

- Consumes: hast(`<pre><code>` 节点,Shiki 高亮前后均兼容)
- Produces: `rehypeCodeblock()` — 把 `<pre><code>` 包进 `<div class="code-block" data-code-block>` + header(语言标签 + `<button data-copy-button data-code>`);astro.config 注册两个 rehype 插件 + Shiki 双主题

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/__tests__/rehype-codeblock.test.ts
import { describe, it, expect } from 'vitest';
import { rehypeCodeblock } from '@lib/rehype-codeblock';

type N = any;
const code = (className: string[], text: string): N => ({
  type: 'element',
  tagName: 'code',
  properties: { className },
  children: [{ type: 'text', value: text }],
});
const pre = (c: N): N => ({ type: 'element', tagName: 'pre', properties: {}, children: [c] });
const run = (tree: N) => {
  rehypeCodeblock()(tree);
  return tree;
};

describe('rehypeCodeblock', () => {
  it('wraps pre/code in div.code-block with header, lang label, copy button', () => {
    const t = run({ type: 'root', children: [pre(code(['language-ts'], 'const x = 1;'))] });
    const wrapper = t.children[0];
    expect(wrapper.tagName).toBe('div');
    expect(wrapper.properties.dataCodeBlock).toBe('');
    const header = wrapper.children[0];
    expect(header.tagName).toBe('div');
    expect(header.properties.className).toContain('code-block-header');
    expect(header.children[0].tagName).toBe('span');
    expect(header.children[0].children[0].value).toBe('TS');
    const btn = header.children[1];
    expect(btn.tagName).toBe('button');
    expect(btn.properties.dataCopyButton).toBe('');
    expect(btn.properties.dataCode).toBe('const x = 1;');
    expect(wrapper.children[1].tagName).toBe('pre');
  });

  it('handles code block without language class', () => {
    const t = run({ type: 'root', children: [pre(code([], 'plain text'))] });
    const header = t.children[0].children[0];
    expect(header.children[0].children[0].value).toBe('TEXT');
    expect(header.children[1].properties.dataCode).toBe('plain text');
  });

  it('leaves pre without code child untouched', () => {
    const t = run({
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [{ type: 'text', value: 'x' }],
        },
      ],
    });
    expect(t.children[0].tagName).toBe('pre');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/lib/__tests__/rehype-codeblock.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 rehype-codeblock.ts**

```ts
// src/lib/rehype-codeblock.ts
import type { Root, Element } from 'hast';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

function isElement(n: unknown): n is Element {
  return !!n && typeof n === 'object' && (n as HastNode).type === 'element';
}

function extractText(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(extractText).join('');
}

function langFromCode(codeEl: HastNode): string | null {
  const cls = codeEl.properties?.className;
  if (Array.isArray(cls)) {
    for (const c of cls) {
      const m = String(c).match(/^language-(.+)$/);
      if (m) return m[1];
    }
  }
  return null;
}

function langLabel(lang: string | null): string {
  return (lang ?? 'text').toUpperCase();
}

export function rehypeCodeblock() {
  return (tree: Root) => {
    const root = tree as unknown as HastNode;
    root.children = (root.children ?? []).map((node) => {
      if (!isElement(node) || node.tagName !== 'pre') return node;
      const preNode = node as unknown as HastNode;
      const codeEl = (preNode.children ?? []).find(
        (c) => isElement(c) && (c as Element).tagName === 'code',
      ) as HastNode | undefined;
      if (!codeEl) return node;

      const lang = langFromCode(codeEl);
      const raw = extractText(codeEl);
      const header: HastNode = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-block-header'] },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['code-block-lang'] },
            children: [{ type: 'text', value: langLabel(lang) }],
          },
          {
            type: 'element',
            tagName: 'button',
            properties: {
              className: ['code-block-copy'],
              dataCopyButton: '',
              'aria-label': '复制代码',
              dataCode: raw,
            },
            children: [{ type: 'text', value: '复制' }],
          },
        ],
      };
      return {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-block'], dataCodeBlock: '' },
        children: [header, node],
      } as unknown as Element;
    });
    return tree;
  };
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/lib/__tests__/rehype-codeblock.test.ts`
Expected: PASS

- [ ] **Step 5: 安装 direct dependency**

Run: `pnpm add @astrojs/markdown-remark@^7`
Expected: 安装成功(提供 `unified` processor API;版本以 Astro 7 兼容为准)

- [ ] **Step 6: 修改 astro.config.mjs 接入 rehype 插件**

把 Plan 1 的 `markdown: { processor: 'unified' }` 整块替换为:

```js
// astro.config.mjs(片段 — 替换原 markdown 块)
import { unified } from '@astrojs/markdown-remark';
import { rehypeArticleImage } from './src/lib/rehype-article-image.ts';
import { rehypeCodeblock } from './src/lib/rehype-codeblock.ts';

export default defineConfig({
  // ...其余配置不变...
  markdown: {
    processor: unified({
      remarkPlugins: [],
      rehypePlugins: [rehypeArticleImage, rehypeCodeblock],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
});
```

> **顺序纪律(spec 7.2.2)**:rehype 插件按数组顺序执行,图片插件先于代码块插件;Shiki 高亮由 Astro 在 rehype 链中应用,`rehypeCodeblock` 提取的 `dataCode` 为原始文本(Shiki 前后均准确)。

- [ ] **Step 7: 验证 dev 启动**

Run: `pnpm dev`
Expected: dev 启动无报错(若 fixture 文章含 `![Alt](./cover.webp "Caption")` 与代码块,确认渲染为 `<figure>` 与 `<div class="code-block">`;`pnpm test` 已覆盖单测)

- [ ] **Step 8: Commit**

```bash
git add src/lib/rehype-codeblock.ts src/lib/__tests__/rehype-codeblock.test.ts astro.config.mjs package.json pnpm-lock.yaml
git commit -m "feat: add rehype-codeblock plugin + wire unified processor with dual-theme Shiki"
```

### Task 5: 全局 Lightbox + BaseLayout 接入

**Files:**

- Create: `src/components/ui/Lightbox.astro`
- Modify: `src/components/layout/BaseLayout.astro`(末尾挂 `<Lightbox />` + 加 `head-extras` 命名插槽)
- Modify: `src/i18n/ui/zh.ts`、`en.ts`(补 common.close/prev/next/lightbox.label)

**Interfaces:**

- Consumes: 无(监听 `open-lightbox` CustomEvent)
- Produces: 全局 Lightbox 单例;`e.detail = { src, alt, srcset?, groupId }`;支持组内 prev/next、ESC、点击背景关闭、焦点到关闭按钮;`astro:after-swap` 关闭清状态;reduced-motion 无动画

- [ ] **Step 1: 创建 Lightbox.astro**

```astro
---
// src/components/ui/Lightbox.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
---

<div
  id="lightbox-overlay"
  class="lightbox-overlay"
  hidden
  role="dialog"
  aria-modal="true"
  aria-label={t(locale, 'common.lightbox.label')}
>
  <button
    id="lightbox-close"
    class="lightbox-close"
    data-lightbox-close
    aria-label={t(locale, 'common.close')}>✕</button
  >
  <button
    class="lightbox-nav lightbox-prev"
    data-lightbox-prev
    aria-label={t(locale, 'common.prev')}>‹</button
  >
  <img id="lightbox-image" class="lightbox-image" alt="" />
  <p id="lightbox-caption" class="lightbox-caption"></p>
  <button
    class="lightbox-nav lightbox-next"
    data-lightbox-next
    aria-label={t(locale, 'common.next')}>›</button
  >
</div>
<script>
  const LB_KEY = '__lightbox_init__';
  function initLightbox() {
    if ((window as any)[LB_KEY]) return;
    (window as any)[LB_KEY] = true;
    let state: { images: HTMLElement[]; index: number } | null = null;
    const overlay = () => document.getElementById('lightbox-overlay');
    const imgEl = () => document.getElementById('lightbox-image') as HTMLImageElement | null;
    const capEl = () => document.getElementById('lightbox-caption');
    const groupImages = (groupId: string) =>
      Array.from(
        document.querySelectorAll(`[data-lightbox][data-lightbox-group="${groupId}"]`),
      ) as HTMLElement[];

    function show() {
      const s = state;
      if (!s) return;
      const ov = overlay();
      const im = imgEl();
      const cap = capEl();
      if (!ov || !im || !s.images[s.index]) return;
      const src = s.images[s.index] as HTMLImageElement;
      im.src = src.currentSrc || src.src;
      im.alt = src.alt || '';
      if (cap) cap.textContent = src.alt || '';
      ov.hidden = false;
      document.getElementById('lightbox-close')?.focus();
      document.body.style.overflow = 'hidden';
    }
    function close() {
      const ov = overlay();
      if (ov) ov.hidden = true;
      state = null;
      document.body.style.overflow = '';
    }
    function navigate(dir: number) {
      if (!state || state.images.length === 0) return;
      state.index = (state.index + dir + state.images.length) % state.images.length;
      show();
    }

    document.addEventListener('open-lightbox', (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const groupId = detail.groupId || 'content-images';
      const images = groupImages(groupId);
      if (images.length === 0) {
        const ov = overlay();
        const im = imgEl();
        if (ov && im) {
          im.src = detail.src;
          im.alt = detail.alt || '';
          ov.hidden = false;
          document.body.style.overflow = 'hidden';
          state = { images: [], index: 0 };
        }
        return;
      }
      let index = images.findIndex(
        (im) =>
          (im as HTMLImageElement).currentSrc === detail.src ||
          (im as HTMLImageElement).src === detail.src,
      );
      if (index === -1) index = 0;
      state = { images, index };
      show();
    });
    document.addEventListener('click', (e) => {
      const t = e.target as Element;
      if (!t) return;
      if (t.closest('[data-lightbox-close]')) return close();
      if (t.closest('[data-lightbox-prev]')) return navigate(-1);
      if (t.closest('[data-lightbox-next]')) return navigate(1);
      if (t.id === 'lightbox-overlay') return close();
    });
    document.addEventListener('keydown', (e) => {
      if (!state) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') navigate(-1);
      else if (e.key === 'ArrowRight') navigate(1);
    });
    document.addEventListener('astro:after-swap', () => {
      if (state) close();
    });
  }
  initLightbox();
</script>
<style>
  .lightbox-overlay {
    position: fixed;
    inset: 0;
    background: var(--color-surface-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    padding: var(--spacing-md);
  }
  .lightbox-overlay[hidden] {
    display: none;
  }
  .lightbox-image {
    max-width: 90vw;
    max-height: 85vh;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
  }
  .lightbox-caption {
    position: absolute;
    bottom: var(--spacing-lg);
    left: 50%;
    transform: translateX(-50%);
    color: var(--color-text-on-accent);
    font-size: var(--text-sm);
    max-width: 80vw;
    text-align: center;
  }
  .lightbox-close,
  .lightbox-nav {
    position: absolute;
    border: none;
    background: transparent;
    color: var(--color-text-on-accent);
    font-size: var(--text-2xl);
    cursor: pointer;
    padding: var(--spacing-xs);
    line-height: 1;
  }
  .lightbox-close {
    top: var(--spacing-sm);
    right: var(--spacing-md);
  }
  .lightbox-prev {
    left: var(--spacing-md);
    top: 50%;
    transform: translateY(-50%);
  }
  .lightbox-next {
    right: var(--spacing-md);
    top: 50%;
    transform: translateY(-50%);
  }
  .lightbox-overlay {
    transition: opacity calc(var(--duration-base) * var(--motion-scale)) var(--ease-out);
  }
  @media (prefers-reduced-motion: reduce) {
    .lightbox-overlay {
      transition: none;
    }
  }
</style>
```

- [ ] **Step 2: 修改 BaseLayout 挂载 Lightbox + head-extras 槽**

在 `src/components/layout/BaseLayout.astro` 的 import 区加:

```astro
import Lightbox from '@components/ui/Lightbox.astro';
```

在 `<head>` 内 `<BaseHead ... />` 之后加命名插槽:

```astro
<slot name="head-extras" />
```

在 `</body>` 前、`<Footer />` 之后加:

```astro
<Lightbox locale={locale} />
```

- [ ] **Step 3: 补 i18n 文案**

在 `src/i18n/ui/zh.ts` 的 common 相关 key 区追加:

```ts
  'common.close': '关闭',
  'common.prev': '上一张',
  'common.next': '下一张',
  'common.lightbox.label': '图片预览',
  'common.copy': '复制',
  'common.copied': '已复制',
```

在 `src/i18n/ui/en.ts` 追加:

```ts
  'common.close': 'Close',
  'common.prev': 'Previous',
  'common.next': 'Next',
  'common.lightbox.label': 'Image preview',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
```

- [ ] **Step 4: 验证 dev 渲染无报错**

Run: `pnpm dev`
Expected: 页面底部存在 `#lightbox-overlay`(hidden)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Lightbox.astro src/components/layout/BaseLayout.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat: add global Lightbox singleton with open-lightbox event protocol"
```

---

### Task 6: 客户端增强(ArticleImageEnhancer + CodeBlockEnhancer)

**Files:**

- Create: `src/components/article/ArticleImageEnhancer.ts`
- Create: `src/components/article/CodeBlockEnhancer.ts`
- Modify: `src/components/layout/BaseLayout.astro`(加全局增强 init 脚本 + aria-live 区 + sr-only 样式)

**Interfaces:**

- Consumes: Task 4/4b 注入的 `data-article-image`/`data-lightbox`/`data-lightbox-group`/`data-copy-button`/`data-code-block`/`data-code`;Task 5 的 `open-lightbox` 事件协议;`public/images/image-broken.svg`
- Produces:
  - `initArticleImageEnhancer()` — singleton document click 委托(`[data-lightbox]` → 派发 `open-lightbox`)+ 每次 `astro:page-load` 给当前页 `[data-article-image]` 绑 onerror 占位图(用 `data-img-error-bound` 标记防重复)
  - `initCodeBlockEnhancer()` — singleton document click 委托(`[data-copy-button]` → clipboard + aria-live 通知)

- [ ] **Step 1: 创建 ArticleImageEnhancer.ts**

```ts
// src/components/article/ArticleImageEnhancer.ts
const LB_CLICK_KEY = '__lb_click_init__';
const BROKEN_PLACEHOLDER = '/images/image-broken.svg';

export function initArticleImageEnhancer(): void {
  if (!(window as any)[LB_CLICK_KEY]) {
    (window as any)[LB_CLICK_KEY] = true;
    document.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      const img = target?.closest?.('[data-lightbox]') as HTMLImageElement | null;
      if (!img || img.tagName !== 'IMG') return;
      e.preventDefault();
      document.dispatchEvent(
        new CustomEvent('open-lightbox', {
          detail: {
            src: img.currentSrc || img.src,
            alt: img.alt,
            srcset: img.getAttribute('srcset') || undefined,
            groupId: img.getAttribute('data-lightbox-group') || 'content-images',
          },
        }),
      );
    });
  }

  const imgs = document.querySelectorAll<HTMLImageElement>(
    'img[data-article-image]:not([data-img-error-bound])',
  );
  imgs.forEach((img) => {
    img.setAttribute('data-img-error-bound', '');
    img.addEventListener('error', () => {
      if (img.src === BROKEN_PLACEHOLDER) return;
      img.src = BROKEN_PLACEHOLDER;
    });
  });
}
```

- [ ] **Step 2: 创建 CodeBlockEnhancer.ts**

```ts
// src/components/article/CodeBlockEnhancer.ts
const CB_KEY = '__cb_init__';

export function initCodeBlockEnhancer(): void {
  if ((window as any)[CB_KEY]) return;
  (window as any)[CB_KEY] = true;
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const btn = target?.closest?.('[data-copy-button]') as HTMLButtonElement | null;
    if (!btn) return;
    const block = btn.closest('[data-code-block]');
    const code = block?.querySelector('code');
    const text = code?.textContent ?? btn.getAttribute('data-code') ?? '';
    const live = document.getElementById('copy-live');
    const done = () => {
      if (live) {
        live.textContent = '已复制';
        window.setTimeout(() => {
          live.textContent = '';
        }, 1500);
      }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(done)
        .catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  });
}
```

- [ ] **Step 3: 修改 BaseLayout 加全局增强脚本 + aria-live**

在 `src/components/layout/BaseLayout.astro` 的 `<body>` 末尾(`<Lightbox />` 之后)加:

```astro
<span id="copy-live" aria-live="polite" class="sr-only"></span>
<script>
  import { initArticleImageEnhancer } from '@components/article/ArticleImageEnhancer.ts';
  import { initCodeBlockEnhancer } from '@components/article/CodeBlockEnhancer.ts';
  const ENH_KEY = '__enh_listeners__';
  if (!(window as any)[ENH_KEY]) {
    (window as any)[ENH_KEY] = true;
    document.addEventListener('astro:page-load', () => {
      initArticleImageEnhancer();
      initCodeBlockEnhancer();
    });
  }
</script>
<style is:global>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

> **生命周期(spec 5.20)**:`astro:page-load` 监听器只注册一次(`__enh_listeners__` 标志保护);`initArticleImageEnhancer` 内部 click 委托 singleton(`__lb_click_init__`),onerror 用 `data-img-error-bound` 防重复绑定;`initCodeBlockEnhancer` 纯 document 委托 singleton(`__cb_init__`)。

- [ ] **Step 4: 验证 dev 无报错 + 类型检查**

Run: `pnpm dev` 然后 `pnpm check`
Expected: dev 正常;`astro check` 通过

- [ ] **Step 5: Commit**

```bash
git add src/components/article/ArticleImageEnhancer.ts src/components/article/CodeBlockEnhancer.ts src/components/layout/BaseLayout.astro
git commit -m "feat: add ArticleImage/CodeBlock client enhancers (event delegation)"
```

---

### Task 7: EmptyState + ArticleCard + ArticleList

**Files:**

- Create: `src/components/common/EmptyState.astro`
- Create: `src/components/article/ArticleCard.astro`
- Create: `src/components/article/ArticleList.astro`
- Modify: `src/i18n/utils.ts`(加 `formatDate`)
- Modify: `src/i18n/ui/zh.ts`、`en.ts`(补 articles 文案)

**Interfaces:**

- Consumes: article entry schema(`entry.data.cover?: ImageMetadata`、`coverAlt`、`title`、`excerpt?`、`pubDate`、`category`、`tags[]`)、`@i18n/utils` 的 `t`/`Locale`、`astro:assets` 的 `Image`、`slugOf`(`@lib/i18n`)
- Produces:`EmptyState`(props `{ locale, message? }`)、`ArticleCard`(props `{ entry, locale }`)、`ArticleList`(props `{ entries, locale }`)、`formatDate(date, locale)`

- [ ] **Step 1: 在 i18n/utils.ts 加 formatDate**

在 `src/i18n/utils.ts` 末尾追加:

```ts
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
```

- [ ] **Step 2: 补 articles i18n 文案**

在 `src/i18n/ui/zh.ts` 追加:

```ts
  'articles.title': '文章',
  'articles.empty': '暂无文章',
  'articles.viewAll': '查看全部',
  'articles.readMore': '阅读全文',
  'articles.publishedOn': '发布于 {date}',
  'articles.updatedOn': '更新于 {date}',
  'articles.toc': '文章目录',
  'articles.untranslated': '本文暂无 {lang} 版本',
  'articles.readOriginal': '阅读{lang}原文',
  'articles.archive': '归档',
  'articles.tagged': '标签:{tag}',
  'articles.categorized': '分类:{cat}',
```

在 `src/i18n/ui/en.ts` 追加:

```ts
  'articles.title': 'Articles',
  'articles.empty': 'No articles yet',
  'articles.viewAll': 'View all',
  'articles.readMore': 'Read more',
  'articles.publishedOn': 'Published on {date}',
  'articles.updatedOn': 'Updated on {date}',
  'articles.toc': 'Table of contents',
  'articles.untranslated': 'This article has no {lang} version yet',
  'articles.readOriginal': 'Read the {lang} original',
  'articles.archive': 'Archive',
  'articles.tagged': 'Tagged: {tag}',
  'articles.categorized': 'Category: {cat}',
```

- [ ] **Step 3: 创建 EmptyState.astro**

```astro
---
// src/components/common/EmptyState.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
interface Props {
  locale: Locale;
  message?: string;
}
const { locale, message } = Astro.props;
const text = message ?? t(locale, 'common.empty');
---

<div class="empty-state">
  <p>{text}</p>
</div>
<style>
  .empty-state {
    padding: var(--spacing-2xl) var(--spacing-md);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-md);
  }
</style>
```

- [ ] **Step 4: 创建 ArticleCard.astro**

```astro
---
// src/components/article/ArticleCard.astro
import { Image } from 'astro:assets';
import { t, formatDate } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import { slugOf } from '@lib/i18n';
import type { CollectionEntry } from 'astro:content';

interface Props {
  entry: CollectionEntry<'articles'>;
  locale: Locale;
}
const { entry, locale } = Astro.props;
const { cover, coverAlt, title, excerpt, pubDate, category, tags } = entry.data;
const href = `/${locale}/articles/${slugOf(entry)}/`;
---

<article class="article-card">
  <a href={href} class="article-card-link">
    {
      cover && (
        <Image
          src={cover}
          alt={coverAlt}
          width={640}
          height={360}
          loading="lazy"
          class="article-card-cover"
        />
      )
    }
    <div class="article-card-body">
      <h2 class="article-card-title">{title}</h2>
      {excerpt && <p class="article-card-excerpt">{excerpt}</p>}
      <div class="article-card-meta">
        <time datetime={pubDate.toISOString()}>{formatDate(pubDate, locale)}</time>
        <span class="article-card-category">{category}</span>
      </div>
      {
        tags.length > 0 && (
          <ul class="article-card-tags">
            {tags.slice(0, 4).map((tag) => (
              <li class="article-card-tag">{tag}</li>
            ))}
          </ul>
        )
      }
    </div>
  </a>
</article>
<style>
  .article-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    overflow: hidden;
    transition:
      transform calc(var(--duration-base) * var(--motion-scale)) var(--ease-out),
      box-shadow calc(var(--duration-base) * var(--motion-scale)) var(--ease-out);
  }
  .article-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .article-card-link {
    display: block;
    color: inherit;
    text-decoration: none;
  }
  .article-card-cover {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }
  .article-card-body {
    padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
  }
  .article-card-title {
    font-size: var(--text-lg);
    font-weight: 600;
  }
  .article-card-excerpt {
    margin-top: var(--spacing-2xs);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
  .article-card-meta {
    display: flex;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
    color: var(--color-text-subtle);
    font-size: var(--text-xs);
  }
  .article-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2xs);
    margin-top: var(--spacing-xs);
    list-style: none;
    padding: 0;
  }
  .article-card-tag {
    padding: var(--spacing-3xs) var(--spacing-2xs);
    background: var(--color-surface-raised);
    border-radius: var(--radius-sm);
    font-size: var(--text-2xs);
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 5: 创建 ArticleList.astro**

```astro
---
// src/components/article/ArticleList.astro
import ArticleCard from './ArticleCard.astro';
import EmptyState from '@components/common/EmptyState.astro';
import type { Locale } from '@i18n/config';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entries: CollectionEntry<'articles'>[];
  locale: Locale;
}
const { entries, locale } = Astro.props;
---

{
  entries.length === 0 ? (
    <EmptyState locale={locale} />
  ) : (
    <div class="article-list">
      {entries.map((entry) => (
        <ArticleCard entry={entry} locale={locale} />
      ))}
    </div>
  )
}
<style>
  .article-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-md);
    max-width: var(--container-wide);
    margin: 0 auto;
    padding: var(--spacing-md);
  }
</style>
```

- [ ] **Step 6: 验证类型检查**

Run: `pnpm check`
Expected: 通过

- [ ] **Step 7: Commit**

```bash
git add src/components/common/EmptyState.astro src/components/article/ArticleCard.astro src/components/article/ArticleList.astro src/i18n/utils.ts src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat: add EmptyState, ArticleCard, ArticleList + formatDate"
```

---

### Task 8: ArticleProse + Toc + ReadingProgress + ArticleLayout

**Files:**

- Create: `src/components/article/ArticleProse.astro`
- Create: `src/components/article/Toc.astro`
- Create: `src/components/article/ReadingProgress.astro`
- Create: `src/layouts/ArticleLayout.astro`

**Interfaces:**

- Consumes: `prose.css`(Task 3)、`Content` 渲染组件(由页面 `entry.render()` 产出)、`headings`(`{ depth, slug, text }[]`)、Task 2 的 `buildHreflang`/`pickXDefault`、Task 1 的 `getLocalizedEntryPath`/`TranslationGroup`/`slugOf`、Plan 1 的 `LangSwitch`
- Produces:
  - `ArticleProse`(props `{ contentLocale, Content }` — Content 为渲染组件)
  - `Toc`(props `{ headings, locale }`)— IntersectionObserver 高亮,astro:page-load 初始化
  - `ReadingProgress`(props `{ locale }`)— scroll % + aria-live 里程碑(25/50/75/100)
  - `ArticleLayout`(props `{ locale, mode, contentLocale, entry?, group, routeSegment, Content?, headings? }`)— 组合 prose + toc + progress + 占位页渲染

- [ ] **Step 1: 创建 ArticleProse.astro**

```astro
---
// src/components/article/ArticleProse.astro
import '../styles/prose.css';
import type { ContentLocale } from '@i18n/config';
interface Props {
  contentLocale: ContentLocale;
  Content: unknown;
}
const { contentLocale, Content } = Astro.props;
const Rendered = Content as unknown as Astro.Component;
---

<article class="prose" lang={contentLocale}>
  <Rendered />
</article>
```

- [ ] **Step 2: 创建 Toc.astro**

```astro
---
// src/components/article/Toc.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
interface Heading {
  depth: number;
  slug: string;
  text: string;
}
interface Props {
  headings: Heading[];
  locale: Locale;
}
const { headings, locale } = Astro.props;
const items = headings.filter((h) => h.depth === 2 || h.depth === 3);
---

{
  items.length > 0 && (
    <nav class="toc" aria-label={t(locale, 'articles.toc')}>
      <ul class="toc-list">
        {items.map((h) => (
          <li class:list={['toc-item', { 'toc-item-h3': h.depth === 3 }]}>
            <a href={`#${h.slug}`} class="toc-link" data-toc-link data-target={h.slug}>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
<script>
  document.addEventListener('astro:page-load', () => {
    const links = document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]');
    if (links.length === 0) return;
    const targets = Array.from(links)
      .map((l) => document.getElementById(l.dataset.target || ''))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;
    const activeByScroll = () => {
      let current = targets[0]?.id;
      for (const el of targets) {
        if (el.getBoundingClientRect().top <= 120) current = el.id;
      }
      links.forEach((l) => l.classList.toggle('toc-link-active', l.dataset.target === current));
    };
    activeByScroll();
    window.addEventListener('scroll', activeByScroll, { passive: true });
  });
</script>
<style>
  .toc {
    position: sticky;
    top: var(--spacing-2xl);
    max-height: calc(100vh - var(--spacing-3xl));
    overflow-y: auto;
    padding: var(--spacing-sm);
  }
  .toc-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }
  .toc-item-h3 {
    padding-left: var(--spacing-sm);
  }
  .toc-link {
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: var(--text-xs);
    transition: color calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
  }
  .toc-link:hover {
    color: var(--color-text);
  }
  .toc-link-active {
    color: var(--color-accent);
    font-weight: 600;
  }
</style>
```

- [ ] **Step 3: 创建 ReadingProgress.astro**

```astro
---
// src/components/article/ReadingProgress.astro
import type { Locale } from '@i18n/config';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
---

<div class="reading-progress" role="status" aria-live="polite">
  <div class="reading-progress-bar" id="reading-progress-bar"></div>
  <span class="sr-only" id="reading-progress-text"></span>
</div>
<script>
  document.addEventListener('astro:page-load', () => {
    const bar = document.getElementById('reading-progress-bar');
    const text = document.getElementById('reading-progress-text');
    if (!bar || !text) return;
    let lastMilestone = -1;
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const pct = total > 0 ? Math.min(100, Math.max(0, (doc.scrollTop / total) * 100)) : 100;
      bar.style.width = pct + '%';
      const milestone = Math.floor(pct / 25) * 25;
      if (
        milestone !== lastMilestone &&
        (milestone === 25 || milestone === 50 || milestone === 75 || milestone === 100)
      ) {
        lastMilestone = milestone;
        text.textContent = milestone + '%';
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  });
</script>
<style>
  .reading-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    z-index: var(--z-overlay);
    background: transparent;
  }
  .reading-progress-bar {
    height: 100%;
    width: 0;
    background: var(--color-accent);
    transition: width 80ms linear;
  }
  @media (prefers-reduced-motion: reduce) {
    .reading-progress-bar {
      transition: none;
    }
  }
</style>
```

> **a11y(spec 5.9 P1-25)**:`role="status"` + `aria-live="polite"`(非 progressbar,因无已知 min/max);视觉进度条持续更新,无障碍文本仅在跨越 25/50/75/100 里程碑时更新,避免屏幕阅读器嘈杂。

- [ ] **Step 4: 创建 ArticleLayout.astro**

```astro
---
// src/layouts/ArticleLayout.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import ArticleProse from '@components/article/ArticleProse.astro';
import Toc from '@components/article/Toc.astro';
import ReadingProgress from '@components/article/ReadingProgress.astro';
import LangSwitch from '@components/common/LangSwitch.astro';
import { t } from '@i18n/utils';
import { defaultLocale, type Locale, type ContentLocale } from '@i18n/config';
import { siteConfig } from '@config/site';
import { buildHreflang, pickXDefault } from '@lib/seo';
import { getLocalizedEntryPath, slugOf, type TranslationGroup } from '@lib/i18n';
import type { CollectionEntry } from 'astro:content';

interface Props {
  locale: Locale;
  mode: 'render' | 'placeholder';
  contentLocale: ContentLocale;
  entry?: CollectionEntry<'articles'>;
  group: TranslationGroup<CollectionEntry<'articles'>>;
  routeSegment: string;
  Content?: unknown;
  headings?: { depth: number; slug: string; text: string }[];
}
const { locale, mode, contentLocale, entry, group, routeSegment, Content, headings } = Astro.props;

const renderLocales = (['zh', 'en'] as const).filter((l) => group[l]);
const alternates = renderLocales.map((l) => ({
  locale: l,
  url: new URL(getLocalizedEntryPath(group, l, routeSegment) ?? '/', siteConfig.siteUrl).toString(),
}));
const xDefault = pickXDefault(alternates, defaultLocale);
const hreflangTags = buildHreflang(alternates, xDefault);

const title = mode === 'render' && entry ? entry.data.title : t(locale, 'articles.title');
const description = mode === 'render' && entry ? entry.data.excerpt : undefined;
const canonicalPath =
  mode === 'placeholder'
    ? (getLocalizedEntryPath(group, contentLocale, routeSegment) ?? `/${locale}/${routeSegment}/`)
    : `/${locale}/${routeSegment}/${entry ? slugOf(entry) : ''}/`;
const canonicalURL = new URL(canonicalPath, siteConfig.siteUrl).toString();

const langName: Record<ContentLocale, string> = { zh: '中文', en: 'English' };
const placeholderLang = t(locale, 'langswitch.' + contentLocale);
---

<BaseLayout
  locale={locale}
  title={title}
  description={description}
  canonicalURL={canonicalURL}
  noindex={mode === 'placeholder'}
>
  <Fragment slot="head-extras" set:html={hreflangTags} />
  <ReadingProgress locale={locale} />
  <div class="article-layout">
    {
      mode === 'render' && Content && (
        <div class="article-grid">
          <Toc headings={headings ?? []} locale={locale} />
          <article class="article-main">
            <h1 class="article-title">{entry?.data.title}</h1>
            {entry?.data.pubDate && (
              <p class="article-date">
                {t(locale, 'articles.publishedOn', {
                  date: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
                    entry.data.pubDate,
                  ),
                })}
              </p>
            )}
            <ArticleProse contentLocale={contentLocale} Content={Content} />
          </article>
        </div>
      )
    }
    {
      mode === 'placeholder' && (
        <div class="article-placeholder">
          <h1 class="article-title">
            {t(locale, 'articles.untranslated', { lang: placeholderLang })}
          </h1>
          <p>
            <a href={getLocalizedEntryPath(group, contentLocale, routeSegment) ?? '#'}>
              {t(locale, 'articles.readOriginal', { lang: langName[contentLocale] })}
            </a>
          </p>
          <LangSwitch locale={locale} />
        </div>
      )
    }
  </div>
</BaseLayout>
<style>
  .article-layout {
    max-width: var(--container-wide);
    margin: 0 auto;
    padding: var(--spacing-md);
  }
  .article-grid {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: var(--spacing-lg);
  }
  .article-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    margin-bottom: var(--spacing-xs);
  }
  .article-date {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    margin-bottom: var(--spacing-md);
  }
  .article-main {
    min-width: 0;
  }
  .article-placeholder {
    max-width: var(--container-prose);
    margin: 0 auto;
    padding: var(--spacing-2xl) var(--spacing-md);
    text-align: center;
  }
  .article-placeholder p {
    margin-top: var(--spacing-md);
  }
  @media (max-width: 900px) {
    .article-grid {
      grid-template-columns: 1fr;
    }
    :global(.toc) {
      position: static;
      max-height: none;
    }
  }
</style>
```

> **占位页 SEO(spec 6.6)**:`noindex` + canonical 指向实际 render 语言版;hreflang 只含 render 页(`alternates` 已过滤为 renderLocales);`<html lang={uiLocale}>` 由 BaseLayout 设置,`<article lang={contentLocale}>` 由 ArticleProse 设置。

- [ ] **Step 5: 验证类型检查**

Run: `pnpm check`
Expected: 通过(若 `CollectionEntry<'articles'>` 类型推断失败,确认 Plan 2 的 `content.config.ts` 已 export collection)

- [ ] **Step 6: Commit**

```bash
git add src/components/article/ArticleProse.astro src/components/article/Toc.astro src/components/article/ReadingProgress.astro src/layouts/ArticleLayout.astro
git commit -m "feat: add ArticleProse, Toc, ReadingProgress, ArticleLayout"
```

---

### Task 9: 文章页面路由(列表/详情/占位/tag/category/archive)

**Files:**

- Create: `src/pages/[locale]/articles/index.astro`
- Create: `src/pages/[locale]/articles/[...slug].astro`
- Create: `src/pages/[locale]/articles/tag/[tag].astro`
- Create: `src/pages/[locale]/articles/category/[cat].astro`
- Create: `src/pages/[locale]/articles/archive.astro`

**Interfaces:**

- Consumes: `getCollection('articles')`(Plan 2)、Task 1 的 `getEntriesGroupedByTranslationKey`/`resolveLocalizedEntry`/`slugOf`/`TranslationGroup`、Task 7 的 `ArticleList`、Task 8 的 `ArticleLayout`、Plan 1 的 `BaseLayout`/`t`/`locales`
- Produces: 文章列表、文章详情(render + placeholder)、tag/category/archive 过滤页;`getStaticPaths` 遍历 group × locale(render 优先去重)

- [ ] **Step 1: 创建文章列表页**

```astro
---
// src/pages/[locale]/articles/index.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import ArticleList from '@components/article/ArticleList.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
export async function getStaticPaths() {
  return locales.map((l) => ({ params: { locale: l } }));
}
const { locale } = Astro.params as { locale: Locale };
const all = await getCollection('articles');
const entries = all
  .filter((e) => e.id.startsWith(locale + '/') && (!e.data.draft || import.meta.env.DEV))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---

<BaseLayout locale={locale} title={t(locale, 'articles.title')}>
  <h1 class="page-title">{t(locale, 'articles.title')}</h1>
  <ArticleList entries={entries} locale={locale} />
</BaseLayout>
<style>
  .page-title {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) 0;
    font-size: var(--text-3xl);
    font-weight: 700;
  }
</style>
```

- [ ] **Step 2: 创建文章详情/占位页([...slug].astro)**

```astro
---
// src/pages/[locale]/articles/[...slug].astro
import { getCollection } from 'astro:content';
import { locales, type Locale } from '@i18n/config';
import ArticleLayout from '@layouts/ArticleLayout.astro';
import {
  getEntriesGroupedByTranslationKey,
  resolveLocalizedEntry,
  slugOf,
  type TranslationGroup,
} from '@lib/i18n';
import type { CollectionEntry } from 'astro:content';

export async function getStaticPaths() {
  const all = await getCollection('articles');
  const entries = all.filter((e) => !e.data.draft || import.meta.env.DEV);
  const groups = getEntriesGroupedByTranslationKey(entries);
  const byKey = new Map<string, { params: any; props: any }>();
  const renderKeys = new Set<string>();

  for (const [, group] of groups) {
    for (const locale of locales) {
      const res = resolveLocalizedEntry(group, locale);
      if (res.mode !== 'render') continue;
      const sourceEntry = res.entry!;
      const slug = slugOf(sourceEntry);
      const key = `${locale}/${slug}`;
      renderKeys.add(key);
      byKey.set(key, {
        params: { locale, slug },
        props: {
          mode: 'render',
          contentLocale: res.contentLocale,
          entry: res.entry,
          group,
          routeSegment: 'articles',
        },
      });
    }
  }
  for (const [, group] of groups) {
    for (const locale of locales) {
      const res = resolveLocalizedEntry(group, locale);
      if (res.mode !== 'placeholder') continue;
      const sourceEntry = group.zh ?? group.en;
      if (!sourceEntry) continue;
      const slug = slugOf(sourceEntry);
      const key = `${locale}/${slug}`;
      if (renderKeys.has(key) || byKey.has(key)) continue;
      byKey.set(key, {
        params: { locale, slug },
        props: {
          mode: 'placeholder',
          contentLocale: res.contentLocale,
          entry: null,
          group,
          routeSegment: 'articles',
        },
      });
    }
  }
  return Array.from(byKey.values());
}

const { locale } = Astro.params as { locale: Locale };
const { mode, contentLocale, entry, group, routeSegment } = Astro.props as {
  mode: 'render' | 'placeholder';
  contentLocale: 'zh' | 'en';
  entry: CollectionEntry<'articles'> | null;
  group: TranslationGroup<CollectionEntry<'articles'>>;
  routeSegment: string;
};

let Content: unknown = undefined;
let headings: { depth: number; slug: string; text: string }[] = [];
if (mode === 'render' && entry) {
  const rendered = await entry.render();
  Content = rendered.Content;
  headings = rendered.headings ?? [];
}
---

<ArticleLayout
  locale={locale}
  mode={mode}
  contentLocale={contentLocale}
  entry={entry ?? undefined}
  group={group}
  routeSegment={routeSegment}
  Content={Content}
  headings={headings}
/>
```

> **去重纪律**:两遍遍历——第一遍收集所有 render 路径(`renderKeys`),第二遍只补不与 render 冲突的 placeholder(`renderKeys.has(key) → skip`);处理"两个不同 group 在同 locale 产生同 slug"的边界(render 优先)。

- [ ] **Step 3: 创建 tag 过滤页**

```astro
---
// src/pages/[locale]/articles/tag/[tag].astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import ArticleList from '@components/article/ArticleList.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
export async function getStaticPaths() {
  const all = await getCollection('articles');
  const tags = new Set<string>();
  for (const e of all.filter((e) => !e.data.draft)) for (const tag of e.data.tags) tags.add(tag);
  const paths: any[] = [];
  for (const locale of locales) for (const tag of tags) paths.push({ params: { locale, tag } });
  return paths;
}
const { locale, tag } = Astro.params as { locale: Locale; tag: string };
const all = await getCollection('articles');
const entries = all
  .filter(
    (e) =>
      e.id.startsWith(locale + '/') &&
      e.data.tags.includes(tag) &&
      (!e.data.draft || import.meta.env.DEV),
  )
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---

<BaseLayout locale={locale} title={t(locale, 'articles.tagged', { tag })} noindex>
  <h1 class="page-title">{t(locale, 'articles.tagged', { tag })}</h1>
  <ArticleList entries={entries} locale={locale} />
</BaseLayout>
<style>
  .page-title {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) 0;
    font-size: var(--text-2xl);
    font-weight: 700;
  }
</style>
```

- [ ] **Step 4: 创建 category 过滤页**

```astro
---
// src/pages/[locale]/articles/category/[cat].astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import ArticleList from '@components/article/ArticleList.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
export async function getStaticPaths() {
  const all = await getCollection('articles');
  const cats = new Set(all.filter((e) => !e.data.draft).map((e) => e.data.category));
  const paths: any[] = [];
  for (const locale of locales) for (const cat of cats) paths.push({ params: { locale, cat } });
  return paths;
}
const { locale, cat } = Astro.params as { locale: Locale; cat: string };
const all = await getCollection('articles');
const entries = all
  .filter(
    (e) =>
      e.id.startsWith(locale + '/') &&
      e.data.category === cat &&
      (!e.data.draft || import.meta.env.DEV),
  )
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---

<BaseLayout locale={locale} title={t(locale, 'articles.categorized', { cat })} noindex>
  <h1 class="page-title">{t(locale, 'articles.categorized', { cat })}</h1>
  <ArticleList entries={entries} locale={locale} />
</BaseLayout>
<style>
  .page-title {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) 0;
    font-size: var(--text-2xl);
    font-weight: 700;
  }
</style>
```

- [ ] **Step 5: 创建 archive 归档页**

```astro
---
// src/pages/[locale]/articles/archive.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import { t, formatDate } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
import { slugOf } from '@lib/i18n';
export async function getStaticPaths() {
  return locales.map((l) => ({ params: { locale: l } }));
}
const { locale } = Astro.params as { locale: Locale };
const all = await getCollection('articles');
const entries = all
  .filter((e) => e.id.startsWith(locale + '/') && (!e.data.draft || import.meta.env.DEV))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
const groups = new Map<string, typeof entries>();
for (const e of entries) {
  const key =
    e.data.pubDate.getFullYear() + '-' + String(e.data.pubDate.getMonth() + 1).padStart(2, '0');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(e);
}
---

<BaseLayout locale={locale} title={t(locale, 'articles.archive')} noindex>
  <div class="archive">
    <h1 class="page-title">{t(locale, 'articles.archive')}</h1>
    {
      Array.from(groups.entries()).map(([key, list]) => (
        <section class="archive-group">
          <h2 class="archive-month">{key}</h2>
          <ul class="archive-list">
            {list.map((e) => (
              <li>
                <a href={`/${locale}/articles/${slugOf(e)}/`}>{e.data.title}</a>{' '}
                <time>{formatDate(e.data.pubDate, locale)}</time>
              </li>
            ))}
          </ul>
        </section>
      ))
    }
  </div>
</BaseLayout>
<style>
  .archive {
    max-width: var(--container-prose);
    margin: 0 auto;
    padding: var(--spacing-md);
  }
  .page-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    margin-bottom: var(--spacing-md);
  }
  .archive-group {
    margin-top: var(--spacing-lg);
  }
  .archive-month {
    font-size: var(--text-xl);
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--spacing-2xs);
  }
  .archive-list {
    list-style: none;
    padding: 0;
    margin-top: var(--spacing-xs);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }
  .archive-list a {
    color: var(--color-accent);
    text-decoration: none;
  }
  .archive-list time {
    color: var(--color-text-subtle);
    font-size: var(--text-xs);
    margin-left: var(--spacing-xs);
  }
</style>
```

- [ ] **Step 6: 验证 build 生成路由**

Run: `pnpm build`(需 content 已 pull;若 Plan 2 fixture 存在)
Expected: 生成 `/zh/articles/`、`/en/articles/`、`/[locale]/articles/[slug]/`、占位页(`/ru/articles/<slug>/` 含 `noindex`)、tag/category/archive 页;无重复 path 报错

- [ ] **Step 7: Commit**

```bash
git add src/pages/[locale]/articles/
git commit -m "feat: add article pages (list, detail, placeholder, tag, category, archive)"
```

### Task 10: 工程卡片与展示组件

**Files:**

- Create: `src/components/project/ProjectCard.astro`
- Create: `src/components/project/ProjectList.astro`
- Create: `src/components/project/Gallery.astro`
- Create: `src/components/project/SpecsTable.astro`
- Create: `src/components/project/DatasheetDownload.astro`
- Create: `src/layouts/ProjectLayout.astro`
- Modify: `src/i18n/ui/zh.ts`、`en.ts`(补 projects 文案)

**Interfaces:**

- Consumes: project entry schema(含 `status`/`gallery`/`specs`/`datasheets`/`relatedLinks`)、`buildDownloadUrls`(`@lib/assets`,Plan 2,返回 `{ url, mirror }[]`)、`Image`(`astro:assets`)、`slugOf`、Task 8 的 `ArticleProse`(渲染工程 Markdown)、Task 5 的 Lightbox(经 `data-lightbox`)
- Produces:`ProjectCard`、`ProjectList`、`Gallery`(图廊图加 `data-lightbox`+`data-article-image`+`data-lightbox-group`,交互由全局 enhancer 承担)、`SpecsTable`、`DatasheetDownload`、`ProjectLayout`

- [ ] **Step 1: 补 projects i18n 文案**

在 `src/i18n/ui/zh.ts` 追加:

```ts
  'projects.title': '工程',
  'projects.empty': '暂无工程',
  'projects.viewAll': '查看全部',
  'projects.specs': '规格参数',
  'projects.datasheets': '数据手册',
  'projects.download': '下载',
  'projects.downloadFallback': '备用下载',
  'projects.relatedLinks': '相关链接',
  'projects.gallery': '图廊',
  'projects.status.ongoing': '进行中',
  'projects.status.completed': '已完成',
  'projects.status.archived': '已归档',
  'projects.status.planned': '计划中',
```

在 `src/i18n/ui/en.ts` 追加:

```ts
  'projects.title': 'Projects',
  'projects.empty': 'No projects yet',
  'projects.viewAll': 'View all',
  'projects.specs': 'Specifications',
  'projects.datasheets': 'Datasheets',
  'projects.download': 'Download',
  'projects.downloadFallback': 'Fallback download',
  'projects.relatedLinks': 'Related links',
  'projects.gallery': 'Gallery',
  'projects.status.ongoing': 'Ongoing',
  'projects.status.completed': 'Completed',
  'projects.status.archived': 'Archived',
  'projects.status.planned': 'Planned',
```

- [ ] **Step 2: 创建 ProjectCard.astro**

```astro
---
// src/components/project/ProjectCard.astro
import { Image } from 'astro:assets';
import { t, formatDate } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import { slugOf } from '@lib/i18n';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entry: CollectionEntry<'projects'>;
  locale: Locale;
}
const { entry, locale } = Astro.props;
const { cover, coverAlt, title, excerpt, pubDate, status } = entry.data;
const href = `/${locale}/projects/${slugOf(entry)}/`;
const statusClass = `status-${status}`;
---

<article class="project-card">
  <a href={href} class="project-card-link">
    {
      cover && (
        <Image
          src={cover}
          alt={coverAlt}
          width={640}
          height={360}
          loading="lazy"
          class="project-card-cover"
        />
      )
    }
    <div class="project-card-body">
      <div class="project-card-head">
        <h2 class="project-card-title">{title}</h2>
        <span class:list={['project-status', statusClass]}
          >{t(locale, 'projects.status.' + status)}</span
        >
      </div>
      {excerpt && <p class="project-card-excerpt">{excerpt}</p>}
      <time class="project-card-date" datetime={pubDate.toISOString()}
        >{formatDate(pubDate, locale)}</time
      >
    </div>
  </a>
</article>
<style>
  .project-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    overflow: hidden;
    transition:
      transform calc(var(--duration-base) * var(--motion-scale)) var(--ease-out),
      box-shadow calc(var(--duration-base) * var(--motion-scale)) var(--ease-out);
  }
  .project-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .project-card-link {
    display: block;
    color: inherit;
    text-decoration: none;
  }
  .project-card-cover {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }
  .project-card-body {
    padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
  }
  .project-card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-xs);
  }
  .project-card-title {
    font-size: var(--text-lg);
    font-weight: 600;
  }
  .project-card-excerpt {
    margin-top: var(--spacing-2xs);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
  .project-card-date {
    color: var(--color-text-subtle);
    font-size: var(--text-xs);
  }
  .project-status {
    padding: var(--spacing-3xs) var(--spacing-2xs);
    border-radius: var(--radius-sm);
    font-size: var(--text-2xs);
    white-space: nowrap;
  }
  .status-ongoing {
    background: color-mix(in srgb, var(--color-info) 18%, transparent);
    color: var(--color-info);
  }
  .status-completed {
    background: color-mix(in srgb, var(--color-success) 18%, transparent);
    color: var(--color-success);
  }
  .status-archived {
    background: color-mix(in srgb, var(--color-text-muted) 18%, transparent);
    color: var(--color-text-muted);
  }
  .status-planned {
    background: color-mix(in srgb, var(--color-warning) 18%, transparent);
    color: var(--color-warning);
  }
</style>
```

- [ ] **Step 3: 创建 ProjectList.astro**

```astro
---
// src/components/project/ProjectList.astro
import ProjectCard from './ProjectCard.astro';
import EmptyState from '@components/common/EmptyState.astro';
import type { Locale } from '@i18n/config';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entries: CollectionEntry<'projects'>[];
  locale: Locale;
}
const { entries, locale } = Astro.props;
---

{
  entries.length === 0 ? (
    <EmptyState locale={locale} />
  ) : (
    <div class="project-list">
      {entries.map((entry) => (
        <ProjectCard entry={entry} locale={locale} />
      ))}
    </div>
  )
}
<style>
  .project-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--spacing-md);
    max-width: var(--container-wide);
    margin: 0 auto;
    padding: var(--spacing-md);
  }
</style>
```

- [ ] **Step 4: 创建 Gallery.astro**

```astro
---
// src/components/project/Gallery.astro
import { Image } from 'astro:assets';
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import { slugOf } from '@lib/i18n';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entry: CollectionEntry<'projects'>;
  locale: Locale;
}
const { entry, locale } = Astro.props;
const groupId = 'project-' + slugOf(entry);
---

{
  entry.data.gallery.length > 0 && (
    <section class="gallery" aria-label={t(locale, 'projects.gallery')}>
      <h2 class="gallery-title">{t(locale, 'projects.gallery')}</h2>
      <div class="gallery-grid">
        {entry.data.gallery.map((item) => (
          <figure class="gallery-figure">
            <Image
              src={item.image}
              alt={item.alt}
              width={480}
              height={360}
              loading="lazy"
              data-article-image
              data-lightbox
              data-lightbox-group={groupId}
              class="gallery-img"
            />
            {item.caption && <figcaption class="gallery-caption">{item.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  )
}
<style>
  .gallery {
    margin: var(--spacing-lg) 0;
  }
  .gallery-title {
    font-size: var(--text-xl);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--spacing-sm);
  }
  .gallery-figure {
    margin: 0;
  }
  .gallery-img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: var(--radius-md);
    cursor: zoom-in;
  }
  .gallery-caption {
    text-align: center;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-top: var(--spacing-2xs);
  }
</style>
```

> **Lightbox 接入**:Gallery 图加 `data-lightbox`+`data-article-image`+`data-lightbox-group`,点击与 onerror 由 Task 6 的全局 `ArticleImageEnhancer` 统一处理(无需 Gallery 自带脚本)。

- [ ] **Step 5: 创建 SpecsTable.astro**

```astro
---
// src/components/project/SpecsTable.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entry: CollectionEntry<'projects'>;
  locale: Locale;
}
const { entry, locale } = Astro.props;
const specs = entry.data.specs;
---

{
  specs.length > 0 && (
    <section class="specs">
      <h2 class="specs-title">{t(locale, 'projects.specs')}</h2>
      <table class="specs-table">
        <tbody>
          {specs.map((s) => (
            <tr class="specs-row">
              <th scope="row" class="specs-label">
                {s.label}
              </th>
              <td class="specs-value">{s.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl class="specs-dl">
        {specs.map((s) => (
          <div class="specs-dl-item">
            <dt class="specs-label">{s.label}</dt>
            <dd class="specs-value">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
<style>
  .specs {
    margin: var(--spacing-lg) 0;
  }
  .specs-title {
    font-size: var(--text-xl);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }
  .specs-table {
    width: 100%;
    border-collapse: collapse;
  }
  .specs-row {
    border-bottom: 1px solid var(--color-border);
  }
  .specs-label {
    text-align: left;
    padding: var(--spacing-2xs) var(--spacing-xs);
    color: var(--color-text-muted);
    font-weight: 500;
    width: 40%;
  }
  .specs-value {
    padding: var(--spacing-2xs) var(--spacing-xs);
  }
  .specs-dl {
    display: none;
    margin: 0;
  }
  .specs-dl-item {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-2xs) 0;
    border-bottom: 1px solid var(--color-border);
  }
  @media (max-width: 600px) {
    .specs-table {
      display: none;
    }
    .specs-dl {
      display: block;
    }
  }
</style>
```

- [ ] **Step 6: 创建 DatasheetDownload.astro**

```astro
---
// src/components/project/DatasheetDownload.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import { buildDownloadUrls } from '@lib/assets';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entry: CollectionEntry<'projects'>;
  locale: Locale;
}
const { entry, locale } = Astro.props;
const datasheets = entry.data.datasheets;
---

{
  datasheets.length > 0 && (
    <section class="datasheets">
      <h2 class="datasheets-title">{t(locale, 'projects.datasheets')}</h2>
      <ul class="datasheets-list">
        {datasheets.map((ds) => {
          const urls = buildDownloadUrlssz(ds);
          const primary = urls[0];
          const fallbacks = urls.slice(1);
          return (
            <li class="datasheet-item">
              <a
                href={primary?.url}
                class="datasheet-primary"
                aria-label={t(locale, 'projects.download') + ' ' + ds.name}
                target="_blank"
                rel="noopener"
              >
                {ds.name}
                {ds.size && <span class="datasheet-size">{ds.size}</span>}
              </a>
              {fallbacks.length > 0 && (
                <details class="datasheet-fallback">
                  <summary>{t(locale, 'projects.downloadFallback')}</summary>
                  <ul>
                    {fallbacks.map((f) => (
                      <li>
                        <a href={f.url} target="_blank" rel="noopener">
                          {f.mirror}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  )
}
<style>
  .datasheets {
    margin: var(--spacing-lg) 0;
  }
  .datasheets-title {
    font-size: var(--text-xl);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }
  .datasheets-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .datasheet-primary {
    display: inline-flex;
    gap: var(--spacing-xs);
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-accent);
    color: var(--color-text-on-accent);
    border-radius: var(--radius-md);
    text-decoration: none;
  }
  .datasheet-primary:hover {
    background: var(--color-accent-hover);
  }
  .datasheet-size {
    font-size: var(--text-xs);
    opacity: 0.85;
  }
  .datasheet-fallback {
    margin-top: var(--spacing-2xs);
    font-size: var(--text-sm);
  }
</style>
```

> **实现修正**:Step 6 中 `buildDownloadUrlsz` 为占位拼写错误,实现时必须用 Plan 2 导出的正确函数名 **`buildDownloadUrls(ds)`**(返回 `{ url, mirror }[]`)。

- [ ] **Step 7: 创建 ProjectLayout.astro**

```astro
---
// src/layouts/ProjectLayout.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import ArticleProse from '@components/article/ArticleProse.astro';
import Gallery from '@components/project/Gallery.astro';
import SpecsTable from '@components/project/SpecsTable.astro';
import DatasheetDownload from '@components/project/DatasheetDownload.astro';
import LangSwitch from '@components/common/LangSwitch.astro';
import { t } from '@i18n/utils';
import { defaultLocale, type Locale, type ContentLocale } from '@i18n/config';
import { siteConfig } from '@config/site';
import { buildHreflang, pickXDefault } from '@lib/seo';
import { getLocalizedEntryPath, slugOf, type TranslationGroup } from '@lib/i18n';
import type { CollectionEntry } from 'astro:content';
interface Props {
  locale: Locale;
  mode: 'render' | 'placeholder';
  contentLocale: ContentLocale;
  entry?: CollectionEntry<'projects'>;
  group: TranslationGroup<CollectionEntry<'projects'>>;
  Content?: unknown;
}
const { locale, mode, contentLocale, entry, group, Content } = Astro.props;
const renderLocales = (['zh', 'en'] as const).filter((l) => group[l]);
const alternates = renderLocales.map((l) => ({
  locale: l,
  url: new URL(getLocalizedEntryPath(group, l, 'projects') ?? '/', siteConfig.siteUrl).toString(),
}));
const xDefault = pickXDefault(alternates, defaultLocale);
const hreflangTags = buildHreflang(alternates, xDefault);
const title = mode === 'render' && entry ? entry.data.title : t(locale, 'projects.title');
const canonicalPath =
  mode === 'placeholder'
    ? (getLocalizedEntryPath(group, contentLocale, 'projects') ?? `/${locale}/projects/`)
    : `/${locale}/projects/${entry ? slugOf(entry) : ''}/`;
const langName: Record<ContentLocale, string> = { zh: '中文', en: 'English' };
---

<BaseLayout
  locale={locale}
  title={title}
  canonicalURL={new URL(canonicalPath, siteConfig.siteUrl).toString()}
  noindex={mode === 'placeholder'}
>
  <Fragment slot="head-extras" set:html={hreflangTags} />
  <div class="project-layout">
    {
      mode === 'render' && Content && entry && (
        <article>
          <h1 class="project-title">{entry.data.title}</h1>
          <ArticleProse contentLocale={contentLocale} Content={Content} />
          <Gallery entry={entry} locale={locale} />
          <SpecsTable entry={entry} locale={locale} />
          <DatasheetDownload entry={entry} locale={locale} />
          {entry.data.relatedLinks.length > 0 && (
            <section class="related-links">
              <h2>{t(locale, 'projects.relatedLinks')}</h2>
              <ul>
                {entry.data.relatedLinks.map((l) => (
                  <li>
                    <a href={l.url} target="_blank" rel="noopener">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      )
    }
    {
      mode === 'placeholder' && (
        <div class="project-placeholder">
          <h1>
            {t(locale, 'articles.untranslated', { lang: t(locale, 'langswitch.' + contentLocale) })}
          </h1>
          <p>
            <a href={getLocalizedEntryPath(group, contentLocale, 'projects') ?? '#'}>
              {t(locale, 'articles.readOriginal', { lang: langName[contentLocale] })}
            </a>
          </p>
          <LangSwitch locale={locale} />
        </div>
      )
    }
  </div>
</BaseLayout>
<style>
  .project-layout {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-md);
  }
  .project-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    margin-bottom: var(--spacing-md);
  }
  .project-placeholder {
    max-width: var(--container-prose);
    margin: 0 auto;
    padding: var(--spacing-2xl) var(--spacing-md);
    text-align: center;
  }
  .related-links ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }
  .related-links a {
    color: var(--color-accent);
  }
</style>
```

- [ ] **Step 8: 验证类型检查**

Run: `pnpm check`
Expected: 通过

- [ ] **Step 9: Commit**

```bash
git add src/components/project/ src/layouts/ProjectLayout.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat: add project components (card, list, gallery, specs, datasheet, layout)"
```

---

### Task 11: 工程页面路由(列表/详情/占位)

**Files:**

- Create: `src/pages/[locale]/projects/index.astro`
- Create: `src/pages/[locale]/projects/[slug].astro`

**Interfaces:**

- Consumes: `getCollection('projects')`、Task 1 的分组/解析函数、Task 10 的 `ProjectLayout`/`ProjectList`
- Produces: 工程列表 + 详情(render + placeholder);`getStaticPaths` 同文章(render 优先去重)

- [ ] **Step 1: 创建工程列表页**

```astro
---
// src/pages/[locale]/projects/index.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import ProjectList from '@components/project/ProjectList.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
export async function getStaticPaths() {
  return locales.map((l) => ({ params: { locale: l } }));
}
const { locale } = Astro.params as { locale: Locale };
const all = await getCollection('projects');
const entries = all
  .filter((e) => e.id.startsWith(locale + '/') && (!e.data.draft || import.meta.env.DEV))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---

<BaseLayout locale={locale} title={t(locale, 'projects.title')}>
  <h1 class="page-title">{t(locale, 'projects.title')}</h1>
  <ProjectList entries={entries} locale={locale} />
</BaseLayout>
<style>
  .page-title {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) 0;
    font-size: var(--text-3xl);
    font-weight: 700;
  }
</style>
```

- [ ] **Step 2: 创建工程详情/占位页([slug].astro)**

```astro
---
// src/pages/[locale]/projects/[slug].astro
import { getCollection } from 'astro:content';
import { locales, type Locale } from '@i18n/config';
import ProjectLayout from '@layouts/ProjectLayout.astro';
import {
  getEntriesGroupedByTranslationKey,
  resolveLocalizedEntry,
  slugOf,
  type TranslationGroup,
} from '@lib/i18n';
import type { CollectionEntry } from 'astro:content';

export async function getStaticPaths() {
  const all = await getCollection('projects');
  const entries = all.filter((e) => !e.data.draft || import.meta.env.DEV);
  const groups = getEntriesGroupedByTranslationKey(entries);
  const byKey = new Map<string, { params: any; props: any }>();
  const renderKeys = new Set<string>();
  for (const [, group] of groups) {
    for (const locale of locales) {
      const res = resolveLocalizedEntry(group, locale);
      if (res.mode !== 'render') continue;
      const sourceEntry = res.entry!;
      const slug = slugOf(sourceEntry);
      const key = `${locale}/${slug}`;
      renderKeys.add(key);
      byKey.set(key, {
        params: { locale, slug },
        props: { mode: 'render', contentLocale: res.contentLocale, entry: res.entry, group },
      });
    }
  }
  for (const [, group] of groups) {
    for (const locale of locales) {
      const res = resolveLocalizedEntry(group, locale);
      if (res.mode !== 'placeholder') continue;
      const sourceEntry = group.zh ?? group.en;
      if (!sourceEntry) continue;
      const slug = slugOf(sourceEntry);
      const key = `${locale}/${slug}`;
      if (renderKeys.has(key) || byKey.has(key)) continue;
      byKey.set(key, {
        params: { locale, slug },
        props: { mode: 'placeholder', contentLocale: res.contentLocale, entry: null, group },
      });
    }
  }
  return Array.from(byKey.values());
}

const { locale } = Astro.params as { locale: Locale };
const { mode, contentLocale, entry, group } = Astro.props as {
  mode: 'render' | 'placeholder';
  contentLocale: 'zh' | 'en';
  entry: CollectionEntry<'projects'> | null;
  group: TranslationGroup<CollectionEntry<'projects'>>;
};
let Content: unknown = undefined;
if (mode === 'render' && entry) {
  const rendered = await entry.render();
  Content = rendered.Content;
}
---

<ProjectLayout
  locale={locale}
  mode={mode}
  contentLocale={contentLocale}
  entry={entry ?? undefined}
  group={group}
  Content={Content}
/>
```

- [ ] **Step 3: 验证 build 生成工程路由**

Run: `pnpm build`
Expected: 生成 `/[locale]/projects/`、`/[locale]/projects/[slug]/`、占位页;无重复 path 报错

- [ ] **Step 4: Commit**

```bash
git add src/pages/[locale]/projects/
git commit -m "feat: add project pages (list, detail, placeholder)"
```

---

### Task 12: 番剧墙 + StatusFilter + 番剧页面

**Files:**

- Create: `src/components/collection/AnimeCard.astro`
- Create: `src/components/collection/StatusFilter.astro`
- Create: `src/components/collection/AnimeWall.astro`
- Create: `src/pages/[locale]/collection/anime.astro`
- Modify: `src/i18n/ui/zh.ts`、`en.ts`(补 anime 文案)

**Interfaces:**

- Consumes: `getCollection('anime')`(Plan 2,JSON collection,`entry.data` = item)anime schema(`status`/`cover?`(远程 url)/`score?`/`watchedDate?`/`highlight`/`titleZh?`/`title`/`comment?`)、`formatDate`
- Produces:`AnimeCard`(props `{ entry, locale }`)、`StatusFilter`(props `{ locale }`,5 tab 单选默认"全部",URL `?status=` 同步用 `history.replaceState`)、`AnimeWall`(props `{ entries, locale }`)、番剧页面;`data-status` 卡片属性供客户端过滤

- [ ] **Step 1: 补 anime i18n 文案**

在 `src/i18n/ui/zh.ts` 追加:

```ts
  'anime.title': '番剧',
  'anime.empty': '暂无番剧',
  'anime.status.all': '全部',
  'anime.status.finished': '看完',
  'anime.status.watching': '在看',
  'anime.status.planned': '想看',
  'anime.status.dropped': '弃坑',
  'anime.score': '评分',
  'anime.comment': '感想',
```

在 `src/i18n/ui/en.ts` 追加:

```ts
  'anime.title': 'Anime',
  'anime.empty': 'No anime yet',
  'anime.status.all': 'All',
  'anime.status.finished': 'Finished',
  'anime.status.watching': 'Watching',
  'anime.status.planned': 'Planned',
  'anime.status.dropped': 'Dropped',
  'anime.score': 'Score',
  'anime.comment': 'Thoughts',
```

- [ ] **Step 2: 创建 StatusFilter.astro**

```astro
---
// src/components/collection/StatusFilter.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
const statuses = ['all', 'finished', 'watching', 'planned', 'dropped'] as const;
---

<div class="status-filter" data-status-filter>
  <div class="status-filter-tabs" role="tablist" aria-label={t(locale, 'anime.title')}>
    {
      statuses.map((s, i) => (
        <button
          type="button"
          role="tab"
          class:list={['status-tab', { active: s === 'all' }]}
          data-status-tab={s}
          aria-selected={s === 'all' ? 'true' : 'false'}
          tabindex={i === 0 ? 0 : -1}
        >
          {t(locale, 'anime.status.' + s)}
        </button>
      ))
    }
  </div>
</div>
<script>
  document.addEventListener('astro:page-load', () => {
    const root = document.querySelector('[data-status-filter]');
    if (!root) return;
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-status-tab]'));
    const wall = document.querySelector('[data-anime-wall]');
    if (tabs.length === 0 || !wall) return;

    const setStatus = (status: string) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.statusTab === status;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
      });
      wall.querySelectorAll<HTMLElement>('[data-anime-card]').forEach((card) => {
        const match = status === 'all' || card.dataset.status === status;
        card.hidden = !match;
      });
      const url = new URL(window.location.href);
      if (status === 'all') url.searchParams.delete('status');
      else url.searchParams.set('status', status);
      window.history.replaceState({}, '', url);
    };

    tabs.forEach((tab) =>
      tab.addEventListener('click', () => setStatus(tab.dataset.statusTab || 'all')),
    );

    const current = new URL(window.location.href).searchParams.get('status');
    if (current && tabs.some((t) => t.dataset.statusTab === current)) setStatus(current);

    root.addEventListener('keydown', (e) => {
      const idx = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      if (e.key === 'ArrowRight') {
        const n = (idx + 1) % tabs.length;
        tabs[n].focus();
        tabs[n].click();
      }
      if (e.key === 'ArrowLeft') {
        const n = (idx - 1 + tabs.length) % tabs.length;
        tabs[n].focus();
        tabs[n].click();
      }
    });
  });
</script>
<style>
  .status-filter-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2xs);
    padding: var(--spacing-xs) var(--spacing-md);
  }
  .status-tab {
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    padding: var(--spacing-2xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    cursor: pointer;
    font-size: var(--text-sm);
    transition:
      background calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out),
      color calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
  }
  .status-tab:hover {
    color: var(--color-text);
  }
  .status-tab.active {
    background: var(--color-accent);
    color: var(--color-text-on-accent);
  }
</style>
```

> **URL 同步纪律(P2-31)**:用 `history.replaceState` 更新 `?status=`,**不**触发 ClientRouter 导航、**不**重跑 page-load;仅切显隐(数据一次性注入)。

- [ ] **Step 3: 创建 AnimeCard.astro**

```astro
---
// src/components/collection/AnimeCard.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entry: CollectionEntry<'anime'>;
  locale: Locale;
}
const { entry, locale } = Astro.props;
const { title, titleZh, cover, score, status, comment, highlight, year } = entry.data;
const displayTitle = titleZh || title;
const statusClass = `anime-status-${status}`;
---

<article class:list={['anime-card', { highlight }]} data-anime-card data-status={status}>
  {
    cover ? (
      <img src={cover} alt={displayTitle} loading="lazy" class="anime-cover" data-article-image />
    ) : (
      <div class="anime-cover anime-cover-placeholder" data-article-image>
        {displayTitle}
      </div>
    )
  }
  <div class="anime-body">
    <h3 class="anime-title">{displayTitle}</h3>
    <div class="anime-meta">
      <span class:list={['anime-status-badge', statusClass]}
        >{t(locale, 'anime.status.' + status)}</span
      >
      {
        score != null && (
          <span class="anime-score">
            {t(locale, 'anime.score')}: {score}
          </span>
        )
      }
      {year && <span class="anime-year">{year}</span>}
    </div>
    {comment && <p class="anime-comment">{comment}</p>}
  </div>
</article>
<style>
  .anime-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--color-surface);
    cursor: pointer;
    transition:
      transform calc(var(--duration-base) * var(--motion-scale)) var(--ease-spring),
      box-shadow calc(var(--duration-base) * var(--motion-scale)) var(--ease-out);
  }
  .anime-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
  }
  .anime-card.highlight {
    box-shadow: var(--shadow-glow);
    border-color: var(--color-accent);
  }
  .anime-cover {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
  }
  .anime-cover-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs);
    text-align: center;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: var(--color-surface-raised);
  }
  .anime-body {
    padding: var(--spacing-xs);
  }
  .anime-title {
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .anime-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2xs);
    margin-top: var(--spacing-2xs);
    font-size: var(--text-2xs);
    color: var(--color-text-muted);
  }
  .anime-status-badge {
    padding: var(--spacing-3xs) var(--spacing-2xs);
    border-radius: var(--radius-sm);
  }
  .anime-status-finished {
    background: color-m-mix(in srgb, var(--color-success) 18%, transparent);
    color: var(--color-success);
  }
  .anime-status-watching {
    background: color-mix(in srgb, var(--color-info) 18%, transparent);
    color: var(--color-info);
  }
  .anime-status-planned {
    background: color-mix(in srgb, var(--color-warning) 18%, transparent);
    color: var(--color-warning);
  }
  .anime-status-dropped {
    background: color-mix(in srgb, var(--color-text-muted) 18%, transparent);
    color: var(--color-text-muted);
  }
  .anime-comment {
    margin-top: var(--spacing-2xs);
    font-size: var(--text-2xs);
    color: var(--color-text-muted);
  }
</style>
```

> **实现修正**:Step 3 样式中 `.anime-status-finished` 行的 `color-m-mix` 为拼写错误,实现时用 **`color-mix`**。

- [ ] **Step 4: 创建 AnimeWall.astro**

```astro
---
// src/components/collection/AnimeWall.astro
import AnimeCard from './AnimeCard.astro';
import EmptyState from '@components/common/EmptyState.astro';
import type { Locale } from '@i18n/config';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entries: CollectionEntry<'anime'>[];
  locale: Locale;
}
const { entries, locale } = Astro.props;
---

{
  entries.length === 0 ? (
    <EmptyState locale={locale} />
  ) : (
    <div class="anime-wall" data-anime-wall>
      {entries.map((entry) => (
        <AnimeCard entry={entry} locale={locale} />
      ))}
    </div>
  )
}
<style>
  .anime-wall {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    max-width: var(--container-wide);
    margin: 0 auto;
  }
  @media (min-width: 768px) {
    .anime-wall {
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    }
  }
  @media (min-width: 1024px) {
    .anime-wall {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }
</style>
```

- [ ] **Step 5: 创建番剧页面**

```astro
---
// src/pages/[locale]/collection/anime.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import StatusFilter from '@components/collection/StatusFilter.astro';
import AnimeWall from '@components/collection/AnimeWall.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
export async function getStaticPaths() {
  return locales.map((l) => ({ params: { locale: l } }));
}
const { locale } = Astro.params as { locale: Locale };
const all = await getCollection('anime');
const entries = all.sort(
  (a, b) => (b.data.watchedDate?.valueOf() ?? 0) - (a.data.watchedDate?.valueOf() ?? 0),
);
---

<BaseLayout locale={locale} title={t(locale, 'anime.title')}>
  <h1 class="page-title">{t(locale, 'anime.title')}</h1>
  <StatusFilter locale={locale} />
  <AnimeWall entries={entries} locale={locale} />
</BaseLayout>
<style>
  .page-title {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) 0;
    font-size: var(--text-3xl);
    font-weight: 700;
  }
</style>
```

- [ ] **Step 6: 验证 build + 类型检查**

Run: `pnpm check` 然后 `pnpm build`
Expected: 生成 `/[locale]/collection/anime/`;类型通过

- [ ] **Step 7: Commit**

```bash
git add src/components/collection/AnimeCard.astro src/components/collection/StatusFilter.astro src/components/collection/AnimeWall.astro src/pages/[locale]/collection/anime.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat: add anime wall with single-select StatusFilter + URL sync"
```

### Task 13: 术曲墙 + 番&术总览页

**Files:**

- Create: `src/components/collection/VocaloidCard.astro`
- Create: `src/components/collection/VocaloidWall.astro`
- Create: `src/pages/[locale]/collection/index.astro`
- Create: `src/pages/[locale]/collection/vocaloid.astro`
- Modify: `src/i18n/ui/zh.ts`、`en.ts`(补 vocaloid/collection 文案)

**Interfaces:**

- Consumes: `getCollection('vocaloid')`(JSON collection)vocaloid schema(`producer`/`vocaloid[]`/`cover?`/`score?`/`status`/`platform[]`/`lyricSnippet?`/`comment?`/`highlight`)、`formatDate`
- Produces:`VocaloidCard`(props `{ entry, locale }`,点击展开 `lyricSnippet`+`comment`)、`VocaloidWall`(props `{ entries, locale }`)、术曲页面、番&术总览页(CollectionNav)

- [ ] **Step 1: 补 vocaloid/collection i18n 文案**

在 `src/i18n/ui/zh.ts` 追加:

```ts
  'vocaloid.title': '术曲',
  'vocaloid.empty': '暂无术曲',
  'vocaloid.producer': 'P 主',
  'vocaloid.platform': '平台',
  'vocaloid.lyric': '歌词片段',
  'vocaloid.comment': '感想',
  'collection.title': '番 & 术',
  'collection.anime': '番剧墙',
  'collection.vocaloid': '术曲墙',
  'collection.animeDesc': '我看过的番剧',
  'collection.vocaloidDesc': '我喜欢的术力口',
```

在 `src/i18n/ui/en.ts` 追加:

```ts
  'vocaloid.title': 'Vocaloid',
  'vocaloid.empty': 'No vocaloid tracks yet',
  'vocaloid.producer': 'Producer',
  'vocaloid.platform': 'Platform',
  'vocaloid.lyric': 'Lyric snippet',
  'vocaloid.comment': 'Thoughts',
  'collection.title': 'Anime & Vocaloid',
  'collection.anime': 'Anime Wall',
  'collection.vocaloid': 'Vocaloid Wall',
  'collection.animeDesc': 'Anime I have watched',
  'collection.vocaloidDesc': 'Vocaloid tracks I love',
```

- [ ] **Step 2: 创建 VocaloidCard.astro**

```astro
---
// src/components/collection/VocaloidCard.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entry: CollectionEntry<'vocaloid'>;
  locale: Locale;
}
const { entry, locale } = Astro.props;
const { title, producer, vocaloid, cover, score, platform, lyricSnippet, comment, highlight } =
  entry.data;
---

<article class:list={['vocaloid-card', { highlight }]} data-vocaloid-card>
  {
    cover && (
      <img src={cover} alt={title} loading="lazy" class="vocaloid-cover" data-article-image />
    )
  }
  <div class="vocaloid-body">
    <h3 class="vocaloid-title">{title}</h3>
    <p class="vocaloid-producer">{t(locale, 'vocaloid.producer')}: {producer}</p>
    {vocaloid.length > 0 && <p class="vocaloid-vocaloid">{vocaloid.join(' / ')}</p>}
    {
      score != null && (
        <p class="vocaloid-score">
          {t(locale, 'anime.score')}: {score}
        </p>
      )
    }
    {
      platform.length > 0 && (
        <ul class="vocaloid-platforms">
          {platform.map((p) => (
            <li>
              <a href={p.url} target="_blank" rel="noopener">
                {p.name}
              </a>
            </li>
          ))}
        </ul>
      )
    }
    {
      (lyricSnippet || comment) && (
        <details class="vocaloid-details">
          <summary>{t(locale, 'vocaloid.comment')}</summary>
          {lyricSnippet && <blockquote class="vocaloid-lyric">{lyricSnippet}</blockquote>}
          {comment && <p class="vocaloid-comment">{comment}</p>}
        </details>
      )
    }
  </div>
</article>
<style>
  .vocaloid-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--color-surface);
  }
  .vocaloid-card.highlight {
    box-shadow: var(--shadow-glow);
    border-color: var(--color-accent);
  }
  .vocaloid-cover {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
  }
  .vocaloid-body {
    padding: var(--spacing-sm);
  }
  .vocaloid-title {
    font-size: var(--text-md);
    font-weight: 600;
  }
  .vocaloid-producer,
  .vocaloid-vocaloid,
  .vocaloid-score {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-top: var(--spacing-2xs);
  }
  .vocaloid-platforms {
    list-style: none;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2xs);
    margin-top: var(--spacing-xs);
  }
  .vocaloid-platforms a {
    color: var(--color-accent);
    text-decoration: none;
    font-size: var(--text-2xs);
  }
  .vocaloid-details {
    margin-top: var(--spacing-xs);
  }
  .vocaloid-lyric {
    margin: var(--spacing-2xs) 0;
    padding-left: var(--spacing-xs);
    border-left: 2px solid var(--color-border);
    font-style: italic;
    font-size: var(--text-xs);
  }
  .vocaloid-comment {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 3: 创建 VocaloidWall.astro**

```astro
---
// src/components/collection/VocaloidWall.astro
import VocaloidCard from './VocaloidCard.astro';
import EmptyState from '@components/common/EmptyState.astro';
import type { Locale } from '@i18n/config';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entries: CollectionEntry<'vocaloid'>[];
  locale: Locale;
}
const { entries, locale } = Astro.props;
---

{
  entries.length === 0 ? (
    <EmptyState locale={locale} />
  ) : (
    <div class="vocaloid-wall">
      {entries.map((entry) => (
        <VocaloidCard entry={entry} locale={locale} />
      ))}
    </div>
  )
}
<style>
  .vocaloid-wall {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    max-width: var(--container-wide);
    margin: 0 auto;
  }
</style>
```

- [ ] **Step 4: 创建术曲页面**

```astro
---
// src/pages/[locale]/collection/vocaloid.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import VocaloidWall from '@components/collection/VocaloidWall.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
export async function getStaticPaths() {
  return locales.map((l) => ({ params: { locale: l } }));
}
const { locale } = Astro.params as { locale: Locale };
const all = await getCollection('vocaloid');
const entries = all.sort(
  (a, b) => (b.data.listenedDate?.valueOf() ?? 0) - (a.data.listenedDate?.valueOf() ?? 0),
);
---

<BaseLayout locale={locale} title={t(locale, 'vocaloid.title')}>
  <h1 class="page-title">{t(locale, 'vocaloid.title')}</h1>
  <VocaloidWall entries={entries} locale={locale} />
</BaseLayout>
<style>
  .page-title {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) 0;
    font-size: var(--text-3xl);
    font-weight: 700;
  }
</style>
```

- [ ] **Step 5: 创建番&术总览页**

```astro
---
// src/pages/[locale]/collection/index.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
export async function getStaticPaths() {
  return locales.map((l) => ({ params: { locale: l } }));
}
const { locale } = Astro.params as { locale: Locale };
const items = [
  {
    key: 'collection.anime',
    descKey: 'collection.animeDesc',
    href: `/${locale}/collection/anime/`,
  },
  {
    key: 'collection.vocaloid',
    descKey: 'collection.vocaloidDesc',
    href: `/${locale}/collection/vocaloid/`,
  },
];
---

<BaseLayout locale={locale} title={t(locale, 'collection.title')}>
  <div class="collection-nav">
    <h1 class="page-title">{t(locale, 'collection.title')}</h1>
    <ul class="collection-list">
      {
        items.map((item) => (
          <li class="collection-item">
            <a href={item.href} class="collection-link">
              <h2>{t(locale, item.key)}</h2>
              <p>{t(locale, item.descKey)}</p>
            </a>
          </li>
        ))
      }
    </ul>
  </div>
</BaseLayout>
<style>
  .collection-nav {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-md);
  }
  .page-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    margin-bottom: var(--spacing-md);
  }
  .collection-list {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-md);
  }
  .collection-item {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    transition: transform calc(var(--duration-base) * var(--motion-scale)) var(--ease-out);
  }
  .collection-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .collection-link {
    display: block;
    padding: var(--spacing-md);
    color: inherit;
    text-decoration: none;
  }
  .collection-link h2 {
    font-size: var(--text-xl);
    font-weight: 600;
  }
  .collection-link p {
    margin-top: var(--spacing-2xs);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>
```

- [ ] **Step 6: 验证 build + 类型检查**

Run: `pnpm check` 然后 `pnpm build`
Expected: 生成 `/[locale]/collection/`、`/[locale]/collection/vocaloid/`;类型通过

- [ ] **Step 7: Commit**

```bash
git add src/components/collection/VocaloidCard.astro src/components/collection/VocaloidWall.astro src/pages/[locale]/collection/index.astro src/pages/[locale]/collection/vocaloid.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat: add vocaloid wall + collection overview page"
```

---

### Task 14: 友链页(FriendList + FriendCard)

**Files:**

- Create: `src/components/friends/FriendCard.astro`
- Create: `src/components/friends/FriendList.astro`
- Create: `src/pages/[locale]/friends/index.astro`
- Modify: `src/i18n/ui/zh.ts`、`en.ts`(补 friends 文案)

**Interfaces:**

- Consumes: `getCollection('friends')`(JSON collection)friend schema(`name`/`url`/`avatar?`/`description`/`tags[]`/`status: 'active'|'inactive'|'mutual'`)
- Produces:`FriendCard`(props `{ entry, locale }`,整卡 `<a target=_blank rel=noopener>`,状态 badge 语义色)、`FriendList`(props `{ entries, locale }`)、友链页面;页面底部预留 `<Comments />` 与 `<Travellings />` 自闭合标签位置(Plan 4 实现可插拔 Integration,本 Task 留 TODO 注释占位但**不引入** Integration 代码)

- [ ] **Step 1: 补 friends i18n 文案**

在 `src/i18n/ui/zh.ts` 追加:

```ts
  'friends.title': '朋友',
  'friends.empty': '暂无友链',
  'friends.status.active': '活跃',
  'friends.status.inactive': '失联',
  'friends.status.mutual': '互友',
  'friends.guestbook': '留言板',
```

在 `src/i18n/ui/en.ts` 追加:

```ts
  'friends.title': 'Friends',
  'friends.empty': 'No friends yet',
  'friends.status.active': 'Active',
  'friends.status.inactive': 'Inactive',
  'friends.status.mutual': 'Mutual',
  'friends.guestbook': 'Guestbook',
```

- [ ] **Step 2: 创建 FriendCard.astro**

```astro
---
// src/components/friends/FriendCard.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entry: CollectionEntry<'friends'>;
  locale: Locale;
}
const { entry, locale } = Astro.props;
const { name, url, avatar, description, tags, status } = entry.data;
const statusClass = `friend-status-${status}`;
---

<a href={url} class="friend-card" target="_blank" rel="noopener">
  {
    avatar ? (
      <img src={avatar} alt={name} loading="lazy" class="friend-avatar" data-article-image />
    ) : (
      <div class="friend-avatar friend-avatar-placeholder">{name.charAt(0)}</div>
    )
  }
  <div class="friend-body">
    <div class="friend-head">
      <h3 class="friend-name">{name}</h3>
      <span class:list={['friend-status-badge', statusClass]}
        >{t(locale, 'friends.status.' + status)}</span
      >
    </div>
    {description && <p class="friend-desc">{description}</p>}
    {
      tags.length > 0 && (
        <ul class="friend-tags">
          {tags.map((tag) => (
            <li class="friend-tag">{tag}</li>
          ))}
        </ul>
      )
    }
  </div>
</a>
<style>
  .friend-card {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: inherit;
    text-decoration: none;
    transition:
      transform calc(var(--duration-base) * var(--motion-scale)) var(--ease-out),
      box-shadow calc(var(--duration-base) * var(--motion-scale)) var(--ease-out);
  }
  .friend-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .friend-avatar {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    object-fit: cover;
    flex-shrink: 0;
  }
  .friend-avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-raised);
    color: var(--color-text-muted);
    font-weight: 600;
  }
  .friend-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-xs);
  }
  .friend-name {
    font-size: var(--text-md);
    font-weight: 600;
  }
  .friend-desc {
    margin-top: var(--spacing-2xs);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
  .friend-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2xs);
    margin-top: var(--spacing-xs);
    list-style: none;
    padding: 0;
  }
  .friend-tag {
    padding: var(--spacing-3xs) var(--spacing-2xs);
    background: var(--color-surface-raised);
    border-radius: var(--radius-sm);
    font-size: var(--text-2xs);
    color: var(--color-text-muted);
  }
  .friend-status-badge {
    padding: var(--spacing-3xs) var(--spacing-2xs);
    border-radius: var(--radius-sm);
    font-size: var(--text-2xs);
    white-space: nowrap;
  }
  .friend-status-mutual {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    color: var(--color-accent);
  }
  .friend-status-active {
    background: color-mix(in srgb, var(--color-info) 18%, transparent);
    color: var(--color-info);
  }
  .friend-status-inactive {
    background: color-mix(in srgb, var(--color-text-muted) 18%, transparent);
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 3: 创建 FriendList.astro**

```astro
---
// src/components/friends/FriendList.astro
import FriendCard from './FriendCard.astro';
import EmptyState from '@components/common/EmptyState.astro';
import type { Locale } from '@i18n/config';
import type { CollectionEntry } from 'astro:content';
interface Props {
  entries: CollectionEntry<'friends'>[];
  locale: Locale;
}
const { entries, locale } = Astro.props;
---

{
  entries.length === 0 ? (
    <EmptyState locale={locale} />
  ) : (
    <div class="friend-list">
      {entries.map((entry) => (
        <FriendCard entry={entry} locale={locale} />
      ))}
    </div>
  )
}
<style>
  .friend-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    max-width: var(--container-wide);
    margin: 0 auto;
  }
</style>
```

- [ ] **Step 4: 创建友链页面**

```astro
---
// src/pages/[locale]/friends/index.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import FriendList from '@components/friends/FriendList.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
export async function getStaticPaths() {
  return locales.map((l) => ({ params: { locale: l } }));
}
const { locale } = Astro.params as { locale: Locale };
const all = await getCollection('friends');
const entries = all.sort(
  (a, b) => (b.data.addedDate?.valueOf() ?? 0) - (a.data.addedDate?.valueOf() ?? 0),
);
---

<BaseLayout locale={locale} title={t(locale, 'friends.title')}>
  <h1 class="page-title">{t(locale, 'friends.title')}</h1>
  <FriendList entries={entries} locale={locale} />
  <section class="guestbook" aria-label={t(locale, 'friends.guestbook')}>
    <h2>{t(locale, 'friends.guestbook')}</h2>
    <!-- Plan 4: <Travellings locale={locale} /> 与 <Comments locale={locale} category="guestbook" /> 在此挂载 -->
  </section>
</BaseLayout>
<style>
  .page-title {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md) 0;
    font-size: var(--text-3xl);
    font-weight: 700;
  }
  .guestbook {
    max-width: var(--container-prose);
    margin: var(--spacing-xl) auto;
    padding: var(--spacing-md);
  }
  .guestbook h2 {
    font-size: var(--text-xl);
    font-weight: 600;
    margin-bottom: var(--spacing-md);
  }
</style>
```

- [ ] **Step 5: 验证 build + 类型检查**

Run: `pnpm check` 然后 `pnpm build`
Expected: 生成 `/[locale]/friends/`;类型通过

- [ ] **Step 6: Commit**

```bash
git add src/components/friends/ src/pages/[locale]/friends/index.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat: add friends page (FriendCard, FriendList) with guestbook slot"
```

---

### Task 15: Hero + HomeSections + 首页

**Files:**

- Create: `src/components/home/Hero.astro`
- Create: `src/components/home/Hero.module.css`
- Create: `src/components/home/HomeSections.astro`
- Modify: `src/pages/[locale]/index.astro`(替换 Plan 1 占位)
- Modify: `src/i18n/ui/zh.ts`、`en.ts`(补 home 文案)

**Interfaces:**

- Consumes: `Image`(`astro:assets`)、各领域 Card 组件(ArticleCard/ProjectCard/AnimeCard/VocaloidCard)、`getCollection`、`t`、`slugOf`
- Produces:`Hero`(全屏大图 `fetchpriority="high"` + CSS keyframes + 轻量 Canvas 粒子,reduced-motion 停)、`HomeSections`(聚合最新文章/工程/番剧精选/术曲精选/友链入口/关于摘要,每块"查看全部 →")、首页(替换占位)

- [ ] **Step 1: 补 home i18n 文案**

在 `src/i18n/ui/zh.ts` 追加:

```ts
  'home.heroTitle': 'Object920',
  'home.heroSubtitle': '个人网站',
  'home.heroIntro': '文章 · 工程 · 番剧 · 术曲',
  'home.heroCta': '进入站点',
  'home.latestArticles': '最新文章',
  'home.latestProjects': '最新工程',
  'home.animePicks': '番剧精选',
  'home.vocaloidPicks': '术曲精选',
  'home.aboutSummary': '关于',
  'home.aboutText': '一个记录技术、工程与爱好的个人角落。',
```

在 `src/i18n/ui/en.ts` 追加:

```ts
  'home.heroTitle': 'Object920',
  'home.heroSubtitle': 'Personal Website',
  'home.heroIntro': 'Articles · Projects · Anime · Vocaloid',
  'home.heroCta': 'Enter',
  'home.latestArticles': 'Latest Articles',
  'home.latestProjects': 'Latest Projects',
  'home.animePicks': 'Anime Picks',
  'home.vocaloidPicks': 'Vocaloid Picks',
  'home.aboutSummary': 'About',
  'home.aboutText': 'A personal corner for tech, projects and hobbies.',
```

- [ ] **Step 2: 创建 Hero.module.css(超 100 行外置)**

```css
/* src/components/home/Hero.module.css */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.55));
  z-index: 1;
}
.hero-canvas {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.hero-content {
  position: relative;
  z-index: 3;
  text-align: center;
  color: var(--color-text-on-accent);
  padding: var(--spacing-md);
}
.hero-title {
  font-size: var(--text-4xl);
  font-weight: 700;
  animation: hero-fade-up calc(var(--duration-slower) * var(--motion-scale)) var(--ease-out) both;
}
.hero-subtitle {
  margin-top: var(--spacing-sm);
  font-size: var(--text-xl);
  opacity: 0.9;
  animation: hero-fade-up calc(var(--duration-slower) * var(--motion-scale)) var(--ease-out) both;
  animation-delay: calc(var(--duration-base) * var(--motion-scale));
}
.hero-intro {
  margin-top: var(--spacing-xs);
  font-size: var(--text-md);
  opacity: 0.8;
  animation: hero-fade-up calc(var(--duration-slower) * var(--motion-scale)) var(--ease-out) both;
  animation-delay: calc(var(--duration-base) * 2 * var(--motion-scale));
}
.hero-cta {
  display: inline-block;
  margin-top: var(--spacing-lg);
  padding: var(--spacing-xs) var(--spacing-lg);
  border: 2px solid var(--color-text-on-accent);
  border-radius: var(--radius-full);
  color: var(--color-text-on-accent);
  text-decoration: none;
  font-weight: 600;
  animation: hero-fade-up calc(var(--duration-slower) * var(--motion-scale)) var(--ease-out) both;
  animation-delay: calc(var(--duration-base) * 3 * var(--motion-scale));
  transition: background calc(var(--duration-base) * var(--motion-scale)) var(--ease-out);
}
.hero-cta:hover {
  background: var(--color-text-on-accent);
  color: var(--color-bg);
}

@keyframes hero-fade-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-title,
  .hero-subtitle,
  .hero-intro,
  .hero-cta {
    animation: none;
  }
  .hero-canvas {
    display: none;
  }
}
```

- [ ] **Step 3: 创建 Hero.astro**

```astro
---
// src/components/home/Hero.astro
import { Image } from 'astro:assets';
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import styles from './Hero.module.css';
interface Props {
  locale: Locale;
  heroImage: ImageMetadata;
}
const { locale, heroImage } = Astro.props;
---

<section class={styles.hero}>
  <Image src={heroImage} alt="" class={styles['hero-bg']} fetchpriority="high" />
  <div class={styles['hero-overlay']}></div>
  <canvas class={styles['hero-canvas']} data-hero-canvas></canvas>
  <div class={styles['hero-content']}>
    <h1 class={styles['hero-title']}>{t(locale, 'home.heroTitle')}</h1>
    <p class={styles['hero-subtitle']}>{t(locale, 'home.heroSubtitle')}</p>
    <p class={styles['hero-intro']}>{t(locale, 'home.heroIntro')}</p>
    <a href={`/${locale}/articles/`} class={styles['hero-cta']}>{t(locale, 'home.heroCta')}</a>
  </div>
</section>
<script>
  document.addEventListener('astro:page-load', () => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008,
      vy: (Math.random() - 0.5) * 0.0008,
      r: Math.random() * 1.5 + 0.5,
    }));
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    document.addEventListener('astro:before-swap', () => cancelAnimationFrame(raf), { once: true });
  });
</script>
```

> **a11y/spec 5.7**:大图用 `<Image fetchpriority="high">` + `object-fit: cover`(不用 `background-image` 承载首屏大图,无法用 fetchpriority,P2-21);装饰图 `alt=""`;Canvas 粒子读 `prefers-reduced-motion` 决定是否启动 raf(spec 3.8);`astro:before-swap` 取消 raf 防跨页泄漏。

- [ ] **Step 4: 创建 HomeSections.astro**

```astro
---
// src/components/home/HomeSections.astro
import ArticleCard from '@components/article/ArticleCard.astro';
import ProjectCard from '@components/project/ProjectCard.astro';
import AnimeCard from '@components/collection/AnimeCard.astro';
import VocaloidCard from '@components/collection/VocaloidCard.astro';
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
import { slugOf } from '@lib/i18n';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;

const articles = (await getCollection('articles'))
  .filter((e) => e.id.startsWith(locale + '/') && (!e.data.draft || import.meta.env.DEV))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .slice(0, 3);
const projects = (await getCollection('projects'))
  .filter((e) => e.id.startsWith(locale + '/') && (!e.data.draft || import.meta.env.DEV))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .slice(0, 3);
const anime = (await getCollection('anime')).filter((e) => e.data.highlight).slice(0, 4);
const vocaloid = (await getCollection('vocaloid')).filter((e) => e.data.highlight).slice(0, 4);
---

<div class="home-sections">
  {
    articles.length > 0 && (
      <section class="home-section">
        <div class="home-section-head">
          <h2>{t(locale, 'home.latestArticles')}</h2>
          <a href={`/${locale}/articles/`} class="home-section-more">
            {t(locale, 'articles.viewAll')} →
          </a>
        </div>
        <div class="home-section-grid">
          {articles.map((e) => (
            <ArticleCard entry={e} locale={locale} />
          ))}
        </div>
      </section>
    )
  }
  {
    projects.length > 0 && (
      <section class="home-section">
        <div class="home-section-head">
          <h2>{t(locale, 'home.latestProjects')}</h2>
          <a href={`/${locale}/projects/`} class="home-section-more">
            {t(locale, 'projects.viewAll')} →
          </a>
        </div>
        <div class="home-section-grid">
          {projects.map((e) => (
            <ProjectCard entry={e} locale={locale} />
          ))}
        </div>
      </section>
    )
  }
  {
    anime.length > 0 && (
      <section class="home-section">
        <div class="home-section-head">
          <h2>{t(locale, 'home.animePicks')}</h2>
          <a href={`/${locale}/collection/anime/`} class="home-section-more">
            {t(locale, 'articles.viewAll')} →
          </a>
        </div>
        <div class="home-section-grid home-section-grid-small">
          {anime.map((e) => (
            <AnimeCard entry={e} locale={locale} />
          ))}
        </div>
      </section>
    )
  }
  {
    vocaloid.length > 0 && (
      <section class="home-section">
        <div class="home-section-head">
          <h2>{t(locale, 'home.vocaloidPicks')}</h2>
          <a href={`/${locale}/collection/vocaloid/`} class="home-section-more">
            {t(locale, 'articles.viewAll')} →
          </a>
        </div>
        <div class="home-section-grid">
          {vocaloid.map((e) => (
            <VocaloidCard entry={e} locale={locale} />
          ))}
        </div>
      </section>
    )
  }
  <section class="home-section">
    <div class="home-section-head">
      <h2>{t(locale, 'home.aboutSummary')}</h2>
      <a href={`/${locale}/about/`} class="home-section-more">→</a>
    </div>
    <p class="home-about-text">{t(locale, 'home.aboutText')}</p>
  </section>
</div>
<style>
  .home-sections {
    max-width: var(--container-wide);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }
  .home-section-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: var(--spacing-md);
  }
  .home-section-head h2 {
    font-size: var(--text-2xl);
    font-weight: 700;
  }
  .home-section-more {
    color: var(--color-accent);
    text-decoration: none;
    font-size: var(--text-sm);
  }
  .home-section-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--spacing-md);
  }
  .home-section-grid-small {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
  .home-about-text {
    color: var(--color-text-muted);
    font-size: var(--text-md);
  }
</style>
```

> **聚合层纪律(spec 2.2-3)**:HomeSections 组合多领域 Card,是允许的(聚合层可组合领域组件;领域叶子组件间仍禁止互相 import)。

- [ ] **Step 5: 替换首页([locale]/index.astro)**

把 Plan 1 的 `src/pages/[locale]/index.astro` 占位内容整体替换为:

```astro
---
// src/pages/[locale]/index.astro — 首页(Hero + HomeSections)
import BaseLayout from '@components/layout/BaseLayout.astro';
import Hero from '@components/home/Hero.astro';
import HomeSections from '@components/home/HomeSections.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
import { getCollection } from 'astro:content';
export function getStaticPaths() {
  return locales.map((l) => ({ params: { locale: l } }));
}
const { locale } = Astro.params as { locale: Locale };
const heroArticle = (await getCollection('articles')).find(
  (e) => e.id.startsWith(locale + '/') && e.data.cover && !e.data.draft,
);
const heroImage = heroArticle?.data.cover;
---

<BaseLayout locale={locale} title={t(locale, 'site.title')} description={t(locale, 'site.tagline')}>
  {
    heroImage ? (
      <Hero locale={locale} heroImage={heroImage} />
    ) : (
      <section class="hero-fallback">
        <h1>{t(locale, 'home.heroTitle')}</h1>
        <p>{t(locale, 'home.heroSubtitle')}</p>
      </section>
    )
  }
  <HomeSections locale={locale} />
</BaseLayout>
<style>
  .hero-fallback {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl) var(--spacing-md);
    text-align: center;
  }
  .hero-fallback h1 {
    font-size: var(--text-4xl);
    font-weight: 700;
  }
  .hero-fallback p {
    color: var(--color-text-muted);
    font-size: var(--text-xl);
  }
</style>
```

- [ ] **Step 6: 验证 build + dev**

Run: `pnpm dev` 然后 `pnpm build`
Expected: 首页渲染 Hero(有大图时)+ HomeSections 各聚合区;无 cover 时降级 hero-fallback

- [ ] **Step 7: Commit**

```bash
git add src/components/home/ src/pages/[locale]/index.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat: add Hero + HomeSections + replace home placeholder"
```

---

### Task 16: 关于页 + 404 页

**Files:**

- Create: `src/components/errors/NotFound.astro`
- Create: `src/pages/[locale]/about/index.astro`
- Create: `src/pages/404.astro`
- Modify: `src/i18n/ui/zh.ts`、`en.ts`(补 about 文案)

**Interfaces:**

- Consumes: `BaseLayout`、`t`、`locales`、Plan 1 根路径协商脚本模式(404 客户端语言协商)
- Produces:`NotFound`(props `{ locale }`)、关于页(静态内容走 i18n)、404 页(走 i18n:默认 zh + `navigator.languages` 客户端增强 + 页内语言切换,`noindex`)

- [ ] **Step 1: 补 about i18n 文案**

在 `src/i18n/ui/zh.ts` 追加:

```ts
  'about.title': '关于',
  'about.intro': '站点介绍',
  'about.introText': 'Object920 是一个个人网站,记录技术文章、工程展示、番剧与术曲收藏。',
  'about.techStack': '技术栈',
  'about.techStackText': '基于 Astro 7 静态生成,Tailwind v4 样式,纯 vanilla 客户端增强。',
  'about.author': '关于作者',
  'about.contact': '联系方式',
  'about.copyright': '版权与协议',
  'about.copyrightText': '除特别注明外,内容采用 CC BY-NC-SA 4.0 协议。',
```

在 `src/i18n/ui/en.ts` 追加:

```ts
  'about.title': 'About',
  'about.intro': 'Site Introduction',
  'about.introText': 'Object920 is a personal website recording technical articles, project showcases, anime and vocaloid collections.',
  'about.techStack': 'Tech Stack',
  'about.techStackText': 'Built with Astro 7 static generation, Tailwind v4 styling, pure vanilla client enhancement.',
  'about.author': 'About the Author',
  'about.contact': 'Contact',
  'about.copyright': 'Copyright & License',
  'about.copyrightText': 'Unless otherwise noted, content is licensed under CC BY-NC-SA 4.0.',
```

- [ ] **Step 2: 创建关于页**

```astro
---
// src/pages/[locale]/about/index.astro
import BaseLayout from '@components/layout/BaseLayout.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
export async function getStaticPaths() {
  return locales.map((l) => ({ params: { locale: l } }));
}
const { locale } = Astro.params as { locale: Locale };
const sections = [
  { title: 'about.intro', text: 'about.introText' },
  { title: 'about.techStack', text: 'about.techStackText' },
  { title: 'about.author', text: null },
  { title: 'about.contact', text: null },
  { title: 'about.copyright', text: 'about.copyrightText' },
];
---

<BaseLayout locale={locale} title={t(locale, 'about.title')}>
  <div class="about">
    <h1 class="about-title">{t(locale, 'about.title')}</h1>
    {
      sections.map((s) => (
        <section class="about-section">
          <h2>{t(locale, s.title)}</h2>
          {s.text && <p>{t(locale, s.text)}</p>}
        </section>
      ))
    }
  </div>
</BaseLayout>
<style>
  .about {
    max-width: var(--container-prose);
    margin: 0 auto;
    padding: var(--spacing-lg) var(--spacing-md);
  }
  .about-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    margin-bottom: var(--spacing-lg);
  }
  .about-section {
    margin-top: var(--spacing-lg);
  }
  .about-section h2 {
    font-size: var(--text-xl);
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
  }
  .about-section p {
    color: var(--color-text-muted);
    font-size: var(--text-md);
    line-height: var(--leading-prose);
  }
</style>
```

- [ ] **Step 3: 创建 NotFound.astro**

```astro
---
// src/components/errors/NotFound.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
---

<div class="not-found">
  <h1 class="not-found-title">{t(locale, 'common.404.title')}</h1>
  <p class="not-found-body">{t(locale, 'common.404.body')}</p>
  <a href={`/${locale}/`} class="not-found-back">{t(locale, 'common.404.back')}</a>
</div>
<style>
  .not-found {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl) var(--spacing-md);
    text-align: center;
  }
  .not-found-title {
    font-size: var(--text-4xl);
    font-weight: 700;
  }
  .not-found-body {
    color: var(--color-text-muted);
    font-size: var(--text-lg);
  }
  .not-found-back {
    margin-top: var(--spacing-md);
    padding: var(--spacing-xs) var(--spacing-lg);
    background: var(--color-accent);
    color: var(--color-text-on-accent);
    border-radius: var(--radius-md);
    text-decoration: none;
  }
  .not-found-back:hover {
    background: var(--color-accent-hover);
  }
</style>
```

- [ ] **Step 4: 创建 404 页**

```astro
---
// src/pages/404.astro — 静态 404,默认 zh + 客户端语言协商
import BaseLayout from '@components/layout/BaseLayout.astro';
import BaseHead from '@components/layout/BaseHead.astro';
import NotFound from '@components/errors/NotFound.astro';
import LangSwitch from '@components/common/LangSwitch.astro';
import { t } from '@i18n/utils';
import { locales, defaultLocale, type Locale } from '@i18n/config';
const locale: Locale = defaultLocale;
---

<!doctype html>
<html lang={locale}>
  <head>
    <BaseHead locale={locale} title={t(locale, 'common.404.title')} noindex />
  </head>
  <body>
    <main id="main" data-404-root>
      <NotFound locale={locale} />
      <div class="langswitch-404" data-404-langswitch>
        <LangSwitch locale={locale} />
      </div>
    </main>
    <script>
      (function () {
        const root = document.querySelector('[data-404-root]');
        if (!root) return;
        const langs = navigator.languages ?? [navigator.language];
        const target = (['zh', 'en', 'ru', 'ja'] as const).find((l) =>
          langs.some((pl) => pl.toLowerCase().startsWith(l)),
        );
        if (target && target !== 'zh') {
          document.documentElement.setAttribute('lang', target);
          root.setAttribute('data-404-locale', target);
        }
      })();
    </script>
    <style>
      .langswitch-404 {
        display: flex;
        justify-content: center;
        padding: var(--spacing-md);
      }
    </style>
  </body>
</html>
```

> **404 i18n 纪律(spec 5.17)**:静态 404 默认 zh 渲染(保证无 JS 也有内容)+ `navigator.languages` 客户端增强调整 `lang` + 页内 `<LangSwitch>` 允许切换(切换为静态链接到目标 locale 首页);`noindex`;**不依赖 Referer**。a11y:`<h1>` + 焦点可达(返回链接)。

- [ ] **Step 5: 验证 build 生成 404 + about**

Run: `pnpm build`
Expected: 生成 `/404.html`(含 `noindex`)、`/[locale]/about/`

- [ ] **Step 6: Commit**

```bash
git add src/components/errors/NotFound.astro src/pages/[locale]/about/index.astro src/pages/404.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat: add about page + 404 page with client-side locale negotiation"
```

---

## Self-Review

**1. Spec coverage:**

- **5.1 页面清单与路由总览**:首页 → Task 15;文章列表/详情/tag/category/archive → Task 9;工程列表/详情 → Task 11;番剧墙/术曲墙/collection → Task 12/13;友链 → Task 14;关于/404 → Task 16。✓
- **5.7 首页**(Hero 大图 fetchpriority + 轻量动效 + reduced-motion 停;HomeSections 聚合):Task 15。✓(`<Image fetchpriority="high">` 非 background-image;Canvas 读 matchMedia;keyframes 用 `calc(var(--duration-*) * var(--motion-scale))`;>100 行外置 Hero.module.css)
- **5.8 文章列表与卡片**(ArticleList 响应式网格 + EmptyState;ArticleCard cover 走 astro:assets + lazy + aspect-ratio + 整卡可点 + h2 内嵌 a):Task 7。✓
- **5.9 文章详情**(ArticleProse + prose.css;Toc IntersectionObserver + page-load;ReadingProgress role=status + 里程碑 aria-live;CodeBlockEnhancer 事件委托;ArticleImageEnhancer 事件委托):Task 6/8。✓
- **5.10 全局 Lightbox**(单实例 + open-lightbox CustomEvent + e.detail {src,alt,srcset,groupId} + 组内切换 + ESC + 焦点 + after-swap 关闭 + reduced-motion):Task 5。✓
- **5.13 工程**(ProjectList/ProjectCard 状态 badge 语义色;Gallery 走全局 Lightbox + lazy + onerror;SpecsTable 窄屏 dl;DatasheetDownload 主+备用 details):Task 10。✓
- **5.14 番剧墙**(StatusFilter 单选 tab 默认"全部" + URL `?status=` replaceState + role=tablist + 键盘;AnimeWall 全渲染 + data-status 过滤 + watchedDate 倒序;AnimeCard 远程 cover lazy + highlight glow + onerror):Task 12。✓
- **5.15 术曲墙**(VocaloidWall/VocaloidCard,无状态筛选,展开 lyricSnippet+comment):Task 13。✓
- **5.16 友链**(FriendCard 整卡 a target=_blank + 状态 badge;Travellings/Comments 留 Plan 4 占位):Task 14。✓
- **5.17 关于 + 404**(关于静态 i18n;404 默认 zh + navigator.languages + 页内切换 + noindex):Task 16。✓
- **5.18 组件依赖图单向**:领域叶子组件间无 import;HomeSections 聚合层组合多领域 Card;可插拔 Integration 留 Plan 4。✓
- **5.19 enhancement 脚本纪律**:每个 enhancement 自包含;vanilla JS;零 React/Vue。✓
- **5.20 ClientRouter 生命周期**:页面级增强 page-load 初始化(Toc/ReadingProgress/StatusFilter);全局 singleton(Lightbox/document 委托)标志位保护;after-swap 关闭 Lightbox;Hero canvas before-swap 取消 raf。✓
- **6.5 双语渐进**:resolveLocalizedEntry + getEntriesGroupedByTranslationKey + 合成组 single:{id};getStaticPaths 遍历 group × locale。✓
- **6.6 hreflang/canonical**:buildHreflang 只输出 render 页 + x-default fallback;占位页 noindex + canonical 指 render 版 + `<article lang={contentLocale}>`。✓
- **7.2 图片管线**:rehype-article-image 只改结构(figure/caption/data 属性)不改 src;远程图保持 img loading=lazy;装饰图 alt="" 不包 caption;统一 processor 配置。✓
- **7.11 代码块插件**:rehype-codeblock 注入 data 属性 + 复制按钮骨架;CodeBlockEnhancer 事件委托;Shiki 双主题。✓
- **4.2-4.6 schema 消费**:组件字段名与 Zod schema 一一对应(article cover/coverAlt/tags/category;project status/gallery/specs/datasheets/relatedLinks;anime status/score/titleZh/highlight;vocaloid producer/vocaloid/platform/lyricSnippet;friends name/url/avatar/tags/status)。✓
- **9.7 测试**:lib 纯函数单测(i18n-resolution/seo/rehype-article-image/rehype-codeblock);`pnpm check` + `pnpm build` 验证路由。✓

**2. Placeholder scan:** 无 TBD/"implement later"。DatasheetDownload 与 AnimeCard 各标注一处占位拼写错误并给出正确函数名/属性名(`buildDownloadUrls` / `color-mix`),实现时按修正执行。友链页 Travellings/Comments 为 Plan 4 跨 Plan 占位(HTML 注释),非本 Plan 占位符。

**3. Type consistency:**

- `TranslationGroup<T>` / `ResolvedEntry<T>` 在 Task 1 定义,Task 8/9/10/11 全部引用 `@lib/i18n` 同名类型 ✓
- `slugOf(entry)` 签名 `<T extends { id: string }>(entry: T): string` 全局一致 ✓
- `resolveLocalizedEntry(group, uiLocale)` 返回 `{ mode, uiLocale, contentLocale, entry? }` 在 Task 1 定义,Task 9/11 消费 `res.mode`/`res.contentLocale`/`res.entry` 一致 ✓
- `getLocalizedEntryPath(group, targetLocale, routeSegment)` 签名一致,Task 8/10 消用 `'articles'`/`'projects'` routeSegment ✓
- `buildHreflang(alternates, xDefaultLocale)` / `pickXDefault(alternates, defaultLocale)` / `hreflangCode(locale)` 在 Task 2 定义,Task 8/10 消费一致 ✓
- `formatDate(date, locale)` Task 7 加到 `@i18n/utils`,Task 7/9 消费一致 ✓
- `CollectionEntry<'articles'|'projects'|'anime'|'vocaloid'|'friends'>` 类型引用 Plan 2 collection 名一致 ✓
- `data-article-image`/`data-lightbox`/`data-lightbox-group`/`data-copy-button`/`data-code-block`/`data-code` 在 rehype 插件(camelCase 属性:dataArticleImage 等)与客户端增强(kebab-case 选择器)间命名一致 ✓
- `open-lightbox` CustomEvent `detail: { src, alt, srcset?, groupId }` 在 ArticleImageEnhancer 派发与 Lightbox 监听间一致 ✓

**Gaps(留给后续 Plan):**

- 可插拔 Integration(SearchBox/Comments/Travellings/MusicPlayerWidget/Analytics):Plan 4
- RSS/sitemap/robots 端点、OG 生成、build-meta、check 脚本:Plan 5(构建与部署)
- Sveltia CMS `public/admin/`:Plan 2 已含或独立 Plan
- 架构 fixture build 集成测试(spec 9.7):Plan 2 内容 fixture + 本 Plan Task 9/11 的 `pnpm build` 验证已部分覆盖;完整 fixture build 可在 Plan 5 收尾

**执行注意事项:**

- Task 编号含 4 与 4b(图片插件与代码块插件为姊妹任务,4b 避免重排后续编号)
- 实现时修正两处占位拼写:`buildDownloadUrls`(非 `buildDownloadUrlsz`)、`color-mix`(非 `color-m-mix`)
- 若 `entry.render()` 在 Astro 7 改为 `import { render } from 'astro:content'; await render(entry)`,Task 9/11 同步调整
- `astro.config.mjs` 导入 `.ts` 插件由 Astro 配置加载器(Vite)处理;若解析失败改用相对路径无扩展名
