// src/components/home/scroll-switch.ts
// 首页双屏"电灯开关"切换:第一屏(Hero)⇄ 第二屏(HomePanel)。
// 设计要点(docs/design/hero-home-spec.md 之后的双屏扩展):
//   - 边界手势劫持:第一屏内滚轮/触摸/键盘向下 → 整屏切到第二屏顶;
//     第二屏顶(边界带内)向上 → 整屏切回第一屏;第二屏深处正常滚动,不停留中间。
//   - 切换动画:rAF + easeInOutCubic,期间锁定输入;动画期间禁止原生滚动。
//   - 动画表现由 body.home-at-panel 类驱动(Hero 退场 / 面板进场,见各组件样式)。
//   - prefers-reduced-motion:跳过动画直接落位(样式层由全局 reduce 块兜底)。
//   - 抽屉/搜索等弹层打开时(body overflow hidden)不劫持,避免滚动冲突。
//   - ClientRouter:astro:page-load 时重查元素;非首页引用为空,监听器自行短路。

const DURATION = 800;
/** 边界判定带:第二屏顶上下各 96px 内视为"开关位" */
const BOUNDARY = 96;
/** 一次向下切换的最小触摸位移(px) */
const TOUCH_DOWN = 48;
/** 触发整屏切换的最小滚轮增量 */
const WHEEL_MIN = 2;
/** 动画落位后吸收惯性余波的冷却时间(ms) */
const SETTLE_COOLDOWN = 200;

let hero: HTMLElement | null = null;
let panel: HTMLElement | null = null;
let raf = 0;
let syncRetries = 0;
/** Infinity = 动画进行中;落位后为时间戳冷却 */
let lockedUntil = 0;
let touchStartY = 0;
let touchInHero = false;
/** 动画目标;null = 无进行中的动画(rAF 被节流后的恢复依据) */
let pendingTarget: number | null = null;
let watchdog = 0;

function locked(): boolean {
  return performance.now() < lockedUntil;
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function heroBottom(): number {
  if (!hero) return Number.POSITIVE_INFINITY;
  // 文档坐标系里 Hero 的底边 = 第二屏顶(scrollY 补偿视口偏移)
  const rect = hero.getBoundingClientRect();
  return rect.bottom + window.scrollY;
}

/** Hero 是否已完成布局(样式就绪)。astro:page-load 可能早于布局:
 *  Hero 子元素全部绝对定位,样式未就绪时高度≈0,此时任何几何判定都不可信 */
function heroReady(): boolean {
  return !!hero && hero.offsetHeight >= window.innerHeight * 0.5;
}

type Zone = 'hero' | 'boundary' | 'deep';
function zoneAt(y: number, hb: number): Zone {
  if (y < hb - BOUNDARY) return 'hero';
  if (y <= hb + BOUNDARY) return 'boundary';
  return 'deep';
}

function gesturesSuspended(): boolean {
  // 抽屉/弹层打开时 body overflow hidden,此时不劫持滚动
  return document.body.style.overflow === 'hidden';
}

function inTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, select, [contenteditable]') !== null
  );
}

/** 空格在聚焦按钮/链接上是点击语义,不当作切屏手势 */
function spaceOnControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('button, a') !== null &&
    target === document.activeElement
  );
}

// easeInOutCubic:开关动画的主缓动,后续调手感改这里
function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function finalize(target: number): void {
  cancelAnimationFrame(raf);
  clearTimeout(watchdog);
  pendingTarget = null;
  window.scrollTo(0, target);
  lockedUntil = performance.now() + SETTLE_COOLDOWN;
}

function animateTo(target: number): void {
  cancelAnimationFrame(raf);
  clearTimeout(watchdog);
  pendingTarget = target;
  if (reducedMotion()) {
    finalize(target);
    return;
  }
  const start = window.scrollY;
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / DURATION);
    // 逐帧直写,behavior 用默认(auto):rAF 节奏由本模块控制
    window.scrollTo(0, start + (target - start) * ease(p));
    if (p < 1) {
      raf = requestAnimationFrame(step);
    } else {
      finalize(target);
    }
  };
  raf = requestAnimationFrame(step);
  // watchdog:rAF 因标签页失焦被节流/冻结时,兜底落位解锁
  watchdog = window.setTimeout(() => finalize(target), DURATION + 600);
}

/** dir=down 切到第二屏;dir=up 切回第一屏。body 类随切换即时翻转,驱动两端动画 */
function go(target: number, dir: 'down' | 'up'): void {
  if (!heroReady() || locked()) return;
  lockedUntil = Number.POSITIVE_INFINITY;
  document.body.classList.toggle('home-at-panel', dir === 'down');
  animateTo(target);
}

export function switchToPanel(): void {
  go(heroBottom(), 'down');
}

export function switchToHero(): void {
  go(0, 'up');
}

function onWheel(e: WheelEvent): void {
  if (!heroReady() || !panel) return;
  if (locked()) {
    e.preventDefault();
    return;
  }
  if (gesturesSuspended() || Math.abs(e.deltaY) < WHEEL_MIN) return;
  const hb = heroBottom();
  const zone = zoneAt(window.scrollY, hb);
  if (e.deltaY > 0 && zone === 'hero') {
    e.preventDefault();
    go(hb, 'down');
  } else if (e.deltaY < 0 && zone === 'boundary') {
    e.preventDefault();
    go(0, 'up');
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (!heroReady() || !panel) return;
  if (locked() || gesturesSuspended() || inTextEntry(e.target)) return;
  if (e.key === ' ' && spaceOnControl(e.target)) return;
  const hb = heroBottom();
  const zone = zoneAt(window.scrollY, hb);
  const down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
  const up = e.key === 'ArrowUp' || e.key === 'PageUp';
  if (down && zone === 'hero') {
    e.preventDefault();
    go(hb, 'down');
  } else if (up && zone === 'boundary') {
    e.preventDefault();
    go(0, 'up');
  }
}

function onTouchStart(e: TouchEvent): void {
  if (!heroReady() || !panel || locked() || gesturesSuspended()) return;
  const hb = heroBottom();
  touchInHero = window.scrollY < hb;
  // 起手在第二屏顶部一小条内时,向上滑仍可进入内容(原生),
  // 向下滑由 touchmove 阻断后按位移决定是否切回
  touchStartY = e.touches[0].clientY;
}

function onTouchMove(e: TouchEvent): void {
  if (!heroReady() || !panel || locked() || gesturesSuspended() || !touchInHero) return;
  const hb = heroBottom();
  // 第一屏内:接管手势,禁止原生滚动(避免停在中间)
  if (window.scrollY < hb - 4) {
    e.preventDefault();
    return;
  }
  // 第二屏顶 4px 内且正在向下拖:阻断原生回滚,落点交给 touchend
  if (window.scrollY <= hb + 4 && e.touches[0].clientY > touchStartY) {
    e.preventDefault();
  }
}

function onTouchEnd(e: TouchEvent): void {
  if (!heroReady() || !panel || locked() || gesturesSuspended() || !touchInHero) return;
  touchInHero = false;
  const hb = heroBottom();
  const delta = touchStartY - (e.changedTouches[0]?.clientY ?? touchStartY);
  if (window.scrollY < hb - 4) {
    // 手势被我们接管,位置未动:按位移开关
    if (delta > TOUCH_DOWN) go(hb, 'down');
  } else if (window.scrollY <= hb + 4 && delta < -TOUCH_DOWN) {
    go(0, 'up');
  }
}

let bound = false;
function bindOnce(): void {
  if (bound) return;
  bound = true;
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchcancel', () => {
    touchInHero = false;
  });
  // 标签页切回时若动画因节流中断,立即落位恢复
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && pendingTarget !== null) finalize(pendingTarget);
  });
}

/** 滚动兜底:滚动条拖拽、锚点、查找跳转等不经过手势的位移,同步双屏状态类 */
function onScroll(): void {
  if (!heroReady() || !panel || locked()) return;
  document.body.classList.toggle('home-at-panel', window.scrollY >= heroBottom() - BOUNDARY);
}

/** 非动画的状态同步(进页/返回恢复滚动位置时):当前在第二屏则直接置类,不重放进场。
 *  Hero 未完成布局时 rAF 重试(有上限,避免样式永不就绪时空转) */
function syncStateInstant(): void {
  if (!hero || !panel) {
    document.body.classList.remove('home-at-panel');
    return;
  }
  if (!heroReady()) {
    if (syncRetries++ < 120) requestAnimationFrame(syncStateInstant);
    return;
  }
  syncRetries = 0;
  const inPanel = window.scrollY >= heroBottom() - BOUNDARY;
  if (inPanel === document.body.classList.contains('home-at-panel')) return;
  if (!inPanel) {
    document.body.classList.remove('home-at-panel');
    return;
  }
  document.documentElement.classList.add('home-skip-anim');
  document.body.classList.add('home-at-panel');
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('home-skip-anim');
  });
}

export function initHomeSwitch(): void {
  hero = document.querySelector<HTMLElement>('[data-sakura-hero]');
  panel = document.querySelector<HTMLElement>('[data-home-panel]');
  bindOnce();
  if (panel) document.body.classList.add('home-ready');
  syncStateInstant();
}
