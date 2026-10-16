// src/lib/__tests__/toc.test.ts
import { describe, it, expect } from 'vitest';
import { tocHeadings } from '@lib/toc';

const h = (depth: number, slug: string, text = slug) => ({ depth, slug, text });

describe('tocHeadings', () => {
  it('keeps h2/h3 and drops deeper/ shallower headings', () => {
    const items = tocHeadings([h(1, 'title'), h(2, 'a'), h(3, 'b'), h(4, 'c')]);
    expect(items.map((i) => i.slug)).toEqual(['a', 'b']);
  });

  it('drops the sr-only GFM footnote label heading', () => {
    const items = tocHeadings([h(2, 'a'), h(2, 'footnote-label', 'Footnotes')]);
    expect(items.map((i) => i.slug)).toEqual(['a']);
  });

  it('tolerates undefined headings', () => {
    expect(tocHeadings(undefined)).toEqual([]);
  });
});
