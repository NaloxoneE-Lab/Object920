// src/scripts/search-index.mjs
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const enabled = process.env.PUBLIC_SEARCH_ENABLED !== 'false';
const provider = process.env.PUBLIC_SEARCH_PROVIDER || 'pagefind';

if (!enabled) {
  console.log('[search-index] Skipped: PUBLIC_SEARCH_ENABLED is false');
  process.exit(0);
}

if (provider !== 'pagefind') {
  console.log(`[search-index] Skipped: provider is "${provider}", not "pagefind"`);
  process.exit(0);
}

// npm scripts 的 cwd 是项目根;import.meta.url 相对定位在 src/scripts/ 下会算错层级
const distDir = resolve(process.cwd(), 'dist');
if (!existsSync(distDir)) {
  console.error('[search-index] dist/ not found — run astro build first');
  process.exit(1);
}

console.log('[search-index] Running pagefind --site dist');
try {
  execSync('npx pagefind --site dist', { stdio: 'inherit' });
  console.log('[search-index] Pagefind index generated successfully');
} catch (err) {
  console.error('[search-index] Pagefind failed:', err.message);
  process.exit(1);
}
