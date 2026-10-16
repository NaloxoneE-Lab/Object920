// src/lib/toc.ts
export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

/**
 * remark-gfm 会在脚注区自动插入一个 `sr-only` 的 `<h2 id="footnote-label">Footnotes</h2>`
 * 供屏幕阅读器使用。它不可见,点目录跳过去没有视觉落点,文案也固定是英文,
 * 所以不能进目录(压力测试样张的目录末尾就挂着这样一条 "Footnotes")。
 */
export const FOOTNOTE_LABEL_SLUG = 'footnote-label';

/** 目录只收 h2/h3,并排除脚注区那个隐藏标题 */
export function tocHeadings(headings: TocHeading[] | undefined): TocHeading[] {
  return (headings ?? []).filter(
    (h) => (h.depth === 2 || h.depth === 3) && h.slug !== FOOTNOTE_LABEL_SLUG,
  );
}
