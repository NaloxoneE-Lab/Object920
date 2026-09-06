# Cloudflare Pages 部署

## 快速开始

1. Cloudflare Dashboard → Pages → Create a project → Connect to Git → 选择主仓
2. 构建配置:
   - **Build command:** `pnpm install && pnpm build && pnpm run generate:deploy-config -- --platform=cloudflare`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION=22`、`CONTENT_REPO`、`CONTENT_GITHUB_TOKEN`、`FORCE_CONTENT_SYNC=true`、`PUBLIC_SITE_URL`、`PUBLIC_SEARCH_ENABLED=true`、`PUBLIC_SEARCH_PROVIDER=pagefind`、(可选)Giscus/Umami/Music
3. Save and Deploy

## 文件说明

- `_headers`: 安全 headers(CSP 由 `generate-deploy-config` 动态生成,此文件为模板参考)
- `_redirects`: 301 规则(由 `generate-redirects` 动态生成到 `dist/_redirects`)

## @resvg/resvg-js 原生绑定

Cloudflare Pages 默认容器(Linux x64 glibc)在预编译覆盖范围内,通常开箱即用。若报缺原生模块,见 spec 7.9 节"已知风险"。

## Deploy Hook

Cloudflare Pages → Settings → Deploy hooks 创建 URL,配置到 content 仓库 `MAIN_SITE_DEPLOY_HOOK_URL` secret。

## 构建资源限制

以 Cloudflare 官方当前文档为准(不写死在 Spec,易变)。
