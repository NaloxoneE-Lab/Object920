// src/config/site.ts
// import.meta.env 在 Astro 构建期由 Vite 注入;tsx 裸 Node 下不存在,须守卫
const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && 'env' in import.meta
    ? (import.meta.env as Record<string, string | undefined>)
    : {};

export const siteConfig = {
  siteUrl: env.PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? 'https://example.com',
  siteName: env.PUBLIC_SITE_NAME ?? process.env.PUBLIC_SITE_NAME ?? 'Object920',
  author: 'NaloxoneE',
  // header 品牌字(docs/design/hero-home-spec.md §3.1);siteName 仍用于 <title>/meta
  brand: 'Naloxonee',
  github: 'https://github.com/NaloxoneE-Lab',
  // Hero 背景图(可选):spec 使用版权未确认的占位雪景,上线自有授权图后填路径
  // (如 '/images/hero-bg.webp');留空则用自绘浅色渐变,暗色主题自动切换深色渐变
  heroBackground: undefined as string | undefined,
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
