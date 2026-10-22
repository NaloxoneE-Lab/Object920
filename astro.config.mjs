// astro.config.mjs
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { rehypeArticleImage } from './src/lib/rehype-article-image.ts';
import { rehypeCodeblock } from './src/lib/rehype-codeblock.ts';
import { rehypeStripComments } from './src/lib/rehype-strip-comments.ts';
import { rehypeTableScroll } from './src/lib/rehype-table-scroll.ts';
import { remarkDefaultLang } from './src/lib/remark-default-lang.ts';
import tailwindcss from '@tailwindcss/vite';

// 把围栏 meta 里的文件名搬到 pre 上(如 ```ts title="src/a.ts")。
// 为什么必须在 Shiki 这一层做:Shiki 会整块替换 pre,remark 阶段写在 hProperties 上的
// 属性会被丢掉;而 meta 字符串只有 transformer 能拿到(this.options.meta.__raw)。
// rehype-codeblock 再读 pre 的 data-filename 决定显示图标 + 文件名。
const codeMetaTransformer = {
  name: 'code-meta-filename',
  pre(node) {
    const raw = this.options?.meta?.__raw ?? '';
    const m = raw.match(/(?:title|filename)=["']([^"']+)["']/);
    if (m) node.properties.dataFilename = m[1];
  },
};

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
    // Astro 7 默认 Sätteri(Rust)处理器,remark/rehype 插件会失效;
    // 必须显式使用 unified processor(来自 @astrojs/markdown-remark,直接依赖)
    // 插件顺序纪律(spec 7.2.2):图片插件先于代码块插件
    processor: unified({
      // remarkDefaultLang 必须在 Shiki 之前把「没写语言的围栏」补成 text:
      // Shiki 的语言取值是 `language-* || "plaintext"`,不补的话无语言标记与未知语言
      // 在 rehype 阶段无法区分(两者都是 plaintext),代码块标签就分不出 TEXT 与 PLAINTEXT
      remarkPlugins: [remarkDefaultLang, remarkMath],
      // rehypeStripComments 必须最先:正文里的 HTML 注释在 rehypeRaw 之前还是 raw 节点,
      // 先摘掉才能保证注释既不进页面源码,也不会让 rehypeArticleImage 误判段落「含图片以外的内容」
      // KaTeX 必须先于代码块插件:块级公式在 hast 里是 pre>code.language-math,
      // 先让 rehype-katex 整块替换掉,否则会被代码块装饰层套上 MATH 标签卡
      // rehypeTableScroll 放最后:它递归全树给每个 table 套滚动容器,不产生 pre/公式节点,
      // 也不需要看见任何中间形态——放在最后可以覆盖到前面所有插件(含 rehypeRaw)产出的表格
      rehypePlugins: [
        rehypeStripComments,
        rehypeArticleImage,
        rehypeKatex,
        rehypeCodeblock,
        rehypeTableScroll,
      ],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      // defaultColor: false —— Shiki 只输出 --shiki-light / --shiki-dark 两个变量,
      // 不再往元素上写内联 color / background-color。主题切换纯 CSS,
      // 也就不再需要 !important 去压行内样式(2026-10-21)
      defaultColor: false,
      // wrap 关掉:代码块默认横向滚动,长行不折;「自动换行」改由代码块上的开关控制。
      // 开着 wrap 时 Shiki 会把 white-space: pre-wrap 写成内联样式,那会压过类切换
      wrap: false,
      // 围栏里的文件名(```ts title="src/a.ts")→ pre[data-filename]
      transformers: [codeMetaTransformer],
    },
  },
  vite: {
    // Tailwind v4 官方接入方式:@tailwindcss/vite 插件处理 tokens.css 里的 @import "tailwindcss"
    // (计划中"不需要 Vite 插件"的说法有误——无插件时 @import 会被内置 postcss-import 抢先解析而报 ENOENT)
    plugins: [tailwindcss()],
  },
});
