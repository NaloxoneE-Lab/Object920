// src/lib/giscus.ts
// Giscus singleton script 管理(spec 7.4 P1-10):
// ClientRouter 导航后不重新加载 client.js,只 destroy 旧 widget + mount 新 widget

export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname' | 'specific' | 'title' | 'url' | 'og:title';
  term?: string;
  theme: 'light' | 'dark';
  lang: string;
  inputPosition?: 'top' | 'bottom';
}

const GISCUS_ORIGIN = 'https://giscus.app';

/**
 * 在 container 内挂载 Giscus widget(spec 7.4 P1-10)。
 * 每次调用先清空 container(destroy 旧 widget),然后插入新的 <script> 标签。
 * 浏览器缓存 client.js,首次加载后才发网络请求,后续导航走缓存。
 */
export function mountGiscus(config: GiscusConfig, container: HTMLElement): void {
  destroyGiscus(container);

  const script = document.createElement('script');
  script.src = `${GISCUS_ORIGIN}/client.js`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-repo', config.repo);
  script.setAttribute('data-repo-id', config.repoId);
  script.setAttribute('data-category', config.category);
  script.setAttribute('data-category-id', config.categoryId);
  script.setAttribute('data-mapping', config.mapping);
  if (config.term) script.setAttribute('data-term', config.term);
  script.setAttribute('data-theme', config.theme);
  script.setAttribute('data-lang', config.lang);
  script.setAttribute('data-loading', 'lazy');
  if (config.inputPosition) script.setAttribute('data-input-position', config.inputPosition);

  script.onerror = () => {
    container.innerHTML = '<p class="giscus-error">评论加载失败</p>';
  };

  container.appendChild(script);
}

/**
 * 销毁 Giscus widget:清空 container(移除 iframe + script)(spec 7.4)。
 * 每次 astro:page-load 前调用,清除旧评论区。
 */
export function destroyGiscus(container: HTMLElement): void {
  container.innerHTML = '';
}

/**
 * 同步 Giscus iframe 主题(postMessage)(spec 7.4 P2-29)。
 * 统一封装:负责 iframe 查找、origin 校验、iframe 未加载时跳过。
 * ThemeToggle 派发 theme-change CustomEvent → Comments 监听后调用此函数。
 */
export function updateGiscusTheme(theme: 'light' | 'dark'): void {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, GISCUS_ORIGIN);
}
