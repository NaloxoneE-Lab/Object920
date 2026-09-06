# Plan 3 实现备注(2026-09-06)

执行环境:Node 24.20.0 / Astro 7.3.1。Plan 3 全部 17 个任务完成;`pnpm ci` 全链通过,**构建产物 50 个页面**,双语渐进/占位页/hreflang/筛选等 spec 核心语义在产物级验证通过。

## 对计划的偏差记录

### 计划引用缺口

1. **`lib/content.ts` 与校验函数族缺失**(计划声称 Plan 2 产出但实际没有):按 spec 6.5/4.1 补齐并带测试——`lib/i18n.ts` 增加 `deriveLocaleFromPath`/`validateSlugs`(ASCII + unique(collection,locale,slug))/`validateTranslationGroups`;新建 `lib/content.ts` 提供 `validateOgImageFields`(P1-10 互斥)/`validateCollectionItemIds`(P1-2)。**接线**:JSON collection 的 file() parser 调用 id 唯一性校验;两个详情页 getStaticPaths 调用 slug/翻译组/OG 三项校验(冲突即 build fail)。

### Astro 7 API 变化(计划按旧 API 编写)

2. **`entry.render()` → `render(entry)`**(Content Layer API,Astro 5+ 即已变更):`[...slug].astro` 与 `projects/[slug].astro` 修正。
3. **`Astro.Component` 类型不存在**(ArticleProse):改用函数类型断言。
4. **缺 `@types/hast`**(rehype 插件的 `import type { Root, Element } from 'hast'`):已安装 devDependency。
5. **`@layouts/*` 路径别名缺失**(tsconfig 只配了 5 个别名):已补。

### 计划代码错误(逐处修复)

6. **相对路径 bug**(与 Plan 1 BaseHead 同类):`ArticleProse.astro` 的 `import '../styles/prose.css'` 从 `src/components/article/` 解析错误 → `@styles/prose.css`。
7. **计划源码 typo**:`DatasheetDownload.astro` 调用了不存在的 `buildDownloadUrlssz` → `buildDownloadUrls`。
8. **StatusFilter 的 `e.key`**(Event 类型无 key)→ `(e as KeyboardEvent).key`。
9. **`(window as any)` 全局标志模式**(4 处)→ `(window as unknown as Record<string, unknown>)`(eslint no-explicit-any)。
10. **`new Map<string, { params: any; props: any }>` 与 `paths: any[]`** → 结构化类型(`{ locale: Locale; slug?: string }` 等)。
11. **多处未使用导入**(t/locale/slugOf/BaseLayout/locales/Props)→ 清理;`ReadingProgress` 本无 i18n 需求,删除整个 Props。
12. **计划文档代码块顺序错位**(抽取时发现并核对修正):Task 12 的 AnimeCard/StatusFilter 块、Task 16 的 NotFound/about 块、Task 15 的 Hero.astro/Hero.module.css 块,注释头与文件名交叉错位。

### spec 语义修正(计划与 spec 冲突处,以 spec 为准)

13. **占位页 `{lang}` 语义颠倒**(重要):计划 `ArticleLayout` 传 `contentLocale` 给 `articles.untranslated`,导致英文占位页显示"本文暂无**中文**版本"(而中文版明明存在)。按 spec 4.2"此文暂无 [locale] 版"语义,`{lang}` 应为**当前页面缺失的语言 = UI locale**。修正后英文占位页正确显示"本文暂无 English 版本"。
14. **占位页 robots 指令**(spec 4.2/6.6):计划统一输出 `noindex, nofollow`;spec 要求占位页 **`noindex, follow`**(让爬虫顺着链接发现正主),预览站才是 `noindex, nofollow`。`BaseHead` 增加 `robots?: string` 显式语义位,占位页传 `noindex, follow`,预览站逻辑保持不变。
15. **占位页 `<article lang={contentLocale}>`**(spec P1-6,计划遗漏):占位容器补语言标注;`<html lang={uiLocale}>` 原本就有。
16. **rehype-codeblock 的复制按钮文案硬编码中文**(计划如此,构建期无法按 locale 渲染):已知限制,MVP 接受;Plan 4 的 CodeBlockEnhancer 客户端可按 locale 覆写文案(后续优化项)。

## 验证快照(构建产物级)

- 50 页面:4 locale × (首页/文章列表/归档/tag/category/番&术×3/友链/关于/工程列表) + 文章/工程详情 + admin + 根路径
- zh render 页:hreflang 仅 zh-CN + x-default,`<article lang="zh">`,canonical 带尾斜杠 ✓
- en/ru 占位页:`noindex, follow`、`<article lang="zh">`、hreflang 仅指向 render 页、正确文案 + 跳转链接 ✓
- tag/category/归档路由从真实 content 数据生成(uncategorized 分类)✓
- `astro check` 0 error / 0 warning;eslint 干净;53 单测通过(含新增 i18n 解析/内容校验/SEO/rehype 插件用例)
