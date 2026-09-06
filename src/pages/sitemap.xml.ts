// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { locales, defaultLocale } from '../i18n/config';
import { getEntriesGroupedByTranslationKey, resolveLocalizedEntry } from '../lib/i18n';
import { buildSitemapEntries, renderSitemapXml, type SitemapPage } from '../lib/seo';
import { getSiteConfig } from '../config/site';
import { staticPageMeta } from '../config/static-pages';

export const GET: APIRoute = async () => {
  const siteConfig = getSiteConfig();
  const pages: SitemapPage[] = [];

  // 1. 静态页 per locale(spec 6.10:lastmod 来自 staticPageMeta,纯导航页不输出)
  for (const locale of locales) {
    for (const [path, meta] of Object.entries(staticPageMeta)) {
      pages.push({
        url: `/${locale}${path}`,
        lastmod: meta.lastmod,
        noindex: meta.noindex ?? false,
        alternates: locales.map((l) => ({
          hreflang: l === 'zh' ? 'zh-CN' : l,
          href: `/${l}${path}`,
        })),
      });
    }
  }

  // 2. 内容详情页:仅 render 进 sitemap,placeholder 排除(spec 6.10)
  for (const collection of ['articles', 'projects'] as const) {
    const all = await getCollection(collection);
    const entries = all.filter((e) => !e.data.draft);
    const groups = getEntriesGroupedByTranslationKey(entries);

    for (const [, group] of groups) {
      const groupEntries = [group.zh, group.en].filter(
        (e): e is CollectionEntry<typeof collection> => Boolean(e),
      );
      const slugOfEntry = (e: CollectionEntry<typeof collection>) => e.id.split('/')[1] ?? e.id;

      const renderLocales = locales
        .map((l) => ({ l, r: resolveLocalizedEntry(group, l) }))
        .filter((x) => x.r.mode === 'render');
      if (renderLocales.length === 0) continue;

      for (const { l: uiLocale, r } of renderLocales) {
        const entry =
          groupEntries.find((e) => e.id.startsWith(`${r.contentLocale}/`)) ?? groupEntries[0];
        const slug = slugOfEntry(entry);
        const alternates = renderLocales.map(({ l, r: rr }) => {
          const altEntry = groupEntries.find((e) => e.id.startsWith(`${rr.contentLocale}/`));
          return {
            hreflang: l === 'zh' ? 'zh-CN' : l,
            href: `/${l}/${collection}/${altEntry ? slugOfEntry(altEntry) : slug}/`,
          };
        });
        // x-default:defaultLocale 有 render 用之,否则第一个 render locale(spec 6.6 P1-6)
        const defRender = renderLocales.find((x) => x.l === defaultLocale) ?? renderLocales[0];
        const defEntry = groupEntries.find((e) => e.id.startsWith(`${defRender.r.contentLocale}/`));
        alternates.push({
          hreflang: 'x-default',
          href: `/${defRender.l}/${collection}/${defEntry ? slugOfEntry(defEntry) : slug}/`,
        });

        const lastmod = entry.data.updatedDate ?? entry.data.pubDate;
        pages.push({
          url: `/${uiLocale}/${collection}/${slug}/`,
          lastmod: lastmod ? new Date(lastmod).toISOString().slice(0, 10) : undefined,
          noindex: false,
          alternates,
        });
      }
    }
  }

  const xml = renderSitemapXml(buildSitemapEntries(pages, siteConfig.siteUrl));
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
