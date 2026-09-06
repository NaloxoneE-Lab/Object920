# Sveltia CMS OAuth Proxy (Vercel Edge Function)

同 Cloudflare Worker 版本。MVP 个人站用 Access Token 无需部署。

## 部署

1. 创建 GitHub OAuth App(callback URL: `https://your-project.vercel.app/api/auth/callback`)
2. 复制 `api/auth.js` 到 Vercel 项目 `api/` 目录
3. 配置 Vercel Environment Variables: `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`
4. `public/admin/config.yml` 中设置 `base_url: https://your-project.vercel.app`
5. Deploy
