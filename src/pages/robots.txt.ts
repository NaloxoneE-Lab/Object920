// src/pages/robots.txt.ts
import type { APIRoute } from 'astro';
import { getSiteConfig } from '../config/site';

export const GET: APIRoute = () => {
  const base = getSiteConfig().siteUrl.replace(/\/$/, '');
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${base}/sitemap.xml\n`,
    {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    },
  );
};
