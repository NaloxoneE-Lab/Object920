// src/config/static-pages.ts
// 静态页 sitemap 元数据(spec 6.10 P1-14):lastmod 来自真实内容更新日期,禁止用 buildTime
// 纯导航页不输出 lastmod(留空);内容型静态页在内容变更时手动更新 lastmod
export interface StaticPageMetaEntry {
  lastmod?: string;
  noindex?: boolean;
}

export const staticPageMeta: Record<string, StaticPageMetaEntry> = {
  '/about/': {},
  '/friends/': {},
  '/collection/': {},
  '/collection/anime/': {},
  '/collection/vocaloid/': {},
};
