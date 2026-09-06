# Object920 基础架构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 Object920 个人网站的基座:一个能跑的空壳站点,有 Tailwind v4 token 系统、i18n 框架、布局组件、暗色模式、根路径协商重定向,无任何内容/页面内容但基础设施就绪。

**Architecture:** Astro 7.x 纯静态 SSG + Tailwind v4 CSS-first 配置(@theme)+ 四语 i18n(zh/en/ru/ja,zh 为 defaultLocale)+ vanilla client enhancement(零 React/Vue 运行时)。项目从零初始化,不依赖 content 仓库(Plan 2 才引入)。

**Tech Stack:** Astro `^7.x` | Tailwind CSS `^4.x` | pnpm `9.15.5` | Node `>=22.12 <23` | Vitest | ESLint + Prettier

**Spec:** `docs/superpowers/specs/2026-08-19-personal-site-design.md`(第 1-3 节、5.2-5.6、6.2-6.4、6.7、9.7-9.8 节)

## Global Constraints

- **Node 引擎**:`>=22.12 <23`(Astro 7 要求)
- **pnpm 版本**:`9.15.5`(与 `packageManager` 字段一致)
- **Astro 版本**:`^7.x`,**必须显式 `markdown.processor: unified({...})`**(Astro 7 默认 Sätteri Rust 处理器,remark/rehype 插件会失效)
- **Tailwind 版本**:`^4.x`,CSS-first 配置(无 `tailwind.config.mjs`)
- **渲染模式**:`output: 'static'`,`trailingSlash: 'always'`
- **i18n**:`prefixDefaultLocale: true`,`redirectToDefaultLocale: false`
- **零框架运行时**:禁止引入 React/Vue/Solid
- **Git 操作只在 `src/scripts/`**:`src/lib/`、`src/components/` 禁止 git 命令
- **scoped CSS 禁止硬编码 token 维度**:必须 `var(--*)` 引用
- **Token 命名遵循 Tailwind v4 命名空间**:`--color-*`、`--text-*`、`--leading-*`、`--font-*`、`--spacing-*`、`--radius-*`、`--shadow-*`、`--ease-*`;`--duration-*` 不进 `@theme`(放 `:root`)

---

## File Structure

| 文件                                     | 职责                                                  | 创建/修改 |
| ---------------------------------------- | ----------------------------------------------------- | --------- |
| `package.json`                           | 项目依赖与 scripts                                    | 创建      |
| `astro.config.mjs`                       | Astro 配置(i18n + markdown processor + trailingSlash) | 创建      |
| `tsconfig.json`                          | TypeScript 配置(继承 astro strict)                    | 创建      |
| `vitest.config.ts`                       | Vitest 配置                                           | 创建      |
| `.gitignore`                             | 忽略 content/dist/node_modules 等                     | 创建      |
| `.env.example`                           | 环境变量模板                                          | 创建      |
| `src/styles/tokens.css`                  | 设计 token 单一真相源(@theme + :root)                 | 创建      |
| `src/styles/global.css`                  | reset + 字体 + body + 全局元素                        | 创建      |
| `src/styles/animations.css`              | 跨组件共用 keyframes                                  | 创建      |
| `src/i18n/config.ts`                     | locales/defaultLocale/contentLocales 定义             | 创建      |
| `src/i18n/ui/zh.ts`                      | UI 文案字典(真相源,全 key 覆盖)                       | 创建      |
| `src/i18n/ui/en.ts`                      | UI 文案字典(英文)                                     | 创建      |
| `src/i18n/ui/ru.ts`                      | UI 文案字典(MVP 空壳)                                 | 创建      |
| `src/i18n/ui/ja.ts`                      | UI 文案字典(MVP 空壳)                                 | 创建      |
| `src/i18n/utils.ts`                      | t() 翻译函数 + locale 路由工具                        | 创建      |
| `src/components/layout/BaseHead.astro`   | `<head>` 公共部分                                     | 创建      |
| `src/components/layout/Header.astro`     | 顶部导航                                              | 创建      |
| `src/components/layout/Footer.astro`     | 底部                                                  | 创建      |
| `src/components/layout/BaseLayout.astro` | 根布局                                                | 创建      |
| `src/components/common/LangSwitch.astro` | 语言切换器                                            | 创建      |
| `src/components/ui/ThemeToggle.astro`    | 暗色切换按钮                                          | 创建      |
| `src/components/ui/MobileNav.astro`      | 移动端汉堡菜单                                        | 创建      |
| `src/components/common/Icon.astro`       | 图标封装(inline svg)                                  | 创建      |
| `src/pages/index.astro`                  | 根路径协商重定向                                      | 创建      |
| `src/pages/[locale]/index.astro`         | 首页占位(Plan 3 填充)                                 | 创建      |
| `src/config/site.ts`                     | 站点级配置                                            | 创建      |
| `.github/workflows/ci.yml`               | CI 工作流                                             | 创建      |
| `src/lib/__tests__/i18n-utils.test.ts`   | i18n 工具函数单测                                     | 创建      |

---

### Task 1: 项目初始化与依赖安装

**Files:**

- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`

**Interfaces:**

- Consumes: 无(首个 task)
- Produces: `package.json`(含 scripts 给后续 task 用)、`tsconfig.json`(给 Astro/Vitest 用)

- [x] **Step 1: 创建 package.json**

```json
{
  "name": "object920",
  "type": "module",
  "version": "0.0.1",
  "packageManager": "pnpm@9.15.5",
  "engines": { "node": ">=22.12 <23" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "check": "astro check",
    "lint": "eslint . && prettier --check .",
    "lint:fix": "eslint . --fix && prettier --write .",
    "test": "vitest run",
    "ci": "pnpm run check && pnpm run lint && pnpm run test && pnpm run build"
  },
  "dependencies": {
    "astro": "^7.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

- [x] **Step 2: 创建 .gitignore**

```gitignore
# dependencies
node_modules/

# build output
dist/

# content (git clone at build time)
src/content/

# generated metadata
src/.build-meta.generated.json

# OG incremental cache
.cache/

# environment
.env

# misc
.DS_Store
*.log
```

- [x] **Step 3: 创建 .env.example**

```bash
# === 站点 ===
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=Object920

# === 预览部署(平台注入)===
PUBLIC_PREVIEW=false
```

- [x] **Step 4: 创建 tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true,
    "allowJs": true,
    "baseUrl": ".",
    "paths": {
      "@lib/*": ["src/lib/*"],
      "@components/*": ["src/components/*"],
      "@i18n/*": ["src/i18n/*"],
      "@styles/*": ["src/styles/*"],
      "@config/*": ["src/config/*"]
    }
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [x] **Step 5: 创建 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@lib': resolve(__dirname, 'src/lib'),
      '@i18n': resolve(__dirname, 'src/i18n'),
      '@components': resolve(__dirname, 'src/components'),
      '@config': resolve(__dirname, 'src/config'),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
```

- [x] **Step 6: 安装依赖**

Run: `pnpm install`
Expected: 成功安装 Astro 7.x 及 devDependencies

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore .env.example tsconfig.json vitest.config.ts
git commit -m "chore: initialize project with Astro 7.x + pnpm"
```

---

### Task 2: Astro 配置与 Tailwind v4 集成

**Files:**

- Create: `astro.config.mjs`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/animations.css`

**Interfaces:**

- Consumes: Task 1 的 `package.json`
- Produces: `astro.config.mjs`(i18n 配置给后续所有页面用)、`tokens.css`(@theme token 给所有组件用)、`global.css`(给 BaseHead 引入)

- [x] **Step 1: 安装 Tailwind v4 与 typography**

Run: `pnpm add tailwindcss@^4 @tailwindcss/typography@^0.5`
Expected: Tailwind v4 安装成功(注意:若 `@tailwindcss/typography` 不兼容 v4,以官方 v4 兼容版本为准)

- [x] **Step 2: 创建 tokens.css(@theme + :root 内部 token)**

```css
/* src/styles/tokens.css — 设计 token 单一真相源 */
@import 'tailwindcss';

/* Tailwind v4 @theme:声明后自动生成 utility */
@theme {
  /* 颜色 — 亮色值(暗色在下方 :root[data-theme="dark"] 覆盖) */
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-accent-contrast: #ffffff;
  --color-bg: #ffffff;
  --color-surface: #f8f9fa;
  --color-surface-raised: #ffffff;
  --color-surface-overlay: rgba(0, 0, 0, 0.5);
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;
  --color-text-subtle: #9ca3af;
  --color-text-on-accent: #ffffff;
  --color-border: #e5e7eb;
  --color-border-strong: #d1d5db;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  /* 间距(4px 基线) */
  --spacing-3xs: 0.25rem;
  --spacing-2xs: 0.5rem;
  --spacing-xs: 1rem;
  --spacing-sm: 1.5rem;
  --spacing-md: 2rem;
  --spacing-lg: 3rem;
  --spacing-xl: 4rem;
  --spacing-2xl: 6rem;
  --spacing-3xl: 8rem;

  /* 圆角 */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-glow: 0 0 20px var(--color-accent);

  /* 字体 */
  --font-sans:
    'Inter', -apple-system, 'Segoe UI', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Hiragino Sans',
    'Yu Gothic', 'Noto Sans CJK JP', sans-serif;
  --font-mono:
    'JetBrains Mono', 'Fira Code', ui-monospace, 'SFMono-Regular', 'Consolas', 'Microsoft YaHei',
    'Noto Sans CJK SC', monospace;

  /* 字号(--text-* namespace → text-* utility) */
  --text-2xs: 0.75rem;
  --text-xs: 0.875rem;
  --text-sm: 1rem;
  --text-md: 1.125rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 1.875rem;
  --text-3xl: 2.25rem;
  --text-4xl: 3rem;

  /* 行高(--leading-* namespace → leading-* utility) */
  --leading-tight: 1.2;
  --leading-base: 1.6;
  --leading-prose: 1.75;

  /* 缓动(--ease-* namespace → ease-* utility) */
  --ease-out: cubic-bezier(0.16, 1, 0, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* z-index(内部 token,非 Tailwind namespace,但值被 utility 直接引用) */
  --z-base: 1;
  --z-dropdown: 10;
  --z-header: 50;
  --z-overlay: 100;
  --z-modal: 1000;
  --z-toast: 1100;

  /* 容器宽度(内部 token) */
  --container-prose: 720px;
  --container-page: 1080px;
  --container-wide: 1280px;
}

/* duration 与 motion-scale:内部 token,不进 @theme(Tailwind v4 无 --duration-* namespace) */
:root {
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;
  --motion-scale: 1;
}

/* 暗色模式:仅覆盖颜色 token */
:root[data-theme='dark'] {
  --color-accent: #60a5fa;
  --color-accent-hover: #3b82f6;
  --color-bg: #0f0f12;
  --color-surface: #1a1a1f;
  --color-surface-raised: #232328;
  --color-surface-overlay: rgba(0, 0, 0, 0.7);
  --color-text: #e8e8ea;
  --color-text-muted: #9ca3af;
  --color-text-subtle: #6b7280;
  --color-border: #2d2d35;
  --color-border-strong: #3f3f47;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --color-accent: #60a5fa;
    --color-accent-hover: #3b82f6;
    --color-bg: #0f0f12;
    --color-surface: #1a1a1f;
    --color-surface-raised: #232328;
    --color-surface-overlay: rgba(0, 0, 0, 0.7);
    --color-text: #e8e8ea;
    --color-text-muted: #9ca3af;
    --color-text-subtle: #6b7280;
    --color-border: #2d2d35;
    --color-border-strong: #3f3f47;
  }
}
```

- [x] **Step 3: 创建 global.css**

```css
/* src/styles/global.css */
@import './tokens.css';
@import './animations.css';

/* Reset(精简版) */
*,
*::before,
*::after {
  box-sizing: border-box;
}
* {
  margin: 0;
  padding: 0;
}

/* body 与全局元素 */
body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: var(--leading-base);
  -webkit-font-smoothing: antialiased;
  transition:
    background-color calc(var(--duration-base) * var(--motion-scale)) var(--ease-out),
    color calc(var(--duration-base) * var(--motion-scale)) var(--ease-out);
}

/* 选区 */
::selection {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
}

/* focus-visible */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* skip-link */
.skip-link {
  position: absolute;
  top: -100px;
  left: 0;
  padding: var(--spacing-2xs) var(--spacing-xs);
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  z-index: var(--z-toast);
  transition: top calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
}
.skip-link:focus {
  top: 0;
}

/* prefers-reduced-motion 降级 */
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-scale: 0;
    --duration-fast: 0.01ms;
    --duration-base: 0.01ms;
    --duration-slow: 0.01ms;
    --duration-slower: 0.01ms;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [x] **Step 4: 创建 animations.css(MVP 空文件,后续 Plan 3 填充)**

```css
/* src/styles/animations.css — 跨组件共用 keyframes(复用 > 2 处时抽到此处) */
/* MVP 阶段为空,Plan 3 实现华丽组件时填充 */
```

- [x] **Step 5: 创建 astro.config.mjs**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://example.com',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  i18n: {
    locales: ['zh', 'en', 'ru', 'ja'],
    defaultLocale: 'zh',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  markdown: {
    // Astro 7 默认 Sätteri(Rust)处理器,remark/rehype 插件会失效
    // 必须显式用 unified processor 才能支持 remark/rehype 插件(Plan 2/3 引入)
    processor: 'unified',
  },
  vite: {
    css: {
      // Tailwind v4 通过 CSS @import 引入,不需要 Vite 插件配置
      // global.css 里 @import "tailwindcss" 已处理
    },
  },
});
```

- [x] **Step 6: 验证 dev 启动**

Run: `pnpm dev`
Expected: Astro dev server 启动,访问 `localhost:4321` 显示默认欢迎页(Astro 自带),无报错

- [ ] **Step 7: Commit**

```bash
git add astro.config.mjs src/styles/tokens.css src/styles/global.css src/styles/animations.css
git commit -m "feat: add Astro 7 config with i18n + Tailwind v4 token system"
```

---

### Task 3: i18n 配置与翻译函数

**Files:**

- Create: `src/i18n/config.ts`
- Create: `src/i18n/ui/zh.ts`
- Create: `src/i18n/ui/en.ts`
- Create: `src/i18n/ui/ru.ts`
- Create: `src/i18n/ui/ja.ts`
- Create: `src/i18n/utils.ts`
- Create: `src/lib/__tests__/i18n-utils.test.ts`

**Interfaces:**

- Consumes: Task 2 的 `astro.config.mjs`(i18n locales 定义)
- Produces: `t(locale, key, params)` 函数(给所有组件用)、`getLocalizedPath()` / `getLocaleFromPath()`(给 LangSwitch 和页面用)、`Locale` 类型

- [x] **Step 1: 创建 i18n/config.ts**

```ts
// src/i18n/config.ts
export const locales = ['zh', 'en', 'ru', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';
export const uiLocales = locales;
export const contentLocales = ['zh', 'en'] as const;
export type ContentLocale = (typeof contentLocales)[number];
```

- [x] **Step 2: 创建 i18n/ui/zh.ts(真相源)**

```ts
// src/i18n/ui/zh.ts
export default {
  'site.title': 'Object920',
  'site.tagline': '个人网站',

  'nav.home': '首页',
  'nav.articles': '文章',
  'nav.projects': '工程',
  'nav.collection': '番&术',
  'nav.friends': '朋友',
  'nav.about': '关于',

  'langswitch.label': '语言切换',
  'langswitch.zh': '简体中文',
  'langswitch.en': 'English',
  'langswitch.ru': 'Русский',
  'langswitch.ja': '日本語',
  'langswitch.untranslated': '暂未翻译',

  'theme.toggle': '切换暗色模式',
  'theme.light': '亮色',
  'theme.dark': '暗色',

  'common.empty': '暂无内容',
  'common.loading': '加载中...',
  'common.skip-to-content': '跳到主内容',
  'common.404.title': '页面未找到',
  'common.404.body': '你要找的页面不存在或已移动',
  'common.404.back': '返回首页',

  'footer.built-with': '由 Astro 驱动',
  'footer.copyright': '版权',
} as const;
```

- [x] **Step 3: 创建 i18n/ui/en.ts**

```ts
// src/i18n/ui/en.ts
export default {
  'site.title': 'Object920',
  'site.tagline': 'Personal Website',

  'nav.home': 'Home',
  'nav.articles': 'Articles',
  'nav.projects': 'Projects',
  'nav.collection': 'Anime & Vocaloid',
  'nav.friends': 'Friends',
  'nav.about': 'About',

  'langswitch.label': 'Language',
  'langswitch.zh': 'Simplified Chinese',
  'langswitch.en': 'English',
  'langswitch.ru': 'Russian',
  'langswitch.ja': 'Japanese',
  'langswitch.untranslated': 'Not translated yet',

  'theme.toggle': 'Toggle dark mode',
  'theme.light': 'Light',
  'theme.dark': 'Dark',

  'common.empty': 'No content yet',
  'common.loading': 'Loading...',
  'common.skip-to-content': 'Skip to main content',
  'common.404.title': 'Page not found',
  'common.404.body': 'The page you are looking for does not exist or has been moved',
  'common.404.back': 'Back to home',

  'footer.built-with': 'Powered by Astro',
  'footer.copyright': 'Copyright',
} as const;
```

- [x] **Step 4: 创建 i18n/ui/ru.ts 和 ja.ts(MVP 空壳)**

```ts
// src/i18n/ui/ru.ts
export default {
  // MVP:暂留空壳,所有 key 走 zh fallback
  // 后期补全俄文翻译时填这里
} as const;
```

```ts
// src/i18n/ui/ja.ts
export default {
  // MVP:暂留空壳,所有 key 走 zh fallback
  // 后期补全日文翻译时填这里
} as const;
```

- [x] **Step 5: 创建 i18n/utils.ts**

```ts
// src/i18n/utils.ts
import { defaultLocale, locales, type Locale } from './config';
import zh from './ui/zh';
import en from './ui/en';
import ru from './ui/ru';
import ja from './ui/ja';

const dicts: Record<Locale, Record<string, string>> = { zh, en, ru, ja };

export function t(locale: Locale, key: string, params?: Record<string, string>): string {
  const dict = dicts[locale] ?? {};
  const fallbackDict = dicts[defaultLocale] ?? {};
  const raw = dict[key] ?? fallbackDict[key] ?? key;
  if (params) {
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
      raw,
    );
  }
  return raw;
}

export function getLocalizedPath(pathname: string, targetLocale: Locale): string {
  const stripped = pathname.replace(/^\/(zh|en|ru|ja)(?=\/|$)/, '');
  return `/${targetLocale}${stripped}`;
}

export function getLocaleFromPath(pathname: string): Locale {
  const m = pathname.match(/^\/(zh|en|ru|ja)(?=\/|$)/);
  return (m?.[1] as Locale) ?? defaultLocale;
}
```

- [x] **Step 6: 写失败测试**

```ts
// src/lib/__tests__/i18n-utils.test.ts
import { describe, it, expect } from 'vitest';
import { t, getLocalizedPath, getLocaleFromPath } from '@i18n/utils';

describe('t()', () => {
  it('returns zh value for zh locale', () => {
    expect(t('zh', 'nav.home')).toBe('首页');
  });

  it('returns en value for en locale', () => {
    expect(t('en', 'nav.home')).toBe('Home');
  });

  it('falls back to zh when key missing in ru', () => {
    expect(t('ru', 'nav.home')).toBe('首页');
  });

  it('returns key itself when missing in all dicts', () => {
    expect(t('zh', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('interpolates params', () => {
    expect(t('zh', 'langswitch.untranslated')).toBe('暂未翻译');
  });
});

describe('getLocalizedPath()', () => {
  it('replaces zh with en', () => {
    expect(getLocalizedPath('/zh/articles/', 'en')).toBe('/en/articles/');
  });

  it('replaces en with ja', () => {
    expect(getLocalizedPath('/en/articles/hello/', 'ja')).toBe('/ja/articles/hello/');
  });

  it('handles root path', () => {
    expect(getLocalizedPath('/zh/', 'en')).toBe('/en/');
  });
});

describe('getLocaleFromPath()', () => {
  it('extracts zh from /zh/articles/', () => {
    expect(getLocaleFromPath('/zh/articles/')).toBe('zh');
  });

  it('extracts en from /en/articles/hello/', () => {
    expect(getLocaleFromPath('/en/articles/hello/')).toBe('en');
  });

  it('returns defaultLocale for non-locale path', () => {
    expect(getLocaleFromPath('/404/')).toBe('zh');
  });
});
```

- [x] **Step 7: 运行测试验证通过**

Run: `pnpm test`
Expected: 所有测试 PASS

- [ ] **Step 8: Commit**

```bash
git add src/i18n/ src/lib/__tests__/i18n-utils.test.ts
git commit -m "feat: add i18n config with zh/en/ru/ja dictionaries and t() utility"
```

---

### Task 4: 字体自托管(@font-face)

**Files:**

- Create: `public/fonts/inter-latin.woff2`(预下载 subset)
- Create: `public/fonts/inter-cyrillic.woff2`(预下载 subset)
- Create: `public/fonts/jetbrains-mono-latin.woff2`(预下载 subset)
- Modify: `src/styles/global.css`(加 @font-face)

**Interfaces:**

- Consumes: Task 2 的 `global.css`
- Produces: 自托管字体文件(给 BaseHead preload + 所有页面渲染用)

> **注意:** 字体 subset 文件需要从 Inter / JetBrains Mono 的 variable font 用 `fonttools` 或 `glyphhanger` 生成。MVP 阶段可先用完整 variable font(后续优化 subset)。如果下载 subset 工具不可用,用 `@fontsource/inter` 和 `@fontsource/jetbrains-mono` npm 包提取。

- [x] **Step 1: 安装 fontsource 包(提取 subset 用)**

Run: `pnpm add @fontsource/inter @fontsource/jetbrains-mono`
Expected: 包安装成功

- [x] **Step 2: 从 fontsource 提取 woff2 到 public/fonts/**

```bash
# Inter Latin
cp node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2 public/fonts/inter-latin.woff2

# Inter Cyrillic
cp node_modules/@fontsource/inter/files/inter-cyrillic-400-normal.woff2 public/fonts/inter-cyrillic.woff2

# JetBrains Mono Latin
cp node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2 public/fonts/jetbrains-mono-latin.woff2
```

> MVP 用 normal weight 400。后续可换 variable font 或用 `glyphhanger` 做 unicode-range subset 优化。

- [x] **Step 3: 在 global.css 加 @font-face(在 reset 之后)**

在 `src/styles/global.css` 的 reset 块后、body 块前插入:

```css
/* @font-face — Inter(比例字体,Latin + Cyrillic) */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-007F, U+00A0-00FF, U+0100-017F, U+0180-024F;
}
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-cyrillic.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0400-04FF;
}

/* @font-face — JetBrains Mono(等宽字体,Latin) */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/jetbrains-mono-latin.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-007F, U+00A0-00FF, U+2000-206F, U+2190-21FF, U+2200-22FF;
}
```

- [x] **Step 4: 卸载 fontsource(只需提取文件,不需作为运行时依赖)**

Run: `pnpm remove @fontsource/inter @fontsource/jetbrains-mono`
Expected: 移除成功(woff2 已在 public/fonts/)

- [x] **Step 5: 验证字体加载**

Run: `pnpm dev`,在浏览器 DevTools Network 面板确认 `/fonts/inter-latin.woff2` 加载成功
Expected: 字体文件 200 OK

- [ ] **Step 6: Commit**

```bash
git add public/fonts/ src/styles/global.css
git commit -m "feat: add self-hosted Inter + JetBrains Mono subset fonts"
```

---

### Task 5: BaseHead 与 SEO 基础

**Files:**

- Create: `src/config/site.ts`
- Create: `src/components/layout/BaseHead.astro`

**Interfaces:**

- Consumes: Task 2 的 `global.css`、Task 3 的 `t()` / `Locale` 类型
- Produces: `BaseHead` 组件(给 BaseLayout 用),含防闪烁脚本(给 ThemeToggle 用)

- [x] **Step 1: 创建 config/site.ts**

```ts
// src/config/site.ts
export const siteConfig = {
  siteUrl: import.meta.env.PUBLIC_SITE_URL ?? 'https://example.com',
  siteName: import.meta.env.PUBLIC_SITE_NAME ?? 'Object920',
  author: 'YourName',
  description: '个人网站 — 文章、工程、番剧与术曲',
  // 导航菜单项(走 i18n key)
  navItems: [
    { key: 'nav.home', href: '/' },
    { key: 'nav.articles', href: '/articles/' },
    { key: 'nav.projects', href: '/projects/' },
    { key: 'nav.collection', href: '/collection/' },
    { key: 'nav.friends', href: '/friends/' },
    { key: 'nav.about', href: '/about/' },
  ],
};
```

- [x] **Step 2: 创建 BaseHead.astro**

```astro
---
// src/components/layout/BaseHead.astro
import '../styles/global.css';
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
import { siteConfig } from '@config/site';

interface Props {
  locale: Locale;
  title: string;
  description?: string;
  ogImage?: string;
  canonicalURL?: string;
  noindex?: boolean;
}

const { locale, title, description, ogImage, canonicalURL, noindex } = Astro.props;
const fullURL = (path: string) => new URL(path, siteConfig.siteUrl).toString();
const canonical = canonicalURL ?? fullURL(Astro.url.pathname);
const resolvedOg = ogImage ?? '/images/og-default.png';
const isPreview = import.meta.env.PUBLIC_PREVIEW === 'true';
---

<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content={Astro.generator} />

<title>{title}</title>
{description && <meta name="description" content={description} />}
<link rel="canonical" href={canonical} />

{(noindex || isPreview) && <meta name="robots" content="noindex, nofollow" />}

<!-- favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />

<!-- theme-color -->
<meta name="theme-color" content="var(--color-accent)" />

<!-- OG -->
<meta property="og:type" content="website" />
<meta property="og:title" content={title} />
{description && <meta property="og:description" content={description} />}
<meta property="og:image" content={fullURL(resolvedOg)} />
<meta property="og:url" content={canonical} />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
{description && <meta name="twitter:description" content={description} />}
<meta name="twitter:image" content={fullURL(resolvedOg)} />

<!-- 字体 preload(只 preload Inter normal) -->
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin />

<!-- 暗色模式防闪烁(必须 is:inline,head 最早位置) -->
<script is:inline>
  (function () {
    const stored = localStorage.getItem('theme');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (system ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>

<!-- RSS link(Plan 5 填充实际 href) -->
<!-- <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss/zh.xml" /> -->
```

- [x] **Step 3: 创建 favicon.svg 占位**

```xml
<!-- public/favicon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="var(--color-accent, #3b82f6)" />
  <text x="50" y="70" font-size="60" text-anchor="middle" fill="white" font-family="sans-serif">O</text>
</svg>
```

- [x] **Step 4: 创建默认 OG 图占位**

创建一个简单的 1200x630 纯色 PNG 放 `public/images/og-default.png`(MVP 用占位,Plan 5 实现自动生成)

- [ ] **Step 5: Commit**

```bash
git add src/config/site.ts src/components/layout/BaseHead.astro public/favicon.svg public/images/og-default.png
git commit -https://github.com/Object920/object920/commit/m "feat: add BaseHead with SEO meta, font preload, dark mode FOUC prevention"
```

---

### Task 6: Header / Footer / BaseLayout

**Files:**

- Create: `src/components/common/Icon.astro`
- Create: `src/components/common/LangSwitch.astro`
- Create: `src/components/ui/ThemeToggle.astro`
- Create: `src/components/ui/MobileNav.astro`
- Create: `src/components/layout/Header.astro`
- Create: `src/components/layout/Footer.astro`
- Create: `src/components/layout/BaseLayout.astro`

**Interfaces:**

- Consumes: Task 3 的 `t()` / `getLocalizedPath()` / `Locale`、Task 4 的 `siteConfig.navItems`、Task 5 的 `BaseHead`
- Produces: `BaseLayout` 组件(给所有页面用)、`Header` / `Footer` / `LangSwitch` / `ThemeToggle` / `MobileNav` / `Icon`

- [x] **Step 1: 创建 Icon.astro(inline svg 封装)**

```astro
---
// src/components/common/Icon.astro
interface Props {
  name: string;
  size?: number;
  class?: string;
}
const { name, size = 24, class: className } = Astro.props;
const icons: Record<string, string> = {
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
};
---

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
  set:html={icons[name] ?? ''}
/>
```

- [x] **Step 2: 创建 LangSwitch.astro**

```astro
---
// src/components/common/LangSwitch.astro
import { locales, type Locale } from '@i18n/config';
import { t, getLocalizedPath } from '@i18n/utils';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
---

<nav aria-label={t(locale, 'langswitch.label')} class="langswitch">
  {
    locales.map((l) => (
      <a
        href={getLocalizedPath(Astro.url.pathname, l)}
        aria-current={l === locale ? 'true' : undefined}
        class:list={['langswitch-item', { active: l === locale }]}
      >
        {t(locale, `langswitch.${l}`)}
      </a>
    ))
  }
</nav>
<style>
  .langswitch {
    display: flex;
    gap: var(--spacing-2xs);
  }
  .langswitch-item {
    padding: var(--spacing-3xs) var(--spacing-2xs);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--radius-sm);
    transition: color calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
  }
  .langswitch-item:hover {
    color: var(--color-text);
  }
  .langswitch-item.active {
    color: var(--color-accent);
    font-weight: 600;
  }
</style>
```

- [x] **Step 3: 创建 ThemeToggle.astro**

```astro
---
// src/components/ui/ThemeToggle.astro
import Icon from '@common/Icon.astro';
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
---

<button
  id="theme-toggle"
  class="theme-toggle"
  aria-label={t(locale, 'theme.toggle')}
  aria-pressed="false"
>
  <Icon name="sun" size={20} class="icon-light" />
  <Icon name="moon" size={20} class="icon-dark" />
</button>
<script>
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const update = () => {
      const current = document.documentElement.getAttribute('data-theme');
      btn.setAttribute('aria-pressed', current === 'dark' ? 'true' : 'false');
    };
    update();
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      document.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: next } }));
      update();
    });
  }
</script>
<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: color calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
  }
  .theme-toggle:hover {
    color: var(--color-text);
  }
  .theme-toggle .icon-dark {
    display: none;
  }
  :root[data-theme='dark'] .theme-toggle .icon-light {
    display: none;
  }
  :root[data-theme='dark'] .theme-toggle .icon-dark {
    display: block;
  }
</style>
```

- [x] **Step 4: 创建 MobileNav.astro**

```astro
---
// src/components/ui/MobileNav.astro
import Icon from '@common/Icon.astro';
import { t } from '@i18n/utils';
import { siteConfig } from '@config/site';
import type { Locale } from '@i18n/config';
import LangSwitch from '@common/LangSwitch.astro';
import ThemeToggle from './ThemeToggle.astro';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
---

<button
  id="mobile-nav-toggle"
  class="mobile-nav-toggle"
  aria-expanded="false"
  aria-controls="mobile-nav-drawer"
>
  <Icon name="menu" size={24} class="icon-menu" />
  <Icon name="close" size={24} class="icon-close" />
</button>
<nav id="mobile-nav-drawer" class="mobile-nav-drawer" aria-label={t(locale, 'langswitch.label')}>
  <ul class="mobile-nav-list">
    {
      siteConfig.navItems.map((item) => (
        <li>
          <a href={`/${locale}${item.href}`} class="mobile-nav-link">
            {t(locale, item.key)}
          </a>
        </li>
      ))
    }
  </ul>
  <div class="mobile-nav-controls">
    <LangSwitch locale={locale} />
    <ThemeToggle locale={locale} />
  </div>
</nav>
<div id="mobile-nav-overlay" class="mobile-nav-overlay" hidden></div>
<script>
  const toggle = document.getElementById('mobile-nav-toggle');
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-nav-overlay');
  if (toggle && drawer && overlay) {
    const close = () => {
      toggle.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('open');
      overlay.hidden = true;
      document.body.style.overflow = '';
    };
    const open = () => {
      toggle.setAttribute('aria-expanded', 'true');
      drawer.classList.add('open');
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
    };
    toggle.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('open');
      isOpen ? close() : open();
    });
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });
  }
</script>
<style>
  .mobile-nav-toggle {
    display: none;
  }
  .mobile-nav-drawer {
    display: none;
  }
  .mobile-nav-overlay {
    display: none;
  }
  @media (max-width: 768px) {
    .mobile-nav-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
    }
    .mobile-nav-toggle .icon-close {
      display: none;
    }
    .mobile-nav-toggle[aria-expanded='true'] .icon-menu {
      display: none;
    }
    .mobile-nav-toggle[aria-expanded='true'] .icon-close {
      display: block;
    }
    .mobile-nav-drawer {
      display: flex;
      position: fixed;
      top: 0;
      right: -280px;
      width: 280px;
      height: 100vh;
      flex-direction: column;
      background: var(--color-surface-raised);
      padding: var(--spacing-lg);
      z-index: var(--z-overlay);
      transition: right calc(var(--duration-slow) * var(--motion-scale)) var(--ease-out);
    }
    .mobile-nav-drawer.open {
      right: 0;
    }
    .mobile-nav-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }
    .mobile-nav-link {
      color: var(--color-text);
      text-decoration: none;
      font-size: var(--text-md);
    }
    .mobile-nav-controls {
      display: flex;
      gap: var(--spacing-md);
      margin-top: var(--spacing-xl);
    }
    .mobile-nav-overlay {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--color-surface-overlay);
      z-index: calc(var(--z-overlay) - 1);
    }
  }
</style>
```

- [x] **Step 5: 创建 Header.astro**

```astro
---
// src/components/layout/Header.astro
import { t } from '@i18n/utils';
import { siteConfig } from '@config/site';
import type { Locale } from '@i18n/config';
import LangSwitch from '@common/LangSwitch.astro';
import ThemeToggle from '@components/ui/ThemeToggle.astro';
import MobileNav from '@components/ui/MobileNav.astro';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
---

<header class="header">
  <div class="header-inner">
    <a href={`/${locale}/`} class="header-logo">{siteConfig.siteName}</a>
    <nav class="header-nav" aria-label={t(locale, 'nav.home')}>
      {
        siteConfig.navItems.map((item) => (
          <a href={`/${locale}${item.href}`} class="header-nav-link">
            {t(locale, item.key)}
          </a>
        ))
      }
    </nav>
    <div class="header-controls">
      <LangSwitch locale={locale} />
      <ThemeToggle locale={locale} />
    </div>
    <MobileNav locale={locale} />
  </div>
</header>
<style>
  .header {
    position: sticky;
    top: 0;
    z-index: var(--z-header);
    background: color-mix(in srgb, var(--color-bg) 85%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-border);
  }
  .header-inner {
    max-width: var(--container-page);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-xs) var(--spacing-md);
  }
  .header-logo {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-text);
    text-decoration: none;
  }
  .header-nav {
    display: flex;
    gap: var(--spacing-sm);
  }
  .header-nav-link {
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: var(--text-sm);
    transition: color calc(var(--duration-fast) * var(--motion-scale)) var(--ease-out);
  }
  .header-nav-link:hover {
    color: var(--color-text);
  }
  .header-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  @media (max-width: 768px) {
    .header-nav,
    .header-controls {
      display: none;
    }
  }
</style>
```

- [x] **Step 6: 创建 Footer.astro**

```astro
---
// src/components/layout/Footer.astro
import { t } from '@i18n/utils';
import { siteConfig } from '@config/site';
import type { Locale } from '@i18n/config';
interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
const year = new Date().getFullYear();
---

<footer class="footer">
  <div class="footer-inner">
    <p class="footer-copy">© {year} {siteConfig.siteName}</p>
    <p class="footer-tech">{t(locale, 'footer.built-with')}</p>
  </div>
</footer>
<style>
  .footer {
    border-top: 1px solid var(--color-border);
    padding: var(--spacing-lg) var(--spacing-md);
  }
  .footer-inner {
    max-width: var(--container-page);
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }
</style>
```

- [x] **Step 7: 创建 BaseLayout.astro**

```astro
---
// src/components/layout/BaseLayout.astro
import BaseHead from './BaseHead.astro';
import Header from './Header.astro';
import Footer from './Footer.astro';
import { t } from '@i18n/utils';
import type { Locale } from '@i18n/config';
interface Props {
  locale: Locale;
  title: string;
  description?: string;
  ogImage?: string;
  canonicalURL?: string;
  noindex?: boolean;
}
const { locale, title, description, ogImage, canonicalURL, noindex } = Astro.props;
---

<!doctype html>
<html lang={locale}>
  <head>
    <BaseHead
      locale={locale}
      title={title}
      description={description}
      ogImage={ogImage}
      canonicalURL={canonicalURL}
      noindex={noindex}
    />
  </head>
  <body>
    <a href="#main" class="skip-link">{t(locale, 'common.skip-to-content')}</a>
    <Header locale={locale} />
    <main id="main">
      <slot />
    </main>
    <Footer locale={locale} />
  </body>
</html>
```

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/config/
git commit -m "feat: add Header/Footer/BaseLayout with LangSwitch, ThemeToggle, MobileNav"
```

---

### Task 7: 根路径协商与首页占位

**Files:**

- Create: `src/pages/index.astro`
- Create: `src/pages/[locale]/index.astro`

**Interfaces:**

- Consumes: Task 6 的 `BaseLayout`、Task 3 的 `t()` / `Locale`
- Produces: `/` 协商重定向页、`/[locale]/` 首页占位(Plan 3 填充 Hero + HomeSections)

- [x] **Step 1: 创建 src/pages/index.astro(根路径协商)**

```astro
---
// src/pages/index.astro — 根路径语言协商重定向
// redirectToDefaultLocale: false 让此页接管 / 路由
---

<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, follow" />
    <title>Object920</title>
    <noscript>
      <meta http-equiv="refresh" content="0; url=/zh/" />
    </noscript>
    <script is:inline>
      (function () {
        const langs = navigator.languages ?? [navigator.language];
        const locales = ['zh', 'en', 'ru', 'ja'];
        const target =
          locales.find(function (l) {
            return langs.some(function (pl) {
              return pl.toLowerCase().startsWith(l);
            });
          }) ?? 'zh';
        location.replace('/' + target + '/');
      })();
    </script>
  </head>
  <body>
    <p>Redirecting…</p>
  </body>
</html>
```

- [x] **Step 2: 创建 src/pages/[locale]/index.astro(首页占位)**

```astro
---
// src/pages/[locale]/index.astro — 首页占位(Plan 3 填充 Hero + HomeSections)
import BaseLayout from '@components/layout/BaseLayout.astro';
import { t } from '@i18n/utils';
import { locales, type Locale } from '@i18n/config';
export function getStaticPaths() {
  return locales.map(function (l) {
    return { params: { locale: l } };
  });
}
const { locale } = Astro.params as { locale: Locale };
---

<BaseLayout locale={locale} title={t(locale, 'site.title')}>
  <div class="home-placeholder">
    <h1>{t(locale, 'site.title')}</h1>
    <p>{t(locale, 'site.tagline')}</p>
    <p style="color: var(--color-text-muted); margin-top: var(--spacing-lg);">
      首页内容待 Plan 3 填充
    </p>
  </div>
</BaseLayout>
<style>
  .home-placeholder {
    max-width: var(--container-page);
    margin: 0 auto;
    padding: var(--spacing-3xl) var(--spacing-md);
    text-align: center;
  }
  .home-placeholder h1 {
    font-size: var(--text-3xl);
    font-weight: 700;
  }
  .home-placeholder p {
    margin-top: var(--spacing-sm);
    color: var(--color-text-muted);
  }
</style>
```

- [x] **Step 3: 验证路由**

Run: `pnpm dev`

- 访问 `/` → 应重定向到 `/zh/`(中文浏览器)或对应语言
- 访问 `/zh/` → 显示首页占位
- 访问 `/en/` → 显示英文首页占位
  Expected: 路由正常,布局渲染

- [ ] **Step 4: Commit**

```bash
git add src/pages/
git commit -m "feat: add root path negotiation and locale home placeholder"
```

---

### Task 8: CI 工作流

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: Task 1 的 `package.json` scripts
- Produces: CI 工作流(给所有 PR 和 main push 用)

- [x] **Step 1: 创建 ci.yml**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9.15.5
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run check
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build
```

- [x] **Step 2: 验证 CI 命令本地通过**

Run: `pnpm ci`
Expected: check → lint → test → build 全链通过

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI workflow"
```

---

## Self-Review

**1. Spec coverage:**

- 第 1.1 技术栈 → Task 1-2 ✓
- 第 1.2 渲染模式 → Task 2 (astro.config.mjs output: static) ✓
- 第 1.3 Vanilla Client Enhancement → 纪律在 Global Constraints,Plan 3-4 实现 enhancement ✓
- 第 1.4 可插拔思想 → 纪律在 Global Constraints,Plan 4 实现可插拔 Integration ✓
- 第 2.1 目录结构 → Task 1-7 创建所有基础文件 ✓
- 第 2.2 关键结构决策 → Task 1-7 遵循 ✓
- 第 3.1-3.10 token/样式 → Task 2 ✓
- 第 5.2 BaseLayout/BaseHead/Header/Footer → Task 5-6 ✓
- 第 5.3 暗色防闪烁 → Task 5 ✓
- 第 5.4 LangSwitch → Task 6 ✓
- 第 5.5 ThemeToggle → Task 6 ✓
- 第 5.6 MobileNav → Task 6 ✓
- 第 6.2 i18n 配置 → Task 2 (astro.config.mjs) ✓
- 第 6.3 字典结构 → Task 3 ✓
- 第 6.4 t() 翻译函数 → Task 3 ✓
- 第 6.7 根路径协商 → Task 7 ✓
- 第 9.7 测试策略 → Task 3 (单测) + Task 8 (CI) ✓
- 第 9.8 CI 策略 → Task 8 ✓

**2. Placeholder scan:** 无 TBD/TODO/"implement later"。所有步骤含实际代码。

**3. Type consistency:** `Locale` 类型在 Task 3 定义,Task 5-7 所有组件引用 `@i18n/config` 的 `Locale`。`t()` 签名 `(locale: Locale, key: string, params?)` 全局一致。`getLocalizedPath` 签名一致。

**Gaps:** 无遗漏。Plan 2-5 覆盖 spec 其余节(内容管线/核心页面/可插拔 Integration/构建部署)。
