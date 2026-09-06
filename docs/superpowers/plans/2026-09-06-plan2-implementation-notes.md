# Plan 2 实现备注(2026-09-06)

执行环境:Node 24.20.0 / pnpm 9.15.5 / Astro 7.3.1 / @sveltia/cms@0.197.2。
Plan 2 全部 5 个任务完成;`pnpm ci` 全链通过(prebuild 含 pull:content + check:datasheets)。

## 配套仓库初始化(计划外必要步骤)

- `object920-content`(Private):种子化 README、`articles/zh/hello-world`、`projects/zh/sample-project`(含占位 datasheet)、`data/{anime,vocaloid,friends}.json`、`redirects.json`
- `object920-assets`(Public):种子化 README + `datasheets/object920-placeholder.txt`(作为 check-datasheets 真实网络校验的冒烟测试对象,后续替换)
- `.env`(本地,gitignored):`CONTENT_REPO=NaloxoneE-Lab/object920-content`、`PUBLIC_ASSETS_USER=NaloxoneE-Lab`、`PUBLIC_ASSETS_REPO=object920-assets`

## 对计划的偏差记录

1. **`@sveltia/cms@0.197.2` 存在性验证通过**(spec m3):`npm view` 确认;当前最新为 0.205.4,按 spec 纪律保持精确锁定不追新。
2. **脚本不读 .env**(Task 2):计划未加载 .env,裸 Node 脚本拿不到 `CONTENT_REPO`。已用 Node 原生 `--env-file-if-exists=.env` 挂到 pull:content/predev/prebuild/check:datasheets 四个 script 上(文件缺失不报错,兼容 CI 注入环境变量场景)。
3. **`fetch --depth=1 + merge --ff-only` 在浅克隆下必然失败**(Task 2,spec 7.12 层面缺陷,实测复现):双方浅根互不可达,merge-base 无法建立,报"拒绝合并无关的历史"。修复:fetch 改 `--depth=100`(保持图连通,成本可忽略),ff 仍失败(真正 diverge/force-push)时回退重 clone——此时工作区已验证 clean,无数据丢失风险。
4. **assets URL 构造补 `datasheets/` 前缀**(Task 4,spec 7.5 语义收敛):CMS 侧 `filename` 只填文件名,而 jsDelivr/raw 路径是仓库根相对。按 spec 7.5 仓库结构约定(jsDelivr/raw 文件固定在 `datasheets/`,Release 资产在根),由 `buildDownloadUrls()` 统一承担目录前缀;release 镜像不加前缀。
5. **check-datasheets 完全重写**(Task 5):计划代码 `import { getCollection } from 'astro:content'` 在 tsx 裸 Node 下不可解析(virtual module),`import.meta.env` 同因不可用。重写为:直接扫描 `src/content/projects/**/index.md` + `@astrojs/markdown-remark` 的 `parseFrontmatter()` 解析;env 读取走 `process.env` 优先。同时从计划"简化版 HEAD"升级为 **spec 7.5 完整语义**:状态码分类(404/401/403/405/429/5xx/timeout)、405 → GET Range 降级、429/5xx 指数退避重试、并发池 limit 4、单 URL 10s/整体 60s、镜像容错(至少一镜像可用即通过;primary 失效 fallback 可用 → warn;全部失效才 fail)。
6. **config.yml 以 spec 4.7 骨架为准**,修正计划三处遗漏/漂移:
   - 补 **redirects file collection**(spec P0-3 编辑闭环,计划完全遗漏)
   - articles/projects 补 `ogImage`/`ogImageLocal` 字段(计划遗漏)
   - `coverAlt`/`category` 的 i18n 标记按 spec 用 `duplicate`(计划写 `true`);`_slug` hint 按 spec 措辞(计划的"不同语言版本应使用相同 slug"与 spec P2-15 invariant 矛盾)
7. **admin/index.html 补 `/admin/` 独立 CSP**(spec 8.5 P0-13/P2-24,计划遗漏):meta CSP 模板含 unpkg/jsdelivr/api.github.com,与主站 CSP 隔离。
8. **Zod v4 规范化**(Task 1):`astro:content` 的 `z` 再导出在 Astro 7 已弃用 → `import { z } from 'astro/zod'`;`.string().url()` 链式写法在 Zod 4 弃用 → 顶层 `z.url()`。
9. **本地内容验证走真实 content 仓**(Task 1 Step 3 变体):计划在主仓 `src/content/` 手工建测试内容并 `git add src/content/`——与 .gitignore(主仓零内容)矛盾。改为种子化 content 仓后经 `pull:content` 拉取验证。

## 验证快照

- `pnpm check`:0 error / 0 warning(弃用 hint 清零,仅剩 eslint.config 的 tseslint.config 弃用提示,非阻塞)
- `pnpm test`:16/16(assets 链接构造含 ref/releaseTag/mirror 顺序用例)
- `pnpm run check:datasheets`:真实网络校验通过(jsDelivr 200,~1.5s;raw 备用)
- `pnpm ci` 全链 EXIT=0;`/admin/index.html`、`/admin/config.yml` 200;unpkg 的 Sveltia 0.197.2 资源可达
- pull-content 实测三态:首次 clone ✓ / ff-only 更新 ✓(depth=100 修复后)/ dirty 检测逻辑在位
