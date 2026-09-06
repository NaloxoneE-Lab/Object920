# Object920 构建与部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Object920 个人网站的完整构建管线(postbuild 链)、CI 增强、多平台部署配置、SEO 端点(sitemap/RSS/robots/CSP)与项目文档,使站点可构建、可部署、可维护。

**Architecture:** 在 Plan 1-4 已搭建的 Astro 7 静态站点基础上,postbuild 阶段串联 build-meta → search-index → generate-og → generate-redirects → check:links → check:sitemap → check:rss 七步完整链;CSP 由 `src/lib/seo.ts` 的纯函数 `buildCsp()` 按环境变量动态生成,由 deploy 脚本写入平台配置;sitemap/RSS/robots 均为自定义 Astro 端点,统一数据源驱动;部署配置隔离在 `deploy/{platform}/` 目录,主仓根不耦合平台。

**Tech Stack:** satori + @resvg/resvg-js(OG PNG)| @astrojs/rss(RSS feed)| pagefind ^1.x(搜索索引)| lychee(死链检查,CI 二进制)| tsx(TypeScript 脚本执行器)| pnpm 9.15.5 | Node >=22.12 <23

**Spec:** `docs/superpowers/specs/2026-08-19-personal-site-design.md`(第 7.9/7.12/7.13/8/9 节、附录 B/D)

## Global Constraints

- **Node 引擎**:`>=22.12 <23`(Astro 7 要求)
- **pnpm 版本**:`9.15.5`(与 `packageManager` 字段一致)
- **Git 操作只在 `src/scripts/`**:`src/lib/`、`src/components/` 禁止 git 命令(commit/rev-parse/log 只在 scripts 内)
- **OG 图输出路径**:`dist/og/{collection}-{locale}-{slug}.png`(postbuild 在 build 后跑,直接写 dist,不写 public)
- **OG 增量缓存位置**:`.cache/og-cache.json`(不入仓,不放 dist——astro build 清空 dist 会使缓存失效)
- **OG 增量依据**:`sha1(content + OG_TEMPLATE_VERSION + OG_FONT_VERSION)`——不只检查文件存在
- **OG 失败策略**:warn + 降级默认图 + exit 0(不阻断主站构建,与 search:index 的 CI fail 区分)
- **Pagefind 失败策略**:搜索启用时失败 = CI fail(非零退出);搜索禁用时不执行
- **CSP `buildCsp()`**:纯函数(只读环境变量,不副作用),写入逻辑在 deploy script 不在 lib
- **CSP 不叠加**:能设 HTTP Header 的平台不注入 `<meta>` CSP;`<meta>` 仅 GitHub Pages fallback
- **`trailingSlash: 'always'`**:全站 URL 带尾斜杠,sitemap/RSS/redirects 一致
- **Sitemap 统一数据源**:URL/hreflang/canonical/noindex 全来自页面清单(`resolveLocalizedEntry()` + 静态页清单),禁止副作用 Set/路径猜测
- **Sitemap 排除**:404/admin/根路径协商页/占位页/noindex 页/draft
- **Sitemap hreflang 标准码**:`zh-CN` 而非 `zh`;`<lastmod>` 用 updatedDate ?? pubDate,禁止 buildTime
- **RSS**:每 locale 一 feed,过滤 draft,ru/ja 空 feed 仍生成
- **`redirects.json`**:content repo 根,pull 后 `src/content/redirects.json`,URL 迁移唯一真相源
- **redirect 校验两阶段**:`validateRedirectManifest()`(格式/路径/环/链)+ `validateGeneratedRoutes()`(target∈routes / source∉routes)
- **CI secret 边界**:`CONTENT_GITHUB_TOKEN` 只在 build 步骤 env;code checks 无 secret
- **CI `FORCE_CONTENT_SYNC=true`**:只在 CI build 注入;本地 `pnpm build` 默认非 destructive
- **`pnpm ci` 单命令**:check(纯本地)→ lint → test → build(自动触发 prebuild + postbuild)
- **生产构建命令**:`pnpm install && pnpm build`
- **`build-meta.json` 字段**:仅 mainCommit/contentCommit/contentUpdatedAt/buildTime;nodeVersion/astroVersion 仅 `BUILD_META_DEBUG=true` 追加
- **deploy/ 目录隔离**:平台配置放 `deploy/{platform}/`,主仓根不放平台耦合文件

---

## File Structure

| 文件                                                           | 职责                                                        | 创建/修改    |
| -------------------------------------------------------------- | ----------------------------------------------------------- | ------------ |
| `src/scripts/build-meta.mjs`                                   | 构建元数据生成(prebuild 渲染元数据 + postbuild --dist 产物) | 创建         |
| `src/scripts/search-index.mjs`                                 | Pagefind 索引生成(仅 pagefind 启用时跑)                     | 创建         |
| `src/lib/og.ts`                                                | satori OG 图核心库(元素树/字体加载/hash 计算)               | 创建         |
| `src/scripts/generate-og.ts`                                   | postbuild OG 图增量生成脚本(缓存+输出 dist/og/)             | 创建         |
| `src/lib/seo.ts`                                               | 追加 `buildCsp()` + `buildSitemapEntries()` 纯函数          | 修改         |
| `src/lib/redirects.ts`                                         | redirect manifest 校验 + 平台规则生成纯函数                 | 创建         |
| `src/pages/sitemap.xml.ts`                                     | 自定义 sitemap 端点                                         | 创建         |
| `src/pages/rss/[locale].xml.ts`                                | 每语言 RSS feed 端点                                        | 创建         |
| `src/pages/robots.txt.ts`                                      | robots.txt 端点                                             | 创建         |
| `src/scripts/generate-redirects.ts`                            | redirects.json → 平台 301 规则/静态 HTML                    | 创建         |
| `src/scripts/generate-deploy-config.ts`                        | 按平台生成 CSP headers 配置(调用 buildCsp)                  | 创建         |
| `src/scripts/check-sitemap.ts`                                 | postbuild 校验 sitemap.xml 与页面清单一致                   | 创建         |
| `src/scripts/check-rss.ts`                                     | postbuild 校验 RSS feed 链接一致                            | 创建         |
| `src/lib/__tests__/og.test.ts`                                 | OG 核心库单测                                               | 创建         |
| `src/lib/__tests__/seo-csp.test.ts`                            | buildCsp() 单测                                             | 创建         |
| `src/lib/__tests__/seo-sitemap.test.ts`                        | buildSitemapEntries() 单测                                  | 创建         |
| `src/lib/__tests__/redirects.test.ts`                          | validateRedirectManifest/validateGeneratedRoutes 单测       | 创建         |
| `src/scripts/__tests__/build-meta.test.mjs`                    | build-meta collectBuildMeta 单测                            | 创建         |
| `src/scripts/__tests__/search-index.test.mjs`                  | search-index resolveSearchAction 单测                       | 创建         |
| `package.json`                                                 | 完整 scripts 链 + 新依赖                                    | 修改         |
| `.github/workflows/ci.yml`                                     | CI 增强(secret 边界 + pull:content + artifact)              | 修改         |
| `deploy/cloudflare/{README.md,_headers,_redirects}`            | Cloudflare 部署参考                                         | 创建         |
| `deploy/vercel/{README.md,vercel.json}`                        | Vercel 部署参考                                             | 创建         |
| `deploy/netlify/{README.md,netlify.toml,_redirects}`           | Netlify 部署参考                                            | 创建         |
| `deploy/github-pages/{README.md,.github/workflows/deploy.yml}` | GitHub Pages 部署参考                                       | 创建         |
| `deploy/oauth-proxy/{cloudflare-worker/,vercel-edge/}`         | OAuth 代理参考实现                                          | 创建         |
| `README.md`                                                    | 项目接手指南(必读)                                          | 创建         |
| `CONTRIBUTING.md`                                              | 内容/代码贡献流程                                           | 创建         |
| `public/fonts/og/`                                             | OG 字体(Inter + NotoSansSC subset)                          | 创建(二进制) |
| `public/images/og-default.png`                                 | 默认 OG 图                                                  | 创建(二进制) |

---

### Task 1: 构建元数据脚本 (build-meta.mjs)

**Files:**

- Create: `src/scripts/build-meta.mjs`
- Test: `src/scripts/__tests__/build-meta.test.mjs`

**Interfaces:**

- Consumes: `process.env`(GITHUB_SHA / CONTENT_COMMIT / BUILD_META_DEBUG)、git CLI(`src/content/.git`)
- Produces: `collectBuildMeta()` 函数;`src/.build-meta.generated.json`(prebuild);`dist/build-meta.json`(postbuild --dist)

- [ ] **Step 1: 安装 tsx 依赖**

Run: `pnpm add -D tsx`
Expected: tsx 安装成功(用于后续 .ts 脚本执行)

- [ ] **Step 2: 编写失败测试**

```js
// src/scripts/__tests__/build-meta.test.mjs
import { describe, it, expect } from 'vitest';
import { collectBuildMeta } from '../build-meta.mjs';

describe('collectBuildMeta', () => {
  it('uses GITHUB_SHA when provided', () => {
    const meta = collectBuildMeta({ GITHUB_SHA: 'abc123' }, () => null);
    expect(meta.mainCommit).toBe('abc123');
  });

  it('falls back to git rev-parse when GITHUB_SHA absent', () => {
    const gitRunner = (args) => (args.includes('rev-parse') ? 'def456' : null);
    const meta = collectBuildMeta({}, gitRunner);
    expect(meta.mainCommit).toBe('def456');
  });

  it('falls back to unknown when no git available', () => {
    const meta = collectBuildMeta({}, () => null);
    expect(meta.mainCommit).toBe('unknown');
  });

  it('uses CONTENT_COMMIT env for contentCommit', () => {
    const meta = collectBuildMeta({ CONTENT_COMMIT: 'sha1' }, () => null);
    expect(meta.contentCommit).toBe('sha1');
  });

  it('reads contentUpdatedAt from git log when available', () => {
    const gitRunner = (args, cwd) => {
      if (cwd === 'src/content' && args.includes('log')) return '2026-01-15T10:00:00+08:00';
      return null;
    };
    const meta = collectBuildMeta({}, gitRunner);
    expect(meta.contentUpdatedAt).toBe('2026-01-15T10:00:00+08:00');
  });

  it('contentUpdatedAt is unknown when content repo missing', () => {
    const meta = collectBuildMeta({}, () => null);
    expect(meta.contentUpdatedAt).toBe('unknown');
  });

  it('always includes buildTime as ISO string', () => {
    const meta = collectBuildMeta({}, () => null);
    expect(meta.buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('omits nodeVersion by default', () => {
    const meta = collectBuildMeta({}, () => null);
    expect(meta.nodeVersion).toBeUndefined();
  });

  it('adds nodeVersion when BUILD_META_DEBUG=true', () => {
    const meta = collectBuildMeta({ BUILD_META_DEBUG: 'true' }, () => null);
    expect(meta.nodeVersion).toBe(process.version);
  });
});
```

- [ ] **Step 3: 运行测试验证失败**

Run: `pnpm vitest run src/scripts/__tests__/build-meta.test.mjs`
Expected: FAIL — `collectBuildMeta` 未定义(模块不存在)

- [ ] **Step 4: 实现 build-meta.mjs**

```js
// src/scripts/build-meta.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

/**
 * Collect build metadata from env vars and git.
 * @param {Record<string,string|undefined>} env
 * @param {(args: string[], cwd?: string) => string | null} gitRunner
 */
export function collectBuildMeta(env = process.env, gitRunner = runGit) {
  const mainCommit = env.GITHUB_SHA ?? gitRunner(['rev-parse', 'HEAD']) ?? 'unknown';
  const contentCommit =
    env.CONTENT_COMMIT ?? gitRunner(['rev-parse', 'HEAD'], 'src/content') ?? 'unknown';
  const contentUpdatedAt = gitRunner(['log', '-1', '--format=%cI'], 'src/content') ?? 'unknown';

  const meta = { mainCommit, contentCommit, contentUpdatedAt, buildTime: new Date().toISOString() };
  if (env.BUILD_META_DEBUG === 'true') {
    meta.nodeVersion = process.version;
  }
  return meta;
}

function runGit(args, cwd = '.') {
  try {
    const result = execSync(`git ${args.join(' ')}`, {
      cwd: resolve(projectRoot, cwd),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const distMode = process.argv.includes('--dist');
  const meta = collectBuildMeta();
  const outPath = distMode
    ? resolve(projectRoot, 'dist', 'build-meta.json')
    : resolve(projectRoot, 'src', '.build-meta.generated.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`[build-meta] wrote ${outPath}`);
}
```

- [ ] **Step 5: 运行测试验证通过**

Run: `pnpm vitest run src/scripts/__tests__/build-meta.test.mjs`
Expected: PASS — 全部 9 个测试通过

- [ ] **Step 6: Commit**

```bash
git add src/scripts/build-meta.mjs src/scripts/__tests__/build-meta.test.mjs
git commit -m "feat: add build-meta script for prebuild and postbuild metadata generation"
```

---

### Task 2: 搜索索引脚本 (search-index.mjs)

**Files:**

- Create: `src/scripts/search-index.mjs`
- Test: `src/scripts/__tests__/search-index.test.mjs`

**Interfaces:**

- Consumes: `PUBLIC_SEARCH_ENABLED`、`PUBLIC_SEARCH_PROVIDER` 环境变量、`dist/` HTML
- Produces: `dist/pagefind/` 索引(仅 pagefind 启用时);`resolveSearchAction(env)` 函数

- [ ] **Step 1: 安装 pagefind 依赖**

Run: `pnpm add -D pagefind`
Expected: pagefind ^1.x 安装成功

- [ ] **Step 2: 编写失败测试**

```js
// src/scripts/__tests__/search-index.test.mjs
import { describe, it, expect } from 'vitest';
import { resolveSearchAction } from '../search-index.mjs';

describe('resolveSearchAction', () => {
  it('returns skip when search disabled', () => {
    expect(resolveSearchAction({ PUBLIC_SEARCH_ENABLED: 'false' })).toBe('skip');
  });

  it('returns skip when search not set', () => {
    expect(resolveSearchAction({})).toBe('skip');
  });

  it('returns run-pagefind when enabled + provider=pagefind', () => {
    expect(
      resolveSearchAction({ PUBLIC_SEARCH_ENABLED: 'true', PUBLIC_SEARCH_PROVIDER: 'pagefind' }),
    ).toBe('run-pagefind');
  });

  it('returns skip when provider=none', () => {
    expect(
      resolveSearchAction({ PUBLIC_SEARCH_ENABLED: 'true', PUBLIC_SEARCH_PROVIDER: 'none' }),
    ).toBe('skip');
  });

  it('throws on provider=orama (not implemented)', () => {
    expect(() =>
      resolveSearchAction({ PUBLIC_SEARCH_ENABLED: 'true', PUBLIC_SEARCH_PROVIDER: 'orama' }),
    ).toThrow(/orama/);
  });

  it('throws on unknown provider', () => {
    expect(() =>
      resolveSearchAction({ PUBLIC_SEARCH_ENABLED: 'true', PUBLIC_SEARCH_PROVIDER: 'unknown' }),
    ).toThrow(/unknown/);
  });
});
```

- [ ] **Step 3: 运行测试验证失败**

Run: `pnpm vitest run src/scripts/__tests__/search-index.test.mjs`
Expected: FAIL — `resolveSearchAction` 未定义

- [ ] **Step 4: 实现 search-index.mjs**

```js
// src/scripts/search-index.mjs
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const VALID_PROVIDERS = ['pagefind', 'none'];

/**
 * Determine what action to take based on search config.
 * @param {Record<string,string|undefined>} env
 * @returns {'skip' | 'run-pagefind'}
 * @throws {Error} on invalid/unimplemented provider
 */
export function resolveSearchAction(env = process.env) {
  if (env.PUBLIC_SEARCH_ENABLED !== 'true') return 'skip';
  const provider = env.PUBLIC_SEARCH_PROVIDER ?? 'pagefind';
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error(
      `Unsupported search provider "${provider}". Valid: ${VALID_PROVIDERS.join(', ')}. Orama not yet implemented.`,
    );
  }
  return provider === 'none' ? 'skip' : 'run-pagefind';
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const action = resolveSearchAction();
    if (action === 'skip') {
      console.log('[search-index] search disabled or provider=none, skipping');
      process.exit(0);
    }
    const distDir = resolve(projectRoot, 'dist');
    if (!existsSync(distDir)) {
      console.error('[search-index] dist/ not found — run astro build first');
      process.exit(1);
    }
    console.log('[search-index] running pagefind --site dist');
    execSync('npx pagefind --site dist', { cwd: projectRoot, stdio: 'inherit' });
    console.log('[search-index] pagefind index generated');
  } catch (err) {
    console.error('[search-index] FAILED:', err.message);
    process.exit(1);
  }
}
```

- [ ] **Step 5: 运行测试验证通过**

Run: `pnpm vitest run src/scripts/__tests__/search-index.test.mjs`
Expected: PASS — 全部 6 个测试通过

- [ ] **Step 6: Commit**

```bash
git add src/scripts/search-index.mjs src/scripts/__tests__/search-index.test.mjs pnpm-lock.yaml
git commit -m "feat: add search-index script with pagefind provider validation"
```

---

### Task 3: OG 图核心库 (src/lib/og.ts)

**Files:**

- Create: `src/lib/og.ts`
- Test: `src/lib/__tests__/og.test.ts`

**Interfaces:**

- Consumes: satori、@resvg/resvg-js、`public/fonts/og/` 字体文件
- Produces: `OG_TEMPLATE_VERSION`/`OG_FONT_VERSION` 常量;`computeOgHash()`;`loadOgFonts(locale)`;`buildOgElementTree(info)`;`renderOgImage(tree, fonts)`

- [ ] **Step 1: 安装 OG 依赖**

Run: `pnpm add satori @resvg/resvg-js`
Expected: satori + @resvg/resvg-js 安装成功

- [ ] **Step 2: 准备字体文件**

将以下字体文件放入 `public/fonts/og/`:

- `Inter-Regular.ttf` — Latin + Cyrillic 覆盖
- `Inter-Bold.ttf` — Latin + Cyrillic 覆盖(粗体)
- `NotoSansSC-Regular.ttf` — CJK 子集化(3500 常用汉字,目标 1-3MB;使用 `pyftsubset` 或 `@chinese-fonts` 子集化方案)

字体来源在 README.md(Task 15)注明。若字体未就绪,OG 生成 warn 降级(Task 4 处理)。

- [ ] **Step 3: 编写失败测试**

```ts
// src/lib/__tests__/og.test.ts
import { describe, it, expect } from 'vitest';
import { OG_TEMPLATE_VERSION, OG_FONT_VERSION, computeOgHash } from '../og';

describe('og constants', () => {
  it('OG_TEMPLATE_VERSION is a positive integer string', () => {
    expect(OG_TEMPLATE_VERSION).toMatch(/^\d+$/);
    expect(Number(OG_TEMPLATE_VERSION)).toBeGreaterThan(0);
  });

  it('OG_FONT_VERSION is a positive integer string', () => {
    expect(OG_FONT_VERSION).toMatch(/^\d+$/);
    expect(Number(OG_FONT_VERSION)).toBeGreaterThan(0);
  });
});

describe('computeOgHash', () => {
  it('produces stable sha1 hex string', () => {
    expect(computeOgHash('Hello', 'World', 'en', 'articles', 'hello-world')).toMatch(
      /^[0-9a-f]{40}$/,
    );
  });

  it('different titles produce different hashes', () => {
    const h1 = computeOgHash('Title A', 'Desc', 'en', 'articles', 'slug');
    const h2 = computeOgHash('Title B', 'Desc', 'en', 'articles', 'slug');
    expect(h1).not.toBe(h2);
  });

  it('different locales produce different hashes', () => {
    const h1 = computeOgHash('Title', 'Desc', 'zh', 'articles', 'slug');
    const h2 = computeOgHash('Title', 'Desc', 'en', 'articles', 'slug');
    expect(h1).not.toBe(h2);
  });

  it('different collections produce different hashes', () => {
    const h1 = computeOgHash('Title', 'Desc', 'en', 'articles', 'slug');
    const h2 = computeOgHash('Title', 'Desc', 'en', 'projects', 'slug');
    expect(h1).not.toBe(h2);
  });

  it('is deterministic for same input', () => {
    const h1 = computeOgHash('T', 'D', 'en', 'articles', 's');
    const h2 = computeOgHash('T', 'D', 'en', 'articles', 's');
    expect(h1).toBe(h2);
  });
});
```

- [ ] **Step 4: 运行测试验证失败**

Run: `pnpm vitest run src/lib/__tests__/og.test.ts`
Expected: FAIL — 模块 `../og` 不存在

- [ ] **Step 5: 实现 og.ts**

```ts
// src/lib/og.ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OG_TEMPLATE_VERSION = '1';
export const OG_FONT_VERSION = '1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = resolve(__dirname, '..', '..', 'public', 'fonts', 'og');

export interface OgEntryInfo {
  title: string;
  description: string;
  locale: string;
  collection: string;
  slug: string;
  siteName: string;
}

export function computeOgHash(
  title: string,
  description: string,
  locale: string,
  collection: string,
  slug: string,
): string {
  const input = `${title}|${description}|${locale}|${collection}|${slug}|${OG_TEMPLATE_VERSION}|${OG_FONT_VERSION}`;
  return createHash('sha1').update(input, 'utf-8').digest('hex');
}

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
  lang: string;
}

export function loadOgFonts(locale: string): OgFont[] {
  const fonts: OgFont[] = [];
  const interRegular = tryReadFont(resolve(FONTS_DIR, 'Inter-Regular.ttf'));
  if (interRegular)
    fonts.push({ name: 'Inter', data: interRegular, weight: 400, style: 'normal', lang: 'en' });
  const interBold = tryReadFont(resolve(FONTS_DIR, 'Inter-Bold.ttf'));
  if (interBold)
    fonts.push({ name: 'Inter', data: interBold, weight: 700, style: 'normal', lang: 'en' });
  if (locale === 'zh' || locale === 'ja') {
    const cjk = tryReadFont(resolve(FONTS_DIR, 'NotoSansSC-Regular.ttf'));
    if (cjk)
      fonts.push({ name: 'NotoSansSC', data: cjk, weight: 400, style: 'normal', lang: locale });
  }
  return fonts;
}

function tryReadFont(path: string): Buffer | null {
  try {
    return readFileSync(path);
  } catch {
    console.warn(`[og] font not found: ${path}`);
    return null;
  }
}

export function buildOgElementTree(info: OgEntryInfo): Record<string, unknown> {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#0f172a',
        color: '#f1f5f9',
        padding: '60px',
        fontFamily: 'Inter, NotoSansSC, sans-serif',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { fontSize: '28px', fontWeight: 400, opacity: 0.7 },
            children: info.siteName,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              flex: 1,
              justifyContent: 'center',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { fontSize: '52px', fontWeight: 700, lineHeight: 1.3 },
                  children: info.title,
                },
              },
              {
                type: 'div',
                props: {
                  style: { fontSize: '28px', fontWeight: 400, opacity: 0.8, lineHeight: 1.5 },
                  children: info.description.slice(0, 120),
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'flex-end', fontSize: '24px', opacity: 0.6 },
            children: info.locale.toUpperCase(),
          },
        },
      ],
    },
  };
}

export async function renderOgImage(
  elementTree: Record<string, unknown>,
  fonts: OgFont[],
): Promise<Buffer> {
  const satori = (await import('satori')).default;
  const { Resvg } = await import('@resvg/resvg-js');
  const svg = await satori(elementTree as never, {
    width: 1200,
    height: 630,
    fonts: fonts as never,
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return Buffer.from(resvg.render().asPng());
}
```

- [ ] **Step 6: 运行测试验证通过**

Run: `pnpm vitest run src/lib/__tests__/og.test.ts`
Expected: PASS — 全部 7 个测试通过

- [ ] **Step 7: Commit**

```bash
git add src/lib/og.ts src/lib/__tests__/og.test.ts pnpm-lock.yaml public/fonts/og/
git commit -m "feat: add OG image core library with satori element tree and incremental hash"
```

---

### Task 4: OG 图生成脚本 (src/scripts/generate-og.ts)

**Files:**

- Create: `src/scripts/generate-og.ts`
- Modify: `public/images/og-default.png`(放入默认 OG 图,1200x630)

**Interfaces:**

- Consumes: `src/lib/og.ts` 函数;Content Collections(article/project);`.cache/og-cache.json`
- Produces: `dist/og/{collection}-{locale}-{slug}.png`;更新 `.cache/og-cache.json`

- [ ] **Step 1: 准备默认 OG 图**

创建或获取一张 1200x630 PNG 放入 `public/images/og-default.png`。无特定 OG 的页面(draft/生成失败降级)用它。

- [ ] **Step 2: 实现 generate-og.ts**

```ts
// src/scripts/generate-og.ts
import { getCollection } from 'astro:content';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeOgHash,
  loadOgFonts,
  buildOgElementTree,
  renderOgImage,
  type OgEntryInfo,
} from '../lib/og.ts';
import { getSiteConfig } from '../config/site.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const CACHE_PATH = resolve(projectRoot, '.cache', 'og-cache.json');
const OUTPUT_DIR = resolve(projectRoot, 'dist', 'og');

interface OgCache {
  [key: string]: string;
}

function loadCache(): OgCache {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveCache(cache: OgCache): void {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function getSlug(id: string): string {
  const parts = id.split('/');
  return parts[parts.length - 1] || parts[parts.length - 2] || id;
}

function getLocale(id: string): string {
  return id.split('/')[0] || 'zh';
}

async function main() {
  const siteConfig = getSiteConfig();
  const cache = loadCache();
  const newCache: OgCache = {};
  const collections: Array<{
    data: { title: string; description?: string; draft?: boolean };
    id: string;
    collection: string;
  }> = [];

  for (const name of ['articles', 'projects'] as const) {
    try {
      const entries = await getCollection(name);
      for (const entry of entries) {
        collections.push({ data: entry.data as never, id: entry.id, collection: name });
      }
    } catch (err) {
      console.warn(`[generate-og] could not read collection "${name}": ${(err as Error).message}`);
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  let generated = 0,
    skipped = 0,
    degraded = 0;

  for (const entry of collections) {
    if (entry.data.draft) continue;
    const locale = getLocale(entry.id);
    const slug = getSlug(entry.id);
    const cacheKey = `${entry.collection}-${locale}-${slug}`;
    const hash = computeOgHash(
      entry.data.title,
      entry.data.description ?? '',
      locale,
      entry.collection,
      slug,
    );

    if (cache[cacheKey] === hash) {
      newCache[cacheKey] = hash;
      skipped++;
      continue;
    }

    const fonts = loadOgFonts(locale);
    if (fonts.length === 0) {
      console.warn(`[generate-og] no fonts, degrading: ${cacheKey}`);
      degraded++;
      newCache[cacheKey] = hash;
      continue;
    }

    const hasCjk = /[\u4e00-\u9fff\u3040-\u30ff]/.test(
      entry.data.title + (entry.data.description ?? ''),
    );
    if (hasCjk && !fonts.some((f) => f.lang === 'zh' || f.lang === 'ja')) {
      console.warn(`[generate-og] CJK text but no CJK font, degrading: ${cacheKey}`);
      degraded++;
      newCache[cacheKey] = hash;
      continue;
    }

    const info: OgEntryInfo = {
      title: entry.data.title,
      description: entry.data.description ?? '',
      locale,
      collection: entry.collection,
      slug,
      siteName: siteConfig.siteName,
    };
    try {
      const png = await renderOgImage(buildOgElementTree(info), fonts);
      writeFileSync(resolve(OUTPUT_DIR, `${cacheKey}.png`), png);
      newCache[cacheKey] = hash;
      generated++;
      console.log(`[generate-og] generated: ${cacheKey}.png`);
    } catch (err) {
      console.warn(`[generate-og] failed, degrading: ${cacheKey}: ${(err as Error).message}`);
      degraded++;
      newCache[cacheKey] = hash;
    }
  }

  saveCache(newCache);
  console.log(
    `[generate-og] done: ${generated} generated, ${skipped} skipped, ${degraded} degraded`,
  );
  process.exit(0);
}

main().catch((err) => {
  if (String(err.message).includes('resvg') || String(err.message).includes('native')) {
    console.warn(`[generate-og] resvg native binding error, OG degraded to default:`);
    console.warn(`  ${err.message}`);
    console.warn(
      `[generate-og] Fix: ensure build platform has prebuilt resvg, or remove generate-og from postbuild.`,
    );
  } else {
    console.warn(`[generate-og] unexpected error, degrading: ${err.message}`);
  }
  process.exit(0);
});
```

- [ ] **Step 3: 验证脚本可执行**

Run: `pnpm build && pnpm tsx src/scripts/generate-og.ts`
Expected: 输出 generated/skipped/degraded 统计;`dist/og/` 下有 PNG(或降级 warn);退出码 0

- [ ] **Step 4: 确认 .gitignore 含 dist/ 与 .cache/**

确认 `.gitignore` 已含 `dist/` 和 `.cache/`(Plan 1 应已添加)。若缺失则追加。

- [ ] **Step 5: Commit**

```bash
git add src/scripts/generate-og.ts public/images/og-default.png .gitignore
git commit -m "feat: add incremental OG image generation script with resvg fallback"
```

---

### Task 5: CSP 动态生成 (buildCsp)

**Files:**

- Modify: `src/lib/seo.ts`(追加 `buildCsp()` 函数)
- Test: `src/lib/__tests__/seo-csp.test.ts`

**Interfaces:**

- Consumes: 环境变量(`PUBLIC_GISCUS_ENABLED`/`PUBLIC_UMAMI_ENABLED`/`PUBLIC_UMAMI_SCRIPT_URL`/`PUBLIC_MUSIC_ENABLED`)
- Produces: `buildCsp(env?, opts?)` → CSP 字符串;`CspEnv` 类型

- [ ] **Step 1: 编写失败测试**

```ts
// src/lib/__tests__/seo-csp.test.ts
import { describe, it, expect } from 'vitest';
import { buildCsp } from '../seo';

describe('buildCsp', () => {
  it('returns base CSP with no integrations enabled', () => {
    const csp = buildCsp({});
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data: https:");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("media-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toContain('giscus.app');
    expect(csp).not.toContain('umami');
    expect(csp).not.toContain('jsdelivr');
  });

  it('adds giscus.app when GISCUS enabled', () => {
    const csp = buildCsp({ PUBLIC_GISCUS_ENABLED: 'true' });
    const parts = csp.split('; ');
    expect(parts.find((p) => p.startsWith('script-src'))).toContain('giscus.app');
    expect(parts.find((p) => p.startsWith('connect-src'))).toContain('giscus.app');
    expect(parts.find((p) => p.startsWith('frame-src'))).toContain('giscus.app');
  });

  it('adds umami cloud domain when UMAMI enabled with cloud URL', () => {
    const csp = buildCsp({
      PUBLIC_UMAMI_ENABLED: 'true',
      PUBLIC_UMAMI_SCRIPT_URL: 'https://cloud.umami.is/script.js',
    });
    expect(csp).toContain('https://cloud.umami.is');
  });

  it('adds umami self-hosted domain from script URL', () => {
    const csp = buildCsp({
      PUBLIC_UMAMI_ENABLED: 'true',
      PUBLIC_UMAMI_SCRIPT_URL: 'https://analytics.example.com/script.js',
    });
    expect(csp).toContain('https://analytics.example.com');
    expect(csp).not.toContain('cloud.umami.is');
  });

  it('adds media CDN domains when MUSIC enabled', () => {
    const csp = buildCsp({ PUBLIC_MUSIC_ENABLED: 'true' });
    const parts = csp.split('; ');
    const mediaSrc = parts.find((p) => p.startsWith('media-src'));
    expect(mediaSrc).toContain('jsdelivr');
    expect(mediaSrc).toContain('raw.githubusercontent.com');
  });

  it('does not add frame-ancestors when supportsHeaders is false', () => {
    expect(buildCsp({}, { supportsHeaders: false })).not.toContain('frame-ancestors');
  });

  it('adds frame-ancestors when supportsHeaders is true', () => {
    expect(buildCsp({}, { supportsHeaders: true })).toContain("frame-ancestors 'self'");
  });

  it('never includes unpkg.com in main site CSP', () => {
    const csp = buildCsp({
      PUBLIC_GISCUS_ENABLED: 'true',
      PUBLIC_UMAMI_ENABLED: 'true',
      PUBLIC_MUSIC_ENABLED: 'true',
    });
    expect(csp).not.toContain('unpkg.com');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm vitest run src/lib/__tests__/seo-csp.test.ts`
Expected: FAIL — `buildCsp` 未导出

- [ ] **Step 3: 在 seo.ts 追加 buildCsp()**

在 `src/lib/seo.ts` 文件末尾追加(保留 Plan 3 已有的 `buildHreflang`/`buildCanonical` 等函数):

```ts
// --- CSP Generation (Plan 5) ---

export interface CspEnv {
  PUBLIC_GISCUS_ENABLED?: string;
  PUBLIC_UMAMI_ENABLED?: string;
  PUBLIC_UMAMI_SCRIPT_URL?: string;
  PUBLIC_MUSIC_ENABLED?: string;
}

export interface BuildCspOptions {
  supportsHeaders?: boolean;
}

/**
 * Build Content-Security-Policy string dynamically based on enabled integrations.
 * Pure function: only reads env, no side effects.
 * - Giscus → giscus.app in script/connect/frame-src
 * - Umami → origin from PUBLIC_UMAMI_SCRIPT_URL in script/connect-src
 * - Music → jsDelivr + raw.githubusercontent.com in media-src
 * - frame-ancestors only when supportsHeaders=true
 * - Never includes unpkg.com (admin-only CSP)
 */
export function buildCsp(
  env: CspEnv = (import.meta.env as CspEnv) ?? {},
  opts: BuildCspOptions = {},
): string {
  const scriptDomains = ["'self'", "'unsafe-inline'"];
  const connectDomains = ["'self'"];
  const frameDomains: string[] = [];
  const mediaDomains = ["'self'"];

  if (env.PUBLIC_GISCUS_ENABLED === 'true') {
    scriptDomains.push('https://giscus.app');
    connectDomains.push('https://giscus.app');
    frameDomains.push('https://giscus.app');
  }

  if (env.PUBLIC_UMAMI_ENABLED === 'true' && env.PUBLIC_UMAMI_SCRIPT_URL) {
    try {
      const origin = new URL(env.PUBLIC_UMAMI_SCRIPT_URL).origin;
      scriptDomains.push(origin);
      connectDomains.push(origin);
    } catch {
      /* invalid URL — skip */
    }
  }

  if (env.PUBLIC_MUSIC_ENABLED === 'true') {
    mediaDomains.push('https://cdn.jsdelivr.net', 'https://raw.githubusercontent.com');
  }

  return [
    `default-src 'self'`,
    `script-src ${scriptDomains.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `media-src ${mediaDomains.join(' ')}`,
    `connect-src ${connectDomains.join(' ')}`,
    frameDomains.length > 0 ? `frame-src ${frameDomains.join(' ')}` : '',
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    opts.supportsHeaders ? `frame-ancestors 'self'` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/lib/__tests__/seo-csp.test.ts`
Expected: PASS — 全部 9 个测试通过

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts src/lib/__tests__/seo-csp.test.ts
git commit -m "feat: add dynamic CSP generation with buildCsp pure function"
```

---

### Task 6: 自定义 Sitemap (buildSitemapEntries + sitemap.xml.ts)

**Files:**

- Modify: `src/lib/seo.ts`(追加 `buildSitemapEntries()` + `renderSitemapXml()`)
- Create: `src/pages/sitemap.xml.ts`
- Test: `src/lib/__tests__/seo-sitemap.test.ts`

**Interfaces:**

- Consumes: `resolveLocalizedEntry()`(from `src/lib/i18n.ts`,Plan 3)、`staticPageMeta`(from `src/config/static-pages.ts`,Plan 3)、`locales`/`defaultLocale`(from `src/i18n/config.ts`,Plan 1)
- Produces: `buildSitemapEntries(pages, baseUrl)` → `SitemapEntry[]`;`renderSitemapXml(entries)` → XML string;`/sitemap.xml` 端点

- [ ] **Step 1: 编写失败测试**

```ts
// src/lib/__tests__/seo-sitemap.test.ts
import { describe, it, expect } from 'vitest';
import { buildSitemapEntries, type SitemapPage } from '../seo';

describe('buildSitemapEntries', () => {
  const pages: SitemapPage[] = [
    {
      url: '/zh/articles/hello/',
      lastmod: '2026-01-15',
      noindex: false,
      alternates: [
        { hreflang: 'zh-CN', href: '/zh/articles/hello/' },
        { hreflang: 'en', href: '/en/articles/hello/' },
      ],
    },
    {
      url: '/en/articles/hello/',
      lastmod: '2026-01-15',
      noindex: false,
      alternates: [
        { hreflang: 'zh-CN', href: '/zh/articles/hello/' },
        { hreflang: 'en', href: '/en/articles/hello/' },
      ],
    },
    { url: '/ru/articles/hello/', lastmod: undefined, noindex: true, alternates: [] },
    { url: '/404/', lastmod: undefined, noindex: true, alternates: [] },
  ];

  it('includes non-noindex pages', () => {
    const urls = buildSitemapEntries(pages, 'https://example.com').map((e) => e.loc);
    expect(urls).toContain('https://example.com/zh/articles/hello/');
    expect(urls).toContain('https://example.com/en/articles/hello/');
  });

  it('excludes noindex pages', () => {
    const urls = buildSitemapEntries(pages, 'https://example.com').map((e) => e.loc);
    expect(urls).not.toContain('https://example.com/ru/articles/hello/');
    expect(urls).not.toContain('https://example.com/404/');
  });

  it('includes lastmod when provided', () => {
    const entry = buildSitemapEntries(pages, 'https://example.com').find((e) =>
      e.loc.includes('/zh/articles/hello/'),
    );
    expect(entry?.lastmod).toBe('2026-01-15');
  });

  it('omits lastmod when not provided', () => {
    const entries = buildSitemapEntries(
      [{ url: '/zh/', lastmod: undefined, noindex: false, alternates: [] }],
      'https://example.com',
    );
    expect(entries[0].lastmod).toBeUndefined();
  });

  it('includes alternates with standard hreflang codes', () => {
    const entry = buildSitemapEntries(pages, 'https://example.com').find((e) =>
      e.loc.includes('/zh/articles/hello/'),
    );
    expect(entry?.alternates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hreflang: 'zh-CN' }),
        expect.objectContaining({ hreflang: 'en' }),
      ]),
    );
  });

  it('prefixes URLs with baseUrl', () => {
    const entries = buildSitemapEntries(
      [{ url: '/zh/', lastmod: undefined, noindex: false, alternates: [] }],
      'https://example.com',
    );
    expect(entries[0].loc).toBe('https://example.com/zh/');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm vitest run src/lib/__tests__/seo-sitemap.test.ts`
Expected: FAIL — `buildSitemapEntries`/`SitemapPage` 未导出

- [ ] **Step 3: 在 seo.ts 追加 sitemap 函数**

```ts
// --- Sitemap Generation (Plan 5) ---

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}
export interface SitemapPage {
  url: string;
  lastmod?: string;
  noindex: boolean;
  alternates: SitemapAlternate[];
}
export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  alternates: SitemapAlternate[];
}

/**
 * Build sitemap entries from a unified page list.
 * Pure function: filters noindex, prefixes with baseUrl, preserves alternates.
 */
export function buildSitemapEntries(pages: SitemapPage[], baseUrl: string): SitemapEntry[] {
  const base = baseUrl.replace(/\/$/, '');
  return pages
    .filter((p) => !p.noindex)
    .map((p) => ({
      loc: `${base}${p.url}`,
      lastmod: p.lastmod,
      alternates: p.alternates.map((a) => ({ hreflang: a.hreflang, href: `${base}${a.href}` })),
    }));
}

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const alts = e.alternates
        .map(
          (a) =>
            `    <xhtml:link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}" />`,
        )
        .join('\n');
      const lastmod = e.lastmod ? `    <lastmod>${esc(e.lastmod)}</lastmod>\n` : '';
      return `  <url>\n    <loc>${esc(e.loc)}</loc>\n${lastmod}${alts}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/lib/__tests__/seo-sitemap.test.ts`
Expected: PASS — 全部 6 个测试通过

- [ ] **Step 5: 创建 sitemap.xml.ts 端点**

```ts
// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { locales, defaultLocale } from '../i18n/config';
import { resolveLocalizedEntry } from '../lib/i18n';
import { buildSitemapEntries, renderSitemapXml, type SitemapPage } from '../lib/seo';
import { getSiteConfig } from '../config/site';
import { staticPageMeta } from '../config/static-pages';

function localeFromId(id: string): string {
  return id.split('/')[0] || 'zh';
}
function slugFromId(id: string): string {
  const p = id.split('/');
  return p[p.length - 1] || p[p.length - 2] || id;
}

export const GET: APIRoute = async () => {
  const siteConfig = getSiteConfig();
  const pages: SitemapPage[] = [];

  // 1. Static pages per locale
  for (const locale of locales) {
    for (const [path, meta] of Object.entries(staticPageMeta)) {
      pages.push({
        url: `/${locale}${path}`,
        lastmod: meta.lastmod,
        noindex: meta.noindex ?? false,
        alternates: locales.map((l) => ({
          hreflang: l === 'zh' ? 'zh-CN' : l,
          href: `/${l}${path}`,
        })),
      });
    }
  }

  // 2. Content detail pages (render only)
  for (const collection of ['articles', 'projects'] as const) {
    const entries = await getCollection(collection);
    const groups = new Map<string, typeof entries>();
    for (const entry of entries) {
      if (entry.data.draft) continue;
      const tKey =
        (entry.data as { translationKey?: string }).translationKey ?? `single:${entry.id}`;
      if (!groups.has(tKey)) groups.set(tKey, []);
      groups.get(tKey)!.push(entry);
    }

    for (const [tKey, group] of groups) {
      for (const uiLocale of locales) {
        const resolved = resolveLocalizedEntry(collection, tKey, uiLocale);
        if (resolved.mode !== 'render') continue;
        const entry = group.find((e) => localeFromId(e.id) === resolved.contentLocale);
        if (!entry) continue;
        const slug = slugFromId(entry.id);

        const renderLocales = locales
          .map((l) => ({ l, r: resolveLocalizedEntry(collection, tKey, l) }))
          .filter((x) => x.r.mode === 'render');
        const alternates = renderLocales.map((x) => {
          const altEntry = group.find((e) => localeFromId(e.id) === x.r.contentLocale);
          return {
            hreflang: x.l === 'zh' ? 'zh-CN' : x.l,
            href: `/${x.l}/${collection}/${altEntry ? slugFromId(altEntry.id) : slug}/`,
          };
        });
        const defRender = renderLocales.find((x) => x.l === defaultLocale) ?? renderLocales[0];
        if (defRender) {
          const defEntry = group.find((e) => localeFromId(e.id) === defRender.r.contentLocale);
          alternates.push({
            hreflang: 'x-default',
            href: `/${defRender.l}/${collection}/${defEntry ? slugFromId(defEntry.id) : slug}/`,
          });
        }

        const data = entry.data as { updatedDate?: string; pubDate?: string };
        pages.push({
          url: `/${uiLocale}/${collection}/${slug}/`,
          lastmod: data.updatedDate ?? data.pubDate,
          noindex: false,
          alternates,
        });
      }
    }
  }

  const xml = renderSitemapXml(buildSitemapEntries(pages, siteConfig.siteUrl));
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
```

- [ ] **Step 6: 验证端点生成**

Run: `pnpm build`
Expected: `dist/sitemap.xml` 生成,含 `<urlset>` + `<xhtml:link>` + `<lastmod>`

- [ ] **Step 7: Commit**

```bash
git add src/lib/seo.ts src/lib/__tests__/seo-sitemap.test.ts src/pages/sitemap.xml.ts
git commit -m "feat: add custom sitemap with unified data source and hreflang support"
```

---

### Task 7: RSS 与 robots.txt 端点

**Files:**

- Create: `src/pages/rss/[locale].xml.ts`
- Create: `src/pages/robots.txt.ts`

**Interfaces:**

- Consumes: `@astrojs/rss`、Content Collections(articles)、`locales`、`getSiteConfig()`
- Produces: `/rss/{locale}.xml`(每语言一 feed,过滤 draft);`/robots.txt`(声明 Sitemap)

- [ ] **Step 1: 安装 @astrojs/rss**

Run: `pnpm add @astrojs/rss`
Expected: 安装成功

- [ ] **Step 2: 创建 RSS 端点**

```ts
// src/pages/rss/[locale].xml.ts
import type { APIRoute, GetStaticPaths } from 'astro';
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { locales } from '../../i18n/config';
import { getSiteConfig } from '../../config/site';

export const getStaticPaths: GetStaticPaths = () =>
  locales.map((locale) => ({ params: { locale } }));

export const GET: APIRoute = async (context) => {
  const locale = context.params.locale!;
  const siteConfig = getSiteConfig();
  const articles = await getCollection(
    'articles',
    (entry) => entry.id.split('/')[0] === locale && !entry.data.draft,
  );
  const sorted = articles.sort((a, b) => {
    const ad = (a.data as { pubDate?: string }).pubDate ?? '';
    const bd = (b.data as { pubDate?: string }).pubDate ?? '';
    return bd.localeCompare(ad);
  });

  return rss({
    title: `${siteConfig.siteName} — ${locale.toUpperCase()}`,
    description: siteConfig.siteDescription ?? siteConfig.siteName,
    site: siteConfig.siteUrl,
    items: sorted.map((entry) => {
      const slug =
        entry.id
          .split('/')
          .slice(1)
          .join('/')
          .replace(/\/index$/, '') || entry.id.split('/')[1];
      const data = entry.data as { title: string; description?: string; pubDate?: string };
      return {
        title: data.title,
        description: data.description ?? '',
        pubDate: data.pubDate ? new Date(data.pubDate) : new Date(),
        link: `/${locale}/articles/${slug}/`,
      };
    }),
    customData: `<language>${locale}</language>`,
  });
};
```

- [ ] **Step 3: 创建 robots.txt 端点**

```ts
// src/pages/robots.txt.ts
import type { APIRoute } from 'astro';
import { getSiteConfig } from '../config/site';

export const GET: APIRoute = () => {
  const base = getSiteConfig().siteUrl.replace(/\/$/, '');
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${base}/sitemap.xml\n`,
    {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    },
  );
};
```

- [ ] **Step 4: 验证端点生成**

Run: `pnpm build`
Expected: `dist/rss/zh.xml`、`dist/rss/en.xml`、`dist/rss/ru.xml`、`dist/rss/ja.xml` 生成(ru/ja 可为空 feed);`dist/robots.txt` 含 `Sitemap:` 行

- [ ] **Step 5: Commit**

```bash
git add src/pages/rss/ src/pages/robots.txt.ts pnpm-lock.yaml
git commit -m "feat: add per-locale RSS feeds and robots.txt endpoint"
```

---

### Task 8: 重定向生成器 (generate-redirects.ts)

**Files:**

- Create: `src/lib/redirects.ts`
- Create: `src/scripts/generate-redirects.ts`
- Test: `src/lib/__tests__/redirects.test.ts`

**Interfaces:**

- Consumes: `src/content/redirects.json`(`{ "/old/": "/new/" }`)、`dist/` 路由列表
- Produces: `validateRedirectManifest()`、`validateGeneratedRoutes()`、`generateRedirectsFile()`、`generateVercelRedirects()`、`generateStaticRedirectHtml()`;dist 下平台规则文件

- [ ] **Step 1: 编写失败测试**

```ts
// src/lib/__tests__/redirects.test.ts
import { describe, it, expect } from 'vitest';
import { validateRedirectManifest, validateGeneratedRoutes, type RedirectMap } from '../redirects';

describe('validateRedirectManifest', () => {
  it('passes for valid empty map', () => {
    expect(validateRedirectManifest({}).valid).toBe(true);
  });
  it('passes for valid single redirect', () => {
    expect(validateRedirectManifest({ '/en/articles/old/': '/en/articles/new/' }).valid).toBe(true);
  });
  it('fails when source does not start with /', () => {
    const r = validateRedirectManifest({ 'en/old/': '/en/new/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('/');
  });
  it('fails when source equals target', () => {
    const r = validateRedirectManifest({ '/en/foo/': '/en/foo/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('same');
  });
  it('fails on cycle A->B B->A', () => {
    const r = validateRedirectManifest({ '/en/a/': '/en/b/', '/en/b/': '/en/a/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('cycle');
  });
  it('fails on chain A->B->C (MVP)', () => {
    const r = validateRedirectManifest({ '/en/a/': '/en/b/', '/en/b/': '/en/c/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('chain');
  });
  it('fails when target is external domain', () => {
    const r = validateRedirectManifest({ '/old/': 'https://example.com/new/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('external');
  });
  it('fails when trailing slash inconsistent', () => {
    const r = validateRedirectManifest({ '/en/old': '/en/new/' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('trailing');
  });
});

describe('validateGeneratedRoutes', () => {
  const routes = new Set(['/en/articles/new/', '/zh/articles/hello/', '/zh/']);
  it('passes when target exists and source does not', () => {
    expect(
      validateGeneratedRoutes({ '/en/articles/old/': '/en/articles/new/' }, routes).valid,
    ).toBe(true);
  });
  it('fails when target does not exist', () => {
    const r = validateGeneratedRoutes({ '/en/old/': '/en/nonexistent/' }, routes);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('target');
  });
  it('fails when source still exists as route', () => {
    const r = validateGeneratedRoutes({ '/zh/': '/zh/articles/hello/' }, routes);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('source');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm vitest run src/lib/__tests__/redirects.test.ts`
Expected: FAIL — `validateRedirectManifest`/`RedirectMap` 未导出

- [ ] **Step 3: 创建 redirects.ts**

```ts
// src/lib/redirects.ts
export type RedirectMap = Record<string, string>;
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Stage 1: Validate redirect manifest format and legality.
 * Checks: start with /, trailing slash, not external, source != target, no cycles, no chains.
 */
export function validateRedirectManifest(redirects: RedirectMap): ValidationResult {
  const errors: string[] = [];
  for (const [source, target] of Object.entries(redirects)) {
    if (!source.startsWith('/')) errors.push(`source "${source}" must start with /`);
    if (!target.startsWith('/')) errors.push(`target "${target}" is external or must start with /`);
    if (!source.endsWith('/') || !target.endsWith('/'))
      errors.push(`source "${source}" and target "${target}" must both have trailing slash`);
    if (source === target) errors.push(`source and target are the same: "${source}"`);
  }
  for (const [source, target] of Object.entries(redirects)) {
    if (redirects[target] === source)
      errors.push(`cycle: "${source}" -> "${target}" -> "${source}"`);
  }
  for (const [source, target] of Object.entries(redirects)) {
    if (redirects[target])
      errors.push(`chain: "${source}" -> "${target}" -> "${redirects[target]}" (MVP disallows)`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Stage 2: Validate against generated routes (postbuild).
 * target must exist, source must NOT exist.
 */
export function validateGeneratedRoutes(
  redirects: RedirectMap,
  routes: Set<string>,
): ValidationResult {
  const errors: string[] = [];
  for (const [source, target] of Object.entries(redirects)) {
    if (!routes.has(target)) errors.push(`target "${target}" not found in generated routes`);
    if (routes.has(source)) errors.push(`source "${source}" still exists as a route`);
  }
  return { valid: errors.length === 0, errors };
}

/** Generate Cloudflare/Netlify _redirects file content. */
export function generateRedirectsFile(redirects: RedirectMap): string {
  return Object.entries(redirects)
    .map(([s, t]) => `${s}\t${t}\t301`)
    .join('\n');
}

/** Generate Vercel redirects array. */
export function generateVercelRedirects(redirects: RedirectMap) {
  return Object.entries(redirects).map(([s, t]) => ({
    source: s,
    destination: t,
    permanent: true,
  }));
}

/** Generate static redirect HTML for GitHub Pages. */
export function generateStaticRedirectHtml(
  source: string,
  target: string,
  siteUrl: string,
): string {
  const full = `${siteUrl.replace(/\/$/, '')}${target}`;
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Redirecting...</title>\n<link rel="canonical" href="${full}">\n<meta http-equiv="refresh" content="0; url=${full}">\n<meta name="robots" content="noindex">\n<script>location.replace("${full}");</script>\n</head>\n<body>\n<p>Redirecting to <a href="${full}">${full}</a>.</p>\n</body>\n</html>`;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/lib/__tests__/redirects.test.ts`
Expected: PASS — 全部 11 个测试通过

- [ ] **Step 5: 创建 generate-redirects.ts 脚本**

```ts
// src/scripts/generate-redirects.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateRedirectManifest,
  validateGeneratedRoutes,
  generateRedirectsFile,
  generateVercelRedirects,
  generateStaticRedirectHtml,
  type RedirectMap,
} from '../lib/redirects';
import { getSiteConfig } from '../config/site';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const REDIRECTS_PATH = resolve(projectRoot, 'src', 'content', 'redirects.json');
const DIST_DIR = resolve(projectRoot, 'dist');

function scanRoutes(): Set<string> {
  const routes = new Set<string>();
  if (!existsSync(DIST_DIR)) return routes;
  function scan(dir: string, prefix: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const url = `${prefix}/${entry}`;
      if (statSync(full).isDirectory()) scan(full, url);
      else if (entry === 'index.html') routes.add(prefix.endsWith('/') ? prefix : `${prefix}/`);
    }
  }
  scan(DIST_DIR, '');
  return routes;
}

async function main() {
  if (!existsSync(REDIRECTS_PATH)) {
    console.log('[generate-redirects] no redirects.json, skipping');
    process.exit(0);
  }

  let redirects: RedirectMap;
  try {
    redirects = JSON.parse(readFileSync(REDIRECTS_PATH, 'utf-8'));
  } catch (err) {
    console.error('[generate-redirects] invalid JSON:', (err as Error).message);
    process.exit(1);
  }

  const r1 = validateRedirectManifest(redirects);
  if (!r1.valid) {
    r1.errors.forEach((e) => console.error(`  - ${e}`));
    console.error('[generate-redirects] manifest validation failed');
    process.exit(1);
  }

  const r2 = validateGeneratedRoutes(redirects, scanRoutes());
  if (!r2.valid) {
    r2.errors.forEach((e) => console.error(`  - ${e}`));
    console.error('[generate-redirects] route validation failed');
    process.exit(1);
  }

  const siteConfig = getSiteConfig();
  const platform = process.env.DEPLOY_PLATFORM ?? 'all';

  if (platform === 'all' || platform === 'cloudflare' || platform === 'netlify') {
    writeFileSync(resolve(DIST_DIR, '_redirects'), generateRedirectsFile(redirects) + '\n');
    console.log('[generate-redirects] wrote dist/_redirects');
  }
  if (platform === 'all' || platform === 'vercel') {
    const existing = resolve(projectRoot, 'vercel.json');
    let config: Record<string, unknown> = {};
    if (existsSync(existing))
      try {
        config = JSON.parse(readFileSync(existing, 'utf-8'));
      } catch {
        /* fresh */
      }
    config.redirects = generateVercelRedirects(redirects);
    writeFileSync(existing, JSON.stringify(config, null, 2) + '\n');
    console.log('[generate-redirects] wrote vercel.json');
  }
  if (platform === 'all' || platform === 'github-pages') {
    for (const [source, target] of Object.entries(redirects)) {
      const dir = resolve(DIST_DIR, source.slice(1));
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        resolve(dir, 'index.html'),
        generateStaticRedirectHtml(source, target, siteConfig.siteUrl),
      );
    }
    console.log('[generate-redirects] wrote GitHub Pages static HTML');
  }
  console.log('[generate-redirects] done');
}

main().catch((err) => {
  console.error('[generate-redirects] error:', err);
  process.exit(1);
});
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/redirects.ts src/lib/__tests__/redirects.test.ts src/scripts/generate-redirects.ts
git commit -m "feat: add redirect manifest validation and platform-specific generation"
```

---

### Task 9: Postbuild 校验器 (check-sitemap.ts + check-rss.ts)

**Files:**

- Create: `src/scripts/check-sitemap.ts`
- Create: `src/scripts/check-rss.ts`

**Interfaces:**

- Consumes: `dist/sitemap.xml`、`dist/rss/*.xml`、`locales`(from `src/i18n/config`)
- Produces: 非零退出码当校验失败(阻断 CI)

- [ ] **Step 1: 实现 check-sitemap.ts**

```ts
// src/scripts/check-sitemap.ts
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITEMAP_PATH = resolve(projectRoot, 'dist', 'sitemap.xml');

function main() {
  if (!existsSync(SITEMAP_PATH)) {
    console.error('[check-sitemap] dist/sitemap.xml not found');
    process.exit(1);
  }
  const xml = readFileSync(SITEMAP_PATH, 'utf-8');
  const errors: string[] = [];

  if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'))
    errors.push('missing sitemap xmlns');
  if (!xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'))
    errors.push('missing xmlns:xhtml');

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) errors.push('no <url> entries found');

  for (const url of urls) {
    if (url.includes('/404') || url.includes('/admin/'))
      errors.push(`noindex page in sitemap: ${url}`);
    if (!url.endsWith('/')) errors.push(`URL without trailing slash: ${url}`);
  }

  const blocks = xml.split('<url>').slice(1);
  for (let i = 0; i < blocks.length; i++) {
    if (!blocks[i].includes('<xhtml:link')) {
      const loc = blocks[i].match(/<loc>([^<]+)<\/loc>/)?.[1] ?? `block ${i}`;
      errors.push(`URL without xhtml:link alternates: ${loc}`);
    }
  }

  if (errors.length > 0) {
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('[check-sitemap] FAILED');
    process.exit(1);
  }
  console.log(`[check-sitemap] OK — ${urls.length} URLs valid`);
}
main();
```

- [ ] **Step 2: 实现 check-rss.ts**

```ts
// src/scripts/check-rss.ts
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locales } from '../i18n/config';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RSS_DIR = resolve(projectRoot, 'dist', 'rss');

function main() {
  if (!existsSync(RSS_DIR)) {
    console.error('[check-rss] dist/rss/ not found');
    process.exit(1);
  }
  const errors: string[] = [];

  for (const locale of locales) {
    const feedPath = resolve(RSS_DIR, `${locale}.xml`);
    if (!existsSync(feedPath)) {
      errors.push(`missing feed for "${locale}"`);
      continue;
    }
    const xml = readFileSync(feedPath, 'utf-8');
    if (!xml.includes('<rss') && !xml.includes('<feed'))
      errors.push(`${locale}.xml not valid RSS/Atom`);
    if (!xml.includes(`<language>${locale}</language>`))
      errors.push(`${locale}.xml missing <language>`);
  }

  if (errors.length > 0) {
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('[check-rss] FAILED');
    process.exit(1);
  }
  const count = readdirSync(RSS_DIR).filter((f) => f.endsWith('.xml')).length;
  console.log(`[check-rss] OK — ${count} feeds valid`);
}
main();
```

- [ ] **Step 3: 验证校验器运行**

Run: `pnpm build && pnpm tsx src/scripts/check-sitemap.ts && pnpm tsx src/scripts/check-rss.ts`
Expected: 两个脚本输出 OK 并退出码 0

- [ ] **Step 4: Commit**

```bash
git add src/scripts/check-sitemap.ts src/scripts/check-rss.ts
git commit -m "feat: add postbuild sitemap and RSS feed validators"
```

---

### Task 10: Postbuild 链与 package.json scripts

**Files:**

- Modify: `package.json`(完整 scripts 更新 + 新依赖)

**Interfaces:**

- Consumes: Task 1-9 所有脚本
- Produces: `pnpm build` 自动触发 prebuild + postbuild 完整链;`pnpm ci` 单命令全链

- [ ] **Step 1: 更新 package.json scripts 段**

将 `package.json` 的 `scripts` 替换为(保留 Plan 1 已有的 `dev`/`build`/`check`/`lint`/`test`/`ci`):

```json
{
  "scripts": {
    "dev": "astro dev",
    "predev": "node src/scripts/pull-content.mjs --if-missing",
    "build": "astro build",
    "prebuild": "node src/scripts/pull-content.mjs && node src/scripts/build-meta.mjs && pnpm run check:datasheets",
    "postbuild": "pnpm run build-meta -- --dist && pnpm run search:index && pnpm run generate-og && pnpm run generate:redirects && pnpm run check:links && pnpm run check:sitemap && pnpm run check:rss",
    "check": "astro check",
    "lint": "eslint . && prettier --check .",
    "lint:fix": "eslint . --fix && prettier --write .",
    "test": "vitest run",
    "ci": "pnpm run check && pnpm run lint && pnpm run test && pnpm run build",
    "pull:content": "node src/scripts/pull-content.mjs",
    "build-meta": "node src/scripts/build-meta.mjs",
    "check:datasheets": "tsx src/scripts/check-datasheets.ts",
    "check:links": "lychee --offline --no-progress \"dist/**/*.html\"",
    "check:sitemap": "tsx src/scripts/check-sitemap.ts",
    "check:rss": "tsx src/scripts/check-rss.ts",
    "search:index": "node src/scripts/search-index.mjs",
    "generate-og": "tsx src/scripts/generate-og.ts",
    "generate:redirects": "tsx src/scripts/generate-redirects.ts",
    "generate:deploy-config": "tsx src/scripts/generate-deploy-config.ts"
  }
}
```

**postbuild 链说明**:build-meta --dist → search:index(仅 pagefind 启用,失败 = CI fail)→ generate-og(warn + exit 0)→ generate:redirects → check:links → check:sitemap → check:rss。`check:links` 依赖 `lychee` 在 PATH 上(CI 用 GitHub Action,本地 `cargo install lychee` 或下载预编译)。

- [ ] **Step 2: 更新 dependencies**

在 `package.json` 添加(保留已有依赖):

```json
{
  "dependencies": {
    "astro": "^7.0.0",
    "@astrojs/rss": "^4.0.0",
    "satori": "^0.12.0"
  },
  "devDependencies": {
    "@resvg/resvg-js": "^2.6.0",
    "tsx": "^4.0.0",
    "pagefind": "^1.0.0"
  }
}
```

- [ ] **Step 3: 安装新依赖**

Run: `pnpm install`
Expected: 所有依赖安装成功,pnpm-lock.yaml 更新

- [ ] **Step 4: 验证完整构建链**

Run: `pnpm build`
Expected: prebuild → astro build → postbuild 全链退出码 0

- [ ] **Step 5: 验证 ci 单命令**

Run: `pnpm ci`
Expected: check → lint → test → build(含 prebuild + postbuild)全链通过

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: complete postbuild chain with all build/deploy scripts"
```

---

### Task 11: CI 工作流增强 (ci.yml)

**Files:**

- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: Task 10 的 `package.json` scripts
- Produces: CI workflow 含 secret 边界 + pull:content + lychee + artifact

- [ ] **Step 1: 替换 ci.yml**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9.15.5
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: lycheeverse/lychee-action@v2
        with:
          install: true
      - run: pnpm install --frozen-lockfile

      - name: Code checks (no secret)
        run: pnpm check && pnpm lint && pnpm test

      - name: Build (trusted context)
        if: >-
          github.event_name == 'push' ||
          (github.event_name == 'pull_request' &&
           github.event.pull_request.head.repo.full_name == github.repository)
        run: pnpm build
        env:
          CONTENT_REPO: ${{ secrets.CONTENT_REPO || 'YourUser/object920-content' }}
          CONTENT_GITHUB_TOKEN: ${{ secrets.CONTENT_GITHUB_TOKEN }}
          FORCE_CONTENT_SYNC: 'true'
          PUBLIC_SEARCH_ENABLED: 'true'
          PUBLIC_SEARCH_PROVIDER: 'pagefind'
          PUBLIC_SITE_URL: 'https://example.com'

      - uses: actions/upload-artifact@v4
        if: >-
          github.event_name == 'pull_request' &&
          github.event.pull_request.head.repo.full_name == github.repository
        with:
          name: dist-preview
          path: dist/
```

**关键设计**:`push` 只监听 `main`;fork 判断先检查 `github.event_name == 'pull_request'`;`CONTENT_GITHUB_TOKEN` 只在 build 步骤 env;`FORCE_CONTENT_SYNC=true` 只在 CI;lychee 通过 GitHub Action 安装;artifact 仅 internal PR(含 private content,不得公开)。

- [ ] **Step 2: 验证 YAML 语法**

Run: `pnpm prettier --check .github/workflows/ci.yml`
Expected: 无格式错误(如有则 `pnpm prettier --write` 修复)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: enhance workflow with secret boundaries, content pull, and lychee"
```

---

### Task 12: Cloudflare + Vercel 部署配置

**Files:**

- Create: `src/scripts/generate-deploy-config.ts`
- Create: `deploy/cloudflare/README.md`
- Create: `deploy/cloudflare/_headers`
- Create: `deploy/cloudflare/_redirects`
- Create: `deploy/vercel/README.md`
- Create: `deploy/vercel/vercel.json`

**Interfaces:**

- Consumes: `buildCsp()` from `src/lib/seo.ts`、`generate-redirects.ts` 输出
- Produces: 平台参考配置 + CSP 注入脚本

- [ ] **Step 1: 创建 generate-deploy-config.ts**

```ts
// src/scripts/generate-deploy-config.ts
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCsp } from '../lib/seo';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_DIR = resolve(projectRoot, 'dist');

const ADMIN_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; font-src 'self' https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https://api.github.com https://unpkg.com https://cdn.jsdelivr.net; frame-src 'self' https://unpkg.com; manifest-src 'self';";

async function main() {
  const platform = process.argv.find((a) => a.startsWith('--platform='))?.split('=')[1];
  if (!platform) {
    console.error(
      '[generate-deploy-config] usage: --platform=cloudflare|vercel|netlify|github-pages',
    );
    process.exit(1);
  }
  const csp = buildCsp(process.env as never, { supportsHeaders: true });
  mkdirSync(DIST_DIR, { recursive: true });

  if (platform === 'cloudflare' || platform === 'netlify') {
    const headers = `/*\n  Content-Security-Policy: ${csp}\n  X-Frame-Options: SAMEORIGIN\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n\n/admin/*\n  Content-Security-Policy: ${ADMIN_CSP}\n`;
    writeFileSync(resolve(DIST_DIR, '_headers'), headers);
    console.log(`[generate-deploy-config] wrote dist/_headers (${platform})`);
  }

  if (platform === 'vercel') {
    const config: Record<string, unknown> = {};
    const existing = resolve(projectRoot, 'vercel.json');
    if (existsSync(existing))
      try {
        Object.assign(config, JSON.parse(readFileSync(existing, 'utf-8')));
      } catch {
        /* */
      }
    config.headers = [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      { source: '/admin/(.*)', headers: [{ key: 'Content-Security-Policy', value: ADMIN_CSP }] },
    ];
    writeFileSync(existing, JSON.stringify(config, null, 2) + '\n');
    console.log('[generate-deploy-config] wrote vercel.json');
  }

  if (platform === 'github-pages') {
    console.log('[generate-deploy-config] GitHub Pages uses <meta> CSP — no config file');
  }
  console.log('[generate-deploy-config] done');
}
main().catch((err) => {
  console.error('[generate-deploy-config] error:', err);
  process.exit(1);
});
```

- [ ] **Step 2: 创建 Cloudflare README.md**

```markdown
# Cloudflare Pages 部署

## 快速开始

1. Cloudflare Dashboard → Pages → Create a project → Connect to Git → 选择主仓
2. 构建配置:
   - **Build command:** `pnpm install && pnpm build && pnpm run generate:deploy-config -- --platform=cloudflare`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION=22`、`CONTENT_REPO`、`CONTENT_GITHUB_TOKEN`、`FORCE_CONTENT_SYNC=true`、`PUBLIC_SITE_URL`、`PUBLIC_SEARCH_ENABLED=true`、`PUBLIC_SEARCH_PROVIDER=pagefind`、(可选)Giscus/Umami/Music
3. Save and Deploy

## 文件说明

- `_headers`: 安全 headers(CSP 由 `generate-deploy-config` 动态生成,此文件为模板参考)
- `_redirects`: 301 规则(由 `generate-redirects` 动态生成到 `dist/_redirects`)

## @resvg/resvg-js 原生绑定

Cloudflare Pages 默认容器(Linux x64 glibc)在预编译覆盖范围内,通常开箱即用。若报缺原生模块,见 spec 7.9 节"已知风险"。

## Deploy Hook

Cloudflare Pages → Settings → Deploy hooks 创建 URL,配置到 content 仓库 `MAIN_SITE_DEPLOY_HOOK_URL` secret。

## 构建资源限制

以 Cloudflare 官方当前文档为准(不写死在 Spec,易变)。
```

- [ ] **Step 3: 创建 Cloudflare \_headers 模板**

```
# deploy/cloudflare/_headers — 模板参考
# 部署时由 generate:deploy-config -- --platform=cloudflare 动态生成 CSP

/*
  Content-Security-Policy: <GENERATED_BY_BUILD>
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/admin/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; font-src 'self' https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https://api.github.com https://unpkg.com https://cdn.jsdelivr.net; frame-src 'self' https://unpkg.com; manifest-src 'self';
```

- [ ] **Step 4: 创建 Cloudflare \_redirects 模板**

```
# deploy/cloudflare/_redirects — 模板参考
# 部署时由 generate:redirects 从 redirects.json 动态生成
# 格式: /old-url/ /new-url/ 301
```

- [ ] **Step 5: 创建 Vercel README.md**

```markdown
# Vercel 部署

## 快速开始

1. Vercel Dashboard → New Project → Import 主仓
2. 构建配置:
   - **Framework Preset:** Astro
   - **Build Command:** `pnpm install && pnpm build && pnpm run generate:deploy-config -- --platform=vercel`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install --frozen-lockfile`
   - **Environment variables:** `CONTENT_REPO`、`CONTENT_GITHUB_TOKEN`、`FORCE_CONTENT_SYNC=true`、`PUBLIC_SITE_URL`、`PUBLIC_SEARCH_ENABLED=true`、`PUBLIC_SEARCH_PROVIDER=pagefind`、(可选)Giscus/Umami/Music
3. Deploy

## 文件说明

- `vercel.json`: headers(CSP 动态生成)+ redirects(由 generate-redirects 写入)

## Deploy Hook

Vercel → Settings → Git → Deploy Hook 创建 URL,配置到 content 仓库 `MAIN_SITE_DEPLOY_HOOK_URL` secret。
```

- [ ] **Step 6: 创建 Vercel vercel.json 模板**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "<GENERATED_BY_BUILD>" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/admin/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; font-src 'self' https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https://api.github.com https://unpkg.com https://cdn.jsdelivr.net; frame-src 'self' https://unpkg.com; manifest-src 'self';"
        }
      ]
    }
  ]
}
```

- [ ] **Step 7: Commit**

```bash
git add deploy/cloudflare/ deploy/vercel/ src/scripts/generate-deploy-config.ts
git commit -m "feat: add Cloudflare and Vercel deploy configs with dynamic CSP generation"
```

---

### Task 13: Netlify + GitHub Pages 部署配置

**Files:**

- Create: `deploy/netlify/README.md`
- Create: `deploy/netlify/netlify.toml`
- Create: `deploy/netlify/_redirects`
- Create: `deploy/github-pages/README.md`
- Create: `deploy/github-pages/.github/workflows/deploy.yml`

**Interfaces:**

- Consumes: `buildCsp()`、`generate-redirects.ts`
- Produces: Netlify 配置模板 + GitHub Pages deploy workflow

- [ ] **Step 1: 创建 Netlify README.md**

```markdown
# Netlify 部署

## 快速开始

1. Netlify Dashboard → Add new site → Import 主仓
2. 构建配置:
   - **Build command:** `pnpm install && pnpm build && pnpm run generate:deploy-config -- --platform=netlify`
   - **Publish directory:** `dist`
   - **Environment variables:** `NODE_VERSION=22`、`CONTENT_REPO`、`CONTENT_GITHUB_TOKEN`、`FORCE_CONTENT_SYNC=true`、`PUBLIC_SITE_URL`、`PUBLIC_SEARCH_ENABLED=true`、`PUBLIC_SEARCH_PROVIDER=pagefind`、(可选)Giscus/Umami/Music
3. Deploy

## 文件说明

- `netlify.toml`: 构建配置 + 静态安全 headers(CSP 由 generate-deploy-config 动态写入 dist/_headers)
- `_redirects`: 301 规则(由 generate-redirects 写入 dist/_redirects)

## Deploy Hook

Netlify → Site settings → Build hooks 创建 URL,配置到 content 仓库 `MAIN_SITE_DEPLOY_HOOK_URL` secret。
```

- [ ] **Step 2: 创建 Netlify netlify.toml**

```toml
# deploy/netlify/netlify.toml — 选定 Netlify 后复制到根目录
[build]
  command = "pnpm install && pnpm build && pnpm run generate:deploy-config -- --platform=netlify"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/admin/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; font-src 'self' https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https://api.github.com https://unpkg.com https://cdn.jsdelivr.net; frame-src 'self' https://unpkg.com; manifest-src 'self';"

[[redirects]]
  from = "/*"
  to = "/404/"
  status = 404
```

- [ ] **Step 3: 创建 Netlify \_redirects 模板**

```
# deploy/netlify/_redirects — 模板参考
# 部署时由 generate:redirects 从 redirects.json 动态生成到 dist/_redirects
# 格式: /old-url/ /new-url/ 301
```

- [ ] **Step 4: 创建 GitHub Pages README.md**

```markdown
# GitHub Pages 部署

## 限制

GitHub Pages **不支持自定义 HTTP headers**(CSP/HSTS 等)。CSP 通过 `<meta http-equiv="Content-Security-Policy">` 注入(BaseHead.astro 读取 `buildCsp()`)。重定向通过**静态 redirect HTML** 实现(`generate-redirects` 生成)。不支持原生预览部署。

## 快速开始

1. 复制 `deploy/github-pages/.github/workflows/deploy.yml` 到 `.github/workflows/`
2. 仓库 Settings → Pages → Source → GitHub Actions
3. 配置 Secrets: `CONTENT_REPO`、`CONTENT_GITHUB_TOKEN`、`PUBLIC_SITE_URL`(可选 Giscus/Umami/Music)
4. Push 到 main 触发部署

## CSP Fallback

`DEPLOY_PLATFORM=github-pages` 时,BaseHead 注入 `<meta http-equiv="Content-Security-Policy" content={buildCsp(env)} />`。其他平台走 HTTP header,不注入 meta(避免重复叠加)。

## Sveltia CMS OAuth

GitHub Pages 不支持同栈 OAuth 代理,参考 `deploy/oauth-proxy/` 部署独立代理。MVP 个人站用 Access Token 无需部署。
```

- [ ] **Step 5: 创建 GitHub Pages deploy.yml**

```yaml
# deploy/github-pages/.github/workflows/deploy.yml — 复制到 .github/workflows/ 使用
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9.15.5
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: lycheeverse/lychee-action@v2
        with:
          install: true
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          CONTENT_REPO: ${{ secrets.CONTENT_REPO }}
          CONTENT_GITHUB_TOKEN: ${{ secrets.CONTENT_GITHUB_TOKEN }}
          FORCE_CONTENT_SYNC: 'true'
          PUBLIC_SEARCH_ENABLED: 'true'
          PUBLIC_SEARCH_PROVIDER: 'pagefind'
          PUBLIC_SITE_URL: ${{ secrets.PUBLIC_SITE_URL || 'https://example.github.io/object920' }}
          DEPLOY_PLATFORM: 'github-pages'
      - run: pnpm run generate:redirects
        env:
          DEPLOY_PLATFORM: 'github-pages'
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 6: Commit**

```bash
git add deploy/netlify/ deploy/github-pages/
git commit -m "feat: add Netlify and GitHub Pages deploy configs with meta CSP fallback"
```

---

### Task 14: OAuth 代理参考实现

**Files:**

- Create: `deploy/oauth-proxy/cloudflare-worker/README.md`
- Create: `deploy/oauth-proxy/cloudflare-worker/worker.js`
- Create: `deploy/oauth-proxy/vercel-edge/README.md`
- Create: `deploy/oauth-proxy/vercel-edge/api/auth.js`

**Interfaces:**

- Consumes: GitHub OAuth App(client ID/secret)
- Produces: Sveltia CMS OAuth 代理参考代码(多用户可选部署)

- [ ] **Step 1: 创建 Cloudflare Worker README**

```markdown
# Sveltia CMS OAuth Proxy (Cloudflare Worker)

MVP 个人站用 Access Token 无需部署此代理。多用户编辑时部署。

## 部署

1. 安装 Wrangler: `npm install -g wrangler`
2. 创建 GitHub OAuth App(Settings → Developer settings → OAuth Apps → New OAuth App,callback URL: `https://your-worker.workers.dev/callback`)
3. 复制 `worker.js` 到新 Worker 项目
4. 配置 Worker Secrets: `wrangler secret put GITHUB_CLIENT_ID`、`wrangler secret put GITHUB_CLIENT_SECRET`
5. `public/admin/config.yml` 中设置 `base_url: https://your-worker.workers.dev`
6. `wrangler deploy`

## 安全

`GITHUB_CLIENT_SECRET` 只在 Worker 端,不进主仓。建议用 fine-grained PAT 限制 scope。
```

- [ ] **Step 2: 创建 Cloudflare Worker 代码**

```js
// deploy/oauth-proxy/cloudflare-worker/worker.js
// Sveltia CMS OAuth proxy — reference for Cloudflare Worker
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    if (url.pathname === '/auth') {
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: `${url.origin}/callback`,
        scope: 'repo',
        state: crypto.randomUUID(),
      });
      return Response.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`, 302);
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) return new Response('Missing code', { status: 400 });
      const resp = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    return new Response('Sveltia CMS OAuth Proxy', { status: 200 });
  },
};
```

- [ ] **Step 3: 创建 Vercel Edge README**

```markdown
# Sveltia CMS OAuth Proxy (Vercel Edge Function)

同 Cloudflare Worker 版本。MVP 个人站用 Access Token 无需部署。

## 部署

1. 创建 GitHub OAuth App(callback URL: `https://your-project.vercel.app/api/auth/callback`)
2. 复制 `api/auth.js` 到 Vercel 项目 `api/` 目录
3. 配置 Vercel Environment Variables: `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`
4. `public/admin/config.yml` 中设置 `base_url: https://your-project.vercel.app`
5. Deploy
```

- [ ] **Step 4: 创建 Vercel Edge 代码**

```js
// deploy/oauth-proxy/vercel-edge/api/auth.js
// Sveltia CMS OAuth proxy — reference for Vercel Edge Function
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, cors);
    res.end();
    return;
  }
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname === '/api/auth') {
    const origin = new URL(req.url, `https://${req.headers.host}`).origin;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: `${origin}/api/auth/callback`,
      scope: 'repo',
      state: crypto.randomUUID(),
    });
    res.writeHead(302, { Location: `${GITHUB_AUTHORIZE_URL}?${params}` });
    res.end();
    return;
  }

  if (pathname === '/api/auth/callback') {
    const code = searchParams.get('code');
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing code' }));
      return;
    }
    const resp = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await resp.json();
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify(data));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}
```

- [ ] **Step 5: Commit**

```bash
git add deploy/oauth-proxy/
git commit -m "feat: add Sveltia CMS OAuth proxy reference implementations"
```

---

### Task 15: README.md

**Files:**

- Create: `README.md`

**Interfaces:**

- Consumes: 附录 D 接手者必读清单的所有条目
- Produces: 项目接手指南

- [ ] **Step 1: 创建 README.md**

````markdown
# Object920

个人网站,基于 Astro 7 纯静态 SSG,支持中英俄日四语 i18n、双语渐进文章、可插拔集成(Giscus/Umami/搜索/音乐/开往)。

## 快速开始

### 前置要求

- Node.js >= 22.12 < 23
- pnpm 9.15.5(corepack 自动启用)
- Git

### 安装

```bash
git clone <main-repo-url> object920
cd object920
cp .env.example .env  # 编辑 .env 填 CONTENT_REPO 等本地值
pnpm install
pnpm dev
```

首次 `pnpm dev` 自动触发 `predev` 钩子拉取 content 仓库到 `src/content/`(仅首次 clone,之后不自动 pull)。

### 本地开发

1. 复制 `.env.example` 为 `.env`,至少填 `CONTENT_REPO`
2. `pnpm install`
3. `pnpm dev` — 自动拉取 content,启动开发服务器
4. Sveltia CMS 本地编辑:Chrome/Edge 打开 `http://localhost:4321/admin/index.html` → "Work with Local Repository" → 选 `src/content/` 目录
5. Giscus/Umami 未启用时评论与分析不显示是正常的

### 内容更新

- `pnpm pull:content` — 手动拉取最新 content(已有时 fetch + merge --ff-only;有未提交修改时报错提示 commit/stash)
- 首次 `pnpm dev` 后不自动 pull(保护 Sveltia 本地未提交修改)

## 环境变量

见 `.env.example`。关键变量:

| 变量                    | 说明                                                   |
| ----------------------- | ------------------------------------------------------ |
| `CONTENT_REPO`          | content 仓库地址(owner/repo)                           |
| `CONTENT_GITHUB_TOKEN`  | CI 用,read-only fine-grained PAT(private content repo) |
| `FORCE_CONTENT_SYNC`    | 仅 CI 注入 `true`;本地 build 默认 `false`              |
| `PUBLIC_SITE_URL`       | 站点 URL(canonical/OG/sitemap)                         |
| `PUBLIC_SEARCH_ENABLED` | 搜索开关                                               |
| `PUBLIC_GISCUS_ENABLED` | 评论开关                                               |
| `PUBLIC_UMAMI_ENABLED`  | 分析开关                                               |
| `PUBLIC_MUSIC_ENABLED`  | 背景音乐开关                                           |

## 构建与部署

### 本地构建

```bash
pnpm build
```

执行链:prebuild(pull:content → build-meta → check:datasheets)→ astro build → postbuild(build-meta --dist → search:index → generate-og → generate:redirects → check:links → check:sitemap → check:rss)

### 生产构建

```bash
pnpm install && pnpm build
```

### CI

```bash
pnpm ci  # check → lint → test → build(含 prebuild + postbuild)
```

### 部署平台

参考 `deploy/` 目录各平台 README:

- `deploy/cloudflare/` — Cloudflare Pages(推荐 MVP)
- `deploy/vercel/` — Vercel
- `deploy/netlify/` — Netlify
- `deploy/github-pages/` — GitHub Pages(功能最少,无自定义 headers)

选定平台后复制对应配置到根目录,在平台面板配置环境变量。

### Sveltia CMS 触发重建

content 仓库 push → GitHub Actions → POST Deploy Hook → 主站重建(pnpm install && pnpm build)。

## 项目结构

```
src/
├── content/          # 构建时 git clone 拉取(不入主仓,在 .gitignore)
├── pages/            # 路由([locale]/ 动态路由 + rss/ + robots.txt + sitemap.xml + 404)
├── components/       # 按领域分目录(article/project/collection/...)
├── components/integrations/  # 可插拔集成(analytics/search/music/travellings/comments)
├── i18n/             # 四语 UI 字典 + t() 翻译函数
├── lib/              # 纯函数(content/i18n/seo/og/image/redirects)
├── scripts/          # 构建前后脚本(pull-content/build-meta/search-index/generate-og/...)
├── styles/           # tokens.css(真相源)/ global.css / animations.css / prose.css
├── config/           # 站点配置(site.ts/music.ts/static-pages.ts)
└── content.config.ts # Astro Content Layer schema 定义(主仓唯一真相源)
deploy/               # 平台适配目录(cloudflare/vercel/netlify/github-pages/oauth-proxy)
public/               # 静态资源(admin/ fonts/ images/)
```

## i18n

- UI 四语(zh/en/ru/ja),MVP zh/en 全填,ru/ja 空壳走 zh fallback
- 文章双语渐进,未翻译走占位页跳转中文版
- 新增字典 key 先加到 `src/i18n/ui/zh.ts`(真相源)再同步其他

## 测试

- `pnpm ci` 跑全链:check → lint → test → build → postbuild 校验
- 新增 `src/lib/` 函数必须同步加单测(`src/lib/__tests__/`)
- CI 失败阻断合并

## 常见问题

1. **内容为空**:content 没拉取 → 首次 `pnpm dev` 自动 clone;之后手动 `pnpm pull:content`
2. **Sveltia 登录失败**:本地开发需 Chromium 浏览器并选 "Work with Local Repository";生产用 Access Token 或部署 OAuth 代理 → `deploy/oauth-proxy/`
3. **搜索 dev 不工作**:Pagefind 索引构建后才生成,dev 模式不可用是预期
4. **OG 图没生成**:增量依据是内容 hash + OG_TEMPLATE_VERSION,缓存在 `.cache/og-cache.json`;删除 `.cache/og-cache.json` 与 `dist/og/` 后重建
5. **OG 图报错(缺原生模块)**:`@resvg/resvg-js` 在 Alpine musl 等容器可能 fallback 编译失败;临时从 `postbuild` 移除 `generate-og`,OG 降级为默认图
6. **content 拉取失败(私有仓库)**:需配 `CONTENT_GITHUB_TOKEN`(独立 PAT,read-only);走 credential helper 不拼 URL
7. **fork PR 构建失败**:预期行为——fork PR 不注入 `CONTENT_GITHUB_TOKEN`,CI 只跑 code/lint/test

## 授权

MIT
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add project README with handoff guide and common issues"
```

---

### Task 16: CONTRIBUTING.md

**Files:**

- Create: `CONTRIBUTING.md`

**Interfaces:**

- Consumes: spec 双语配对/datasheet/图片规范/代码风格纪律
- Produces: 内容/代码贡献流程文档

- [ ] **Step 1: 创建 CONTRIBUTING.md**

````markdown
# 贡献指南

## 内容贡献

### 通过 Sveltia CMS 编辑

1. 打开 `/admin/`(本地:Chrome/Edge 选 "Work with Local Repository" → `src/content/`;生产:用 Access Token 或 OAuth 代理登录)
2. 编辑文章/工程/番剧/术曲/友链
3. 提交直接推 content 仓库 main 分支
4. content 仓库 GitHub Actions 校验通过后触发主站重建
5. **主仓无需任何提交**(非 submodule,无指针更新)

### 双语配对

zh/en 两版文章必须填同样的 `translationKey`(opaque identifier,`z.string().trim().min(1)`)。

- 有 `translationKey`:两语言版本共享该 key,`getLocalizedEntryPath()` 按 key 查目标 slug(允许不同 slug)
- 无 `translationKey`:用 `single:${entry.id}` 合成组,不参与跨语言配对
- 未翻译语言走占位页(显示已有语言版本的跳转链接,`noindex, follow`)

### URL Migration(修改 _slug)

**修改 `_slug` = 修改 URL**,必须同一 content commit 更新 `redirects.json`:

1. 在 Sveltia 中修改文章的 `_slug` 字段
2. 在同一 CMS 会话中编辑 `redirects.json` file collection,添加 `"旧URL/": "新URL/"` 映射
3. 提交(同一个 content commit)
4. content CI 校验 redirect manifest 通过后才触发重建
5. **普通内容修改(title/正文)不涉及 redirect**

`redirects.json` 格式:

```json
{
  "/en/articles/old-slug/": "/en/articles/new-slug/",
  "/zh/projects/old/": "/zh/projects/new/"
}
```

### 数据手册(Datasheet)上传

1. PDF 文件传到 **assets 仓库**(独立于 content 仓库,public)
2. Sveltia 中只填 `filename`(不含路径)+ `mirror`(jsdelivr/raw)+ 必要时 `releaseTag`
3. 历史资料显式填 `ref`(tag/commit,不用 `@main`)
4. 构建时 `check-datasheets` 校验可达(至少一镜像可用通过)

### 图片规范

- **folder collection(文章/工程)**:entry-relative media——图片与 `index.md` 同目录,Sveltia 上传后 frontmatter 写 `./cover.webp`,经 Astro 图片管线优化(AVIF/WebP/srcset)
- **JSON collection(番剧/术曲/友链)**:封面/头像只填远程 URL,不存本地图片
- **alt 必填且非空**(`trim().min(1)`);`alt=""` 仅限正文装饰性图片

## 代码贡献

### 开发流程

1. Fork 主仓,创建 feature branch
2. `pnpm install && pnpm dev`
3. 编码 + 同步加单测(`src/lib/` 新函数必须有 `src/lib/__tests__/` 对应测试)
4. `pnpm ci` 全链通过(check → lint → test → build)
5. 提交 PR

### 风格纪律

- **零框架运行时**:禁止引入 React/Vue/Solid,只允许 vanilla client enhancement
- **Git 操作只在 `src/scripts/`**:`src/lib/`、`src/components/` 禁止 git 命令
- **Token 引用**:scoped CSS 用 `var(--*)` 引用 tokens.css,不硬编码维度
- **`trailingSlash: 'always'`**:全站 URL 带尾斜杠
- **页面文件 ≤ 60 行**:超了抽组件
- **vanilla enhancement ≤ 80 行**(软阈值):超了考虑外置
- **领域叶子组件禁止互相 import**:跨领域复用走 `common/`
- **可插拔 Integration 隔离**:统一在 `src/components/integrations/`,环境变量开关,单向依赖
- **不引入 incremental build / Runtime Routing**:保持完整 build + 静态架构

### 测试纪律

- 单测只测纯函数(`src/lib/`),不测组件渲染
- 测试与代码同 PR:新增/修改 `src/lib/` 函数必须同步更新测试
- 测试不依赖网络:datasheet 校验测试用 mock fetch
- CI 失败阻断合并

### Commit 信息

`feat:` 新功能 | `fix:` 修复 | `docs:` 文档 | `ci:` CI 配置 | `refactor:` 重构 | `test:` 测试 | `chore:` 杂项

### 环境变量命名

- `PUBLIC_*` = 客户端可见(允许进生产 HTML)
- 非 `PUBLIC_*` = 构建/服务端专用(绝不加 `PUBLIC_` 前缀)
````

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributing guide with content and code contribution flows"
```

---

## Self-Review

**1. Spec coverage:**

- **7.9 OG 图自动生成** → Task 3 (og.ts:satori 元素树/字体加载/hash) + Task 4 (generate-og.ts:增量缓存/draft 跳过/降级默认图/resvg fallback) ✓
  - 输出 `dist/og/{collection}-{locale}-{slug}.png` ✓
  - 增量依据 content hash + OG_TEMPLATE_VERSION + OG_FONT_VERSION ✓
  - 缓存放 `.cache/og-cache.json` ✓
  - 字体 Inter + NotoSansSC subset,按 locale 选择 ✓
  - CJK 字符无字体 → warn 降级 ✓
  - resvg 原生绑定风险 fallback(warn + exit 0)✓
  - 失败策略:warn + 默认图 + exit 0,不阻断 ✓
  - 默认 OG 图 `public/images/og-default.png` 入仓 ✓
- **7.12 构建管线总览** → Task 10 (package.json scripts 完整链) ✓
  - prebuild: pull:content → build-meta → check-datasheets ✓
  - postbuild: build-meta --dist → search:index → generate-og → generate:redirects → check:links → check:sitemap → check:rss ✓
  - 构建元数据:mainCommit/contentCommit/contentUpdatedAt/buildTime,nodeVersion 仅 debug ✓
  - dev 容错:build-meta 缺失降级 unknown ✓
- **7.13 系统数据流图与依赖矩阵** → Task 1-10 覆盖所有构建依赖 ✓
- **8.1 兼容性目标(纯静态 dist)** → Task 12-13 deploy configs ✓
- **8.2 平台兼容性矩阵** → Task 12 (Cloudflare/Vercel) + Task 13 (Netlify/GitHub Pages) ✓
- **8.4 平台适配目录** → Task 12-14 deploy/{platform}/ 隔离 ✓
- **8.5 自定义 HTTP headers(CSP)** → Task 5 (buildCsp 纯函数) + Task 12 (generate-deploy-config.ts 写入) ✓
  - CSP 按启用功能动态生成 ✓
  - media-src 含音频 CDN(音乐启用时)✓
  - Umami 域从 PUBLIC_UMAMI_SCRIPT_URL 解析 ✓
  - buildCsp() 纯函数,写入在 deploy script ✓
  - `<meta http-equiv>` 仅 GitHub Pages fallback ✓
  - /admin/ 独立 CSP(含 unpkg.com/cdn.jsdelivr.net)✓
  - 主站 CSP 不含 unpkg.com ✓(Task 5 测试验证)
  - 基础 hardening: object-src 'none' / base-uri 'self' / frame-ancestors ✓
  - 暂不启用 Astro 内置 CSP ✓(Global Constraints 声明)
- **8.6 重定向与回退** → Task 8 (generate-redirects.ts + redirects.ts) ✓
  - redirects.json content repo 根,pull 后 src/content/redirects.json ✓
  - Cloudflare/Netlify _redirects + Vercel vercel.json + GitHub Pages 静态 HTML ✓
  - validateRedirectManifest + validateGeneratedRoutes 两阶段 ✓
  - 静态 redirect HTML:meta refresh + JS + canonical ✓
- **8.7 Sveltia CMS 触发重建** → Task 15 README 说明 ✓
- **8.8 预览部署** → Task 11 CI artifact (dist-preview,internal PR only) ✓
- **8.9 构建资源与超时** → Task 12-13 README 说明(以平台官方为准)✓
- **8.10 域名与 HTTPS** → Task 12-13 README 涵盖 ✓
- **9.2 构建时错误处理** → OG warn 降级(Task 4)+ search fail = CI fail(Task 2)+ build-meta fallback unknown(Task 1)✓
- **9.7 测试策略** → Task 1-8 每个 testable 函数都有单测;check:links/sitemap/rss 在 postbuild ✓
- **9.8 CI 策略** → Task 11 (ci.yml) ✓
  - check/lint/test 无 secret ✓
  - build 仅 trusted(注入 CONTENT_GITHUB_TOKEN)✓
  - FORCE_CONTENT_SYNC=true 只在 CI ✓
  - push 只监听 main ✓
  - fork 判断先检查 event_name ✓
  - lychee 通过 GitHub Action 安装 ✓
  - PUBLIC_SEARCH_ENABLED/PROVIDER 显式注入 ✓
  - artifact internal PR only ✓
  - frozen-lockfile ✓
- **6.9 RSS per locale** → Task 7 (rss/[locale].xml.ts,过滤 draft,ru/ja 空 feed)✓
- **6.10 sitemap** → Task 6 (buildSitemapEntries + sitemap.xml.ts) ✓
  - 自定义生成,统一数据源 ✓
  - 排除 noindex/placeholder/404/admin/根路径 ✓
  - hreflang 标准码 zh-CN + x-default ✓
  - lastmod = updatedDate ?? pubDate,禁止 buildTime ✓
  - xmlns + xmlns:xhtml ✓
- **robots.txt** → Task 7 (声明 Sitemap)✓
- **附录 B reviewer 检查清单** — 关键项:
  - OG 图输出 dist/og/ ✓ | 文件名含 collection-locale-slug ✓ | 增量 content hash + template + font version ✓
  - buildCsp() 纯函数 + 写入在 deploy script ✓ | CSP 不写死域 ✓ | Umami 从 URL 解析 ✓ | 主站不含 unpkg ✓ | 不叠加 Header+Meta ✓
  - sitemap 自定义 + 统一数据源 ✓ | 排除规则 ✓ | hreflang 标准码 ✓
  - robots.txt 声明 Sitemap ✓ | RSS 每 locale + 过滤 draft ✓
  - redirects.json 唯一真相源 ✓ | generate-redirects.ts ✓ | 校验两阶段 ✓ | GitHub Pages 静态 HTML ✓
  - CI secret 边界 ✓ | checkout 不含 submodules ✓ | postbuild 链三者一致 ✓
  - build-meta.json 仅 4 字段 + debug 追加 ✓ | deploy/ 隔离 ✓ | 生产命令 pnpm install && pnpm build ✓
- **附录 D 接手者必读** → Task 15 README 含所有条目 ✓ | Task 16 CONTRIBUTING 含双语配对/datasheet/图片规范 ✓

**2. Placeholder scan:** 无 TBD/TODO/"implement later"/"add error handling"/"similar to Task N"。所有步骤含实际代码。字体文件(Task 3 Step 2)和默认 OG 图(Task 4 Step 1)为二进制文件,已在步骤中说明来源与要求,非占位。

**3. Type consistency:**

- `collectBuildMeta(env, gitRunner)` 签名在 Task 1 定义并测试,一致
- `resolveSearchAction(env)` 返回 `'skip' | 'run-pagefind'`,一致
- `computeOgHash(title, description, locale, collection, slug)` → string,Task 3 定义 Task 4 调用一致
- `loadOgFonts(locale)` → `OgFont[]`,Task 3 定义 Task 4 调用一致
- `buildOgElementTree(info: OgEntryInfo)` → elementTree,Task 3 定义 Task 4 调用一致
- `renderOgImage(elementTree, fonts)` → Buffer,Task 3 定义 Task 4 调用一致
- `buildCsp(env, opts)` → string,Task 5 定义,Task 12 `generate-deploy-config.ts` 调用 `buildCsp(process.env, { supportsHeaders: true })` 一致
- `buildSitemapEntries(pages, baseUrl)` → `SitemapEntry[]`,Task 6 定义,sitemap.xml.ts 调用一致
- `renderSitemapXml(entries)` → string,Task 6 定义,sitemap.xml.ts 调用一致
- `validateRedirectManifest(redirects)` / `validateGeneratedRoutes(redirects, routes)`,Task 8 redirects.ts 定义,generate-redirects.ts 调用一致
- `RedirectMap = Record<string, string>`,Task 8 定义,generate-redirects.ts 调用一致
- `SitemapPage`/`SitemapAlternate`/`SitemapEntry` 类型,Task 6 定义,sitemap.xml.ts 使用一致

**Gaps:** 无遗漏。Plan 1-4 覆盖 spec 基础架构/内容管线/核心页面/可插拔集成,Plan 5 覆盖构建管线/CI/部署/SEO 端点/文档。
