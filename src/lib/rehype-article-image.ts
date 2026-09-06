// src/lib/rehype-article-image.ts
import type { Root, Element, Properties } from 'hast';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Properties;
  children?: HastNode[];
  value?: string;
}

function isElement(n: unknown): n is Element {
  return !!n && typeof n === 'object' && (n as HastNode).type === 'element';
}
function isText(n: unknown): n is { type: 'text'; value: string } {
  return !!n && typeof n === 'object' && (n as HastNode).type === 'text';
}

export function rehypeArticleImage(options: { groupId?: string } = {}) {
  const groupId = options.groupId ?? 'content-images';
  return (tree: Root) => {
    const root = tree as unknown as HastNode;
    root.children = (root.children ?? []).map((node) => {
      if (!isElement(node) || node.tagName !== 'p') return node;
      const children = (node as HastNode).children ?? [];
      const imgs = children.filter((c) => isElement(c) && (c as Element).tagName === 'img');
      if (imgs.length !== 1) return node;
      const hasOtherContent = children.some(
        (c) =>
          !(isText(c) && /^\s*$/.test(c.value)) &&
          !(isElement(c) && (c as Element).tagName === 'img'),
      );
      if (hasOtherContent) return node;

      const imgEl = imgs[0] as unknown as HastNode;
      const props = (imgEl.properties ?? {}) as Record<string, unknown>;
      const src = String(props.src ?? '');
      const alt = String(props.alt ?? '');
      const isRemote = /^https?:\/\//i.test(src);

      props.dataArticleImage = '';
      if (alt !== '') {
        props.dataLightbox = '';
        props.dataLightboxGroup = groupId;
      }
      if (isRemote) {
        props.loading = 'lazy';
        return node;
      }
      if (alt === '') return node;

      const title = props.title != null ? String(props.title) : undefined;
      const figChildren: HastNode[] = [imgEl];
      if (title) {
        figChildren.push({
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: title }],
        });
      }
      return {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['article-figure'] },
        children: figChildren,
      } as unknown as Element;
    });
    return tree;
  };
}
