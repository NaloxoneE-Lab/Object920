// src/lib/__tests__/rehype-strip-comments.test.ts
import { describe, it, expect } from 'vitest';
import { rehypeStripComments } from '@lib/rehype-strip-comments';

/* eslint-disable @typescript-eslint/no-explicit-any */
type N = any;
const run = (children: N[]): N => {
  const tree: N = { type: 'root', children };
  rehypeStripComments()(tree);
  return tree;
};

describe('rehypeStripComments', () => {
  it('drops a raw node that is nothing but an HTML comment', () => {
    const t = run([
      { type: 'raw', value: '<!-- 这段注释不该出现在输出里 -->' },
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [{ type: 'text', value: '正文' }],
      },
    ]);
    expect(t.children).toHaveLength(1);
    expect(t.children[0].tagName).toBe('p');
  });

  it('keeps the markup but removes the comment when a raw node mixes both', () => {
    const t = run([{ type: 'raw', value: '<div class="a">前<!-- 内部注释 -->后</div>' }]);
    expect(t.children).toHaveLength(1);
    expect(t.children[0].value).toBe('<div class="a">前后</div>');
  });

  it('drops a raw node left empty after stripping (comment plus whitespace)', () => {
    const t = run([{ type: 'raw', value: '  <!-- c -->\n\n' }]);
    expect(t.children).toHaveLength(0);
  });

  it('drops comment nodes emitted by other producers', () => {
    const t = run([{ type: 'comment', value: ' 直接就是 comment 节点 ' }]);
    expect(t.children).toHaveLength(0);
  });

  it('walks into nested elements to strip comments there', () => {
    const t = run([
      {
        type: 'element',
        tagName: 'blockquote',
        properties: {},
        children: [
          { type: 'raw', value: '<!-- 嵌套在引用块里的注释 -->' },
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [{ type: 'text', value: '引用' }],
          },
        ],
      },
    ]);
    const bq = t.children[0];
    expect(bq.children).toHaveLength(1);
    expect(bq.children[0].tagName).toBe('p');
  });

  it('leaves comment-like text inside code elements untouched', () => {
    // 代码块里展示的 <!-- --> 是 text 节点,不是注释,绝不能被删
    const t = run([
      {
        type: 'element',
        tagName: 'pre',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: [{ type: 'text', value: '<!-- 代码里的注释不该被删 -->' }],
          },
        ],
      },
    ]);
    expect(t.children[0].children[0].children[0].value).toBe('<!-- 代码里的注释不该被删 -->');
  });
});
