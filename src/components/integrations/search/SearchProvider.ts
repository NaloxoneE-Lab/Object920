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
