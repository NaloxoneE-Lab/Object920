// src/scripts/generate-og.ts
// 运行于 tsx 裸 Node,不能 import 'astro:content'(virtual module);
// 直接扫描 src/content/**/index.md 并用 @astrojs/markdown-remark 解析 frontmatter
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import {
  computeOgHash,
  loadOgFonts,
  buildOgElementTree,
  renderOgImage,
  type OgEntryInfo,
} from '../lib/og';
import { getSiteConfig } from '../config/site';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const CACHE_PATH = resolve(projectRoot, '.cache', 'og-cache.json');
const OUTPUT_DIR = resolve(projectRoot, 'dist', 'og');

interface OgCache {
  [key: string]: string;
}

function loadCache(): OgCache {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveCache(cache: OgCache): void {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function getSlug(id: string): string {
  const parts = id.split('/');
  return parts[parts.length - 1] || parts[parts.length - 2] || id;
}

function getLocale(id: string): string {
  return id.split('/')[0] || 'zh';
}

async function main() {
  const siteConfig = getSiteConfig();
  const cache = loadCache();
  const newCache: OgCache = {};
  const collections: Array<{
    data: { title: string; description?: string; draft?: boolean };
    id: string;
    collection: string;
  }> = [];

  for (const name of ['articles', 'projects'] as const) {
    const dir = resolve(projectRoot, 'src/content', name);
    if (!existsSync(dir)) continue;
    for (const locale of readdirSync(dir)) {
      const localeDir = resolve(dir, locale);
      if (!statSync(localeDir).isDirectory()) continue;
      for (const slug of readdirSync(localeDir)) {
        const entryFile = resolve(localeDir, slug, 'index.md');
        if (!existsSync(entryFile)) continue;
        try {
          const { frontmatter } = parseFrontmatter(readFileSync(entryFile, 'utf-8'));
          const fm = frontmatter as {
            title?: string;
            excerpt?: string;
            description?: string;
            draft?: boolean;
          };
          collections.push({
            data: {
              title: fm.title ?? '',
              description: fm.excerpt ?? fm.description ?? '',
              draft: fm.draft ?? false,
            },
            id: `${locale}/${slug}`,
            collection: name,
          });
        } catch (err) {
          console.warn(
            `[generate-og] parse failed ${name}/${locale}/${slug}: ${(err as Error).message}`,
          );
        }
      }
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  let generated = 0,
    skipped = 0,
    degraded = 0;

  for (const entry of collections) {
    if (entry.data.draft) continue;
    const locale = getLocale(entry.id);
    const slug = getSlug(entry.id);
    const cacheKey = `${entry.collection}-${locale}-${slug}`;
    const hash = computeOgHash(
      entry.data.title,
      entry.data.description ?? '',
      locale,
      entry.collection,
      slug,
    );

    // spec 7.9 P1-18:文件缺失 或 hash 不一致都要重生成(降级过的条目无 PNG 文件)
    if (cache[cacheKey] === hash && existsSync(resolve(OUTPUT_DIR, `${cacheKey}.png`))) {
      newCache[cacheKey] = hash;
      skipped++;
      continue;
    }

    const fonts = loadOgFonts(locale);
    if (fonts.length === 0) {
      console.warn(`[generate-og] no fonts, degrading: ${cacheKey}`);
      degraded++;
      newCache[cacheKey] = hash;
      continue;
    }

    const hasCjk = /[\u4e00-\u9fff\u3040-\u30ff]/.test(
      entry.data.title + (entry.data.description ?? ''),
    );
    if (hasCjk && !fonts.some((f) => f.name === 'NotoSansSC')) {
      console.warn(`[generate-og] CJK text but no CJK font, degrading: ${cacheKey}`);
      degraded++;
      newCache[cacheKey] = hash;
      continue;
    }

    const info: OgEntryInfo = {
      title: entry.data.title,
      description: entry.data.description ?? '',
      locale,
      collection: entry.collection,
      slug,
      siteName: siteConfig.siteName,
    };
    try {
      const png = await renderOgImage(buildOgElementTree(info), fonts);
      writeFileSync(resolve(OUTPUT_DIR, `${cacheKey}.png`), png);
      newCache[cacheKey] = hash;
      generated++;
      console.log(`[generate-og] generated: ${cacheKey}.png`);
    } catch (err) {
      console.warn(`[generate-og] failed, degrading: ${cacheKey}: ${(err as Error).message}`);
      degraded++;
      newCache[cacheKey] = hash;
    }
  }

  saveCache(newCache);
  console.log(
    `[generate-og] done: ${generated} generated, ${skipped} skipped, ${degraded} degraded`,
  );
  process.exit(0);
}

main().catch((err) => {
  if (String(err.message).includes('resvg') || String(err.message).includes('native')) {
    console.warn(`[generate-og] resvg native binding error, OG degraded to default:`);
    console.warn(`  ${err.message}`);
    console.warn(
      `[generate-og] Fix: ensure build platform has prebuilt resvg, or remove generate-og from postbuild.`,
    );
  } else {
    console.warn(`[generate-og] unexpected error, degrading: ${err.message}`);
  }
  process.exit(0);
});
