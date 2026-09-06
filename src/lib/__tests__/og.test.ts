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
