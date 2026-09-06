// astro.config.mjs
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { rehypeArticleImage } from './src/lib/rehype-article-image.ts';
import { rehypeCodeblock } from './src/lib/rehype-codeblock.ts';
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
      remarkPlugins: [],
      rehypePlugins: [rehypeArticleImage, rehypeCodeblock],
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
