# Object920 — MVP 第一阶段交付文档

| 项 | 值 |
|---|---|
| 阶段周期 | 2026-09-06 ~ 2026-09-07 |
| 状态 | **已完成并上线**,全链路自动化验证通过 |
| 在线地址 | http://47.114.43.241(ECS / nginx) |
| 内容管理 | http://47.114.43.241/admin/(SSH 隧道下经 http://localhost:4322/admin/ 访问,见 §6) |
| 主仓 | github.com/NaloxoneE-Lab/Object920(67 commits) |
| 配套仓 | object920-content(Private,内容)、object920-assets(Public,静态资产)、object920-discussions(Public,Giscus 预留) |

---

## 1. 阶段目标与完成度

**目标**:把已冻结的设计 Spec(Archive:docs/superpowers/specs/2026-08-19-personal-site-design.md,十轮修订)完整落地为可运行、可部署、可日常运营的个人网站。

| 交付块 | 完成度 | 验证方式 |
|---|---|---|
| 基础架构(Plan 1:token/i18n/布局/FOUC) | ✅ | 146 单测 + 构建产物抽查 |
| 内容管线(Plan 2:5 collections/Sveltia/pull-content/assets 校验) | ✅ | schema 容错 + 真实网络校验通过 |
| 核心页面(Plan 3:17 任务全量页面/双语渐进/rehype 管线) | ✅ | 50 页构建 + 在线路由矩阵测试 |
| 可插拔集成(Plan 4:搜索/评论/分析/开往/音乐) | ✅ | Pagefind 索引生成 + 零 DOM 语义验证 |
| 构建部署(Plan 5:OG/sitemap/RSS/redirects/CI/四平台配置) | ✅ | postbuild 七步全链 EXIT=0 |
| 部署与自动化(ECS + GitHub Actions) | ✅ | 端到端:内容推送→线上生效 |

**核心数据**:146 个单元测试 / 50 个页面 / 67 个提交 / `pnpm ci` 全链绿灯 / 在线测试 22 sitemap URL + 36 路由矩阵全 200。

---

## 2. 技术栈(实测定型)

| 层 | 选型 | 版本 | 备注 |
|---|---|---|---|
| 框架 | Astro(SSG) | 7.3.1 | Content Layer API;**显式 `markdown.processor: unified()`**(Sätteri 默认会让 rehype 失效) |
| Markdown | @astrojs/markdown-remark | 7.3.0 | direct dep,提供 unified processor + parseFrontmatter |
| 样式 | Tailwind CSS(@theme CSS-first) | 4.3.3 | **必须 @tailwindcss/vite 插件接入**(无插件 dev 静默丢样式、build 报错) |
| 校验 | Zod v4 | astro/zod | `z.url()` 顶层构造器;弃用 `astro:content` 的 z 再导出 |
| 搜索 | Pagefind | 1.5.2 | postbuild 索引;动态 import 需 `@vite-ignore` |
| OG 图 | satori + resvg-js | — | CJK 子集字体 1.0MB 入库;lang 仅接受特定值 |
| CMS | Sveltia CMS(pinned) | 0.197.2 | 关键配置差异见 §5 |
| 运行时 | Node | 24.20 | **engines 已放宽为 `>=22.12`**(Spec 修订表第 11 轮,全链实测依据) |
| 包管理 | pnpm | 9.15.5 | corepack 锁定 |
| 部署 | 阿里云 ECS(Debian 13)+ nginx 1.26 | — | GitHub Actions 构建后 rsync |
| 死链 | lychee | 0.24.2 | 仅 CI 执行;`--root-dir` 必需 |

---

## 3. 已交付的系统行为

### 3.1 站点(50 页)

- 四语路由(zh 默认 + en/ru/ja),根路径 `/` 客户端语言协商 + noscript 兜底
- 双语渐进:zh/en 按 translationKey 配对;缺失语言生成占位页(`noindex, follow` + `<article lang>` + 跳转原文);ru/ja 全占位
- slug 即目录名,构建期校验(ASCII 合法性 + collection+locale 内唯一 + 翻译组唯一 + ogImage 互斥 + JSON id 唯一)
- 暗色模式(防闪烁内联脚本)、TOC、阅读进度条、代码块复制、Lightbox、番剧状态单选筛选
- SEO:自定义 sitemap(hreflang/x-default/lastmod 语义齐全)、RSS 四语 feed、robots.txt、OG 自动生成(增量缓存含字体版本)
- URL 迁移:content 仓 redirects.json → 三平台格式 + nginx map(301),两阶段校验(manifest 合法性 / 路由存在性)

### 3.2 可插拔集成(关闭 = 零 DOM/零网络/零构建依赖,已产物级验证)

| 集成 | 默认 | 状态 |
|---|---|---|
| 搜索(Pagefind,SearchProvider 接口) | 开 | ✅ 索引生成,运行时可用 |
| Sveltia CMS(/admin/) | 开 | ✅ 编辑流闭环(见 §6) |
| 开往 Travellings | 开 | ✅ |
| Giscus 评论 | 关 | 配置就绪,启用需 discussions 仓 category id |
| Umami 分析 | 关 | 配置就绪 |
| 背景音乐(HTMLAudioProvider) | 关 | 配置就绪,`transition:persist` 跨页待浏览器实测 |

### 3.3 自动化流水线(端到端验证通过)

```
日常写内容:Sveltia 提交 → object920-content main
  → validate-redirects(content 仓 CI,slug 改名未登记 redirect 则拦截)
  → repository_dispatch(CONTENT_DEPLOY_TOKEN)→ Object920 主仓
  → CI:check/lint/146 测试/lychee 死链 → 构建全链(prebuild 拉内容+元数据+资产校验
    → astro build 50 页 → postbuild 七步:meta/pagefind/OG/redirects/links/sitemap/rss)
  → deploy-ecs:rsync dist/ → /var/www/object920 + 更新 nginx 配置 → reload
  → 线上生效(全程 ~5 分钟,无手动操作)

改代码:push main → 同一 CI + deploy 流水线
```

安全边界已按 spec 落实:fork PR 不注入 secrets 只跑检查;构建 token 只读;CI 与编辑 token 分离。

---

## 4. 与 Spec 的偏差(均已回写实现备注)

计划执行中修正计划层错误 40+ 处,完整清单见 `docs/superpowers/plans/2026-09-06-plan{1..5}-implementation-notes.md`。**Spec 级修订**:

1. **engines `">=22.12 <23"` → `">=22.12"`**:Node 24.20 全链实测通过(修订表第 11 轮,同步 Toolchain Contract/README/CI)
2. **Sveltia i18n 配置形态**:spec 4.7 的 Decap 平铺写法(`i18n.structure:`)对 Sveltia **无效**——必须顶层 `i18n: {structure: multiple_folders, locales, default_locale, canonical_slug}` 对象 + collection `i18n: true` 继承(官方文档核实 + 源码反编译确认)
3. **`_slug` 机制实测结论**:`{{fields._slug | default(title) | localize}}` 模板语法有效(default filter 存在);可编辑 slug 创建时必填,重命名走条目三点菜单的 Slug Editor——符合 ASCII slug 纪律,但"留空自动生成"不成立
4. **全局 media_folder 必须定义**(Sveltia 启动校验):顶层 `media_folder: ''` + collection 级 entry-relative 覆盖共存
5. **Sveltia 空串兼容**:留空可选字段被写成 `''` 而非省略——schema 已加 emptyToUndefined 预处理(6 处 URL 字段 + 文本字段)
6. **浅克隆 ff-only 失败**:`fetch --depth=1` 后 merge-base 不可建,ff-only 必报"无关历史"(spec 7.12 缺陷)——fetch 改 `--depth=100` + 失败回退重 clone
7. **fine-grained PAT 的 git 认证**:Bearer extraheader 不被接受——改 GIT_ASKPASS + Basic(token 仍不进 URL/进程列表,符合 spec 纪律);CI 需 `persist-credentials: false` 防止 checkout 的 URL 作用域凭据覆盖
8. **ECS/nginx 输出模式**(新增能力):redirects.json → nginx 301 map;`generate:deploy-config --platform=nginx` 输出完整 server 块(CSP 动态拼装 + /admin/ 独立 CSP + 哈希资源长缓存)

---

## 5. 关键配置对照表(接手速查)

| 项 | 位置 | 值 |
|---|---|---|
| CI/部署 | `.github/workflows/ci.yml` | ci + deploy-ecs 两 job;secrets 未配时 deploy 自动跳过 |
| 内容校验 | content 仓 `.github/workflows/validate-redirects.yml` | slug→redirect 一致性 + 触发部署 |
| GitHub Secrets(主仓) | ECS_HOST/ECS_USER/ECS_SSH_KEY/CONTENT_REPO/CONTENT_GITHUB_TOKEN/DEPLOY_SITE_URL | CONTENT_GITHUB_TOKEN = 只读 content 仓的 fine-grained PAT |
| GitHub Secrets(content 仓) | CONTENT_DEPLOY_TOKEN | 主仓 Contents+Actions 读写 PAT(repository_dispatch 触发权) |
| Sveltia 登录 | 浏览器粘贴 | write PAT(content 仓 Contents 读写),与 CI token 分离 |
| 手动部署 | `scripts/deploy-ecs.sh` | 需本机 rsync;或 Actions 手动 workflow_dispatch |
| 本地 .env | CONTENT_REPO/PUBLIC_ASSETS_USER/PUBLIC_ASSETS_REPO | gitignored;CI 用 env 显式注入 |
| 服务器 | root@47.114.43.241 | nginx 站点 /var/www/object920;配置由部署流水线自动更新 |

---

## 6. 日常操作手册

**写内容(主编程)**:

```bash
ssh -L 4322:127.0.0.1:80 -i ~/.ssh/aliyun-object920.pem root@47.114.43.241   # 保持开启
# 浏览器打开 http://localhost:4322/admin/ → Sign In with Token(write PAT)
# 创建文章:Slug 必填(ASCII 小写+连字符) → 保存 → ~5 分钟自动上线
```

**Sveltia 界面优化(已配置)**:文章/工程列表摘要与过滤分组排序;番剧/术曲/友链条目行摘要;编辑区全宽(预览面板关闭)。官方还支持自定义预览模板/样式(可让编辑时实时看站点渲染,待后续阶段开发)。

**改 slug(必须登记 redirect)**:条目三点菜单 → Slug Editor 改名 → 同会话在"URL 迁移"集合登记旧→新路径 → 保存(同一 commit)。漏登记会被 content 仓 CI 拦截,不触发部署。

**应急部署**:Actions 页面手动触发 workflow,或本机 `scripts/deploy-ecs.sh`。

---

## 7. 遗留事项(第二阶段候选)

| 项 | 说明 | 前置 |
|---|---|---|
| 域名 + HTTPS | DNS → certbot → `DEPLOY_SITE_URL` 换 https 域名重建 | 域名购买;大陆 ECS 需 ICP 备案 |
| Sveltia 从正式域名访问 | HTTPS 后无需隧道 | 同上 |
| `transition:persist` 音乐跨页实测 | M5 验证项,需浏览器操作 | — |
| Giscus/Umami 启用 | discussions 仓建 category + giscus.app 取 id → 环境变量开启 | — |
| Sveltia 自定义预览模板 | 编辑实时预览站点样式 | 半天开发 |
| 清理 debug releases | 主仓 Releases 里 `debug-`/`debug2-`/`diag-` 条目(历史诊断日志) | 用户操作 |
| OG 模板打磨 | 当前基础模板出图正常,视觉可再设计 | — |
| 视觉全站打磨 | token 体系就绪,具体视觉风格可迭代 | — |

---

## 8. 风险与运维备忘

- **token 到期**:fine-grained PAT(3 个:CI 只读/部署触发/Sveltia 写)有有效期,到期后 CI 或 CMS 报 401——按 §5 对照表重建更新对应 secret/浏览器即可
- **ECS 安全**:PasswordAuthentication 已关;安全组仅 22/80/443;443 未开(上 HTTPS 时记得放行)
- **jsDelivr 依赖**:datasheet/OG 资产可达性依赖 CDN,构建校验已做镜像容错(raw 备用)
- **构建时长**:GitHub Actions 全链约 4-6 分钟(含内容拉取与七步 postbuild),属正常
- **备份**:内容与代码全在 GitHub,服务器仅存静态产物——ECS 可随时重建(`deploy/ecs/README.md` 含完整初始化步骤)

---

*MVP 第一阶段交付完毕。文档生成于 2026-09-07,随仓库演进。*
