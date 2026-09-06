// src/lib/__tests__/rehype-codeblock.test.ts
import { describe, it, expect } from 'vitest';
import { rehypeCodeblock } from '@lib/rehype-codeblock';

/* eslint-disable @typescript-eslint/no-explicit-any */
type N = any;
const code = (className: string[], text: string): N => ({
  type: 'element',
  tagName: 'code',
  properties: { className },
  children: [{ type: 'text', value: text }],
});
const pre = (c: N): N => ({ type: 'element', tagName: 'pre', properties: {}, children: [c] });
const run = (tree: N) => {
  rehypeCodeblock()(tree);
  return tree;
};

describe('rehypeCodeblock', () => {
  it('wraps pre/code in div.code-block with header, lang label, copy button', () => {
    const t = run({ type: 'root', children: [pre(code(['language-ts'], 'const x = 1;'))] });
    const wrapper = t.children[0];
    expect(wrapper.tagName).toBe('div');
    expect(wrapper.properties.dataCodeBlock).toBe('');
    const header = wrapper.children[0];
    expect(header.tagName).toBe('div');
    expect(header.properties.className).toContain('code-block-header');
    expect(header.children[0].tagName).toBe('span');
    expect(header.children[0].children[0].value).toBe('TS');
    const btn = header.children[1];
    expect(btn.tagName).toBe('button');
    expect(btn.properties.dataCopyButton).toBe('');
    expect(btn.properties.dataCode).toBe('const x = 1;');
    expect(wrapper.children[1].tagName).toBe('pre');
  });

  it('handles code block without language class', () => {
    const t = run({ type: 'root', children: [pre(code([], 'plain text'))] });
    const header = t.children[0].children[0];
    expect(header.children[0].children[0].value).toBe('TEXT');
    expect(header.children[1].properties.dataCode).toBe('plain text');
  });

  it('leaves pre without code child untouched', () => {
    const t = run({
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [{ type: 'text', value: 'x' }],
        },
      ],
    });
    expect(t.children[0].tagName).toBe('pre');
  });
});
