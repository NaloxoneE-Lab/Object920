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

// /pagefind/pagefind.js 是 postbuild 生成的运行时产物,构建期不存在。
// 必须经变量间接引用:字面量 + `as string` 断言会让 esbuild 丢掉 @vite-ignore
// 注解,vite:import-analysis 便会尝试静态解析并在 dev 模式直接报错(spec 7.10)。
// ?v= 用于击穿浏览器对旧 pagefind.js 的缓存:pagefind 以自身为 Worker,Worker 继承
// 其响应头里的 CSP——缓存旧响应会把旧 CSP 一起带给 Worker,拦掉新放行的 WASM
const PAGEFIND_ENTRY = '/pagefind/pagefind.js?v=2';
// pagefind 的 Worker 脚本;历史部署曾对 /pagefind/ 全目录下发 86400s 缓存,
// 旧访问者 HTTP 缓存里滞留着带旧 CSP 头的本文件(见 initialize 内缓存自愈)
const PAGEFIND_WORKER_ENTRY = '/pagefind/pagefind-worker.js';

export class PagefindProvider implements SearchProvider {
  private state: SearchProviderState = 'idle';
  private pagefind: PagefindModule | null = null;
  private readonly loader: PagefindLoader;

  constructor(loader?: PagefindLoader) {
    this.loader = loader ?? (() => import(/* @vite-ignore */ PAGEFIND_ENTRY));
  }

  async initialize(): Promise<void> {
    if (this.state === 'initializing' || this.state === 'ready') return;
    this.state = 'initializing';
    try {
      // 缓存自愈:Worker 继承其脚本响应头里的 CSP,滞留的旧缓存会拦掉新放行的
      // WASM;首次初始化时强制刷新一次该缓存(必须在 Worker 创建前),失败不阻塞
      try {
        await fetch(PAGEFIND_WORKER_ENTRY, { cache: 'reload' });
      } catch {
        /* 离线等场景自愈失败,交由下方原错误路径兜底 */
      }
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
