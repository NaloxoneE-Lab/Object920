// src/config/site.ts
// import.meta.env 在 Astro 构建期由 Vite 注入;tsx 裸 Node 下不存在,须守卫
const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && 'env' in import.meta
    ? (import.meta.env as Record<string, string | undefined>)
    : {};

export interface SiteBackground {
  /** 亮色主题壁纸(public 下的绝对路径) */
  light: string;
  /** 暗色主题壁纸,渲染时叠加 --wallpaper-tint-dark 压暗 */
  dark: string;
}

/** 全站壁纸。置 undefined 则整层不渲染,回退主题底色 */
const background: SiteBackground | undefined = {
  light: '/images/hero-bg.webp',
  dark: '/images/hero-bg-dark.webp',
};

export const siteConfig = {
  siteUrl: env.PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? 'https://example.com',
  siteName: env.PUBLIC_SITE_NAME ?? process.env.PUBLIC_SITE_NAME ?? 'Object920',
  author: 'NaloxoneE',
  // header 品牌字(docs/design/hero-home-spec.md §3.1);siteName 仍用于 <title>/meta
  brand: 'Naloxonee',
  github: 'https://github.com/NaloxoneE-Lab',
  // 全站统一背景壁纸:亮/暗各一张,所有页面共用(像桌面壁纸,fixed 铺满、
  // 内容在其上滚动)。亮色仍是初版 Penpot 雪景(docs/design/hero-home-spec.md §2,
  // wallhaven 占位版权未确认);暗色换另一张线稿,叠加 --wallpaper-tint-dark
  // 压暗保浅色墨字可读。替换自有授权图时覆盖对应文件;整体置 undefined 回退主题底色
  background,
  description: '个人网站 — 文章、工程、番剧与术曲',
  // 导航菜单项(走 i18n key)
  navItems: [
    { key: 'nav.home', href: '/' },
    { key: 'nav.articles', href: '/articles/' },
    { key: 'nav.projects', href: '/projects/' },
    { key: 'nav.favorites', href: '/favorites/' },
    { key: 'nav.friends', href: '/friends/' },
    { key: 'nav.about', href: '/about/' },
  ],
};

// Plan 5 端点(sitemap/rss/robots/og/redirects)统一经此读取站点配置
export function getSiteConfig() {
  return siteConfig;
}
