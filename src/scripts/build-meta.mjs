// src/scripts/build-meta.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

/**
 * Collect build metadata from env vars and git.
 * @param {Record<string,string|undefined>} env
 * @param {(args: string[], cwd?: string) => string | null} gitRunner
 */
export function collectBuildMeta(env = process.env, gitRunner = runGit) {
  const mainCommit = env.GITHUB_SHA ?? gitRunner(['rev-parse', 'HEAD']) ?? 'unknown';
  const contentCommit =
    env.CONTENT_COMMIT ?? gitRunner(['rev-parse', 'HEAD'], 'src/content') ?? 'unknown';
  const contentUpdatedAt = gitRunner(['log', '-1', '--format=%cI'], 'src/content') ?? 'unknown';

  const meta = { mainCommit, contentCommit, contentUpdatedAt, buildTime: new Date().toISOString() };
  if (env.BUILD_META_DEBUG === 'true') {
    meta.nodeVersion = process.version;
  }
  return meta;
}

function runGit(args, cwd = '.') {
  try {
    const result = execSync(`git ${args.join(' ')}`, {
      cwd: resolve(projectRoot, cwd),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const distMode = process.argv.includes('--dist');
  const meta = collectBuildMeta();
  const outPath = distMode
    ? resolve(projectRoot, 'dist', 'build-meta.json')
    : resolve(projectRoot, 'src', '.build-meta.generated.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`[build-meta] wrote ${outPath}`);
}
