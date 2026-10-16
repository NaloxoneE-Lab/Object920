// src/lib/remark-default-lang.ts
//
// 给「没有写 info string」的代码围栏补一个默认语言(默认 `text`)。
//
// 为什么必须在 remark 阶段做:语言标签来自 `<pre data-language>`(见 rehype-codeblock),
// 而那个属性由 Astro 的 Shiki 集成写入,它的取值规则是
//   `language-* class 里的语言 || "plaintext"`(见 @astrojs/markdown-remark/dist/highlight.js)
// ——未标注的围栏和「写了不存在的语言」在 Shiki 之后都变成同一个 `plaintext`,
// 于是样张 5.2(无语言标记,期望 TEXT)与 5.3(未知语言)无法在 rehype 阶段区分。
// 在 remark 阶段把空 lang 补成 `text` 之后:
//   无语言标记 → data-language="text" → 标签 TEXT(且像 ```text 一样由 Shiki 正常处理,
//                软换行/主题样式都在)
//   未知语言   → Shiki 仍然回退到 plaintext → 标签 PLAINTEXT(保留了"这不是我写的语言"的信息)
import type { Root } from 'mdast';

interface MdastNode {
  type: string;
  lang?: string | null;
  children?: MdastNode[];
}

export function remarkDefaultLang(defaultLang = 'text') {
  return (tree: Root) => {
    const walk = (node: MdastNode) => {
      if (node.type === 'code' && !node.lang) node.lang = defaultLang;
      node.children?.forEach(walk);
    };
    walk(tree as unknown as MdastNode);
    return tree;
  };
}
