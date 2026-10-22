// src/components/article/codeGutter.ts
// 行号列(gutter)与折行同步。
//
// 结构前提:gutter 在横向滚动容器(pre)之外,所以数字不需要任何遮罩底色。
// 不折行时行高统一,gutter 行用 CSS 的 1lh 就与代码逐行对齐,这里只负责清空内联高度;
// 折行时一条逻辑行会占多个视觉行,只能按实测高度逐行回填。

/** 只取用得到的部分,方便在 node 环境里直接测 */
export interface GutterRow {
  style: { height: string };
}

export interface CodeLine {
  getBoundingClientRect(): { height: number };
}

export function applyGutterHeights(rows: GutterRow[], lines: CodeLine[], wrapped: boolean): void {
  // 行数对不上说明 DOM 不是我们预期的形状(或者 Shiki 多吐了空行),宁可不改也不要错位
  if (rows.length !== lines.length) return;

  if (!wrapped) {
    for (const row of rows) row.style.height = '';
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    rows[i].style.height = `${lines[i].getBoundingClientRect().height}px`;
  }
}

/** 把一个代码块的行号列同步到当前布局;只读一次布局,写一次样式 */
export function syncBlockGutter(block: Element): void {
  const gutter = block.querySelector('[data-code-gutter]');
  const code = block.querySelector('pre code');
  if (!gutter || !code) return;

  const rows = Array.from(gutter.children) as unknown as GutterRow[];
  const lines = Array.from(code.querySelectorAll(':scope > .line')) as unknown as CodeLine[];
  applyGutterHeights(rows, lines, block.getAttribute('data-wrap') === 'true');
}
