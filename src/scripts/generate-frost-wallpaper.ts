// src/scripts/generate-frost-wallpaper.ts
// 构建期磨砂壁纸:首页第二屏磨砂层不用 backdrop-filter(全视口逐帧重采样重模糊,
// 动画期开销大),改用"预糊壁纸"——构建期把壁纸缩小 + 高斯糊成一张几十 KB 的底图,
// 运行时整层只做 opacity 渐显(纯合成器动画)。
// 输出 public/generated-frost/frost-wallpaper.webp(gitignore),组件按固定路径引用;
// 源图内容 + 参数的 sha1 指纹存 .cache/frost-wallpaper.hash,未变化即跳过(幂等,挂 predev/prebuild)。
// 未配置壁纸 / 远程壁纸 / 源文件缺失时跳过:磨砂层退化为纯着色,观感可接受。

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getSiteConfig } from '../config/site';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

// 糊化参数:输出图会被浏览器拉伸铺满视口(720w @ 1080p+ 约 2.7 倍放大),
// sigma 3 折算到屏幕 ≈ 8px,对齐旧 backdrop-filter: blur(8px) 的观感(CSS blur
// 半径即高斯 σ);改参数即自动重生成(指纹含参数)
const PARAMS = { width: 720, sigma: 3, quality: 70 } as const;

async function main(): Promise<void> {
  const src = getSiteConfig().background;
  if (!src) {
    console.log('[frost-wallpaper] 未配置全站壁纸,跳过(磨砂层退化为纯着色)');
    return;
  }
  if (/^https?:\/\//.test(src)) {
    console.warn(`[frost-wallpaper] 壁纸是远程 URL(${src}),构建期不拉取,跳过预糊`);
    return;
  }
  const srcPath = resolve(projectRoot, 'public', src.replace(/^\//, ''));
  if (!existsSync(srcPath)) {
    console.warn(`[frost-wallpaper] 壁纸文件不存在(${srcPath}),跳过预糊`);
    return;
  }

  const hash = createHash('sha1')
    .update(readFileSync(srcPath))
    .update(JSON.stringify(PARAMS))
    .digest('hex')
    .slice(0, 12);
  const outDir = resolve(projectRoot, 'public', 'generated-frost');
  const outPath = resolve(outDir, 'frost-wallpaper.webp');
  const cachePath = resolve(projectRoot, '.cache', 'frost-wallpaper.hash');

  if (
    existsSync(outPath) &&
    existsSync(cachePath) &&
    readFileSync(cachePath, 'utf8').trim() === hash
  ) {
    console.log('[frost-wallpaper] 指纹未变化,跳过');
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const info = await sharp(srcPath)
    .resize({ width: PARAMS.width, withoutEnlargement: true })
    .blur(PARAMS.sigma)
    .webp({ quality: PARAMS.quality })
    .toFile(outPath);
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, hash);
  console.log(`[frost-wallpaper] 生成 ${outPath}(${(info.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('[frost-wallpaper] 生成失败:', err);
  process.exit(1);
});
