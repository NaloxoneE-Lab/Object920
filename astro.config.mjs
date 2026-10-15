// astro.config.mjs
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { rehypeArticleImage } from './src/lib/rehype-article-image.ts';
import { rehypeCodeblock } from './src/lib/rehype-codeblock.ts';
import { rehypeStripComments } from './src/lib/rehype-strip-comments.ts';
import tailwindcss from '@tailwindcss/vite';

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
      remarkPlugins: [remarkMath],
      // rehypeStripComments 必须最先:正文里的 HTML 注释在 rehypeRaw 之前还是 raw 节点,
      // 先摘掉才能保证注释既不进页面源码,也不会让 rehypeArticleImage 误判段落「含图片以外的内容」
      // KaTeX 必须先于代码块插件:块级公式在 hast 里是 pre>code.language-math,
      // 先让 rehype-katex 整块替换掉,否则会被代码块装饰层套上 MATH 标签卡
      rehypePlugins: [rehypeStripComments, rehypeArticleImage, rehypeKatex, rehypeCodeblock],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
  vite: {
    // Tailwind v4 官方接入方式:@tailwindcss/vite 插件处理 tokens.css 里的 @import "tailwindcss"
    // (计划中"不需要 Vite 插件"的说法有误——无插件时 @import 会被内置 postcss-import 抢先解析而报 ENOENT)
    plugins: [tailwindcss()],
  },
});
