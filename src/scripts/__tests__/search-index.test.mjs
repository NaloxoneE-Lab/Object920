// src/scripts/__tests__/search-index.test.mjs
import { describe, it, expect } from 'vitest';
import { resolveSearchAction } from '../search-index.mjs';

describe('resolveSearchAction', () => {
  it('returns skip when search disabled', () => {
    expect(resolveSearchAction({ PUBLIC_SEARCH_ENABLED: 'false' })).toBe('skip');
  });

  it('defaults to enabled when PUBLIC_SEARCH_ENABLED not set (spec 附录 C 默认 true)', () => {
    expect(resolveSearchAction({})).toBe('run-pagefind');
  });

  it('returns skip when search explicitly disabled', () => {
    expect(resolveSearchAction({ PUBLIC_SEARCH_ENABLED: 'false' })).toBe('skip');
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
