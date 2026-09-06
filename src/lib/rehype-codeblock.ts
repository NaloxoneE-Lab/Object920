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

export function rehypeCodeblock() {
  return (tree: Root) => {
    const root = tree as unknown as HastNode;
    root.children = (root.children ?? []).map((node) => {
      if (!isElement(node) || node.tagName !== 'pre') return node;
      const preNode = node as unknown as HastNode;
      const codeEl = (preNode.children ?? []).find(
        (c) => isElement(c) && (c as Element).tagName === 'code',
      ) as HastNode | undefined;
      if (!codeEl) return node;

      const lang = langFromCode(codeEl);
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
        children: [header, node],
      } as unknown as Element;
    });
    return tree;
  };
}
