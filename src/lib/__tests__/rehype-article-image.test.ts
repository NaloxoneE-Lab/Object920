// src/lib/__tests__/rehype-article-image.test.ts
import { describe, it, expect } from 'vitest';
import { rehypeArticleImage } from '@lib/rehype-article-image';

/* eslint-disable @typescript-eslint/no-explicit-any */
type N = any;
const img = (src: string, alt: string, title?: string): N => ({
  type: 'element',
  tagName: 'img',
  properties: { src, alt, ...(title ? { title } : {}) },
  children: [],
});
const p = (...children: N[]): N => ({ type: 'element', tagName: 'p', properties: {}, children });
const run = (tree: N) => {
  rehypeArticleImage()(tree);
  return tree;
};

describe('rehypeArticleImage', () => {
  it('wraps local image with alt+title in figure with figcaption', () => {
    const t = run({ type: 'root', children: [p(img('./cat.webp', 'A cat', 'My cat'))] });
    const fig = t.children[0];
    expect(fig.tagName).toBe('figure');
    expect(fig.children[0].tagName).toBe('img');
    expect(fig.children[0].properties.dataArticleImage).toBe('');
    expect(fig.children[0].properties.dataLightbox).toBe('');
    expect(fig.children[1].tagName).toBe('figcaption');
    expect(fig.children[1].children[0].value).toBe('My cat');
  });

  it('wraps local image with alt but no title in figure without figcaption', () => {
    const t = run({ type: 'root', children: [p(img('./cat.webp', 'A cat'))] });
    const fig = t.children[0];
    expect(fig.tagName).toBe('figure');
    expect(fig.children).toHaveLength(1);
    expect(fig.children[0].properties.dataLightbox).toBe('');
  });

  it('leaves decorative image (alt="") in p with data-article-image but no lightbox/figure', () => {
    const t = run({ type: 'root', children: [p(img('./deco.webp', ''))] });
    const node = t.children[0];
    expect(node.tagName).toBe('p');
    expect(node.children[0].properties.dataArticleImage).toBe('');
    expect(node.children[0].properties.dataLightbox).toBeUndefined();
  });

  it('keeps remote image in p with loading=lazy + data-lightbox, no figure', () => {
    const t = run({ type: 'root', children: [p(img('https://cdn.example.com/x.png', 'remote'))] });
    const node = t.children[0];
    expect(node.tagName).toBe('p');
    expect(node.children[0].properties.loading).toBe('lazy');
    expect(node.children[0].properties.dataLightbox).toBe('');
  });

  it('does not wrap inline image inside text paragraph', () => {
    const t = run({
      type: 'root',
      children: [
        p({ type: 'text', value: 'see ' }, img('./x.webp', 'x'), { type: 'text', value: ' here' }),
      ],
    });
    expect(t.children[0].tagName).toBe('p');
  });
});
