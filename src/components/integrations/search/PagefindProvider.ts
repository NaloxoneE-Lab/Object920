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
    // /pagefind/pagefind.js 是 postbuild 生成的运行时产物,构建期不存在;
    // @vite-ignore 阻止 Vite 静态解析(spec 7.10)
    this.loader = loader ?? (() => import(/* @vite-ignore */ '/pagefind/pagefind.js' as string));
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
