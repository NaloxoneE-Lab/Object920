// src/scripts/check-sitemap.ts
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITEMAP_PATH = resolve(projectRoot, 'dist', 'sitemap.xml');

function main() {
  if (!existsSync(SITEMAP_PATH)) {
    console.error('[check-sitemap] dist/sitemap.xml not found');
    process.exit(1);
  }
  const xml = readFileSync(SITEMAP_PATH, 'utf-8');
  const errors: string[] = [];

  if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'))
    errors.push('missing sitemap xmlns');
  if (!xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'))
    errors.push('missing xmlns:xhtml');

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) errors.push('no <url> entries found');

  for (const url of urls) {
    if (url.includes('/404') || url.includes('/admin/'))
      errors.push(`noindex page in sitemap: ${url}`);
    if (!url.endsWith('/')) errors.push(`URL without trailing slash: ${url}`);
  }

  const blocks = xml.split('<url>').slice(1);
  for (let i = 0; i < blocks.length; i++) {
    if (!blocks[i].includes('<xhtml:link')) {
      const loc = blocks[i].match(/<loc>([^<]+)<\/loc>/)?.[1] ?? `block ${i}`;
      errors.push(`URL without xhtml:link alternates: ${loc}`);
    }
  }

  if (errors.length > 0) {
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('[check-sitemap] FAILED');
    process.exit(1);
  }
  console.log(`[check-sitemap] OK — ${urls.length} URLs valid`);
}
main();
