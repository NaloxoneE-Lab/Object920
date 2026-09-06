# Netlify 部署

## 快速开始

1. Netlify Dashboard → Add new site → Import 主仓
2. 构建配置:
   - **Build command:** `pnpm install && pnpm build && pnpm run generate:deploy-config -- --platform=netlify`
   - **Publish directory:** `dist`
   - **Environment variables:** `NODE_VERSION=22`、`CONTENT_REPO`、`CONTENT_GITHUB_TOKEN`、`FORCE_CONTENT_SYNC=true`、`PUBLIC_SITE_URL`、`PUBLIC_SEARCH_ENABLED=true`、`PUBLIC_SEARCH_PROVIDER=pagefind`、(可选)Giscus/Umami/Music
3. Deploy

## 文件说明

- `netlify.toml`: 构建配置 + 静态安全 headers(CSP 由 generate-deploy-config 动态写入 dist/_headers)
- `_redirects`: 301 规则(由 generate-redirects 写入 dist/_redirects)

## Deploy Hook

Netlify → Site settings → Build hooks 创建 URL,配置到 content 仓库 `MAIN_SITE_DEPLOY_HOOK_URL` secret。
