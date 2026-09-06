// src/config/site.ts
export const siteConfig = {
  siteUrl: import.meta.env.PUBLIC_SITE_URL ?? 'https://example.com',
  siteName: import.meta.env.PUBLIC_SITE_NAME ?? 'Object920',
  author: 'YourName',
  description: '个人网站 — 文章、工程、番剧与术曲',
  // 导航菜单项(走 i18n key)
  navItems: [
    { key: 'nav.home', href: '/' },
    { key: 'nav.articles', href: '/articles/' },
    { key: 'nav.projects', href: '/projects/' },
    { key: 'nav.collection', href: '/collection/' },
    { key: 'nav.friends', href: '/friends/' },
    { key: 'nav.about', href: '/about/' },
  ],
};
