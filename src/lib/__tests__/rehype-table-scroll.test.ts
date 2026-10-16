// src/lib/__tests__/rehype-table-scroll.test.ts
import { describe, it, expect } from 'vitest';
import { rehypeTableScroll } from '@lib/rehype-table-scroll';

/* eslint-disable @typescript-eslint/no-explicit-any */
type N = any;
const table = (children: N[] = []): N => ({
  type: 'element',
  tagName: 'table',
  properties: {},
  children,
});
const p = (text: string): N => ({
  type: 'element',
  tagName: 'p',
  properties: {},
  children: [{ type: 'text', value: text }],
});
const run = (tree: N) => {
  rehypeTableScroll()(tree);
  return tree;
};

describe('rehypeTableScroll', () => {
  it('wraps a top-level table in div.table-scroll', () => {
    const t = run({ type: 'root', children: [table(), p('after')] });
    const wrapper = t.children[0];
    expect(wrapper.tagName).toBe('div');
    expect(wrapper.properties.className).toContain('table-scroll');
    expect(wrapper.properties.dataTableScroll).toBe('');
    expect(wrapper.children[0].tagName).toBe('table');
    expect(t.children[1].tagName).toBe('p');
  });

  it('wraps tables nested in blockquote / list item / div', () => {
    const t = run({
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'blockquote',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'ul',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'li',
                  properties: {},
                  children: [table(), table()],
                },
              ],
            },
          ],
        },
      ],
    });
    const li = t.children[0].children[0].children[0];
    expect(li.children[0].tagName).toBe('div');
    expect(li.children[0].children[0].tagName).toBe('table');
    expect(li.children[1].children[0].tagName).toBe('table');
  });

  it('is idempotent — never double-wraps on a second pass', () => {
    const once = run({ type: 'root', children: [table()] });
    const twice = run(once);
    const wrapper = twice.children[0];
    expect(wrapper.children[0].tagName).toBe('table');
    expect(wrapper.children[0].children[0]?.tagName).not.toBe('div');
  });

  it('leaves a non-table tree untouched', () => {
    const t = run({ type: 'root', children: [p('a'), p('b')] });
    expect(t.children.map((c: N) => c.tagName)).toEqual(['p', 'p']);
  });
});
