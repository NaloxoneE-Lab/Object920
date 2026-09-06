# Plan 1 实现备注(2026-09-06)

执行环境:Linux(Arch) / Node 24.20.0 / pnpm 9.15.5(corepack) / Astro 7.3.1。
Plan 1 全部 8 个任务的 41 个执行步骤已完成;8 个 commit 步骤待 git 身份配置后统一执行。

## Node 24 兼容性验证(对应"修订 Spec engines"决策)

Spec 原约束 `engines.node: ">=22.12 <23"`(为 Astro 7 设定)。本机为 Node 24.20.0,按用户决策先在实现中验证兼容性:

| 验证项 | 结果 |
|---|---|
| pnpm install(Astro 7.3.1 全量依赖) | ✅ 通过 |
| `pnpm dev` 启动与页面渲染(zh/en/ru/ja 四语) | ✅ 通过 |
| `astro check`(21 文件 0 error) | ✅ 通过 |
| `vitest run`(11 测试) | ✅ 通过 |
| `astro build`(5 页面,含 Tailwind/CSS/字体管线) | ✅ 通过 |
| `pnpm ci` 全链 | ✅ 通过 |

初步结论:Astro 7.3.1 + Vite 8 在 Node 24.20 下无异常。待 Plan 5 完整构建链(postbuild/OG/Pagefind)通过后,修订 Spec engines 为 `">=22.12"` 并记录修订表。

## 对计划的偏差记录(按发现顺序)

1. **`markdown.processor` 字符串写法无效**(Plan 1 Task 2 Step 5):
   Astro 7.3.1 的 schema 要求 `processor` 为 MarkdownProcessor 对象(`{ name, options, createRenderer }`),不接受 `'unified'` 字符串。已按 Spec 7.2.2/依赖契约改为 `import { unified } from '@astrojs/markdown-remark'` + `processor: unified({ remarkPlugins: [], rehypePlugins: [] })`;`@astrojs/markdown-remark@^7.3.0` 已按 Spec P1-7 加入直接依赖(astro 7.3.1 中它是 optional peer,不会自动安装)。
2. **Tailwind v4 必须接 `@tailwindcss/vite` 插件**(Task 2 Step 5 注释有误):
   无插件时 `@import "tailwindcss"` 会被 Astro 内置 postcss-import 抢先解析,build 报 `ENOENT .../tailwindcss`。已 `pnpm add -D @tailwindcss/vite` 并在 `vite.plugins` 注入;dev 阶段不报错但工具类静默缺失,属隐蔽坑,已在配置内注释说明。
3. **vitest.config.ts 的 CJS 写法**(Task 1 Step 5):`__dirname` 在 ESM 项目(`"type": "module"`)不可用,且缺 `@types/node`。改为 `fileURLToPath(new URL(...))`,并补装 `@types/node`。
4. **BaseHead 全局样式导入路径错误**(Task 5 Step 2):计划写的 `import '../styles/global.css'` 相对 `src/components/layout/` 少一级,500 报错。改用别名 `@styles/global.css`。
5. **ThemeToggle/MobileNav scoped CSS 无法命中子组件 class**(Task 6):`.icon-dark` 等传给 `Icon.astro` 的 class 处于子组件模板,父组件 scoped style 匹配不到。已用 `:global()` 修正(功能等价,选择器语义不变)。
6. **lint 基础设施缺失**(Task 1 package.json 定义了 `lint` 脚本但计划从未提供配置):
   已补 `eslint.config.js`(flat config,`@eslint/js` + `typescript-eslint` + `eslint-plugin-astro` recommended)、`.prettierrc`(含 `prettier-plugin-astro`)、`.prettierignore`(忽略 docs/dist/字体等)。`eslint` 升至 `^10`(9.x 已 deprecated,且 eslint-plugin-astro 3.x 要求 ≥10)。
7. **杂项 lint 修复**:移除未使用导入(`t`/`locales`/`locale` 解构)、`isOpen ? close() : open()` 改 if/else(no-unused-expressions)、全仓 prettier 格式化一次。
8. **默认 OG 占位图**:用 PIL 生成 1200x630 纯色 PNG(Task 5 Step 4),Plan 5 将替换为 satori 自动生成。

## 验证快照

- 路由:`/` 协商页(noindex + noscript meta refresh 兜底)✅;`/zh/` `/en/` 渲染本地化 UI ✅;`/ru/` `lang="ru"` + zh 字典 fallback(空壳预期行为)✅
- 构建产物:`dist/_astro/*.css` 含 token 变量与 skip-link 样式(Tailwind v4 管线确认工作)
- 字体:`public/fonts/` 三枚 woff2(fontsource 提取,fontsource 包已卸载)
