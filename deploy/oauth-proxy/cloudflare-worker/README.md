# Sveltia CMS OAuth Proxy (Cloudflare Worker)

MVP 个人站用 Access Token 无需部署此代理。多用户编辑时部署。

## 部署

1. 安装 Wrangler: `npm install -g wrangler`
2. 创建 GitHub OAuth App(Settings → Developer settings → OAuth Apps → New OAuth App,callback URL: `https://your-worker.workers.dev/callback`)
3. 复制 `worker.js` 到新 Worker 项目
4. 配置 Worker Secrets: `wrangler secret put GITHUB_CLIENT_ID`、`wrangler secret put GITHUB_CLIENT_SECRET`
5. `public/admin/config.yml` 中设置 `base_url: https://your-worker.workers.dev`
6. `wrangler deploy`

## 安全

`GITHUB_CLIENT_SECRET` 只在 Worker 端,不进主仓。建议用 fine-grained PAT 限制 scope。
