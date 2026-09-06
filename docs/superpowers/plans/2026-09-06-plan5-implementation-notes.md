# Plan 5 实现备注(2026-09-06)

执行环境:Node 24.20.0 / Astro 7.3.1 / pnpm 9.15.5。Plan 5 全部 16 个任务完成;`pnpm ci` **完整链(EXIT=0)**:check → lint → 146 单测 → build(50 页)→ postbuild 七步(build-meta --dist → Pagefind 索引 → generate-og → generate:redirects → check:links → check:sitemap → check:rss)全部真实执行通过。

## Spec 修订(本轮收官动作,对应修订表第 11 轮)

- `engines.node` 由 `">=22.12 <23"` 放宽为 `">=22.12"`:`<23` 上限不再有依据。Node 24.20 全链实测证据:依赖安装、dev 渲染、astro check、146 单测、50 页构建、完整 postbuild(Pagefind 1.5.2 索引/OG 增量/三平台重定向输出/sitemap·RSS 校验)全部通过
- 同步点:spec 1.1 Toolchain Contract、1.1 版本策略注、9.7 示例、package.json engines、README 前置要求、**CI workflow node-version 22 → 24**(对齐本地验证环境;deploy/github-pages 模板保持 22 亦满足新约束,未改)

## 对计划的偏差记录

### 计划层缺失(跨计划引用断裂)

1. **`getSiteConfig()` 与 `src/config/static-pages.ts` 计划声称 Plan 3 产出但不存在**:按消费方(sitemap/rss/robots/generate-og/generate-redirects)的实际用法补齐——`getSiteConfig()` 返回 siteConfig 对象;`staticPageMeta` 为 `{ [path]: { lastmod?, noindex? } }`,纯导航页不输出 lastmod(spec 6.10 P1-14)。
2. **计划内部 API 矛盾**:Plan 5 的 sitemap 端点以三参数 `(collection, tKey, locale)` 调用 `resolveLocalizedEntry`,与 Plan 3/spec 6.5 定稿的两参数 `(group, uiLocale)` 不一致。端点按 spec 签名重写:`getEntriesGroupedByTranslationKey()` 分组 × `resolveLocalizedEntry(group, uiLocale)`,x-default 逻辑按 spec 6.6 P1-6(defaultLocale 有 render 用之,否则第一个 render locale)。

### astro:content 不可用于 tsx 脚本(同 Plan 2 check-datasheets 坑)

3. **generate-og.ts 重写内容采集**:`getCollection` 在 tsx 裸 Node 下无法解析 → 直读 `src/content/**/index.md` + `parseFrontmatter()`;draft 过滤、excerpt/description 兼容读取。OG 失败策略按 spec 7.9 P0-12:单篇 warn 降级默认图,脚本 exit 0 不阻断。

### 计划代码错误

4. **script 脚本不读 .env**:所有 Plan 5 脚本挂 `--env-file-if-exists=.env`(沿 Plan 2 方案)。
5. **sitemap.xml.ts / generate-og.ts 抽取截断**(块内含嵌套结构)→ 以 plan 原文行号校正;`from '../config/site.ts'` 后缀 → 规范别名导入。
6. **rss/sitemap 的日期类型错误**:schema `z.coerce.date()` 产出 Date,计划按 string 断言 → 改用 Date 排序/格式化(`toISOString().slice(0,10)` 作 lastmod)。
7. **search-index v2 默认语义与 spec 矛盾**:计划测试断言"未设置 → skip",spec 附录 C 默认 `PUBLIC_SEARCH_ENABLED=true` → 按 spec 改为"未设置 = 开启,显式 false 才禁用",测试同步修正并补充用例。
8. **site.ts 在 tsx 下崩溃**:`import.meta.env` 未守卫 → 加 `'env' in import.meta` 守卫 + `process.env` 回退(与 assets.ts 同模式)。
9. **redirects.json 双形态兼容**:spec 4.7(Sveltia 列表形态)与 6.5(映射形态)并存 → 新增 `normalizeRedirectManifest()` 归一化两形态;本仓 content 种子采用 Sveltia 可编辑的列表形态。
10. **eslint globals**:deploy/oauth-proxy 的 Workers/Edge 代码依赖 Response/Request/fetch/crypto/URLSearchParams → eslint.config.js globals 补齐;`type RedirectMap`/`existsSync` 等未用引用清理。
11. **check:links 本地可用性**:lychee 为外部二进制,本地未装 → `check-links.mjs` 包装器:检测不到 lychee 时 warn 跳过(exit 0),CI 由 lychee-action 安装后强制执行。

## 验证快照(完整链产物级)

- `dist/sitemap.xml`:xmlns:xhtml 声明 + per-locale `<xhtml:link>` alternates ✓;`dist/robots.txt` 含 `Sitemap:` 声明 ✓(spec 6.10 P1-9 闭环)
- `dist/build-meta.json` 仅含 mainCommit/contentCommit/contentUpdatedAt/buildTime ✓(P2-9 最小字段)
- `dist/rss/{zh,en,ru,ja}.xml` 4 feeds,zh feed 含真实文章条目 ✓
- `generate-redirects` 输出三平台规则(dist/_redirects、vercel.json、GitHub Pages 静态 redirect HTML)✓
- `generate-og` 增量缓存生效:首轮 2 degraded(本机无 CJK 子集字体,按 spec 降级默认图),次轮 cache 命中 2 skipped ✓
- Pagefind 索引生成;check:rss 4 feeds valid;CI workflow 含 fork-PR secret 边界(P0-10/P1-6)与 dist-preview artifact 边界(P1-17)

## 遗留事项(移交后续)

- 部署平台选定后:将 `deploy/{platform}/` 配置复制到根目录并配置真实 `PUBLIC_SITE_URL`(当前 example.com 占位,canonical/sitemap/RSS 均随之更新)
- content 仓的 reusable workflow(validate-redirects + Deploy Hook 触发)属 content 仓侧配置,spec 9.9,待部署平台确定后接线
- OG CJK 字体子集(3500 常用字,1-3MB)未生成,当前所有 OG 走默认图降级(spec 7.9 M2)
- 首周验证清单(spec 附录 D/M 项)剩余:`transition:persist` 在浏览器端的音乐跨页实测、Sveltia slug 模板 `default` filter 实测(File System Access API 本地编辑流)
