// src/scripts/check-rss.ts
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locales } from '../i18n/config';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RSS_DIR = resolve(projectRoot, 'dist', 'rss');

function main() {
  if (!existsSync(RSS_DIR)) {
    console.error('[check-rss] dist/rss/ not found');
    process.exit(1);
  }
  const errors: string[] = [];

  for (const locale of locales) {
    const feedPath = resolve(RSS_DIR, `${locale}.xml`);
    if (!existsSync(feedPath)) {
      errors.push(`missing feed for "${locale}"`);
      continue;
    }
    const xml = readFileSync(feedPath, 'utf-8');
    if (!xml.includes('<rss') && !xml.includes('<feed'))
      errors.push(`${locale}.xml not valid RSS/Atom`);
    if (!xml.includes(`<language>${locale}</language>`))
      errors.push(`${locale}.xml missing <language>`);
  }

  if (errors.length > 0) {
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('[check-rss] FAILED');
    process.exit(1);
  }
  const count = readdirSync(RSS_DIR).filter((f) => f.endsWith('.xml')).length;
  console.log(`[check-rss] OK — ${count} feeds valid`);
}
main();
