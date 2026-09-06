// src/scripts/generate-deploy-config.ts
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCsp } from '../lib/seo';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_DIR = resolve(projectRoot, 'dist');

const ADMIN_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; font-src 'self' https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https://api.github.com https://unpkg.com https://cdn.jsdelivr.net; frame-src 'self' https://unpkg.com; manifest-src 'self';";

async function main() {
  const platform = process.argv.find((a) => a.startsWith('--platform='))?.split('=')[1];
  if (!platform) {
    console.error(
      '[generate-deploy-config] usage: --platform=cloudflare|vercel|netlify|github-pages',
    );
    process.exit(1);
  }
  const csp = buildCsp(process.env as never, { supportsHeaders: true });
  mkdirSync(DIST_DIR, { recursive: true });

  if (platform === 'cloudflare' || platform === 'netlify') {
    const headers = `/*\n  Content-Security-Policy: ${csp}\n  X-Frame-Options: SAMEORIGIN\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n\n/admin/*\n  Content-Security-Policy: ${ADMIN_CSP}\n`;
    writeFileSync(resolve(DIST_DIR, '_headers'), headers);
    console.log(`[generate-deploy-config] wrote dist/_headers (${platform})`);
  }

  if (platform === 'vercel') {
    const config: Record<string, unknown> = {};
    const existing = resolve(projectRoot, 'vercel.json');
    if (existsSync(existing))
      try {
        Object.assign(config, JSON.parse(readFileSync(existing, 'utf-8')));
      } catch {
        /* */
      }
    config.headers = [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      { source: '/admin/(.*)', headers: [{ key: 'Content-Security-Policy', value: ADMIN_CSP }] },
    ];
    writeFileSync(existing, JSON.stringify(config, null, 2) + '\n');
    console.log('[generate-deploy-config] wrote vercel.json');
  }

  if (platform === 'github-pages') {
    console.log('[generate-deploy-config] GitHub Pages uses <meta> CSP — no config file');
  }
  console.log('[generate-deploy-config] done');
}
main().catch((err) => {
  console.error('[generate-deploy-config] error:', err);
  process.exit(1);
});
