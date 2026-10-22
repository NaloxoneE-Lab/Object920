// src/lib/rehype-codeblock.ts
import type { Root, Element } from 'hast';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

/** 超过这个行数才给「折叠」开关(样张里最长 5 行,所以默认不会触发) */
const LONG_BLOCK_LINES = 15;

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
  // 标签统一小写:大写是 CSS 层以前的决定,现在按原文小写展示
  return (lang ?? 'text').toLowerCase();
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

function el(
  tagName: string,
  properties: Record<string, unknown>,
  children: HastNode[] = [],
): HastNode {
  return { type: 'element', tagName, properties, children };
}

// 把 pre/code 包成 .code-block 卡片:文件图标(+可选文件名) / 语言标签 / 操作区
// (自动换行、复制) / 长块的折叠开关。
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
  const lines = raw.replace(/\n$/, '').split('\n').length;
  // 围栏 meta 里的文件名(如 ```js title="src/a.ts")。当前链路没有解析 meta 的插件,
  // 真要用得在 remark 阶段把 meta 写进 data-filename;这里先支持「有就显示」
  const filename =
    typeof preNode.properties?.dataFilename === 'string' ? preNode.properties.dataFilename : '';
  const long = lines > LONG_BLOCK_LINES;
  const expandLabel = `展开 ${lines} 行`;

  // 没有 logo 了:文件名是文件区唯一的内容,没写 title 时整个文件区都不渲染
  const file = filename
    ? el('span', { className: ['code-block-file'] }, [
        el('span', { className: ['code-block-name'] }, [{ type: 'text', value: filename }]),
      ])
    : null;

  const wrapButton = el(
    'button',
    {
      className: ['code-block-op'],
      type: 'button',
      dataCodeWrap: '',
      'aria-pressed': 'false',
      'aria-label': '切换自动换行',
    },
    [{ type: 'text', value: '自动换行' }],
  );

  const copyButton = el(
    'button',
    {
      className: ['code-block-op'],
      type: 'button',
      dataCopyButton: '',
      'aria-label': '复制代码',
      dataCode: raw,
    },
    [{ type: 'text', value: '复制' }],
  );

  // 行号槽的占位:里面放最后一个行号(位数最多),宽度与 gutter 的最大数字严格一致,
  // 语言标签因此能与代码首字符左对齐——分隔线、列间距都由同一套 CSS 复刻。
  const pad = el('span', { className: ['code-block-pad'], 'aria-hidden': 'true' }, [
    { type: 'text', value: String(lines) },
  ]);

  const header = el('div', { className: ['code-block-header'] }, [
    pad,
    el('span', { className: ['code-block-lang'] }, [{ type: 'text', value: langLabel(lang) }]),
    ...(file ? [file] : []),
    el('span', { className: ['code-block-ops'] }, [wrapButton, copyButton]),
  ]);

  // 行号列留在横向滚动容器外:代码永远不会从数字下面经过,所以不需要任何遮罩底色,
  // 数字本身也不占文本节点(交给 CSS 计数器),复制/朗读都拿不到它们。
  // 每行一个空 <i>,行高先由 1lh 对齐;折行模式下由客户端按实测行高同步(见 codeGutter.ts)。
  const gutterRows: HastNode[] = Array.from({ length: lines }, () => el('i', {}, []));
  const gutter = el(
    'div',
    {
      className: ['code-gutter'],
      dataCodeGutter: '',
      'aria-hidden': 'true',
    },
    gutterRows,
  );

  preNode.properties = { ...(preNode.properties ?? {}), dataCodeScroller: '' };

  const body = el('div', { className: ['code-body'], dataCodeBody: '' }, [gutter, preNode]);

  const children: HastNode[] = [header, body];

  if (long) {
    children.push(
      el(
        'button',
        {
          className: ['code-block-more'],
          type: 'button',
          dataCodeToggle: '',
          'aria-expanded': 'false',
          dataExpandLabel: expandLabel,
        },
        [
          el('span', { className: ['code-block-more-label'] }, [
            { type: 'text', value: expandLabel },
          ]),
        ],
      ),
    );
  }

  return el(
    'div',
    {
      className: ['code-block'],
      dataCodeBlock: '',
      'data-language': lang ?? 'text',
      'data-lines': String(lines),
      ...(long ? { 'data-collapsible': '', 'data-collapsed': '' } : {}),
    },
    children,
  );
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
