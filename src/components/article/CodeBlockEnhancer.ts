// src/components/article/CodeBlockEnhancer.ts
// 代码块交互:复制 / 自动换行开关 / 长块折叠。全部走事件委托,不逐块绑监听。
import { syncBlockGutter } from './codeGutter';

const CB_KEY = '__cb_init__';

export function initCodeBlockEnhancer(): void {
  if ((window as unknown as Record<string, unknown>)[CB_KEY]) return;
  (window as unknown as Record<string, unknown>)[CB_KEY] = true;

  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    if (!target?.closest) return;

    // 折叠 / 展开:状态挂在 [data-code-block] 上,CSS 只认 data-collapsed
    const toggle = target.closest('[data-code-toggle]') as HTMLButtonElement | null;
    if (toggle) {
      const block = toggle.closest('[data-code-block]');
      if (block) {
        const wasCollapsed = block.hasAttribute('data-collapsed');
        if (wasCollapsed) block.removeAttribute('data-collapsed');
        else block.setAttribute('data-collapsed', '');
        toggle.setAttribute('aria-expanded', String(wasCollapsed));
        const label = toggle.querySelector('.code-block-more-label');
        // 刚展开 → 按钮变成「收起」;刚收起 → 回到「展开 N 行」
        if (label)
          label.textContent = wasCollapsed ? '收起' : (toggle.dataset.expandLabel ?? '展开');
      }
      return;
    }

    // 自动换行开关:默认不换行(横向滚动),开了之后由 CSS 切 white-space
    const wrapBtn = target.closest('[data-code-wrap]') as HTMLButtonElement | null;
    if (wrapBtn) {
      const block = wrapBtn.closest('[data-code-block]');
      if (block) {
        const on = block.getAttribute('data-wrap') === 'true';
        block.setAttribute('data-wrap', on ? 'false' : 'true');
        wrapBtn.setAttribute('aria-pressed', String(!on));
        wrapBtn.textContent = on ? '自动换行' : '取消换行';
        // 折行会改变每条逻辑行的视觉高度:立刻回填一次,不等 ResizeObserver 的异步回调
        syncBlockGutter(block);
      }
      return;
    }

    // 复制:优先取渲染后的 code 文本,兜底用 data-code(Shiki 输出丢失时)
    const btn = target.closest('[data-copy-button]') as HTMLButtonElement | null;
    if (!btn) return;
    const block = btn.closest('[data-code-block]');
    const code = block?.querySelector('code');
    const text = code?.textContent ?? btn.getAttribute('data-code') ?? '';
    const live = document.getElementById('copy-live');
    const done = () => {
      if (live) {
        live.textContent = '已复制';
        window.setTimeout(() => {
          live.textContent = '';
        }, 1500);
      }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(done)
        .catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  });

  // gutter 行高只在折行时需要逐行同步。用 ResizeObserver 盯住 pre 的尺寸:
  // 切换折行、字体加载完成、窗口变化都会改尺寸,但滚动不会——滚动路径上零 JS。
  observeGutters();
  document.addEventListener('astro:page-load', observeGutters);
}

let gutterObserver: ResizeObserver | null = null;

function observeGutters(): void {
  if (typeof ResizeObserver === 'undefined') return;
  gutterObserver ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const block = (entry.target as Element).closest('[data-code-block]');
      if (block) syncBlockGutter(block);
    }
  });
  document
    .querySelectorAll('[data-code-block] [data-code-scroller]')
    .forEach((pre) => gutterObserver!.observe(pre));
}
