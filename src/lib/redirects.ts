// src/lib/redirects.ts
export type RedirectMap = Record<string, string>;

/**
 * 归一化 redirects.json 内容(spec 存在两种历史形态):
 * 1. Sveltia file collection 编辑形态:{ redirects: [{ source, target }] }(spec 4.7,本项目采用)
 * 2. 映射形态:{ "/old/": "/new/" }(spec 6.5 P0-3 示例)
 */
export function normalizeRedirectManifest(raw: unknown): RedirectMap {
  const map: RedirectMap = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const { source, target } = item as { source: string; target: string };
      map[source] = target;
    }
    return map;
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as { redirects?: unknown }).redirects)) {
    return normalizeRedirectManifest((raw as { redirects: unknown }).redirects);
  }
  for (const [k, v] of Object.entries((raw ?? {}) as Record<string, unknown>)) {
    map[k] = String(v);
  }
  return map;
}
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Stage 1: Validate redirect manifest format and legality.
 * Checks: start with /, trailing slash, not external, source != target, no cycles, no chains.
 */
export function validateRedirectManifest(redirects: RedirectMap): ValidationResult {
  const errors: string[] = [];
  for (const [source, target] of Object.entries(redirects)) {
    if (!source.startsWith('/')) errors.push(`source "${source}" must start with /`);
    if (!target.startsWith('/')) errors.push(`target "${target}" is external or must start with /`);
    if (!source.endsWith('/') || !target.endsWith('/'))
      errors.push(`source "${source}" and target "${target}" must both have trailing slash`);
    if (source === target) errors.push(`source and target are the same: "${source}"`);
  }
  for (const [source, target] of Object.entries(redirects)) {
    if (redirects[target] === source)
      errors.push(`cycle: "${source}" -> "${target}" -> "${source}"`);
  }
  for (const [source, target] of Object.entries(redirects)) {
    if (redirects[target])
      errors.push(`chain: "${source}" -> "${target}" -> "${redirects[target]}" (MVP disallows)`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Stage 2: Validate against generated routes (postbuild).
 * target must exist, source must NOT exist.
 */
export function validateGeneratedRoutes(
  redirects: RedirectMap,
  routes: Set<string>,
): ValidationResult {
  const errors: string[] = [];
  for (const [source, target] of Object.entries(redirects)) {
    if (!routes.has(target)) errors.push(`target "${target}" not found in generated routes`);
    if (routes.has(source)) errors.push(`source "${source}" still exists as a route`);
  }
  return { valid: errors.length === 0, errors };
}

/** Generate Cloudflare/Netlify _redirects file content. */
export function generateRedirectsFile(redirects: RedirectMap): string {
  return Object.entries(redirects)
    .map(([s, t]) => `${s}\t${t}\t301`)
    .join('\n');
}

/** Generate Vercel redirects array. */
export function generateVercelRedirects(redirects: RedirectMap) {
  return Object.entries(redirects).map(([s, t]) => ({
    source: s,
    destination: t,
    permanent: true,
  }));
}

/** Generate static redirect HTML for GitHub Pages. */
export function generateStaticRedirectHtml(
  _source: string, // 文件部署于 source 路径本身,HTML 内无需引用
  target: string,
  siteUrl: string,
): string {
  const full = `${siteUrl.replace(/\/$/, '')}${target}`;
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Redirecting...</title>\n<link rel="canonical" href="${full}">\n<meta http-equiv="refresh" content="0; url=${full}">\n<meta name="robots" content="noindex">\n<script>location.replace("${full}");</script>\n</head>\n<body>\n<p>Redirecting to <a href="${full}">${full}</a>.</p>\n</body>\n</html>`;
}
