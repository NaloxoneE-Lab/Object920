// src/scripts/search-index.mjs
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const VALID_PROVIDERS = ['pagefind', 'none'];

/**
 * Determine what action to take based on search config.
 * @param {Record<string,string|undefined>} env
 * @returns {'skip' | 'run-pagefind'}
 * @throws {Error} on invalid/unimplemented provider
 */
export function resolveSearchAction(env = process.env) {
  if (env.PUBLIC_SEARCH_ENABLED === 'false') return 'skip'; // spec 默认开启,显式 false 才禁用
  const provider = env.PUBLIC_SEARCH_PROVIDER ?? 'pagefind';
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error(
      `Unsupported search provider "${provider}". Valid: ${VALID_PROVIDERS.join(', ')}. Orama not yet implemented.`,
    );
  }
  return provider === 'none' ? 'skip' : 'run-pagefind';
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const action = resolveSearchAction();
    if (action === 'skip') {
      console.log('[search-index] search disabled or provider=none, skipping');
      process.exit(0);
    }
    const distDir = resolve(projectRoot, 'dist');
    if (!existsSync(distDir)) {
      console.error('[search-index] dist/ not found — run astro build first');
      process.exit(1);
    }
    console.log('[search-index] running pagefind --site dist');
    execSync('npx pagefind --site dist', { cwd: projectRoot, stdio: 'inherit' });
    console.log('[search-index] pagefind index generated');
  } catch (err) {
    console.error('[search-index] FAILED:', err.message);
    process.exit(1);
  }
}
