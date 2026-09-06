// src/scripts/check-datasheets.ts
// prebuild 校验 assets 文件可达(spec 7.5):
//   状态码分类(404/401/403/405/429/5xx/timeout)+ HEAD → GET Range 降级 +
//   429/5xx 指数退避重试 + 镜像容错(至少一镜像可用即通过,全部失效才阻断)。
// 注意:运行在裸 Node(tsx)下,不能 import 'astro:content',直接扫描
// src/content/projects/**/index.md 并用 @astrojs/markdown-remark 解析 frontmatter。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { buildDownloadUrls, type Datasheet } from '../lib/assets';

const PROJECTS_DIR = resolve(process.cwd(), 'src/content/projects');
const PER_URL_TIMEOUT_MS = 10_000;
const OVERALL_DEADLINE_MS = 60_000;
const MAX_CONCURRENCY = 4;
const MAX_RETRIES = 3;

type UrlVerdict =
  | { kind: 'ok' }
  | { kind: 'not-found' }
  | { kind: 'permission' }
  | { kind: 'cdn'; message?: string }
  | { kind: 'error'; message: string };

interface DatasheetRef {
  projectId: string;
  datasheet: Datasheet;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function collectDatasheets(): DatasheetRef[] {
  const refs: DatasheetRef[] = [];
  if (!existsSync(PROJECTS_DIR)) return refs;
  for (const locale of readdirSync(PROJECTS_DIR)) {
    const localeDir = join(PROJECTS_DIR, locale);
    if (!statSync(localeDir).isDirectory()) continue;
    for (const slug of readdirSync(localeDir)) {
      const entryFile = join(localeDir, slug, 'index.md');
      if (!existsSync(entryFile)) continue;
      const { frontmatter } = parseFrontmatter(readFileSync(entryFile, 'utf-8'));
      const datasheets = (frontmatter as { datasheets?: Datasheet[] }).datasheets ?? [];
      for (const d of datasheets) {
        refs.push({ projectId: `${locale}/${slug}`, datasheet: d });
      }
    }
  }
  return refs;
}

async function probeUrl(url: string): Promise<UrlVerdict> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(PER_URL_TIMEOUT_MS),
      });
      if (res.status === 405) {
        // HEAD 不支持 → 降级 GET Range
        res = await fetch(url, {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          redirect: 'follow',
          signal: AbortSignal.timeout(PER_URL_TIMEOUT_MS),
        });
      }
      if (res.status === 200 || res.status === 206) return { kind: 'ok' };
      if (res.status === 404) return { kind: 'not-found' };
      if (res.status === 401 || res.status === 403) return { kind: 'permission' };
      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_RETRIES) {
          await sleep(2 ** attempt * 500);
          continue;
        }
        return { kind: 'cdn' };
      }
      return { kind: 'error', message: `HTTP ${res.status}` };
    } catch (e) {
      // 超时/网络故障按 cdn 分类,不误报 404
      if (attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 500);
        continue;
      }
      return { kind: 'cdn', message: e instanceof Error ? e.message : String(e) };
    }
  }
  return { kind: 'error', message: 'unreachable' };
}

const VERDICT_LABEL: Record<UrlVerdict['kind'], string> = {
  ok: '可用',
  'not-found': '文件不存在(404)',
  permission: '权限错误(401/403)',
  cdn: 'CDN 故障/网络故障',
  error: '错误',
};

async function main() {
  console.log('[check-datasheets] Verifying datasheet files exist...');
  const startedAt = Date.now();
  const refs = collectDatasheets();
  if (!refs.length) {
    console.log('[check-datasheets] No datasheets found. Nothing to verify.');
    return;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // 简易并发池(p-limit 语义,limit 4)
  let cursor = 0;
  async function worker() {
    while (cursor < refs.length) {
      if (Date.now() - startedAt > OVERALL_DEADLINE_MS) {
        errors.push('[check-datasheets] Overall deadline (60s) exceeded.');
        return;
      }
      const ref = refs[cursor++];
      const urls = buildDownloadUrls(ref.datasheet);
      const verdicts = await Promise.all(
        urls.map(async ({ mirror, url }) => ({ mirror, verdict: await probeUrl(url) })),
      );
      const okMirrors = verdicts.filter((v) => v.verdict.kind === 'ok');

      if (okMirrors.length > 0) {
        // 至少一镜像可用 → 通过;primary 失效但 fallback 可用 → warn
        const primary = verdicts[0];
        if (primary.verdict.kind !== 'ok') {
          warnings.push(
            `[${ref.projectId}] ${ref.datasheet.name}: 主镜像 ${primary.mirror} 失效(${VERDICT_LABEL[primary.verdict.kind]}),备用镜像可用,请修复主链接`,
          );
        }
      } else {
        const detail = verdicts
          .map((v) => `${v.mirror}: ${VERDICT_LABEL[v.verdict.kind]}`)
          .join('; ');
        errors.push(`[${ref.projectId}] ${ref.datasheet.name}: 所有镜像不可用(${detail})`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, refs.length) }, worker));

  if (warnings.length) console.warn('[check-datasheets] WARNINGS:\n' + warnings.join('\n'));
  if (errors.length) {
    console.error('[check-datasheets] FAILED:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log(
    `[check-datasheets] All datasheets verified (${refs.length} entries, ${Date.now() - startedAt}ms).`,
  );
}

await main();
