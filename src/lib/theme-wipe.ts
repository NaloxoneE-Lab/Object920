// src/lib/theme-wipe.ts
// 主题切换:以触发点为圆心把「目标主题的壁纸」扩散到全屏,铺满后再翻转主题色。
//
// 职责边界:本模块只管覆盖层(建层、扩散、揭层)。主题状态的写入(data-theme /
// localStorage / theme-change 事件)由调用方通过 commit 回调负责——ThemeToggle 仍然是
// 主题状态的唯一所有者,giscus 依赖的 theme-change 事件契约不变。
//
// 覆盖层的可见区域用 clip-path 扩散,元素不缩放:层内壁纸始终按视口 cover 排布,
// 与页面壁纸逐像素对齐(用 transform: scale 会让图片跟着一起放大而错位)。
//
// 动效降级:这个效果刻意**不受 prefers-reduced-motion 影响**(2026-10-17 用户拍板),
// 站内其余动效仍由 global.css 的 reduce 块统一降级。

export type Theme = 'light' | 'dark';

export interface ViewportLike {
  innerWidth: number;
  innerHeight: number;
}

export interface WipeOrigin {
  x: number;
  y: number;
}

interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 触发事件的最小形状:只关心点击坐标 */
export interface PointerLike {
  clientX?: number;
  clientY?: number;
}

/** --duration-wipe 解析失败时的兜底时长(与 theme-wipe.css 的默认值一致) */
const DEFAULT_WIPE_MS = 400;
/** 兜底超时比过渡时长多给的余量:transitionend 在过渡被取消/被打断时不触发,
    多等一会儿再收尾,避免把正常的长过渡(如对比页的慢动作)提前掐断 */
const FALLBACK_MARGIN_MS = 150;

const WIPE_CLASS = 'theme-wipe';

/** 把 CSS 时长 token("400ms" / "2.8s")解析成毫秒;解析不出来就退回默认值 */
export function resolveWipeDurationMs(cssValue: string | null | undefined): number {
  const matched = /^\s*([\d.]+)(ms|s)\s*$/.exec(cssValue ?? '');
  if (!matched) return DEFAULT_WIPE_MS;
  const value = Number(matched[1]);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_WIPE_MS;
  return matched[2] === 's' ? value * 1000 : value;
}

/** 读当前页面的 --duration-wipe(运行时覆盖也算,比如对比页的慢动作) */
function currentWipeDurationMs(): number {
  if (typeof getComputedStyle !== 'function') return DEFAULT_WIPE_MS;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--duration-wipe');
  return resolveWipeDurationMs(raw);
}

/** 圆扩散到覆盖整个视口所需的半径:圆心到最远角的距离 */
export function revealRadius(origin: WipeOrigin, viewport: ViewportLike): number {
  const dx = Math.max(origin.x, viewport.innerWidth - origin.x);
  const dy = Math.max(origin.y, viewport.innerHeight - origin.y);
  return Math.hypot(dx, dy);
}

/**
 * 圆心:优先鼠标点击位置;键盘触发(或坐标全为 0 的合成事件)退化到当前焦点元素中心,
 * 再退化为视口中心。
 * 判据是「有没有非零坐标」而不是事件类型——左上角的真实点击也是 (0, 0),
 * 但那种情况下退化到焦点元素/视口中心,视觉上没人看得出来。
 */
export function wipeOrigin(
  event: PointerLike | null,
  viewport: ViewportLike,
  activeElement: { getBoundingClientRect?: () => RectLike } | null = null,
): WipeOrigin {
  const x = event?.clientX ?? 0;
  const y = event?.clientY ?? 0;
  if (x || y) return { x, y };
  const rect = activeElement?.getBoundingClientRect?.();
  if (rect && (rect.width || rect.height)) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return { x: viewport.innerWidth / 2, y: viewport.innerHeight / 2 };
}

/**
 * 能否播放扩散:唯一条件是「有壁纸可展示」(返回类型谓词,便于把 src 收窄成 string)。
 * 刻意**不看 prefers-reduced-motion**——2026-10-17 用户拍板这个效果即使在
 * reduce 下也照播(配套的 CSS 例外见 theme-wipe.css;站内其余动效仍照 reduce 降级)。
 */
export function canPlayWipe(wallpaper: string | null | undefined): wallpaper is string {
  return !!wallpaper;
}

/** 读站点壁纸层上由 BaseLayout 写出的目标主题壁纸 URL */
export function wallpaperSrcFor(theme: Theme, root: ParentNode | null = null): string | null {
  const scope = root ?? (typeof document === 'undefined' ? null : document);
  const layer = scope?.querySelector<HTMLElement>('.site-bg');
  if (!layer) return null;
  const key = theme === 'dark' ? 'wallpaperDark' : 'wallpaperLight';
  return layer.dataset[key] ?? null;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function whenTransitionEnds(el: HTMLElement, ms: number): Promise<void> {
  return Promise.race([
    new Promise<void>((resolve) => {
      el.addEventListener(
        'transitionend',
        (e) => {
          if (e.propertyName === 'clip-path') resolve();
        },
        { once: true },
      );
    }),
    delay(ms),
  ]);
}

interface ActiveWipe {
  token: symbol;
  el: HTMLElement;
  commit: () => void;
}

let active: ActiveWipe | null = null;

/** 立刻落定正在跑的过渡:提交它的主题并揭掉覆盖层。连点/降级时用它避免叠两层 */
function finishActive(): void {
  if (!active) return;
  const { el, commit } = active;
  active = null;
  commit();
  el.remove();
}

function buildOverlay(theme: Theme, src: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `${WIPE_CLASS} ${WIPE_CLASS}--to-${theme}`;
  el.setAttribute('aria-hidden', 'true');
  const img = document.createElement('img');
  img.className = `${WIPE_CLASS}-img`;
  img.src = src;
  img.alt = '';
  img.decoding = 'sync';
  const tint = document.createElement('div');
  tint.className = `${WIPE_CLASS}-tint`;
  el.append(img, tint);
  return el;
}

export interface WipeToThemeOptions {
  /** 写入主题状态(ThemeToggle 负责 data-theme / localStorage / 派发 theme-change) */
  commit: () => void;
  /** 触发事件:用于取扩散圆心 */
  event?: PointerLike | null;
}

/**
 * 切到目标主题:扩散覆盖层铺满 → commit() 翻主题 → 揭掉覆盖层。
 * 没有壁纸(或壁纸层缺失)时退化为瞬时 commit。
 */
export async function wipeToTheme(theme: Theme, options: WipeToThemeOptions): Promise<void> {
  const { commit, event = null } = options;
  const src = wallpaperSrcFor(theme);
  if (!canPlayWipe(src)) {
    finishActive();
    commit();
    return;
  }

  finishActive(); // 连点:上一次先落定,不叠层

  const el = buildOverlay(theme, src);
  const token = Symbol('theme-wipe');
  active = { token, el, commit };
  const origin = wipeOrigin(event, window, document.activeElement);
  el.style.setProperty('--wipe-x', `${Math.round(origin.x)}px`);
  el.style.setProperty('--wipe-y', `${Math.round(origin.y)}px`);
  el.style.setProperty('--wipe-r', `${Math.round(revealRadius(origin, window))}px`);
  document.body.appendChild(el);
  void el.offsetWidth; // 提交半径为 0 的基态,否则首帧直接跳到终态(无动画)
  await nextFrame();
  el.classList.add('is-open');
  await whenTransitionEnds(el, currentWipeDurationMs() + FALLBACK_MARGIN_MS);
  if (active?.token !== token) return; // 已被后续调用接管
  commit();
  await nextFrame(); // 让页面自己的目标主题壁纸先上屏一帧,再揭覆盖层
  el.remove();
  active = null;
}

/**
 * 主动解码站壁纸层的两张图。覆盖层引用的是同一个 URL,解码缓存命中才能保证
 * 圆扩散出来的第一帧不是空白(尤其暗色壁纸在亮色主题下是 opacity:0,浏览器未必已解好码)
 */
export function primeWallpapers(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll<HTMLImageElement>('.site-bg img').forEach((img) => {
    if (!img.complete) img.decode?.().catch(() => {});
  });
}
