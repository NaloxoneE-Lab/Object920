// src/lib/__tests__/remark-default-lang.test.ts
import { describe, it, expect } from 'vitest';
import { remarkDefaultLang } from '@lib/remark-default-lang';

/* eslint-disable @typescript-eslint/no-explicit-any */
type N = any;
const code = (lang: string | null, value = 'x'): N => ({ type: 'code', lang, value });
const run = (tree: N) => {
  remarkDefaultLang()(tree);
  return tree;
};

describe('remarkDefaultLang', () => {
  it('fills the default language on fences without an info string', () => {
    const t = run({ type: 'root', children: [code(null), code('python')] });
    expect(t.children[0].lang).toBe('text');
    expect(t.children[1].lang).toBe('python');
  });

  it('treats an empty string as missing too', () => {
    const t = run({ type: 'root', children: [code('')] });
    expect(t.children[0].lang).toBe('text');
  });

  it('walks into nested blocks (list items / blockquotes)', () => {
    const t = run({
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [{ type: 'listItem', children: [code(null)] }],
        },
      ],
    });
    expect(t.children[0].children[0].children[0].lang).toBe('text');
  });

  it('accepts a custom default', () => {
    const t = (() => {
      const tree: N = { type: 'root', children: [code(null)] };
      remarkDefaultLang('plain')(tree);
      return tree;
    })();
    expect(t.children[0].lang).toBe('plain');
  });
});
