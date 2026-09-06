# Object920 个人网站设计文档

| 项 | 值 |
|---|---|
| 文档日期 | 2026-08-19(2026-08-28 十轮修订) |
| 状态 | 设计完成,十轮审核修订完成,可冻结为正式实现 Spec |
| 框架 | Astro(纯静态 SSG) |
| 目标读者 | 任何接手本项目的开发者(含未参与设计阶段的人) |
| 配套文档 | 主仓 README.md、CONTRIBUTING.md、deploy/{platform}/README.md、assets 仓 README、content 仓 README |

**修订记录**:

| 日期 | 修订 |
|---|---|
| 2026-08-19 | 初版定稿 |
| 2026-08-25 | 按二次审核 44 条意见修订:projects/content 统一 `{locale}/{slug}` 目录;图片改为 entry-relative media 并收敛 JSON 图片字段;Markdown 图片改 unified processor(remark/rehype)管线;sitemap 改自定义生成;正式引入 ClientRouter + 生命周期纪律;private content CI/Fork PR 安全边界;Search/Music resolver 的 `none` 语义;Admin CSP 分离;OG/Pagefind 失败策略;附录全量同步 |
| 2026-08-25(2) | 按第三轮审核 38 条意见修订:Sveltia `folder`/`file` 路径改为 content repo 根相对;slug 目录名唯一真相源 + `entry.id` 规则;Markdown 增强收敛为 rehype + client 单模型;Giscus 独立 public discussions 仓;CI event 条件/least-privilege/concurrency;校验函数族(translationKey/slug/ogImage 互斥);MusicHost 常驻;datasheet mirror 容错策略;fixture build;Sitemap namespace/lastmod |
| 2026-08-25(3) | 按第四轮审核 26 条意见修订:修正 generateId(entry 已相对 base);MusicProvider 构造注入 audio 统一接口;placeholder slug/迁移策略;lang 仅作校验字段;hreflang/x-default 只指向 render 页;Sitemap lastmod 语义;robots.txt 声明 Sitemap;MusicHost zero-DOM/层级;Pagefind locale 文档统一;CI 显式 search 配置 + push 限 main;concurrency/artifact 边界;single-language fixture;check:sitemap/rss 落地;admin CSP 完整模板;Git 操作限 scripts;schema contract test |
| 2026-08-25(4) | 按第五轮审核 22 条意见修订:本地 build 非 destructive(禁默认 FORCE_CONTENT_SYNC/reset --hard,dirty 检测);build-meta/check:sitemap/check:rss 接入真实 CI 链;packageManager 真实版本;redirect manifest 持久化 + slug=URL migration 纪律;CI token 仅 build 步骤;CSP Header/Meta 不叠加语义;Future Provider 不列为有效值;search() 错误语义;Giscus script singleton;audio 为媒体状态真相源;pnpm check 验收条件;schema-contract 限定范围;lang readonly 具体配置;不同语言不同 slug invariant;Sitemap x-default 同步;file() 描述精确化;编辑/CI Token 区分;redirect/dirty-content fixture;Admin CSP baseline |
| 2026-08-26 | 按第六轮审核 16 条意见修订:Sveltia 引入稳定 `_slug` 机制(与 title 解耦);删除 frontmatter `lang`,locale 由目录唯一推导;redirects.json 移入 content repo(与 slug 修改同 commit);Slug ASCII 策略统一;Pagefind+ClientRouter locale reinit;placeholder 加 `<article lang>`;unified processor 依赖契约;pull-content 固定 main + ff-only;Preview 描述与 CI 对齐;build-meta 生成文件入 gitignore;cover 仅本地/JSON 仅远程;alt 空串语义;translationKey 格式约束;unique(collection,locale,slug) invariant;data-pagefind-body 后期项 |
| 2026-08-26(2) | 按第七轮审核 19 条意见修订:Sveltia 元数据与领域模型解耦(translationKey ↔ _canonicalSlug);`_slug` 回归 Sveltia 专用 slug metadata(非普通 field);redirects.json 路径统一到 content repo 根;content repo 轻量 CI 强制 slug→redirect 同步;SearchProvider 增加 destroy() + SearchRuntime 所有权;unified/@astrojs/markdown-remark 依赖契约定死;Sveltia exact pinned version + 升级验证清单;Admin CSP connect-src 加 unpkg;GitHub Pages 静态 redirect;redirects schema/validator;content repo 职责改名;slug migration workflow;ASCII slug 默认生成;Pagefind lifecycle 单测 |
| 2026-08-26(3) | 按第八轮审核 21 条意见修订:OG 增量缓存移出 dist(改 `.cache/og-cache.json`);Satori 增加 CJK 字体方案;unified 依赖统一(markdown-remark direct,unified 不单独声明);JSON item.id 唯一性校验;slug→redirect 检测不再依赖 Git rename(结合 _slug/translationKey/path);placeholder→正式翻译迁移检测;redirect target 必须真实存在 / source 不得仍是当前 route;assets repo 必须 public;Admin CSP 补齐 cdn.jsdelivr.net/blob:/data: 并明确 /admin/* 不继承主站 CSP;PAT 统一 fine-grained;清理 lang 旧 checklist;7.10 补 destroy();根路径 noindex;静态页 lastmod 数据源 static-pages.ts;config 目录统一;pnpm 版本统一;Pagefind 措辞精确;CSP hardening + domain 收紧;reusable workflow pin;translationKey CMS 提示;新增 identity/JSON/Redirect/OG/Admin 验证清单 |
| 2026-08-26(4) | 按第九轮技术审核修订:框架升级评估至 Astro 7(默认 Sätteri,必须显式 `processor: unified()` 保留 remark/rehype;Rust 编译器/Vite 8/Node >=22.12);修正 Sveltia slug 机制(`_slug` 为显式字段 + `default(title)` 初始值;`canonical_slug.key = translationKey`,撤销自造 `_canonicalSlug`);`astro check` 无 content 改为实现首周验证并定义两种验收分支;shikiConfig 位置明确;OG 字体子集化;check-datasheets 并发/超时;generate-redirects.ts 职责与 validateRedirects 时机;transition:persist 在 Astro 7 下验证;修订标记说明;typography v4 兼容版本确认;Sveltia 版本存在性验证;build-meta dev 容错;save_all_locales 废弃说明;reduced-motion JS 检测示例 |
| 2026-08-28 | 按第十轮审核修订:全文确认 Astro 7.x(无 6.x 残留);新增 Markdown Processor Decision(为何弃用 Sätteri 默认);redirects.json 纳入 Sveltia file collection 形成编辑闭环;src/content 注释改为 external workspace;pull-content 增加 validateContentRepo() 恢复策略;Astro 7 Router Compatibility Test;Toolchain Contract(Node/pnpm/Astro/Vite);OG hash 增加 fontVersion;增强模块命名去 .client 歧义(ArticleImageEnhancer/CodeBlockEnhancer);redirect 校验拆 validateRedirectManifest/validateGeneratedRoutes 两阶段;清理 RSS lang 残留与旧 checklist;Incremental Build 明确不加入核心;确认不引入 Runtime Routing |
| 2026-09-06 | 第 11 轮(实现验证修订):engines 由 `">=22.12 <23"` 放宽为 `">=22.12"`——Astro 7.3.1 在 Node 24.20 全链实测通过(install/dev/check/146 单测/build 50 页/完整 postbuild 含 Pagefind·OG·redirects·sitemap/RSS 校验),`<23` 上限不再有依据;同步 1.1 Toolchain Contract 与 9.7 示例。同日实现 Plan 1-5 全量落地,期间修正计划层错误 30+ 处,详见 docs/superpowers/plans/2026-09-06-plan{1..5}-implementation-notes.md |

> **修订标记说明(m1)**:正文中穿插的 `P0-x`/`P1-x`/`P2-x`(及历轮 `C1-C3`/`M1-M5`/`m1-m7`)是**历轮审核意见的追踪标记**,用于把正文决策与附录 B checklist 一一对应;接手者阅读时可将它们当作"该处决策曾被审核确认过"的索引,**不影响实现语义**,可按需忽略。

---

## 0. 文档导航

本文档是 Object920 个人网站的**架构与需求真相源**。任何接手者应先读本节与附录 A(前期决策总览),再按需深入对应章节。

- 第 1 节:架构总览(技术栈、渲染模式、vanilla enhancement 策略、可插拔思想)
- 第 2 节:目录结构(含 content 动态拉取、assets 仓库、Sveltia admin)
- 第 3 节:设计 token 与三层样式架构
- 第 4 节:内容数据模型(Content Collections Zod schema + Sveltia config 对应)
- 第 5 节:页面与组件设计
- 第 6 节:i18n 实现策略
- 第 7 节:集成方案(可插拔搜索 SearchProvider / Giscus / Sveltia 认证 / 开往 / 背景音乐 / assets 下载 / Umami / OG 生成)
- 第 8 节:部署与平台兼容性
- 第 9 节:错误处理、可访问性、测试与 CI 策略
- 附录 A:前期决策总览
- 附录 B:全局 reviewer 检查清单汇总
- 附录 C:环境变量总表
- 附录 D:接手者必读清单汇总

---

## 1. 架构总览

### 1.1 技术栈定型

| 层 | 选型 | 版本要求 | 角色 |
|---|---|---|---|
| 框架 | Astro | **`^7.x`(2026-06-22 发布;文档已做 7.x 兼容评估,见 C1)** | 内容驱动的静态站点生成器,SSG 模式,使用 Content Layer API;**`.astro` 编译器为 Rust 实现(未闭合标签/非法 HTML 嵌套会报错);Vite 8(Rolldown);Node >= 22.12** |
| 内容管理 | Sveltia CMS | **exact pinned `@sveltia/cms@0.197.2`(已验证版本,P1-8)** | 独立 `/admin` SPA,全托管内容编辑(Decap CMS 的积极维护替代品,config.yml 兼容) |
| 内容存储 | 独立 content 仓库 + 构建时 `git clone --depth 1` | — | 主仓零内容文件;`src/content/` 在 .gitignore,构建/开发时由 `pull:content` 脚本动态拉取 |
| 样式 - token | 原生 CSS 变量 | — | `src/styles/tokens.css` 单一真相源 |
| 样式 - utility | Tailwind CSS | `^4.x` | 布局/间距/响应式/排版/暗色 utility,通过 `@theme` CSS 指令配置 |
| 样式 - 排版 | `@tailwindcss/typography` | v4 兼容版本(**实现时确认并锁定**,m2) | 文章 prose 排版;`^0.5.x` 可能不兼容 Tailwind v4,以官方 v4 兼容版本为准 |
| 样式 - scoped | Astro `<style>` + CSS Modules | — | 华丽动效、视觉特效组件 |
| 图片优化 | `astro:assets`(内置) | — | AVIF/WebP 转码 + 响应式 srcset + LQIP |
| Markdown 图片 | unified processor(remark + rehype) | — | 本地图由 astro:assets 在渲染阶段优化;rehype 增强为 figure/caption/lightbox(见 7.2) |
| 搜索 | Pagefind(默认 Provider,可插拔) | `^1.x` | 构建后生成静态索引;通过 SearchProvider 接口与 Search UI 解耦,可替换为 Orama 等 |
| 评论 | Giscus(原生 script 嵌入,可插拔) | — | GitHub Discussions 评论 |
| 分析 | Umami(可插拔) | — | 环境变量开关,不耦合核心 |
| OG 图生成 | `satori` + `@resvg/resvg-js` | — | 构建时为每篇文章生成 PNG |
| 字体 | 西文 Inter + JetBrains Mono subset 自托管 | — | `public/fonts/` |
| i18n | Astro 内置 `i18n` 配置 | — | 四语 UI,双语渐进文章 |
| 集成辅助 | `@astrojs/rss`;sitemap 自定义生成 | — | RSS per locale,自定义 sitemap.xml(见 6.10) |
| 代码质量 | `astro check` + `prettier` + `eslint` | — | 类型检查 + 格式化 + lint |
| 死链检查 | `lychee`(GitHub Action) | — | CI 死链校验 |
| 包管理 | pnpm | **9.15.5(固定,P2-2)** | workspace 友好,磁盘高效;与 `packageManager` 一致 |

**版本策略(P1-20)**:
- Spec 里 `^x` 表示"兼容该主版本",实际生产版本由 `package.json` + `pnpm-lock.yaml` 锁定(frozen-lockfile)
- **避免 `latest` 与 `^x` 混用**:npm 依赖用 `^x` 范围 + lockfile 锁定;CDN 资源(Sveltia CMS)使用 **exact pinned 版本 `@sveltia/cms@0.197.2`(实现前必须 `npm view @sveltia/cms versions` 确认该版本真实存在且稳定,m3;若不存在则以实际验证的稳定版本替换并同步 1.1/8.5/附录 B)**,不写 `1.x.y` 之类占位,不长期用 `latest`。**升级 Sveltia 必须重新验证**:i18n / `_slug` / `canonical_slug` / media / file collection / local repository / Admin CSP(见 8.5 升级矩阵)
- **Astro 7 兼容性(C1)**:Astro 7 默认 Markdown 处理器为 **Sätteri(Rust)**,remark/rehype 插件在 Sätteri 下**全部失效**——本项目必须**显式 `markdown.processor: unified({...})`**(见 7.2.2);`.astro` Rust 编译器要求合法 HTML 嵌套;`transition:persist`/`<Image>` 在 7.x 下的行为在实现首周验证(M5);Node 引擎 `>=22.12`(2026-09-06 按第 11 轮实现验证放宽,见 9.7 与修订记录)
- 升级时显式更新 `package.json` + lockfile,CI `--frozen-lockfile` 防漂移

**Toolchain Contract(P1-4,单一版本约束,升级时三者同步变更)**:

```yaml
runtime:
  node: ">=22.12"           # Astro 7 要求 >=22.12(C1);<23 上限于 2026-09-06 经 Node 24 实测移除(第 11 轮)
package:
  pnpm: 9.15.5               # 与 packageManager 一致(P0-3)
framework:
  astro: 7.x                 # 显式 processor: unified()(C1/P0-2)
bundler:
  vite: managed by astro     # 不直接声明/不锁定 Vite 版本(随 Astro 7 使用 Vite 8/Rolldown)
```

### 1.2 渲染模式

**`output: 'static'`**,全站构建时预渲染。零 server runtime。

理由:
- "兼容多平台"是硬需求,纯静态是唯一不打折扣的选择
- 个人站交互需求轻,无服务端动态能力需求
- 部署到 Cloudflare Pages / Vercel / Netlify / GitHub Pages 任一皆可,迁移成本几乎为零

**唯一需要 server 的地方**:Sveltia CMS 的 OAuth Authenticator(仅多用户生产场景需要;MVP 个人站用 Access Token,零部署)。Authenticator 独立于站点部署(Cloudflare Worker,用 Sveltia 官方的 `sveltia-cms-auth`),不影响站点本身的纯静态兼容性。详见第 7.3 节。

### 1.3 Vanilla Client Enhancement 策略

> **术语说明**:本节原称"islands",但为避免与 Astro 框架的 hydration island(React/Vue/Solid 组件 hydration)混淆,改称 **vanilla client enhancement**(原生 JS 客户端增强)。这些组件不是框架 hydration island,而是 Astro 组件内通过 `<script>` 注入的 vanilla JS 客户端逻辑。下文"enhancement"均指此。

**原则:零 React/Vue 运行时依赖**,首屏 JS 极小。

| 交互需求 | 实现方式 | 是否 enhancement |
|---|---|---|
| Giscus 评论 | 官方原生 `<script>` 嵌入 `<giscus-widget>` 自定义元素 | 否(第三方脚本) |
| 搜索 | SearchProvider 接口 + 具体 Provider(Pagefind MVP);SearchBox enhancement 只依赖接口 | 是(原生 JS) |
| 开往跳转 | 静态 `<a>` 指向 travellings 端点;可插拔 Integration | 否(静态链接) |
| 背景音乐 | MusicPlayer 接口 + 具体 Provider(HTML5 Audio MVP);MusicPlayerWidget enhancement,默认不播放用户点击才播 | 是(vanilla enhancement) |
| 暗色切换 | `localStorage` + 根元素 class 切换,内联 `<script is:inline>` 防闪烁 | 否(全局内联) |
| 文章 TOC 高亮 | IntersectionObserver,组件内 `<script>` | 是(vanilla enhancement) |
| 阅读进度条 | scroll 监听,组件内 `<script>` | 是(vanilla enhancement) |
| 代码块复制按钮 | 生成按钮 + clipboard API,组件内 `<script>` | 是(vanilla enhancement) |
| 图片 lightbox | 点击放大,组件内 `<script>` | 是(vanilla enhancement) |
| 首页背景动效 | CSS keyframes 为主,Canvas 仅在需要粒子时,组件内 `<script>` | 是(vanilla enhancement,可选) |
| 番剧/术曲墙交互 | hover/click 视觉反馈,scoped CSS + 少量 `<script>` | 是(vanilla enhancement) |
| 番剧状态筛选 | tab 单选 + 客户端过滤 | 是(vanilla enhancement) |

**enhancement 纪律**
- 优先用 CSS(动画、过渡、`:hover`、`:has`)实现交互,JS 只在 CSS 做不到时用
- 每个 enhancement 自包含:模板+样式+脚本在一个 `.astro` 文件内;脚本 ~80 行只是**参考阈值**,真正触发外置为 `X.client.ts` 的因素是复用性、可测试性、生命周期复杂度和独立职责(满足其一即可,避免机械拆分)
- enhancement 之间不共享运行时状态;需要联动走 props 或 CustomEvent
- 禁止引入 React/Vue/Solid 运行时(若未来某组件确需框架,单独评估是否升级该组件为框架 hydration island,但全站默认 vanilla)
- 启用 ClientRouter 后,所有 enhancement 必须遵守 5.20 的生命周期纪律(`astro:page-load` 等事件驱动,不再依赖"整页加载执行"的隐含假设)

### 1.4 可插拔思想

**模式**:功能通过"环境变量开关 + 条件渲染组件"实现可插拔,核心站点不依赖任何可插拔功能也能完整运行。

**可插拔 Integration 清单**
- Giscus 评论(`PUBLIC_GISCUS_ENABLED` + `PUBLIC_GISCUS_REPO`(**必须 public 的独立 discussions 仓,与 content 仓解耦**,见 7.4)+ `PUBLIC_GISCUS_REPO_ID` + 各 category id)
- Umami 分析(`PUBLIC_UMAMI_ENABLED` + `PUBLIC_UMAMI_SCRIPT_URL` + `PUBLIC_UMAMI_WEBSITE_ID`)
- 搜索(`PUBLIC_SEARCH_ENABLED` + `PUBLIC_SEARCH_PROVIDER=pagefind|none`;MVP 默认 `pagefind`,通过 SearchProvider 接口与 Search UI 解耦;**orama 在真正实现前不是有效配置值,P1-8**)
- 开往 Travellings(`PUBLIC_TRAVELLINGS_ENABLED`;默认开,关闭时友链页不渲染开往入口)
- 背景音乐(`PUBLIC_MUSIC_ENABLED`;默认关,MVP 默认不播放,用户点击控件才播放;通过 MusicPlayer 接口与播放控件解耦)

**纪律(reviewer 拦截)**:
- 任何"可选功能"必须能通过环境变量开关完整关闭,关闭后零 DOM、零网络请求、零构建依赖
- 可插拔组件不引用核心类型/schema,核心代码不 import 可插拔组件(单向依赖:可插拔 → 核心)
- 核心页面布局里调用可插拔组件用 `<Analytics />` `<Comments />` `<SearchBox />` `<Travellings />` `<MusicPlayerWidget />` 自闭合标签,功能存在与否对页面结构透明
- 搜索与音乐特殊:UI 组件(SearchBox/MusicPlayerWidget)只依赖 Provider 接口,不直接 import 任何具体 Provider;Provider 实现在 `integrations/{search,music}/` 子目录按配置注入
- 未来若新增"可选功能"都走同一模式,放 `integrations/<feature>/` 子目录

---

## 2. 目录结构

### 2.1 顶层结构

```
D:\Object920\
├── .opencode/                      # opencode 配置(已存在)
├── opencode.json                   # opencode 配置(已存在)
├── docs/superpowers/specs/
│   └── 2026-08-19-personal-site-design.md   # 本 spec 文件
├── src/
│   ├── content/                    # ← generated runtime content workspace(P1-1):构建前由 content repo 填充(git clone --depth 1),不入主仓;不要直接编辑
│   │   ├── articles/{zh,en}/{slug}/index.md  # 文章 Markdown + entry-relative 图片(folder collection)
│   │   ├── projects/{zh,en}/{slug}/index.md  # 工程展示 Markdown + entry-relative 图片(folder collection)
│   │   ├── data/
│   │   │   ├── anime.json          # 番剧清单(file collection)
│   │   │   ├── vocaloid.json       # 术曲清单(file collection)
│   │   │   └── friends.json        # 友链清单(file collection)
│   │   └── redirects.json          # URL 迁移 manifest(content repo 根,不属于 data collection,见 8.6/P0-3)
│   ├── pages/
│   │   ├── index.astro             # 根路径协商重定向(无 locale)
│   │   ├── [locale]/               # 动态 locale 路由(zh/en/ru/ja)
│   │   │   ├── index.astro         # 首页
│   │   │   ├── articles/{index,[...slug],tag/[tag],category/[cat],archive}.astro
│   │   │   ├── projects/{index,[slug]}.astro
│   │   │   ├── collection/{index,anime,vocaloid}.astro
│   │   │   ├── friends/index.astro
│   │   │   └── about/index.astro
│   │   ├── rss/[locale].xml.ts     # 每语言一个 feed
│   │   ├── robots.txt.ts
│   │   └── 404.astro
│   ├── components/
│   │   ├── layout/{BaseHead,Header,Footer,BaseLayout}.astro
│   │   ├── common/{Button,Card,Tag,Badge,Icon,LangSwitch,EmptyState}.astro
│   │   ├── article/{ArticleCard,ArticleList,ArticleProse,Toc,ReadingProgress}.astro
│   │   ├── article/{ArticleImageEnhancer,CodeBlockEnhancer}.ts  # astro:page-load 客户端增强(事件委托;非 Markdown AST 插件,见 7.2/7.11/P1-6)
│   │   ├── project/{ProjectCard,ProjectList,Gallery,SpecsTable,DatasheetDownload}.astro
│   │   ├── collection/{AnimeCard,AnimeWall,StatusFilter,VocaloidCard,VocaloidWall}.astro
│   │   ├── friends/{FriendCard,FriendList}.astro
│   │   ├── home/{Hero,HomeSections}.astro
│   │   ├── integrations/             # 可插拔 Integration 统一目录(与核心解耦)
│   │   │   ├── analytics/Analytics.astro                 # Umami 分析
│   │   │   ├── comments/Comments.astro                   # Giscus 评论(独立 integration 目录,见 7.4)
│   │   │   ├── search/               # 可插拔搜索 Provider + UI(Search Integration UI 统一在此)
│   │   │   │   ├── SearchBox.astro  # 搜索 UI(vanilla enhancement,只依赖接口)
│   │   │   │   ├── SearchProvider.ts  # 统一接口(initialize/ready/search/destroy)
│   │   │   │   ├── createSearchProvider.ts  # 最小 resolver(按配置选实现)
│   │   │   │   └── PagefindProvider.ts  # MVP 默认实现(纯 .ts,非 .astro)
│   │   │   ├── travellings/Travellings.astro   # 开往友链接力
│   │   │   └── music/                # 可插拔背景音乐
│   │   │       ├── MusicPlayer.ts    # 统一接口(类似 SearchProvider)
│   │   │       ├── createMusicProvider.ts  # 最小 resolver
│   │   │       ├── MusicHost.astro       # 常驻 persistent 容器(transition:persist,全页面存在,见 5.12/5.20)
│   │   │       ├── MusicPlayerWidget.astro # 播放控件(vanilla enhancement,形态后期设计,挂 MusicHost)
│   │   │       └── HtmlAudioProvider.ts  # MVP 默认(纯 .ts,基于 HTML5 Audio,绑定外部 persistent audio 元素)
│   │   ├── ui/{ThemeToggle,MobileNav,Lightbox}.astro
│   │   └── errors/NotFound.astro
│   ├── i18n/
│   │   ├── config.ts               # locales/defaultLocale
│   │   ├── ui/{zh,en,ru,ja}.ts     # UI 文案字典(zh/en 全填,ru/ja 空壳)
│   │   └── utils.ts                # t() 翻译函数 + locale 路由工具
│   ├── styles/
│   │   ├── tokens.css              # 设计 token 单一真相源
│   │   ├── global.css              # reset + 字体 + body + 全局元素
│   │   ├── animations.css          # 跨组件共用 keyframes(复用>2 处)
│   │   └── prose.css               # 文章 prose 自定义微调
│   ├── layouts/{ArticleLayout,ProjectLayout}.astro
│   ├── lib/
│   │   ├── content.ts              # Content Collections 读取工具(getCollection 辅助)
│   │   ├── assets.ts               # assets 仓库下载链接构造
│   │   ├── i18n.ts                 # 文章双语渐进辅助
│   │   ├── seo.ts                  # OG/canonical/hreflang/自定义 sitemap/CSP 辅助
│   │   ├── image.ts                # 内容图片辅助:ImageMetadata 解析、buildOgImageUrl()、占位图/alt 纪律工具(不承担 OG 生成,见 7.2.1/7.9)
│   │   ├── og.ts                   # satori OG 图生成(OG_TEMPLATE_VERSION、内容 hash 增量)
│   │   ├── rehype-article-image.ts # 图片 rehype 插件(HTML AST 阶段,只改结构不改 source 语义,见 7.2.2)
│   │   ├── rehype-codeblock.ts     # 代码块 rehype 插件(HTML AST 阶段,见 7.11)
│   │   └── giscus.ts               # updateGiscusTheme() 等 Giscus 主题同步辅助(见 7.4)
│   ├── scripts/                    # 独立脚本(不进 bundle,用于构建前后)
│   │   ├── pull-content.mjs        # git clone/pull content 仓到 src/content
│   │   ├── search-index.mjs        # postbuild 跑(检查配置,pagefind 启用才跑 pagefind --site dist)
│   │   ├── check-datasheets.ts     # prebuild 校验 assets 文件存在
│   │   ├── generate-og.ts          # postbuild 生成 OG 图(增量,输出 dist/og/)
│   │   ├── build-meta.mjs          # 生成 dist/build-meta.json(git 读取只在此类 scripts 内,见 2.2-8)
│   │   ├── generate-redirects.ts   # 读取 src/content/redirects.json → 平台 301 规则/静态 redirect HTML(见 8.6/M4)
│   │   ├── check-sitemap.ts        # postbuild 校验 sitemap.xml 与页面清单一致
│   │   └── check-rss.ts            # postbuild 校验 RSS feed 链接一致
│   └── config/                     # 站点配置统一目录(P2-1)
│       ├── site.ts                # 站点级配置(siteUrl/siteName 等)
│       ├── music.ts               # 歌单配置(见 5.12)
│       └── static-pages.ts        # 静态页元数据(staticPageMeta,含 lastmod,见 6.10/P1-14)
├── src/content.config.ts           # Astro 7.x Content Layer API 配置入口(defineCollection + loader + schema)
├── public/
│   ├── admin/                     # Sveltia CMS 入口(静态文件,不被 Astro 处理)
│   │   ├── index.html             # <script src="https://unpkg.com/@sveltia/cms@0.197.2/dist/sveltia-cms.js">(exact pinned 已验证版本,非 latest);<html data-pagefind-ignore> 直接写死;自带独立 CSP(允许 unpkg.com,见 8.5)
│   │   └── config.yml             # Sveltia 配置(纯静态,base_url 非密钥可硬编码)
│   ├── fonts/                      # 自托管 Inter + JetBrains Mono subset woff2
│   ├── images/                     # 默认 OG 图、favicon、image-broken 占位图
│   └── (pagefind 索引与 OG 图输出均在 dist/,见 7.9/7.10,不入 public/)
├── deploy/                         # 平台适配目录(参考实现)
│   ├── cloudflare/{README.md,_headers,_redirects}
│   ├── vercel/{README.md,vercel.json}
│   ├── netlify/{README.md,netlify.toml,_redirects}
│   ├── github-pages/{README.md,.github/workflows/deploy.yml}
│   └── oauth-proxy/{cloudflare-worker/,vercel-edge/}
├── .env.example                    # 环境变量模板(入仓)
├── .env                            # 本地环境变量(不入仓)
├── .gitignore                      # 含 src/content/(构建时拉取,不入仓)
├── astro.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── package.json
├── pnpm-lock.yaml
├── README.md                       # 接手指南(必读)
├── CONTRIBUTING.md
└── .github/workflows/ci.yml
```

### 2.2 关键结构决策

1. **`src/content` 构建时动态拉取(非 git submodule)**:主仓**零内容文件**,`src/content/` 在 `.gitignore` 里不入仓。`src/scripts/pull-content.mjs` 三模式:首次 clone(`src/content/` 不存在时)、手动更新(`pnpm pull:content` 显式)、**CI 强制同步(仅 CI 注入 `FORCE_CONTENT_SYNC=true`;本地 `pnpm build` 默认非 destructive,dirty 时提示 commit/stash 而非 reset --hard,P0-1)**。**predev 只在首次 clone 时跑,已存在时不自动 pull**(避免 Sveltia 本地未提交修改被覆盖)。Sveltia CMS 提交直接推 content 仓,主仓**无需任何指针更新提交**——这是接手者必读第一条
2. **`src/pages/[locale]/` 动态 locale 路由**:defaultLocale `zh` 也走 `/zh/...` 显式前缀,保持路由对称;根路径 `/` 单独做协商重定向(见 6.7);`404`、`rss`、`robots` 不走 locale。**Sveltia CMS 的 admin 放 `public/admin/` 而非 `src/pages/admin/`**——Sveltia 官方明确要求 admin 是纯静态 HTML 文件,不能被 Astro 的 live reload 处理,否则本地编辑时会反复刷新
3. **`src/components` 按领域分目录**:领域目录(article/project/collection/friends/home/integrations/layout/errors)自包含;跨领域复用走 `common/`;**领域叶子组件间禁止互相 import**,但页面/Home 聚合层可组合多个领域组件(如 HomeSections 组合 ArticleCard+ProjectCard+AnimeCard);领域 → common 单向依赖。`common/` 只放无业务语义的真正通用 primitives(Button/Card/Tag/Badge/Icon/LangSwitch/EmptyState),不放业务组件;**SearchBox 不是 primitive,它是 Search Integration UI,必须放在 `integrations/search/`**(见 5.11)
4. **`src/styles` 三层样式落点**:`tokens.css` 单一真相源,`global.css` 全局基础,`animations.css` 跨组件复用 keyframes,`prose.css` 文章排版微调;组件 scoped 样式写在 `.astro` 内 `<style>`,超阈值外置 `X.module.css` 到同目录
5. **可插拔 Integration 隔离**:所有可插拔模块统一在 `src/components/integrations/` 目录,子目录按功能分(`analytics/`、`search/`、`travellings/`、`music/`)。核心布局通过 `<Analytics />` `<Comments />` `<SearchBox />` `<Travellings />` `<MusicPlayerWidget />` 调用,开关在环境变量,单向依赖。搜索与音乐特殊:UI 组件(SearchBox/MusicPlayerWidget)只依赖 Provider 接口,具体 Provider 实现在各子目录按配置注入
6. **`src/scripts` 与 `src/lib` 分离**:`src/lib` 进 bundle,`src/scripts` 不进 bundle(Node 脚本,通过 package.json scripts 调用)
7. **`deploy/` 目录隔离平台配置**:主仓根目录不放平台耦合文件,选定平台后把对应 `deploy/{platform}/` 配置复制到根
8. **Git 操作只允许出现在 `src/scripts/`(P2-25)**:`git clone`/`fetch`/`reset`/`rev-parse`/`log` 等命令只在 `src/scripts/` 下执行(`pull-content.mjs`、`build-meta.mjs` 等);**`src/lib/`、`src/components/` 禁止出现任何 git 命令**——避免构建环境逻辑进入浏览器 bundle。commit/时间读取统一由脚本产出数据或经环境变量传入,lib 只消费

### 2.3 构建产物与缓存目录(入 .gitignore)

`src/content/`(构建时 git clone 拉取,不入仓)、`src/.build-meta.generated.json`(prebuild 生成,不入仓,P1-10)、`.cache/`(OG 增量缓存等,不入仓,P0-1)、`dist/og/`(postbuild 生成,只存最终 OG 文件)、`dist/pagefind/`(postbuild 生成)、`dist/`、`node_modules/`

---

## 3. 设计 token 与三层样式架构

### 3.1 三层职责划分

| 层 | 文件 | 职责 | 引用方式 |
|---|---|---|---|
| **token 层** | `src/styles/tokens.css`(含 `@theme` 块) | 所有设计维度的唯一真相源:颜色/间距/圆角/阴影/动效/字号/字重/行高/层级/容器宽度。用 `@theme` CSS 指令声明,Tailwind v4 自动生成 utility;CSS 变量供 scoped CSS 引用 | `global.css` @import;scoped CSS `var(--*)` 引用;Tailwind utility 由 `@theme` 自动生成 |
| **utility 层** | Tailwind v4(由 `@theme` 生成) | 布局/间距/响应式/排版/暗色 utility;`@tailwindcss/typography` 管文章 prose | 组件 `class` 直接用 utility |
| **scoped 层** | Astro `<style>` / `.module.css` | 华丽动效、视觉特效、复杂装饰、首页背景、展示墙视觉 | 组件内 `<style is:global={false}>` 或同目录 `X.module.css` |

**单一真相源纪律**:scoped CSS 禁止硬编码 token 已定义的维度(颜色/间距/字号/圆角/阴影/动效),必须 `var(--*)` 引用。违例由 reviewer 拦截。

### 3.2 token 命名规范

命名 schema:`--<category>-<semantic>[-<state>]`
- `<category>`:color / spacing / radius / shadow / font / motion / z / breakpoint
- `<semantic>`:语义名(accent / surface / content / muted ...)
- `<state>`(可选):hover / active / focus / disabled

全部用语义名而非裸色值(如 `--color-accent` 而非 `--blue-500`),让暗色模式只改变量值不改类名。

### 3.3 完整 token 清单

token 覆盖以下维度(具体值在实现时确定,此处定结构):
- **颜色**:accent(主强调)、bg(页面底色)、surface(卡片背景)、surface-raised、surface-overlay、text、text-muted、text-subtle、text-on-accent、border、border-strong、success/warning/danger/info(语义色)
- **间距**(4px 基线):3xs(4px)/2xs(8px)/xs(16px)/sm(24px)/md(32px)/lg(48px)/xl(64px)/2xl(96px)/3xl(128px)
- **圆角**:sm/md/lg/xl/2xl/full
- **阴影**:sm/md/lg/glow(华丽组件用)
- **字体**:
  - `--font-sans`(比例字体栈,中西日合栈,`@theme` 的 `--font-*` 命名空间生成 `font-sans` utility):`'Inter', -apple-system, 'Segoe UI', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans CJK JP', sans-serif`
  - `--font-mono`(等宽字体栈,含 CJK 回退,生成 `font-mono` utility):`'JetBrains Mono', 'Fira Code', ui-monospace, 'SFMono-Regular', 'Consolas', 'Microsoft YaHei', 'Noto Sans CJK SC', monospace`
  - **字号**(用 Tailwind v4 `--text-*` 命名空间,自动生成 `text-xl` 等 utility):`--text-2xs`(12px)/`--text-xs`(14px)/`--text-sm`(16px)/`--text-md`(18px)/`--text-lg`(20px)/`--text-xl`(24px)/`--text-2xl`(30px)/`--text-3xl`(36px)/`--text-4xl`(48px)
  - **字重**(Tailwind v4 内置 `font-bold` 等,自定义用 `--font-weight-*`):regular(400)/medium(500)/semibold(600)/bold(700)
  - **行高**(用 Tailwind v4 `--leading-*` 命名空间,生成 `leading-*` utility):`--leading-tight`(1.2)/`--leading-base`(1.6)/`--leading-prose`(1.75)
- **动效**:`--ease-out`/`--ease-in-out`/`--ease-spring`(缓动,Tailwind v4 `--ease-*` namespace 生成 `ease-*` utility);`--duration-fast`(150ms)/`--duration-base`(250ms)/`--duration-slow`(400ms)/`--duration-slower`(600ms)(**内部 token,不进 @theme**——Tailwind v4 无 `--duration-*` namespace,duration 走 `duration-*` utility 直接用毫秒值如 `duration-150`;这些 token 供 scoped CSS `var(--duration-*)` 引用);`--motion-scale`(全局动效缩放因子,降级时为 0,内部 token)
- **z-index**:base(1)/dropdown(10)/header(50)/overlay(100)/modal(1000)/toast(1100)
- **容器宽度**:prose(720px)/page(1080px)/wide(1280px)

### 3.4 暗色模式实现

`:root` 定义亮色值,`:root[data-theme="dark"]` 覆盖颜色相关 token(间距/动效/字号不变),`@media (prefers-color-scheme: dark)` 下 `:root:not([data-theme])` 跟随系统。暗色模式只改 token 值,不写两套 utility 类。部分语义颜色在两种模式间值相同(如品牌强调色)是允许的。

### 3.5 Tailwind v4 配置与 token 对齐(@theme CSS 指令)

Tailwind v4 采用 **CSS-first 配置**:不再需要 `tailwind.config.mjs` JS 配置文件,token 直接在 CSS 里用 `@theme` 指令声明,Tailwind 自动生成对应 utility。这把"token 层"和"utility 层"合二为一,省掉 JS 中介。

```css
/* src/styles/tokens.css(Tailwind v4 @theme 配置) */
@import "tailwindcss";

/* 通过 @theme 声明的变量,Tailwind 自动生成 utility:
   --color-accent → bg-accent / text-accent / border-accent 等
   --spacing-xs → p-xs / m-xs / gap-xs 等
   --font-sans → font-sans
   --radius-lg → rounded-lg 等
   --ease-spring → ease-spring
   (注意:--duration-* 无 Tailwind namespace,不进 @theme;duration 用 duration-150 等直接值 utility,
    --duration-* 作为内部 token 在 :root 定义,供 scoped CSS var(--duration-*) 引用,见下方纪律)
*/
@theme {
  /* 颜色 */
  --color-accent: #...;
  --color-bg: #...;
  --color-surface: #...;
  --color-surface-raised: #...;
  --color-text: #...;
  --color-text-muted: #...;
  --color-border: #...;
  /* ... 其余颜色 token */

  /* 间距 */
  --spacing-3xs: 0.25rem;
  --spacing-2xs: 0.5rem;
  --spacing-xs: 1rem;
  /* ... 其余 spacing token */

  /* 圆角 */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  /* ... */

  /* 字体 */
  --font-sans: 'Inter', -apple-system, 'Segoe UI', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans CJK JP', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, 'SFMono-Regular', 'Consolas', 'Microsoft YaHei', 'Noto Sans CJK SC', monospace;

  /* 字号 -- 用 --text-* 命名空间,生成 text-xl 等 utility */
  --text-2xs: 0.75rem;
  --text-xl: 1.5rem;
  /* ... */

  /* 行高 -- 用 --leading-* 命名空间,生成 leading-* utility */
  --leading-tight: 1.2;
  --leading-base: 1.6;
  /* ... */

  /* 动效 -- ease 用 --ease-* namespace 生成 ease-* utility */
  --ease-out: cubic-bezier(0.16, 1, 0.0, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  /* duration 不进 @theme(Tailwind v4 无 --duration-* namespace);
     用 :root 定义内部 token,scoped CSS 用 var(--duration-*);utility 用 duration-150 等直接值 */
  /* ... */
}

/* duration 作为内部 token,在 :root 定义(非 @theme) */
:root {
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;
  --motion-scale: 1;  /* 内部 token,降级时 0 */
}
```

**`@theme inline` 规则(P1-11)**:当 theme variable 引用其他 CSS variable 时用 `@theme inline`(utility 用变量值而非引用),避免 CSS 变量解析层级问题。例:`@theme inline { --font-sans: var(--font-inter); }`。本项目 Inter subset 自托管,若 `--font-inter` 在 `:root` 定义而 `--font-sans` 在 `@theme` 引用它,需 `inline` 否则 utility 可能解析到 fallback。MVP 字体直接定义在 `@theme` 不需 inline;仅在引入间接引用时用。

**暗色模式**:`@theme` 块定义的是静态(亮色)值。暗色模式通过 `:root[data-theme="dark"]` 覆盖同名 CSS 变量值(见 3.4),utility 名不变,Tailwind 生成的 utility 自动跟随变量值切换。

```css
/* tokens.css 暗色覆盖(与 @theme 同文件) */
:root[data-theme="dark"] {
  --color-bg: #0f0f12;
  --color-text: #e8e8ea;
  /* ... 仅覆盖颜色 */
}
```

**纪律**:
- **不再需要 `tailwind.config.mjs`**:v4 用 CSS 配置,主仓根目录不放 JS 配置文件
- **token 单一真相源**:`@theme` 块既是 Tailwind 的主题源,也是 scoped CSS 的 `var(--*)` 引用源,两者天然同源
- **Token 命名遵循 Tailwind v4 命名空间**:需生成 utility 的 token 必须用 Tailwind v4 的命名空间前缀(`--color-*`→颜色 utility、`--text-*`→`text-*` 字号 utility、`--leading-*`→`leading-*` 行高 utility、`--font-*`→`font-*` 字体 utility、`--spacing-*`、`--radius-*`、`--shadow-*`、`--ease-*`)。**Design Token ≠ Tailwind Theme Variable**:不要用 `--font-size-xl` 这种自创名(不会生成 utility),用 `--text-xl`。**`--duration-*` 不是 Tailwind v4 namespace**(无此 namespace,duration 走 `duration-150` 等直接值 utility)——`--duration-*` 作为内部 token 在 `:root` 定义,供 scoped CSS `var()` 引用,不进 `@theme`。仅内部使用、不需生成 utility 的 token 可保留语义名(如 `--motion-scale`、`--duration-*`)
- **`@theme inline` 用于间接引用**:当 `@theme` 里的变量引用其他 CSS variable 时用 `@theme inline`(utility 用值而非引用),避免解析层级问题;直接定义值的不需 inline
- **暗色只改变量值**:不写两套 utility,不写 `dark:` 前缀的重复 utility(除非必要)
- **utility 命名自动**:`--color-accent` → `bg-accent`/`text-accent`/`border-accent`;`--spacing-xs` → `p-xs`/`m-xs`/`gap-xs`;无需在 JS 里映射
- **scoped CSS 仍用 `var(--*)`**:scoped 层引用变量方式不变,与 v3 一致
- reviewer 检查:`@theme` 块变量名是否用了正确的 Tailwind v4 命名空间(拦截 `--font-size-*` 等错误前缀)

### 3.6 scoped 层工作纪律

**何时用 scoped `<style>`**:
```
这个样式需求是?
├─ 布局/间距/响应式/排版/暗色          → Tailwind utility
├─ 重复性 UI(按钮/卡片/输入框/tag)    → Tailwind + 抽 common 组件
├─ 复杂动画(keyframes/多阶段过渡)     → Scoped <style>
├─ 伪元素装饰/滤镜/mask/混合模式       → Scoped <style>
├─ 首页背景/展示墙视觉特效            → Scoped <style>
└─ 全局基础(reset/字体/body)         → src/styles/global.css
```

**外置触发阈值**:scoped `<style>` 块 **> 100 行** → 抽到同目录 `X.module.css`(CSS Modules 命名,保持作用域)

**拆子组件触发阈值**:组件视觉由多个独立可理解的区块组成 → 拆子组件,每个子组件各自 scoped;父组件只做布局+数据分发,视觉特效放叶子组件;原则是"区块能在不读其他区块的情况下独立理解"才拆,否则保持内联;避免过拆反效果

**keyframes 复用纪律**:同一 keyframe 复用 > 2 处 → 抽到 `src/styles/animations.css`,组件通过类名引入而非重写

**`@apply` 使用边界**:仅限"把 2-3 个 utility 压成语义类"的小范围使用,不作为压缩 scoped 行数的主要手段,不在 scoped 里用 `@apply` 重写整套 utility

### 3.7 字体策略(双轨制)

**核心**:文章代码块用等宽字体,所以西文实际是两套字体并存:比例字体(Inter,正文/UI) + 等宽字体(JetBrains Mono,代码块)。两套字体各自定义 token,各自 subset,各自 `@font-face`,不混用。

| 语言 | 角色 | 字体 | 来源 |
|---|---|---|---|
| zh | 比例(正文/UI) | 系统字体栈 | 系统 |
| en | 比例(正文/UI) | Inter subset(Latin)自托管 | `public/fonts/` |
| ru | 比例(正文/UI) | Inter subset(Latin + Cyrillic)自托管 | `public/fonts/` |
| ja | 比例(正文/UI) | 系统字体栈 | 系统 |
| 全语言 | 等宽(代码块) | JetBrains Mono subset 自托管 | `public/fonts/` |

**关键兼容点**:`--font-sans` 和 `--font-mono` 都包含中西日回退,确保代码块里出现中文注释或日文时也能正常显示。

**字体兼容纪律**:
1. 双轨独立:比例与等宽各自定义 token、subset、`@font-face`,不混用
2. 代码块只用 `--font-mono`:ArticleProse 里 `pre`、`code` 强制 `font-family: var(--font-mono)`,不继承正文
3. 等宽栈含 CJK 回退:`--font-mono` 栈尾保留 CJK 系统字体
4. inline code 与 block code 统一用 `--font-mono`
5. JetBrains Mono subset 只含 Latin + 常用标点 + 编程符号;CJK 不进等宽 subset,交给系统回退
6. `font-display: swap`(两套字体都 swap,避免 FOIT)
7. 只 preload Inter normal weight(首屏正文用),JetBrains Mono 不 preload(代码块非首屏关键)
8. fallback 字体度量对齐:减少 swap 时布局跳动(`size-adjust` 可微调)

`@font-face` 用 `unicode-range` 分片,让浏览器只在页面用到对应字符时才下载对应文件(Latin、Cyrillic 各一个 Inter 文件)。

### 3.8 `prefers-reduced-motion` 降级

`global.css` 末尾 `@media (prefers-reduced-motion: reduce)` 下:
- `--motion-scale: 0`、所有 `--duration-*` 归 `0.01ms`
- 全局 `animation-duration`/`transition-duration`/`scroll-behavior` 强制最小
- **不只依赖 duration=0**:CSS `animation` 必要时用 `animation: none` 彻底停(而非只缩时长,某些无限循环动画即使 0.01ms 也耗电);`transition` 用 duration 归零足够
- **JS/Canvas 动画必须真正停止**:不能用"duration 短就行"敷衍——`requestAnimationFrame` 循环必须读 `--motion-scale` 或 `matchMedia('(prefers-reduced-motion: reduce)')` 决定是否取消 raf;Canvas 粒子/物理动画必须停止 raf 循环(不渲染),而非只降帧率。**检测方式示例(m7,仅客户端 JS)**:CSS 自定义属性在 JS 中需经 `getComputedStyle` 读取(构建时/服务端不可用):

```ts
// 客户端脚本内
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// 或读取 CSS 变量:
const motionScale = getComputedStyle(document.documentElement).getPropertyValue('--motion-scale').trim();
if (reducedMotion || motionScale === '0') { /* 不启动 raf 循环 */ }
```
- 华丽组件写 CSS 动画时用 `calc(var(--duration-*) * var(--motion-scale))` 形式;写 JS/Canvas 动画时必须检查 `--motion-scale === 0` 或 `matchMedia` reduced-motion,是则不启动 raf 循环

**纪律**:reduced-motion 降级要"真正停止"而非"缩短"——CSS 无限动画用 `animation: none`,JS/Canvas raf 循环用条件取消。duration 归零只够处理一次性 transition。

### 3.9 global.css 内容大纲

`@import './tokens.css'` + `@import './animations.css'` + 精简 reset + `@font-face`(Inter Latin/Cyrillic + JetBrains Mono Latin)+ body 全局样式(引用 token)+ `::selection`/`:focus-visible` 全局样式 + `prefers-reduced-motion` 降级

### 3.10 文章 prose 排版

`@tailwindcss/typography` 的 `prose` 基础 + `src/styles/prose.css` 微调:字号/行高引用 token、链接 accent 色、代码块 `--font-mono` 与深色背景、引用块/表格/图片说明微调。在 `ArticleProse.astro` 引入。

---

## 4. 内容数据模型

### 4.1 数据模型总览

采用 **Astro 7.x Content Layer API**(6.x 引入、7.x 延续,`loader: glob()` / `loader: file()`),schema 配置统一在 `src/content.config.ts`。三类内容,两种 collection 模式,统一由 Zod schema 做类型校验:

| 内容类型 | Collection 模式 | loader | 存储形式 | 关键特性 |
|---|---|---|---|---|
| 文章 | Content Collection | `glob({ pattern: '**/index.md', base: './src/content/articles' })` | `src/content/articles/{locale}/{slug}/index.md` | 双语渐进,locale 子目录 + 每篇一个目录,图片 entry-relative |
| 工程 | Content Collection | `glob({ pattern: '**/index.md', base: './src/content/projects' })` | `src/content/projects/{locale}/{slug}/index.md` | 与 Sveltia multiple_folders 一致,含数据手册下载链接 |
| 番剧 | Data Collection | `file('src/content/data/anime.json', { parser: (text) => JSON.parse(text).items })` | `src/content/data/anime.json` | JSON `{ items: [...] }`(Sveltia 编辑友好),parser 桥接提取数组,每 item 有 id,状态单选筛选 |
| 术曲 | Data Collection | `file('src/content/data/vocaloid.json', { parser: (text) => JSON.parse(text).items })` | `src/content/data/vocaloid.json` | 同番剧 parser 桥接模式 |
| 友链 | Data Collection | `file('src/content/data/friends.json', { parser: (text) => JSON.parse(text).items })` | `src/content/data/friends.json` | 同番剧 parser 桥接模式 |

**关键纪律**:
- CMS `config.yml` 的字段定义与 Astro Zod schema **必须一一对应**,reviewer 在 PR 审查时核对
- 先靠纪律维护,后期维护痛了再上代码生成脚本;**MVP 至少做 `schema-contract.test.ts` 契约测试(P2-13/P2-26),范围限定为:字段名、必填性、基础类型、默认值、i18n 标记(不做 Zod → Sveltia schema generator,不要把它变成新的复杂配置系统);长期规划(P2-33):升级为自动一致性检查/生成机制,避免 config 漂移只靠 reviewer**
- **当前 JSON schema 是基线,会随 UI 设计迭代增减字段**。任何增减都必须两边同步
- schema 配置文件位置:`src/content.config.ts`(主仓 `src/` 下,不在 content 仓库内,因为 schema 是代码不是内容;content 仓库由 `pull-content.mjs` 拉到 `src/content/`,但 schema 留在主仓)
- **内容目录结构必须与 Sveltia `i18n.structure: multiple_folders` 一致**:articles 与 projects 一律使用 `{locale}/{slug}/index.md` 两层结构,**禁止再出现 `projects/*.md` 扁平结构与 locale 子目录并存**(见 4.2/4.3)
- **内容 locale 唯一真相 = 目录(P0-4/P0-2)**:**已删除 frontmatter `lang` 字段**。`articles/{locale}/...` 与 `projects/{locale}/...` 的目录层级是内容语言唯一真相源,由 `deriveLocaleFromPath()`(`src/lib/i18n.ts`)直接推导,形成唯一链路:`目录 → locale → HTML lang → Pagefind language → RSS locale → hreflang`——**不存在第二份 lang 真相,Sveltia 新建内容也不会因 lang 缺失而 schema 失败**
- **slug 唯一真相 = entry 目录名(P0-2/P0-1)**:frontmatter **不声明 slug**;目录名一路传导:`目录名 → Astro entry → URL slug → OG 文件名 → i18n 路径`。**Sveltia 侧用稳定 `_slug` 机制实现(P0-1)**:collection 配置 `slug: "{{fields._slug | localize}}"` + `path: "{{slug}}/index"`;`_slug` 是 **CMS 内部 slug 元数据(不进 Astro schema)**,首次创建时由 title 生成初始值,**之后 title 修改 ≠ slug 修改**,只有显式编辑 `_slug` 才是 URL 修改。**Slug ASCII 策略(P1-4)**:不依赖自动从标题生成 slug,`_slug` 必须手动保证 `^[a-z0-9]+(?:-[a-z0-9]+)*$`(中文标题不会自动转 ASCII slug),构建侧 `validateSlugs()` 严格校验。**URL migration 纪律(P1-5)**:slug 修改必须同步在 content repo 的 `redirects.json` 登记旧 URL → 新 URL(301)
- **不同语言允许不同 slug(P2-15,invariant)**:同一 `translationKey` 的两个语言版本**不要求相同 slug**(`zh/astro-架构/` ↔ `en/astro-architecture/` 合法);`getLocalizedEntryPath()` 必须按 translationKey 查目标语言 entry 并取**目标 slug**,绝不假设两端同 slug
- **`entry.id`、`locale`、`slug`、`translationKey` 四者职责(P0-3)**:`entry.id` 是 Astro glob 生成的内部标识(格式 `{locale}/{slug}`,**不等于 slug**);`locale` 来自目录层级;`slug` 来自 entry 目录名(URL 片段唯一来源);`translationKey` 仅用于跨语言配对。`single:${entry.id}` 合成 key 使用完整 id 保证唯一
- **三类 identity 数据(C2,固定定义,基于 Sveltia 实际机制)**:
  - `_slug` → **当前语言 URL slug**:在 Sveltia `fields` 中**显式声明的字符串字段**(`required: false`),slug 模板引用它;修改 = URL migration → redirects.json
  - `translationKey` → **Object920 内容 identity**(跨语言配对,**不代表 URL**);**同时作为 Sveltia `canonical_slug.key`(Sveltia 默认即 `translationKey`,用于跨语言文件链接)——不需要自造 `_canonicalSlug`**
  - `redirects.json` → **历史 URL migration 清单**(content repo 根)
- **Sveltia 路径相对 content repo 根(P0-1)**:`src/content/` 本身就是被 clone 下来的 content 仓库根目录,因此 Sveltia `config.yml` 中 `folder: "articles"`/`folder: "projects"`/`file: "data/anime.json"`(**绝不能写成 `src/content/...`**)——那是主仓库视角的路径,只用于 Astro loader
- **构建期校验函数族(所有冲突直接 build fail)**:`deriveLocaleFromPath()`(从 entry 路径推导 locale,路径格式非法报错)、`validateSlugs()`(目录名合法 `^[a-z0-9]+(?:-[a-z0-9]+)*$` + **invariant:`unique(collection, locale, slug)`**——同 collection+locale 内 slug 重复非法,跨 collection 合法)、`validateTranslationGroups()`(同 collection+translationKey+locale 最多 1 条)、`validateOgImageFields()`(`ogImage` 与 `ogImageLocal` 互斥)、**`validateCollectionItemIds()`(JSON collection 的 item.id 在 collection 内唯一,anime/vocaloid/friends,P1-2)**、**redirect 校验拆两阶段(P1-7)**:`validateRedirectManifest()`(content repo 负责:JSON 格式、source/target 站内绝对路径、trailingSlash 统一、target 非外部域名、`source != target`、A→B/B→A 环、A→B→C 链禁止)与 `validateGeneratedRoutes()`(main repo 负责,在 Astro build 生成路由后执行:`target ∈ generatedRoutes` 且 `source ∉ generatedRoutes`——content repo 不知道最终路由,不能承担此检查);统一在 `src/lib/i18n.ts` / `src/lib/content.ts` 实现,见 6.5/7.9/8.6
- **`lastUpdated` 不进 Collection schema**:番剧/术曲/友链的"最后更新时间"用 content 仓库的**最新 commit 时间**(`git -C src/content log -1 --format=%cI`,不带 `-- <file>` 路径过滤),在构建时读取注入,不作为内容字段维护——避免手动更新与内容数据耦合。**不单独追踪每个 JSON 文件的历史**:因为 `git clone --depth 1` 只拉最新一个 commit,`-- <file>` 路径过滤会查不到文件历史(该文件可能不在最新 commit 里);统一用 content repo 最新 commit 时间作为"内容最后更新"语义合理(用户关心"内容仓有没有新东西",而非单文件粒度),且与 `--depth 1` 兼容
- **JSON 结构用 `{ items: [...] }` + parser 桥接**:Sveltia file collection 要求文件是对象(fields 定义命名属性),无法编辑顶层裸数组;而 Astro `file()` loader 期望顶层数组(每对象有 `id`)或顶层对象(key 是 id)。两者通过 `parser: (text) => JSON.parse(text).items` 桥接:Sveltia 写 `{ items: [...] }`,Astro 用 parser 提取 items 数组,每个 item 作为独立 entry(必须有 `id` 字段),`getCollection('anime')` 直接返回所有条目。这是 Sveltia 编辑友好性与 Astro file() 多 entry 语义之间的官方解法(见 Astro 文档 "Nested JSON documents")

### 4.2 文章数据模型

#### Frontmatter schema(Zod,Content Layer API)

```ts
// src/content.config.ts(Astro 7.x Content Layer API 配置入口)
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/articles',
    generateId: ({ entry }) => entry.replace(/[/\\]index\.md$/, ''),  // entry 已相对 base,勿再 path.relative();id = "{locale}/{slug}",如 zh/hello-world
  }),
  schema: ({ image }) => z.object({  // image() helper 用于本地图片走 astro:assets
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    translationKey: z.string().trim().min(1).optional(),   // opaque identifier(P2-13):不允许空串/纯空格,格式不解析
    category: z.string().default('uncategorized'),
    tags: z.array(z.string()).default([]),
    cover: image().optional(),          // 仅本地 entry-relative 图(P1-11);Article/Project 不支持远程封面(远程封面只存在于 JSON collection)
    coverAlt: z.string().trim().min(1), // 必填且非空(P1-12):cover 是内容图,不允许空串;Sveltia 同步 required
    excerpt: z.string().optional(),
    draft: z.boolean().default(false),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    ogImage: z.string().url().optional(),      // OG 三选一:远程 URL
    ogImageLocal: image().optional(),          // OG 三选一:本地图(astro:assets);均未设置 → 构建时自动生成(见 7.9)
  }),
});
```

**图片 schema 纪律(local vs remote)**:
- **本地图片**(走 astro:assets 优化):用 `image()` helper,frontmatter 填相对路径(如 `cover: "./cover.jpg"`),Astro 自动导入优化为 AVIF/WebP + srcset
- **Article/Project `cover`/`gallery` 只允许本地 entry-relative 图(P1-11)**:`cover` 用 `image()`;远程封面**不是** Article/Project 的合法输入
- **远程图片只出现在两个场景(P1-11)**:JSON collection 的 `cover`/`avatar`(`z.string().url()`)与正文里的远程 `<img>`(不走 astro:assets,`<img loading="lazy">`,除非配 `image.domains`);JSON collection **已删除 `coverLocal`/`avatarLocal` 本地上传字段**——JSON collection 无法用 `image()` helper;若未来确实需要本地图,应把该 collection 迁为 folder collection,或按 7.2 内容图片契约用 `public/` + `<img>`
- **`ogImage` 三选一(article/project 统一)**:本地图(`ogImageLocal`,经 astro:assets)/ 远程 URL(`ogImage`,直接引用)/ 自动生成(都不设置时构建期 satori 生成 `dist/og/`,见 7.9)。Article 与 Project 字段模型必须一致;**`ogImage` 与 `ogImageLocal` 同时存在 → `validateOgImageFields()` 直接 build fail(真三选一,而非靠优先级)(P1-10)**
- **slug 唯一来源 = entry 目录名**:frontmatter **不声明 slug**;URL slug、OG 文件名、i18n 路径全部由目录名产生(见 4.1)

#### 双语渐进机制(translationKey)

同一篇文章的两种语言版本共享一个 `translationKey`(**opaque identifier(P2-13):`z.string().trim().min(1)`,不允许空串/纯空格,格式不解析**)。构建时 `getStaticPaths` 遍历所有 group(含无 translationKey 的合成组,见下)× 所有 UI locale,用 `resolveLocalizedEntry()` 决定:
- 该 locale 目录下有 entry → 正常渲染(locale 由目录推导,无 frontmatter `lang`)
- 该 locale 无对应文章但有其他语言版本 → 生成占位页(显示"此文暂无 [locale] 版,点此阅读中文原文" + hreflang 指向已有版本 + `noindex, follow`)
- 都没有 → skip,不生成路由

ru/ja 阶段:文章内容只有 zh/en,ru/ja 用户访问走占位页跳转中文(优先)或英文。

**单语言 entry(无 `translationKey`)的分组规则(P1-15)**:统一以 `groupKey = entry.data.translationKey ?? \`single:${entry.id}\`` 生成合成组,避免被 `getStaticPaths()` 漏掉。合成组按普通组参与 locale 遍历:own-locale → render;其他 UI locale 无对应内容版本 → 占位页(指向已有版本);该规则同时适用于 article 与 project(见 6.5)。

**placeholder URL slug 规则(P0-3)**:占位页使用**已有语言 entry 的 slug**(zh 有 `/zh/articles/foo/`,则 en 占位页即 `/en/articles/foo/`)——不引入 translationKey 或额外前缀,保证语言间 URL 对称、实现确定。当未来该语言正式翻译上线且 slug 与占位页不同时,旧 placeholder URL 通过平台 redirect 规则 **301 到新正式 URL**(构建期输出 placeholder→正式 URL 映射清单,见 6.5/8.6)。

#### Sveltia 文章 collection 配置

`folder: "articles"`(**相对 content repo 根**,不是主仓的 `src/content/articles`;见 4.1 P0-1)+ **`slug: "{{fields._slug | default(title) | localize}}"`** + `path: "{{slug}}/index"` + `media_folder: ""` + `public_folder: ""`(entry-relative 图片,与 frontmatter `cover: "./cover.webp"` 闭环,见 4.7),`i18n: true` + `i18n.structure: multiple_folders` + `locales: [zh, en]` + **`i18n.canonical_slug: { key: translationKey }`**(C2:复用 Object920 跨语言 identity),Sveltia 自动把 zh/en 放到 locale 子目录、每篇一个目录。fields 与 Zod schema 一一对应(无 `slug`/`lang` 字段——locale 由目录推导,见 P0-2;`_slug` 为显式字段但 **Astro schema 不声明**,见下方 C2),所有需要翻译的字段标 `i18n: true`,共享字段标 `i18n: duplicate`;**`translationKey` 显式声明为业务字段(`widget: string`,`required: false`,`i18n: duplicate`,zh/en 保持相同,P1-10;`hint: "同一篇内容的不同语言版本必须使用相同 translationKey;没有翻译版本时可以留空"`,P2-7)**;`coverAlt` 标 `required: true`。工作流用全局 `publish_mode: simple`(见 4.7)。

**Sveltia slug metadata 配置(P0-1/P0-2,不留 Agent 自行决定)**:

```yaml
fields:
  - name: _slug
    widget: string
    required: false
    hint: "当前语言 URL slug;仅 ASCII 小写+连字符;留空时按 title 生成初始值;之后修改 title 不会改 slug;显式修改 = URL migration → redirects.json"
slug:
  encoding: ascii          # P2-16:中文/特殊标题自动生成安全的初始 slug(UX 层默认值)
  clean_accents: true
i18n:
  canonical_slug:
    key: translationKey    # C2:Sveltia canonical_slug 默认即 translationKey,直接复用 Object920 跨语言 identity,不另造 metadata
```

**语义(C2,基于 Sveltia 实际能力)**:`_slug` 是 **Sveltia `fields` 中显式声明的普通字符串字段**(会写入 frontmatter;**Astro schema 不声明它,额外字段被忽略**),collection 的 `slug` 模板引用它:

```yaml
slug: "{{fields._slug | default(title) | localize}}"   # _slug 为空时回退 title 生成初始 slug
```

**实现首周必须验证**:当前 Sveltia 模板引擎是否支持 `default` filter;若不支持,fallback 为 `slug: "{{fields._slug | localize}}"` + 新建流程要求先填 `_slug`(或 `{{uuid_short}}` 初始 slug,再按 URL migration 修正)——两种 fallback 在实现时二选一并在 `config.yml` 注释标明。`translationKey` 作为 `canonical_slug.key`,同时承担跨语言文件链接与 Object920 内容 identity,**不另设 `_canonicalSlug`**。构建侧以 entry 目录名为唯一真相,`validateSlugs()` 严格校验(ASCII slug 自动生成只是 UX 默认值,不替代构建期校验)。**首次创建**:title → 初始 `_slug`;**之后**:title 修改 ≠ slug 修改;显式修改 `_slug` = URL migration → redirect manifest。

### 4.3 工程数据模型

#### Frontmatter schema(Zod,Content Layer API)

```ts
const projects = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.replace(/[/\\]index\.md$/, ''),  // 同 articles:id = "{locale}/{slug}"
  }),
  schema: ({ image }) => z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    translationKey: z.string().trim().min(1).optional(),   // opaque identifier(P2-13)
    category: z.string().default('hardware'),
    tags: z.array(z.string()).default([]),
    status: z.enum(['ongoing', 'completed', 'archived', 'planned']).default('ongoing'),
    cover: image().optional(),          // 仅本地 entry-relative 图(P1-11)
    coverAlt: z.string().trim().min(1), // 必填且非空(P1-12),Sveltia 同步 required
    gallery: z.array(z.object({
      image: image(),                    // 本地图廊项走 astro:assets
      alt: z.string().trim().min(1),     // 图廊是内容图,alt 必填且非空(P1-12)
      caption: z.string().optional(),
    })).default([]),
    excerpt: z.string().optional(),
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    datasheets: z.array(z.object({
      name: z.string(),
      filename: z.string(),
      ref: z.string().default('main'),   // 引用版本:latest 资源用 main;历史资料(数据手册)建议 pin tag/commit(见 7.5)
      size: z.string().optional(),
      mirror: z.array(z.enum(['jsdelivr', 'raw', 'release'])).default(['jsdelivr', 'raw']),
      releaseTag: z.string().optional(),   // mirror 含 release 时必填
    })).default([]),
    relatedLinks: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    draft: z.boolean().default(false),
    ogImage: z.string().url().optional(),     // OG 三选一:远程 URL
    ogImageLocal: image().optional(),         // OG 三选一:本地图;均未设置 → 自动生成(见 7.9)
  }),
});
```

Sveltia 工程 collection 配置类似文章:`folder: "projects"`(**相对 content repo 根**)+ **`slug: "{{fields._slug | default(title) | localize}}"`** + `path: "{{slug}}/index"` + `media_folder: ""` + `public_folder: ""`,`i18n.structure: multiple_folders` + `i18n.canonical_slug: { key: translationKey }`(C2),fields 与 schema 一一对应(无 `slug`/`lang` 字段;`_slug` 机制与 `translationKey` 业务字段声明同 4.2 C2/P1-10);`coverAlt` 标 `required: true`。datasheets 的 mirror 用 `multiple: true` 的 select widget,`ref` 用默认 `main` 的 string widget(历史资料显式填 tag/commit)。

### 4.4 番剧数据模型

#### 番剧状态枚举(关键)

| enum 值 | 中文标签 | 含义 |
|---|---|---|
| `finished` | 看完 | 全集看完 |
| `watching` | 在看 | 正在追更/观看中 |
| `planned` | 想看 | 计划看但未开始 |
| `dropped` | 弃坑 | 看了一部分放弃 |

UI 文案走 i18n 字典,四语各自翻译。

#### 番剧 Zod schema(Content Layer API file loader + parser 桥接)

```ts
const anime = defineCollection({
  // file() 期望顶层数组(每对象有 id)或顶层对象(key 是 id);
  // Sveltia 写的是 { items: [...] },用 parser 提取 items 数组,
  // 每个 item 作为独立 entry(必须有 id 字段),getCollection('anime') 返回所有番剧
  loader: file('src/content/data/anime.json', {
    parser: (text) => JSON.parse(text).items,
  }),
  schema: z.object({
    id: z.string(),                        // 必须,file() 不自动生成 id
    title: z.string(),
    titleOriginal: z.string().optional(),
    titleZh: z.string().optional(),
    cover: z.string().url().optional(),       // 远程封面 URL
    score: z.number().min(0).max(10).optional(),
    status: z.enum(['finished', 'watching', 'planned', 'dropped']),
    watchedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    episodes: z.number().optional(),
    year: z.number().optional(),
    studio: z.string().optional(),
    source: z.string().url().optional(),
    comment: z.string().optional(),
    highlight: z.boolean().default(false),
  }),
});
```

**JSON 文件示例**(无 `lastUpdated`,每个 item 有 `id`):
```json
{
  "items": [
    { "id": "bilibili-12345", "title": "Chainsaw Man", "status": "finished", "score": 9, ... }
  ]
}
```

**读取列表**:`const animeList = await getCollection('anime');`(parser 已提取 items,直接返回所有番剧条目数组)

**`lastUpdated` 来源**:构建时由 `git -C src/content log -1 --format=%cI`(content repo 最新 commit 时间,不带路径过滤)读取,注入到页面数据。**不单独追踪每个 JSON 文件历史**(与 `--depth 1` 兼容)。无需手动维护字段。

Sveltia 番剧配置用 `file collection`,`file: "data/anime.json"`(**相对 content repo 根;Astro loader 里的 `src/content/data/anime.json` 是主仓视角,两者不要混写**,见 4.1 P0-1)。fields 定义一个 `items` list widget, list 内每个对象含 `id`(string widget,必填)+ 其他字段。status 的 select widget 给选项加中文显示标签(`{ label: "看完", value: "finished" }`)。`delete: false` 禁止删除整个 JSON 文件。

### 4.5 术曲数据模型

```ts
const vocaloid = defineCollection({
  loader: file('src/content/data/vocaloid.json', {
    parser: (text) => JSON.parse(text).items,
  }),
  schema: z.object({
    id: z.string(),                        // 必须
    title: z.string(),
    producer: z.string(),             // P 主
    vocaloid: z.array(z.string()).default([]),
    cover: z.string().url().optional(),
    score: z.number().min(0).max(10).optional(),
    status: z.enum(['favorite', 'liked', 'neutral', 'archived']),
    listenedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    year: z.number().optional(),
    platform: z.array(z.object({ name: z.string(), url: z.string().url() })).default([]),
    lyricSnippet: z.string().optional(),
    comment: z.string().optional(),
    highlight: z.boolean().default(false),
  }),
});
```

Sveltia 术曲配置类似番剧,file collection 编辑 `file: "data/vocaloid.json"`(相对 content repo 根;结构 `{ items: [...] }`,fields 定义 items list widget,每对象含 id + 其他字段)。

### 4.6 友链数据模型

```ts
const friends = defineCollection({
  loader: file('src/content/data/friends.json', {
    parser: (text) => JSON.parse(text).items,
  }),
  schema: z.object({
    id: z.string(),                        // 必须
    name: z.string(),
    url: z.string().url(),
    avatar: z.string().url().optional(),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    status: z.enum(['active', 'inactive', 'mutual']).default('active'),
    addedDate: z.coerce.date().optional(),
  }),
});
```

Sveltia 友链配置类似,file collection 编辑 `file: "data/friends.json"`(相对 content repo 根;结构 `{ items: [...] }`,fields 定义 items list widget)。status 选项:活跃(active)/失联(inactive)/互友(mutual)。

### 4.7 Sveltia 配置全局部分

```yaml
# public/admin/config.yml
# yaml-language-server: $schema=https://unpkg.com/@sveltia/cms/schema/sveltia-cms.json

backend:
  name: github
  repo: YourUser/object920-content     # content 仓库名
  branch: main
  # MVP 个人站:用 Access Token 登录,不需要 base_url
  # 生产多用户(可选):部署 sveltia-cms-auth 后取消下面注释
  # base_url: https://your-authenticator.workers.dev

# 图片存储采用 entry-relative media:每个 folder collection 单独配置 media_folder: "" + public_folder: "",
# 图片与对应 index.md 同目录(frontmatter cover: "./cover.webp"),CMS、Content Layer、astro:assets 三者统一
# JSON collection(番剧/术曲/友链)只存远程 URL,不涉及 media_folder

site_url: https://example.com
display_url: https://example.com
locale: 'zh'

publish_mode: simple                  # MVP 单人开发用 simple 工作流:直接提交 main 分支触发 Deploy Hook;如果 Sveltia 后续正式支持 editorial workflow 且有协作需求,再评估是否启用

collections: [...]                     # 上面 5 个 collections
```

**注意(m5)**:Sveltia 的 `save_all_locales` 已废弃(`@deprecated`,由 `initial_locales` 替代);本项目**不使用**该配置,若未来启用 editorial workflow 或批量保存本地化时改用 `initial_locales`。

**完整 config.yml 骨架(第九轮可实施性补充,字段全集与 4.2-4.6 schema 一一对应)**:

```yaml
collections:
  - name: articles
    label: 文章
    folder: "articles"
    slug: "{{fields._slug | default(title) | localize}}"
    path: "{{slug}}/index"
    media_folder: ""
    public_folder: ""
    create: true
    i18n: true
    i18n.structure: multiple_folders
    i18n.locales: [zh, en]
    i18n.canonical_slug: { key: translationKey }
    fields:
      - { name: _slug, widget: string, required: false, i18n: duplicate }
      - { name: title, widget: string, i18n: true }
      - { name: translationKey, widget: string, required: false, i18n: duplicate }
      - { name: pubDate, widget: datetime, i18n: duplicate }
      - { name: updatedDate, widget: datetime, required: false, i18n: duplicate }
      - { name: category, widget: string, default: uncategorized, i18n: duplicate }
      - { name: tags, widget: list, i18n: true }
      - { name: cover, widget: image, required: false, i18n: duplicate }
      - { name: coverAlt, widget: string, required: true, i18n: duplicate }
      - { name: excerpt, widget: text, required: false, i18n: true }
      - { name: draft, widget: boolean, default: false, i18n: duplicate }
      - { name: seoTitle, widget: string, required: false, i18n: true }
      - { name: seoDescription, widget: text, required: false, i18n: true }
      - { name: ogImage, widget: string, required: false, i18n: duplicate }
      - { name: ogImageLocal, widget: image, required: false, i18n: duplicate }
  - name: projects
    label: 工程
    folder: "projects"
    slug: "{{fields._slug | default(title) | localize}}"
    path: "{{slug}}/index"
    media_folder: ""
    public_folder: ""
    i18n: true
    i18n.structure: multiple_folders
    i18n.locales: [zh, en]
    i18n.canonical_slug: { key: translationKey }
    fields: [ /* 同文章结构 + status/specs/datasheets/gallery/relatedLinks,见 4.3 */ ]
  - name: anime
    label: 番剧
    file: "data/anime.json"
    fields:
      - { name: items, widget: list, fields: [ { name: id, widget: string }, { name: title, widget: string }, /* ...见 4.4 */ ] }
  - name: vocaloid
    label: 术曲
    file: "data/vocaloid.json"
    fields: [ /* 见 4.5 */ ]
  - name: friends
    label: 友链
    file: "data/friends.json"
    fields: [ /* 见 4.6 */ ]
  - name: redirects
    label: URL 迁移
    files:
      - label: redirects
        file: "redirects.json"
        fields:
          - { name: redirects, widget: list, fields: [ { name: source, widget: string }, { name: target, widget: string } ] }
```

**redirects.json 编辑闭环(P0-3)**:`redirects.json` 通过 **Sveltia file collection(redirects)** 编辑——用户改 `_slug` 后在同一个 CMS 会话里登记旧 URL → 新 URL,与 slug 修改落入**同一个 content commit**,再由 content CI 校验后触发 Deploy Hook。这使"slug 修改必须同步 redirect"从规则变成**可执行的 workflow**。

**关键说明(与 Decap 的差异)**:
- **entry-relative media**:移除全局 `media_folder`/`public_folder`,改为每个 folder collection 单独配置 `media_folder: ""` + `public_folder: ""`;Sveltia 上传图片落到 entry 同目录,写入 frontmatter 的相对路径(`./cover.webp`)与 Astro `image()` 相对路径语义一致。**禁止再出现 `images/articles` / `src/content/images` 这类全局图片目录**——那会让 CMS 存储路径、浏览器 URL 路径与 Astro 相对路径形成三套无法闭环的抽象
- **无 `local_backend` 字段**:Sveltia 不支持 `decap-server` 代理,`local_backend` 被忽略。本地开发用 File System Access API(见 7.3)
- **无 `auth_type`/`app_id`/`proxy` 字段**:Sveltia 的 OAuth 配置用 `base_url` 指向 Authenticator,不是 Decap 的 `proxy.url`
- **MVP 用 Access Token**:个人站最简方案,登录页点"Sign In with Token"粘贴 GitHub PAT,零部署
- **`base_url` 非密钥**:可硬编码在 config.yml(公开文件),client secret 只在 Authenticator 端
- **config.yml 是纯静态文件**:放 `public/admin/`,不被 Astro 构建处理,不注入环境变量(`base_url` 直接写明文即可)

### 4.8 路由与 collection 对应关系

| URL 路径 | 渲染源 | 备注 |
|---|---|---|
| `/[locale]/articles/[...slug]` | `articles` 中目录 locale 为当前 locale 的 entry(无 frontmatter `lang`) | 占位页机制见 4.2 |
| `/[locale]/articles/` | 文章列表(过滤 draft,按时间倒序) | |
| `/[locale]/articles/tag/[tag]` | 按 tag 过滤 | |
| `/[locale]/articles/category/[cat]` | 按 category 过滤 | |
| `/[locale]/articles/archive` | 按年月分组 | |
| `/[locale]/projects/[slug]` | `projects` collection | 占位页机制同文章 |
| `/[locale]/projects/` | 工程列表 | |
| `/[locale]/collection/anime` | `anime` JSON | 状态筛选 tab |
| `/[locale]/collection/vocaloid` | `vocaloid` JSON | |
| `/[locale]/friends/` | `friends` JSON + Giscus 留言 + 开往入口 | |
| `/[locale]/about/` | 静态内容 | UI 走 i18n |
| `/rss/[locale].xml` | `articles` 按目录 locale 过滤(无 frontmatter lang) | 每语言一 feed |
| `/admin/` | Sveltia CMS SPA | 无 locale |

**注意**:当前 15 个路由是基线,后续可能合并或增加。新增页面只需在 `[locale]/` 下加文件并补 i18n 文案。

---

## 5. 页面与组件设计

### 5.1 页面清单与路由总览

| 页面 | 路由 | 主要组件 | enhancement 重度 |
|---|---|---|---|
| 首页 | `/[locale]/` | Hero、HomeSections | Hero 中 |
| 文章列表 | `/[locale]/articles/` | ArticleList、ArticleCard | 否 |
| 文章详情 | `/[locale]/articles/[...slug]` | ArticleProse、Toc、ReadingProgress、CodeBlock、ArticleImage、Comments | 是 |
| 文章标签/分类/归档 | `/[locale]/articles/tag|category|archive` | ArticleList / ArchiveGroup | 否 |
| 工程列表 | `/[locale]/projects/` | ProjectList、ProjectCard | 轻 |
| 工程详情 | `/[locale]/projects/[slug]` | Gallery、SpecsTable、DatasheetDownload、Comments | 轻 |
| 番&术总览 | `/[locale]/collection/` | CollectionNav | 否 |
| 番剧墙 | `/[locale]/collection/anime` | AnimeWall、AnimeCard、StatusFilter | 是 |
| 术曲墙 | `/[locale]/collection/vocaloid` | VocaloidWall、VocaloidCard | 轻 |
| 友链 | `/[locale]/friends/` | FriendList、FriendCard、Travellings(可插拔)、Comments | 否 |
| 关于 | `/[locale]/about/` | 静态内容 | 否 |
| 404 | `/404` | NotFound | 否 |
| RSS | `/rss/[locale].xml` | 端点 | — |
| Admin | `/admin/` | Sveltia CMS SPA | — |

**纪律**:页面文件只做路由+数据获取+组件组合,视觉与交互全部下沉到组件。页面文件本身不超过 ~60 行,超了说明该抽组件。

### 5.2 通用布局组件

- **`BaseLayout.astro`**:组合 BaseHead + Header + `<slot/>` + Footer + Analytics + Lightbox + **MusicHost(仅音乐启用时渲染,见 5.12 P1-10)**;接收 props(locale/title/description/ogImage/canonicalURL/hreflang/noindex);最顶部放跳转链接 `<a href="#main" class="skip-link">跳到主内容</a>`
- **`BaseHead.astro`**:`<head>` 公共部分——SEO meta、JSON-LD、favicon、字体 preload(只 preload Inter normal)、内联防闪烁脚本、RSS link、引入 global.css、预览站点 noindex 控制
- **`Header.astro`**:sticky 顶部导航,含 logo、导航菜单(走 i18n)、LangSwitch、ThemeToggle、SearchBox(依赖 SearchProvider 接口,见 5.11)、移动端 MobileNav;`<nav aria-label="主导航">`
- **`Footer.astro`**:版权、社交链接、RSS 入口、友链入口、可选开往 logo;底部信息**分开显示"站点最后构建"(buildTime)与"内容库最后更新"(contentUpdatedAt/contentCommit)**(见 7.12 P2-23),不合并成单一"最后更新时间"

### 5.3 暗色模式防闪烁(FOUC)

```html
<!-- BaseHead.astro 最顶部,内联阻塞脚本 -->
<script is:inline>
  (function() {
    const stored = localStorage.getItem('theme');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (system ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

必须 `is:inline` 且在 `<head>` 最早位置,阻塞渲染直到 `data-theme` 设好。`ThemeToggle` 只读写 `localStorage` 与 `data-theme`,不参与首屏决定。

### 5.4 `LangSwitch.astro`

列出 4 个 locale(zh/en/ru/ja),当前 locale 高亮。**内容详情页(文章/工程)的语言切换必须基于 `translationKey` 定位目标语言 entry,再取目标 slug 构造 URL(`getLocalizedEntryPath()`)——禁止只做 `pathname.replace(locale)`**:不同语言版本的 slug 很可能不同(如 zh 为 `astro-架构`、en 为 `astro-architecture`),直接替换 locale 会得到不存在的 URL(P1-14)。目标语言 entry 不存在(未翻译)时指向占位页是预期行为。UI/静态页(首页/列表/关于)无 entry 语义,用 `getLocalizedPath()` 直接替换 locale。a11y:`<nav aria-label="语言切换">`,选项 `aria-current`。

### 5.5 `ThemeToggle.astro`

按钮图标(亮色太阳/暗色月亮),点击翻转 `data-theme` + 写 `localStorage` + 派发 `theme-change` CustomEvent(供 Giscus 等第三方同步主题,见 7.4)。`localStorage` 无值时跟随系统。a11y:`aria-label` + `aria-pressed`。

### 5.6 `MobileNav.astro`(vanilla enhancement)

汉堡按钮 → 右滑抽屉,含导航 + 语言切换 + 暗色切换 + 搜索。滚动锁定、焦点陷阱、ESC 关闭、点击遮罩关闭。**a11y 与 9.6 统一(P1-20)**:默认按 disclosure 菜单实现——`<button aria-expanded aria-controls>` + `<nav>`,不阻断背景交互;**只有真正全屏遮罩阻断背景交互时才用 `role="dialog"` `aria-modal="true"`**(MVP 不做后者,避免两处文档矛盾)。

### 5.7 首页

- **`Hero.astro`(vanilla enhancement)**:全屏大图用 `<Image ... fetchpriority="high" />` + CSS `position: absolute; object-fit: cover;` 铺满(**不用 CSS `background-image` 承载首屏大图——它无法使用 `<img>` 的 fetchpriority,见 P2-21**)+ 轻量动效叠加(CSS keyframes 为主,粒子用轻量 Canvas ~50 行 vanilla JS)。`prefers-reduced-motion` 时停所有动效。文字层(标题/副标题/简介/CTA)走 i18n。scoped `<style>`,动画时长用 `calc(var(--duration-*) * var(--motion-scale))`,超 100 行外置 `Hero.module.css`
- **`HomeSections.astro`**:服务端渲染聚合区——最新文章、最新工程、番剧精选、术曲精选、友链入口、关于摘要。复用各领域 Card 组件,每块带"查看全部 →"链接

### 5.8 文章列表与卡片

- **`ArticleList.astro`**:响应式网格(1/2/3 列),props 接收已过滤已排序的集合,空状态用 `<EmptyState />`,无 enhancement
- **`ArticleCard.astro`**:封面图走 astro:assets + `loading="lazy"` + `aspect-ratio` 防 CLS;标题/摘要/日期(走 `Intl.DateTimeFormat`)/分类/标签;hover 微动效(scoped CSS,token 时长);整卡可点;a11y:封面 alt、标题 `<h2>` 内嵌 `<a>`

### 5.9 文章详情页组件

- **`ArticleProse.astro`**:包裹 Markdown 渲染输出,加 `prose` class + 引入 `prose.css`;Markdown 图片/代码块经 7.2/7.11 的统一 processor 管线增强
- **`Toc.astro`(vanilla enhancement)**:从 Markdown 提取 h2/h3,sticky 侧边栏,IntersectionObserver 高亮当前项,点击平滑滚动(`prefers-reduced-motion` 时 instant)。a11y:`<nav aria-label="文章目录">`,heading 端 `tabindex="-1"`。每次 `astro:page-load` 重新初始化(见 5.20)
- **`ReadingProgress.astro`(enhancement)**:顶部固定 2px progress bar,scroll 监听计算百分比。页面高度动态无明确终点,用 `role="status"` + `aria-live="polite"`(非 progressbar,progressbar 需已知 min/max)。**视觉进度条持续更新,无障碍文本仅在跨越 25%/50%/75%/100% 里程碑时更新**——不能每 1% 更新 aria-live,否则屏幕阅读器极其嘈杂(P1-25)。vanilla JS ~20 行
- **`CodeBlockEnhancer.ts`(vanilla enhancement,P1-6 命名)**:rehype 插件(`rehype-codeblock.ts`,构建期)在 HTML AST 阶段给 `<pre>` 注入数据属性并渲染语言标签/复制按钮骨架;`CodeBlockEnhancer.ts`(**`astro:page-load` 客户端增强,不是 Markdown AST 插件**)用事件委托绑定复制按钮(clipboard API + `aria-live` 通知)。Shiki 构建时高亮(零运行时)。**Markdown 代码块不再经过 `.astro` 包装组件**(P0-4,单模型:rehype + client)
- **`ArticleImageEnhancer.ts`**(图片增强客户端,P1-6 命名):本地 Markdown 图经 7.2 管线得到 `<figure>`+`<figcaption>`(title → caption)+ `data-article-image`/`data-lightbox` 属性;该模块在 `astro:page-load` 用**只注册一次的 document 级事件委托**(singleton guard,见 5.20/7.2.2)统一处理 lightbox 点击与 `onerror` 占位图。**不再存在 `ArticleImage.astro` 组件;禁止直接传文件路径字符串**。a11y:内容图 alt 必填,装饰图 `alt=""`

### 5.10 全局 Lightbox

**设计**:单个全局实例挂 BaseLayout 末尾,所有带 `data-lightbox` 的图片(Markdown 正文图、Gallery 图)点击派发 `open-lightbox` CustomEvent,Lightbox 监听。`e.detail` 含 `{ src, alt, srcset, groupId }`。支持组内左右切换、ESC 关闭、焦点陷阱。`prefers-reduced-motion` 时无动画。

**纪律**:Lightbox 是全局基础设施,不在每张图片上挂独立实例。生命周期:全局 singleton 只初始化一次,**初始化标志保护 + 事件委托**避免 ClientRouter 导航后重复绑定/死引用;`astro:after-swap` 时若 Lightbox 仍打开则关闭并清状态(见 5.20)。

### 5.11 搜索可插拔架构(SearchProvider)

**目标**:Search UI 与搜索引擎解耦,Provider 可独立替换,通过配置选择而非改核心代码。

#### SearchProvider 统一接口(最小必要)

```ts
// src/components/integrations/search/SearchProvider.ts(纯 .ts 接口定义)
export interface SearchResult {
  title: string;
  url: string;
  excerpt?: string;      // 摘要/高亮片段
  score?: number;        // 相关度,可选
}

export interface SearchOptions {
  locale?: string;       // 当前 locale,保留给未来 Orama 使用;Pagefind MVP 不据此二次过滤(见下);后期可简化为 currentLocale 由 Provider runtime state 持有(P2-18)
  limit?: number;        // 结果数上限,默认 10
}

/** 统一状态语义(P1-16):idle → initializing → ready | failed;禁止"initialize 抛错 + ready() false"两套错误语义并存 */
export type SearchProviderState = 'idle' | 'initializing' | 'ready' | 'failed';

export interface SearchProvider {
  /** 异步初始化(加载索引、连接服务等),SearchBox 首次交互前调用 */
  initialize(): Promise<void>;
  /** 当前状态;失败后状态为 'failed',ready() resolve false */
  getState(): SearchProviderState;
  /** 是否就绪(初始化完成);异步初始化用此而非同步 isAvailable */
  ready(): Promise<boolean>;
  /** 执行搜索:成功无结果 → [];搜索系统失败 → throw SearchError(P1-9,不混用) */
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
  /** 释放资源/索引引用;locale 切换或销毁时必须调用,之后可重新 initialize(P1-5) */
  destroy(): Promise<void>;
}
```

**纪律**:接口只定义最小必要方法,不搞工厂/注册表/插件系统;未来加 Orama 只需实现此接口。**异步初始化用 `initialize()/ready()` 而非同步 `isAvailable()`**——索引加载、API 连接可能异步。**状态语义统一(P1-16/P1-9)**:`initialize()` 成功 → `ready`;失败 → 内部置 `failed` 且 `ready()` resolve false(不允许"initialize 抛错 + ready() false"两套错误路径并存);**`search()` 失败 → `throw SearchError`(搜索系统故障),成功但无结果 → `[]`(没有搜索结果)**——调用方据此区分"无结果"与"搜索不可用"。**生命周期必须闭环(P1-5)**:`initialize() → search() → destroy() → reinitialize()`,locale 切换时调用方负责 `destroy()` 后重新 `initialize()`。

#### SearchRuntime(Provider singleton 所有权,P1-6)

```text
SearchRuntime
├── provider singleton(仅创建一次)
└── currentLocale(当前语言状态)

SearchBox → 只连接 SearchRuntime(不自己持有 Provider)
```

页面导航:SearchBox UI 重建,**Provider 不重建**;locale 改变:SearchRuntime 调 `provider.destroy()` → `provider.initialize()`(locale 存入 `currentLocale`);`none` 时 runtime 为 null,SearchBox 零 DOM。

#### Provider resolver(最小,按配置选实现)

SearchBox 不能直接 import 具体 Provider(违反纪律),但要按配置选 Provider。需要一个最小 resolver:

```ts
// src/components/integrations/search/createSearchProvider.ts
import type { SearchProvider } from './SearchProvider';
import { PagefindProvider } from './PagefindProvider';

export function createSearchProvider(): SearchProvider | null {
  const provider = import.meta.env.PUBLIC_SEARCH_PROVIDER ?? 'pagefind';
  switch (provider) {
    case 'pagefind':
      return new PagefindProvider();
    // case 'orama': return new OramaProvider(); // 未来,不实现
    case 'none':
      return null;                      // 主动关闭:SearchBox 零 DOM 输出
    default:
      throw new Error(`Unknown search provider: ${provider}`);
  }
}
```

SearchBox 只 import `createSearchProvider` + `SearchProvider` 接口类型,不 import `PagefindProvider`——resolver 是唯一知道具体实现的地方。**`none` 必须由 resolver 返回 `null`(SearchBox 零 DOM),不能落入 `default` 抛错**(P0-11)。

#### SearchBox 组件(vanilla enhancement,在 integrations/search/)

`src/components/integrations/search/SearchBox.astro`:
- **不直接 import Pagefind 或任何具体 Provider**(只 import `createSearchProvider` + 接口类型)
- `createSearchProvider()` 返回 `null`(`PUBLIC_SEARCH_PROVIDER=none`)→ 零 DOM 输出
- 用户首次交互(聚焦/输入)时调 `provider.initialize()` → `await provider.ready()` → `provider.search()`
- `ready()` resolve false 时降级:搜索框 disabled + 提示"搜索暂不可用"
- 搜索禁用(`PUBLIC_SEARCH_ENABLED === 'false'`)时零 DOM 输出
- 生命周期:每次 `astro:page-load` 重建 UI(清空展开/聚焦/结果状态);provider 索引缓存可保留;**locale 改变时 destroy + reinitialize Provider(P1-5,见 7.10)**

#### PagefindProvider(MVP 默认实现)
`src/components/integrations/search/PagefindProvider.ts`(纯 `.ts`,非 `.astro`):

- 实现 `SearchProvider` 接口
- `initialize()`:动态 `import('/pagefind/pagefind.js')`(Pagefind 低级 Search API),加载索引;异步完成
- `ready()`:resolve `true` 当索引加载完成,`false` 当 dev 模式索引不存在(`/pagefind/` 不存在)
- `search(query, opts)`:调用 Pagefind Search API,映射结果为 `SearchResult[]`;**MVP 不做手动 locale 二次过滤(P1-15)**——由 `<html lang>` 的 Pagefind 语言索引承担;`opts.locale` 保留在接口中仅供未来 Orama 等 Provider 使用
- `search()`:失败 → `throw SearchError`(SearchBox 捕获后降级提示);成功但无结果 → `[]`(不视为错误)
- `destroy()`:释放 Pagefind 索引引用/内存,置状态回 `idle`;之后可重新 `initialize()`

#### 配置

```ts
// src/config/site.ts 或环境变量(P2-1:config 目录统一,无 src/config.ts)
search: {
  enabled: true,          // PUBLIC_SEARCH_ENABLED
  provider: 'pagefind',   // PUBLIC_SEARCH_PROVIDER: 'pagefind' | 'none'(orama 未实现前非有效值,P1-8)
}
```

| 配置 | 行为 |
|---|---|
| `enabled: false` | SearchBox 零 DOM 输出,零加载;**不执行 Pagefind、不生成索引、无运行时搜索请求(package 仍可能安装,P2-3)** |
| `enabled: true, provider: 'pagefind'` | MVP 默认;postbuild 跑 `pagefind --site dist`;SearchBox 用 PagefindProvider |
| `enabled: true, provider: 'orama'` | **不是 MVP 有效值**(P1-8):orama 未实现前配置它 = resolver 落入 default 抛配置错误,而不是"降级";未来实现后再加入有效值 |
| `enabled: true, provider: 'none'` | resolver 返回 null,SearchBox 不渲染(等同禁用,但语义明确"主动选无搜索") |

#### 与 Analytics/Comments 一致性

- 环境变量开关(`PUBLIC_SEARCH_ENABLED`)
- 关闭后零 DOM/零网络/零构建依赖
- 单向依赖:Provider 实现 → SearchProvider 接口 → SearchBox → Header;Header 不 import Provider 实现
- 核心代码不 import 可插拔 Provider(只 import 接口类型)

#### 纪律

- **Search UI 不得直接依赖 Pagefind**:SearchBox 只 import `SearchProvider` 接口类型,不 import `pagefind` 或 `PagefindProvider`
- **Provider 可独立替换**:切换 provider 只改配置,不改 SearchBox/业务代码
- **不引入复杂抽象层**:只有接口 + 一个 MVP 实现,无工厂/注册表
- **当前只实现 Pagefind**:Orama 只留接口位,不实现,且**未实现前不列入有效配置值**(配置未知值 = 配置错误 throw);None 由 resolver 返回 `null` 实现
- **dev 模式搜索不工作**:PagefindProvider 的 `ready()` resolve false(dist/pagefind/ 不存在),SearchBox 降级提示——这是预期
- **locale 责任**:Pagefind Provider **不**自行按 `opts.locale` 过滤(避免与 language index 双重过滤);如需"只搜当前语言",用 Pagefind 自身 API 的 language 参数

### 5.12 背景音乐可插拔架构(MusicPlayer)

**目标**:网站背景音乐功能,与播放控件解耦,Provider 可独立替换,通过配置选择。**默认不播放**,用户点击播放控件才开始。

#### 核心纪律(用户需求)

1. **默认不播放**:页面加载时不自动播放(浏览器 autoplay 策略也禁止,且 UX 不友好);用户点击播放控件才手动开始
2. **控件控制**:一个播放控件(按钮/悬浮条/其他形态)控制播放/暂停/切歌;**控件具体形态后期再设计**,MVP 先用最简按钮
3. **歌单**:带歌单支持,可切歌;歌单数据结构见下
4. **可插拔解耦**:与 Analytics/Comments/SearchProvider/Travellings 一致,环境变量开关,关闭零 DOM/零网络/零构建依赖
5. **Provider 接口**:类似 SearchProvider,定义最小必要接口,具体实现可替换

#### MusicPlayer 统一接口(最小必要)

```ts
// src/components/integrations/music/MusicPlayer.ts(纯 .ts 接口定义)
export interface Track {
  id: string;
  title: string;
  artist?: string;          // 演唱者/P 主
  src: string;              // 音频文件 URL(可托管在 assets 仓或 CDN)
  cover?: string;           // 封面图 URL(可选)
  duration?: number;        // 秒数(可选,不填则运行时读取)
}

export interface Playlist {
  id: string;
  name: string;             // 歌单名(走 i18n 或固定)
  tracks: Track[];
}

export interface MusicPlayerState {
  isPlaying: boolean;
  currentTrackId: string | null;
  currentPlaylistId: string | null;
  volume: number;           // 0-1
}

export interface MusicPlayer {
  /** 异步初始化(预加载元数据等),首次播放前调用;audio 元素通过 Provider 构造注入,不在 initialize() 里传(P0-2) */
  initialize(): Promise<void>;
  /** 是否就绪(初始化完成);异步用此而非同步 isAvailable */
  ready(): Promise<boolean>;
  /** 播放(从当前曲目,或指定曲目);需 ready 后调用 */
  play(trackId?: string): Promise<void>;
  /** 暂停 */
  pause(): void;
  /** 下一首 */
  next(): Promise<void>;
  /** 上一首 */
  prev(): Promise<void>;
  /** 设置音量 0-1 */
  setVolume(v: number): void;
  /** 获取当前状态(isPlaying/currentTrack 等) */
  getState(): MusicPlayerState;
  /** 状态变化回调注册(控件监听更新 UI) */
  onStateChange(cb: (state: MusicPlayerState) => void): () => void;
}
```

**纪律**:接口只定义最小必要方法,不搞工厂/注册表;未来加其他 Provider(如 Howler.js、Web Audio API 封装)只需实现此接口。**异步初始化用 `initialize()/ready()`**。**audio 元素注入方式统一(P0-2)**:`MusicHost` 持有 `<audio>` → `createMusicProvider(audioElement)` → `HtmlAudioProvider(audioElement)`,Provider **构造时**接收 audio,`initialize()` 保持**无参数**;禁止出现"接口无参、Widget 无参调用、实现类却要求 audioEl 参数"的三方不一致。**媒体状态唯一真相源(P1-11)**:`HTMLAudioElement` 是媒体状态(`isPlaying`/`volume`/`currentTime`/`paused`/`duration`)的**唯一真相源**,singleton 只做业务 API/状态代理——**不得在 singleton 里维护第二份独立播放状态**,避免出现 `singleton.isPlaying === true` 而 `audio.paused === true` 的分裂。

#### Provider resolver(最小,按配置选实现)

MusicPlayerWidget 不能直接 import 具体 Provider,需要最小 resolver:

```ts
// src/components/integrations/music/createMusicProvider.ts
import type { MusicPlayer } from './MusicPlayer';
import { HtmlAudioProvider } from './HtmlAudioProvider';

export function createMusicProvider(audioElement: HTMLAudioElement): MusicPlayer | null {
  const provider = import.meta.env.PUBLIC_MUSIC_PROVIDER ?? 'html5audio';
  switch (provider) {
    case 'html5audio':
      return new HtmlAudioProvider(audioElement);
    // case 'howler': return new HowlerProvider(); // 未来,不实现
    case 'none':
      return null;                      // 主动关闭:Widget 零 DOM 输出
    default:
      throw new Error(`Unknown music provider: ${provider}`);
  }
}
```

Widget 只 import `createMusicProvider` + `MusicPlayer` 接口类型,不 import `HtmlAudioProvider`。**`none` 必须由 resolver 返回 `null`(Widget 零 DOM),不能落入 `default` 抛错**(P0-11)。**调用方(MusicHost/Widget)负责传入 host 内的 `<audio>` 元素**(P0-2)。

#### MusicPlayerWidget 组件(vanilla enhancement,控件形态后期设计)

`src/components/integrations/music/MusicPlayerWidget.astro`:
- **不直接 import 任何具体 Provider**(HtmlAudioProvider 等),只 import `createMusicProvider` + `MusicPlayer` 接口类型
- `createMusicProvider()` 返回 `null`(`PUBLIC_MUSIC_PROVIDER=none`)→ 零 DOM 输出
- 用户首次点击播放时调 `provider.initialize()`(无参)→ `await provider.ready()` → `provider.play()`
- **MusicHost(P1-17/P1-18/P0-2)**:`<audio>` 元素由 **UI/Layout 层负责**——**仅音乐启用时** BaseLayout 渲染 `MusicHost`(`<div transition:persist="music-host">` 内含 `<audio>`);Widget 渲染到 MusicHost 内,并调用 `createMusicProvider(audioElement)` 把 host 内 `<audio>` 注入 Provider(provider 不创建 persistent DOM,构造时接收 audio,`initialize()` 无参)
- **默认不播放**:页面加载时 `isPlaying === false`,只渲染控件(不调用 `play()`);用户点击播放按钮才 `play()`
- 控件形态(按钮/悬浮条/展开式播放器)**后期再设计**,MVP 先用最简播放/暂停按钮 + 当前曲目名 + 下一首
- `ready()` resolve false 时:控件降级为 disabled + 提示"音乐不可用"
- 音乐禁用(`PUBLIC_MUSIC_ENABLED === 'false'`)时:零 DOM 输出
- **a11y 纪律**:播放按钮 `aria-label="播放/暂停背景音乐"`;音量滑块 `aria-label`;状态变化用 `aria-live="polite"` 通知;不自动播放(避免突然发声惊吓屏幕阅读器用户)
- **跨页面行为(P0-7,ClientRouter 正式启用)**:页面导航后音乐继续播放,必须三件套共同实现——**ClientRouter(客户端导航)** + **`transition:persist`(MusicHost 容器跨页面保留)** + **MusicPlayer singleton(控制状态保持)**。音乐启用时 MusicHost 挂 BaseLayout(所有页面都有此节点,见 P1-18),`<audio>` 元素在宿主内由 `transition:persist` 保留,不随页面卸载;Widget UI 每次 `astro:page-load` 从 singleton 的 `getState()` 恢复显示(见 5.20)。**不再保留"无 View Transitions 时 document.body 里的 `<audio>` 也能跨完整页面保持"的描述**——完整页面导航 DOM 必然重建,跨页面播放必须依赖 ClientRouter。**Astro 7 验证项(M5)**:实现首周在 Astro 7 下实测 `transition:persist` 对原生 `<audio>` 元素(非 framework island)的行为是否与 6.x 一致,不一致时记录差异并调整 MusicHost 实现
- 生命周期:provider singleton 只创建一次;每次 `astro:page-load` 重新绑定控件事件,不重复初始化 singleton(见 5.20)

**组件层级(P1-11,固定)**:`BaseLayout └── MusicHost ├── <audio>(transition:persist 宿主) └── MusicPlayerWidget`。职责边界:**MusicHost → persistence boundary(创建/持有 `<audio>`);MusicPlayerWidget → UI boundary;HtmlAudioProvider → playback logic(构造注入 audio,只控制不创建)**。

#### HtmlAudioProvider(MVP 默认实现)
`src/components/integrations/music/HtmlAudioProvider.ts`(纯 `.ts`,非 `.astro`):

- 实现 `MusicPlayer` 接口,基于 HTML5 `<audio>` 元素
- 构造函数 `constructor(audioElement)`:接收 **外部传入的 `<audio>` 元素**(由 MusicHost 提供,见 P0-2);Provider **不创建、不负责 persistent DOM**——只加载歌单元数据、监听事件、管理播放逻辑
- `initialize()`(**无参数**):在构造注入的 audio 元素上加载歌单元数据、预加载元数据;异步完成
- `ready()`:resolve true 当 audio 元素就绪(MVP 简化为 initialize 后即 true)
- `play(trackId?)`:在绑定元素上设 `src`,调用 `play()`(用户手势触发,符合 autoplay 策略)
- `pause()/next()/prev()`:操作 `<audio>` 与歌单索引
- `onStateChange`:监听 `<audio>` 的 `play`/`pause`/`ended` 事件,触发回调

#### 歌单数据结构

歌单是内容数据,放 content 仓库(经 Sveltia 编辑)还是主仓配置?**MVP 放主仓 `src/config/music.ts`**(歌单是站点配置不是内容,且 MVP 歌单固定;后期若要 CMS 编辑再迁 content;**P2-1:config 统一目录,不存在 `src/config.ts`):

```ts
// src/config/music.ts
export const playlists: Playlist[] = [
  {
    id: 'default',
    name: '默认歌单',
    tracks: [
      { id: 't1', title: '曲名', artist: 'P 主', src: 'https://cdn.jsdelivr.net/gh/.../song.mp3', cover: '...' },
      // ...
    ],
  },
];
```

**音频文件托管**:与 assets 仓库一致,音频文件放 assets 仓,通过 jsDelivr/raw CDN 链接引用(同第 7.5 节 datasheet 下载机制)。

#### 配置

```ts
// src/config/site.ts 或环境变量(P2-1)
music: {
  enabled: false,           // PUBLIC_MUSIC_ENABLED,默认关
  provider: 'html5audio',   // PUBLIC_MUSIC_PROVIDER: 'html5audio' | 'none'(howler 未实现前非有效值,P1-8)
}
```

| 配置 | 行为 |
|---|---|
| `enabled: false` | MusicPlayerWidget 零 DOM 输出,零加载,零构建依赖 |
| `enabled: true, provider: 'html5audio'` | MVP 默认;Widget 用 HtmlAudioProvider;默认不播放,用户点击才播 |
| `enabled: true, provider: 'howler'` | **不是 MVP 有效值**(P1-8):howler 未实现前配置它 = 配置错误 throw;未来实现后再加入有效值 |
| `enabled: true, provider: 'none'` | resolver 返回 null,Widget 不渲染(主动选无音乐) |

#### 与其他可插拔 Integration 一致性

- 环境变量开关(`PUBLIC_MUSIC_ENABLED`)
- 关闭后零 DOM/零网络/零构建依赖
- 单向依赖:Provider 实现 → MusicPlayer 接口 → MusicPlayerWidget → BaseLayout;BaseLayout 不 import Provider 实现
- Provider 可独立替换:切换只改配置,不改 Widget/业务代码
- 不引入复杂抽象层:只有接口 + 一个 MVP 实现

#### MVP 范围

- **默认不播放**:页面加载不自动播,用户点击控件才播
- **最简控件**:播放/暂停按钮 + 当前曲目名 + 下一首(控件形态后期设计)
- **HtmlAudioProvider**:基于 HTML5 `<audio>`,MVP 够用
- **歌单放主仓配置**:MVP 固定歌单,后期若需 CMS 编辑再迁 content
- **音频文件托管 assets 仓**:走 jsDelivr/raw CDN
- **当前只实现 HtmlAudioProvider**:Howler 只留接口位,且**未实现前不列入有效配置值**(配置未知值 = 配置错误 throw);None 由 resolver 返回 `null` 实现

### 5.13 工程页面组件

- **`ProjectList`/`ProjectCard`**:类似文章,状态 badge 用语义色(ongoing=info/completed=success/archived=muted/planned=warning)
- **`Gallery.astro`(vanilla enhancement)**:展示 gallery 字段,响应式网格,点击走全局 Lightbox(groupId = project slug),缩略图 lazy,`onerror` 占位图
- **`SpecsTable.astro`**:渲染 specs 为两列表格,纯服务端,窄屏改 dl/dt/dd
- **`DatasheetDownload.astro`(vanilla enhancement)**:渲染 datasheets 列表,主下载按钮(jsDelivr)+ 备用链接折叠(`<details>`)。a11y:链接 aria-label 含名称

### 5.14 番剧墙组件

- **`StatusFilter.astro`(vanilla enhancement)**:5 个 tab(全部/看完/在看/想看/弃坑,走 i18n)。**单选不可复选**,默认"全部",切换走客户端 JS 过滤(数据一次性注入只切显隐)。**URL 同步用 `history.replaceState()` 更新 `?status=finished`,不触发 ClientRouter 导航、不重跑整套 page-load 生命周期,只更新当前列表(P2-31)**。a11y:`role="tablist"` + `role="tab"` + `aria-selected`,键盘左右切换。`prefers-reduced-motion` 时无动画
- **`AnimeWall.astro`**:服务端渲染全部番剧卡,每张卡 `data-status="..."`,配合 StatusFilter 过滤。响应式网格(2/3/4-5 列)。排序按 `watchedDate` 倒序
- **`AnimeCard.astro`(vanilla enhancement)**:封面(远程 URL,直接 `<img loading="lazy">`,JSON collection 不再有本地封面)+ 标题(中文优先)+ 评分 + 状态 badge(语义色)+ hover 动效(`--ease-spring`)+ 点击展开感想 + 精选加 `--shadow-glow`。`onerror` 占位图

### 5.15 术曲墙组件

`VocaloidWall`/`VocaloidCard`:类似番剧,字段不同(P 主/vocaloid/平台链接/歌词片段),无状态筛选,点击展开 `lyricSnippet` + `comment`。

### 5.16 友链页组件

- **`FriendList`/`FriendCard`**:头像 + 站点名 + 描述 + 标签 + 状态 badge(mutual=accent/active=info/inactive=muted);整卡 `<a target="_blank" rel="noopener">`;hover 微动效
- **`Travellings.astro`(可插拔,在 `integrations/travellings/`)**:开往 logo + 文案 + `<a href="https://travellings.cn/go.html" target="_blank" rel="noopener">` 跳转按钮。环境变量 `PUBLIC_TRAVELLINGS_ENABLED` 开关,关闭时友链页不渲染开往入口(零 DOM)。a11y:aria-label 明确
- **友链页留言**:底部嵌入 `<Comments />`(Giscus,可插拔),category 配"留言板",与文章评论区分

### 5.17 关于页与 404

- **关于**:静态内容,UI 走 i18n,正文可选双语。内容:站点介绍、技术栈鸣谢、关于作者、联系方式、版权与协议
- **404**:走 i18n(**默认 zh + `navigator.languages` 客户端增强 + 页面内语言切换;静态 404 不依赖 Referer**),友好文案 + 返回入口,`noindex`,a11y `<h1>` + 焦点可达

### 5.18 组件依赖图(单向)

```
BaseLayout
├── BaseHead
├── Header → {LangSwitch, ThemeToggle, SearchBox(依赖 SearchProvider 接口), MobileNav(vanilla enhancement)}
├── <slot/> → 各页面
├── Footer
├── Analytics(可插拔)
├── MusicHost(常驻 persistent 容器)
├── MusicPlayerWidget(可插拔,依赖 MusicPlayer 接口,默认不播放)
└── Lightbox(全局)

ArticleList ← ArticleCard
ArticleProse ← rehype 输出 + {ArticleImageEnhancer, CodeBlockEnhancer}(事件委托)
Toc(vanilla enhancement) / ReadingProgress(vanilla enhancement)
ProjectList ← ProjectCard
Gallery(vanilla enhancement) / SpecsTable / DatasheetDownload(vanilla enhancement)
AnimeWall ← {AnimeCard, StatusFilter(vanilla enhancement)}
VocaloidWall ← VocaloidCard
FriendList ← FriendCard
Travellings(可插拔) / Comments(可插拔)
SearchBox → SearchProvider(接口) ← PagefindProvider(可插拔实现)
MusicPlayerWidget → MusicPlayer(接口) ← HtmlAudioProvider(可插拔实现)
```

**纪律**:严格单向无循环;领域叶子组件间禁止互相 import(页面/聚合层如 HomeSections 可组合多领域 Card);可插拔组件单向依赖核心;SearchBox/MusicPlayerWidget 只依赖接口不 import 具体 Provider。

### 5.19 Vanilla Enhancement 脚本纪律

- 每个 enhancement 自包含:模板 + scoped 样式 + 脚本在一个 `.astro` 内
- 脚本 ~80 行只是**参考阈值**,真正触发外置为 `X.client.ts` 的因素:复用性、可测试性、生命周期复杂度、独立职责(满足其一即可,避免机械拆分)
- enhancement 间不共享运行时状态;联动走 props 或 CustomEvent
- 启用 ClientRouter 后,所有 enhancement 必须遵循 5.20 生命周期纪律:页面级增强每次 `astro:page-load` 初始化;全局 singleton 只初始化一次;persisted element 不重复绑定
- 禁止引入 React/Vue/Solid 运行时

### 5.20 ClientRouter / View Transition 生命周期纪律

**前提(P0-8)**:启用 `ClientRouter` 后,`<script>` **不再意味着每次页面切换都会重新执行**;全局初始化代码也可能在客户端导航后引用已销毁的 DOM。因此所有客户端增强必须显式挂在 Astro 生命周期事件上,并按类别管理初始化次数。

**事件顺序**:

```
Initial Load
  ↓ astro:page-load(首次加载与每次客户端导航后都会触发)
Navigation 开始
  ↓ astro:before-preparation(旧页准备移除)
  ↓ astro:after-preparation(旧页准备完成,可做清理)
  ↓ astro:before-swap(旧 DOM 即将替换)
  ↓ persistent elements(transition:persist 元素保留)
  ↓ astro:after-swap(新 DOM 已就位)
  ↓ astro:page-load(新一轮页面级初始化)
```

**分类纪律**:

| 类别 | 初始化时机 | 涉及组件 |
|---|---|---|
| 页面级 enhancement(随导航重建) | 每次 `astro:page-load` 执行;绑定前先清理旧监听或使用事件委托 | Toc、ReadingProgress、StatusFilter、CodeBlock 复制按钮、ArticleImage(lightbox/onerror)、MobileNav、SearchBox、Giscus(评论区在页面内容里,iframe 随导航重建) |
| 全局 singleton(只初始化一次) | 模块顶层或首次 page-load 用标志位保护 | MusicPlayer provider、Lightbox 实例 |
| persisted element(`transition:persist`,不重复绑定) | 初始化时检查元素是否已存在,已 persist 则跳过重建 | MusicHost(`transition:persist="music-host"`,内含 `<audio>`,**仅音乐启用时存在**)、需要跨导航保持的 DOM |

**实现约束**:

- 所有 enhancement 入口统一为 `astro:page-load`,禁止依赖"整页加载执行"的隐含假设
- 事件监听统一用事件委托挂到 `<body>` 或稳定容器,避免导航后死引用
- 重复初始化保护:`data-initialized` 标记或 WeakSet 记录已绑定元素
- MusicPlayer:provider singleton 只创建一次;Widget UI 每次 page-load 从 `getState()` 恢复显示;`<audio>` 由 MusicHost 提供并挂 `transition:persist` 容器,Provider 只绑定不创建(见 5.12)
- Giscus:script **只加载一次(singleton,P1-10)**;每次 page-load 先 `destroyGiscus()` 再 `mountGiscus()` 重建 widget(评论区随内容导航重建);初始主题取当前 `data-theme`,`theme-change` 事件同步(见 7.4)
- Lightbox:全局实例 + 事件委托一次初始化;`astro:after-swap` 时若 Lightbox 打开则关闭并清状态
- SearchBox:每次 page-load 重建 UI(清空展开/聚焦/结果);provider 索引缓存可保留;**locale 改变 → destroy + reinitialize Provider(P1-5)**
- ThemeToggle:绑定走事件委托或每次 page-load 重建;防闪烁内联脚本只处理首屏 `data-theme`,不重复执行
- ArticleImage/CodeBlock:document 级事件委托**只注册一次**(singleton guard);`astro:page-load` 只做"确认委托已存在 + 处理新插入 DOM 所需的数据绑定",不重复 addEventListener(P2-30)
- reviewer 拦截:任何 enhancement 脚本直接依赖"整页加载执行"而未挂生命周期事件 → 拦截

---

## 6. i18n 实现策略

### 6.1 整体策略

| 维度 | 策略 |
|---|---|
| 范围 | UI 文案四语(zh/en/ru/ja),文章内容双语渐进(zh/en,允许先单语) |
| 路由 | Astro 内置 i18n,`[locale]` 动态段,defaultLocale 也走显式前缀 |
| 文案管理 | `src/i18n/ui/{locale}.ts` 字典,`t(key, params)` 取值 |
| 文章配对 | `translationKey` 关联同篇 zh/en,未翻译走占位页 |
| SEO | hreflang + canonical 配齐,每语言独立 RSS feed |
| MVP 范围 | zh/en 字典填全,ru/ja 空壳后期补;路由结构一开始按四语搭好 |
| 用户首语言 | 根路径 `/` 协商重定向(见 6.7) |

### 6.2 Astro i18n 配置

```js
// astro.config.mjs
i18n: {
  locales: ['zh', 'en', 'ru', 'ja'],
  defaultLocale: 'zh',
  routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
},
```

`prefixDefaultLocale: true` 让 defaultLocale 也走 `/zh/` 显式前缀,路由结构对称,后期加语言零改动。

**`redirectToDefaultLocale: false` 关键**:Astro 默认 `redirectToDefaultLocale: true` 会自动把 `/` 302 重定向到 `/zh/`,这会与第 6.7 节的"客户端协商 + noscript 兜底"方案冲突——Astro 抢先用 302 重定向,客户端协商脚本根本没机会跑。必须显式设 `false`,让 `/` 走我们自定义的 `src/pages/index.astro` 协商页(客户端 JS 读 `navigator.languages`,`<noscript>` 内 `<meta refresh>` 兜底)。

### 6.3 字典结构

`src/i18n/config.ts` 定义 locales/defaultLocale/uiLocales/contentLocales。

`src/i18n/ui/zh.ts` 是**真相源**,必须全 key 覆盖。key 命名规范:`<scope>.<item>[.<sub>]`,全部小写点分。

key 覆盖范围:site(站点级)、nav(导航)、langswitch(语言切换)、theme(主题)、articles、projects、anime、vocaloid、friends、about、music(背景音乐:play/pause/next/prev/playlist/volume/unavailable)、common(通用:empty/loading/copy/copied/comments/giscus.error/search/404/skip-to-content)。

`en.ts` 对应英文翻译。`ru.ts`/`ja.ts` MVP 空壳,所有 key 走 zh fallback——这是预期行为(用户切到 ru/ja 看到 UI 中文 + 占位页),不是 bug。

### 6.4 翻译函数 `t()`

```ts
export function t(locale: Locale, key: string, params?: Record<string, string>): string {
  const dict = dicts[locale] ?? {};
  const fallbackDict = dicts[defaultLocale] ?? {};
  const raw = dict[key] ?? fallbackDict[key] ?? key;
  if (params) {
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), v), raw
    );
  }
  return raw;
}
```

路由工具:`getLocalizedPath(pathname, targetLocale)`(UI/静态页:取同路径另一 locale 版本)、`getLocalizedEntryPath(entry, targetLocale)`(内容详情页:经 `translationKey` 查目标语言 entry 的真实 slug,见 5.4——**禁止对内容页做 `pathname.replace(locale)`**)、`getLocaleFromPath(pathname)`(从路径提取 locale)。

### 6.5 文章双语渐进机制

`src/lib/i18n.ts`:
- `getEntriesGroupedByTranslationKey(collection)`:按 translationKey 分组所有 entry,返回 `Map<groupKey, {zh?, en?}>`;**无 translationKey 的 entry 用合成 key `single:${entry.id}`**(见 4.2),保证不会被 `getStaticPaths()` 漏掉;`entry.id` 由 glob `generateId` 定义为 `{locale}/{slug}`(见 4.1 P0-3)
- `resolveLocalizedEntry(collection, group, uiLocale)`:通用双语解析,article 和 project 共用。返回 `{mode: 'render'|'placeholder'|'skip', uiLocale, contentLocale}`——zh/en 有对应文章则 render(`contentLocale === uiLocale`),无但有其他语言版则 placeholder(`contentLocale` = 优先 zh 次 en),ru/ja 只要有 zh/en 就 placeholder,都没有则 skip。区分 `uiLocale`(UI 文案)与 `contentLocale`(实际文章语言)
- `deriveLocaleFromPath()`:从 entry 路径推导 locale(`articles/zh/foo` → `zh`);路径格式非法(locale 不在白名单/层级错误)直接报错(见 4.1;frontmatter 已无 `lang`,不存在第二真相)
- `validateSlugs()`:构建时校验每个 entry 目录名合法(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)且同 collection+locale 内唯一;非法/重复直接 build fail(P1-9)
- `validateTranslationGroups()`:构建时校验**同 collection + translationKey + locale 最多 1 条**(重复 → build fail;locale 由目录推导,frontmatter 已无 lang),保证 group 唯一解析(P0-8)
- **placeholder URL 规则(P0-3)**:占位页 slug = 已有语言 entry 的 slug(见 4.2);`getLocalizedEntryPath()` 对"目标语言只有 placeholder"的调用返回同 slug 占位 URL
- **placeholder → 正式 URL 迁移(P0-3/P1-4/P1-7)**:旧占位 URL(或任何被改掉的 slug)在 **clean build 时已不存在于 content repo**,因此必须由**持久化 manifest `content repo 根 redirects.json`**(pull 后位于 `src/content/redirects.json`)记录 `{ "/en/articles/foo/": "/en/articles/foo-bar/" }`——slug 修改时在 content repo 登记(**与 slug 修改同属一个 content commit,不要求主仓提交**,P0-3),构建/部署时把 manifest 转成平台 redirect 规则(Cloudflare `_redirects` / Vercel `vercel.json` / Netlify `netlify.toml`),旧 URL 一律 **301**(见 8.6);不依赖"构建期从历史占位记录自动发现"

`[...slug].astro` 的 `getStaticPaths` 遍历所有 group(含合成组)× 所有 UI locale,用 `resolveLocalizedEntry()` 决定生成正常页或占位页(article/project 共用)。

### 6.6 hreflang 与 canonical

每个多语言页面 `<head>` 注入 hreflang alternates。由 `src/lib/seo.ts` 的 `buildHreflang()` 统一生成,规则:

**正式页(render)**:hreflang alternates **只包含实际存在的 render 页面**(zh/en)+ x-default——**不输出指向 ru/ja placeholder 的 alternate(P1-5)**,placeholder 是 noindex 过渡页,不应被搜索引擎当作正式语言版本。

**x-default 规则(P1-6)**:`defaultLocale`(zh)有 render 页面 → x-default 指向 zh 版本;**defaultLocale 无 render 时,fallback 到第一个实际存在的 render locale**(如只有 en 内容则 x-default → `/en/...`),绝不指向不存在的 zh URL。

**占位页(placeholder)**:自身 `noindex, follow`;hreflang **仅指向实际 render 页面**(不指向自己,不指向其他 placeholder);canonical 指向实际存在的语言版本(placeholder 是过渡页,对自身设 canonical 无意义)。**实际内容语言标记(P1-6)**:placeholder 页保持 `<html lang={uiLocale}>`(如 `ru`),同时内容容器加 **`<article lang={contentLocale}>`**(如 `zh`)——页面 UI 与文章实际语言分别标注,提升无障碍与语言识别准确性。

**UI locale 与 content locale 分离(P1-2)**:placeholder 页需区分"当前 UI 语言"(决定 UI 文案/i18n 字典)和"实际文章语言"(决定显示哪语言原文链接)。`resolveLocalizedEntry()` 返回 `{ uiLocale, contentLocale, mode }`,placeholder 页用 `uiLocale` 取 UI 文案、`contentLocale` 构造跳转链接。

### 6.7 根路径 `/` 协商重定向(方案 A:静态 + 客户端协商)

```html
<!-- src/pages/index.astro -->
<!DOCTYPE html>
<html>
<head>
  <meta name="robots" content="noindex, follow" />   <!-- P1-13:根路径只是语言协商页,避免成为 SEO 重复入口 -->
  <script is:inline>
    (function() {
      const langs = navigator.languages ?? [navigator.language];
      const locales = ['zh', 'en', 'ru', 'ja'];
      const target = locales.find(l => langs.some(pl => pl.toLowerCase().startsWith(l))) ?? 'zh';
      location.replace(`/${target}/`);
    })();
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=/zh/" />
  </noscript>
</head>
<body>Redirecting...</body>
</html>
```

有 JS → 客户端协商;无 JS → `<noscript>` 内 `<meta refresh>` 兜底到 defaultLocale。**meta refresh 与协商 JS 不能同时常驻页面**(两者会竞速造成双导航),meta refresh 只放 `<noscript>` 内(P1-33)。协商闪烁只有根路径一次且极短。

### 6.8 日期与数字格式化

走 `Intl` API(`Intl.DateTimeFormat`、`Intl.RelativeTimeFormat`),不存字典。

### 6.9 RSS per locale

每 locale 一个 feed(`/rss/[locale].xml`),只含该语言文章,过滤 draft。ru/ja feed 暂为空仍生成文件。BaseHead 为每 locale 注入 `<link rel="alternate" type="application/rss+xml">`。

### 6.10 sitemap per locale

**方案 B(选定):自定义生成 sitemap,统一数据源**。`@astrojs/sitemap` 的 `filter()` 接收的是 **URL 字符串而非 Astro 页面对象**,无法直接读取页面 SEO metadata(`noindex`/`indexable`);本项目有 4 语言 + 占位页 + hreflang + canonical + noindex 多套语义,自定义 sitemap 反而更简单、且所有决定来自同一份数据(P0-6)。

**实现**:`src/pages/sitemap.xml.ts` 端点,构建时生成 `/sitemap.xml`:

```ts
// 伪代码
const urls = [];
for (const locale of locales) {
  // 1. 静态页面:首页/文章列表/工程列表/collection/friends/about(按 UI locale 生成)
  // 2. 内容详情页:遍历 resolveLocalizedEntry() 结果,mode === 'render' 的 entry 才进 sitemap
}
// 每 URL:
//   - <loc>
//   - <xhtml:link rel="alternate" hreflang="...">(只输出 render 页;x-default 按 buildHreflang 同一规则:defaultLocale 有 render → zh,否则 → 第一个 render locale,见 6.6 P1-6;用标准代码 zh-CN/en/ru/ja)
//   - <lastmod>:文章/工程用 updatedDate ?? pubDate;内容型静态页(about/friends/collection 等)从 `src/config/static-pages.ts` 的 staticPageMeta 取真实更新日期(P1-14);纯导航页不输出 lastmod(禁止用 buildTime 当 lastmod——改 CSS 全站重 build 会让 lastmod 天天变)
//   - 占位页(mode === 'placeholder')→ 不进 sitemap

// 输出时必须声明 XML namespace(P2-26):
// <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
//         xmlns:xhtml="http://www.w3.org/1999/xhtml">
//   只生成 <loc> 而没有 xhtml:link 属于不完整实现
```

**排除规则(由 SEO metadata 统一决定)**:
- `/404/`(自定义 404,`noindex`)
- `/admin/` 下所有页面(Sveltia CMS,`noindex`)
- `/` 根路径协商页(非内容页)
- 占位页(`mode === 'placeholder'`,`noindex, follow`,不应进 sitemap)
- 任何标 `noindex` 的页面、draft

**统一数据源纪律**:sitemap 的 URL 集合、hreflang、canonical、noindex 全部来自同一份"页面清单"数据(`resolveLocalizedEntry()` + 静态页面清单 + SEO metadata);`src/lib/seo.ts` 提供 `buildSitemapEntries()`(纯函数,输入页面清单 → 输出 XML entry),便于单测。**禁止再出现"filter 读不到 metadata → 用副作用 Set/路径模式猜测"这类实现**。Pagefind 排除同理:统一用 `data-pagefind-ignore`(admin 直接写死在 `public/admin/index.html`,见 7.10)。

**robots.txt 闭环(P1-9)**:`src/pages/robots.txt.ts` 输出 `Sitemap: {PUBLIC_SITE_URL}/sitemap.xml`(由 `PUBLIC_SITE_URL` 注入),与自定义 sitemap 端点形成 `robots.txt → sitemap.xml → hreflang/canonical` 完整链路。

### 6.11 MVP 与后期路线

| 阶段 | UI 字典 | 文章 | ru/ja 路由 |
|---|---|---|---|
| MVP | zh/en 全填,ru/ja 空壳 | zh 为主,en 渐进补 | 生成占位页,hreflang 配齐 |
| 后期 | 补 ru/ja 翻译 | en 持续补 | ru/ja 路由仍占位,直到有 ru/ja 内容 |

---

## 7. 集成方案

### 7.1 集成清单

| 集成 | 类型 | 部署位置 | 与核心耦合 | MVP |
|---|---|---|---|---|
| 搜索(SearchProvider) | 可插拔 Provider 接口 + 具体实现(Pagefind MVP) | 主站静态产物(Pagefind 索引) | 松(可插拔,Search UI 只依赖接口) | 是(默认 pagefind) |
| Giscus 评论 | 可插拔组件 + 第三方脚本 | 第三方(giscus.app) | 松(可插拔) | 是 |
| Sveltia CMS | 独立 SPA + GitHub OAuth | `/admin` 静态 + OAuth 代理 | 紧(内容管线) | 是 |
| 开往 Travellings | 可插拔组件 + 静态链接 | 第三方(travellings.cn) | 松(可插拔) | 是(默认开) |
| 背景音乐(MusicPlayer) | 可插拔 Provider 接口 + 具体实现(HTML5 Audio MVP) | 音频文件托管 assets 仓 + CDN | 松(可插拔,Widget 只依赖接口) | 是(默认关,用户点击才播) |
| assets 下载 | CDN 链接 + 构建校验 | 独立 assets 仓库 + jsDelivr/raw | 松 | 是 |
| Umami 分析 | 可插拔组件 + 第三方脚本 | 第三方或自托管 | 松(可插拔) | 是(开关默认关) |
| OG 图生成 | 构建时 satori | 主站构建产物 | 紧(构建管线) | 是 |
| 图片统一管线 | 构建时 unified processor(remark + rehype)+ astro:assets | 主站构建管线 | 紧 | 是 |
| 代码块增强 | 构建时 rehype(HTML AST)+ Shiki | 主站构建管线 | 紧 | 是 |

### 7.2 内容图片契约与 Markdown 图片管线

#### 7.2.1 内容图片契约(四种来源,禁止混用)

| 来源 | 数据形态 | 处理 | 使用处 |
|---|---|---|---|
| 本地内容图 | `image()`(ImageMetadata)或 Markdown 相对路径 | astro:assets 优化(AVIF/WebP/srcset/LQIP) | frontmatter `cover`/`gallery`/`ogImageLocal`;正文 `![]()` 相对路径 |
| 远程图 | `z.string().url()` | `<img loading="lazy">` 直接渲染(不优化,除非配 `image.domains`) | JSON collection 的 `cover`/`avatar`、正文远程图 |
| public 静态图 | `public/` 路径字符串 | `<img src="/...">` 原样引用(不经 astro:assets) | favicon、默认 OG 图、image-broken 占位图等站点资产 |
| OG 图 | 构建期生成 | satori → `dist/og/{collection}-{locale}-{slug}.png` | `og:image` meta |

**纪律**:
- 本地内容图一律 `image()` 或 Markdown 相对路径 → ImageMetadata 语义;远程一律 URL;public 静态图只在组件里用 `<img src>` 直引;**禁止把 public 路径字符串塞进 `image()` 字段,也禁止把 `image()` 结果当普通字符串传给 `<img>`**
- JSON collection 不再有 `coverLocal`/`avatarLocal`(见 4.2)
- Article/Project 的 `ogImage` 统一为"本地图 / 远程 URL / 自动生成"三选一(见 4.2/7.9),不再出现 Article=ImageMetadata、Project=string 的混用
- **cover/gallery 只允许本地图(P1-11)**:Article/Project 的 `cover`/`gallery` 不接受远程 URL(远程封面只存在于 JSON collection)
- **alt 空串语义(P1-12)**:`coverAlt`/`gallery.alt` 是内容图,必填且**非空**(`trim().min(1)`);`alt=""` 只允许在正文**装饰性图片**场景使用

#### 7.2.2 Markdown 图片统一管线(unified processor)

**Markdown Processor Decision(P0-2)**:Astro 7 默认使用新的 Markdown pipeline(**Sätteri,Rust**)。**本项目继续使用 Unified(remark + rehype)**,原因:
1. 已存在自定义 rehype 插件(`rehype-article-image`/`rehype-codeblock`)
2. 图片处理依赖 Markdown/HTML AST 修改(包装 figure/caption、注入 data 属性)
3. 代码块增强依赖 AST(`<pre>` 包裹与复制按钮数据属性)

因此 `astro.config.mjs` **必须显式 `markdown.processor: unified({...})`**,否则 Astro 7 默认 Sätteri 会让上述插件全部失效。**未来可评估迁移 Astro native processor**(届时需把 rehype 插件移植为 Sätteri MDAST/HAST 插件或改由渲染后增强承担),但 MVP 不切换。

**重要前提**:Astro **原生支持** Markdown `![]()` 本地图片优化(构建时转 AVIF/WebP + srcset)。Astro 6.4 引入、7.x 延续提供 `markdown.processor` 统一配置 remark/rehype(顶层 `markdown.remarkPlugins`/`rehypePlugins` 已弃用)。**Astro 7 默认 Markdown 处理器已切换为 Sätteri(Rust),remark/rehype 插件在 Sätteri 下全部失效(C1)——本项目必须显式 `markdown.processor: unified({...})`,否则图片/代码块插件不会运行**;插件顺序固定为:remark 插件按数组顺序先执行(Markdown AST),rehype 插件再按数组顺序执行(HTML AST),图片插件 → 代码块插件。

**依赖契约(P1-7,不留 Agent 猜测)**:

| 依赖 | 类型 | 说明 |
|---|---|---|
| `@astrojs/markdown-remark` | **直接依赖**(package.json 显式声明,**P1-7**) | 提供 unified processor API,`markdown.processor: unified({...})` 由此包导出 |
| `unified` | **不单独声明 direct dependency(P1-1)** | 通过 `import { unified } from '@astrojs/markdown-remark'` 使用;**仅当实际代码直接 `import { unified } from 'unified'` 时才声明** |
| `rehype-article-image` / `rehype-codeblock` | 自写源码(主仓 `src/lib/`) | 不依赖第三方插件 |
| remark/rehype 生态其余 | **transitive**(由 astro 传递) | 不直接声明;**Agent 不得自行决定安装哪套 unified/remark/rehype 依赖** |

**管线(修正后的正确顺序,P0-4/P2-36)**:

```
Markdown `![alt](path "caption")`
  ↓ remark(Markdown AST):标准化 title → caption 语义;不转换图片节点
  ↓ rehype(HTML AST):把图片节点包装为 <figure>/<figcaption>,注入 data-article-image / data-lightbox
  ↓ Astro Markdown 渲染
  ↓ astro:assets 图片优化(仅本地图,渲染阶段注入优化后的 src/srcset)
  ↓ ArticleImageEnhancer.ts(astro:page-load,事件委托):lightbox 点击 + onerror 占位图
最终 <figure><img><figcaption>
```

**关键修正(P0-4)**:remark 工作在 Markdown AST 阶段、rehype 工作在 HTML AST 阶段,**都不可能接收"Astro 已优化的最终 `<img>`"再包装**——旧文档"Astro 原生图片优化 → remark 插件 → ArticleImage"的顺序不成立。正确分工是:

| 阶段 | 职责 |
|---|---|
| remark(Markdown AST) | 语义标准化(title → caption),默认不写自定义 remark 插件 |
| rehype(HTML AST) | 结构增强:读 `alt`/`title`,包 `<figure>`/`<figcaption>`,注入 `data-article-image` + `data-lightbox` + `data-group-id`;远程图保持 `<img loading="lazy">`;装饰图(`alt=""`)不包 caption |
| Astro 渲染 | 本地图由 astro:assets 输出优化后 src/srcset;远程图原样输出 |
| 客户端 | `ArticleImageEnhancer.ts` 在 `astro:page-load` 用事件委托统一绑定 lightbox/onerror,不逐图实例化组件 |

**markdown.processor 配置(伪代码,以当前 Astro 版本 API 为准)**:

```js
markdown: {
  processor: unified({
    remarkPlugins: [],                    // 预留:图片/代码块语义标准化
    rehypePlugins: [rehypeArticleImage],  // 图片结构增强(见上)
  }),
  shikiConfig: { ... },                   // M1:与 processor 并列在 markdown 对象内(官方 6.4+/7.x 示例一致),不放进 processor
}
```

**纪律(P0-5/P1-13/P1-12)**:
- **插件挂载位置统一由 `markdown.processor` 决定**:remark → Markdown AST,rehype → HTML AST;禁止 Agent 自行选择挂载点,避免图片/代码块处理顺序漂移
- **`rehypeArticleImage` 只改变 HTML 结构,不修改 Astro 图片 source 语义(P1-13)**:禁止把 image node 转成自定义字符串、禁止自己处理 srcset/重新生成图片 URL、禁止改 `src`——优化产物完全由 astro:assets 在渲染阶段生成
- **组件模型收敛(P0-4/P2-35)**:Markdown 图片/代码块增强统一为 **rehype 插件(构建期)+ 客户端增强** 单模型(`rehype-article-image.ts`/`rehype-codeblock.ts` → HTML + data attributes → `ArticleImageEnhancer.ts`/`CodeBlockEnhancer.ts`,命名避免 `.client` 歧义,P1-6);**不再存在 `ArticleImage.astro`/`CodeBlock.astro` 包装组件**,不保留两条实现路径
- **集成测试(fixture,P1-12)**:Markdown 图片管线必须配 fixture 集成测试,验证 `![Alt](./image.webp)` 最终得到 `<figure><img src="/_astro/..." srcset="..." /></figure>`,覆盖本地图/远程图/caption/`alt=""`/srcset/AVIF/WebP/lightbox/onerror(见 9.7)
- **不重复 Astro 原生的图片优化**:自写插件只做结构增强,不接管优化
- **禁止直接传入文件路径字符串**:`<ArticleImage src="./foo.png" />` 是禁止用法;图片组件只接收经管线处理后的结构化数据
- 远程图片 `https://...`:rehype 保持 `<img loading="lazy">`(除非配 `image.domains`),不包 caption 之外的增强
- 带 caption 用 `![alt](path "caption")` → `<figure><figcaption>`
- 仅文章与工程 collection 应用此图片管线(JSON collection 是远程 URL,不涉及)

### 7.3 Sveltia CMS 认证与本地开发

Sveltia CMS 的认证与本地开发机制与 Decap **完全不同**,必须按 Sveltia 官方方式配置。

#### 本地开发:File System Access API(零代理)

Sveltia **不支持** `decap-server` 或 `netlify-cms-proxy-server`,`local_backend` 配置被忽略。本地开发用浏览器原生的 **File System Access API** 直接读写本地文件:

1. 启动前端开发服务器:`pnpm dev`(Astro 默认 `localhost:4321`)
2. 在 **Chromium 浏览器**(Chrome/Edge/Brave,Firefox/Safari 不支持 File System Access API)打开 `http://localhost:4321/admin/index.html`
3. 点击"Work with Local Repository",选择 `src/content/` 目录(content repo 工作目录,非主仓根)
4. 在 CMS 里编辑内容,改动直接写本地文件
5. 用 git 客户端手动 commit/push

**纪律**:
- 本地开发**零代理、零 OAuth**,直接用浏览器 API
- 必须 Chromium 浏览器(Firefox 暂不支持,见 Sveltia issue #38)
- admin 必须是 `public/admin/index.html` 静态文件,不能放 `src/pages/admin.astro`(否则 live reload 干扰)
- 本地编辑不需要认证,改动直接落本地文件,git 操作手动完成

#### 生产认证:两种方案

**方案 A:Access Token(MVP 推荐,个人站)**

个人站最简方案,零部署成本:
- config.yml 只需 `backend: { name: github, repo: ... }`,不需要 `base_url`
- 用户在 admin 登录页点"Sign In with Token",粘贴 GitHub Personal Access Token(**需 content repo write 权限;这是编辑 Token,与 CI 的只读 `CONTENT_GITHUB_TOKEN` 不是同一个,见 7.12 P2-18**)
- token 存浏览器 localStorage,后续 API 请求自动带
- 适合单人开发,不需要 OAuth 代理

**方案 B:Sveltia CMS Authenticator(生产多用户,可选)**

官方 OAuth client,部署到 Cloudflare Workers:
- 仓库:`sveltia/sveltia-cms-auth`
- config.yml 加 `base_url: https://your-authenticator.workers.dev`
- `base_url` 非密钥,可硬编码在 config.yml(公开文件)
- client secret 只在 Authenticator 端,绝不进主仓
- 适合多用户协作场景

**注意**:Sveltia 的 OAuth 配置用 `base_url`,**不是** Decap 的 `proxy.url`/`app_id`/`auth_type`。虽然 Sveltia 也兼容部分第三方 Decap OAuth client,但推荐用官方 Authenticator。

#### 方案 B 部署选项(可选,多用户时)

| 选项 | 说明 |
|---|---|
| `sveltia-cms-auth` Cloudflare Worker | Sveltia 官方提供,免费额度足,**推荐** |
| 第三方 Decap OAuth client | Sveltia 兼容部分第三方 client,但不保证,见 Sveltia 文档 |
| Netlify OAuth provider | 向后兼容 Netlify CMS 的方案;具体集成与配额见 deploy/netlify/README.md(易变信息不进 Spec) |

**纪律**:OAuth Authenticator(若用)与主站完全分离;client secret 只在 Authenticator 端,绝不进主仓;`base_url` 可硬编码在 config.yml(非密钥)。

#### MVP 启用流程(写进 README)

**本地开发**:
1. 启动 `pnpm dev`(首次自动 clone content 到 `src/content/`)
2. Chrome/Edge 打开 `http://localhost:4321/admin/index.html`
3. 点"Work with Local Repository",**选择 `src/content/` 目录**(那里是 content repo 的 git 仓库,不是主仓根目录——选主仓根会让 Sveltia 误认主仓为内容仓)
4. 编辑内容,git 手动提交(在 `src/content/` 里 commit,推 content repo)

**生产(方案 A:Access Token)**:
1. 在 GitHub 创建 **fine-grained Personal Access Token**(P1-10):Repository 选择 `object920-content`;Permission 设为 **Contents: Read and write**;不要再用经典 `repo` scope 描述
2. 访问 `https://example.com/admin/`,点"Sign In with Token"
3. 粘贴 token 登录,开始编辑

**生产(方案 B:Authenticator,可选)**:
1. 创建 GitHub OAuth App,回调填 Authenticator URL
2. 部署 `sveltia-cms-auth` Cloudflare Worker,配 client id/secret
3. config.yml 取消 `base_url` 注释,填 Authenticator URL
4. content 仓库给自己 write 权限
5. 访问 `/admin/` 测试 GitHub 登录

### 7.4 Giscus 评论(可插拔)

#### 组件

`src/components/integrations/comments/Comments.astro`(从 `analytics/` 拆出,保持 integration boundary 清晰,P2-36):
- props: locale、category、categoryId、mapping、term?
- 开关:`import.meta.env.PUBLIC_GISCUS_ENABLED === 'true'` + repo + repoId 都满足才注入
- 未启用 → 零 DOM 输出
- **script singleton(P1-10)**:`src/lib/giscus.ts` 提供 `loadGiscusScriptOnce()`(giscus 脚本**只加载一次**)/ `mountGiscus()`(创建 widget)/ `destroyGiscus()`(导航时销毁旧 widget)/ `updateGiscusTheme()`;**ClientRouter 导航后不再重新加载脚本,只 destroy 旧 widget + mount 新 widget**
- `s.onerror` 降级显示"评论加载失败"文案(走 i18n)

#### 配置纪律

- 主题:**跟随站点主题,而非仅系统偏好**。初始取 `document.documentElement.dataset.theme`(light/dark);`ThemeToggle` 切换时派发 `theme-change` CustomEvent,Comments 监听后调用 **`updateGiscusTheme(theme)`(`src/lib/giscus.ts`)统一封装(P2-29)**——负责 iframe 查找、`postMessage`、origin 校验、iframe 未加载等待、ClientRouter 重建后的重绑定,禁止把 `postMessage()` 散落到多个组件。**不使用 `preferred_color_scheme`**——它只跟随系统,用户手动把网站切到暗色时 Giscus 会不同步(P1-20)
- 懒加载:`data-loading="lazy"`
- 语言:`data-lang` 跟随 locale(zh→zh-CN,en→en,ru→ru,ja→ja)
- mapping:文章用 `pathname`,友链留言板用 `specific` + term
- **跨语言评论边界(P2-22)**:`mapping = pathname` 意味着 zh/en 各语言版本是**独立 Discussion**——这是**有意设计**(评论语言跟随内容语言,避免混排);若后期需要跨语言共享评论,改用基于 `translationKey` 的稳定 mapping(记录为后期可选方案,不在 MVP 实现)
- category 区分:文章评论与留言板用不同 Giscus category
- **仓库独立性(P0-6/P2-28)**:`PUBLIC_GISCUS_REPO` 必须指向 **public 的独立 discussions 仓库**(如 `YourUser/object920-discussions`),**与 `CONTENT_REPO` 完全解耦**——content 仓允许 private,而 Giscus 要求访客能访问 GitHub Discussions,两者不能是同一个私有仓。README 明确:`CONTENT_REPO` → 内容仓(可 private);`PUBLIC_GISCUS_REPO` → public Discussions 仓
- 环境变量:`PUBLIC_GISCUS_ENABLED`/`PUBLIC_GISCUS_REPO`(独立 discussions 仓)/`PUBLIC_GISCUS_REPO_ID`/`PUBLIC_GISCUS_CATEGORY_ARTICLES`+`_ID`/`PUBLIC_GISCUS_CATEGORY_GUESTBOOK`+`_ID`

#### 启用流程(写进 README)

1. **创建 public discussions 仓库**(如 `object920-discussions`,独立于 content 仓)并启用 GitHub Discussions
2. 对 **discussions 仓**安装 Giscus App
3. 到 giscus.app 获取 repo-id 与 category-id
4. 创建两个 category(文章评论 + 留言板)
5. `.env` 填环境变量,`PUBLIC_GISCUS_ENABLED=true`
6. 文章页与友链页分别用对应 category 调用 `<Comments />`

### 7.5 assets 下载

#### 三种镜像

| 镜像 | URL 模板 | 适用 | 备注 |
|---|---|---|---|
| jsDelivr | `https://cdn.jsdelivr.net/gh/{user}/{repo}@{ref}/{path}` | **小文件**(默认主链接) | `ref` 默认 `main`;有 CDN 缓存、国内可达性好;单文件有大小上限(当前约 50MB,以 jsDelivr 官方文档为准,不写死) |
| GitHub Raw | `https://raw.githubusercontent.com/{user}/{repo}/{ref}/{path}` | 备用(jsDelivr 失败时) | `ref` 默认 `main`;无大小限,国内可达性差 |
| GitHub Release | `https://github.com/{user}/{repo}/releases/download/{tag}/{filename}` | **大文件** + 版本化资料 | 每包上限高(约 2GB),有版本管理 |

**选择原则**:小文件走 jsDelivr(主)+ Raw(备);大文件或需版本管理的走 Release。具体大小阈值以各服务官方文档为准,不在 spec 写死数值。

**版本纪律(P1-28)**:`ref`(`main`)只适用于"最新即正确"的 latest 资源;**数据手册等历史工程资料必须 pin 到 tag/commit**(jsDelivr 与 Raw 均支持 `@{ref}`),避免文件被替换后 URL 语义漂移。datasheet schema 的 `ref` 字段默认 `main`,发布历史资料时显式填 tag/commit;`buildDownloadUrls()` 用 `ref` 构造 URL。

#### 链接构造

`src/lib/assets.ts` 的 `buildDownloadUrls(datasheet)` 按 mirror 数组顺序生成主+备用链接;jsDelivr/raw 用 `datasheet.ref` 构造 `@{ref}`,release 镜像时 `releaseTag` 必填缺失抛错。

#### 构建时校验

`src/scripts/check-datasheets.ts` 在 prebuild 跑,对所有工程 datasheets 校验 URL 可达。**状态码必须分类处理,不能把非 200 一律当"文件不存在"**(P1-27):

| 状态 | 含义 | 处理 |
|---|---|---|
| 200 | 存在 | 通过 |
| 404 | 文件不存在 | 按镜像容错策略判定(见下) |
| 401/403 | 权限错误 | 报"权限错误"而非"不存在";按镜像容错策略判定 |
| 405 | HEAD 不支持 | 降级 `GET Range: bytes=0-0` 再判定 |
| 429 | 限流 | 退避重试(3 次指数退避) |
| 5xx / timeout | CDN/网络故障 | 报"CDN 故障/网络故障",不误报"文件不存在" |

**流程**:HEAD → 405/特殊失败 → `GET Range: bytes=0-0` → 带重试(3 次指数退避)。错误信息含工程 slug/datasheet 名/镜像/状态码与分类。本地可 `pnpm check:datasheets` 单独跑。

**非功能性约束(M3)**:20+ 工程 × 2-3 mirror 的并发请求容易触发 CDN 限流——必须加**并发控制**(如 p-limit 限制并行 3-5)与**超时控制**(单 URL 超时 10s、整体 60s);超时计入"网络故障"分类并按镜像容错策略处理。

**镜像容错策略(P1-21,真正实现双镜像设计)**:

| 情况 | 结果 |
|---|---|
| 至少一个镜像可用 | 通过 |
| 全部镜像 404 | build fail |
| primary 404 + fallback 200 | **warn + 继续**(不阻断,提示主链接失效需修) |
| 429/5xx/timeout | 重试后仍失败 → 报对应分类,不误报 404 |

即:**check-datasheets 的目标是"至少一个下载通道可用",不是"每个镜像都必须 200"**。

#### assets 仓库结构

```
object920-assets/
├── README.md
├── datasheets/*.pdf          # 走 jsDelivr/raw 的文件
└── releases/                 # 走 Release 的文件(通过 Releases 上传,不进 git)
```

**纪律(P1-7)**:assets 仓只存二进制不存代码;走 Release 的文件不进 git;**不用 Git LFS**(免费额度小且克隆不友好);仓库名通过环境变量注入;**assets 仓必须 public**——只要继续使用 jsDelivr/raw 提供下载与音频,仓库就必须可公开访问(与 content repo 可 private 明确区分)。

#### 接手者必读

1. 数据手册只传 assets 仓
2. 走 jsDelivr/raw 放 `datasheets/`;走 Release 通过 Releases 上传
3. Sveltia 编辑时填 `filename`(只文件名)+ `mirror` 数组 + 必要时 `releaseTag`;**历史资料显式填 `ref`(tag/commit),不要依赖默认 `main`**
4. `pnpm check:datasheets` 校验可达性(区分 404/403/429/5xx),**至少一个镜像可用即通过;全部 404 才阻断;primary 失效但 fallback 可用 → warn**

### 7.6 开往 Travellings(可插拔)

`src/components/integrations/travellings/Travellings.astro`:友链页嵌入 `<Travellings />`,MVP 用主端点 `<a href="https://travellings.cn/go.html" target="_blank" rel="noopener">`。

**可插拔**:环境变量 `PUBLIC_TRAVELLINGS_ENABLED` 开关(默认开)。关闭时友链页不渲染开往入口,零 DOM。与其他可插拔 Integration 一致(单向依赖,关闭零 DOM/零网络/零构建依赖)。

**加入开往网络**:按 travellings.cn/docs 申请加入(站点上线后)。

### 7.7 背景音乐(可插拔 MusicPlayer)

详细架构见第 5.12 节。要点:
- `src/components/integrations/music/MusicPlayer.ts` 接口定义
- `HtmlAudioProvider.ts` MVP 默认实现(纯 `.ts`,基于 HTML5 `<audio>`)
- `MusicPlayerWidget.astro` 播放控件(形态后期设计,MVP 最简按钮)
- **默认不播放**:页面加载不自动播,用户点击控件才播(符合浏览器 autoplay 策略 + UX 友好)
- 歌单放 `src/config/music.ts`(MVP 固定,后期可迁 content)
- 音频文件托管 assets 仓,走 jsDelivr/raw CDN
- 环境变量 `PUBLIC_MUSIC_ENABLED`(默认关)+ `PUBLIC_MUSIC_PROVIDER=html5audio|none`(howler 未实现前非有效值)
- **跨页面播放(P0-7)**:正式启用 Astro ClientRouter;`<audio>` 挂 `transition:persist` 容器 + MusicPlayer singleton,遵循 5.20 生命周期(见 5.12)

### 7.8 Umami 分析(可插拔)

`src/components/integrations/analytics/Analytics.astro`:无 props,全靠环境变量(`PUBLIC_UMAMI_ENABLED` + `PUBLIC_UMAMI_SCRIPT_URL` + `PUBLIC_UMAMI_WEBSITE_ID`)。未启用零 DOM。`s.onerror` 静默 console.warn。推荐 MVP 用 Umami Cloud(免费额度 100k events/月)。

### 7.9 OG 图自动生成

构建时用 `satori` + `@resvg/resvg-js` 为每篇文章/工程生成 1200x630 PNG。`src/lib/og.ts` 的 `generateOgImage()` 加载字体构造元素树。`src/scripts/generate-og.ts` 在 postbuild 增量生成。**`ogImage` 与 `ogImageLocal` 互斥(`validateOgImageFields()` build fail,见 4.2 P1-10);`ogImageLocal`(ImageMetadata)转最终 `og:image` 绝对 URL 统一走 `buildOgImageUrl(imageMetadata, siteUrl)`(src/lib/image.ts,见 P1-11),禁止组件自行拼接 `ImageMetadata.src` 与 `PUBLIC_SITE_URL`**。

**字体方案(P0-2)**:站点内容覆盖 zh/en/ru/ja,**中文/日文不能依赖浏览器系统字体 fallback**——Satori 需要实际提供字体数据,且必须使用 **Satori 支持的字体格式(TTF/OTF/WOFF)**,不能直接假设站点自托管的 WOFF2 subset 可直接使用。至少提供:

```text
OG fonts(自托管,建议主仓 public/fonts/og/ 或 assets 仓)
├── Inter-Regular.ttf      # Latin + Cyrillic 覆盖
├── Inter-Bold.ttf
└── NotoSansSC-Regular.ttf # CJK 覆盖(zh/ja)
```

按 **locale 或实际字符集**决定加载哪些字体(zh/ja → 追加 CJK 字体;en/ru → 仅 Inter);OG 文本含 CJK 字符而字体缺失 → 构建 warn + 该页降级默认 OG(不静默缺字)。

**字体体积预算(M2)**:完整 NotoSansSC Regular TTF 约 8-12MB,每次 OG 生成都加载会显著拖慢构建——**必须使用子集化版本**:至少包含 3500 常用汉字(目标 1-3MB),或按实际内容字符集定制子集;可评估 `@chinese-fonts` 等预子集化方案。文档中注明字体文件的**来源与体积预算**,并在实现时把子集化脚本/产物纳入 `src/scripts/generate-og.ts` 的预处理步骤。

**输出路径(关键)**:直接输出到 **`dist/og/`**(构建产物目录),不是 `public/og/`。因为 postbuild 在 `astro build` 完成后跑,此时 `public/` 内容已被复制进 `dist/`,postbuild 写 `public/og/` 不会进 `dist/`(build 已结束)。必须直接写 `dist/og/`,与 Pagefind 索引(`dist/pagefind/`)同理。

**文件名防冲突(关键)**:`{slug}.png` 会造成 zh/en 文章、article/project 同 slug 覆盖。文件名加入 `collection + locale + slug` 维度:`dist/og/{collection}-{locale}-{slug}.png`(如 `articles-zh-hello-world.png`、`projects-en-esp32-s3.png`)。

**增量依据(P1-18)**:**不能只检查"文件存在"**——文章标题/摘要/locale/模板变化后旧 PNG 仍存在会导致不重生成。增量依据 = 内容 hash + 模板版本:

```ts
const hash = sha1(title + description + locale + collection + slug + OG_TEMPLATE_VERSION + OG_FONT_VERSION);
// .cache/og-cache.json 保存 { `${collection}-${locale}-${slug}`: hash }
// 文件缺失 或 hash 与缓存不一致 → 重新生成;一致 → 跳过
```

**hash 组成(P1-5)**:`sha1(content + OG_TEMPLATE_VERSION + OG_FONT_VERSION)`——字体文件(如 NotoSansSC 子集)替换后必须递增 `OG_FONT_VERSION`,否则缓存不会失效。模板/样式变更时递增 `OG_TEMPLATE_VERSION` 使全量失效。**缓存位置(P0-1)**:`astro build` 会清空 `dist/`,因此增量缓存**必须放在 `.cache/og-cache.json`**(不入仓,见 2.3),`dist/og/` 只存最终 OG 文件——缓存放 dist 会在每次 clean build 失效。

**纪律**:增量依据 = 内容 hash + `OG_TEMPLATE_VERSION` + **`OG_FONT_VERSION`**(P1-5),缓存放 `.cache/og-cache.json`(不是 dist,P0-1);字体 = Inter(Regular/Bold)+ NotoSansSC(Regular,子集化),按 locale/字符集选择(P0-2/M2);**ogImage 三选一互斥(本地 `ogImageLocal` / 远程 `ogImage` / 自动生成,同时设置 build fail);`ogImageLocal` 必须经 `buildOgImageUrl()` 生成绝对 URL**;draft 跳过;输出到 `dist/og/`(入 .gitignore);默认 OG 图 `public/images/og-default.png` 入仓给无特定 OG 的页面用;zh/en 分别生成(文件名含 locale 区分)。

**已知风险:`@resvg/resvg-js` 原生绑定**

`@resvg/resvg-js` 是 Rust `resvg` 库的 Node.js N-API 绑定,通过 Prebuilt binaries 分发(Linux x64/arm64 glibc、macOS、Windows 都有预编译)。大多数 CI 环境(GitHub Actions `ubuntu-latest`、Cloudflare Pages 构建容器)在预编译覆盖范围内,**通常开箱即用**。

但以下情况会 fallback 到源码编译,可能因缺 Rust 工具链或系统库而构建失败:
- musl-based 容器(如 Alpine Linux)
- 预编译未覆盖的平台/架构(如 ARM Windows、特殊 glibc 版本)
- 未来 resvg-js 升级引入新系统依赖
- 某些受限 CI 容器未预装动态库

**应对预案(按优先级)**:
1. **优先用预编译覆盖良好的平台**:GitHub Actions `ubuntu-latest`、Cloudflare Pages 默认容器都已在覆盖范围;若选 Vercel/Netlify 默认构建容器也通常 OK
2. **若构建失败报缺原生模块**:检查错误信息是否含 `node-gyp`/`cargo`/`rustc`,若是则确认构建环境;必要时在 CI workflow 加 Rust 工具链安装步骤(`dtolnay/rust-toolchain@stable`)
3. **若仍无法解决**:临时把 `generate-og` 从 `postbuild` 链中移除(`package.json` 的 `postbuild` 去掉 `pnpm run generate-og`),OG 图降级为只用 `public/images/og-default.png` 默认图,不阻断主站构建;待环境问题解决后再恢复
4. **长期替代方案(可选)**:若原生绑定持续是痛点,可评估纯 JS 的 SVG 渓染替代品(如 `sharp` 基于 libvips 也有预编译,或 `@vercel/og` 基于 WASM 无原生依赖),但 MVP 不做此切换

**失败策略(P0-12)**:OG 图是可选增强:**单篇生成失败 → warn + 该页降级用默认 OG 图;脚本整体 warn + exit 0,不阻断主站构建**——与 Pagefind 的"用户显式启用即必须成功"不同(见 7.10)。若 resvg 环境问题持续,优先保证主站能构建部署,OG 降级为默认图;不要为了 OG 图强行改造构建环境。

### 7.10 搜索(可插拔 SearchProvider 架构)

#### 架构总览

搜索系统设计为**可插拔 Integration**(与 Analytics/Comments 一致),Search UI 与搜索引擎解耦:

```
SearchBox(integrations/search/,vanilla enhancement) ← 只依赖 SearchProvider 接口
  ↓ 调用 provider.search()
SearchProvider 接口(search/SearchProvider.ts)
  ↑ 实现
具体 Provider(search/,按配置注入):
  - PagefindProvider(MVP 默认,实现接口)
  - OramaProvider(未来,不实现)
  - None(resolver 返回 null,SearchBox 零 DOM)
```

#### SearchProvider 统一接口(最小必要)

见第 5.11 节接口定义(`initialize` + `ready` + `search` + **`destroy`**)。接口只定义最小必要方法,不引入工厂/注册表/插件系统。Provider 用纯 `.ts` 实现(非 `.astro`),UI 与 Provider 分离。

#### PagefindProvider(MVP 默认实现)

`src/components/integrations/search/PagefindProvider.ts`(纯 `.ts` 模块,非 `.astro`——Provider 是逻辑实现,不应是组件):
- `initialize()`:动态 `import('/pagefind/pagefind.js')`(Pagefind 低级 Search API),加载索引;异步完成
- `ready()`:resolve `true` 当索引加载完成,`false` 当 dev 模式索引不存在
- `search(query, opts)`:调用 `await import('/pagefind/pagefind.js')` 返回的 Search API(**只保留这一种 API 模型**,不保留 `window.__pagefind__` 兼容路径,P1-19),映射结果为 `SearchResult[]`;**不按 `opts.locale` 手动二次过滤(P1-13,与 5.11 统一)**——语言由 `<html lang>` 的 Pagefind 语言索引承担,`opts.locale` 仅保留给未来 Orama 等 Provider

**Pagefind API 说明(1.5.0+)**:Pagefind 1.5.0 引入 Component UI(`pagefind-component-ui.js`)取代旧 Default UI(`pagefind-ui.js`/`PagefindUI`)。MVP 用低级 Search API `/pagefind/pagefind.js`(自定义 UI,适配 SearchBox);若想用官方现成 UI 用 `pagefind-component-ui.js`。**不要用旧的 `pagefind-ui.js`**(已过时)。

#### 构建时索引生成

`astro build` 完成后跑 `pagefind --site dist` 扫描 HTML 生成索引到 `dist/pagefind/`。**仅在搜索启用且 provider=pagefind 时跑**(搜索禁用时 postbuild 跳过 pagefind:**不执行、不生成索引、无运行时搜索请求;`pagefind` 包仍可能作为依赖安装,不称为严格"零构建依赖",P2-3**)。

**失败策略(P0-12/P2-40)**:`PUBLIC_SEARCH_ENABLED=true` 时 Pagefind 是**用户显式启用的功能**,生成失败 = **CI fail**(`search-index.mjs` 以非零退出);`SEARCH=false` 时不执行、不生成索引、无运行时请求(P2-3)。**不再保留"Pagefind 也不阻断主站"的表述**——可选功能关闭时不运行,启用后失败就是构建失败。

```json
"scripts": {
  "build": "astro build",
  "postbuild": "pnpm run build-meta -- --dist && pnpm run search:index && pnpm run generate-og && pnpm run check:links && pnpm run check:sitemap && pnpm run check:rss",  // P0-2 完整链:build-meta/search:index(失败 = CI fail)/generate-og(warn+exit 0)/links/sitemap/rss
  "search:index": "node src/scripts/search-index.mjs",  // 检查配置,pagefind 启用才跑;pagefind 失败 → 非零退出
  "check:links": "lychee --offline --no-progress 'dist/**/*.html'"
}
```

`search-index.mjs` 逻辑:读 `PUBLIC_SEARCH_ENABLED` + `PUBLIC_SEARCH_PROVIDER`;若 `enabled && provider === 'pagefind'` 则跑 `pagefind --site dist`(失败抛错、非零退出 → CI fail),否则跳过。

#### 页面标注纪律(Pagefind 特定,仅 pagefind 启用时)

- 每个页面 `<html lang={locale}>`——i18n 已设,Pagefind 自动识别,不重复声明
- admin/404/占位页排除:`<html data-pagefind-ignore>`(占位页还加 `noindex`);**admin 不经过 BaseHead/BaseLayout,`data-pagefind-ignore` 必须直接写死在 `public/admin/index.html` 的 `<html>` 上**(P1-24),不能靠 metadata 自动注入
- **索引范围(P1-14)**:默认**只索引 Article / Project 详情页**;首页、文章/工程列表、tag/category/archive、about、friends、collection 等页面统一加 `data-pagefind-ignore`,避免搜索结果出现大量重复页面
- 搜索 UI(`SearchBox.astro`,enhancement)默认折叠,点击展开
- **dev 模式搜索不工作**(PagefindProvider `ready()` resolve false)是预期
- **ClientRouter locale 切换的重新初始化(P1-5)**:`astro:page-load` 时检查当前 locale,若与 Provider 当前 locale 不同(如 `/zh/...` 客户端导航到 `/en/...`),必须 **destroy Pagefind 实例 → 重新 initialize**(Pagefind 实例会保持旧 locale 状态,不能只换 `opts`);fixture 覆盖 `zh → ClientRouter → en → Search` 验证只返回 en 内容
- **后期可选(P2-15)**:页面增多后若 `data-pagefind-ignore` 容易漏,可改用 `<main data-pagefind-body>` 作为更明确的搜索主体(现阶段维持 ignore 方案)

#### 配置

| 配置 | 行为 |
|---|---|
| `PUBLIC_SEARCH_ENABLED=false` | SearchBox 零 DOM;postbuild 跳过 pagefind;不执行/不生成/无运行时请求(P2-3) |
| `PUBLIC_SEARCH_ENABLED=true, PUBLIC_SEARCH_PROVIDER=pagefind` | MVP 默认;postbuild 跑 pagefind;SearchBox 用 PagefindProvider |
| `PUBLIC_SEARCH_ENABLED=true, PUBLIC_SEARCH_PROVIDER=orama` | 不是 MVP 有效值;未实现前配置 = 配置错误 throw |
| `PUBLIC_SEARCH_ENABLED=true, PUBLIC_SEARCH_PROVIDER=none` | resolver 返回 null,SearchBox 不渲染(主动选无搜索) |

#### MVP 范围(只做当前语言索引,仅 Pagefind)

- 搜索 UI 跟当前 locale,**只搜当前 locale 内容**(Pagefind 按 `<html lang>` 自动分语言索引;**Provider 不做手动 locale 二次过滤**,见 P1-15)
- 中文分词用 Pagefind 默认 CJK 处理(MVP 够用);**不上 jieba 预处理**(避免增加构建复杂度)
- **不做跨语言搜索**(MVP);后期如需再加"全语言搜索"选项
- 搜索结果按相关度排序
- **当前只实现 Pagefind**:Orama 只留接口位且**未实现前不是有效配置值**;None 由 resolver 返回 `null` 实现

### 7.11 代码块插件(unified processor 内)

Astro 内置 Shiki 配置(`markdown.shikiConfig`)+ 自定义 **rehype 插件**(`src/lib/rehype-codeblock.ts`,HTML AST 阶段)给 `<pre>` 加外层包裹与复制按钮数据属性。**插件挂载位置由 `markdown.processor` 统一决定,与图片插件同源管理**(P0-5)。Shiki 构建时高亮(零运行时),主题跟随站点暗色。

### 7.12 构建管线总览

```
pnpm build
├── prebuild:
│   ├── pull:content             # git clone/pull content 仓到 src/content;本地非 destructive(dirty 检测),FORCE_CONTENT_SYNC 仅 CI 注入(P0-1)
│   ├── build-meta              # 生成 src/.build-meta.generated.json(Footer 渲染读取,git 只在 scripts 内)
│   └── check-datasheets         # 校验 assets 可达(状态码分类 + 镜像容错:至少一镜像可用,见 7.5)
├── astro build:
│   ├── Content Collections 加载 + Zod 校验(读 src/content/)
│   ├── markdown.processor:remark(Markdown AST)→ rehype(HTML AST 增强:图片 figure/caption、代码块包裹)
│   ├── Shiki 高亮(构建时)
│   ├── astro:assets 图片优化(AVIF/WebP/srcset,渲染阶段)
│   ├── 页面渲染(含 i18n、占位页、hreflang)
│   ├── sitemap.xml 端点生成(自定义,见 6.10)
│   ├── RSS 端点生成
│   └── 构建元数据注入(见下)
└── postbuild(P0-2 完整链): build-meta --dist(落盘 dist/build-meta.json)→ search:index(仅 pagefind 启用,失败 = CI fail)→ generate-og(增量,失败 warn 降级默认图)→ check:links → check:sitemap → check:rss
```

**构建元数据(P2-4/P2-8/P2-9)**:由 `src/scripts/build-meta.mjs` 分两步:prebuild 生成 `src/.build-meta.generated.json`(astro build 渲染 Footer 时读取,纯文件读取无 git);postbuild `--dist` 落盘 `dist/build-meta.json` 作为**正式产物**(不保留"或注入页面 data attribute"的二选一;**git 读取只在 scripts 内执行,见 2.2-8**),且**只公开最小字段**(见下)。**dev 容错(m4)**:`pnpm dev` 的 predev 只在首次 clone 时跑,不会重新生成该文件——**Footer 读取缺失时降级显示 `'unknown'`**,不抛错;需要时手动 `pnpm run build-meta` 或从 predev 钩子补生成:
- `mainCommit`:主仓 commit(`process.env.GITHUB_SHA` ?? `tryGitRevParse('HEAD')` ?? `'unknown'`——不依赖完整 `.git`)
- `contentCommit`:content 仓 commit(`process.env.CONTENT_COMMIT` ?? `git -C src/content rev-parse HEAD`(try/catch)?? `'unknown'`)
- `contentUpdatedAt`:content 仓最新 commit 时间(`git -C src/content log -1 --format=%cI`,非敏感,用于 UI 区分"内容库最后更新")
- `buildTime`:构建时间戳(`new Date().toISOString()`)

`nodeVersion`/`astroVersion` 等环境细节**不进生产构建元数据**(避免无限暴露构建环境,见 P2-9);仅在本地 debug(`BUILD_META_DEBUG=true`)时追加。**UI 语义区分(P2-23)**:Footer 分开显示"站点最后构建 = buildTime"与"内容库最后更新 = contentUpdatedAt/contentCommit",**不得统一标成"最后更新时间"**(两者语义完全不同)。

**Incremental Build 预留(P2-2)**:OG/Pagefind/RSS/Sitemap 都是 global artifact,当前**完整 build 更可靠**——MVP 不引入 incremental static build;未来评估时以 Astro 7 官方机制为准,不进核心。`contentCommit` 即内容版本指纹(P2-1,支持回滚/问题定位/部署追踪,无需额外 Content SHA)。

`pnpm dev` 时 `predev` 钩子**仅在 `src/content/` 不存在时跑 `pull:content`**(首次 clone),已存在时**不自动 pull**(避免 Sveltia 本地未提交修改被 pull 覆盖/冲突)。手动更新用 `pnpm pull:content` 显式跑。

**`pull-content.mjs` 脚本逻辑(三模式)**:
- 读 `CONTENT_REPO` 环境变量(默认 `YourUser/object920-content`)
- **content branch 固定 `main`(P1-8)**:所有 fetch/merge 都以 `origin/main` 为唯一目标,**不使用 `git pull`**(避免用户处于 feature branch 时错误更新错误分支)
- **repo 完整性检测(P1-2)**:`pull-content.mjs` 在 `src/content/` 已存在时先跑 `validateContentRepo()`——检查 `src/content/.git` 存在、origin URL 与 `CONTENT_REPO` 一致、当前分支为 main;任一检查失败(`.git` 损坏/目录存在但不是 repo/origin 错配)→ **删除 `src/content/` 后重新 clone**,而不是把"目录存在"当作"仓库健康"
- **首次 clone**(`src/content/` 不存在):`git clone --depth 1 <url> src/content`
- **手动更新**(`pnpm pull:content` 显式调用,`src/content/` 已存在):`git -C src/content fetch origin main --depth=1 && git -C src/content merge --ff-only origin/main`——用户主动跑,知晓可能冲突
- **CI 强制同步**(仅 CI workflow 注入 `FORCE_CONTENT_SYNC=true` 时):先 `git -C src/content fetch --depth 1 && git -C src/content reset --hard origin/main`,强制同步最新(丢弃本地修改,CI 无本地修改)
- **predev 不自动 pull**:`predev` 只在 `src/content/` 不存在时 clone,已存在时跳过(保护 Sveltia 本地未提交修改)
- **本地 build 非 destructive(P0-1)**:`pnpm build` 的 prebuild **不默认设置 `FORCE_CONTENT_SYNC`**——`pull-content.mjs` 检测到 `src/content/` 有未提交修改时**报错退出并提示 commit/stash**(绝不自动 `reset --hard`),clean 时 `fetch origin main --depth=1 && merge --ff-only origin/main`;需要强制同步时显式 `FORCE_CONTENT_SYNC=true pnpm build`(仅建议 CI/部署使用)
- `--depth 1` 只拉最新一个 commit,clone 快
- 拉取后:读取 `git -C src/content log -1 --format=%cI`(content repo 最新 commit 时间,**不带 `-- <file>` 路径过滤**,与 `--depth 1` 兼容)注入 `lastUpdated` + `contentCommit`(commit hash)到构建数据(供番剧/术曲/友链页显示"内容最后更新",及构建元数据追溯)

**认证(private repo,独立于 main repo 的 GITHUB_TOKEN)**:
- main repo 的 `GITHUB_TOKEN`(GitHub Actions 自动注入)scope 是 main repo,**不能默认访问独立 private content repo**
- private content repo 需**独立认证**:配置独立 PAT(fine-grained,scope 仅 content repo read)或 GitHub App 或 deploy key
- 环境变量 `CONTENT_GITHUB_TOKEN`(独立于 `GITHUB_TOKEN`)存放 content repo 专用 token;**CI 用,read-only(P2-18)**
- **编辑 Token 与 CI Token 严格区分(P2-18)**:Sveltia 编辑登录用的 GitHub PAT 必须对 content repo 有 **write** 权限,与 CI 的 `CONTENT_GITHUB_TOKEN`(read-only)不是同一个 token——**不要把 CI 只读 token 拿去登录 CMS**,也不要给 CI token 提权
- **禁止将 Token 直接拼接到 Repository URL**(会泄露在进程列表/日志),用 git credential helper 走 `Authorization` header
- 无任何 token → anonymous clone(仅支持 public content repo)
- **least-privilege(P1-23)**:`CONTENT_GITHUB_TOKEN` 必须是 fine-grained PAT,scope 仅限 content repo 且 **read-only**(Actions workflow 的 `permissions` 也保持最小,见 9.8)

### 7.13 系统数据流图与依赖矩阵

#### 系统级数据流(P2-1)

```
Sveltia 编辑(content repo)
  ↓ git commit
content repo main 分支
  ↓ GitHub Actions 触发
主站平台 Deploy Hook
  ↓ 重建
main repo: pnpm install && pnpm build
  ├── prebuild: pull:content(git clone/pull content)→ check-datasheets
  ├── astro build: Content Layer + Zod → 渲染 → sitemap/RSS
  ├── postbuild: build-meta --dist → search:index(Pagefind)→ generate-og(satori)→ check:links → check:sitemap → check:rss
  └── 构建元数据: build-meta.json(mainCommit/contentCommit/buildTime)
  ↓ dist/ 部署
访客浏览器
  ├── 核心 HTML/CSS(静态)
  └── 可插拔 Integration(Giscus/Umami/Search/Music/Travellings)按启用加载
```

#### 图片数据流(P2-2)

```
本地图片(Markdown ![]() 相对路径或 frontmatter image(),entry-relative 存储)
  ↓ remark(Markdown AST:标准化 caption 语义)
  ↓ rehype(HTML AST:包 figure/figcaption + data-article-image/data-lightbox)
  ↓ Astro 渲染 + astro:assets 优化(AVIF/WebP/srcset)
  ↓ ArticleImageEnhancer.ts(astro:page-load,事件委托:lightbox/onerror)
最终 <figure><img><figcaption>

远程图片(Bangumi/CDN URL)
  ↓ rehype 保持 <img loading="lazy">(不走 astro:assets 除非配 domains)
  ↓ onerror 替换占位图

OG 图(构建时 satori 生成)
  ↓ dist/og/{collection}-{locale}-{slug}.png
  ↓ <meta property="og:image"> 引用
```

#### 数据手册数据流(P2-2)

```
assets repo(datasheets/*.pdf,通过 Sveltia 填 filename)
  ↓ 构建时 check-datasheets 校验可达(HEAD → GET Range 降级,状态码分类)
  ↓ buildDownloadUrls() 生成 jsDelivr 主 + raw 备链接(按 datasheet.ref 构造)
  ↓ <DatasheetDownload> 渲染主按钮 + <details> 备用
  ↓ 用户点击下载
```

#### 音乐数据流(P2-2)

```
assets repo(音频 .mp3 via 歌单 config)
  ↓ MusicHost(BaseLayout 常驻 transition:persist 容器,见 5.12)
  ↓ MusicPlayer 接口(HtmlAudioProvider MVP)
  ↓ MusicPlayerWidget 控件(默认不播放,用户点击才播)
  ↓ HtmlAudioProvider(audioElement):绑定 host 内 persistent <audio>,只管理播放逻辑
  ↓ ClientRouter 跨页面保持(MusicHost persist + singleton,见 5.20)
```

#### 运行时依赖矩阵(P2-3)

| Integration | 启用条件 | 运行时网络 | 运行时 DOM | 用户感知 |
|---|---|---|---|---|
| Giscus 评论 | `PUBLIC_GISCUS_ENABLED=true` | giscus.app(iframe+API) | iframe + script | 评论区 |
| Umami 分析 | `PUBLIC_UMAMI_ENABLED=true` | Umami 域(script+beacon) | script | 无(静默) |
| 搜索(Pagefind) | `PUBLIC_SEARCH_ENABLED=true && PROVIDER=pagefind` | 无(静态索引) | SearchBox + 索引 JS | 搜索框 |
| 开往 Travellings | `PUBLIC_TRAVELLINGS_ENABLED=true` | 无(静态链接,点击时跳第三方) | `<a>` | 开往入口 |
| 背景音乐 | `PUBLIC_MUSIC_ENABLED=true` | 音频 CDN(用户点击后) | Widget + `<audio>` | 播放控件 |

#### 构建依赖矩阵(P2-4)

| 功能 | 构建时需要网络 | 构建时产生 | 阻断主站构建? |
|---|---|---|---|
| pull:content | 是(git clone content repo) | src/content/ | 是(无内容无法构建) |
| check-datasheets | 是(HEAD/GET Range 请求 assets CDN) | 无(只校验) | 是(404 阻断;403/5xx 报对应分类) |
| Pagefind 索引 | 否(扫 dist/ HTML) | dist/pagefind/ | 搜索启用:是(失败 = CI fail);禁用:不执行 |
| OG 图生成 | 否(satori 本地渲染) | dist/og/ | 否(降级为默认图,见 7.9 已知风险) |
| check:links | 否(--offline 扫 dist) | 无 | 是(本地死链阻断) |
| 构建元数据 | 否(读 git/env,失败 fallback 'unknown') | dist/build-meta.json | 否(warn,降级 'unknown') |

### 7.14 环境变量总表

见附录 C。

---

## 8. 部署与平台兼容性

### 8.1 兼容性目标

- MVP 不锁定单一平台,构建产物纯静态 `dist/`,任何静态托管都能部署
- 具体平台决策推迟到首次部署时,根据实际体验选定主平台
- 所有平台特定优化做成可选增强,不进核心路径

### 8.2 平台兼容性矩阵

| 平台 | 纯静态 | 自定义域 | HTTPS | 预览部署 | OAuth 代理同栈 | 备注 |
|---|---|---|---|---|---|---|
| Cloudflare Pages | ✅ | ✅ 免费 | ✅ | ✅ | ✅(Workers) | 推荐 MVP |
| Vercel | ✅ | ✅ 免费 | ✅ | ✅ | ✅(Edge) | 文档最全 |
| Netlify | ✅ | ✅ 免费 | ✅ | ✅ | ✅(Functions) | 见 deploy/netlify/README.md |
| GitHub Pages | ✅ | ✅ 免费 | ✅ | ❌ | ❌ | 功能最少 |

**平台细节移到各 README(P2-37)**:构建时间限制、国内可达性、具体资源配额、**Netlify GoTrue/内置 OAuth、免费额度、具体认证集成方式**等易变信息**不写死在核心 Spec**,移到 `deploy/{platform}/README.md` 维护。Spec 只保留"是否支持纯静态/自定义域/HTTPS/预览/OAuth 同栈"等不易变的兼容性维度。

### 8.3 构建输出配置

```js
// astro.config.mjs
output: 'static',
build: { format: 'directory', inlineStylesheets: 'auto' },
trailingSlash: 'always',
```

**`trailingSlash: 'always'` 纪律**:全站 URL 统一带尾斜杠;canonical/hreflang/sitemap/RSS/内部链接全部带尾斜杠;reviewer 检查一致性。

### 8.4 平台适配目录

`deploy/{platform}/` 提供各平台参考配置(README + 配置文件)。主仓根目录不放平台耦合文件。选定平台后把对应配置复制到根目录。

### 8.5 自定义 HTTP headers(CSP 等)

安全 headers 通过平台配置注入。**CSP 按实际启用的可插拔功能动态生成**,不写死第三方域——未启用的功能不进 CSP,避免多余暴露;自托管 Umami 时用环境变量注入域。

**CSP 实现方式(P2-38)**:本项目**暂不启用 Astro 内置 CSP 机制**,统一使用 `src/lib/seo.ts` 的 `buildCsp()` 自行生成(输出到平台 headers 或 GitHub Pages 的 `<meta>` fallback)。接手者不得同时启用两套 CSP 系统;若未来迁移到 Astro 内置 CSP,需在本节记录迁移说明并删除自实现。

#### CSP 生成逻辑

CSP 由 `src/lib/seo.ts` 的 `buildCsp()` 在构建时根据环境变量动态拼装,输出到平台的 `_headers`/`vercel.json`/`netlify.toml`(或构建时注入 `<meta http-equiv="Content-Security-Policy">`):

```js
// src/lib/seo.ts 伪代码
function buildCsp(): string {
  const scriptDomains = ["'self'", "'unsafe-inline'"];
  const connectDomains = ["'self'"];
  const frameDomains = [];
  const mediaDomains = ["'self'"];   // 音频文件 CDN

  // Giscus 启用时才加 giscus.app
  if (import.meta.env.PUBLIC_GISCUS_ENABLED === 'true') {
    scriptDomains.push('https://giscus.app');
    connectDomains.push('https://giscus.app');
    frameDomains.push('https://giscus.app');
  }

  // Umami 启用时才加 Umami 域(支持自托管)
  if (import.meta.env.PUBLIC_UMAMI_ENABLED === 'true') {
    const umamiUrl = new URL(import.meta.env.PUBLIC_UMAMI_SCRIPT_URL);
    const umamiOrigin = umamiUrl.origin;
    scriptDomains.push(umamiOrigin);
    connectDomains.push(umamiOrigin);
  }

  // 背景音乐启用时才加音频 CDN 域(jsDelivr/raw/assets)
  if (import.meta.env.PUBLIC_MUSIC_ENABLED === 'true') {
    // 音频文件托管 assets 仓,走 jsDelivr/raw CDN,与 datasheet 下载同源
    mediaDomains.push('https://cdn.jsdelivr.net', 'https://raw.githubusercontent.com');
  }

  return [
    `default-src 'self'`,
    `script-src ${scriptDomains.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `media-src ${mediaDomains.join(' ')}`,   // 音频 CDN,未启用音乐时仅 'self'
    `connect-src ${connectDomains.join(' ')}`,
    frameDomains.length ? `frame-src ${frameDomains.join(' ')}` : '',
    `manifest-src 'self'`,
    `object-src 'none'`,                     // P2-4:基础 hardening
    `base-uri 'self'`,
    supportsHeaders ? `frame-ancestors 'self'` : '',   // P2-4:仅 HTTP Header 平台支持
  ].filter(Boolean).join('; ');
}
```

#### 静态部分(所有站点都有)

```
default-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
media-src 'self';      // 默认仅 self,音乐启用时动态加 CDN
manifest-src 'self';
object-src 'none';     // P2-4:基础 hardening
base-uri 'self';       // P2-4:基础 hardening
// frame-ancestors 'self' 仅 HTTP Header 平台可用(meta CSP 不支持)
```

- `'unsafe-inline'` 因 Astro 内联脚本(防闪烁、enhancement 脚本)
- `img-src ... https:` 允许远程封面图;**未来 remote image 来源稳定后收紧为明确 CDN/domain 白名单(P2-5),MVP 保持兼容性**
- `media-src` 默认 `'self'`,音乐启用时动态加 jsDelivr/raw CDN(P0:外部 CDN 音频会被 CSP 拦截,必须加)

#### `/admin/` 独立 CSP(P0-13)

`/admin/` 的 Sveltia CMS 从 unpkg.com 加载脚本,而主站 CSP `script-src` 不含 unpkg.com——如果 `/admin/` 走同一站点 CSP,Sveltia 会直接被拦截无法启动。**必须分离管理,禁止为 Admin 把 `https://unpkg.com` 加进全站 CSP**:

- **主站 header CSP**:不包含 unpkg.com
- **路径隔离语义(P1-9)**:`/*` → 主站 CSP;**`/admin/*` → 不继承主站 CSP,使用 Admin 专用 CSP**。两种实现二选一,但都必须保证主站 CSP 不命中 `/admin/*`:
  - 平台路径级 header(如 Cloudflare `_headers` 对 `/admin/*`、Vercel headers 数组)——`/admin/*` 用 Admin CSP header,`/*` 用主站 CSP
  - 或在 `public/admin/index.html` 的 `<head>` 内写 `<meta http-equiv="Content-Security-Policy">`(仅当确认平台 header 不会命中 `/admin/*` 时;meta 只作用于该页面)
  - **禁止出现"主站 Header CSP + Admin Meta CSP 同时生效"的双 policy 叠加**(多个 CSP 是叠加限制不是覆盖,见 P1-7)
- reviewer 拦截:全站 CSP 出现 unpkg.com → 拦截(应只在 admin)

**`/admin/` CSP 完整模板(P2-24,写在 `public/admin/index.html` 的 `<head>`)**:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net;
  img-src 'self' data: blob: https:;
  font-src 'self' https://unpkg.com https://cdn.jsdelivr.net;
  connect-src 'self' https://api.github.com https://unpkg.com https://cdn.jsdelivr.net;
  frame-src 'self' https://unpkg.com;
  manifest-src 'self';
">
```

说明:`connect-src` 需放行 `https://api.github.com`(Sveltia 走 GitHub API)**与 `https://unpkg.com`(部分资源/locale 可能从 UNPKG 获取,P1-9)**;`https://cdn.jsdelivr.net`、`blob:`、`data:` 按当前 Sveltia 运行所需来源补齐(P1-8)。**此模板只作用于 `/admin/*`,主站 header CSP 保持不含 unpkg.com/cdn.jsdelivr.net**。**该模板是当前 Sveltia 版本(`0.197.2`)的 baseline,以实际运行结果 + 官方 CSP baseline 为准(P1-8/P2-19):升级 Sveltia 后必须用浏览器 DevTools 重新检查 CSP violation 并按需更新,不要当作永久固定模板;升级检查项至少覆盖 script/style/img/font/connect/frame/locale/PDF/Leaflet 等可选资源**。

#### 动态部分(按启用功能)

| 功能 | 启用条件 | CSP 追加 |
|---|---|---|
| Giscus | `PUBLIC_GISCUS_ENABLED === 'true'` | `script-src`/`connect-src`/`frame-src` 加 `https://giscus.app` |
| Umami(云) | `PUBLIC_UMAMI_ENABLED === 'true'` + script URL 是 cloud.umami.is | `script-src`/`connect-src` 加 `https://cloud.umami.is` |
| Umami(自托管) | `PUBLIC_UMAMI_ENABLED === 'true'` + script URL 是自托管域 | `script-src`/`connect-src` 加自托管域(从 `PUBLIC_UMAMI_SCRIPT_URL` 解析 origin) |
| 背景音乐 | `PUBLIC_MUSIC_ENABLED === 'true'` | `media-src` 加 `https://cdn.jsdelivr.net` + `https://raw.githubusercontent.com`(音频 CDN,与 datasheet 同源) |

**纪律**:
- **不写死第三方域**:CSP 由构建时环境变量动态生成,未启用的功能不进 CSP
- **自托管友好**:Umami 域从 `PUBLIC_UMAMI_SCRIPT_URL` 解析,云/自托管自动适配
- **部署时 CSP 更新**:启用/禁用可插拔功能后,重新构建生成新 CSP,部署平台配置同步更新
- **GitHub Pages 限制**:不支持自定义 headers(CSP/HSTS),接受此限制或选其他平台(GitHub Pages 时 CSP 走 `<meta http-equiv>` 注入,但受限)

#### CSP 生成与写入职责(明确分工)

```
buildCsp()                       // src/lib/seo.ts,构建时调用
  ↓ 读环境变量,动态拼装
CSP 字符串                        // 如 "default-src 'self'; script-src 'self' 'unsafe-inline' https://giscus.app; ..."
  ↓ 传递给
对应平台的 build/deploy script    // deploy/{platform}/ 下的脚本
  ↓ 写入
平台配置文件
  - Cloudflare Pages: dist/_headers
  - Vercel:          vercel.json (headers 段)
  - Netlify:         netlify.toml ([[headers]])
  - GitHub Pages:    无法设 HTTP header → fallback 到 <meta http-equiv>
```

**`<meta http-equiv="Content-Security-Policy">` 的定位**:
- **仅作为 fallback**,用于无法设置 HTTP header 的平台(主要是 GitHub Pages)
- **不叠加、不覆盖(P1-7)**:多个 CSP policy 不是"后者覆盖前者",而是**叠加限制**(交集中更严格的那份生效)——因此本项目**避免同时配置 HTTP Header CSP 与 Meta CSP**;能设置 Header 的平台只用 Header、不注入 Meta;只有无法设置 Header 的平台(如 GitHub Pages)才用 Meta
- 限制:`<meta>` CSP 不支持 `frame-ancestors`、`report-uri` 等部分指令,且无法设 `Strict-Transport-Security` 等其他安全 header
- 实现:GitHub Pages 场景下,`buildCsp()` 生成的字符串注入到 `BaseHead.astro` 的 `<meta http-equiv="Content-Security-Policy" content={csp} />`;其他平台走 HTTP header,不注入 meta(避免重复)

**职责纪律**:
- `src/lib/seo.ts` 只负责**生成 CSP 字符串**,不关心写入哪里
- `deploy/{platform}/` 的 build/deploy script 负责**把字符串写入平台配置文件**
- 平台选择决定写入方式:能设 HTTP header 的平台走 header(优先),不能的走 `<meta>` fallback
- reviewer 检查:`buildCsp()` 是否纯函数(只读环境变量,不副作用);写入逻辑是否在 deploy script 而非 lib

### 8.6 重定向与回退

- 根路径 `/`:方案 A 静态协商(见 6.7),无需平台规则
- 404:各平台用 `dist/404.html`(Netlify 需 netlify.toml 配置)
- **旧链接迁移(P1-4/P1-5/P0-3/P1-12/P1-13)**:**content repo 根 `redirects.json`**(pull 后 `src/content/redirects.json`)是 URL 迁移的**持久化真相源**(clean build 时旧路径已不存在,必须靠 manifest 记录);slug 修改与 manifest 登记**同属一个 content commit,不要求主仓提交**;构建/部署时由 deploy 脚本读取并写入平台 redirect 规则:
  - Cloudflare `_redirects` / Netlify `_redirects` / Vercel `vercel.json` → 原生 301
  - **GitHub Pages(无平台 redirect 配置,P1-12)**:旧 URL 生成**静态 redirect HTML**(`<meta http-equiv="refresh">` / JS `location.replace` fallback + `<link rel="canonical">` 指向新 URL);构建期由 deploy 脚本生成
  - **构建期 redirect 校验拆两阶段(P1-7)**:`validateRedirectManifest()`(content repo/构建前:JSON 格式、source/target 站内绝对路径、以 `/` 开头、trailingSlash 统一、target 非外部域名、`source != target`、A→B/B→A 环禁止、MVP 禁止 A→B→C 链)→ `validateGeneratedRoutes()`(main repo,astro build 生成路由后:`target ∈ generatedRoutes` 且 `source ∉ generatedRoutes`,否则 build fail)
  - 平台本身的历史重定向模板见 `deploy/{platform}/README.md`

**构建期集成(M4/P1-7)**:`src/scripts/generate-redirects.ts` 负责读取 `src/content/redirects.json` → 输出各平台规则(Cloudflare/Netlify `_redirects`、Vercel `vercel.json` redirects 段、GitHub Pages 静态 redirect HTML);**校验拆两阶段**:`validateRedirectManifest()`(content repo/构建前,格式与合法性)与 `validateGeneratedRoutes()`(**Astro build 生成路由之后、deploy 之前**执行,postbuild 内,先拿到 generatedRoutes 再校验 `target ∈ generatedRoutes` / `source ∉ generatedRoutes`)。

**保持纯静态路由(P2-3)**:URL 迁移统一走 `redirects.json` + 平台 redirect 规则(或 GitHub Pages 静态 redirect HTML),**不引入 `src/fetch.ts`/middleware/SSR 做运行时路由**——静态架构更简单可靠,未来也不改。

### 8.7 Sveltia CMS 提交触发重建

#### 方式 A:Git 集成 + Webhook(推荐 MVP)

content 仓库 GitHub Actions,推 content 后触发主站平台 Deploy Hook:

```yaml
# content 仓库 .github/workflows/trigger-rebuild.yml
on: { push: { branches: [main] } }
concurrency:                        # P1-16:仅去重本 trigger workflow(连续 CMS 提交时取消尚未跑完的 trigger job);已发出的 Deploy Hook 是否取消由托管平台决定
  group: production-build
  cancel-in-progress: true
jobs:
  trigger:
    runs-on: ubuntu-latest
    permissions:                    # P1-23:least-privilege
      contents: read
    steps:
      - run: curl -fsSL -X POST "$MAIN_SITE_DEPLOY_HOOK_URL"   # 不写死平台(P1-22):URL 由 secret 注入,Cloudflare/Vercel/Netlify 通用
        env:
          MAIN_SITE_DEPLOY_HOOK_URL: ${{ secrets.MAIN_SITE_DEPLOY_HOOK_URL }}
```

content repo 只负责"push → POST Deploy Hook",**不关心目标平台**(`MAIN_SITE_DEPLOY_HOOK_URL` 由主站平台面板生成并配为 content repo secret,见 附录 C)。

#### content 拉取策略(关键,已移除 submodule)

主仓**零内容文件**,无 submodule 指针需更新。生产构建命令统一为:`pnpm install && pnpm build`——`pnpm build` 的 `prebuild` 钩子自动跑 `pull:content`(git clone/pull content 仓最新 main 到 `src/content/`),再跑 `check-datasheets`,然后 astro build。

本地开发同理:`pnpm dev` 的 `predev` 钩子自动跑 `pull:content`。首次或手动刷新内容用 `pnpm pull:content`。

**与 submodule 机制的关键差异**:
- 主仓不再有 `.gitmodules`,不再需要 `git submodule update --init --recursive`
- content 仓库更新后,**主仓无需任何提交**(submodule 机制需要更新指针 commit)
- 构建平台只需配 `pnpm install && pnpm build`,构建时自动拉最新 content
- `CONTENT_REPO` 环境变量配置 content 仓库地址(默认 `YourUser/object920-content`,可在平台面板覆盖)
- 若 content 仓库为 private,构建平台需配 **`CONTENT_GITHUB_TOKEN`**(独立于 main repo 的 `GITHUB_TOKEN`)或 deploy key 有读权限(见 9.8 Fork PR 安全策略)

### 8.8 预览部署

- **MVP 预览 = dist-preview artifact(P1-9)**:trusted PR → 构建 → 上传 `dist-preview` artifact(**不是部署预览站**);真正的 Preview Deployment(Cloudflare/Vercel/Netlify)在**选定部署平台后**按 `deploy/{platform}/README.md` 实现——Agent 在 MVP 阶段**不要额外实现平台 Preview 集成**
- **private content + fork PR(P0-10/P1-23)**:外部 fork PR 拿不到 `CONTENT_GITHUB_TOKEN`(GitHub 自动将 fork PR 的 secrets 置空),因此 **fork PR 不拉 private content、不生成含内容的完整预览**,只跑 code/lint/test(见 9.8);同仓库 internal PR 与 main push 走完整构建 + 预览
- 预览站点 `noindex`:`PUBLIC_PREVIEW=true` 环境变量,BaseHead 读取注入 `<meta name="robots" content="noindex, nofollow">`
- 预览站点的 Sveltia/Giscus/Umami 用测试配置或禁用,避免污染生产数据

### 8.9 构建资源与超时

构建时间限制、资源配额等**不写死在 Spec**(以各平台官方当前限制为准,易变),移到 `deploy/{platform}/README.md`。潜在瓶颈:OG 图生成(增量缓解)、Pagefind 索引、astro:assets 图片优化。监控构建时间,超时则优化。`@resvg/resvg-js` 原生绑定平台细节见 7.9 节"已知风险"及部署文档。

### 8.10 域名与 HTTPS

平台自动 provision HTTPS。选 apex 或 www 其一作 canonical,另一个 301。HSTS 通过 headers 设(GitHub Pages 不支持)。

---

## 9. 错误处理、可访问性、测试与 CI 策略

### 9.1 错误处理总览

| 层 | 错误类型 | 处理策略 |
|---|---|---|
| 构建时 | schema 不符、datasheet 缺失、死链 | CI 阻断,本地清晰报错 |
| 运行时(可恢复) | Giscus/搜索/Umami 加载失败、图片失败 | 静默降级,备用 UI |
| 运行时(不可恢复) | 路由不存在、内容找不到 | 404 页 + 友好引导 |
| 外部依赖 | CDN/GitHub Raw/开往故障 | 多镜像备用、静默回退 |

**纪律**:任何运行时错误都不应白屏或崩溃,必须有降级 UI。可插拔功能失败时核心站点不受影响。

### 9.2 构建时错误处理

- **schema 校验**:Astro 内置 Zod,不符时构建失败报清晰错误;`astro check` 在 CI 跑
- **datasheet 校验**:`check-datasheets.ts` prebuild 跑,**状态码分类处理**(404 阻断/403 权限/429 退避重试/5xx CDN 故障,HEAD → GET Range 降级,见 7.5),错误含工程 slug/datasheet 名/镜像/状态码与分类
- **死链检查**:`lychee --offline` postbuild 跑,**只检查 HTML 内部链接**(`dist/**/*.html` 内的站内引用是否真实存在),不查外网(避免 CI 网络抖动误报)。**范围界定(P1-25)**:`check:links` 不是整个 `dist/` 的完整完整性验证——它不覆盖 sitemap.xml/RSS/manifest 等 XML 中的 URL;如需验证这些,分别增加 `check:sitemap`(URL 集合与生成数据一致)与 `check:rss`(feed 内链接可达),不要混在 `check:links` 描述里。**远程资源(封面 URL、source 链接、relatedLinks、开往)不作为 CI 阻断项**——远程可达性走定期手动检查或单独的非阻断定时任务,不在每 PR CI 里跑。CI 失败(本地死链)阻断合并

### 9.3 运行时错误处理(可恢复)

- **Giscus 失败**:`s.onerror` 显示"评论加载失败,刷新或前往 GitHub Discussions"(走 i18n),不再自动重试
- **搜索失败**:`provider.ready()` resolve false(初始化失败 → failed 状态)或 `search()` **抛 `SearchError`** 时,SearchBox try/catch 包裹,搜索框 disabled + 提示"搜索暂不可用,请用浏览器 Ctrl+F",console.warn。**`[]` 表示"无搜索结果",不触发降级 UI(P1-9)**;这与 Provider 无关——Pagefind 索引缺失、Orama 未实现、网络错误都走同一降级路径
- **Umami 失败**:静默 console.warn,无 UI(用户不应感知)
- **图片失败**:所有 `<img>` 加 `onerror` 替换占位图 `/images/image-broken.svg`(入仓),占位图有 alt
- **字体失败**:`font-display: swap` 已让浏览器用 fallback 系统字体,无白屏

### 9.4 运行时错误处理(不可恢复)

- **404**:自定义 404 页,走 i18n(**默认 zh + `navigator.languages` 客户端增强 + 页面内语言切换,不依赖 Referer**),友好文案 + 返回入口,`noindex`
- **内容被删**:MVP 不做 301 重定向(后期需要再加);删除前应考虑改 `draft: true` 而非真删
- **字典 key 缺失**:`t()` fallback 到 zh 再到 key 本身,不抛错

### 9.5 外部依赖故障

- **jsDelivr 故障**:主链接旁始终显示"备用"折叠(默认折叠),用户主链接失败时手动展开;不依赖 `onerror` 自动展开(浏览器对下载链接 error 处理不一致)
- **双镜像都失败**:显示"下载暂不可用,请稍后重试或前往 GitHub 仓库手动下载"(链接到 assets 仓库)
- **开往端点故障**:不在我们控制范围,MVP 直接 `<a href>` 让开往自己处理

### 9.6 可访问性(a11y)策略

#### 原则

1. 键盘可达:所有交互元素可用 Tab/Enter/Arrow/ESC 操作
2. 屏幕阅读器友好:语义化 HTML + ARIA + alt 文本
3. 颜色对比度:正文 ≥ 4.5:1,大文字 ≥ 3:1(WCAG AA)
4. 不依赖颜色传达信息:状态用图标+文字+颜色组合
5. 动效降级:`prefers-reduced-motion` 全站降级
6. 焦点可见:`:focus-visible` 全局样式

#### 实现清单

| 项 | 实现 |
|---|---|
| 语义化 HTML | `<nav>`/`<main>`/`<article>`/`<aside>`/`<footer>`/`<section>`/heading 层级正确 |
| 跳转链接 | BaseLayout 最顶部 `<a href="#main" class="skip-link">跳到主内容</a>`,视觉隐藏焦点时显形 |
| 图片 alt | **内容图片(cover/gallery/正文图)alt 必填且非空**(schema 与 Sveltia 均强制,`trim().min(1)`);**`alt=""` 仅限正文装饰性图片**;远程图 alt 用标题;占位图有 alt |
| 按钮 vs 链接 | 跳转用 `<a>`,动作用 `<button>`,不混用 |
| ARIA | 按实际交互模型决定(不滥用 dialog/progressbar) |
| 语言切换 | `<nav aria-label="语言切换">`,选项 `aria-current` |
| 暗色切换 | `aria-label` + `aria-pressed` |
| 移动菜单 | 抽屉是 disclosure 菜单(非 dialog):用 `aria-expanded`/`aria-controls`,焦点陷阱+ESC 关闭;仅当全屏遮罩阻断整页交互时才用 `role="dialog"` |
| TOC | `<nav aria-label="文章目录">`,heading 端 `tabindex="-1"` |
| 阅读进度 | 进度条无明确终点(页面高度动态),用 `role="status"` + `aria-live="polite"`(非 progressbar,progressbar 需已知 min/max);**无障碍文本仅在跨越 25%/50%/75%/100% 里程碑时更新,视觉条持续更新**(避免逐 1% 播报) |
| 代码复制 | `aria-label="复制代码"`,成功 `aria-live="polite"` 通知 |
| Lightbox | `role="dialog"` `aria-modal="true"`(遮罩阻断整页,真 dialog),ESC 关闭,焦点管理 |
| 番剧筛选 tab | `role="tablist"` `role="tab"` `aria-selected`,键盘左右切换 |
| 搜索框 | `<label>` 关联,`aria-live` 显示结果数 |

#### 验证

- MVP:人工键盘测试 + DevTools Accessibility 面板 + Lighthouse a11y 评分
- 后期:可选跑 axe-core / pa11y-ci 扫 dist
- 纪律:a11y 问题与功能 bug 同等优先级

### 9.7 测试策略

#### 测试分层

| 层 | 工具 | 范围 | MVP |
|---|---|---|---|
| 类型检查 | `astro check` + TypeScript | 全站类型 | 是(CI 必跑) |
| Lint | `eslint` + `prettier` | 代码风格 | 是(CI 必跑) |
| 死链检查 | `lychee` | 内部链接 | 是(CI 必跑) |
| schema 校验 | Astro Zod + `check-datasheets.ts` | 内容/datasheet | 是(CI 必跑) |
| 单元测试 | Vitest | `src/lib/` 关键函数 | 是 |
| 组件测试 | Vitest + @testing-library/astro | 关键组件渲染逻辑 | 后期 |
| E2E 测试 | Playwright | 关键用户流 | 后期 |
| a11y 测试 | axe-core / pa11y-ci | dist 静态扫 | 后期 |
| 视觉回归 | Playwright 截图对比 | 关键页面 | 后期 |

#### MVP 测试范围(必跑)

```json
"scripts": {
  "pull:content": "node src/scripts/pull-content.mjs",
  "predev": "node src/scripts/pull-content.mjs --if-missing",
  "prebuild": "node src/scripts/pull-content.mjs && node src/scripts/build-meta.mjs && pnpm run check:datasheets",  // P0-1:本地 build 非 destructive——FORCE_CONTENT_SYNC/git reset --hard 只由 CI 显式注入
  "dev": "astro dev",
  "build": "astro build",
  "postbuild": "pnpm run build-meta -- --dist && pnpm run search:index && pnpm run generate-og && pnpm run check:links && pnpm run check:sitemap && pnpm run check:rss",  // P0-2:完整链;search:index 失败 = CI fail;generate-og 内部 warn + exit 0
  "check": "astro check",
  "lint": "eslint . && prettier --check .",
  "test": "vitest run",
  "build-meta": "node src/scripts/build-meta.mjs",  // 默认生成 src/.build-meta.generated.json(prebuild,Footer 渲染读取);--dist 模式写 dist/build-meta.json(postbuild)
  "check:datasheets": "tsx src/scripts/check-datasheets.ts",
  "check:links": "lychee --offline --no-progress 'dist/**/*.html'",
  "check:sitemap": "tsx src/scripts/check-sitemap.ts",     // P1-19:校验 dist/sitemap.xml 与页面清单一致(依赖 dist)
  "check:rss": "tsx src/scripts/check-rss.ts",             // P1-19:校验 dist/rss/*.xml 链接一致(依赖 dist)
  "search:index": "node src/scripts/search-index.mjs",
  "generate-og": "tsx src/scripts/generate-og.ts",
  "ci": "pnpm run check && pnpm run lint && pnpm run test && pnpm run build"   // build 自动触发 postbuild(完整链),ci 不重复调用
}
```

**完整执行链(P0-2,Spec ↔ package.json ↔ CI 必须一致)**:`pnpm ci` → `check`(纯本地,不拉 content)→ `lint` → `test` → `build`[`prebuild(pull:content 非 destructive → build-meta 生成渲染元数据 → check:datasheets)` → `astro build` → `postbuild(build-meta --dist → search:index → generate-og → check:links → check:sitemap → check:rss)`]。`check` 保持纯本地不依赖 content 网络;search:index 仅 pagefind 启用时跑且失败 = CI fail;generate-og 失败 warn 降级默认图;check:sitemap/check:rss 依赖 dist 且在 postbuild 内执行(不是只写在 Spec 里)。

**Node / pnpm 版本声明(P2-12)**:`package.json` 声明 `engines` 与 `packageManager`,本地与 CI 使用同一版本,防漂移:

```json
{
  "engines": { "node": ">=22.12" },   // C1:Astro 7 要求 Node >= 22.12;<23 上限经 Node 24.20 实测移除(2026-09-06,第 11 轮)
  "packageManager": "pnpm@9.15.5"   // P0-3:必须写真实版本,package.json/lockfile/CI/本地 corepack 用同一版本,禁止 9.x.x 占位
}
```

**`pnpm check` 不依赖 content 的验收条件(P1-12/C3)**:设计目标是 `check` 纯本地不拉 content。**实现首周必须立即验证** `rm -rf src/content && pnpm check`(**不要等到后期**):
- **通过** → 保持 `check` 单命令,CI 按现状执行
- **不通过**(`glob` loader 目标目录缺失/`getCollection` 类型推断失败等)→ **必须拆分为 `check:code`(纯类型/lint,不依赖 content)与 `check:content`(需 content)**,CI 分别调用;或在 `src/content.config.ts` 为 dev/check 模式提供 empty/mock fallback(实现时二选一,并把结果写进本 Spec 的实现备注)

#### 单元测试范围(MVP)

针对 `src/lib/` 关键纯函数写 Vitest 单测:

| 函数 | 测试点 |
|---|---|
| `t(locale, key, params)` | key 命中、fallback 到 zh、key 不存在返回 key、params 插值 |
| `getLocalizedPath(pathname, locale)` | 各 locale 切换、defaultLocale、无 locale 前缀路径 |
| `getLocalizedEntryPath(entry, targetLocale)` | 经 translationKey 查目标 entry slug(不同 slug 场景)、无目标版本返回占位 URL |
| `getLocaleFromPath(pathname)` | 各 locale 提取、无 locale 返回 default |
| `resolveLocalizedEntry(collection, group, locale)` | render/placeholder/skip 三种模式、zh/en/ru/ja 各场景、article/project 共用、uiLocale vs contentLocale 区分、单语言合成组 |
| `deriveLocaleFromPath()` | 从 entry 路径推导 locale(zh/en 白名单、非法路径报错);frontmatter 已无 lang |
| `validateSlugs()` | 目录名合法(大小写/连字符/中文字符非法)、collection+locale 内唯一、重复报错 |
| `validateTranslationGroups()` | 同 collection+translationKey+locale 重复 → build fail;单语言合成组不误报 |
| `validateOgImageFields()` | `ogImage` 与 `ogImageLocal` 同时存在 → build fail;只设一个/都不设通过 |
| `buildOgImageUrl(imageMetadata, siteUrl)` | ImageMetadata → 绝对 URL 拼接(PUBLIC_SITE_URL + _astro 路径) |
| `buildDownloadUrls(datasheet)` | 三镜像构造、releaseTag 缺失抛错、mirror 数组顺序、`ref` 注入 URL |
| `formatDate(date, locale)` | 各 locale 格式、不同日期 |
| `buildHreflang(path, locales, baseUrl)` | 只输出 render 页 alternate、placeholder 不指向自己、x-default fallback(defaultLocale 无 render 时) |
| `buildSitemapEntries(pages, locales, baseUrl)` | 静态页 + render entry 进 sitemap、placeholder/noindex 排除、hreflang 标准码 |
| `updateGiscusTheme(theme)` | iframe 查找/postMessage/origin 校验/未加载等待 |
| `schema-contract.test.ts` | **限定范围(P2-13)**:检测字段名/必填性/基础类型/默认值/i18n 标记与 Zod schema 一致;不做 generator |
| `PagefindProvider lifecycle` | initialize → ready → search → destroy → reinitialize;**覆盖 zh → destroy → en → initialize → search 只返回 en(P2-17)** |
| `validateRedirectManifest()` / `validateGeneratedRoutes()` | 阶段一:格式/路径/环/链校验;阶段二:target∈routes、source∉routes(P1-7) |

#### 架构 fixture build(P2-32)

除纯函数单测外,**建立最小架构 fixture 并真正运行 `pnpm build`**,作为比"继续堆单测"更有价值的集成验证:

```text
fixture-content/
├── articles/
│   ├── zh/foo/index.md
│   ├── en/foo/index.md
│   └── zh/single/index.md
├── projects/
└── data/
```

**single-language 变体(P1-18)**:除上述组合外,至少覆盖四种内容形态——只有 zh / 只有 en / zh + en 双语 / zh 单语 + ru/ja placeholder,分别检查:route 是否生成、placeholder 的 URL slug 与 canonical、hreflang(正式页不指向 placeholder)、x-default(defaultLocale 缺失时 fallback)、sitemap 排除、noindex。

**URL migration fixture(P2-19)**:再增加一组"placeholder old slug → 正式 new slug"的 fixture,配合 **content repo 的 `redirects.json`** 验证:旧 URL 生成 301(平台规则输出)、新 URL canonical、hreflang 只指向新 render 页、sitemap 只含新 URL。

**dirty-content build safety test(P2-20)**:测试 `src/content/` 存在未提交修改时运行 `pnpm build`:**不得自动 `reset --hard`,文件必须仍然存在**,脚本应报错提示 commit/stash(或 `FORCE_CONTENT_SYNC=true` 显式覆盖)。该测试保护 Sveltia 本地编辑工作流不被未来脚本改动破坏。

验证:routes(正常页 + 占位页)、图片管线(`![Alt](./image.webp)` → `<figure><img src="/_astro/..." srcset>`)、sitemap(含 xhtml:link/lastmod)、hreflang、placeholder noindex、RSS、Pagefind 索引、OG 生成。该 fixture 同时充当 Markdown 图片管线的集成测试载体(见 7.2.2 P1-12)。

#### Astro 7 Router Compatibility Test(P1-3)

Astro 7 内部 routing pipeline 有变化,本项目大量依赖 ClientRouter/persist/page lifecycle——**实现首周必须在 Astro 7 下逐项实测**:

- [ ] page swap(普通页面切换,无白屏/死引用)
- [ ] music persist(`transition:persist` 下 `<audio>` 跨页保持,M5)
- [ ] giscus reload(destroy + mount,不重复加载脚本)
- [ ] pagefind destroy/reinit(locale 切换后只返回新语言结果)
- [ ] theme state(localStorage + data-theme 跨导航一致)
- [ ] lightbox(全局实例 + 事件委托,导航后仍可用)

#### 测试纪律

- 单测只测纯函数(`src/lib/`),不测组件渲染(后期上)
- 测试与代码同 PR:新增/修改 `src/lib/` 函数必须同步更新测试
- 测试不依赖网络:datasheet 校验测试用 mock fetch
- CI 失败阻断合并
- 覆盖率不强制(MVP),追关键函数覆盖

#### 后期测试路线

MVP(类型+lint+单测+死链+schema+datasheets) → 稳定期(加组件测试) → 成长期(加 E2E Playwright) → 成熟期(加 a11y axe-core + 视觉回归)

### 9.8 CI 策略

本地精简为单一入口 `pnpm ci`(各步骤的 pre/post 钩子自包含);**CI workflow 为了 P1-6 的 secret 边界拆成两个步骤**——`code checks`(无 secret,所有事件都跑)与 `build`(trusted 上下文,secret 只在此注入),执行的是与 `pnpm ci` 完全相同的脚本链:

```yaml
# .github/workflows/ci.yml
name: CI
on:                                 # P1-15:push 只监听 main,feature branch 不消耗完整构建资源
  push:
    branches: [main]
  pull_request:
jobs:
  ci:
    runs-on: ubuntu-latest
    permissions:                    # P1-23:least-privilege,默认不给 write
      contents: read
    steps:
      - uses: actions/checkout@v4            # 只 checkout 主仓,无 submodule
      - uses: pnpm/action-setup@v3
        with: { version: 9.15.5 }            # P0-3:与 packageManager 完全一致
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }   # C1:Astro 7 要求 Node >= 22.12;22.x 最新 LTS 满足
      - run: pnpm install --frozen-lockfile
      - name: Code checks (all events, no secret)
        run: pnpm check && pnpm lint && pnpm test
      - name: Build (trusted PR / main; needs content token)
        if: >-
          github.event_name == 'push' ||
          (github.event_name == 'pull_request' &&
           github.event.pull_request.head.repo.full_name == github.repository)
        run: pnpm build                      # P1-6:token 只暴露给 build 步骤;postbuild 自动执行完整链(build-meta/search/og/links/sitemap/rss)
        env:
          CONTENT_REPO: ${{ secrets.CONTENT_REPO || 'YourUser/object920-content' }}
          CONTENT_GITHUB_TOKEN: ${{ secrets.CONTENT_GITHUB_TOKEN }}   # 仅 trusted build 步骤注入;check/lint/test 无此 secret
          FORCE_CONTENT_SYNC: 'true'         # P0-1:强制同步只在 CI 注入,本地 pnpm build 默认非 destructive
          PUBLIC_SEARCH_ENABLED: 'true'      # P1-14:显式注入,保证 CI 与本地 search 配置确定一致(不依赖未设置的环境变量)
          PUBLIC_SEARCH_PROVIDER: 'pagefind'
      - uses: actions/upload-artifact@v4
        if: >-
          github.event_name == 'pull_request' &&
          github.event.pull_request.head.repo.full_name == github.repository
        with: { name: dist-preview, path: dist/ }   # dist-preview artifact ≠ 部署预览站(见 8.8 P1-9)
```

**CI 实际执行链(P0-2)**:`check → lint → test`(**无 secret**)→ `build`(trusted 步骤,注入 `CONTENT_GITHUB_TOKEN` + `FORCE_CONTENT_SYNC=true`)→ prebuild(强制同步 pull → build-meta 渲染元数据 → datasheets)→ astro build → postbuild(build-meta --dist → search:index → generate-og → check:links → check:sitemap → check:rss)。本地 `pnpm ci` 与 CI workflow 执行同一脚本链,Spec ↔ package.json ↔ workflow 三者一致。

**event 条件说明(P0-7)**:workflow 同时监听 `pull_request` 与 `push`,而 `github.event.pull_request.*` 在 push 事件中**不存在**;因此所有 fork 判断必须先检查 `github.event_name == 'pull_request'`,不能裸用 `github.event.pull_request.head.repo.full_name`(push 事件中该表达式求值异常)。

**Private content + Fork PR 安全策略(P0-10)**:main repo public + content repo private 时,`CONTENT_GITHUB_TOKEN` 只允许出现在 **trusted 上下文**(同仓库 internal PR 与 main push)。外部 fork PR 拿不到该 secret(GitHub 自动将 fork PR 的 secrets 置空),CI 按上述条件**只跑 code/lint/test,不拉 private content、不生成完整预览**。绝不允许为了给 fork PR 开预览而把 content 仓库改 public、或在可被 fork 触发的步骤里注入 token。

**Artifact 的 private content 边界(P1-17)**:internal PR / main 构建产生的 `dist-preview` artifact **包含 private content 渲染结果,不得公开分享或发布**;fork PR 不产生此类 artifact(按上述 `if` 条件跳过 upload)。如需对外展示预览,只能来自 public content 场景或脱敏后的独立预览构建。

**纪律**:trusted PR/main 必跑 CI 全链通过才能合并;fork PR 只跑 code/lint/test(无 secret);**code checks 步骤不注入任何 secret,`CONTENT_GITHUB_TOKEN` 只存在于 build 步骤 env(P1-6)**;`FORCE_CONTENT_SYNC=true` 只在 CI build 注入(本地 build 非 destructive,P0-1);`frozen-lockfile` 防依赖漂移;Node 22 LTS 与 `engines` 一致、pnpm 9.15.5 与 `packageManager` 一致;cache pnpm 加速;`actions/checkout` 不需要 `submodules: recursive`。

### 9.9 content 仓库职责(方案 A:内容 + 内容元数据仓库,不跑 schema CI)

**职责定义**:
- **content repo = 内容 + 内容元数据仓库(P1-14)**:存内容文件(Markdown/JSON/图片)**与内容元数据(`redirects.json` URL migration manifest)**,不存代码、不存 schema、不跑 schema 校验 CI
- **main repo = 内容解释器**:持有 `src/content.config.ts`(schema 唯一真相源),构建时 `pull:content` 拉数据 → Astro Content Layer 加载 → Zod schema 校验 → build

**slug → redirect 一致性自动化(P1-4/P1-15)**:content repo 的 GitHub Actions 增加**轻量校验步骤**(不跑 schema):

```text
content commit
  ↓ 检测 URL 变化(不依赖 Git rename 启发式,P1-3:综合对比旧/新 entry 的 _slug、translationKey、entry path、目录)
  ↓ 存在 URL 变化时,检查 redirects.json 是否登记了对应旧 → 新 映射
  ↓ placeholder → 正式翻译:新增某语言版本且新 slug ≠ 原 placeholder slug → 必须登记旧 placeholder URL 的 redirect(P1-4)
  ↓ 缺少对应 redirect → fail → 不触发 Deploy Hook
  ↓ 通过 → 触发主站 Deploy Hook
```

将"记得改 redirects.json"从纪律变成**自动约束**;content repo 复用 main repo 提供的 `validateRedirectManifest()`(以 reusable workflow 或独立轻量脚本方式引用,不复制 schema;**reusable workflow 必须 pin 到 tag/commit,不永久引用 main,P2-6**);`validateGeneratedRoutes()` 由 main repo 构建时执行(P1-7)。

**content repo workflow 示例(第九轮可实施性补充)**:

```yaml
# content 仓库 .github/workflows/validate-redirects.yml
name: validate-redirects
on: [push]
permissions: { contents: read }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 2 }           # 需要上一 commit 做 URL 变化检测(P1-3)
      - uses: your-user/object920/.github/workflows/validate-redirects.yml@v1   # reusable workflow,pin tag/commit(P2-6)
        with:
          redirects_path: redirects.json
      # 通过后由 trigger-rebuild.yml 触发 Deploy Hook(见 8.7)
```

**slug migration 实际操作流程(P1-15,分两种操作)**:

| 操作 | 流程 |
|---|---|
| 普通内容修改 | Sveltia 编辑 → 直接 commit main → Deploy Hook(无 URL 变化) |
| URL migration | 修改 `_slug` → 更新 `redirects.json` → **同一个 content commit** → content CI 校验通过 → Deploy Hook → 301 |

**工作流**:
```
Sveltia 编辑 → 提交到 content repo main 分支(simple 工作流)
  → content repo GitHub Actions 触发主站平台 Deploy Hook
  → 主站重建:pnpm install && pnpm build
    → prebuild: pull:content(git clone/pull 最新 content)→ check-datasheets
    → astro build: Content Layer 加载 src/content/ → Zod schema 校验 → 渲染
    → postbuild: build-meta --dist + pagefind + generate-og + check:links + check:sitemap + check:rss
```

**schema 校验时机**:在主站构建时由 Astro Zod 完成(content Layer 加载阶段)。content repo **不跑独立 schema CI**——Sveltia 字段 widget 配置提供编辑时的第一道防线(字段类型/必填约束),Zod 在构建时做最终验证。

**失败处理**:若 content 提交不符合 schema,主站构建失败 → 部署平台通知 → 修复 content 后重新触发重建。content repo 本身不阻断。

**纪律**:content repo 不复制 schema、不跑 validate-content;schema 唯一真相源在主仓 `src/content.config.ts`;content repo 的 GitHub Actions 只做两件事:**① 轻量 slug→redirect 一致性校验(见上,P1-4) ② 通过后触发主站 Deploy Hook**。

**content PR 校验入口(P1-5,可选增强)**:content repo 不跑独立 schema CI,但可在 content repo 配一个**调用 main repo workflow**的入口——content repo PR 触发 main repo 的 `validate-content.yml` reusable workflow,该 workflow 在 main repo 上下文跑 `pull:content` + `astro check`(用 main repo 的 schema 校验 content)。这样 content PR 在合并前能被 schema 校验,且 schema 仍只在 main repo 维护(不复制)。MVP 可不配,simple 工作流直接提交 main 触发重建,失败再修;后期协作时加此入口。

### 9.10 监控与告警

MVP 不上自动化告警,依赖 GitHub Actions 与部署平台默认通知(构建/部署失败邮件)。后期再加 UptimeRobot 与 CI Lighthouse。

### 9.11 文档体系

| 文档 | 内容 | 位置 |
|---|---|---|
| README.md | 项目简介、快速开始、环境变量、本地 Sveltia、内容编辑、构建部署、项目结构、i18n、测试、常见问题、授权 | 主仓 |
| CONTRIBUTING.md | 内容贡献流程、Sveltia 使用、双语配对、datasheet 上传、图片规范、代码贡献、风格纪律 | 主仓 |
| spec(本文档) | 设计文档 | 主仓 docs/ |
| deploy/{platform}/README.md | 各平台部署步骤 | 主仓 deploy/ |
| assets 仓 README | 用途、文件规范 | assets 仓 |
| content 仓 README | 结构、Sveltia 编辑、备份流程 | content 仓 |

---

## 附录 A:前期决策总览

| 维度 | 决策 |
|---|---|
| 框架 | Astro 7.x(2026-06-22 发布),纯静态 SSG,Content Layer API(glob/file loader);显式 `processor: unified()` 保留 remark/rehype(C1) |
| 内容管理 | Sveltia CMS 全托管(folder collection 管文章/工程,file collection 管番剧/术曲/友链 JSON);`folder`/`file` 路径相对 content repo 根;config.yml 兼容 Decap 格式,OAuth 代理用 sveltia-cms-auth |
| 内容仓库 | content 独立仓库 = **内容 + 内容元数据仓库**(含 redirects.json)+ 构建时 `git clone --depth 1` 动态拉取(非 submodule);主仓零内容文件,内容更新无需主仓提交指针 |
| 样式 | 三层:tokens.css 用 `@theme` 指令定义 token(Tailwind v4 自动生成 utility)/ scoped `<style>`+CSS Modules(华丽动效)。阈值 >100 行外置,视觉区块独立可理解才拆子组件。无 tailwind.config.mjs |
| vanilla enhancement | 零 React/Vue 运行时,Giscus 原生嵌入,搜索走 SearchProvider 接口,其余为 vanilla JS 客户端增强(启用 ClientRouter 后遵循 5.20 生命周期) |
| i18n | Astro 内置,UI 中英先行俄日空壳后期补,文章双语渐进(无 translationKey 走合成组),未翻译走占位页+跳转中文版,hreflang+canonical 配齐,自定义 sitemap |
| 首页 | 静态大图 + 轻量 CSS/Canvas 动效叠加,prefers-reduced-motion 降级 |
| 图片 | astro:assets 优化 + unified processor(remark/rehype)增强 Markdown 图片为 figure/caption/lightbox;entry-relative media;JSON collection 仅远程 URL;ogImage 三选一 |
| 字体 | 中文系统栈,西文自托管 Inter subset(比例)+ JetBrains Mono subset(等宽),双轨独立含 CJK 回退 |
| 搜索 | 可插拔 SearchProvider 架构,MVP 默认 Pagefind;Search UI 只依赖接口,Provider 可替换;只索引 Article/Project 详情页;locale 由语言索引承担,Provider 不二次过滤;中文分词先默认后期优化 |
| 评论 | Giscus,可插拔,加载失败降级提示;**独立 public discussions 仓(与 content 仓解耦)**;主题经 updateGiscusTheme() 跟随站点 |
| 友链页 | 友链 + 留言(Giscus)+ 开往跳转(可插拔) |
| 工程下载 | 专用 assets 仓库 + jsDelivr 主(小文件)/ raw 备双链接,大文件走 Release;历史资料 pin `ref`(tag/commit);构建时按状态码分类 + 镜像容错(至少一镜像可用)校验 |
| 分析 | Umami 可插拔模块,环境变量开关 |
| 开往 | 可插拔 Integration(`PUBLIC_TRAVELLINGS_ENABLED`),默认开 |
| 背景音乐 | 可插拔 MusicPlayer 架构(`PUBLIC_MUSIC_ENABLED`,默认关);MVP 默认不播放,用户点击控件才播;MusicHost 常驻 persistent 容器,HtmlAudioProvider 只绑定不创建;歌单放主仓配置;音频托管 assets 仓 |
| 环境变量 | 平台环境变量 + 本地 .env,.env.example 入仓 |
| 部署 | 兼容多平台,纯静态,具体平台后期定,deploy/ 目录隔离平台配置 |
| Sveltia 本地 | File System Access API(Chromium 浏览器,零代理,零 OAuth);生产 MVP 用 Access Token,多用户可选 sveltia-cms-auth |
| Sveltia admin 位置 | `public/admin/`(静态文件,不被 Astro 处理),非 `src/pages/admin/` |
| 附加功能 | RSS 每语言一 feed / 暗色切换 / SEO meta + sitemap / TOC + 阅读进度 / 代码高亮+复制 / 图片懒加载+lightbox / 标签分类+归档 / 404 / 死链检查 CI / a11y 基础 / OG 图自动生成(satori) |
| 番剧状态 | finished(看完)/watching(在看)/planned(想看)/dropped(弃坑),单选筛选,默认"全部" |
| 工作流 | MVP `simple`(直接提交 main 触发重建);如果 Sveltia 后续正式支持 editorial workflow 且有协作需求,再评估启用 |

---

## 附录 B:全局 reviewer 检查清单汇总

### 样式相关(第 3 节)
- [ ] scoped CSS 是否硬编码了 token 已定义的维度(颜色/间距/字号/圆角/阴影/动效)→ 拦截
- [ ] 外置 CSS 是否用 `.module.css`(CSS Modules)保持作用域 → 拦截裸全局 CSS
- [ ] scoped `<style>` 是否 > 100 行未外置
- [ ] keyframes 是否复用 > 2 处却未抽到 `animations.css`
- [ ] 动画是否使用 `var(--motion-scale)` 形式 → 确保 `prefers-reduced-motion` 可降级
- [ ] `@theme` 块变量名是否用了正确的 Tailwind v4 命名空间(`--text-*` 非 `--font-size-*`、`--leading-*` 非 `--line-height-*`)→ 拦截错误前缀
- [ ] `--duration-*` 是否误放进 `@theme`(应放 `:root` 内部 token,Tailwind v4 无此 namespace)→ 拦截
- [ ] token 示例/注释中是否残留 `--duration-base → duration-base` 这类错误写法(应为 `:root` 内部 token + `duration-150` 直接值)
- [ ] `@theme` 里引用其他 CSS variable 时是否用 `@theme inline` → 拦截间接引用未用 inline
- [ ] `@theme` 块变量名是否与 scoped CSS `var(--*)` 引用一致 → 拦截不一致
- [ ] 代码块是否误用了 `--font-sans` → 拦截
- [ ] 等宽字体栈是否缺失 CJK 回退 → 拦截
- [ ] `@font-face` 是否设了 `font-display: swap` → 拦截 FOIT
- [ ] 是否只 preload 了 Inter normal,过度 preload 等宽字体 → 拦截
- [ ] `@tailwindcss/typography` 是否使用 **Tailwind v4 兼容版本**(不是 `^0.5.x` 默认,m2)

### 内容数据模型相关(第 4 节)
- [ ] Sveltia `config.yml` 字段与 Astro Zod schema 是否一一对应(字段名、类型、可选性、默认值)
- [ ] Sveltia `folder`/`file` 路径是否**相对 content repo 根**(`folder: "articles"`/`file: "data/anime.json"`)→ 拦截把主仓的 `src/content/` 写进 Sveltia config 的实现错误
- [ ] i18n 字段标记是否一致(`i18n: true` vs `i18n: duplicate`)
- [ ] 新增 collection 时是否同步两边
- [ ] frontmatter 是否残留 `slug` 字段(已删除;slug 唯一来源 = entry 目录名)→ 拦截目录与 frontmatter 双真相
- [ ] **slug 修改 = URL 修改**是否同步登记 **content repo `redirects.json`**(301,与 slug 修改同 commit,不要求主仓提交);title 修改是否**不**触发 URL 变化(P1-5/P0-3)
- [ ] 同一 translationKey 的两语言是否允许不同 slug(`getLocalizedEntryPath()` 按 key 查目标 slug,不假设同 slug)(P2-15)
- [ ] Sveltia 是否使用稳定 `_slug` 机制(**`_slug` 为 fields 中显式声明的字符串字段**,slug 模板 `{{fields._slug | default(title) | localize}}`,Astro schema 不声明它,C2);`i18n.canonical_slug.key = translationKey`(不另造 `_canonicalSlug`);`_slug` 是否仅 ASCII 小写+连字符,不依赖中文标题自动生成(C2/P1-4/P2-16)
- [ ] glob loader 是否显式定义 `generateId`(`{locale}/{slug}`)且**不重复 `path.relative()`(entry 已相对 base)**,不把 `entry.id` 当 slug 使用
- [ ] 构建期校验函数是否启用:deriveLocaleFromPath(路径推导 locale)/validateSlugs(合法+**unique(collection, locale, slug)**)/validateTranslationGroups(同 key+locale 唯一)/validateOgImageFields(ogImage 互斥)
- [ ] frontmatter 是否**已删除 `lang` 字段**(locale 由目录唯一推导,deriveLocaleFromPath;Sveltia 新建内容不会因 lang 缺失失败)(P0-2)
- [ ] JSON collection 的 `file()` loader 是否配了 `parser: (text) => JSON.parse(text).items`(file() 支持顶层数组**或以 id 为 key 的对象**;本项目用 Sveltia `{ items: [...] }` → parser → items[] 桥接,P2-17)→ 拦截缺 parser 的配置
- [ ] JSON collection 每个 item 是否有 `id` 字段(file() 不自动生成 id)→ 拦截缺 id
- [ ] `draft: true` 文章是否在 prod 构建被过滤、dev 显示
- [ ] `translationKey` 配对的文章是否两端都设了同样 key;无 translationKey 的 entry 是否用 `single:${entry.id}` 合成组(不被 getStaticPaths 漏掉)
- [ ] Sveltia 中是否显式声明 `translationKey` 业务字段(`widget: string, required: false, i18n: duplicate`,zh/en 相同)(P1-10)
- [ ] 三类 identity 是否明确:`_slug`(当前语言 URL slug,显式字段)/`translationKey`(Object920 跨语言 identity **兼作 Sveltia canonical_slug key**)/`redirects.json`(历史迁移)(C2)
- [ ] 数据手册 `filename` 是否对应 assets 仓真实文件(脚本校验)
- [ ] 远程封面/外链可达性**不**作为 CI 阻断项(`lychee --offline` 只查本地链接;远程走定期手动检查)
- [ ] 图片是否采用 entry-relative media(folder collection 的 `media_folder: ""` + `public_folder: ""`,frontmatter `cover: "./cover.webp"`)→ 拦截 `images/articles` / `src/content/images` 全局图片目录残留
- [ ] articles/projects 是否使用 `{locale}/{slug}/index.md` 结构(与 Sveltia multiple_folders 一致),不出现扁平 `projects/*.md` 与 locale 子目录并存
- [ ] JSON collection 是否残留 `coverLocal`/`avatarLocal` 字段(禁止;JSON 只存远程 URL)
- [ ] frontmatter 是否**禁止出现 `lang` 字段**;locale 是否只由目录经 `deriveLocaleFromPath()` 推导(P1-11,旧"目录 locale == lang"规则已删除)
- [ ] Article/Project 的 `ogImage` 是否统一(远程 URL `ogImage` + 本地 `ogImageLocal` + 自动生成三选一),不再 Article=image()/Project=string 混用
- [ ] `coverAlt`/`gallery.alt` 是否必填且**非空**(`trim().min(1)`;`alt=""` 仅限正文装饰图)→ 拦截可选 schema + checklist 强制 alt 的矛盾(P1-12)
- [ ] Article/Project `cover`/`gallery` 是否只允许本地 entry-relative 图(远程封面只存在于 JSON collection)(P1-11)

### 页面与组件相关(第 5 节)
- [ ] 页面文件是否超 ~60 行(超了该抽组件)
- [ ] vanilla enhancement 脚本是否超 ~80 行(软阈值)且未考虑外置(触发因素:复用性/可测试性/生命周期复杂度/独立职责)
- [ ] 组件依赖是否单向无循环
- [ ] 领域叶子组件是否互相 import(禁止;页面/聚合层如 HomeSections 可组合多领域,不算违规)
- [ ] `common/` 是否放了业务语义组件(禁止;只放无业务语义的通用 primitives)
- [ ] SearchBox 是否位于 `integrations/search/`(非 `common/`;它是 Search Integration UI,不是 primitive)
- [ ] Comments 是否位于 `integrations/comments/`(非 analytics/);image.ts 职责是否限定为图片辅助(不变成"万能 image helper")
- [ ] 可插拔组件是否被核心 import(禁止反向)
- [ ] lightbox 是否走全局实例派发事件(而非每图自挂)
- [ ] 番剧 StatusFilter 是否单选(不可复选)、默认"全部"、URL query 同步
- [ ] StatusFilter 的 URL 同步是否用 `history.replaceState()`(不触发 ClientRouter/page-load 全生命周期)
- [ ] 暗色切换防闪烁脚本是否在 BaseHead 最早位置且 `is:inline`
- [ ] a11y 基础是否齐全(alt/aria/焦点/键盘)
- [ ] `prefers-reduced-motion` 降级是否"真正停止"(CSS 无限动画用 `animation: none`,JS/Canvas raf 循环用条件取消)而非只缩 duration → 拦截只缩时长不停止的降级
- [ ] hover/入场动效是否引用 token 时长与缓动
- [ ] 远程封面是否走 `<img loading="lazy">` 而非 astro:assets
- [ ] 本地图是否走 astro:assets 优化管线
- [ ] Hero 首屏大图是否用 `<Image fetchpriority="high">` + object-fit 铺满(不用 CSS background-image 承载,background-image 无法用 fetchpriority)
- [ ] 内容详情页语言切换是否基于 `translationKey` 查目标 entry slug(`getLocalizedEntryPath()`),而非 `pathname.replace(locale)` → 拦截语言切换漏页
- [ ] placeholder URL 是否使用已有语言 entry 的 slug(无额外前缀);placeholder→正式 URL 的 301 是否由 **content repo `redirects.json`** 驱动(不依赖"构建期自动发现历史占位")(P1-4)
- [ ] placeholder 页是否 `<html lang={uiLocale}>` + `<article lang={contentLocale}>`(页面 UI 与实际内容语言分别标注)(P1-6)
- [ ] ReadingProgress 无障碍文本是否仅每 25% 里程碑更新(视觉条可实时)→ 拦截逐 1% aria-live
- [ ] enhancement 是否都挂在 `astro:page-load` 等生命周期事件(页面级每次重建/全局 singleton 一次/persisted 不重复绑定)→ 拦截依赖整页加载执行的裸 `<script>`
- [ ] MusicPlayer 跨页面播放是否依赖 ClientRouter + `transition:persist` + singleton → 拦截"无 View Transitions 也跨页保持"的过时描述
- [ ] MusicHost 是否在**音乐启用时**由 BaseLayout 渲染(所有页面都有此节点);`HtmlAudioProvider` 是否只绑定外部 audio 元素(不自己创建 persistent DOM)
- [ ] MusicHost 是否**仅音乐启用时渲染**(禁用时零 DOM,不残留空 persistent 容器);`createMusicProvider(audioElement)` 构造注入 audio,`initialize()` 无参(接口/实现/调用三方一致)
- [ ] 音乐媒体状态是否以 `HTMLAudioElement` 为唯一真相源(isPlaying/volume/currentTime/paused/duration),singleton 不维护第二份独立状态(P1-11)
- [ ] MobileNav 的 ARIA 是否与 9.6 统一(默认 disclosure:aria-expanded/aria-controls;仅全屏阻断才 dialog)→ 拦截两处矛盾
- [ ] Markdown 图片/代码块是否统一 rehype + client 单模型,不残留无调用路径的 `ArticleImage.astro`/`CodeBlock.astro`

### i18n 相关(第 6 节)
- [ ] `zh.ts` 字典是否覆盖所有 key(真相源)
- [ ] 新增字典 key 是否同步到所有 locale 文件(至少空壳)
- [ ] `t()` fallback 是否正确(缺失 key 回 zh)
- [ ] 文章 `translationKey` 配对是否两端一致
- [ ] `translationKey` 是否 `trim().min(1)`(不允许空串/纯空格,opaque identifier 不解析格式)(P2-13)
- [ ] 单语言 entry(无 translationKey)是否用 `single:${entry.id}` 合成组参与 locale 遍历,不被 getStaticPaths 漏掉
- [ ] 占位页是否 `noindex, follow`
- [ ] hreflang 是否覆盖所有 locale + x-default
- [ ] 正式页 hreflang 是否**只指向实际 render 页面**(不输出指向 placeholder 的 alternate);placeholder 自身 hreflang 仅指向 render 页
- [ ] x-default 是否 defaultLocale 有 render 时指向 zh;无 render 时 fallback 到实际存在的 render locale
- [ ] sitemap 是否由自定义端点生成,且 URL/hreflang/canonical/noindex 全部来自同一页面清单数据源(`resolveLocalizedEntry()` + 静态页清单)→ 拦截"filter 读不到 metadata"的旧方案
- [ ] 占位页/404/admin/根路径协商页/noindex 页面是否排除出 sitemap
- [ ] sitemap 的 hreflang 是否用标准代码(`zh-CN` 而非 `zh`)+ x-default
- [ ] sitemap 是否声明 `xmlns`/`xmlns:xhtml` 并输出 `<xhtml:link rel="alternate" hreflang>`(只出 `<loc>` 视为不完整);`<lastmod>` 是否用 updatedDate ?? pubDate(纯导航页不输出,**禁止 buildTime 当 lastmod**)
- [ ] robots.txt 是否声明 `Sitemap: {PUBLIC_SITE_URL}/sitemap.xml`
- [ ] canonical 是否指向当前 locale URL
- [ ] 根路径 `/` 协商是否走方案 A(客户端 JS 协商 + `<noscript>` 内 meta refresh 兜底,两者不同时常驻)→ 拦截 meta refresh 与 JS 并存的竞速
- [ ] 根路径 `/` 是否 `noindex, follow`(语言协商页,避免 SEO 重复入口)(P1-13)
- [ ] RSS 是否每 locale 一个,过滤 draft
- [ ] 日期格式化是否走 Intl,不硬编码格式
- [ ] 字典 key 命名是否遵循 `<scope>.<item>[.<sub>]`
- [ ] 静态页(about/friends/collection 等)sitemap `lastmod` 是否来自 `src/config/static-pages.ts` 的 staticPageMeta(非 buildTime)(P1-14)

### 集成相关(第 7 节)
- [ ] 可插拔组件关闭时是否零 DOM 输出
- [ ] 可插拔组件是否被核心反向 import
- [ ] Giscus 主题是否跟随站点 data-theme(初始取当前主题,`theme-change` 事件同步),而非仅 `preferred_color_scheme`;语言是否跟随 locale
- [ ] Giscus 主题同步是否统一走 `updateGiscusTheme()`(iframe/postMessage/origin/未加载/重建),不散落 postMessage
- [ ] Giscus script 是否 singleton 只加载一次,导航时 destroy + mount widget(不重复加载脚本)(P1-10)
- [ ] assets 仓库是否明确为 **public**(继续用 jsDelivr/raw 的前提;与 content repo 可 private 区分)(P1-7)
- [ ] `PUBLIC_GISCUS_REPO` 是否指向 **public 独立 discussions 仓**(与 `CONTENT_REPO` 完全解耦)→ 拦截 Giscus 指向 private content 仓
- [ ] Giscus `mapping = pathname` 是否明确为"按语言独立评论"的有意设计(如需共享评论才改用 translationKey mapping)
- [ ] Giscus 文章评论与留言板是否用不同 category
- [ ] assets 下载是否走双镜像、releaseTag 是否在 release 镜像时必填;**历史资料(数据手册)是否 pin `ref`(tag/commit)而非一律 `@main`**
- [ ] `check-datasheets` 脚本是否在 prebuild/CI 跑;是否区分状态码(404/403/429/5xx)并 HEAD → GET Range 降级;**是否按镜像容错策略判定(至少一镜像可用通过;全部 404 才 fail;primary 失效 fallback 可用 → warn)**
- [ ] `check-datasheets` 是否带并发控制(p-limit 3-5)与超时(单 URL 10s/整体 60s)(M3)
- [ ] assets 仓库是否不用 LFS
- [ ] 开往禁用(`PUBLIC_TRAVELLINGS_ENABLED=false`)时友链页是否不渲染开往入口(零 DOM)
- [ ] 搜索禁用(`PUBLIC_SEARCH_ENABLED=false`)时 SearchBox 是否零 DOM、postbuild 是否跳过 search:index → 拦截未关闭的构建依赖
- [ ] SearchBox 是否直接 import 具体 Provider(禁止)→ 必须只 import `createSearchProvider` + `SearchProvider` 接口类型
- [ ] Provider 是否用纯 `.ts`(非 `.astro`)→ 拦截 Provider 用组件文件
- [ ] SearchProvider 接口是否用 `initialize()/ready()` 异步初始化(非同步 `isAvailable()`)→ 拦截同步 isAvailable
- [ ] SearchProvider 状态语义是否统一(idle/initializing/ready/failed,initialize 失败 → failed,无两套错误路径)
- [ ] SearchProvider 是否实现 `destroy()`(initialize→search→destroy→reinitialize 闭环)(P1-5)
- [ ] Provider singleton 所有权是否由 SearchRuntime 持有(SearchBox 只连接 runtime;导航时 UI 重建、Provider 不重建;locale 改变才 destroy+reinitialize)(P1-6)
- [ ] 切换 `PUBLIC_SEARCH_PROVIDER` 是否只需改配置,不动 SearchBox/业务代码 → 拦截需改核心代码的 provider 切换
- [ ] `PUBLIC_SEARCH_PROVIDER=none` 是否由 resolver 返回 null(SearchBox 零 DOM),而非落入 default throw
- [ ] PagefindProvider 是否只保留 `await import('/pagefind/pagefind.js')` 一种 API 模型(无 `window.__pagefind__` 兼容路径)
- [ ] PagefindProvider 是否**不**手动按 `opts.locale` 二次过滤(语言由 `<html lang>` 索引承担;locale 仅留给未来 Orama)
- [ ] ClientRouter locale 切换时是否 **destroy + reinitialize Pagefind**(`astro:page-load` 检查 locale 变化);fixture 是否覆盖 zh→en 搜索只返回 en(P1-5)
- [ ] 后期是否考虑 `<main data-pagefind-body>` 作为搜索主体(页面增多防漏 ignore,现阶段维持 ignore)(P2-15)
- [ ] 7.10 与 5.11 的 Pagefind locale 描述是否统一(无"按 opts.locale 过滤"残留)
- [ ] 搜索启用时 pagefind 生成失败是否 = CI fail;禁用时是否完全不执行
- [ ] `search()` 错误语义是否统一:失败 → throw SearchError;成功无结果 → [](P1-9)
- [ ] `PUBLIC_SEARCH_PROVIDER=orama` / `PUBLIC_MUSIC_PROVIDER=howler` 是否**不是 MVP 有效值**(未实现前配置 = 配置错误 throw,而非降级)(P1-8)
- [ ] 每页是否设 `<html lang={locale}>`(Pagefind 自动识别语言,i18n 已设);admin/404/占位页是否 `data-pagefind-ignore` 排除(仅 pagefind 启用时);**admin 的 `data-pagefind-ignore` 是否直接写死在 `public/admin/index.html`**;**首页/列表/tag/category/archive/about/friends/collection 是否统一 ignore(只索引 Article/Project 详情页)**
- [ ] 音乐禁用(`PUBLIC_MUSIC_ENABLED=false`)时 MusicPlayerWidget 是否零 DOM → 拦截未关闭的渲染
- [ ] MusicPlayerWidget 是否直接 import 具体 Provider(禁止)→ 必须只 import `createMusicProvider` + `MusicPlayer` 接口类型
- [ ] MusicPlayer 接口是否用 `initialize()/ready()` 异步初始化(非同步 `isAvailable()`)→ 拦截同步 isAvailable
- [ ] 背景音乐是否默认不播放(页面加载不自动播,用户点击控件才播)→ 拦截 autoplay
- [ ] 切换 `PUBLIC_MUSIC_PROVIDER` 是否只需改配置,不动 Widget/业务代码
- [ ] `PUBLIC_MUSIC_PROVIDER=none` 是否由 resolver 返回 null(Widget 零 DOM),而非落入 default throw
- [ ] OG 图是否输出到 `dist/og/`(非 `public/og/`,postbuild 在 build 后跑)→ 拦截写 public 的错误
- [ ] OG 图文件名是否含 `collection-locale-slug` 维度防冲突 → 拦截裸 `{slug}.png`
- [ ] OG 图增量是否基于内容 hash + `OG_TEMPLATE_VERSION`(而非仅文件存在);draft 是否跳过;ogImage 优先级是否本地 > 远程 > 自动生成
- [ ] OG hash 是否含 **`OG_FONT_VERSION`**(字体替换后缓存失效)(P1-5)
- [ ] OG CJK 字体是否为**子集化**版本(3500 常用字,1-3MB,注明来源/体积预算),非完整 NotoSansSC TTF(M2)
- [ ] OG 生成失败是否 warn + 默认图 + 构建成功(非阻断,与 search:index 的 CI fail 区分)
- [ ] 默认 OG 图是否入仓、无特定 OG 的页面是否用它
- [ ] 图片/代码块插件是否统一挂在 `markdown.processor`(remark → Markdown AST,rehype → HTML AST),禁止 Agent 自选挂载点
- [ ] `markdown.processor` 是否**显式构造 unified processor**(不依赖 Astro 默认 processor)
- [ ] 是否已有 **Markdown Processor Decision** 记录(为何 Astro 7 继续用 unified:自定义 rehype 插件/图片与代码块依赖 AST;未来迁移 Sätteri 的路径)(P0-2)
- [ ] **Astro 7 下是否显式 `processor: unified({...})`**(默认 Sätteri 会让 remark/rehype 插件失效);`.astro` 是否满足 Rust 编译器严格 HTML 校验;`transition:persist`/`<Image>` 是否已在 7.x 实测(C1/M5)
- [ ] 依赖契约是否明确:**`@astrojs/markdown-remark` 为直接依赖(提供 unified processor API)**;自写 rehype 插件为主仓源码;remark/rehype 生态 transitive,Agent 不自猜安装(P1-7)
- [ ] Sveltia `_slug` 是否已按 C2 修正:显式字段 + `default(title)` 初始值;**是否实测模板 `default` filter 可用性**,fallback 是否已写定(必填 _slug 或 uuid_short)(C2)
- [ ] `redirects.json` 是否已纳入 **Sveltia file collection(redirects)** 编辑(改 slug 与登记 redirect 同一 CMS 会话/同一 commit 的闭环)(P0-3)
- [ ] 图片管线顺序是否正确(Markdown → remark → rehype → Astro 渲染 + astro:assets → 客户端增强),不再出现"Astro 优化后 remark 再包裹"的错误模型
- [ ] `rehypeArticleImage` 是否只改 HTML 结构(不把 image node 转字符串、不自处理 srcset/URL)→ 拦截破坏 astro:assets source 语义
- [ ] ArticleImage/CodeBlock 客户端事件委托是否只注册一次(singleton guard),不在每次 page-load 重复 addEventListener
- [ ] 增强模块是否已命名 `ArticleImageEnhancer.ts`/`CodeBlockEnhancer.ts`(去掉 `.client` 歧义,明确是 astro:page-load 客户端增强而非 Markdown AST 插件)(P1-6)
- [ ] 是否配置 Markdown 图片管线 fixture 测试(本地/远程/caption/alt=""/srcset/AVIF/WebP/lightbox/onerror)
- [ ] 构建管线顺序是否正确(prebuild → build → postbuild)
- [ ] 环境变量是否都有 `.env.example` 对应条目
- [ ] Sveltia admin 是否在 `public/admin/`(非 `src/pages/admin/`)→ 拦截错误位置
- [ ] Sveltia config.yml 是否误用 Decap 的 `proxy`/`app_id`/`auth_type`/`local_backend` 字段 → 拦截(Sveltia 用 `base_url`,无 `local_backend`)
- [ ] Sveltia OAuth Authenticator(若用)是否独立部署、client secret 是否只在 Authenticator 端
- [ ] Sveltia 是否使用 exact pinned 已验证版本(`@sveltia/cms@0.197.2`,无占位版本号);升级是否按验证清单重验 i18n/_slug/canonical_slug/media/file collection/local repository/CSP(P1-8/P2-19)
- [ ] 是否 `npm view @sveltia/cms versions` 实测确认 pinned 版本存在;不存在时是否已替换为实际稳定版本并同步 1.1/8.5/附录 B(m3)
- [ ] 4.7 是否有可直接使用的完整 config.yml 骨架(5 个 collection,i18n/canonical_slug/media 齐全)(第九轮可实施性)

### 部署相关(第 8 节)
- [ ] 主仓根目录是否放了平台耦合配置文件 → 应放 `deploy/` 目录
- [ ] 生产构建命令是否为 `pnpm install && pnpm build`(prebuild 自动 pull:content + check-datasheets)→ 拦截含 `git submodule` 的旧命令
- [ ] `src/content/` 是否在 `.gitignore`(不入主仓)→ 拦截误提交
- [ ] `pull:content` 脚本是否在 predev/prebuild 钩子注册 → 确保本地开发与构建自动拉内容
- [ ] `CONTENT_GITHUB_TOKEN`(或 GITHUB_TOKEN)是否被直接拼接到 Repository URL(禁止,会泄露在进程列表/日志)→ 必须走 credential helper 的 Authorization header;CI 注入的是 `CONTENT_GITHUB_TOKEN`
- [ ] CI 中 `CONTENT_GITHUB_TOKEN` 是否**只出现在 build 步骤 env**(code checks 无 secret,P1-6);Sveltia 编辑 Token(write)与 CI Token(read-only)是否区分(P2-18)
- [ ] content 仓库是否配了触发主站重建的 webhook Action
- [ ] Deploy Hook 是否用 `MAIN_SITE_DEPLOY_HOOK_URL` secret(不写死 Cloudflare URL);content workflow 是否带 `concurrency` 去重
- [ ] content CI 复用的 reusable workflow 是否 **pin 到 tag/commit**(不永久引用 main)(P2-6)
- [ ] **content repo `redirects.json`** 是否为 URL 迁移唯一真相源(slug 修改时在 content repo 登记,与 slug 同 commit),deploy 脚本是否将其写入平台 301 规则(P1-4/P0-3)
- [ ] 是否已有 `generate-redirects.ts`(redirects.json → 平台规则/静态 HTML);`validateGeneratedRoutes()` 是否在**路由生成后、deploy 前**执行(target∈routes / source∉routes)(M4/P1-7)
- [ ] redirect 校验是否拆两阶段:`validateRedirectManifest()`(content repo:格式/路径/环/链)+ `validateGeneratedRoutes()`(main repo:路由存在性)(P1-7)
- [ ] GitHub Pages 是否生成静态 redirect HTML(meta refresh/JS + canonical)而非依赖平台 301(P1-12)
- [ ] content repo CI 是否将"slug 修改 → redirects.json 登记"作为自动约束(缺 redirect → fail,不触发 Deploy Hook)(P1-4)
- [ ] content repo 职责描述是否改为"内容 + 内容元数据仓库"(含 redirects.json)(P1-14)
- [ ] concurrency 描述是否限定为"去重 trigger workflow"(平台 build 是否取消由托管平台决定,不夸大能力)
- [ ] GitHub Actions 是否设置 least-privilege `permissions: contents: read`;fork 判断是否先检查 `github.event_name == 'pull_request'` 再取 `pull_request.*` 字段
- [ ] CI `push` 是否只监听 `main`;是否显式注入 `PUBLIC_SEARCH_ENABLED`/`PUBLIC_SEARCH_PROVIDER`(search 行为确定一致)
- [ ] internal PR/main 的 dist artifact 是否标注"含 private content,不得公开分享";fork PR 是否不产生该 artifact
- [ ] fork PR 是否不注入 `CONTENT_GITHUB_TOKEN`、不拉 private content、只跑 code/lint/test;完整构建/预览是否仅 internal PR 与 main
- [ ] `trailingSlash` 是否 `always`,内部链接是否一致带尾斜杠
- [ ] CSP 是否按启用功能动态生成(未启用的可插拔功能域不进 CSP)→ 拦截写死 giscus.app/cloud.umami.is 的静态 CSP
- [ ] 是否**避免同时配置 HTTP Header CSP 与 Meta CSP**(多个 policy 叠加限制而非覆盖,P1-7);能设 Header 的平台是否不注入 Meta
- [ ] CSP 的 Umami 域是否从 `PUBLIC_UMAMI_SCRIPT_URL` 解析(支持自托管)→ 拦截写死 cloud.umami.is
- [ ] `buildCsp()` 是否纯函数(只读环境变量),写入逻辑是否在 deploy script 而非 lib → 拦截职责混淆
- [ ] 是否明确**暂不启用 Astro 内置 CSP**(统一用 buildCsp 自实现,不双套并存)
- [ ] 主站 CSP 是否含基础 hardening(`object-src 'none'`/`base-uri 'self'`,header 平台加 `frame-ancestors 'self'`);`img-src https:` 是否已标注后期收紧为明确域(P2-4/P2-5)
- [ ] `<meta http-equiv="Content-Security-Policy">` 是否仅在无法设 HTTP header 的平台(如 GitHub Pages)注入 → 拦截能设 header 时还重复注入 meta
- [ ] unpkg.com 是否只出现在 `/admin/` 的独立 CSP(meta 或路径级 header),主站 CSP 不含 unpkg.com → 拦截全站放行
- [ ] admin CSP 是否标注"当前 Sveltia 版本的 baseline",升级后是否重新用 DevTools 检查 violation(P2-21)
- [ ] 预览站点是否 `noindex, nofollow`
- [ ] 预览站点的可插拔功能是否用测试配置或禁用;private content 时 fork PR 预览是否明确不支持
- [ ] Sveltia OAuth Authenticator(若用)的 client secret 是否只在 Authenticator 端,不进主仓
- [ ] `build-meta.json` 是否只含 mainCommit/contentCommit/contentUpdatedAt/buildTime(不暴露 node/astro 版本)且为固定产物(非"或注入 data attribute"二选一);Footer 是否分开显示 buildTime 与 contentUpdatedAt
- [ ] `src/.build-meta.generated.json` 是否列入 `.gitignore`(prebuild 产物不出现 untracked)(P1-10)
- [ ] Footer 读取 `src/.build-meta.generated.json` 缺失时是否降级 `'unknown'`(dev 容错,m4)
- [ ] 平台矩阵/7.3 是否残留易变信息(Netlify GoTrue、具体免费额度、资源限制)→ 应移 deploy/{platform}/README.md
- [ ] 站点配置目录是否统一为 `src/config/`(site.ts/music.ts/static-pages.ts,无 `src/config.ts` 与子目录并存)(P2-1)
- [ ] git clone/fetch/reset/rev-parse/log 是否只出现在 `src/scripts/`(src/lib、src/components 零 git 命令)
- [ ] pull-content 是否固定 `origin/main` + `fetch + merge --ff-only`(不用 `git pull`,避免 feature branch 误更新)(P1-8)
- [ ] `pull-content.mjs` 是否含 `validateContentRepo()`(`.git`/origin URL/branch 校验,失败删目录重 clone)(P1-2)
- [ ] `src/content/` 注释是否标注为 generated workspace(不要直接编辑)(P1-1)
- [ ] MVP 预览是否明确为 dist-preview artifact(不额外实现平台 Preview Deployment,选定平台后再做)(P1-9)

### 错误处理/a11y/测试相关(第 9 节)
- [ ] 可插拔功能失败是否静默降级,核心不受影响
- [ ] 所有 `<img>` 是否加 `onerror` 占位图替换
- [ ] 404 页是否走 i18n(默认 zh + 客户端增强,不依赖 Referer)、提供入口、`noindex`
- [ ] 跳转链接(skip-link)是否在 BaseLayout 最顶部
- [ ] 所有交互元素是否键盘可达
- [ ] ARIA role 是否按实际交互模型选(移动菜单 disclosure 用 aria-expanded 而非 dialog;阅读进度用 status 而非 progressbar;Lightbox 遮罩阻断才用 dialog)→ 拦截滥用 dialog/progressbar
- [ ] 颜色对比是否满足 WCAG AA
- [ ] 动效是否有 `prefers-reduced-motion` 降级
- [ ] JS 侧 reduced-motion 检测是否演示 `matchMedia` 与 `getComputedStyle` 读取 `--motion-scale`(仅客户端,构建期不可用)(m7)
- [ ] 新增 `src/lib/` 函数是否同步加单测
- [ ] CI 是否含 check/lint/test/build/check:links 全链
- [ ] `check:links` 是否明确只覆盖 HTML 内部链接(不冒充全 dist 完整性验证);sitemap/RSS 一致性是否单列 check:sitemap/check:rss
- [ ] `check:sitemap`/`check:rss` 是否已加入 package.json 并在 CI build 后运行(不只在 Spec 里描述)
- [ ] postbuild/CI 链是否包含 `build-meta --dist`(Spec ↔ package.json ↔ workflow 三者一致,P0-2)
- [ ] CI checkout 是否**不含** `submodules: recursive`(已移除 submodule 机制)→ 拦截旧配置
- [ ] CI 是否通过统一脚本链,`check` 保持纯本地(不拉 content),`FORCE_CONTENT_SYNC=true` **只在 CI build 步骤注入**(本地 `pnpm build` 默认非 destructive)→ 拦截本地 build 默认 reset --hard 的过时配置
- [ ] `rm -rf src/content && pnpm check` 是否在**实现首周**实测并记录结果;不通过时是否已拆 `check:code`/`check:content` 或提供 empty fallback(C3)
- [ ] 是否有 dirty-content build safety 测试(未提交修改时 `pnpm build` 不 reset --hard、文件仍在)(P2-20)
- [ ] fixture 是否含 redirect manifest 用例(旧 slug → 新 slug → 301/canonical/hreflang/sitemap)(P2-19)
- [ ] 是否建立最小 fixture-content 并真实跑 `pnpm build` 验证 routes/images/sitemap/hreflang/placeholder/RSS/Pagefind/OG
- [ ] fixture 是否覆盖 single-language 变体(只有 zh/只有 en/zh+en/zh+placeholder ru/ja),检查 canonical/hreflang/x-default/sitemap
- [ ] 是否已有 `schema-contract.test.ts`(范围限定:字段名/必填性/基础类型/默认值/i18n 标记,**保持当前规模,不扩张为 Zod→Sveltia generator**)(P2-13/P2-16)
- [ ] 是否有 Toolchain Contract 单一版本约束(node/pnpm/astro/vite managed by astro)并在升级时同步(P1-4)
- [ ] 是否在 Astro 7 下跑 **Router Compatibility Test**(page swap/music persist/giscus reload/pagefind destroy/reinit/theme state/lightbox)(P1-3)
- [ ] 是否明确**不引入 incremental build 与 Runtime Routing**(保持完整 build + 平台 redirect)(P2-2/P2-3)
- [ ] `package.json` 是否声明 `engines.node` 与 `packageManager`(**真实版本如 pnpm@9.15.5,非 9.x.x 占位**),且与 CI 一致(P0-3)
- [ ] 环境变量命名是否遵循 `PUBLIC_*` = 客户端可见;`CONTENT_GITHUB_TOKEN` 等敏感值是否非 PUBLIC 前缀(且绝不拼 URL)
- [ ] content repo 是否**不**跑独立 schema CI(方案 A:schema 校验由主仓构建时 Zod 完成)→ 拦截 content repo 里的 validate-content workflow
- [ ] schema 唯一真相源是否在主仓 `src/content.config.ts`(content repo 不复制 schema)
- [ ] README 是否含接手者必读清单所有条目
- [ ] CONTRIBUTING 是否含双语配对与 datasheet 流程

### Content identity / JSON / Redirect / OG / Admin 验证项(第八轮)

#### Content identity
- [ ] 无 frontmatter `lang`(locale 只能从目录推导)
- [ ] 无 frontmatter `slug`(`_slug` 由 Sveltia slug metadata 管理)
- [ ] `translationKey` 不代表 URL;同时作为 Sveltia `canonical_slug.key`(无 `_canonicalSlug`)(C2)
- [ ] `redirects.json` 是历史 URL 唯一真相源

#### JSON collections
- [ ] 每个 item 都有 `id`
- [ ] `item.id` 在 collection 内唯一(`validateCollectionItemIds()`,P1-2)

#### Redirects
- [ ] source 不得仍是当前 route(`source ∉ generatedRoutes`)
- [ ] target 必须是真实 route(`target ∈ generatedRoutes`)
- [ ] source/target 不得形成环;MVP 不允许 redirect chain
- [ ] placeholder → 正式翻译必须检查旧 placeholder URL(新增语言版本且 slug 变化 → 必须登记)(P1-4)

#### OG
- [ ] OG cache 不放 dist(改 `.cache/og-cache.json`,P0-1)
- [ ] OG cache 基于 content hash + template version
- [ ] 中文/日文字体已提供(NotoSansSC,非浏览器 fallback,P0-2)
- [ ] draft 不生成 OG;OG 失败降级默认图

#### Admin
- [ ] Admin CSP 与主站 CSP 完全隔离(`/admin/*` 不继承主站 CSP,P1-9)
- [ ] 不允许全站 CSP 放 unpkg
- [ ] Admin CSP 与当前 Sveltia 版本(`0.197.2`)实际运行验证一致(含 cdn.jsdelivr.net/blob:/data:,P1-8)

---

## 附录 C:环境变量总表

**命名纪律(P2-10/P2-19)**:`PUBLIC_*` = **允许客户端读取的公开配置**(Astro 静态构建下通常会被编译进 HTML/客户端 bundle,如 `PUBLIC_UMAMI_WEBSITE_ID`、`PUBLIC_GISCUS_REPO_ID` 可公开;措辞上以"允许客户端读取"为准,不绝对承诺"一定进 bundle");**非 `PUBLIC_*` = 构建/服务端专用**(如 `CONTENT_GITHUB_TOKEN`、`FORCE_CONTENT_SYNC`),**绝不可加 `PUBLIC_` 前缀**,否则会泄露到生产 HTML。

```bash
# === 站点 ===
PUBLIC_SITE_URL=https://example.com              # 站点 URL,用于 canonical/OG/sitemap
PUBLIC_SITE_NAME=Object920                       # 站点名

# === content 仓库(构建时 git clone --depth 1 拉取)===
CONTENT_REPO=YourUser/object920-content          # content 仓库地址(owner/repo)
CONTENT_GITHUB_TOKEN=                            # CI 用,read-only,scope 仅 content repo(fine-grained PAT);与 Sveltia 编辑用 write PAT 严格区分(P2-18);走 credential helper 不拼 URL
FORCE_CONTENT_SYNC=false                         # 仅 CI build 注入 true(强制 git reset --hard 同步);本地 build 默认 false,非 destructive(P0-1)
MAIN_SITE_DEPLOY_HOOK_URL=                       # content 仓库 secret:主站平台 Deploy Hook URL(Cloudflare/Vercel/Netlify 通用,content workflow 只 POST,不写死平台,见 8.7)

# === Sveltia CMS ===
# MVP 个人站用 Access Token 登录,不需要以下环境变量
# 生产多用户(可选):部署 sveltia-cms-auth 后,base_url 直接硬编码在 public/admin/config.yml(非密钥)
# SVELTIA_AUTHENTICATOR_URL=https://your-authenticator.workers.dev  # 可选,多用户时用

# === Giscus(可插拔,可选)===
PUBLIC_GISCUS_ENABLED=false                      # 启用开关
PUBLIC_GISCUS_REPO=YourUser/object920-discussions # **public 独立 discussions 仓,与 CONTENT_REPO 完全解耦**(content 仓允许 private,Giscus 仓必须 public,见 7.4)
PUBLIC_GISCUS_REPO_ID=R_xxx
PUBLIC_GISCUS_CATEGORY_ARTICLES=Articles
PUBLIC_GISCUS_CATEGORY_ARTICLES_ID=DIC_xxx
PUBLIC_GISCUS_CATEGORY_GUESTBOOK=Guestbook
PUBLIC_GISCUS_CATEGORY_GUESTBOOK_ID=DIC_yyy        # category-id 格式为 DIC_ 前缀(m6),从 giscus.app 获取

# === Umami(可插拔,可选)===
PUBLIC_UMAMI_ENABLED=false
PUBLIC_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
PUBLIC_UMAMI_WEBSITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# === assets 仓库 ===
PUBLIC_ASSETS_USER=YourUser
PUBLIC_ASSETS_REPO=object920-assets

# === 搜索(可插拔 SearchProvider)===
PUBLIC_SEARCH_ENABLED=true                       # 启用开关;false 则 SearchBox 零 DOM、不执行 pagefind、无运行时搜索请求(P2-3)
PUBLIC_SEARCH_PROVIDER=pagefind                  # pagefind(MVP 默认)| none;orama 未实现前不是有效值(P1-8)

# === 开往 Travellings(可插拔)===
PUBLIC_TRAVELLINGS_ENABLED=true                  # 启用开关,false 则友链页不渲染开往入口

# === 背景音乐(可插拔 MusicPlayer)===
PUBLIC_MUSIC_ENABLED=false                       # 启用开关,默认关;true 时渲染播放控件(仍默认不播放,用户点击才播)
PUBLIC_MUSIC_PROVIDER=html5audio                # html5audio(MVP 默认)| none;howler 未实现前不是有效值(P1-8)

# === 预览部署(平台注入)===
PUBLIC_PREVIEW=false                             # 预览站点设 true,生产不设
```

`.env.example` 入仓作模板,`.env` 不入仓。生产值在平台面板注入。

---

## 附录 D:接手者必读清单汇总

### 第一条(最重要)
**首次开发/构建前需拉取 content**:首次跑 `pnpm dev` 会自动 clone(predev 仅首次 clone);之后 `pnpm dev` 不自动 pull(保护 Sveltia 本地修改),手动更新用 `pnpm pull:content`。`src/content/` 不入主仓(在 `.gitignore`),主仓零内容文件。

### 本地开发
1. 复制 `.env.example` 为 `.env` 填本地值(至少 `CONTENT_REPO` 填你的 content 仓库地址)
2. `pnpm install`
3. `pnpm dev`——自动触发 `predev` 钩子拉取 content,然后启动开发服务器
4. Sveltia 本地:在 **Chrome/Edge** 打开 `http://localhost:4321/admin/index.html`,点"Work with Local Repository"**选 `src/content/` 目录**(content repo 工作目录,非主仓根),零代理零 OAuth,需 Chromium 浏览器
5. Giscus/Umami 未启用时评论与分析不显示是正常的

### 内容编辑
1. 通过 Sveltia 后台(`/admin/`)编辑,不走 git PR
2. Sveltia 提交直接推 content 仓,**主仓无需任何提交**(非 submodule,无指针更新)
3. 双语配对:zh/en 两版必须填同样的 `translationKey`
4. 数据手册:文件传 assets 仓,Sveltia 里只填 `filename`(不含路径)+ `mirror` + 必要时 `releaseTag`;历史资料显式填 `ref`(tag/commit);校验策略是**至少一个镜像可用即通过,全部 404 才失败**
5. 图片:folder collection 用 **entry-relative media**——图片与对应 `index.md` 同目录,Sveltia 上传后 frontmatter 写 `./cover.webp`,经 Astro 图片管线优化;JSON collection(番剧/术曲/友链)封面/头像只填远程 URL
6. **URL migration(P1-15)**:修改 `_slug` 时**必须同一 commit 更新 content repo 的 `redirects.json`**(旧 URL → 新 URL),content CI 校验通过后才触发重建;普通内容修改(title/正文)不涉及 redirect

### 构建与部署
1. 本地构建:`pnpm build`——prebuild 自动跑 `pull:content`(拉最新 content)+ `check-datasheets`(校验 assets),然后 astro build,最后 postbuild(搜索索引/OG/死链;搜索索引仅在 pagefind 启用时跑)
2. 生产构建命令:`pnpm install && pnpm build`(简洁;prebuild 自动拉 content,无需手动 submodule 操作)
3. 首次部署选平台:参考 `deploy/` 目录各平台 README
4. Sveltia 触发重建:content 仓 GitHub Actions 调主站平台 Deploy Hook,重建时 prebuild 自动拉最新 content
5. OAuth Authenticator(可选,多用户):参考 `deploy/oauth-proxy/` 对应 README;MVP 个人站用 Access Token 无需部署

### 项目结构
1. `src/content` 构建时动态拉取(非 submodule,不入主仓)
2. `src/components` 按领域分目录,领域间禁止互相 import
3. `src/styles` 三层:tokens.css(真相源)/ Tailwind(utility)/ scoped(华丽动效)
4. `src/components/integrations/` 是可插拔 Integration 统一目录(analytics/search/travellings/music 子目录),环境变量开关
5. `deploy/` 隔离平台配置

### i18n
1. UI 四语(zh/en/ru/ja),MVP zh/en 全填,ru/ja 空壳走 zh fallback
2. 文章双语渐进,未翻译走占位页跳转中文版
3. 新增字典 key 先加到 `zh.ts`(真相源)再同步其他

### 测试
1. `pnpm ci` 跑全链:check → lint → test → build → check:links
2. 新增 `src/lib/` 函数必须同步加单测
3. CI 失败阻断合并

### 常见问题
1. **内容为空**:content 没拉取 → 首次 `pnpm dev` 自动 clone;之后手动 `pnpm pull:content` 更新;确认 `.env` 的 `CONTENT_REPO` 配置正确
2. **Sveltia 登录失败**:本地开发需 Chromium 浏览器(Chrome/Edge/Brave)并点"Work with Local Repository";生产用 Access Token 或部署 sveltia-cms-auth → 参考 `deploy/oauth-proxy/`
3. **图片不显示**:远程图走 `<img loading="lazy">`,本地走 astro:assets;`onerror` 替换占位图
4. **搜索 dev 不工作**:Pagefind 索引构建后才生成,dev 模式不可用是预期
5. **OG 图没生成/内容变了不更新**:增量依据是内容 hash + `OG_TEMPLATE_VERSION`,缓存在 **`.cache/og-cache.json`**(不在 dist,P0-1);删除 `dist/og/` 与 `.cache/og-cache.json` 后重建,或模板变更时递增版本号(注意是 `dist/og/` 不是 `public/og/`,postbuild 直接写 dist)
6. **content 拉取失败(私有仓库)**:private content repo 需配 `CONTENT_GITHUB_TOKEN`(独立于 main repo 的 GITHUB_TOKEN,fine-grained PAT scope 仅 content repo,**CI 只读;Sveltia 编辑用单独 write PAT**,见 P2-18);走 credential helper 不拼 URL
7. **pull 冲突(Sveltia 本地修改)**:`pnpm dev` 不自动 pull(保护未提交修改);手动 `pnpm pull:content` 前先 commit/stash;CI 用 `FORCE_CONTENT_SYNC=true` 强制同步
8. **OG 图生成报错(缺原生模块)**:`@resvg/resvg-js` 在某些 CI 容器(Alpine musl、特殊 glibc)可能 fallback 源码编译失败。应对:① 确认构建平台在 Prebuilt 覆盖范围(GitHub Actions ubuntu-latest / Cloudflare Pages 默认容器通常 OK);② 必要时 CI 加 Rust 工具链;③ 临时从 `postbuild` 移除 `generate-og`,OG 降级为默认图,不阻断主站构建。详见 7.9 节"已知风险"
9. **fork PR 构建失败(private content)**:预期行为——fork PR 不注入 `CONTENT_GITHUB_TOKEN`,CI 只跑 code/lint/test;完整构建与预览仅 internal PR/main

---

*文档结束*
