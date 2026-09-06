# Plan 4 实现备注(2026-09-06)

执行环境:Node 24.20.0 / Astro 7.3.1 / pagefind 1.5.2。Plan 4 全部 14 个任务完成;`pnpm ci` 全链通过,98 单测,postbuild **Pagefind 索引真实生成**;可插拔语义(关闭 = 零 DOM/零网络/零构建依赖)在构建产物级验证通过。

## 对计划的偏差记录

### 功能性 bug(计划代码缺陷)

1. **Comments.astro 配置断裂**(重要):frontmatter 声明了 `category`/`categoryId`/`mapping`/`term` 但模板从未把它们写入 DOM;客户端却从 `section.dataset.category` 等读取 → Giscus mount 拿到空 category,评论必然挂载失败。修复:模板输出 `data-category`/`data-category-id`/`data-mapping`/`data-term` 四个属性。
2. **音乐 mock 状态机错误**(计划测试代码):mock audio 的 `play()` 只派发事件、从不把 `paused` 置 false,导致 `onStateChange` 断言 `isPlaying===true` 必然失败;且 mock 函数改造后漏 `return`。修复 mock 状态翻转。
3. **`currentTrackId` 语义**(spec 5.12 默认不播放):实现原先恒返回第一曲;改为 audio 无 src(未开始播放)时返回 null,与"HTMLAudioElement 是媒体状态唯一真相源"(P1-11)一致。
4. **MusicPlayer.test 重复 `Playlist` 导入**(接口块与追加块各导一次)→ 合并。
5. **PagefindProvider 构建期解析失败**:`import('/pagefind/pagefind.js')` 指向 postbuild 才生成的运行时产物,Vite 构建报 UNRESOLVED_IMPORT → 加 `/* @vite-ignore */`(spec 7.10 场景的必然配套)。
6. **search-index.mjs 两处**:`new URL('../dist/', import.meta.url)` 从 src/scripts/ 起算层级错误(永远报 dist 不存在)→ 改 `resolve(process.cwd(),'dist')`;`?? 'pagefind'` 不拦截空串 → `||`。

### 解析器/工具链适配

7. **resolver 空串默认**(同 6):`createSearchProvider`/`createMusicProvider` 的 `??` → `||`(Vitest 下未 stub 的 env 是空串,测试以 `''` 表示"未设置")。
8. **SearchBox null 防护**:计划脚本对 5 个 querySelector 结果无守卫,astro check 报 26 处 `possibly null` → 保留运行时守卫 + 非空断言;`SearchResult` 类型引用触发 astro/eslint 解析器不一致(一个说未用一个说找不到)→ 改用 `Awaited<ReturnType<SearchProvider['search']>>` 推导,绕开类型导入。
9. **Analytics.astro 与 prettier-plugin-astro 冲突**:`<script is:inline define:vars={{...}}>` 的脚本体插件解析失败(const/var 都不行)→ 该文件加入 `.prettierignore`,保留 `var` 并对 eslint no-var 行内豁免。
10. **杂项**:`@ts-ignore` → 该行实际无错 → 改普通注释;Widget 冗余 `nextBtn` 声明删除(`closest` 委托已覆盖);eslint globals 补 `URL`(search-index.mjs)。

### 结构决策

11. **BaseLayout 采用增量合并而非计划的"整体替换"**:计划的替换版本基于 Plan 1 形态,直接替换会回退 Plan 3 的 Lightbox/客户端增强/`robots` prop/`head-extras` 槽。最终形态 = Plan 3 全量 + ClientRouter(`<head>`)+ Analytics + MusicHost(包裹 Widget)。
12. **SearchBox 接入 Header**(计划遗留注意事项落实):header-controls 区加入 `<SearchBox locale={locale} />`。
13. **package.json**:`search:index` 脚本 + `postbuild`(当前仅挂 search:index;Plan 5 扩展为完整链);pagefind devDependency。

## 验证快照

- 98/98 测试(SearchProvider 生命周期/Pagefind mock/双 resolver 配置矩阵/MusicPlayer + HtmlAudioProvider/createMusicProvider)
- 50 页面构建 + Pagefind v1.5.2 索引生成(`dist/pagefind/`)
- 产物验证:`PUBLIC_MUSIC_ENABLED=false`(默认)→ MusicHost/Widget 零 DOM;`PUBLIC_SEARCH_ENABLED=true`(默认)→ Header 含 SearchBox;Umami/Giscus 默认关闭零 DOM
- ClientRouter 已挂 `<head>`;astro check 0 error/eslint 干净
