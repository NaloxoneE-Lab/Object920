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
  // 全站统一背景壁纸:网站有一张统一的背景图,所有页面共用(像桌面壁纸,
  // fixed 铺满、内容在其上滚动)。当前为前期验证临时取首页 Hero 同图
  // (docs/design/hero-home-spec.md §2 的 Penpot 雪景,wallhaven 占位版权未确认),
  // 替换自有授权图时直接覆盖 public/images/hero-bg.webp;置 undefined 回退主题底色
  background: '/images/hero-bg.webp',
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
