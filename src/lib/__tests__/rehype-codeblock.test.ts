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

// 结构: [ header, code-body, 可选 toggle ]
//   header = [ file(icon + 可选文件名), lang, ops(自动换行, 复制) ]
//   code-body = [ gutter, pre ] —— gutter 在横向滚动容器外,遮罩需求因此消失
const byClass = (node: N, cls: string): N | undefined =>
  (node.children ?? []).find((c: N) => c.properties?.className?.includes(cls));
const header = (wrapper: N) => wrapper.children[0];
const pad = (wrapper: N) => byClass(header(wrapper), 'code-block-pad');
const fileSpan = (wrapper: N) => byClass(header(wrapper), 'code-block-file');
const langSpan = (wrapper: N) => byClass(header(wrapper), 'code-block-lang');
const langText = (wrapper: N) => langSpan(wrapper).children[0].value;
const ops = (wrapper: N) => byClass(header(wrapper), 'code-block-ops');
const wrapBtn = (wrapper: N) => ops(wrapper).children[0];
const copyBtn = (wrapper: N) => ops(wrapper).children[1];
const body = (wrapper: N) => wrapper.children[1];
const gutter = (wrapper: N) => body(wrapper).children[0];
const preEl = (wrapper: N) => body(wrapper).children[1];

describe('rehypeCodeblock', () => {
  it('wraps pre/code in div.code-block with file icon, lang label and ops', () => {
    const t = run({ type: 'root', children: [pre(code(['language-ts'], 'const x = 1;'))] });
    const wrapper = t.children[0];
    expect(wrapper.tagName).toBe('div');
    expect(wrapper.properties.dataCodeBlock).toBe('');
    expect(wrapper.properties['data-language']).toBe('ts');
    expect(wrapper.properties['data-lines']).toBe('1');

    const h = header(wrapper);
    expect(h.tagName).toBe('div');
    expect(h.properties.className).toContain('code-block-header');

    // logo 已去掉;没有文件名时连文件区都不渲染。
    // header 第一个元素是占位用的行号槽,让语言标签与代码首字符左对齐
    expect(fileSpan(wrapper)).toBeUndefined();
    expect(h.children[0]).toBe(pad(wrapper));
    expect(pad(wrapper).children[0].value).toBe('1');
    expect(h.children[1]).toBe(langSpan(wrapper));
    expect(JSON.stringify(wrapper)).not.toContain('code-block-icon');

    expect(langText(wrapper)).toBe('ts');

    expect(wrapBtn(wrapper).properties.dataCodeWrap).toBe('');
    expect(wrapBtn(wrapper).children[0].value).toBe('自动换行');

    expect(copyBtn(wrapper).properties.dataCopyButton).toBe('');
    expect(copyBtn(wrapper).properties.dataCode).toBe('const x = 1;');

    expect(preEl(wrapper).tagName).toBe('pre');
  });

  it('puts the scrolling pre next to a gutter column inside .code-body', () => {
    const t = run({ type: 'root', children: [pre(code(['language-ts'], 'a\nb\nc'))] });
    const wrapper = t.children[0];
    const b = body(wrapper);

    expect(b.tagName).toBe('div');
    expect(b.properties.className).toContain('code-body');
    expect(b.children).toHaveLength(2);

    // gutter 必须是 code-body 的子节点,而不是 pre 内部——这样才能不参与横向滚动
    expect(gutter(wrapper).properties.className).toContain('code-gutter');
    expect(gutter(wrapper).properties['aria-hidden']).toBe('true');
    expect(preEl(wrapper).tagName).toBe('pre');
  });

  it('pads the header with the widest line number so the label starts where code does', () => {
    const long = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
    const t = run({ type: 'root', children: [pre(code(['language-ts'], long))] });
    const p = pad(t.children[0]);

    // 槽位里放最后一个行号:位数最多,宽度与 gutter 的最大数字相同
    expect(p.properties.className).toContain('code-block-pad');
    expect(p.properties['aria-hidden']).toBe('true');
    expect(p.children[0].value).toBe('20');
  });

  it('gives the gutter one empty row per code line (digits come from CSS counters)', () => {
    const t = run({ type: 'root', children: [pre(code(['language-ts'], 'a\nb\nc'))] });
    const g = gutter(t.children[0]);

    expect(g.children).toHaveLength(3);
    expect(g.children[0].tagName).toBe('i');
    // 行号不进文本节点:否则复制/朗读会把数字带进代码
    expect(g.children[0].children).toHaveLength(0);
  });

  it('shows the filename when the fence carries one', () => {
    const t = run({
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: { dataFilename: 'src/demo.ts' },
          children: [code(['language-ts'], 'x')],
        },
      ],
    });
    const file = fileSpan(t.children[0]);
    expect(file.children).toHaveLength(1);
    expect(file.children[0].properties.className).toContain('code-block-name');
    expect(file.children[0].children[0].value).toBe('src/demo.ts');
  });

  it('lowercases the language label so display is always lowercase', () => {
    const t = run({ type: 'root', children: [pre(code(['language-JS'], 'x'))] });
    expect(langText(t.children[0])).toBe('js');
  });

  it('handles code block without language class', () => {
    const t = run({ type: 'root', children: [pre(code([], 'plain text'))] });
    expect(langText(t.children[0])).toBe('text');
    expect(copyBtn(t.children[0]).properties.dataCode).toBe('plain text');
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

  it('reads language from pre[dataLanguage] when Shiki has already consumed language-* class', () => {
    // 真实管线形态:rehypeShiki 先跑,把整个 pre 换成自己的输出,
    // code 上没有 language-* class,语言只留在 pre.properties.dataLanguage 上
    const t = run({
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: { dataLanguage: 'javascript' },
          children: [code([], 'const x = 1;')],
        },
      ],
    });
    expect(langText(t.children[0])).toBe('javascript');
  });

  it('prefers pre[dataLanguage] over a stale language-* class on code', () => {
    const t = run({
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: { dataLanguage: 'python' },
          children: [code(['language-ts'], 'print(1)')],
        },
      ],
    });
    expect(langText(t.children[0])).toBe('python');
  });

  it('skips language-math blocks (KaTeX 渲染,不套代码块卡片)', () => {
    const t = run({ type: 'root', children: [pre(code(['language-math'], 'd = a / b'))] });
    expect(t.children[0].tagName).toBe('pre');
    expect(t.children[0].properties.dataCodeBlock).toBeUndefined();
  });

  it('wraps pre nested in list items and blockquotes (递归全树)', () => {
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
                  children: [pre(code(['language-bash'], 'pnpm install'))],
                },
              ],
            },
          ],
        },
      ],
    });
    const li = t.children[0].children[0].children[0];
    expect(li.children[0].tagName).toBe('div');
    expect(li.children[0].properties.dataCodeBlock).toBe('');
    expect(langText(li.children[0])).toBe('bash');
    expect(preEl(li.children[0]).tagName).toBe('pre');
  });

  it('is idempotent — never double-wraps on a second pass', () => {
    const once = run({ type: 'root', children: [pre(code(['language-ts'], 'x'))] });
    const twice = run(once);
    expect(twice.children[0].properties.dataCodeBlock).toBe('');
    expect(preEl(twice.children[0]).tagName).toBe('pre');
  });

  it('marks long blocks collapsible and adds an expand toggle', () => {
    const long = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
    const t = run({ type: 'root', children: [pre(code(['language-ts'], long))] });
    const wrapper = t.children[0];
    expect(wrapper.properties['data-lines']).toBe('20');
    expect(wrapper.properties['data-collapsible']).toBe('');
    expect(wrapper.properties['data-collapsed']).toBe('');

    const toggle = wrapper.children[2];
    expect(toggle.tagName).toBe('button');
    expect(toggle.properties.dataCodeToggle).toBe('');
    expect(toggle.properties.dataExpandLabel).toBe('展开 20 行');
    expect(toggle.properties['aria-expanded']).toBe('false');
  });

  it('does not add a toggle for short blocks', () => {
    const t = run({ type: 'root', children: [pre(code(['language-ts'], 'a\nb\nc'))] });
    const wrapper = t.children[0];
    expect(wrapper.children).toHaveLength(2);
    expect(wrapper.properties['data-collapsible']).toBeUndefined();
  });
});
