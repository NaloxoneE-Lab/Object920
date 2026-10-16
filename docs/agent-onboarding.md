# Object920 — UI Agent 接手速读指引

> **用途**:新 agent(尤其做 UI / 前端 / 设计落地)接手本仓库工作时,**只读这份文档**即可
> 了解项目全貌并开始干活,而不必通读整个源码树。
> **读完即用**:给出方向后,本文件末尾的「按需深入」清单告诉你必要时再翻开哪些文件。

---

## 1. 这是什么项目

- **个人网站**(作者 NaloxoneE),静态站点。
- 内容域:**文章、工程、番剧(术曲)**,另有收藏、友链、关于页。
- 设计气质:类「Sakura」风格、galgame 式左侧纯文字菜单、整屏滑切、全局背景壁纸 + 磨砂玻璃前景。

## 2. 技术栈(改代码前必知)

| 层 | 技术 |
|---|---|
| 框架 | **Astro 7**(静态 SSG;页面大多纯静态,客户端 JS 仅少量增强) |
| 样式 | **Tailwind CSS v4**(通过 `@import 'tailwindcss'` 接入)+ 作用域 CSS(每个 `.astro` 内 `<style>` 默认 scoped) |
| 语言 | TypeScript / `.astro` 组件 (`---` frontmatter 是 JS/TS) |
| 运行时 | **零框架运行时纪律**:不引 React/Vue 等;只有 vanilla 组件脚本 (`astro:page-load` 等) |
| 包管理 | **pnpm** |
| 设计 Token 单一真相源 | `src/styles/tokens.css` |

> **纪律**:凡是能用 CSS 实现的效果,优先纯 CSS(`:hover`/CSS transition),不需要 JS 就不要写 JS。见 §6。

## 3. 目录速览(往哪改)

```
src/
├── components/
│   ├── home/        首页(Hero 整屏、文章列表、内容面板、滚轮切换脚本)
│   ├── layout/      BaseLayout / BaseHead / Header / Footer
│   ├── common/      Icon / EmptyState / LangSwitch
│   └── ui/          Lightbox / MobileNav / ThemeToggle
├── layouts/         ArticleLayout / ProjectLayout
├── pages/           [locale]/ 多语言页面目录(+ index.astro / 404 / sitemap / rss)
├── config/          site.ts(站点配置、导航、背景图)
├── i18n/            config.ts(zh/en/ru/ja 语言)+ ui/(文案字典)
├── styles/          tokens.css(设计 token)| global.css(全局样式、by-theme、reduced-motion)
├── lib/             slug / WordCount / stripMarkdown / home-sections 等逻辑
└── scripts/         构建期脚本(含已弃用的玻璃预览生成)
```

**改动最常落在**:`src/components/**`(组件+scoped CSS)、`src/styles/tokens.css`(token)、`src/i18n/ui/`(文案)。

## 4. 唯一设计真相源:tokens.css

**所有颜色 / 间距 / 圆角 / 阴影 / 字号 / 缓动 / z-index 都在 `src/styles/tokens.css`**,用 `var(--*)` 或 Tailwind utility 引用。**新样式不许硬编码颜色值,必须引 token。**

关键 token(节选,完整看文件):

- **颜色**:`--color-{bg,surface,surface-raised,text,text-muted,text-subtle,border,border-strong,accent,accent-hover,success,warning,danger,info}`
- **间距**(4px 基线):`--spacing-{3xs,2xs,xs,sm,md,lg,xl,2xl,3xl}`
- **圆角**:`--radius-{sm,md,lg,xl,2xl,full}`
- **阴影**:`--shadow-{sm,md,lg,glow}`
- **字号 / 行高**:`--text-{2xs..4xl}`、`--leading-{tight,base,prose}`
- **缓动**:`--ease-{in,out,in-out,spring}`(注意 `--ease-out: cubic-bezier(0.16,1,0,1)`,剧烈但柔)
- **时长**:`--duration-{fast:150, base:250, slow:400, slower:600}ms` + `--motion-scale`
- **暗色**:`:root[data-theme='dark']` 覆盖;`:root:not([data-theme])` 跟随系统 `prefers-color-scheme`
- **特殊**:`--hero-ink`(壁纸前景墨色)、`--frost-bg` / `--frost-blur`(磨砂玻璃底色/模糊)
- **宽容器**:`--container-{prose:720, page:1080, wide:1280}px`

> **新增 token 就加在 `tokens.css`**(混用 @theme / :root 两处)。`--duration-*` 和 `--motion-scale` 在 `:root` 块,不进 @theme(Tailwind v4 无 duration namespace)。

## 5. 多语言 / 路由约定

- 语言:`zh / en / ru / ja`(`src/i18n/config.ts` 的 `locales`),默认 `zh`;**内容类文章目前只有 `zh / en`**(`contentLocales`)。
- 路由:国际化 URL,如 `/zh/articles/文章slug/`。`/[locale]/...` 动态段。
- **文案必须走 i18n 字典**(`src/i18n/ui/`),不当场 hardcode 字符串;用 `t(locale, 'key')`。
- 导航项、站点名等读 `src/config/site.ts`。

## 6. 修改纪律(本项目血泪教训,务必遵守)

1. **backdrop-filter 只写标准属性,禁止写 `-webkit-` 配对**。lightningcss 压缩时会把二者合并成仅前缀版,导致标准属性丢失(已两次踩坑)。
2. **backdrop-filter 会制造包含块**——它会把内部 `position: fixed` 后代当作相对它定位。所以**:磨砂层里绝不能放 fixed 子孙**(如阅读进度条)。阅读进度条挂在 `main::before`,注意区分。
3. **磨砂/玻璃类元素 opacity < 1(含动画)会把自己变成新区块**,导致 backdrop-filter 采样被截断、模糊瞬移。**磨砂渐显不能动 opacity**,要走 `background-color` / `backdrop-filter` 插值(参考 `HomePanel.astro` 的 `.home-panel-frost`)。
4. **纯 CSS 优先**;重复触发的动效用 `transform` / `opacity`(合成器友好),别用会触发 layout 的属性。
5. **`prefers-reduced-motion` 已全局降级**(`global.css` 把 transition/animation 压到 0.01ms)。新加的动效要顺应它,别用 `!important` 违背。
6. **回复 / 交接**:涉及视觉定稿时,顺带更新 `docs/design/` 下的规格文档(见 §7)。

## 7. 关键设计规格文档(by-theme 的「为什么」)

| 文档 | 内容 |
|---|---|
| `docs/design/hero-home-spec.md` | 首页 Hero 设计实现规格(顶栏、左侧菜单、滚动指示、字体、响应式) |
| `docs/design/penpot-design-tokens.md` | Penpot token 库结构与来源 |
| `docs/article-card-frosted-glass.md` | 首页文章卡悬停磨砂玻璃(路线 B)完整取舍与迭代记录 |
| `docs/design/` 其他 | 逐模块设计稿(如进入时翻转) |

## 8. 验证 / 跑起来

```bash
pnpm install          # 装依赖
pnpm dev              # 本地开发(端口 4321,占位则 4322)
pnpm astro check      # 类型/编译检查(期望 0 errors)
pnpm check            # 等价 astro check
npx eslint <file>     # 单文件 lint
pnpm build            # 构建(会触发 prebuild 脚本,见下)
```

> **注意**:`package.json` 里的 `predev` / `prebuild` 会跑 `src/scripts/generate-glass-previews.mjs`(已弃用的路线 A 遗留脚本)。它当前**不影响构建结果**但会占一点时间;若它报错或在改造构建链路,可暂时忽略或按 §9 处理。

## 9. 已知遗留 / 潜在坑(动手前看一眼)

- **路线 A 遗留**:`src/scripts/generate-glass-previews.mjs`、`public/generated-glass/`(已 gitignore)、`package.json` 的 `predev/prebuild` 钩子、`public/frost-texture.webp`,均属**已弃用的构建期玻璃预览方案**,当前组件不用它们。清理/提交与否待定。
- **首页双屏**:`HomePanel.astro` 的磨砂层是全视口 `backdrop-filter` 渐显,600ms,是**性能敏感点**(过渡期逐帧糊全屏);改它前先读 `HomePanel.astro` 注释。
- **路由**:页面在 `src/pages/`,别把页面组件和 `components/` 混淆。

## 10. 新 agent 开工速查(最小清单)

1. 读这份文档(已读)。
2. 看 `src/styles/tokens.css` —— 所有视觉值都从这取。
3. 看目标组件的 `<style>` 块的**注释**(本仓库注释写得细,常含「为什么这样」)。
4. 若涉及设计定稿,对照 `docs/design/*.md`。
5. 动手时遵循 §6 纪律。
6. 改完跑 `pnpm astro check` + `pnpm dev` 手测。

---

## 按需深入(需要时才读,不要一开始就全读)

- 要改首页整体滑切与磨砂:**`src/components/home/scroll-switch.ts` + `HomePanel.astro` + `docs/design/hero-home-spec.md`**
- 要改文章卡:**`src/components/home/HomeArticleList.astro` + `docs/article-card-frosted-glass.md`**
- 要加深色/主题 token:**`src/styles/tokens.css` 的 `:root[data-theme='dark']` + `global.css`**
- 要改站点名/导航:**`src/config/site.ts` + `src/i18n/ui/**`**
- 要新增多语言页面:**`src/i18n/config.ts` + `src/pages/[locale]/` + 对应 `components/`**
- 要理解 i18n 文案组织:**`src/i18n/utils.ts` + `src/i18n/ui/`**
- 要跑通构建/发布链路:先 `src/scripts/generate-glass-previews.mjs`(遗留须知)+ `astro.config.*`
