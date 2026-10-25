// src/lib/hover-panels.ts
// 顶栏图标组「鼠标碰一下就出面板」的统一机制(2026-10-25)。
//
// 契约:包装元素标 data-hover-panel 即自动接管;组件自己在包装元素上监听
//   hoverpanel:open  /  hoverpanel:close
// 具体开合仍由各组件自己的函数完成(音乐 setPanelOpen、主题/语言 setWrapOpen、
// 搜索的 peek/active 状态机),这里只管「什么时候该开、什么时候该关」。
//
// 规则:
// - 只在 (hover: hover) and (pointer: fine) 下生效:触屏、移动抽屉一律不受影响
// - 进入即开(OPEN_DELAY_MS = 0,用户要求「一碰就出」)
// - 离开后给 CLOSE_GRACE_MS 宽限:面板是包装元素的后代,指针滑进面板会触发
//   pointerenter 从而取消关闭;搜索面板在屏幕正中,这段宽限就是走过去的时间
// - 同时只开一个:开 A 时给其它包装元素发 close
// - 不做「已开就不重复开」的本地状态判断:Esc、点击关、组件自己的开关都会改变真实
//   状态,本地记账容易失同步;open/close 发多次对组件是幂等的
export const HOVER_PANEL_OPEN = 'hoverpanel:open';
export const HOVER_PANEL_CLOSE = 'hoverpanel:close';

const WRAP_SELECTOR = '[data-hover-panel]';
const OPEN_DELAY_MS = 0;
const CLOSE_GRACE_MS = 300;

type Timers = { openTimer: number; closeTimer: number };
const timers = new WeakMap<HTMLElement, Timers>();

// 指针是否已在该包装元素(含其后代面板)里。用来甄别「假 pointerenter」:
// 全屏遮罩/面板消失时,指针下方的元素变了,浏览器会补发一次 pointerenter,
// 但指针其实从没离开过 —— 此时 inside 仍是 true,直接忽略。
// (不要用 pointermove 时间戳来判:某些输入源/合成指针只发 mouseenter 不发 pointermove。)
const inside = new WeakSet<HTMLElement>();

function getTimers(wrap: HTMLElement): Timers {
  let t = timers.get(wrap);
  if (!t) {
    t = { openTimer: 0, closeTimer: 0 };
    timers.set(wrap, t);
  }
  return t;
}

function clearTimers(wrap: HTMLElement) {
  const t = getTimers(wrap);
  if (t.openTimer) window.clearTimeout(t.openTimer);
  if (t.closeTimer) window.clearTimeout(t.closeTimer);
  t.openTimer = 0;
  t.closeTimer = 0;
}

function emit(wrap: HTMLElement, type: string, detail?: { force?: boolean }) {
  wrap.dispatchEvent(new CustomEvent(type, { detail }));
}

function allWraps(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(WRAP_SELECTOR));
}

function openWrap(wrap: HTMLElement) {
  emit(wrap, HOVER_PANEL_OPEN);
  // 顶栏同时只开一个面板(移动抽屉里也同理会成对一个)。
  // force: 连「点击后才保持」的面板(搜索的 active 态)也要让位
  for (const other of allWraps()) {
    if (other === wrap) continue;
    clearTimers(other);
    emit(other, HOVER_PANEL_CLOSE, { force: true });
  }
}

function closeWrap(wrap: HTMLElement) {
  clearTimers(wrap);
  emit(wrap, HOVER_PANEL_CLOSE);
}

function bind(wrap: HTMLElement) {
  if (wrap.dataset.hoverPanelBound === 'true') return;
  wrap.dataset.hoverPanelBound = 'true';

  wrap.addEventListener('pointerenter', () => {
    // 假 enter(见文件顶部 inside 的说明):指针没离开过,不弹
    if (inside.has(wrap)) return;
    inside.add(wrap);
    const t = getTimers(wrap);
    if (t.closeTimer) {
      window.clearTimeout(t.closeTimer);
      t.closeTimer = 0;
    }
    if (t.openTimer) return;
    if (OPEN_DELAY_MS === 0) {
      openWrap(wrap);
      return;
    }
    t.openTimer = window.setTimeout(() => {
      t.openTimer = 0;
      openWrap(wrap);
    }, OPEN_DELAY_MS);
  });

  wrap.addEventListener('pointerleave', () => {
    inside.delete(wrap);
    const t = getTimers(wrap);
    if (t.openTimer) {
      window.clearTimeout(t.openTimer);
      t.openTimer = 0;
    }
    if (t.closeTimer) window.clearTimeout(t.closeTimer);
    t.closeTimer = window.setTimeout(() => {
      t.closeTimer = 0;
      // 宽限期内指针已经回到按钮或滑进面板:不关
      if (wrap.matches(':hover')) return;
      closeWrap(wrap);
    }, CLOSE_GRACE_MS);
  });

  // 面板被点击(比如点了某个选项、链接)后通常由组件自己关掉;
  // 这里只收拾「指针还在包装元素内、但面板已经关了」时残留的定时器
  wrap.addEventListener('click', () => {
    const t = getTimers(wrap);
    if (t.closeTimer) {
      window.clearTimeout(t.closeTimer);
      t.closeTimer = 0;
    }
  });
}

/** 绑定当前文档里的所有 hover 面板(可重复调用,内部按元素去重) */
export function initHoverPanels() {
  if (typeof window === 'undefined') return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  for (const wrap of allWraps()) bind(wrap);
}
