// deploy/cloudflare/worker.js — /admin/* 响应头改写(经 wrangler.jsonc run_worker_first 路由)
// 实测(2026-10-03):_headers 的规则是"所有匹配块叠加",无法从 /* 反向排除 /admin/*,
// 结果 admin 响应同时携带主站 CSP 与 Admin CSP;浏览器对多个 CSP 取交集执行,
// 主站 CSP 不放行 unpkg/jsdelivr,Sveltia 的 CDN 脚本与 GitHub API 会被拦死。
// 因此 /admin/* 先进本 Worker:删掉静态资源层(_headers)写入的 CSP,统一下发 Admin 专用 CSP。
// ADMIN_CSP 与 generate-deploy-config.ts 的 ADMIN_CSP 语义一致(该处仅 nginx 分支仍在用),改动需两处同步。
const ADMIN_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; font-src 'self' https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self' https://api.github.com https://unpkg.com https://cdn.jsdelivr.net; frame-src 'self' https://unpkg.com blob:; manifest-src 'self';";

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.delete('Content-Security-Policy');
    headers.set('Content-Security-Policy', ADMIN_CSP);
    // config.yml/index.js 需即时生效,禁缓存(对齐 nginx admin 块)
    headers.set('Cache-Control', 'no-cache');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
