// src/lib/rehype-strip-comments.ts
//
// 背景:markdown processor 链上开了 allowDangerousHtml: true,正文里写的 HTML 注释会被
// rehypeRaw 解析成真正的 comment 节点,然后被 rehypeStringify 原样输出到页面源码里
// (作者注释泄漏进 HTML,也会进 RSS/搜索结果)。
//
// 时序(rehypeShiki → 用户 rehypePlugins → rehypeRaw → rehypeStringify):本插件在
// rehypeRaw 之前运行,此时注释还是 remark-rehype 产出的 raw 节点,所以 raw 与 comment
// 两种形态都要处理。
//
// 放在 rehypePlugins 数组最前,顺带修掉一个副作用:段落里若混有注释的 raw 节点,
// rehypeArticleImage 会把它当成「图片以外的内容」而不包 figure。
import type { Root } from 'hast';

interface HastNode {
  type: string;
  children?: HastNode[];
  value?: string;
}

// HTML 注释内容里不允许出现 `--`,故非贪婪匹配到第一个 `-->` 是安全的。
const COMMENT_RE = /<!--[\s\S]*?-->/g;

function stripIn(node: HastNode): void {
  if (!node.children) return;
  node.children = node.children.flatMap((child) => {
    if (child.type === 'comment') return [];
    if (child.type === 'raw') {
      const stripped = (child.value ?? '').replace(COMMENT_RE, '');
      // 整块只有注释(或只剩空白)→ 连节点一起删,不在正文里留空行
      if (stripped.trim() === '') return [];
      child.value = stripped;
      return [child];
    }
    stripIn(child);
    return [child];
  });
}

export function rehypeStripComments() {
  return (tree: Root) => {
    stripIn(tree as unknown as HastNode);
    return tree;
  };
}
