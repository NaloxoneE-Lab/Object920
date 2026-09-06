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
