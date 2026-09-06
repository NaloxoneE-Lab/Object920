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
