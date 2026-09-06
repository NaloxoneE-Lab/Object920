# Vercel 部署

## 快速开始

1. Vercel Dashboard → New Project → Import 主仓
2. 构建配置:
   - **Framework Preset:** Astro
   - **Build Command:** `pnpm install && pnpm build && pnpm run generate:deploy-config -- --platform=vercel`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install --frozen-lockfile`
   - **Environment variables:** `CONTENT_REPO`、`CONTENT_GITHUB_TOKEN`、`FORCE_CONTENT_SYNC=true`、`PUBLIC_SITE_URL`、`PUBLIC_SEARCH_ENABLED=true`、`PUBLIC_SEARCH_PROVIDER=pagefind`、(可选)Giscus/Umami/Music
3. Deploy

## 文件说明

- `vercel.json`: headers(CSP 动态生成)+ redirects(由 generate-redirects 写入)

## Deploy Hook

Vercel → Settings → Git → Deploy Hook 创建 URL,配置到 content 仓库 `MAIN_SITE_DEPLOY_HOOK_URL` secret。
