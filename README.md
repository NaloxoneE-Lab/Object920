# Object920

个人网站,基于 Astro 7 纯静态 SSG,支持中英俄日四语 i18n、双语渐进文章、可插拔集成(Giscus/Umami/搜索/音乐/开往)。

## 快速开始

### 前置要求

- Node.js >= 22.12(含 Node 24,2026-09-06 实测)
- pnpm 9.15.5(corepack 自动启用)
- Git

### 安装

```bash
git clone <main-repo-url> object920
cd object920
cp .env.example .env  # 编辑 .env 填 CONTENT_REPO 等本地值
pnpm install
pnpm dev
```

首次 `pnpm dev` 自动触发 `predev` 钩子拉取 content 仓库到 `src/content/`(仅首次 clone,之后不自动 pull)。

### 本地开发

1. 复制 `.env.example` 为 `.env`,至少填 `CONTENT_REPO`
2. `pnpm install`
3. `pnpm dev` — 自动拉取 content,启动开发服务器
4. Sveltia CMS 本地编辑:Chrome/Edge 打开 `http://localhost:4321/admin/index.html` → "Work with Local Repository" → 选 `src/content/` 目录
5. Giscus/Umami 未启用时评论与分析不显示是正常的

### 内容更新

- `pnpm pull:content` — 手动拉取最新 content(已有时 fetch + merge --ff-only;有未提交修改时报错提示 commit/stash)
- 首次 `pnpm dev` 后不自动 pull(保护 Sveltia 本地未提交修改)

## 环境变量

见 `.env.example`。关键变量:

| 变量                    | 说明                                                   |
| ----------------------- | ------------------------------------------------------ |
| `CONTENT_REPO`          | content 仓库地址(owner/repo)                           |
| `CONTENT_GITHUB_TOKEN`  | CI 用,read-only fine-grained PAT(private content repo) |
| `FORCE_CONTENT_SYNC`    | 仅 CI 注入 `true`;本地 build 默认 `false`              |
| `PUBLIC_SITE_URL`       | 站点 URL(canonical/OG/sitemap)                         |
| `PUBLIC_SEARCH_ENABLED` | 搜索开关                                               |
| `PUBLIC_GISCUS_ENABLED` | 评论开关                                               |
| `PUBLIC_UMAMI_ENABLED`  | 分析开关                                               |
| `PUBLIC_MUSIC_ENABLED`  | 背景音乐开关                                           |

## 构建与部署

### 本地构建

```bash
pnpm build
```

执行链:prebuild(pull:content → build-meta → check:datasheets)→ astro build → postbuild(build-meta --dist → search:index → generate-og → generate:redirects → check:links → check:sitemap → check:rss)

### 生产构建

```bash
pnpm install && pnpm build
```

### CI

```bash
pnpm ci  # check → lint → test → build(含 prebuild + postbuild)
```

### 部署平台

参考 `deploy/` 目录各平台 README:

- `deploy/cloudflare/` — Cloudflare Pages(推荐 MVP)
- `deploy/vercel/` — Vercel
- `deploy/netlify/` — Netlify
- `deploy/github-pages/` — GitHub Pages(功能最少,无自定义 headers)

选定平台后复制对应配置到根目录,在平台面板配置环境变量。

### Sveltia CMS 触发重建

content 仓库 push → GitHub Actions → POST Deploy Hook → 主站重建(pnpm install && pnpm build)。

## 项目结构

```
src/
├── content/          # 构建时 git clone 拉取(不入主仓,在 .gitignore)
├── pages/            # 路由([locale]/ 动态路由 + rss/ + robots.txt + sitemap.xml + 404)
├── components/       # 按领域分目录(article/project/collection/...)
├── components/integrations/  # 可插拔集成(analytics/search/music/travellings/comments)
├── i18n/             # 四语 UI 字典 + t() 翻译函数
├── lib/              # 纯函数(content/i18n/seo/og/image/redirects)
├── scripts/          # 构建前后脚本(pull-content/build-meta/search-index/generate-og/...)
├── styles/           # tokens.css(真相源)/ global.css / animations.css / prose.css
├── config/           # 站点配置(site.ts/music.ts/static-pages.ts)
└── content.config.ts # Astro Content Layer schema 定义(主仓唯一真相源)
deploy/               # 平台适配目录(cloudflare/vercel/netlify/github-pages/oauth-proxy)
public/               # 静态资源(admin/ fonts/ images/)
```

## i18n

- UI 四语(zh/en/ru/ja),MVP zh/en 全填,ru/ja 空壳走 zh fallback
- 文章双语渐进,未翻译走占位页跳转中文版
- 新增字典 key 先加到 `src/i18n/ui/zh.ts`(真相源)再同步其他

## 测试

- `pnpm ci` 跑全链:check → lint → test → build → postbuild 校验
- 新增 `src/lib/` 函数必须同步加单测(`src/lib/__tests__/`)
- CI 失败阻断合并

## 常见问题

1. **内容为空**:content 没拉取 → 首次 `pnpm dev` 自动 clone;之后手动 `pnpm pull:content`
2. **Sveltia 登录失败**:本地开发需 Chromium 浏览器并选 "Work with Local Repository";生产用 Access Token 或部署 OAuth 代理 → `deploy/oauth-proxy/`
3. **搜索 dev 不工作**:Pagefind 索引构建后才生成,dev 模式不可用是预期
4. **OG 图没生成**:增量依据是内容 hash + OG_TEMPLATE_VERSION,缓存在 `.cache/og-cache.json`;删除 `.cache/og-cache.json` 与 `dist/og/` 后重建
5. **OG 图报错(缺原生模块)**:`@resvg/resvg-js` 在 Alpine musl 等容器可能 fallback 编译失败;临时从 `postbuild` 移除 `generate-og`,OG 降级为默认图
6. **content 拉取失败(私有仓库)**:需配 `CONTENT_GITHUB_TOKEN`(独立 PAT,read-only);走 credential helper 不拼 URL
7. **fork PR 构建失败**:预期行为——fork PR 不注入 `CONTENT_GITHUB_TOKEN`,CI 只跑 code/lint/test

## 授权

MIT
