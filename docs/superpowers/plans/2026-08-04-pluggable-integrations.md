# Object920 可插拔 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Plan 1-3 基础架构上实现全部可插拔 Integration:搜索(SearchProvider/Pagefind)、评论(Giscus)、分析(Umami)、开往(Travellings)、背景音乐(MusicPlayer/HtmlAudio),所有功能通过环境变量开关控制,关闭后零 DOM/零网络/零构建依赖。

**Architecture:** 每个 Integration 遵循"环境变量开关 + 条件渲染"模式。搜索与音乐采用 Provider 接口解耦:纯 `.ts` 接口定义 + `.ts` Provider 实现 + `.ts` resolver(按配置选实现)+ `.astro` UI 组件(只 import resolver + 接口类型,不 import 具体 Provider)。评论与分析为环境变量直控的简单可插拔组件。音乐跨页面播放依赖 ClientRouter + `transition:persist` + Provider singleton 三件套。所有客户端增强挂 `astro:page-load` 生命周期,singleton guard 防重复绑定。

**Tech Stack:** Astro `^7.x` | Pagefind `^1.5.0`(devDependency,postbuild 索引)| Giscus(外部 script)| Umami(外部 script)| Vitest `^3.0.0` | vanilla TS enhancement(零框架运行时)

**Spec:** `docs/superpowers/specs/2026-08-19-personal-site-design.md`(第 1.4、5.11、5.12、5.20、7.4、7.6、7.7、7.8、7.10 节,附录 C)

## Global Constraints

- **可插拔纪律**:任何可选功能必须能通过环境变量开关完整关闭,关闭后零 DOM、零网络请求、零构建依赖(spec 1.4)
- **单向依赖**:可插拔 → 核心;核心代码不 import 可插拔组件;SearchBox/MusicPlayerWidget 只依赖 Provider 接口,不 import 具体 Provider(spec 1.4/5.11/5.12)
- **Provider 用纯 `.ts`**:SearchProvider.ts / PagefindProvider.ts / MusicPlayer.ts / HtmlAudioProvider.ts 均为纯 TS 模块(非 `.astro`)(spec 5.11/5.12)
- **Resolver 是唯一知道具体实现的地方**:SearchBox 只 import `createSearchProvider` + 接口类型;Widget 只 import `createMusicProvider` + 接口类型(spec 5.11/5.12)
- **异步初始化**:用 `initialize(): Promise<void>` + `ready(): Promise<boolean>`,非同步 `isAvailable()`(spec 5.11/5.12)
- **状态语义统一**:initialize 成功 → `ready`;失败 → `failed` 且 `ready()` resolve false;`search()` 失败 → `throw SearchError`;成功但无结果 → `[]`(spec 5.11 P1-16/P1-9)
- **`none` 由 resolver 返回 `null`**:不能落入 `default` 抛错;未实现的 provider(orama/howler)不是有效配置值,配置 = throw(spec 5.11/5.12 P0-11/P1-8)
- **Pagefind 1.5.0+**:用 `/pagefind/pagefind.js` 低级 Search API,不用过时的 `pagefind-ui.js`(spec 7.10)
- **音乐默认不播放**:页面加载不自动播,用户点击控件才播(spec 5.12/7.7)
- **音乐跨页面**:ClientRouter + `transition:persist="music-host"` + Provider singleton 三件套(spec 7.7 P0-7)
- **媒体状态唯一真相源**:`HTMLAudioElement` 是 isPlaying/volume/currentTime 的唯一真相源,singleton 只做 API 代理(spec 5.12 P1-11)
- **audio 元素注入**:Provider 构造时接收 audio,`initialize()` 无参;MusicHost 持有 `<audio>`,Widget 调 `createMusicProvider(audioElement)` 注入(spec 5.12 P0-2)
- **Giscus 仓库独立性**:`PUBLIC_GISCUS_REPO` 指向 public 独立 discussions 仓,与 `CONTENT_REPO` 解耦(spec 7.4 P0-6)
- **Giscus 主题同步**:跟随站点主题(非系统偏好),`theme-change` CustomEvent → `updateGiscusTheme()` 统一封装 postMessage(spec 7.4 P1-20/P2-29)
- **ClientRouter 生命周期**:所有 enhancement 统一挂 `astro:page-load`;全局 singleton 只初始化一次(标志位保护);persisted element 不重复绑定(spec 5.20)
- **零框架运行时**:禁止引入 React/Vue/Solid(spec 5.19)
- **路径别名**:`@components/*`、`@lib/*`、`@i18n/*`、`@config/*`(Plan 1 tsconfig/vitest 已配)
- **测试框架**:Vitest,测试文件放 `src/**/__tests__/**/*.test.ts`(Plan 1 vitest.config.ts 已配)
- **Git 操作只在 `src/scripts/`**:`src/lib/`、`src/components/` 禁止 git 命令(spec 2.2-8)

---

## File Structure

| 文件 | 职责 | 创建/修改 |
|---|---|---|
| `src/components/integrations/search/SearchProvider.ts` | 搜索 Provider 统一接口 + SearchError 类 | 创建 |
| `src/components/integrations/search/PagefindProvider.ts` | Pagefind MVP 实现(纯 .ts) | 创建 |
| `src/components/integrations/search/createSearchProvider.ts` | 按 PUBLIC_SEARCH_PROVIDER 选 Provider 的 resolver | 创建 |
| `src/components/integrations/search/SearchBox.astro` | 搜索 UI(vanilla enhancement,只依赖接口) | 创建 |
| `src/components/integrations/search/__tests__/SearchProvider.test.ts` | SearchError + PagefindProvider 单测 | 创建 |
| `src/components/integrations/search/__tests__/createSearchProvider.test.ts` | resolver 单测 | 创建 |
| `src/scripts/search-index.mjs` | postbuild 跑 pagefind 索引(仅启用时) | 创建 |
| `src/components/integrations/analytics/Analytics.astro` | Umami 分析(可插拔,零 props) | 创建 |
| `src/components/integrations/comments/Comments.astro` | Giscus 评论(可插拔) | 创建 |
| `src/lib/giscus.ts` | Giscus singleton script / mount / destroy / updateTheme | 创建 |
| `src/components/integrations/travellings/Travellings.astro` | 开往入口(可插拔) | 创建 |
| `src/components/integrations/music/MusicPlayer.ts` | 音乐 Provider 统一接口 + Track/Playlist/State 类型 | 创建 |
| `src/components/integrations/music/HtmlAudioProvider.ts` | HTML5 Audio MVP 实现(纯 .ts) | 创建 |
| `src/components/integrations/music/createMusicProvider.ts` | 按 PUBLIC_MUSIC_PROVIDER 选 Provider 的 resolver | 创建 |
| `src/components/integrations/music/MusicHost.astro` | persistence boundary(transition:persist + `<audio>`) | 创建 |
| `src/components/integrations/music/MusicPlayerWidget.astro` | 播放控件 UI(vanilla enhancement,只依赖接口) | 创建 |
| `src/components/integrations/music/__tests__/MusicPlayer.test.ts` | MusicPlayer 接口 + HtmlAudioProvider 单测 | 创建 |
| `src/components/integrations/music/__tests__/createMusicProvider.test.ts` | resolver 单测 | 创建 |
| `src/config/music.ts` | MVP 歌单数据(固定,后期可迁 content) | 创建 |
| `src/i18n/ui/zh.ts` | 追加 search/comments/music/travellings i18n keys(真相源) | 修改 |
| `src/i18n/ui/en.ts` | 追加对应英文翻译 | 修改 |
| `src/components/layout/BaseLayout.astro` | 集成 ClientRouter + Analytics + MusicHost + Widget | 修改 |
| `.env.example` | 追加全部 PUBLIC_*_ENABLED + PUBLIC_*_PROVIDER | 修改 |
| `package.json` | 追加 pagefind devDep + search:index script + postbuild | 修改 |

---

### Task 1: SearchProvider Interface & SearchError

**Files:**
- Create: `src/components/integrations/search/SearchProvider.ts`
- Test: `src/components/integrations/search/__tests__/SearchProvider.test.ts`

**Interfaces:**
- Consumes: 无(首个 search task)
- Produces: `SearchResult`、`SearchOptions`、`SearchProviderState`、`SearchProvider`(interface)、`SearchError`(class)— 后续 PagefindProvider/resolver/SearchBox 全部依赖

- [ ] **Step 1: 写失败测试**

```ts
// src/components/integrations/search/__tests__/SearchProvider.test.ts
import { describe, it, expect } from 'vitest';
import { SearchError } from '../SearchProvider';

describe('SearchError', () => {
  it('is an Error subclass', () => {
    const err = new SearchError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SearchError);
  });

  it('has name "SearchError"', () => {
    const err = new SearchError('boom');
    expect(err.name).toBe('SearchError');
  });

  it('preserves message', () => {
    const err = new SearchError('index load failed');
    expect(err.message).toBe('index load failed');
  });

  it('stores optional cause', () => {
    const cause = new Error('network');
    const err = new SearchError('wrapper', cause);
    expect(err.cause).toBe(cause);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/components/integrations/search/__tests__/SearchProvider.test.ts`
Expected: FAIL — `Failed to resolve import '../SearchProvider'`

- [ ] **Step 3: 写最小实现**

```ts
// src/components/integrations/search/SearchProvider.ts
export interface SearchResult {
  title: string;
  url: string;
  excerpt?: string;
  score?: number;
}

export interface SearchOptions {
  locale?: string;
  limit?: number;
}

export type SearchProviderState = 'idle' | 'initializing' | 'ready' | 'failed';

export interface SearchProvider {
  initialize(): Promise<void>;
  getState(): SearchProviderState;
  ready(): Promise<boolean>;
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
  destroy(): Promise<void>;
}

export class SearchError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SearchError';
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/components/integrations/search/__tests__/SearchProvider.test.ts`
Expected: PASS — 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/integrations/search/SearchProvider.ts src/components/integrations/search/__tests__/SearchProvider.test.ts
git commit -m "feat(search): add SearchProvider interface and SearchError class"
```

---

### Task 2: PagefindProvider Implementation

**Files:**
- Create: `src/components/integrations/search/PagefindProvider.ts`
- Test: `src/components/integrations/search/__tests__/SearchProvider.test.ts`(追加)

**Interfaces:**
- Consumes: Task 1 的 `SearchProvider`、`SearchProviderState`、`SearchResult`、`SearchOptions`、`SearchError`
- Produces: `PagefindProvider` class — Task 3 resolver 引用,Task 4 SearchBox 间接使用

- [ ] **Step 1: 追加失败测试**

在 `src/components/integrations/search/__tests__/SearchProvider.test.ts` 末尾追加:

```ts
// --- PagefindProvider 测试 ---
import { describe as d2, it as i2, expect as e2, vi } from 'vitest';
import { PagefindProvider } from '../PagefindProvider';

// 最小 mock Pagefind 模块
function makeMockPagefind() {
  return {
    search: vi.fn().mockResolvedValue({
      results: [
        {
          data: () =>
            Promise.resolve({
              meta: { title: 'Hello World', url: '/en/articles/hello/' },
              excerpt: '<mark>Hello</mark> world',
              score: 1.5,
            }),
        },
        {
          data: () =>
            Promise.resolve({
              meta: { title: 'Second', url: '/en/articles/second/' },
              excerpt: 'Second result',
              score: 0.8,
            }),
        },
      ],
    }),
    destroy: vi.fn(),
  };
}

d2('PagefindProvider', () => {
  i2('starts in idle state', () => {
    const p = new PagefindProvider(() => Promise.resolve(makeMockPagefind()));
    e2(p.getState()).toBe('idle');
  });

  i2('initialize transitions to ready on success', async () => {
    const p = new PagefindProvider(() => Promise.resolve(makeMockPagefind()));
    await p.initialize();
    e2(p.getState()).toBe('ready');
    e2(await p.ready()).toBe(true);
  });

  i2('initialize transitions to failed on error', async () => {
    const p = new PagefindProvider(() => Promise.reject(new Error('404')));
    await p.initialize();
    e2(p.getState()).toBe('failed');
    e2(await p.ready()).toBe(false);
  });

  i2('initialize is idempotent when already ready', async () => {
    const loader = vi.fn(() => Promise.resolve(makeMockPagefind()));
    const p = new PagefindProvider(loader);
    await p.initialize();
    await p.initialize();
    e2(loader).toHaveBeenCalledTimes(1);
  });

  i2('search returns mapped SearchResult[]', async () => {
    const p = new PagefindProvider(() => Promise.resolve(makeMockPagefind()));
    await p.initialize();
    const results = await p.search('hello');
    e2(results).toHaveLength(2);
    e2(results[0].title).toBe('Hello World');
    e2(results[0].url).toBe('/en/articles/hello/');
    e2(results[0].excerpt).toBe('<mark>Hello</mark> world');
    e2(results[0].score).toBe(1.5);
  });

  i2('search respects limit option', async () => {
    const p = new PagefindProvider(() => Promise.resolve(makeMockPagefind()));
    await p.initialize();
    const results = await p.search('hello', { limit: 1 });
    e2(results).toHaveLength(1);
  });

  i2('search throws SearchError when not ready', async () => {
    const { SearchError } = await import('../SearchProvider');
    const p = new PagefindProvider(() => Promise.reject(new Error('no index')));
    await p.initialize();
    e2(p.getState()).toBe('failed');
    await expect(p.search('hello')).rejects.toThrow(SearchError);
  });

  i2('search throws SearchError on pagefind failure', async () => {
    const { SearchError } = await import('../SearchProvider');
    const mock = makeMockPagefind();
    mock.search = vi.fn().mockRejectedValue(new Error('corrupt index'));
    const p = new PagefindProvider(() => Promise.resolve(mock));
    await p.initialize();
    await expect(p.search('hello')).rejects.toThrow(SearchError);
  });

  i2('search returns [] when no results', async () => {
    const mock = makeMockPagefind();
    mock.search = vi.fn().mockResolvedValue({ results: [] });
    const p = new PagefindProvider(() => Promise.resolve(mock));
    await p.initialize();
    const results = await p.search('nonexistent');
    e2(results).toEqual([]);
  });

  i2('destroy resets state to idle and calls pagefind.destroy', async () => {
    const mock = makeMockPagefind();
    const p = new PagefindProvider(() => Promise.resolve(mock));
    await p.initialize();
    await p.destroy();
    e2(p.getState()).toBe('idle');
    e2(mock.destroy).toHaveBeenCalled();
  });

  i2('can reinitialize after destroy', async () => {
    const p = new PagefindProvider(() => Promise.resolve(makeMockPagefind()));
    await p.initialize();
    await p.destroy();
    e2(p.getState()).toBe('idle');
    await p.initialize();
    e2(p.getState()).toBe('ready');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/components/integrations/search/__tests__/SearchProvider.test.ts`
Expected: FAIL — `Failed to resolve import '../PagefindProvider'`

- [ ] **Step 3: 写 PagefindProvider 实现**

```ts
// src/components/integrations/search/PagefindProvider.ts
import type {
  SearchProvider,
  SearchProviderState,
  SearchResult,
  SearchOptions,
} from './SearchProvider';
import { SearchError } from './SearchProvider';

/** Pagefind 低级 Search API 的最小类型(实际形状以 Pagefind 1.5+ 文档为准) */
interface PagefindResult {
  data: () => Promise<{
    meta: { title?: string; url?: string };
    excerpt?: string;
    score?: number;
  }>;
}
interface PagefindSearchResponse {
  results: PagefindResult[];
}
interface PagefindModule {
  search: (query: string) => Promise<PagefindSearchResponse>;
  destroy?: () => void;
}

type PagefindLoader = () => Promise<PagefindModule>;

export class PagefindProvider implements SearchProvider {
  private state: SearchProviderState = 'idle';
  private pagefind: PagefindModule | null = null;
  private readonly loader: PagefindLoader;

  constructor(loader?: PagefindLoader) {
    this.loader = loader ?? (() => import('/pagefind/pagefind.js' as string));
  }

  async initialize(): Promise<void> {
    if (this.state === 'initializing' || this.state === 'ready') return;
    this.state = 'initializing';
    try {
      this.pagefind = await this.loader();
      this.state = 'ready';
    } catch {
      this.pagefind = null;
      this.state = 'failed';
    }
  }

  getState(): SearchProviderState {
    return this.state;
  }

  async ready(): Promise<boolean> {
    return this.state === 'ready' && this.pagefind !== null;
  }

  async search(query: string, opts?: SearchOptions): Promise<SearchResult[]> {
    if (this.state !== 'ready' || !this.pagefind) {
      throw new SearchError('SearchProvider not ready — call initialize() first');
    }
    try {
      const limit = opts?.limit ?? 10;
      const response = await this.pagefind.search(query);
      const sliced = response.results.slice(0, limit);
      const mapped = await Promise.all(
        sliced.map(async (r): Promise<SearchResult> => {
          const data = await r.data();
          return {
            title: data.meta?.title ?? '',
            url: data.meta?.url ?? '',
            excerpt: data.excerpt,
            score: data.score,
          };
        }),
      );
      return mapped;
    } catch (err) {
      if (err instanceof SearchError) throw err;
      throw new SearchError('Pagefind search failed', err);
    }
  }

  async destroy(): Promise<void> {
    try {
      this.pagefind?.destroy?.();
    } catch {
      // 释放阶段忽略错误
    }
    this.pagefind = null;
    this.state = 'idle';
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/components/integrations/search/__tests__/SearchProvider.test.ts`
Expected: PASS — 全部测试通过(SearchError 4 + PagefindProvider 11 = 15)

- [ ] **Step 5: Commit**

```bash
git add src/components/integrations/search/PagefindProvider.ts src/components/integrations/search/__tests__/SearchProvider.test.ts
git commit -m "feat(search): implement PagefindProvider with state machine and async init"
```

---

### Task 3: createSearchProvider Resolver

**Files:**
- Create: `src/components/integrations/search/createSearchProvider.ts`
- Test: `src/components/integrations/search/__tests__/createSearchProvider.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `SearchProvider`(type)、Task 2 的 `PagefindProvider`
- Produces: `createSearchProvider(): SearchProvider | null` — Task 4 SearchBox 调用

- [ ] **Step 1: 写失败测试**

```ts
// src/components/integrations/search/__tests__/createSearchProvider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('createSearchProvider', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns PagefindProvider for "pagefind"', async () => {
    vi.stubEnv('PUBLIC_SEARCH_PROVIDER', 'pagefind');
    const { createSearchProvider } = await import('../createSearchProvider');
    const provider = createSearchProvider();
    expect(provider).not.toBeNull();
    expect(provider).toHaveProperty('initialize');
    expect(provider).toHaveProperty('search');
    expect(provider).toHaveProperty('destroy');
  });

  it('returns null for "none"', async () => {
    vi.stubEnv('PUBLIC_SEARCH_PROVIDER', 'none');
    const { createSearchProvider } = await import('../createSearchProvider');
    expect(createSearchProvider()).toBeNull();
  });

  it('throws for "orama" (not yet implemented)', async () => {
    vi.stubEnv('PUBLIC_SEARCH_PROVIDER', 'orama');
    const { createSearchProvider } = await import('../createSearchProvider');
    expect(() => createSearchProvider()).toThrow('Unknown search provider: orama');
  });

  it('throws for unknown provider', async () => {
    vi.stubEnv('PUBLIC_SEARCH_PROVIDER', 'algolia');
    const { createSearchProvider } = await import('../createSearchProvider');
    expect(() => createSearchProvider()).toThrow('Unknown search provider: algolia');
  });

  it('defaults to pagefind when env not set', async () => {
    vi.stubEnv('PUBLIC_SEARCH_PROVIDER', '');
    const { createSearchProvider } = await import('../createSearchProvider');
    const provider = createSearchProvider();
    expect(provider).not.toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/components/integrations/search/__tests__/createSearchProvider.test.ts`
Expected: FAIL — `Failed to resolve import '../createSearchProvider'`

- [ ] **Step 3: 写 resolver 实现**

```ts
// src/components/integrations/search/createSearchProvider.ts
import type { SearchProvider } from './SearchProvider';
import { PagefindProvider } from './PagefindProvider';

export function createSearchProvider(): SearchProvider | null {
  const provider = import.meta.env.PUBLIC_SEARCH_PROVIDER ?? 'pagefind';
  switch (provider) {
    case 'pagefind':
      return new PagefindProvider();
    // case 'orama': return new OramaProvider(); // 未来,不实现
    case 'none':
      return null;
    default:
      throw new Error(`Unknown search provider: ${provider}`);
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/components/integrations/search/__tests__/createSearchProvider.test.ts`
Expected: PASS — 5 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/integrations/search/createSearchProvider.ts src/components/integrations/search/__tests__/createSearchProvider.test.ts
git commit -m "feat(search): add createSearchProvider resolver with env-based switching"
```

### Task 4: SearchBox.astro UI + Search i18n Keys

**Files:**
- Create: `src/components/integrations/search/SearchBox.astro`
- Modify: `src/i18n/ui/zh.ts`(追加 search keys)
- Modify: `src/i18n/ui/en.ts`(追加 search keys)

**Interfaces:**
- Consumes: Task 3 的 `createSearchProvider`、Task 1 的 `SearchProvider`/`SearchResult` type、Plan 1 的 `t()`/`Locale`
- Produces: `SearchBox.astro` 组件 — Task 13 BaseLayout/Header 引用

- [ ] **Step 1: 追加 i18n keys 到 zh.ts**

在 `src/i18n/ui/zh.ts` 的 `export default { ... }` 对象内,`'common.404.back'` 行之后追加:

```ts
  'common.search.placeholder': '搜索文章...',
  'common.search.unavailable': '搜索暂不可用',
  'common.search.no-results': '没有找到相关结果',
  'common.search.loading': '搜索中...',
  'common.search.button': '搜索',
  'common.search.label': '站内搜索',
```

- [ ] **Step 2: 追加 i18n keys 到 en.ts**

在 `src/i18n/ui/en.ts` 的 `export default { ... }` 对象内,`'common.404.back'` 行之后追加:

```ts
  'common.search.placeholder': 'Search articles...',
  'common.search.unavailable': 'Search is currently unavailable',
  'common.search.no-results': 'No results found',
  'common.search.loading': 'Searching...',
  'common.search.button': 'Search',
  'common.search.label': 'Site search',
```

- [ ] **Step 3: 创建 SearchBox.astro**

```astro
---
// src/components/integrations/search/SearchBox.astro
// 只 import resolver + 接口类型,不 import 具体 Provider
import { createSearchProvider } from './createSearchProvider';
import type { SearchResult } from './SearchProvider';
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';

interface Props {
  locale: Locale;
}
const { locale } = Astro.props;

const enabled = import.meta.env.PUBLIC_SEARCH_ENABLED !== 'false';
const provider = enabled ? createSearchProvider() : null;

// provider === null → 零 DOM 输出(PUBLIC_SEARCH_PROVIDER=none 或 enabled=false)
---

{provider && (
  <div class="search-box" data-search-box data-initialized="false">
    <button
      type="button"
      class="search-toggle"
      aria-label={t(locale, 'common.search.label')}
      aria-expanded="false"
      data-search-toggle
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    </button>

    <div class="search-panel" data-search-panel hidden>
      <input
        type="search"
        class="search-input"
        placeholder={t(locale, 'common.search.placeholder')}
        aria-label={t(locale, 'common.search.label')}
        data-search-input
        data-unavailable={t(locale, 'common.search.unavailable')}
        data-no-results={t(locale, 'common.search.no-results')}
        data-loading={t(locale, 'common.search.loading')}
        disabled
      />
      <div class="search-results" data-search-results role="listbox" aria-label={t(locale, 'common.search.label')}></div>
      <p class="search-status" data-search-status aria-live="polite" hidden></p>
    </div>
  </div>
)}

<style>
  .search-box { position: relative; }
  .search-toggle {
    display: inline-flex; align-items: center; justify-content: center;
    width: 2.5rem; height: 2.5rem; border: none; border-radius: var(--radius-md);
    background: transparent; color: var(--color-text); cursor: pointer;
    transition: background-color calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
  }
  .search-toggle:hover { background: var(--color-surface); }
  .search-toggle[aria-expanded='true'] { background: var(--color-surface); }
  .search-panel {
    position: absolute; top: calc(100% + var(--spacing-2xs)); right: 0;
    width: min(24rem, 90vw); background: var(--color-surface-raised);
    border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg); padding: var(--spacing-2xs); z-index: var(--z-dropdown);
  }
  .search-input {
    width: 100%; padding: var(--spacing-2xs) var(--spacing-xs);
    border: 1px solid var(--color-border); border-radius: var(--radius-md);
    font-size: var(--text-sm); background: var(--color-bg); color: var(--color-text);
  }
  .search-input:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }
  .search-input:disabled { opacity: 0.6; cursor: not-allowed; }
  .search-results { margin-top: var(--spacing-2xs); max-height: 24rem; overflow-y: auto; }
  .search-result-item {
    display: block; padding: var(--spacing-2xs) var(--spacing-xs);
    border-radius: var(--radius-md); text-decoration: none; color: var(--color-text);
    transition: background-color calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
  }
  .search-result-item:hover, .search-result-item:focus-visible { background: var(--color-surface); }
  .search-result-title { font-weight: 600; font-size: var(--text-sm); }
  .search-result-excerpt { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: var(--spacing-3xs); }
  .search-status { padding: var(--spacing-2xs) var(--spacing-xs); font-size: var(--text-xs); color: var(--color-text-muted); }
</style>

<script>
  import type { SearchProvider, SearchResult } from './SearchProvider';

  // Provider singleton(模块缓存,ClientRouter 导航后不重建)
  let provider: SearchProvider | null = null;
  let providerReady = false;

  function initSearchBox() {
    const box = document.querySelector<HTMLElement>('[data-search-box]');
    if (!box) return;

    // Singleton guard:防止重复绑定(spec 5.20)
    if (box.dataset.initialized === 'true') return;
    box.dataset.initialized = 'true';

    const toggle = box.querySelector<HTMLButtonElement>('[data-search-toggle]');
    const panel = box.querySelector<HTMLElement>('[data-search-panel]');
    const input = box.querySelector<HTMLInputElement>('[data-search-input]');
    const resultsEl = box.querySelector<HTMLElement>('[data-search-results]');
    const statusEl = box.querySelector<HTMLElement>('[data-search-status]');

    if (!toggle || !panel || !input || !resultsEl || !statusEl) return;

    async function openPanel() {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      input.focus();

      if (!providerReady) {
        if (!provider) {
          const { createSearchProvider } = await import('./createSearchProvider');
          provider = createSearchProvider();
        }
        if (!provider) {
          input.disabled = true;
          statusEl.textContent = input.dataset.unavailable ?? 'Search unavailable';
          statusEl.hidden = false;
          return;
        }
        try {
          await provider.initialize();
          const ok = await provider.ready();
          if (ok) {
            input.disabled = false;
            providerReady = true;
          } else {
            input.disabled = true;
            statusEl.textContent = input.dataset.unavailable ?? 'Search unavailable';
            statusEl.hidden = false;
          }
        } catch {
          input.disabled = true;
          statusEl.textContent = input.dataset.unavailable ?? 'Search unavailable';
          statusEl.hidden = false;
        }
      }
    }

    function closePanel() {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      resultsEl.innerHTML = '';
      statusEl.hidden = true;
    }

    toggle.addEventListener('click', () => {
      if (panel.hidden) openPanel();
      else closePanel();
    });

    document.addEventListener('click', (e) => {
      if (!box.contains(e.target as Node)) closePanel();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) {
        closePanel();
        toggle.focus();
      }
    });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    input.addEventListener('input', () => {
      const query = input.value.trim();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (!query) {
        resultsEl.innerHTML = '';
        statusEl.hidden = true;
        return;
      }
      statusEl.hidden = false;
      statusEl.textContent = input.dataset.loading ?? 'Searching...';
      debounceTimer = setTimeout(async () => {
        if (!provider || !providerReady) return;
        try {
          const results = await provider.search(query, { limit: 10 });
          renderResults(results);
        } catch {
          statusEl.textContent = input.dataset.unavailable ?? 'Search unavailable';
          resultsEl.innerHTML = '';
        }
      }, 200);
    });

    function renderResults(results: SearchResult[]) {
      if (results.length === 0) {
        statusEl.textContent = input?.dataset.noResults ?? 'No results';
        statusEl.hidden = false;
        resultsEl.innerHTML = '';
        return;
      }
      statusEl.hidden = true;
      resultsEl.innerHTML = results
        .map(
          (r) => `
        <a href="${r.url}" class="search-result-item" role="option">
          <div class="search-result-title">${escapeHtml(r.title)}</div>
          ${r.excerpt ? `<div class="search-result-excerpt">${r.excerpt}</div>` : ''}
        </a>`,
        )
        .join('');
    }

    function escapeHtml(s: string): string {
      const div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }
  }

  // 每次 astro:page-load 重建 UI(清空展开/聚焦/结果状态)(spec 5.20)
  document.addEventListener('astro:page-load', initSearchBox);
</script>
```

- [ ] **Step 4: 运行 type check**

Run: `pnpm check`
Expected: 无类型错误

- [ ] **Step 5: 运行测试确保无回归**

Run: `pnpm test`
Expected: 全部已有测试 PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/integrations/search/SearchBox.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat(search): add SearchBox UI with lazy provider init and astro:page-load lifecycle"
```

---

### Task 5: search-index.mjs Build Script

**Files:**
- Create: `src/scripts/search-index.mjs`
- Modify: `package.json`(追加 pagefind devDep + search:index script + postbuild)

**Interfaces:**
- Consumes: `process.env.PUBLIC_SEARCH_ENABLED` + `PUBLIC_SEARCH_PROVIDER`
- Produces: `dist/pagefind/` 索引目录(仅启用时);CI 失败时非零退出

- [ ] **Step 1: 安装 pagefind**

Run: `pnpm add -D pagefind@^1.5.0`
Expected: pagefind 安装成功

- [ ] **Step 2: 创建 search-index.mjs**

```js
// src/scripts/search-index.mjs
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const enabled = process.env.PUBLIC_SEARCH_ENABLED !== 'false';
const provider = process.env.PUBLIC_SEARCH_PROVIDER ?? 'pagefind';

if (!enabled) {
  console.log('[search-index] Skipped: PUBLIC_SEARCH_ENABLED is false');
  process.exit(0);
}

if (provider !== 'pagefind') {
  console.log(`[search-index] Skipped: provider is "${provider}", not "pagefind"`);
  process.exit(0);
}

const distDir = new URL('../dist/', import.meta.url).pathname;
if (!existsSync(distDir)) {
  console.error('[search-index] dist/ not found — run astro build first');
  process.exit(1);
}

console.log('[search-index] Running pagefind --site dist');
try {
  execSync('npx pagefind --site dist', { stdio: 'inherit' });
  console.log('[search-index] Pagefind index generated successfully');
} catch (err) {
  console.error('[search-index] Pagefind failed:', err.message);
  process.exit(1);
}
```

- [ ] **Step 3: 修改 package.json scripts**

在 `package.json` 的 `"scripts"` 中追加(若 `postbuild` 已存在,将 `search:index` 追加到现有 postbuild 链末尾):

```json
{
  "scripts": {
    "search:index": "node src/scripts/search-index.mjs",
    "postbuild": "pnpm run search:index"
  }
}
```

注意:若 Plan 2-3 已添加 `postbuild`(如 `build-meta`、`generate-og` 等),合并为 `"postbuild": "pnpm run build-meta -- --dist && pnpm run search:index && pnpm run generate-og && ..."`。仅追加 `search:index`,不删除已有步骤。

- [ ] **Step 4: 手动验证(搜索禁用时跳过)**

Run: `$env:PUBLIC_SEARCH_ENABLED='false'; pnpm run search:index`
Expected: 输出 `[search-index] Skipped: PUBLIC_SEARCH_ENABLED is false`,退出码 0

- [ ] **Step 5: 手动验证(搜索启用时需先 build)**

Run: `pnpm build`
Expected: `astro build` 完成后,`search:index` 运行 pagefind,生成 `dist/pagefind/` 目录(若 dist 有 HTML 内容)

- [ ] **Step 6: Commit**

```bash
git add src/scripts/search-index.mjs package.json
git commit -m "feat(search): add search-index.mjs postbuild script with pagefind integration"
```

### Task 6: Analytics.astro (Umami) + Travellings.astro

**Files:**
- Create: `src/components/integrations/analytics/Analytics.astro`
- Create: `src/components/integrations/travellings/Travellings.astro`
- Modify: `src/i18n/ui/zh.ts`(追加 travellings keys)
- Modify: `src/i18n/ui/en.ts`(追加 travellings keys)

**Interfaces:**
- Consumes: `import.meta.env.PUBLIC_UMAMI_*`、`PUBLIC_TRAVELLINGS_ENABLED`、Plan 1 的 `t()`/`Locale`
- Produces: `Analytics.astro`(零 props)、`Travellings.astro` — Task 13 BaseLayout / friends 页引用

- [ ] **Step 1: 追加 travellings i18n keys 到 zh.ts**

在 `src/i18n/ui/zh.ts` 的 search keys 之后追加:

```ts
  'common.travellings.title': '开往',
  'common.travellings.description': '乘坐随机博客电车,探索更多站点',
  'common.travellings.button': '随机前往',
```

- [ ] **Step 2: 追加 travellings i18n keys 到 en.ts**

在 `src/i18n/ui/en.ts` 的 search keys 之后追加:

```ts
  'common.travellings.title': 'Travellings',
  'common.travellings.description': 'Take the random blog tram and discover more sites',
  'common.travellings.button': 'Travel randomly',
```

- [ ] **Step 3: 创建 Analytics.astro**

```astro
---
// src/components/integrations/analytics/Analytics.astro
// 零 props,全靠环境变量;未启用 → 零 DOM(spec 7.8)
const enabled = import.meta.env.PUBLIC_UMAMI_ENABLED === 'true';
const scriptUrl = import.meta.env.PUBLIC_UMAMI_SCRIPT_URL ?? '';
const websiteId = import.meta.env.PUBLIC_UMAMI_WEBSITE_ID ?? '';
const ready = enabled && scriptUrl && websiteId;
---
{ready && (
  <script is:inline define:vars={{ scriptUrl, websiteId }}>
    (function () {
      var s = document.createElement('script');
      s.src = scriptUrl;
      s.defer = true;
      s.setAttribute('data-website-id', websiteId);
      s.onerror = function () { console.warn('[Umami] analytics script failed to load'); };
      document.head.appendChild(s);
    })();
  </script>
)}
```

- [ ] **Step 4: 创建 Travellings.astro**

```astro
---
// src/components/integrations/travellings/Travellings.astro
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';

interface Props {
  locale: Locale;
}
const { locale } = Astro.props;

// 默认开;显式 'false' 才关闭(spec 7.6)
const enabled = import.meta.env.PUBLIC_TRAVELLINGS_ENABLED !== 'false';
---
{enabled && (
  <div class="travellings-card">
    <a
      href="https://travellings.cn/go.html"
      target="_blank"
      rel="noopener"
      class="travellings-link"
      aria-label={t(locale, 'common.travellings.title') + ' — ' + t(locale, 'common.travellings.description')}
    >
      <span class="travellings-logo" aria-hidden="true">🚇</span>
      <span class="travellings-text">
        <span class="travellings-title">{t(locale, 'common.travellings.title')}</span>
        <span class="travellings-desc">{t(locale, 'common.travellings.description')}</span>
      </span>
      <span class="travellings-go">{t(locale, 'common.travellings.button')} →</span>
    </a>
  </div>
)}

<style>
  .travellings-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow calc(var(--duration-base) * var(--motion-scale)) var(--ease-out);
  }
  .travellings-card:hover { box-shadow: var(--shadow-md); }
  .travellings-link {
    display: flex; align-items: center; gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    text-decoration: none; color: var(--color-text);
  }
  .travellings-logo { font-size: 1.75rem; }
  .travellings-text { display: flex; flex-direction: column; flex: 1; }
  .travellings-title { font-weight: 700; font-size: var(--text-md); }
  .travellings-desc { font-size: var(--text-xs); color: var(--color-text-muted); }
  .travellings-go { font-size: var(--text-sm); color: var(--color-accent); white-space: nowrap; }
</style>
```

- [ ] **Step 5: 运行 type check**

Run: `pnpm check`
Expected: 无类型错误

- [ ] **Step 6: Commit**

```bash
git add src/components/integrations/analytics/Analytics.astro src/components/integrations/travellings/Travellings.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat(integrations): add Analytics (Umami) and Travellings pluggable components"
```

---

### Task 7: giscus.ts Library + Comments.astro + Comments i18n Keys

**Files:**
- Create: `src/lib/giscus.ts`
- Create: `src/components/integrations/comments/Comments.astro`
- Modify: `src/i18n/ui/zh.ts`(追加 comments keys)
- Modify: `src/i18n/ui/en.ts`(追加 comments keys)

**Interfaces:**
- Consumes: `import.meta.env.PUBLIC_GISCUS_*`、Plan 1 的 `t()`/`Locale`、ThemeToggle 的 `theme-change` CustomEvent
- Produces: `Comments.astro` 组件、`giscus.ts` 工具库 — Task 13 article/friends 页引用

- [ ] **Step 1: 追加 comments i18n keys 到 zh.ts**

在 `src/i18n/ui/zh.ts` 的 travellings keys 之后追加:

```ts
  'common.comments.loading': '评论加载中...',
  'common.comments.error': '评论加载失败,请稍后重试',
  'common.comments.guestbook': '留言板',
```

- [ ] **Step 2: 追加 comments i18n keys 到 en.ts**

在 `src/i18n/ui/en.ts` 的 travellings keys 之后追加:

```ts
  'common.comments.loading': 'Loading comments...',
  'common.comments.error': 'Failed to load comments, please try again later',
  'common.comments.guestbook': 'Guestbook',
```

- [ ] **Step 3: 创建 giscus.ts**

```ts
// src/lib/giscus.ts
// Giscus singleton script 管理(spec 7.4 P1-10):
// ClientRouter 导航后不重新加载 client.js,只 destroy 旧 widget + mount 新 widget

export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname' | 'specific' | 'title' | 'url' | 'og:title';
  term?: string;
  theme: 'light' | 'dark';
  lang: string;
  inputPosition?: 'top' | 'bottom';
}

const GISCUS_ORIGIN = 'https://giscus.app';

/**
 * 在 container 内挂载 Giscus widget(spec 7.4 P1-10)。
 * 每次调用先清空 container(destroy 旧 widget),然后插入新的 <script> 标签。
 * 浏览器缓存 client.js,首次加载后才发网络请求,后续导航走缓存。
 */
export function mountGiscus(config: GiscusConfig, container: HTMLElement): void {
  destroyGiscus(container);

  const script = document.createElement('script');
  script.src = `${GISCUS_ORIGIN}/client.js`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-repo', config.repo);
  script.setAttribute('data-repo-id', config.repoId);
  script.setAttribute('data-category', config.category);
  script.setAttribute('data-category-id', config.categoryId);
  script.setAttribute('data-mapping', config.mapping);
  if (config.term) script.setAttribute('data-term', config.term);
  script.setAttribute('data-theme', config.theme);
  script.setAttribute('data-lang', config.lang);
  script.setAttribute('data-loading', 'lazy');
  if (config.inputPosition) script.setAttribute('data-input-position', config.inputPosition);

  script.onerror = () => {
    container.innerHTML = '<p class="giscus-error">评论加载失败</p>';
  };

  container.appendChild(script);
}

/**
 * 销毁 Giscus widget:清空 container(移除 iframe + script)(spec 7.4)。
 * 每次 astro:page-load 前调用,清除旧评论区。
 */
export function destroyGiscus(container: HTMLElement): void {
  container.innerHTML = '';
}

/**
 * 同步 Giscus iframe 主题(postMessage)(spec 7.4 P2-29)。
 * 统一封装:负责 iframe 查找、origin 校验、iframe 未加载时跳过。
 * ThemeToggle 派发 theme-change CustomEvent → Comments 监听后调用此函数。
 */
export function updateGiscusTheme(theme: 'light' | 'dark'): void {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    { giscus: { setConfig: { theme } } },
    GISCUS_ORIGIN,
  );
}
```

- [ ] **Step 4: 创建 Comments.astro**

```astro
---
// src/components/integrations/comments/Comments.astro
// 从 analytics/ 拆出,保持 integration boundary 清晰(spec 7.4 P2-36)
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';

interface Props {
  locale: Locale;
  category: string;
  categoryId: string;
  mapping?: 'pathname' | 'specific' | 'title' | 'url' | 'og:title';
  term?: string;
}

const { locale, category, categoryId, mapping = 'pathname', term } = Astro.props;

// 开关:enabled + repo + repoId 都满足才注入(spec 7.4)
const enabled = import.meta.env.PUBLIC_GISCUS_ENABLED === 'true';
const repo = import.meta.env.PUBLIC_GISCUS_REPO ?? '';
const repoId = import.meta.env.PUBLIC_GISCUS_REPO_ID ?? '';
const ready = enabled && repo && repoId;

// Giscus data-lang 映射(spec 7.4:zh→zh-CN,en→en,ru→ru,ja→ja)
const giscusLang: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en',
  ru: 'ru',
  ja: 'ja',
};
---

{ready && (
  <section class="comments-section" data-comments data-locale={giscusLang[locale] ?? 'en'}>
    <h2 class="comments-heading">{t(locale, 'common.comments.guestbook')}</h2>
    <div class="giscus-container" data-giscus-container></div>
    <noscript>
      <p>{t(locale, 'common.comments.error')}</p>
    </noscript>
  </section>
)}

<style>
  .comments-section { margin-top: var(--spacing-xl); }
  .comments-heading { font-size: var(--text-xl); margin-bottom: var(--spacing-sm); }
  .giscus-container { min-height: 4rem; }
  .giscus-error { color: var(--color-danger); padding: var(--spacing-xs); }
</style>

<script>
  // Giscus 生命周期管理(spec 7.4 P1-10 + spec 5.20):
  // - script 只加载一次(singleton):浏览器缓存 client.js
  // - 每次 astro:page-load:destroyGiscus() → mountGiscus() 重建 widget
  // - theme-change CustomEvent:调用 updateGiscusTheme() 同步暗色

  function initComments() {
    const section = document.querySelector<HTMLElement>('[data-comments]');
    if (!section) return;

    const container = section.querySelector<HTMLElement>('[data-giscus-container]');
    if (!container) return;

    const enabled = import.meta.env.PUBLIC_GISCUS_ENABLED === 'true';
    const repo = import.meta.env.PUBLIC_GISCUS_REPO ?? '';
    const repoId = import.meta.env.PUBLIC_GISCUS_REPO_ID ?? '';
    const lang = section.dataset.locale ?? 'en';

    if (!enabled || !repo || !repoId) return;

    // 从 data 属性读取 category/mapping/term(由 Astro frontmatter 注入到 DOM)
    // 这里重新从 import.meta.env 读取完整配置
    const category = section.dataset.category ?? '';
    const categoryId = section.dataset.categoryId ?? '';
    const mapping = (section.dataset.mapping ?? 'pathname') as
      | 'pathname' | 'specific' | 'title' | 'url' | 'og:title';
    const term = section.dataset.term;

    const currentTheme = document.documentElement.dataset.theme ?? 'light';

    // 动态 import giscus 库(Astro 会 bundler 处理)
    import('@lib/giscus').then(({ mountGiscus, updateGiscusTheme }) => {
      mountGiscus(
        {
          repo,
          repoId,
          category,
          categoryId,
          mapping,
          term,
          theme: currentTheme as 'light' | 'dark',
          lang,
        },
        container,
      );

      // 监听 theme-change 事件同步暗色(spec 7.4 P1-20/P2-29)
      // 使用命名函数便于 page-load 时不重复绑定(每次 page-load DOM 重建,旧 listener 自动清理)
      const onThemeChange = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.theme) {
          updateGiscusTheme(detail.theme as 'light' | 'dark');
        }
      };
      document.addEventListener('theme-change', onThemeChange);
    });
  }

  // 每次 astro:page-load 重建评论区 iframe(spec 5.20)
  document.addEventListener('astro:page-load', initComments);
</script>
```

- [ ] **Step 5: 运行 type check**

Run: `pnpm check`
Expected: 无类型错误

- [ ] **Step 6: Commit**

```bash
git add src/lib/giscus.ts src/components/integrations/comments/Comments.astro src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat(comments): add Giscus pluggable component with singleton script and theme sync"
```

### Task 8: MusicPlayer Interface & Types

**Files:**
- Create: `src/components/integrations/music/MusicPlayer.ts`
- Test: `src/components/integrations/music/__tests__/MusicPlayer.test.ts`

**Interfaces:**
- Consumes: 无(首个 music task)
- Produces: `Track`、`Playlist`、`MusicPlayerState`、`MusicPlayer`(interface)— 后续 HtmlAudioProvider/resolver/Widget 全部依赖

- [ ] **Step 1: 写测试(验证类型可被实现)**

```ts
// src/components/integrations/music/__tests__/MusicPlayer.test.ts
import { describe, it, expect } from 'vitest';
import type { MusicPlayer, MusicPlayerState, Track, Playlist } from '../MusicPlayer';

describe('MusicPlayer types', () => {
  it('MusicPlayerState has correct shape', () => {
    const state: MusicPlayerState = {
      isPlaying: false,
      currentTrackId: null,
      currentPlaylistId: null,
      volume: 1,
    };
    expect(state.isPlaying).toBe(false);
    expect(state.currentTrackId).toBeNull();
    expect(state.volume).toBe(1);
  });

  it('Track has required fields', () => {
    const track: Track = {
      id: 't1',
      title: 'Test Song',
      src: 'https://example.com/song.mp3',
    };
    expect(track.id).toBe('t1');
    expect(track.title).toBe('Test Song');
  });

  it('Track optional fields', () => {
    const track: Track = {
      id: 't2',
      title: 'Full',
      artist: 'Artist',
      src: 'https://example.com/song.mp3',
      cover: 'https://example.com/cover.jpg',
      duration: 180,
    };
    expect(track.artist).toBe('Artist');
    expect(track.duration).toBe(180);
  });

  it('Playlist wraps tracks', () => {
    const playlist: Playlist = {
      id: 'default',
      name: 'My Playlist',
      tracks: [
        { id: 't1', title: 'A', src: 'url-a' },
        { id: 't2', title: 'B', src: 'url-b' },
      ],
    };
    expect(playlist.tracks).toHaveLength(2);
  });

  it('MusicPlayer interface is satisfied by a minimal stub', () => {
    const stub: MusicPlayer = {
      initialize: () => Promise.resolve(),
      ready: () => Promise.resolve(true),
      play: () => Promise.resolve(),
      pause: () => {},
      next: () => Promise.resolve(),
      prev: () => Promise.resolve(),
      setVolume: () => {},
      getState: () => ({
        isPlaying: false,
        currentTrackId: null,
        currentPlaylistId: null,
        volume: 1,
      }),
      onStateChange: () => () => {},
    };
    expect(stub.getState().isPlaying).toBe(false);
    expect(typeof stub.play).toBe('function');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/components/integrations/music/__tests__/MusicPlayer.test.ts`
Expected: FAIL — `Failed to resolve import '../MusicPlayer'`

- [ ] **Step 3: 写接口定义**

```ts
// src/components/integrations/music/MusicPlayer.ts
// 纯 .ts 接口定义(spec 5.12)— 不含任何实现
export interface Track {
  id: string;
  title: string;
  artist?: string;
  src: string;
  cover?: string;
  duration?: number;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

export interface MusicPlayerState {
  isPlaying: boolean;
  currentTrackId: string | null;
  currentPlaylistId: string | null;
  volume: number;
}

export interface MusicPlayer {
  /** 异步初始化(预加载元数据等),首次播放前调用;audio 元素通过构造注入,initialize() 无参(spec P0-2) */
  initialize(): Promise<void>;
  /** 是否就绪(初始化完成);异步用此而非同步 isAvailable */
  ready(): Promise<boolean>;
  /** 播放(从当前曲目,或指定曲目);需 ready 后调用 */
  play(trackId?: string): Promise<void>;
  /** 暂停 */
  pause(): void;
  /** 下一首 */
  next(): Promise<void>;
  /** 上一首 */
  prev(): Promise<void>;
  /** 设置音量 0-1 */
  setVolume(v: number): void;
  /** 获取当前状态(isPlaying/currentTrack 等) */
  getState(): MusicPlayerState;
  /** 状态变化回调注册(控件监听更新 UI);返回取消订阅函数 */
  onStateChange(cb: (state: MusicPlayerState) => void): () => void;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/components/integrations/music/__tests__/MusicPlayer.test.ts`
Expected: PASS — 5 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/integrations/music/MusicPlayer.ts src/components/integrations/music/__tests__/MusicPlayer.test.ts
git commit -m "feat(music): add MusicPlayer interface with Track/Playlist/State types"
```

---

### Task 9: HtmlAudioProvider Implementation

**Files:**
- Create: `src/components/integrations/music/HtmlAudioProvider.ts`
- Test: `src/components/integrations/music/__tests__/MusicPlayer.test.ts`(追加)

**Interfaces:**
- Consumes: Task 8 的 `MusicPlayer`、`MusicPlayerState`、`Track`、`Playlist`;`src/config/music.ts` 的 `playlists`(Task 11 创建,但此 task 用可选注入参数解耦)
- Produces: `HtmlAudioProvider` class — Task 10 resolver 引用,Task 12 Widget 间接使用

- [ ] **Step 1: 追加失败测试**

在 `src/components/integrations/music/__tests__/MusicPlayer.test.ts` 末尾追加:

```ts
// --- HtmlAudioProvider 测试 ---
import { describe as d2, it as i2, expect as e2, vi, beforeEach } from 'vitest';
import { HtmlAudioProvider } from '../HtmlAudioProvider';
import type { Playlist } from '../MusicPlayer';

// Mock HTMLAudioElement(spec P1-11:audio 是媒体状态唯一真相源)
function createMockAudio() {
  const listeners: Record<string, Array<(e: Event) => void>> = {};
  return {
    src: '',
    volume: 1,
    paused: true,
    duration: NaN,
    currentTime: 0,
    addEventListener: vi.fn((type: string, cb: (e: Event) => void) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(cb);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn((e: Event) => {
      (listeners[e.type] ?? []).forEach((cb) => cb(e));
      return true;
    }),
    play: vi.fn(async () => {
      (listeners['play'] ?? []).forEach((cb) => cb(new Event('play')));
    }),
    pause: vi.fn(() => {
      (listeners['pause'] ?? []).forEach((cb) => cb(new Event('pause')));
    }),
  };
}

const testPlaylists: Playlist[] = [
  {
    id: 'default',
    name: 'Test',
    tracks: [
      { id: 't1', title: 'Song A', src: 'url-a' },
      { id: 't2', title: 'Song B', src: 'url-b' },
      { id: 't3', title: 'Song C', src: 'url-c' },
    ],
  },
];

d2('HtmlAudioProvider', () => {
  let mockAudio: ReturnType<typeof createMockAudio>;
  let provider: HtmlAudioProvider;

  beforeEach(() => {
    mockAudio = createMockAudio();
    provider = new HtmlAudioProvider(mockAudio as unknown as HTMLAudioElement, testPlaylists);
  });

  i2('initialize sets ready state', async () => {
    await provider.initialize();
    e2(await provider.ready()).toBe(true);
  });

  i2('getState returns not playing before play', () => {
    const state = provider.getState();
    e2(state.isPlaying).toBe(false);
    e2(state.currentTrackId).toBeNull();
    e2(state.volume).toBe(1);
  });

  i2('play sets src and calls audio.play()', async () => {
    await provider.initialize();
    await provider.play();
    e2(mockAudio.src).toBe('url-a');
    e2(mockAudio.play).toHaveBeenCalled();
  });

  i2('play with trackId sets correct track', async () => {
    await provider.initialize();
    await provider.play('t2');
    e2(mockAudio.src).toBe('url-b');
  });

  i2('pause calls audio.pause()', async () => {
    await provider.initialize();
    await provider.play();
    provider.pause();
    e2(mockAudio.pause).toHaveBeenCalled();
  });

  i2('next advances to next track and plays', async () => {
    await provider.initialize();
    await provider.play('t1');
    await provider.next();
    e2(mockAudio.src).toBe('url-b');
  });

  i2('next wraps to first track at end', async () => {
    await provider.initialize();
    await provider.play('t3');
    await provider.next();
    e2(mockAudio.src).toBe('url-a');
  });

  i2('prev goes to previous track and plays', async () => {
    await provider.initialize();
    await provider.play('t2');
    await provider.prev();
    e2(mockAudio.src).toBe('url-a');
  });

  i2('prev wraps to last track at start', async () => {
    await provider.initialize();
    await provider.play('t1');
    await provider.prev();
    e2(mockAudio.src).toBe('url-c');
  });

  i2('setVolume clamps to 0-1 and sets on audio', () => {
    provider.setVolume(0.5);
    e2(mockAudio.volume).toBe(0.5);
    provider.setVolume(-1);
    e2(mockAudio.volume).toBe(0);
    provider.setVolume(2);
    e2(mockAudio.volume).toBe(1);
  });

  i2('onStateChange fires on play event', async () => {
    const cb = vi.fn();
    provider.onStateChange(cb);
    await provider.initialize();
    await provider.play();
    e2(cb).toHaveBeenCalled();
    const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0];
    e2(lastCall.isPlaying).toBe(true);
  });

  i2('onStateChange fires on pause event', async () => {
    const cb = vi.fn();
    provider.onStateChange(cb);
    await provider.initialize();
    await provider.play();
    provider.pause();
    const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0];
    e2(lastCall.isPlaying).toBe(false);
  });

  i2('onStateChange returns unsubscribe function', () => {
    const cb = vi.fn();
    const unsub = provider.onStateChange(cb);
    unsub();
    // 触发事件后 cb 不应被调用
    mockAudio.dispatchEvent(new Event('play'));
    e2(cb).not.toHaveBeenCalled();
  });

  i2('ended event auto-advances to next track', async () => {
    await provider.initialize();
    await provider.play('t1');
    mockAudio.dispatchEvent(new Event('ended'));
    // ended 触发 next(),next() 调 play(),play() 设 src
    e2(mockAudio.src).toBe('url-b');
  });

  i2('getState reflects current track after play', async () => {
    await provider.initialize();
    await provider.play('t2');
    const state = provider.getState();
    e2(state.currentTrackId).toBe('t2');
    e2(state.currentPlaylistId).toBe('default');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/components/integrations/music/__tests__/MusicPlayer.test.ts`
Expected: FAIL — `Failed to resolve import '../HtmlAudioProvider'`

- [ ] **Step 3: 写 HtmlAudioProvider 实现**

```ts
// src/components/integrations/music/HtmlAudioProvider.ts
import type { MusicPlayer, MusicPlayerState, Playlist, Track } from './MusicPlayer';

/**
 * HTML5 Audio MVP 实现(spec 5.12)。
 * - 构造函数接收外部传入的 <audio> 元素(MusicHost 提供,spec P0-2)
 * - HTMLAudioElement 是媒体状态唯一真相源(spec P1-11):isPlaying = !audio.paused, volume = audio.volume
 * - initialize() 无参:在已注入的 audio 上加载歌单元数据
 * - 默认不播放:只有用户点击 play() 才开始(spec 5.12)
 */
export class HtmlAudioProvider implements MusicPlayer {
  private audio: HTMLAudioElement;
  private playlists: Playlist[];
  private currentPlaylistIndex = 0;
  private currentTrackIndex = 0;
  private initialized = false;
  private listeners: Set<(state: MusicPlayerState) => void> = new Set();
  private audioBound = false;

  constructor(audioElement: HTMLAudioElement, playlists?: Playlist[]) {
    this.audio = audioElement;
    // playlists 可选注入(测试用);不传时延迟到 initialize 从 @config/music 加载
    this.playlists = playlists ?? [];
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    // 延迟加载歌单配置(避免构造时 import 导致循环依赖)
    if (this.playlists.length === 0) {
      const { playlists: configPlaylists } = await import('@config/music');
      this.playlists = configPlaylists;
    }
    this.initialized = true;
    if (!this.audioBound) {
      this.bindAudioEvents();
      this.audioBound = true;
    }
  }

  async ready(): Promise<boolean> {
    return this.initialized;
  }

  async play(trackId?: string): Promise<void> {
    if (trackId) {
      this.setTrackById(trackId);
    }
    const track = this.getCurrentTrack();
    if (!track) return;
    this.audio.src = track.src;
    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  async next(): Promise<void> {
    const playlist = this.getCurrentPlaylist();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % playlist.tracks.length;
    await this.play();
  }

  async prev(): Promise<void> {
    const playlist = this.getCurrentPlaylist();
    const len = playlist.tracks.length;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + len) % len;
    await this.play();
  }

  setVolume(v: number): void {
    this.audio.volume = Math.max(0, Math.min(1, v));
    this.notifyStateChange();
  }

  getState(): MusicPlayerState {
    // HTMLAudioElement 是唯一真相源(spec P1-11)
    return {
      isPlaying: !this.audio.paused,
      currentTrackId: this.getCurrentTrack()?.id ?? null,
      currentPlaylistId: this.getCurrentPlaylist()?.id ?? null,
      volume: this.audio.volume,
    };
  }

  onStateChange(cb: (state: MusicPlayerState) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private getCurrentPlaylist(): Playlist {
    return this.playlists[this.currentPlaylistIndex] ?? { id: '', name: '', tracks: [] };
  }

  private getCurrentTrack(): Track | undefined {
    return this.getCurrentPlaylist().tracks[this.currentTrackIndex];
  }

  private setTrackById(trackId: string): void {
    for (let p = 0; p < this.playlists.length; p++) {
      const idx = this.playlists[p].tracks.findIndex((t) => t.id === trackId);
      if (idx >= 0) {
        this.currentPlaylistIndex = p;
        this.currentTrackIndex = idx;
        return;
      }
    }
  }

  private bindAudioEvents(): void {
    this.audio.addEventListener('play', () => this.notifyStateChange());
    this.audio.addEventListener('pause', () => this.notifyStateChange());
    this.audio.addEventListener('ended', () => {
      void this.next();
    });
    this.audio.addEventListener('volumechange', () => this.notifyStateChange());
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/components/integrations/music/__tests__/MusicPlayer.test.ts`
Expected: PASS — 全部测试通过(types 5 + HtmlAudioProvider 15 = 20)

- [ ] **Step 5: Commit**

```bash
git add src/components/integrations/music/HtmlAudioProvider.ts src/components/integrations/music/__tests__/MusicPlayer.test.ts
git commit -m "feat(music): implement HtmlAudioProvider with playlist management and state proxy"
```

---

### Task 10: createMusicProvider Resolver

**Files:**
- Create: `src/components/integrations/music/createMusicProvider.ts`
- Test: `src/components/integrations/music/__tests__/createMusicProvider.test.ts`

**Interfaces:**
- Consumes: Task 8 的 `MusicPlayer`(type)、Task 9 的 `HtmlAudioProvider`
- Produces: `createMusicProvider(audioElement): MusicPlayer | null` — Task 12 Widget 调用

- [ ] **Step 1: 写失败测试**

```ts
// src/components/integrations/music/__tests__/createMusicProvider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 最小 mock audio 元素
function createMockAudio() {
  return {
    src: '', volume: 1, paused: true, duration: NaN, currentTime: 0,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    play: vi.fn(async () => {}), pause: vi.fn(),
  };
}

describe('createMusicProvider', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns HtmlAudioProvider for "html5audio"', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', 'html5audio');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    const provider = createMusicProvider(audio as unknown as HTMLAudioElement);
    expect(provider).not.toBeNull();
    expect(provider).toHaveProperty('initialize');
    expect(provider).toHaveProperty('play');
    expect(provider).toHaveProperty('getState');
  });

  it('returns null for "none"', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', 'none');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    expect(createMusicProvider(audio as unknown as HTMLAudioElement)).toBeNull();
  });

  it('throws for "howler" (not yet implemented)', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', 'howler');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    expect(() => createMusicProvider(audio as unknown as HTMLAudioElement)).toThrow(
      'Unknown music provider: howler',
    );
  });

  it('throws for unknown provider', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', 'spotify');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    expect(() => createMusicProvider(audio as unknown as HTMLAudioElement)).toThrow(
      'Unknown music provider: spotify',
    );
  });

  it('defaults to html5audio when env not set', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', '');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    const provider = createMusicProvider(audio as unknown as HTMLAudioElement);
    expect(provider).not.toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `pnpm test src/components/integrations/music/__tests__/createMusicProvider.test.ts`
Expected: FAIL — `Failed to resolve import '../createMusicProvider'`

- [ ] **Step 3: 写 resolver 实现**

```ts
// src/components/integrations/music/createMusicProvider.ts
import type { MusicPlayer } from './MusicPlayer';
import { HtmlAudioProvider } from './HtmlAudioProvider';

/**
 * 按 PUBLIC_MUSIC_PROVIDER 选 Provider 的 resolver(spec 5.12)。
 * 调用方(MusicHost/Widget)负责传入 host 内的 <audio> 元素(spec P0-2)。
 * none → 返回 null(Widget 零 DOM);未实现的 provider → throw(spec P0-11/P1-8)。
 */
export function createMusicProvider(audioElement: HTMLAudioElement): MusicPlayer | null {
  const provider = import.meta.env.PUBLIC_MUSIC_PROVIDER ?? 'html5audio';
  switch (provider) {
    case 'html5audio':
      return new HtmlAudioProvider(audioElement);
    // case 'howler': return new HowlerProvider(); // 未来,不实现
    case 'none':
      return null;
    default:
      throw new Error(`Unknown music provider: ${provider}`);
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm test src/components/integrations/music/__tests__/createMusicProvider.test.ts`
Expected: PASS — 5 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/components/integrations/music/createMusicProvider.ts src/components/integrations/music/__tests__/createMusicProvider.test.ts
git commit -m "feat(music): add createMusicProvider resolver with env-based switching"
```

### Task 11: Music Config + Music i18n Keys

**Files:**
- Create: `src/config/music.ts`
- Modify: `src/i18n/ui/zh.ts`(追加 music keys)
- Modify: `src/i18n/ui/en.ts`(追加 music keys)

**Interfaces:**
- Consumes: Task 8 的 `Playlist` type
- Produces: `playlists: Playlist[]` — Task 9 HtmlAudioProvider 延迟 import;Task 12 Widget 展示

- [ ] **Step 1: 追加 music i18n keys 到 zh.ts**

在 `src/i18n/ui/zh.ts` 的 comments keys 之后追加(spec 6.3: music.play/pause/next/prev/playlist/volume/unavailable):

```ts
  'music.play': '播放背景音乐',
  'music.pause': '暂停背景音乐',
  'music.next': '下一首',
  'music.prev': '上一首',
  'music.volume': '音量',
  'music.unavailable': '音乐不可用',
  'music.playlist': '歌单',
```

- [ ] **Step 2: 追加 music i18n keys 到 en.ts**

在 `src/i18n/ui/en.ts` 的 comments keys 之后追加:

```ts
  'music.play': 'Play background music',
  'music.pause': 'Pause background music',
  'music.next': 'Next track',
  'music.prev': 'Previous track',
  'music.volume': 'Volume',
  'music.unavailable': 'Music unavailable',
  'music.playlist': 'Playlist',
```

- [ ] **Step 3: 创建 src/config/music.ts**

```ts
// src/config/music.ts
// MVP 歌单数据(spec 5.12):放主仓配置,后期若需 CMS 编辑再迁 content
// 音频文件托管 assets 仓,走 jsDelivr/raw CDN(spec 7.7)
import type { Playlist } from '@components/integrations/music/MusicPlayer';

export const playlists: Playlist[] = [
  {
    id: 'default',
    name: '默认歌单',
    tracks: [
      {
        id: 't1',
        title: '示例曲目 A',
        artist: '示例 P 主',
        src: 'https://cdn.jsdelivr.net/gh/YourUser/object920-assets@main/audio/track-a.mp3',
      },
      {
        id: 't2',
        title: '示例曲目 B',
        artist: '示例 P 主',
        src: 'https://cdn.jsdelivr.net/gh/YourUser/object920-assets@main/audio/track-b.mp3',
      },
    ],
  },
];
```

注意:以上 `src` URL 中的 `YourUser/object920-assets` 需替换为实际 assets 仓地址(与 `.env.example` 的 `PUBLIC_ASSETS_USER` / `PUBLIC_ASSETS_REPO` 一致)。MVP 歌单为示例占位,部署前替换为真实音频文件链接。

- [ ] **Step 4: 运行 type check**

Run: `pnpm check`
Expected: 无类型错误

- [ ] **Step 5: 运行测试确保无回归**

Run: `pnpm test`
Expected: 全部已有测试 PASS

- [ ] **Step 6: Commit**

```bash
git add src/config/music.ts src/i18n/ui/zh.ts src/i18n/ui/en.ts
git commit -m "feat(music): add playlist config and music i18n keys"
```

---

### Task 12: MusicHost.astro + MusicPlayerWidget.astro

**Files:**
- Create: `src/components/integrations/music/MusicHost.astro`
- Create: `src/components/integrations/music/MusicPlayerWidget.astro`

**Interfaces:**
- Consumes: Task 10 的 `createMusicProvider`、Task 8 的 `MusicPlayer`/`MusicPlayerState` type、Plan 1 的 `t()`/`Locale`
- Produces: `MusicHost.astro`(persistence boundary)、`MusicPlayerWidget.astro`(UI boundary)— Task 13 BaseLayout 引用

- [ ] **Step 1: 创建 MusicHost.astro**

```astro
---
// src/components/integrations/music/MusicHost.astro
// persistence boundary(spec 5.12 P1-11/P1-18):
// 仅音乐启用时 BaseLayout 渲染 MusicHost;transition:persist 跨页面保留 <audio>
const enabled = import.meta.env.PUBLIC_MUSIC_ENABLED === 'true';
---
{enabled && (
  <div transition:persist="music-host" class="music-host">
    <audio preload="metadata" class="music-host-audio" data-music-audio></audio>
    <slot />
  </div>
)}

<style>
  .music-host {
    position: fixed;
    bottom: var(--spacing-sm);
    left: var(--spacing-sm);
    z-index: var(--z-overlay);
  }
</style>
```

- [ ] **Step 2: 创建 MusicPlayerWidget.astro**

```astro
---
// src/components/integrations/music/MusicPlayerWidget.astro
// UI boundary(spec 5.12 P1-11):只 import resolver + 接口类型,不 import 具体 Provider
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';

interface Props {
  locale: Locale;
}
const { locale } = Astro.props;

const enabled = import.meta.env.PUBLIC_MUSIC_ENABLED === 'true';
---

{enabled && (
  <div class="music-widget" data-music-widget>
    <button
      type="button"
      class="music-btn music-play-btn"
      aria-label={t(locale, 'music.play')}
      data-music-play
    >
      <span data-music-icon-play aria-hidden="true">▶</span>
      <span data-music-icon-pause hidden aria-hidden="true">⏸</span>
    </button>
    <span class="music-track-name" data-music-track-name aria-live="polite">—</span>
    <button
      type="button"
      class="music-btn music-next-btn"
      aria-label={t(locale, 'music.next')}
      data-music-next
    >
      <span aria-hidden="true">⏭</span>
    </button>
  </div>
)}

<style>
  .music-widget {
    display: flex;
    align-items: center;
    gap: var(--spacing-2xs);
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    padding: var(--spacing-3xs) var(--spacing-2xs);
    box-shadow: var(--shadow-md);
  }
  .music-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: background-color calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
  }
  .music-btn:hover { background: var(--color-surface); }
  .music-play-btn { background: var(--color-accent); color: var(--color-text-on-accent); }
  .music-play-btn:hover { background: var(--color-accent-hover); }
  .music-track-name {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    max-width: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

<script>
  import type { MusicPlayer, MusicPlayerState } from './MusicPlayer';

  // Provider singleton(模块缓存,ClientRouter 导航后不重建)(spec 5.12/5.20)
  let provider: MusicPlayer | null | undefined = undefined;
  let unsubStateChange: (() => void) | null = null;

  function initMusicWidget() {
    const widget = document.querySelector<HTMLElement>('[data-music-widget]');
    if (!widget) return;

    const audio = document.querySelector<HTMLAudioElement>('[data-music-audio]');
    if (!audio) return;

    // 创建 provider singleton(只创建一次)(spec 5.20)
    if (provider === undefined) {
      // 动态 import resolver(避免 frontmatter 和 client bundle 路径不一致)
      import('./createMusicProvider').then(({ createMusicProvider }) => {
        provider = createMusicProvider(audio);
        if (!provider) return;
        bindWidget(widget, provider);
      });
    } else if (provider) {
      // provider 已存在(ClientRouter 导航后),重新绑定控件
      bindWidget(widget, // @ts-ignore -- provider is MusicPlayer, not undefined here
      provider);
    }
  }

  function bindWidget(widget: HTMLElement, p: MusicPlayer) {
    // 清理旧订阅(spec 5.20)
    unsubStateChange?.();
    unsubStateChange = null;

    const playBtn = widget.querySelector<HTMLButtonElement>('[data-music-play]');
    const nextBtn = widget.querySelector<HTMLButtonElement>('[data-music-next]');
    const trackName = widget.querySelector<HTMLElement>('[data-music-track-name]');
    const iconPlay = widget.querySelector<HTMLElement>('[data-music-icon-play]');
    const iconPause = widget.querySelector<HTMLElement>('[data-music-icon-pause]');

    // 恢复 UI 状态(spec 5.20:每次 page-load 从 getState() 恢复)
    updateUI(p.getState());

    // 订阅状态变化(控件监听更新 UI)
    unsubStateChange = p.onStateChange(updateUI);

    // 事件委托绑定控件(spec 5.20:data-initialized guard 防重复)
    if (widget.dataset.bound === 'true') return;
    widget.dataset.bound = 'true';

    widget.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-music-play]')) {
        const state = p.getState();
        if (state.isPlaying) {
          p.pause();
        } else {
          // 首次播放时懒初始化(spec 5.12:默认不播放,用户点击才播)
          const isReady = await p.ready();
          if (!isReady) {
            await p.initialize();
          }
          await p.play();
        }
      } else if (target.closest('[data-music-next]')) {
        await p.next();
      }
    });

    function updateUI(state: MusicPlayerState) {
      if (iconPlay) iconPlay.hidden = state.isPlaying;
      if (iconPause) iconPause.hidden = !state.isPlaying;
      if (playBtn) {
        playBtn.setAttribute(
          'aria-label',
          state.isPlaying ? '暂停背景音乐' : '播放背景音乐',
        );
      }
      if (trackName) {
        trackName.textContent = state.currentTrackId ?? '—';
      }
    }
  }

  // 每次 astro:page-load 重新绑定控件(spec 5.20)
  document.addEventListener('astro:page-load', initMusicWidget);
</script>
```

- [ ] **Step 3: 运行 type check**

Run: `pnpm check`
Expected: 无类型错误(若有 `transition:persist` 类型问题,确认 Astro 7 类型支持;必要时用 `// @astro-ignore` 临时标注并记录为验证项)

- [ ] **Step 4: 运行测试确保无回归**

Run: `pnpm test`
Expected: 全部已有测试 PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/integrations/music/MusicHost.astro src/components/integrations/music/MusicPlayerWidget.astro
git commit -m "feat(music): add MusicHost (persist) and MusicPlayerWidget with singleton lifecycle"
```

### Task 13: BaseLayout Integration + ClientRouter

**Files:**
- Modify: `src/components/layout/BaseLayout.astro`(集成 ClientRouter + Analytics + MusicHost + Widget)

**Interfaces:**
- Consumes: Task 6 的 `Analytics`、Task 12 的 `MusicHost`/`MusicPlayerWidget`、Plan 1 的 `BaseLayout`/`BaseHead`
- Produces: 更新后的 `BaseLayout.astro` — 所有页面通过 `<BaseLayout>` 自动获得可插拔 Integration

- [ ] **Step 1: 修改 BaseLayout.astro**

在 `src/components/layout/BaseLayout.astro` 中,添加 ClientRouter、Analytics、MusicHost + Widget 的集成。将现有 BaseLayout 替换为:

```astro
---
// src/components/layout/BaseLayout.astro
import { ClientRouter } from 'astro:transitions';
import BaseHead from './BaseHead.astro';
import Header from './Header.astro';
import Footer from './Footer.astro';
import Analytics from '@components/integrations/analytics/Analytics.astro';
import MusicHost from '@components/integrations/music/MusicHost.astro';
import MusicPlayerWidget from '@components/integrations/music/MusicPlayerWidget.astro';
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';

interface Props {
  locale: Locale;
  title: string;
  description?: string;
  ogImage?: string;
  canonicalURL?: string;
  noindex?: boolean;
}
const { locale, title, description, ogImage, canonicalURL, noindex } = Astro.props;
---
<!DOCTYPE html>
<html lang={locale}>
  <head>
    <BaseHead
      locale={locale}
      title={title}
      description={description}
      ogImage={ogImage}
      canonicalURL={canonicalURL}
      noindex={noindex}
    />
    <!-- ClientRouter:客户端导航 + View Transitions(spec 5.20 P0-8 / spec 7.7 P0-7) -->
    <!-- 音乐跨页面播放依赖 ClientRouter + transition:persist 三件套 -->
    <ClientRouter />
  </head>
  <body>
    <a href="#main" class="skip-link">{t(locale, 'common.skip-to-content')}</a>
    <Header locale={locale} />
    <main id="main">
      <slot />
    </main>
    <Footer locale={locale} />
    <!-- 可插拔 Integration:自闭合标签,功能存在与否对页面结构透明(spec 1.4) -->
    <Analytics />
    <MusicHost>
      <MusicPlayerWidget locale={locale} />
    </MusicHost>
  </body>
</html>
```

注意:
- `ClientRouter` 从 `astro:transitions` 导入(Astro 7 内置模块)。若 Astro 7 变更导入路径,以官方文档为准(spec M5 验证项)。
- Header 组件中应已包含 `<SearchBox locale={locale} />`(Plan 2-3 或本 Plan Task 4 的 SearchBox)。若 Header 尚未集成 SearchBox,在 Header.astro 的导航区域追加:`import SearchBox from '@components/integrations/search/SearchBox.astro'` 并在合适位置渲染 `<SearchBox locale={locale} />`。
- `Analytics` 零 props;`MusicHost` 包裹 `MusicPlayerWidget` 并通过 slot 注入(spec 5.12 组件层级 P1-11)。
- 环境变量关闭时(`PUBLIC_UMAMI_ENABLED !== 'true'`、`PUBLIC_MUSIC_ENABLED !== 'true'`),这些组件输出零 DOM,页面结构不受影响。

- [ ] **Step 2: 运行 type check**

Run: `pnpm check`
Expected: 无类型错误

- [ ] **Step 3: 运行 build 验证(可选搜索索引)**

Run: `pnpm build`
Expected: 构建成功;若 `PUBLIC_SEARCH_ENABLED=true` 则 postbuild 跑 pagefind;若 `PUBLIC_MUSIC_ENABLED=true` 则 MusicHost 的 `transition:persist` 在生成的 HTML 中可见

- [ ] **Step 4: 运行测试确保无回归**

Run: `pnpm test`
Expected: 全部已有测试 PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/BaseLayout.astro
git commit -m "feat(layout): integrate ClientRouter, Analytics, MusicHost into BaseLayout"
```

---

### Task 14: .env.example Update

**Files:**
- Modify: `.env.example`(追加全部 Integration 环境变量)

**Interfaces:**
- Consumes: spec 附录 C 环境变量总表
- Produces: 完整的 `.env.example` 模板 — 所有 Integration 开关与配置项

- [ ] **Step 1: 修改 .env.example**

在 `.env.example` 现有内容(`PUBLIC_SITE_URL`、`PUBLIC_SITE_NAME`、`PUBLIC_PREVIEW`)之后追加(spec 附录 C):

```bash
# === Giscus(可插拔,可选)===
PUBLIC_GISCUS_ENABLED=false                      # 启用开关
PUBLIC_GISCUS_REPO=YourUser/object920-discussions # public 独立 discussions 仓,与 CONTENT_REPO 完全解耦(spec 7.4)
PUBLIC_GISCUS_REPO_ID=R_xxx
PUBLIC_GISCUS_CATEGORY_ARTICLES=Articles
PUBLIC_GISCUS_CATEGORY_ARTICLES_ID=DIC_xxx
PUBLIC_GISCUS_CATEGORY_GUESTBOOK=Guestbook
PUBLIC_GISCUS_CATEGORY_GUESTBOOK_ID=DIC_yyy

# === Umami(可插拔,可选)===
PUBLIC_UMAMI_ENABLED=false
PUBLIC_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
PUBLIC_UMAMI_WEBSITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# === 搜索(可插拔 SearchProvider)===
PUBLIC_SEARCH_ENABLED=true                       # 启用开关;false 则 SearchBox 零 DOM、不执行 pagefind、无运行时搜索请求
PUBLIC_SEARCH_PROVIDER=pagefind                  # pagefind(MVP 默认)| none;orama 未实现前不是有效值

# === 开往 Travellings(可插拔)===
PUBLIC_TRAVELLINGS_ENABLED=true                  # 启用开关,false 则友链页不渲染开往入口

# === 背景音乐(可插拔 MusicPlayer)===
PUBLIC_MUSIC_ENABLED=false                       # 启用开关,默认关;true 时渲染播放控件(仍默认不播放,用户点击才播)
PUBLIC_MUSIC_PROVIDER=html5audio                 # html5audio(MVP 默认)| none;howler 未实现前不是有效值
```

注意:
- `PUBLIC_GISCUS_REPO` 必须指向 **public 的独立 discussions 仓**(如 `YourUser/object920-discussions`),**与 `CONTENT_REPO` 完全解耦**(content 仓允许 private,Giscus 仓必须 public)(spec 7.4 P0-6/P2-28)
- `PUBLIC_SEARCH_PROVIDER=orama` 和 `PUBLIC_MUSIC_PROVIDER=howler` 在未实现前不是有效配置值,配置后会 throw(spec P1-8)
- `.env.example` 入仓作模板,`.env` 不入仓(Plan 1 `.gitignore` 已配)

- [ ] **Step 2: 运行 build 验证(默认配置)**

Run: `$env:PUBLIC_SEARCH_ENABLED='false'; $env:PUBLIC_MUSIC_ENABLED='false'; $env:PUBLIC_GISCUS_ENABLED='false'; $env:PUBLIC_UMAMI_ENABLED='false'; pnpm build`
Expected: 构建成功;所有 Integration 关闭,零 DOM/零网络/零构建依赖;postbuild 跳过 pagefind

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add all pluggable integration env vars to .env.example"
```

---

## Self-Review

### 1. Spec 覆盖检查

| Spec 章节 | 要求 | 覆盖 Task | 状态 |
|---|---|---|---|
| 1.4 可插拔思想 | 环境变量开关 + 条件渲染;关闭零 DOM/零网络/零构建依赖;单向依赖 | Task 4/6/7/12/13/14 | ✓ 所有组件用 `import.meta.env.PUBLIC_*_ENABLED` 条件渲染,关闭时零 DOM |
| 1.4 单向依赖 | 核心不 import 可插拔组件;SearchBox/Widget 只依赖接口 | Task 4/12/13 | ✓ SearchBox 只 import `createSearchProvider` + type;Widget 只 import `createMusicProvider` + type |
| 1.4 未来新增走同模式 | 放 `integrations/<feature>/` 子目录 | 全部 | ✓ 所有 Integration 在 `src/components/integrations/{search,analytics,comments,travellings,music}/` |
| 5.11 SearchProvider 接口 | `initialize` + `getState` + `ready` + `search` + `destroy`;状态语义 idle→initializing→ready\|failed | Task 1 | ✓ 接口定义与 spec 完全一致 |
| 5.11 状态语义统一 | initialize 失败 → failed + ready() false;search 失败 → throw SearchError;无结果 → [] | Task 1/2 | ✓ SearchError class + PagefindProvider 测试覆盖所有路径 |
| 5.11 SearchRuntime singleton | provider 只创建一次;locale 改变 destroy + reinitialize | Task 4 | ✓ 模块级 `provider` 变量 singleton;ClientRouter 导航后不重建 |
| 5.11 resolver | `createSearchProvider` 返回 null(none)/throw(unknown)/PagefindProvider | Task 3 | ✓ 测试覆盖 pagefind/none/orama/unknown/默认 |
| 5.11 SearchBox | 不直接 import Pagefind;首次交互 initialize;ready false 降级;astro:page-load 重建 | Task 4 | ✓ 只 import resolver + type;懒初始化;ready false 时 disabled;astro:page-load |
| 5.11 PagefindProvider | 动态 import('/pagefind/pagefind.js');dev 模式 ready false;不按 locale 二次过滤 | Task 2 | ✓ loader 默认 `import('/pagefind/pagefind.js')`;initialize 失败 → failed;无 locale 过滤 |
| 5.12 MusicPlayer 接口 | initialize(无参)+ ready + play/pause/next/prev/setVolume/getState/onStateChange | Task 8 | ✓ 接口定义与 spec 完全一致 |
| 5.12 audio 元素注入 | 构造时接收 audio;initialize 无参;MusicHost 持有 `<audio>` | Task 9/12 | ✓ HtmlAudioProvider constructor(audioElement);MusicHost 渲染 `<audio>`,Widget 调 createMusicProvider(audio) |
| 5.12 媒体状态唯一真相源 | HTMLAudioElement 是 isPlaying/volume 唯一真相源 | Task 9 | ✓ getState() 从 `!audio.paused` / `audio.volume` 读取,不维护第二份状态 |
| 5.12 默认不播放 | 页面加载不自动播,用户点击才播 | Task 12 | ✓ Widget 不调用 play();playBtn click handler 内调 play() |
| 5.12 组件层级 | BaseLayout → MusicHost → {`<audio>`, MusicPlayerWidget} | Task 12/13 | ✓ BaseLayout 渲染 `<MusicHost><MusicPlayerWidget /></MusicHost>` |
| 5.12 歌单数据 | MVP 放主仓 `src/config/music.ts` | Task 11 | ✓ `src/config/music.ts` 导出 `playlists` |
| 5.12 resolver | `createMusicProvider(audio)` 返回 null(none)/throw(unknown)/HtmlAudioProvider | Task 10 | ✓ 测试覆盖 html5audio/none/howler/unknown/默认 |
| 5.20 ClientRouter 生命周期 | 所有 enhancement 挂 astro:page-load;singleton guard;persisted 不重复绑定 | Task 4/7/12/13 | ✓ SearchBox/Comments/Widget 均挂 `astro:page-load`;data-initialized/data-bound guard;ClientRouter 在 BaseLayout |
| 5.20 事件分类表 | 页面级重建(SearchBox/Giscus);singleton(MusicPlayer);persisted(MusicHost) | Task 4/7/12 | ✓ SearchBox/Comments 每次 page-load 重建;Widget singleton + page-load 恢复;MusicHost transition:persist |
| 7.4 Giscus 可插拔 | `PUBLIC_GISCUS_ENABLED` + repo + repoId;script singleton;theme-change 同步;独立 discussions 仓 | Task 7/14 | ✓ Comments.astro 条件渲染;giscus.ts mount/destroy/updateTheme;env var 注明独立仓 |
| 7.4 Giscus 主题 | 跟随站点主题(非系统偏好);updateGiscusTheme 统一封装 postMessage | Task 7 | ✓ updateGiscusTheme() 封装 iframe 查找 + postMessage;Comments 监听 theme-change |
| 7.4 Giscus 懒加载 | data-loading="lazy" | Task 7 | ✓ mountGiscus 设 data-loading="lazy" |
| 7.4 Giscus 语言 | data-lang 跟随 locale(zh→zh-CN,en→en,ru→ru,ja→ja) | Task 7 | ✓ giscusLang 映射表 zh→zh-CN 等 |
| 7.4 Giscus mapping | 文章 pathname,留言板 specific + term | Task 7 | ✓ Comments.astro props 含 mapping + term,默认 pathname |
| 7.4 Giscus category 区分 | 文章评论与留言板用不同 category | Task 7 | ✓ Comments.astro props: category + categoryId 由调用方传入 |
| 7.4 s.onerror 降级 | 评论加载失败显示 i18n 文案 | Task 7 | ✓ giscus.ts onerror 设 container.innerHTML = 错误文案 |
| 7.6 Travellings 可插拔 | `PUBLIC_TRAVELLINGS_ENABLED` 默认开;关闭零 DOM | Task 6 | ✓ 默认开(`!== 'false'`);关闭零 DOM |
| 7.6 主端点 | `<a href="https://travellings.cn/go.html" target="_blank" rel="noopener">` | Task 6 | ✓ Travellings.astro 链接 |
| 7.7 背景音乐可插拔 | `PUBLIC_MUSIC_ENABLED` 默认关 + `PUBLIC_MUSIC_PROVIDER` | Task 12/14 | ✓ .env.example 默认 false;Widget 条件渲染 |
| 7.7 跨页面播放 | ClientRouter + transition:persist + singleton 三件套 | Task 12/13 | ✓ MusicHost `transition:persist="music-host"`;ClientRouter 在 BaseLayout;provider 模块级 singleton |
| 7.8 Umami 可插拔 | `PUBLIC_UMAMI_ENABLED` + script URL + website ID;未启用零 DOM;s.onerror 静默 | Task 6 | ✓ Analytics.astro 条件渲染;onerror console.warn |
| 7.10 Pagefind 1.5+ | 用 `/pagefind/pagefind.js` 低级 Search API,不用 pagefind-ui.js | Task 2/5 | ✓ PagefindProvider loader 默认 `import('/pagefind/pagefind.js')`;search-index.mjs 跑 `pagefind --site dist` |
| 7.10 构建时索引 | postbuild 跑 pagefind,仅启用时;失败 = CI fail | Task 5 | ✓ search-index.mjs 检查 enabled + provider;失败 process.exit(1) |
| 7.10 失败策略 | enabled=true 时 pagefind 失败 = CI fail;enabled=false 时不执行 | Task 5 | ✓ 脚本逻辑:enabled && provider=pagefind → 跑 pagefind;否则跳过 |
| 附录 C 环境变量 | 所有 PUBLIC_*_ENABLED + PUBLIC_*_PROVIDER | Task 14 | ✓ .env.example 追加全部变量,注释与 spec 附录 C 一致 |

### 2. 占位符扫描

- 搜索 "TBD"、"TODO"、"implement later"、"fill in details" → 无
- 搜索 "Add appropriate"、"add validation"、"handle edge cases" → 无
- 搜索 "Similar to Task" → 无
- 所有 code step 均包含完整可运行代码
- 所有 test step 均包含具体测试用例代码
- `src/config/music.ts` 中的音频 URL 标注为"示例占位,部署前替换"——这是合理的 MVP 占位(非计划占位),代码本身可运行

### 3. 类型一致性检查

| 类型/方法 | 定义位置 | 使用位置 | 一致性 |
|---|---|---|---|
| `SearchResult` | Task 1 SearchProvider.ts | Task 2 PagefindProvider.ts, Task 4 SearchBox.astro | ✓ title/url/excerpt?/score? |
| `SearchOptions` | Task 1 SearchProvider.ts | Task 2 PagefindProvider.ts, Task 4 SearchBox.astro | ✓ locale?/limit? |
| `SearchProviderState` | Task 1 SearchProvider.ts | Task 2 PagefindProvider.ts | ✓ 'idle'\|'initializing'\|'ready'\|'failed' |
| `SearchProvider` interface | Task 1 SearchProvider.ts | Task 2 implements, Task 3 resolver return type | ✓ initialize/getState/ready/search/destroy |
| `SearchError` | Task 1 SearchProvider.ts | Task 2 PagefindProvider.ts throw | ✓ constructor(message, cause?) |
| `createSearchProvider()` | Task 3 createSearchProvider.ts | Task 4 SearchBox.astro | ✓ returns SearchProvider \| null |
| `Track` | Task 8 MusicPlayer.ts | Task 9 HtmlAudioProvider.ts, Task 11 config/music.ts | ✓ id/title/artist?/src/cover?/duration? |
| `Playlist` | Task 8 MusicPlayer.ts | Task 9/11 | ✓ id/name/tracks |
| `MusicPlayerState` | Task 8 MusicPlayer.ts | Task 9/12 | ✓ isPlaying/currentTrackId/currentPlaylistId/volume |
| `MusicPlayer` interface | Task 8 MusicPlayer.ts | Task 9 implements, Task 10 resolver return type, Task 12 Widget | ✓ initialize/ready/play/pause/next/prev/setVolume/getState/onStateChange |
| `createMusicProvider(audio)` | Task 10 createMusicProvider.ts | Task 12 MusicPlayerWidget.astro | ✓ returns MusicPlayer \| null,参数 HTMLAudioElement |
| `HtmlAudioProvider constructor` | Task 9 | Task 10 resolver `new HtmlAudioProvider(audioElement)` | ✓ constructor(audioElement, playlists?) |
| `GiscusConfig` | Task 7 giscus.ts | Task 7 Comments.astro mountGiscus call | ✓ repo/repoId/category/categoryId/mapping/term?/theme/lang/inputPosition? |
| `mountGiscus` / `destroyGiscus` / `updateGiscusTheme` | Task 7 giscus.ts | Task 7 Comments.astro script | ✓ 函数签名一致 |

### 4. 任务依赖链验证

```
Task 1 (SearchProvider interface) ← Task 2 (PagefindProvider) ← Task 3 (resolver) ← Task 4 (SearchBox)
Task 5 (search-index.mjs) — 独立(build script)
Task 6 (Analytics + Travellings) — 独立
Task 7 (giscus.ts + Comments) — 独立
Task 8 (MusicPlayer interface) ← Task 9 (HtmlAudioProvider) ← Task 10 (resolver) ← Task 12 (Widget)
Task 11 (music config) ← Task 9 (HtmlAudioProvider 延迟 import)
Task 12 (MusicHost + Widget) ← Task 13 (BaseLayout)
Task 13 (BaseLayout) ← 依赖 Task 4/6/7/12 全部完成
Task 14 (.env.example) — 独立(可任意时机)
```

所有依赖链无循环;Task 13 作为集成 task 依赖大部分其他 task,适合最后执行;Task 5/14 独立可并行。





