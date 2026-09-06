# Object920 内容管线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建内容管线:Sveltia CMS 编辑 → content repo → pull-content 脚本 → Astro Content Layer + Zod 校验;assets 仓库数据手册下载链接构造与构建时校验。

**Architecture:** Sveltia CMS(独立 `/admin` SPA)提交到 content repo → 主仓构建时 `pull-content.mjs` git clone --depth 1 → Astro Content Layer 加载 + Zod schema 校验。assets 仓库存数据手册,通过 jsDelivr/raw/release CDN 提供下载,构建时 HEAD 校验存在。

**Tech Stack:** Astro 7 Content Layer API(glob/file loader)| Sveltia CMS 0.197.2 | Zod 4 | pnpm 9.15.5

**Spec:** `docs/superpowers/specs/2026-08-19-personal-site-design.md`(第 4/7.3/7.5/7.12 节)

## Global Constraints

- **Content Layer API**:glob collection 用 `loader: glob({ pattern: '**/index.md', base, generateId })`;file collection 用 `loader: file(path, { parser: (text) => JSON.parse(text).items })`
- **glob schema 用 image() helper**:`schema: ({ image }) => z.object({ cover: image().optional(), ... })`
- **slug 唯一来源 = entry 目录名**:frontmatter 不声明 slug;`generateId: ({ entry }) => entry.replace(/[/\\]index\.md$/, '')`(id = `{locale}/{slug}`)
- **无 frontmatter lang**:locale 由目录推导(`articles/zh/foo/index.md` → zh)
- **pull-content 三模式**:首次 clone / 手动 pull(fetch+merge --ff-only)/ CI 强制同步(FORCE_CONTENT_SYNC=true → fetch+reset --hard)
- **pull-content 固定 main 分支**:不用 `git pull`,用 `fetch origin main --depth=1 && merge --ff-only origin/main`
- **pull-content repo 校验**:已存在时先 `validateContentRepo()`(.git/origin URL/branch),失败则删除重新 clone
- **认证**:有 `CONTENT_GITHUB_TOKEN` 走 credential helper(禁止拼 URL);无走 anonymous
- **Sveltia config**:`publish_mode: simple`,无 `local_backend`,用 `base_url`(非 proxy/app_id/auth_type)
- **Sveltia admin 在 `public/admin/`**(非 `src/pages/admin/`)
- **Git 操作只在 `src/scripts/`**:`src/lib/` 禁止 git 命令

---

## File Structure

| 文件                               | 职责                                                     | 创建/修改 |
| ---------------------------------- | -------------------------------------------------------- | --------- |
| `src/content.config.ts`            | 5 个 collection 的 defineCollection + loader + schema    | 创建      |
| `src/scripts/pull-content.mjs`     | git clone/pull content 仓(三模式 + repo 校验)            | 创建      |
| `public/admin/index.html`          | Sveltia CMS SPA 入口(pinned 版本)                        | 创建      |
| `public/admin/config.yml`          | Sveltia 配置(5 个 collection + 全局配置)                 | 创建      |
| `src/lib/assets.ts`                | assets 仓库下载链接构造(buildDownloadUrls)               | 创建      |
| `src/scripts/check-datasheets.ts`  | prebuild HEAD 校验 assets 文件存在                       | 创建      |
| `src/lib/__tests__/assets.test.ts` | buildDownloadUrls 单测                                   | 创建      |
| `.env.example`                     | 加 content/assets 环境变量                               | 修改      |
| `package.json`                     | 加 pull:content/predev/prebuild/check:datasheets scripts | 修改      |

---

### Task 1: Content Layer API 配置

**Files:**

- Create: `src/content.config.ts`

**Interfaces:**

- Consumes: Plan 1 的 `astro.config.mjs`(i18n 配置)
- Produces: 5 个 collection 定义(给 Plan 3 页面 getCollection 用)

- [ ] **Step 1: 创建 content.config.ts(文章 + 工程 collection)**

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
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
      ogImage: z.string().url().optional(),
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
      relatedLinks: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
      draft: z.boolean().default(false),
      ogImage: z.string().url().optional(),
      ogImageLocal: image().optional(),
    }),
});
```

- [ ] **Step 2: 追加 JSON collection(番剧/术曲/友链)**

在同一文件追加:

```ts
const anime = defineCollection({
  loader: file('src/content/data/anime.json', {
    parser: (text) => JSON.parse(text).items,
  }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    titleOriginal: z.string().optional(),
    titleZh: z.string().optional(),
    cover: z.string().url().optional(),
    score: z.number().min(0).max(10).optional(),
    status: z.enum(['finished', 'watching', 'planned', 'dropped']),
    watchedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    episodes: z.number().optional(),
    year: z.number().optional(),
    studio: z.string().optional(),
    source: z.string().url().optional(),
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
    cover: z.string().url().optional(),
    score: z.number().min(0).max(10).optional(),
    status: z.enum(['favorite', 'liked', 'neutral', 'archived']),
    listenedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    year: z.number().optional(),
    platform: z.array(z.object({ name: z.string(), url: z.string().url() })).default([]),
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
    url: z.string().url(),
    avatar: z.string().url().optional(),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    status: z.enum(['active', 'inactive', 'mutual']).default('active'),
    addedDate: z.coerce.date().optional(),
  }),
});

export const collections = { articles, projects, anime, vocaloid, friends };
```

- [ ] **Step 3: 创建测试 content 目录(验证 schema 编译)**

创建 `src/content/articles/zh/hello-world/index.md`:

```markdown
---
title: Hello World
pubDate: 2026-08-01
coverAlt: 测试封面
excerpt: 第一篇测试文章
---

这是测试文章正文。
```

创建 `src/content/data/friends.json`:

```json
{
  "items": [
    {
      "id": "test-friend",
      "name": "Test Site",
      "url": "https://example.com",
      "description": "测试友链"
    }
  ]
}
```

- [ ] **Step 4: 验证 astro check 通过**

Run: `pnpm check`
Expected: 类型检查通过(无 schema 错误)

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/content/
git commit -m "feat: add Content Layer API config with 5 collections"
```

---

### Task 2: pull-content 脚本

**Files:**

- Create: `src/scripts/pull-content.mjs`
- Modify: `.env.example`(加 content 环境变量)
- Modify: `package.json`(加 pull:content/predev/prebuild scripts)

**Interfaces:**

- Consumes: 环境变量 `CONTENT_REPO` / `CONTENT_GITHUB_TOKEN` / `FORCE_CONTENT_SYNC`
- Produces: `src/content/` 目录(git clone 的 content repo)

- [ ] **Step 1: 创建 pull-content.mjs**

```js
// src/scripts/pull-content.mjs
import { execSync } from 'node:child_process';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CONTENT_DIR = resolve(process.cwd(), 'src/content');
const CONTENT_REPO = process.env.CONTENT_REPO ?? 'YourUser/object920-content';
const GITHUB_TOKEN = process.env.CONTENT_GITHUB_TOKEN;
const FORCE_SYNC = process.env.FORCE_CONTENT_SYNC === 'true';
const IS_IF_MISSING = process.argv.includes('--if-missing');

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', encoding: 'utf-8', ...opts });
}

function getCloneUrl() {
  const base = `https://github.com/${CONTENT_REPO}.git`;
  if (!GITHUB_TOKEN) return base;
  // 用 credential helper 走 Authorization header,不拼 URL
  // 通过 GIT_ASKPASS 环境变量传递 token
  return base;
}

function validateContentRepo() {
  if (!existsSync(join(CONTENT_DIR, '.git'))) return false;
  try {
    const originUrl = run('git -C src/content remote get-url origin', {
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!originUrl.includes(CONTENT_REPO)) return false;
    const branch = run('git -C src/content branch --show-current', {
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (branch !== 'main') return false;
    return true;
  } catch {
    return false;
  }
}

function clone() {
  console.log(`[pull-content] Cloning ${CONTENT_REPO}...`);
  const url = getCloneUrl();
  const env = { ...process.env };
  if (GITHUB_TOKEN) {
    // 走 GIT_ASKPASS,不拼 URL
    env.GIT_ASKPASS = 'echo';
    env.GIT_TERMINAL_PROMPT = '0';
    // 用 extraheader 注入 Authorization
    run(
      `git -c http.extraheader="Authorization: Bearer ${GITHUB_TOKEN}" clone --depth 1 ${url} src/content`,
      { env },
    );
  } else {
    run(`git clone --depth 1 ${url} src/content`, { env });
  }
  console.log('[pull-content] Clone complete.');
}

function pull() {
  if (!validateContentRepo()) {
    console.log('[pull-content] Repo invalid, re-cloning...');
    rmSync(CONTENT_DIR, { recursive: true, force: true });
    clone();
    return;
  }
  if (FORCE_SYNC) {
    console.log('[pull-content] Force sync (CI mode)...');
    run('git -C src/content fetch origin main --depth=1');
    run('git -C src/content reset --hard origin/main');
  } else {
    console.log('[pull-content] Pulling (ff-only)...');
    // 检查是否有未提交修改
    const status = run('git -C src/content status --porcelain', {
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (status) {
      console.error(
        '[pull-content] src/content/ has uncommitted changes. Commit or stash first, or use FORCE_CONTENT_SYNC=true for CI.',
      );
      process.exit(1);
    }
    run('git -C src/content fetch origin main --depth=1');
    run('git -C src/content merge --ff-only origin/main');
  }
  console.log('[pull-content] Up to date.');
}

// 主逻辑
if (IS_IF_MISSING && existsSync(CONTENT_DIR)) {
  console.log('[pull-content] --if-missing: src/content/ exists, skipping.');
  process.exit(0);
}

if (!existsSync(CONTENT_DIR)) {
  clone();
} else {
  pull();
}

// 输出 content 元数据(供 build-meta.mjs 消费)
const commitHash = run('git -C src/content rev-parse HEAD', {
  stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
const commitDate = run('git -C src/content log -1 --format=%cI', {
  stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
console.log(`::content-commit=${commitHash}`);
console.log(`::content-updated=${commitDate}`);
```

- [ ] **Step 2: 更新 .env.example**

在现有 `.env.example` 末尾追加:

```bash
# === content 仓库(构建时 git clone --depth 1 拉取)===
CONTENT_REPO=YourUser/object920-content
CONTENT_GITHUB_TOKEN=                            # 可选:private content repo 专用 token(fine-grained PAT,read-only)
FORCE_CONTENT_SYNC=false                         # CI/构建注入 true,强制同步

# === assets 仓库 ===
PUBLIC_ASSETS_USER=YourUser
PUBLIC_ASSETS_REPO=object920-assets
```

- [ ] **Step 3: 更新 package.json scripts**

在 `scripts` 中添加:

```json
{
  "scripts": {
    "pull:content": "node src/scripts/pull-content.mjs",
    "predev": "node src/scripts/pull-content.mjs --if-missing",
    "prebuild": "node src/scripts/pull-content.mjs && pnpm run check:datasheets",
    "check:datasheets": "tsx src/scripts/check-datasheets.ts",
    "dev": "astro dev",
    "build": "astro build",
    "check": "astro check",
    "lint": "eslint . && prettier --check .",
    "test": "vitest run",
    "ci": "pnpm run check && pnpm run lint && pnpm run test && pnpm run build"
  }
}
```

- [ ] **Step 4: 验证 pull-content 脚本(用测试 content)**

先删除 Task 1 手动创建的 `src/content/`,然后:
Run: `pnpm pull:content`
Expected: 如果 `CONTENT_REPO` 是真实仓库则 clone 成功;如果仓库不存在则报错(预期,因为 `YourUser/object920-content` 是占位)

> 注意:此步需要真实的 content repo。MVP 验证时可先创建一个空的 GitHub 仓库 `object920-content`,push Task 1 的测试内容到其中,然后设 `.env` 的 `CONTENT_REPO` 指向它。

- [ ] **Step 5: Commit**

```bash
git add src/scripts/pull-content.mjs .env.example package.json
git commit -m "feat: add pull-content script with 3-mode sync + content repo validation"
```

---

### Task 3: Sveltia CMS 入口

**Files:**

- Create: `public/admin/index.html`
- Create: `public/admin/config.yml`

**Interfaces:**

- Consumes: 环境变量(可选 `base_url` 用于多用户 OAuth)
- Produces: `/admin/` Sveltia CMS SPA(给内容编辑用)

- [ ] **Step 1: 创建 public/admin/index.html**

```html
<!DOCTYPE html>
<html lang="zh" data-pagefind-ignore>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Sveltia CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.197.2/dist/sveltia-cms.js"></script>
  </body>
</html>
```

> 注意:`@sveltia/cms@0.197.2` 是 pinned 版本(spec 1.1 要求)。实现前用 `npm view @sveltia/cms versions` 确认该版本存在;若不存在以实际稳定版本替换并同步 spec。

- [ ] **Step 2: 创建 public/admin/config.yml(全局部分)**

```yaml
# public/admin/config.yml
# yaml-language-server: $schema=https://unpkg.com/@sveltia/cms/schema/sveltia-cms.json

backend:
  name: github
  repo: YourUser/object920-content
  branch: main
  # MVP:用 Access Token 登录,不需要 base_url
  # 生产多用户(可选):部署 sveltia-cms-auth 后取消注释
  # base_url: https://your-authenticator.workers.dev

site_url: https://example.com
display_url: https://example.com
locale: 'zh'

publish_mode: simple

collections:
  # articles / projects / anime / vocaloid / friends
  # 见下方 Step 3-7
```

- [ ] **Step 3: 追加 articles collection 到 config.yml**

```yaml
- name: articles
  label: 文章
  folder: 'articles'
  slug: '{{fields._slug | default(title) | localize}}'
  path: '{{slug}}/index'
  media_folder: ''
  public_folder: ''
  create: true
  i18n: true
  i18n.structure: multiple_folders
  i18n.locales: [zh, en]
  i18n.canonical_slug: { key: translationKey }
  fields:
    - {
        name: _slug,
        widget: string,
        required: false,
        i18n: duplicate,
        hint: 'URL slug(留空则用标题);不同语言版本应使用相同 slug',
      }
    - { name: title, widget: string, i18n: true }
    - {
        name: translationKey,
        widget: string,
        required: false,
        i18n: duplicate,
        hint: '同一篇内容的不同语言版本必须使用相同 translationKey',
      }
    - { name: pubDate, widget: datetime, i18n: duplicate }
    - { name: updatedDate, widget: datetime, required: false, i18n: duplicate }
    - { name: category, widget: string, default: 'uncategorized', i18n: true }
    - { name: tags, widget: list, i18n: true, default: [] }
    - { name: cover, widget: image, required: false, i18n: duplicate }
    - { name: coverAlt, widget: string, required: true, i18n: true }
    - { name: excerpt, widget: text, required: false, i18n: true }
    - { name: draft, widget: boolean, default: false, i18n: duplicate }
    - { name: seoTitle, widget: string, required: false, i18n: true }
    - { name: seoDescription, widget: text, required: false, i18n: true }
    - { name: body, widget: markdown, i18n: true }
```

- [ ] **Step 4: 追加 projects collection**

```yaml
- name: projects
  label: 工程
  folder: 'projects'
  slug: '{{fields._slug | default(title) | localize}}'
  path: '{{slug}}/index'
  media_folder: ''
  public_folder: ''
  create: true
  i18n: true
  i18n.structure: multiple_folders
  i18n.locales: [zh, en]
  i18n.canonical_slug: { key: translationKey }
  fields:
    - { name: _slug, widget: string, required: false, i18n: duplicate }
    - { name: title, widget: string, i18n: true }
    - { name: translationKey, widget: string, required: false, i18n: duplicate }
    - { name: pubDate, widget: datetime, i18n: duplicate }
    - { name: updatedDate, widget: datetime, required: false, i18n: duplicate }
    - {
        name: category,
        widget: select,
        options: ['hardware', 'software', 'repair', 'mod'],
        default: 'hardware',
        i18n: true,
      }
    - { name: tags, widget: list, i18n: true, default: [] }
    - {
        name: status,
        widget: select,
        options: ['ongoing', 'completed', 'archived', 'planned'],
        default: 'ongoing',
        i18n: duplicate,
      }
    - { name: cover, widget: image, required: false, i18n: duplicate }
    - { name: coverAlt, widget: string, required: true, i18n: true }
    - label: 图廊
      name: gallery
      widget: list
      i18n: duplicate
      required: false
      fields:
        - { name: image, widget: image }
        - { name: alt, widget: string }
        - { name: caption, widget: string, required: false }
    - { name: excerpt, widget: text, required: false, i18n: true }
    - label: 规格
      name: specs
      widget: list
      i18n: true
      required: false
      fields:
        - { name: label, widget: string, i18n: true }
        - { name: value, widget: string, i18n: true }
    - label: 数据手册
      name: datasheets
      widget: list
      i18n: true
      required: false
      hint: '文件托管在 assets 仓库,这里只填文件名'
      fields:
        - { name: name, widget: string, i18n: true }
        - { name: filename, widget: string, i18n: duplicate }
        - { name: ref, widget: string, default: 'main', required: false, i18n: duplicate }
        - { name: size, widget: string, required: false, i18n: duplicate }
        - label: 镜像
          name: mirror
          widget: select
          options: ['jsdelivr', 'raw', 'release']
          multiple: true
          default: ['jsdelivr', 'raw']
          i18n: duplicate
        - { name: releaseTag, widget: string, required: false, i18n: duplicate }
    - label: 相关链接
      name: relatedLinks
      widget: list
      i18n: true
      required: false
      fields:
        - { name: label, widget: string, i18n: true }
        - { name: url, widget: string }
    - { name: draft, widget: boolean, default: false, i18n: duplicate }
    - { name: body, widget: markdown, i18n: true }
```

- [ ] **Step 5: 追加 anime/vocaloid/friends file collection**

```yaml
- name: anime
  label: 番剧
  delete: false
  files:
    - label: 番剧清单
      name: items
      file: 'data/anime.json'
      fields:
        - { label: 最后更新, name: _last_updated, widget: hidden, default: '' }
        - label: 番剧列表
          name: items
          widget: list
          fields:
            - { name: id, widget: string }
            - { name: title, widget: string }
            - { name: titleOriginal, widget: string, required: false }
            - { name: titleZh, widget: string, required: false }
            - { name: cover, widget: string, required: false }
            - { name: score, widget: number, required: false }
            - {
                name: status,
                widget: select,
                options:
                  [
                    { label: '看完', value: 'finished' },
                    { label: '在看', value: 'watching' },
                    { label: '想看', value: 'planned' },
                    { label: '弃坑', value: 'dropped' },
                  ],
              }
            - { name: watchedDate, widget: datetime, required: false }
            - { name: tags, widget: list, default: [] }
            - { name: episodes, widget: number, required: false }
            - { name: year, widget: number, required: false }
            - { name: studio, widget: string, required: false }
            - { name: source, widget: string, required: false }
            - { name: comment, widget: text, required: false }
            - { name: highlight, widget: boolean, default: false }

- name: vocaloid
  label: 术曲
  delete: false
  files:
    - label: 术曲清单
      name: items
      file: 'data/vocaloid.json'
      fields:
        - { label: 最后更新, name: _last_updated, widget: hidden, default: '' }
        - label: 术曲列表
          name: items
          widget: list
          fields:
            - { name: id, widget: string }
            - { name: title, widget: string }
            - { name: producer, widget: string }
            - { name: vocaloid, widget: list, default: [] }
            - { name: cover, widget: string, required: false }
            - { name: score, widget: number, required: false }
            - {
                name: status,
                widget: select,
                options:
                  [
                    { label: '挚爱', value: 'favorite' },
                    { label: '喜欢', value: 'liked' },
                    { label: '一般', value: 'neutral' },
                    { label: '归档', value: 'archived' },
                  ],
              }
            - { name: listenedDate, widget: datetime, required: false }
            - { name: tags, widget: list, default: [] }
            - { name: year, widget: number, required: false }
            - label: 平台链接
              name: platform
              widget: list
              required: false
              fields:
                - { name: name, widget: string }
                - { name: url, widget: string }
            - { name: lyricSnippet, widget: text, required: false }
            - { name: comment, widget: text, required: false }
            - { name: highlight, widget: boolean, default: false }

- name: friends
  label: 友链
  delete: false
  files:
    - label: 友链清单
      name: items
      file: 'data/friends.json'
      fields:
        - { label: 最后更新, name: _last_updated, widget: hidden, default: '' }
        - label: 友链列表
          name: items
          widget: list
          fields:
            - { name: id, widget: string }
            - { name: name, widget: string }
            - { name: url, widget: string }
            - { name: avatar, widget: string, required: false }
            - { name: description, widget: string, default: '' }
            - { name: tags, widget: list, default: [] }
            - {
                name: status,
                widget: select,
                options:
                  [
                    { label: '活跃', value: 'active' },
                    { label: '失联', value: 'inactive' },
                    { label: '互友', value: 'mutual' },
                  ],
                default: 'active',
              }
            - { name: addedDate, widget: datetime, required: false }
```

- [ ] **Step 6: 验证 admin 页面可访问**

Run: `pnpm dev`,访问 `http://localhost:4321/admin/index.html`
Expected: Sveltia CMS 加载(登录页显示;因为 content repo 是占位名,登录会失败,但 SPA 加载成功)

- [ ] **Step 7: Commit**

```bash
git add public/admin/
git commit -m "feat: add Sveltia CMS admin with 5 collections config"
```

---

### Task 4: assets 下载链接构造

**Files:**

- Create: `src/lib/assets.ts`
- Create: `src/lib/__tests__/assets.test.ts`

**Interfaces:**

- Consumes: 环境变量 `PUBLIC_ASSETS_USER` / `PUBLIC_ASSETS_REPO`
- Produces: `buildDownloadUrls(datasheet)` 函数(给 Plan 3 DatasheetDownload 组件用)

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/__tests__/assets.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('buildDownloadUrls', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.PUBLIC_ASSETS_USER = 'TestUser';
    process.env.PUBLIC_ASSETS_REPO = 'object920-assets';
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it('builds jsDelivr + raw URLs for default mirror', async () => {
    const { buildDownloadUrls } = await import('../assets');
    const result = buildDownloadUrls({
      name: 'Test PDF',
      filename: 'test.pdf',
      mirror: ['jsdelivr', 'raw'],
    });
    expect(result).toHaveLength(2);
    expect(result[0].mirror).toBe('jsdelivr');
    expect(result[0].url).toBe(
      'https://cdn.jsdelivr.net/gh/TestUser/object920-assets@main/test.pdf',
    );
    expect(result[1].mirror).toBe('raw');
    expect(result[1].url).toBe(
      'https://raw.githubusercontent.com/TestUser/object920-assets/main/test.pdf',
    );
  });

  it('builds release URL with releaseTag', async () => {
    const { buildDownloadUrls } = await import('../assets');
    const result = buildDownloadUrls({
      name: 'Large File',
      filename: 'big.zip',
      mirror: ['release'],
      releaseTag: 'v1.0',
    });
    expect(result).toHaveLength(1);
    expect(result[0].mirror).toBe('release');
    expect(result[0].url).toBe(
      'https://github.com/TestUser/object920-assets/releases/download/v1.0/big.zip',
    );
  });

  it('throws when release mirror without releaseTag', async () => {
    const { buildDownloadUrls } = await import('../assets');
    expect(() =>
      buildDownloadUrls({
        name: 'Bad',
        filename: 'no-tag.zip',
        mirror: ['release'],
      }),
    ).toThrow(/releaseTag/);
  });

  it('preserves mirror order', async () => {
    const { buildDownloadUrls } = await import('../assets');
    const result = buildDownloadUrls({
      name: 'Multi',
      filename: 'multi.pdf',
      mirror: ['raw', 'jsdelivr', 'release'],
      releaseTag: 'v2.0',
    });
    expect(result[0].mirror).toBe('raw');
    expect(result[1].mirror).toBe('jsdelivr');
    expect(result[2].mirror).toBe('release');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/lib/__tests__/assets.test.ts`
Expected: FAIL with "Cannot find module '../assets'"

- [ ] **Step 3: 实现 assets.ts**

```ts
// src/lib/assets.ts
export interface Datasheet {
  name: string;
  filename: string;
  ref?: string;
  size?: string;
  mirror: Array<'jsdelivr' | 'raw' | 'release'>;
  releaseTag?: string;
}

export interface DownloadUrl {
  mirror: string;
  url: string;
}

export function buildDownloadUrls(datasheet: Datasheet): DownloadUrl[] {
  const user = import.meta.env.PUBLIC_ASSETS_USER ?? 'YourUser';
  const repo = import.meta.env.PUBLIC_ASSETS_REPO ?? 'object920-assets';
  const ref = datasheet.ref ?? 'main';

  return datasheet.mirror.map((m) => {
    let url: string;
    switch (m) {
      case 'jsdelivr':
        url = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${ref}/${datasheet.filename}`;
        break;
      case 'raw':
        url = `https://raw.githubusercontent.com/${user}/${repo}/${ref}/${datasheet.filename}`;
        break;
      case 'release':
        if (!datasheet.releaseTag) {
          throw new Error(`releaseTag required for release mirror: ${datasheet.filename}`);
        }
        url = `https://github.com/${user}/${repo}/releases/download/${datasheet.releaseTag}/${datasheet.filename}`;
        break;
    }
    return { mirror: m, url };
  });
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/lib/__tests__/assets.test.ts`
Expected: 所有测试 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/assets.ts src/lib/__tests__/assets.test.ts
git commit -m "feat: add buildDownloadUrls for assets CDN links + tests"
```

---

### Task 5: check-datasheets 构建校验

**Files:**

- Create: `src/scripts/check-datasheets.ts`

**Interfaces:**

- Consumes: Task 4 的 `buildDownloadUrls`、Plan 1 的 `content.config.ts`(getCollection projects)
- Produces: prebuild 校验(阻断构建如果 datasheet 文件不存在)

- [ ] **Step 1: 安装 tsx(运行 TS 脚本)**

Run: `pnpm add -D tsx`
Expected: tsx 安装成功

- [ ] **Step 2: 创建 check-datasheets.ts**

```ts
// src/scripts/check-datasheets.ts
import { getCollection } from 'astro:content';
import { buildDownloadUrls, type Datasheet } from '../lib/assets';

async function checkDatasheets() {
  console.log('[check-datasheets] Verifying datasheet files exist...');
  const projects = await getCollection('projects');
  const errors: string[] = [];

  for (const project of projects) {
    const datasheets = project.data.datasheets as unknown as Datasheet[];
    if (!datasheets.length) continue;

    for (const d of datasheets) {
      const urls = buildDownloadUrls(d);
      for (const { mirror, url } of urls) {
        try {
          const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
          if (!res.ok) {
            errors.push(`[${project.id}] ${d.name} (${mirror}): HTTP ${res.status}`);
          }
        } catch (e) {
          errors.push(
            `[${project.id}] ${d.name} (${mirror}): ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }
  }

  if (errors.length) {
    console.error('[check-datasheets] FAILED:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('[check-datasheets] All datasheets verified.');
}

checkDatasheets();
```

- [ ] **Step 3: 验证脚本可执行**

Run: `pnpm check:datasheets`
Expected: 如果没有 datasheet 或文件存在则通过;文件不存在则报错退出

- [ ] **Step 4: Commit**

```bash
git add src/scripts/check-datasheets.ts
git commit -m "feat: add check-datasheets prebuild validation"
```

---

## Self-Review

**1. Spec coverage:**

- 第 4.1 数据模型总览 → Task 1 ✓
- 第 4.2 文章 schema → Task 1 ✓
- 第 4.3 工程 schema → Task 1 ✓
- 第 4.4 番剧 schema(file + parser)→ Task 1 ✓
- 第 4.5 术曲 schema → Task 1 ✓
- 第 4.6 友链 schema → Task 1 ✓
- 第 4.7 Sveltia 配置 → Task 3 ✓
- 第 7.3 Sveltia 认证 → Task 3(config.yml base_url 注释)✓
- 第 7.5 assets 下载 → Task 4 ✓
- 第 7.12 pull-content 脚本 → Task 2 ✓
- 附录 C 环境变量 → Task 2 ✓

**2. Placeholder scan:** 无 TBD/TODO。所有步骤含实际代码。

**3. Type consistency:** `Datasheet` 接口在 Task 4 定义,Task 5 引用。`buildDownloadUrls` 签名一致。collection name(articles/projects/anime/vocaloid/friends)在 content.config.ts 和 config.yml 一致。
