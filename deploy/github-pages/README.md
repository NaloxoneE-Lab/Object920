# GitHub Pages 部署

## 限制

GitHub Pages **不支持自定义 HTTP headers**(CSP/HSTS 等)。CSP 通过 `<meta http-equiv="Content-Security-Policy">` 注入(BaseHead.astro 读取 `buildCsp()`)。重定向通过**静态 redirect HTML** 实现(`generate-redirects` 生成)。不支持原生预览部署。

## 快速开始

1. 复制 `deploy/github-pages/.github/workflows/deploy.yml` 到 `.github/workflows/`
2. 仓库 Settings → Pages → Source → GitHub Actions
3. 配置 Secrets: `CONTENT_REPO`、`CONTENT_GITHUB_TOKEN`、`PUBLIC_SITE_URL`(可选 Giscus/Umami/Music)
4. Push 到 main 触发部署

## CSP Fallback

`DEPLOY_PLATFORM=github-pages` 时,BaseHead 注入 `<meta http-equiv="Content-Security-Policy" content={buildCsp(env)} />`。其他平台走 HTTP header,不注入 meta(避免重复叠加)。

## Sveltia CMS OAuth

GitHub Pages 不支持同栈 OAuth 代理,参考 `deploy/oauth-proxy/` 部署独立代理。MVP 个人站用 Access Token 无需部署。
