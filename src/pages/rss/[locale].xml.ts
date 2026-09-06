// src/pages/rss/[locale].xml.ts
import type { APIRoute, GetStaticPaths } from 'astro';
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { locales } from '../../i18n/config';
import { getSiteConfig } from '../../config/site';

export const getStaticPaths: GetStaticPaths = () =>
  locales.map((locale) => ({ params: { locale } }));

export const GET: APIRoute = async (context) => {
  const locale = context.params.locale!;
  const siteConfig = getSiteConfig();
  // locale 唯一真相 = entry 目录(spec 6.9:按目录 locale 过滤,无 frontmatter lang)
  const articles = await getCollection(
    'articles',
    (entry) => entry.id.split('/')[0] === locale && !entry.data.draft,
  );
  const sorted = articles.sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime(),
  );

  return rss({
    title: `${siteConfig.siteName} — ${locale.toUpperCase()}`,
    description: siteConfig.description,
    site: siteConfig.siteUrl,
    items: sorted.map((entry) => {
      const slug = entry.id.split('/')[1];
      return {
        title: entry.data.title,
        description: entry.data.excerpt ?? '',
        pubDate: new Date(entry.data.pubDate),
        link: `/${locale}/articles/${slug}/`,
      };
    }),
    customData: `<language>${locale}</language>`,
  });
};
