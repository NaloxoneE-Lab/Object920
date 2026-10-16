// src/lib/rehype-table-scroll.ts
//
// 把正文里的每个 <table> 包进 <div class="table-scroll"> 里。
//
// 为什么需要:`.prose table { width: 100% }` 只约束「表格盒的期望宽度」,列数一多,
// 自动表格布局会把表格撑到 min-content 宽度并溢出阅读列——溢出的部分会越过目录列、
// 顶出整页横向滚动(压力测试样张 4.1 的二十列表实测 988px > 780px 阅读列)。
// 溢出容器是唯一能同时保住「表格不被压到不可读」和「阅读列宽是硬约束」的做法。
//
// 与 rehype-codeblock 的差别:代码块的包裹只作用于根级 pre(混在列表/引用里的代码块
// 有意保持轻量),表格则必须递归全树——样张里就有「表格嵌在引用块里」「表格嵌在列表项里」
// 两种分支,漏掉任何一个都会重新出现溢出。
import type { Root } from 'hast';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

function isElement(n: unknown): n is HastNode {
  return !!n && typeof n === 'object' && (n as HastNode).type === 'element';
}

function isWrapper(node: HastNode): boolean {
  return (
    isElement(node) && node.tagName === 'div' && node.properties?.dataTableScroll !== undefined
  );
}

function wrap(table: HastNode): HastNode {
  return {
    type: 'element',
    tagName: 'div',
    // tabindex:表格横向滚动时键盘用户需要先聚焦容器才能用方向键滚动
    properties: { className: ['table-scroll'], dataTableScroll: '', tabIndex: 0 },
    children: [table],
  };
}

function walk(node: HastNode): void {
  if (!node.children?.length) return;
  if (isWrapper(node)) return; // 幂等:已经是包裹层就不再往里套
  node.children = node.children.map((child) => {
    if (!isElement(child)) return child;
    if (child.tagName === 'table') return wrap(child);
    walk(child);
    return child;
  });
}

export function rehypeTableScroll() {
  return (tree: Root) => {
    walk(tree as unknown as HastNode);
    return tree;
  };
}
