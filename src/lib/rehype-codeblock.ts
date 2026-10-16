// src/lib/rehype-codeblock.ts
import type { Root, Element } from 'hast';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

function isElement(n: unknown): n is Element {
  return !!n && typeof n === 'object' && (n as HastNode).type === 'element';
}

function extractText(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(extractText).join('');
}

function langFromCode(codeEl: HastNode): string | null {
  const cls = codeEl.properties?.className;
  if (Array.isArray(cls)) {
    for (const c of cls) {
      const m = String(c).match(/^language-(.+)$/);
      if (m) return m[1];
    }
  }
  return null;
}

function langLabel(lang: string | null): string {
  return (lang ?? 'text').toUpperCase();
}

// 语言来源优先级(rehypeShiki 先于用户 rehypePlugins 执行):
//   1. pre.properties.dataLanguage —— Shiki 会把整个 pre 换成自己的输出,语言只留在它的
//      data-language 属性上,原始 code 的 language-* class 已被消费掉(实测)
//   2. code 的 language-* class —— 未经 Shiki 处理时的兜底
function langOf(preEl: HastNode, codeEl: HastNode): string | null {
  const fromPre = preEl.properties?.dataLanguage;
  if (typeof fromPre === 'string' && fromPre !== '') return fromPre;
  return langFromCode(codeEl);
}

// 把 pre/code 包成 .code-block 卡片(语言标签 + 复制按钮)。
// 递归全树:此前只处理根级子节点,于是「列表项里的代码块」「引用块里的代码块」会漏掉卡片,
// 与根级代码块长得不一样(样张 9.8 / 10.x 直接暴露)。卡片对嵌套层级是安全的:
// li / blockquote 里放 div 都是合法结构。
function wrapPre(preNode: HastNode): HastNode | null {
  const codeEl = (preNode.children ?? []).find(
    (c) => isElement(c) && (c as Element).tagName === 'code',
  ) as HastNode | undefined;
  if (!codeEl) return null;

  const lang = langOf(preNode, codeEl);
  // 块级公式($$)在未经 rehype-katex 处理时也是 pre>code.language-math,
  // 不套代码块卡片(无语言标签/复制按钮语义)
  if (lang === 'math') return null;
  const raw = extractText(codeEl);
  const header: HastNode = {
    type: 'element',
    tagName: 'div',
    properties: { className: ['code-block-header'] },
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['code-block-lang'] },
        children: [{ type: 'text', value: langLabel(lang) }],
      },
      {
        type: 'element',
        tagName: 'button',
        properties: {
          className: ['code-block-copy'],
          dataCopyButton: '',
          'aria-label': '复制代码',
          dataCode: raw,
        },
        children: [{ type: 'text', value: '复制' }],
      },
    ],
  };
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['code-block'], dataCodeBlock: '' },
    children: [header, preNode],
  };
}

function isCodeBlockWrapper(node: HastNode): boolean {
  return isElement(node) && node.tagName === 'div' && node.properties?.dataCodeBlock !== undefined;
}

function walk(node: HastNode): void {
  if (!node.children?.length) return;
  if (isCodeBlockWrapper(node)) return; // 幂等:已经包过就不再往里套
  node.children = node.children.map((child) => {
    if (!isElement(child)) return child;
    if (child.tagName === 'pre') return wrapPre(child) ?? child;
    walk(child);
    return child;
  });
}

export function rehypeCodeblock() {
  return (tree: Root) => {
    walk(tree as unknown as HastNode);
    return tree;
  };
}
