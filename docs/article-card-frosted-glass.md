# Object920 — 首页文章卡悬停"磨砂玻璃"效果(路线 B)总结

| 项 | 值 |
|---|---|
| 影响文件 | `src/components/home/HomeArticleList.astro`(主要) |
| 基线 | 2026-10-05 提交 `288ee21`(文章卡双图扫入实验基线) |
| 状态 | **视觉已定稿**;`astro check` 0 errors |
| 路线 | 架构对比后选定**路线 B**(运行时 `backdrop-filter` 真磨砂玻璃) |
| 遗留 | 路线 A 构建期 Glass Preview 的相关文件尚未清理(见 §7) |

---

## 1. 概述

首页文章卡片(`HomeArticleList`)的悬停效果,从"模拟磨砂"迭代为**真正的磨砂玻璃**:悬停时一块实时 `backdrop-filter` 的磨砂玻璃**从左向右推入**遮盖封面,玻璃上浮现正文开头 120 字。本阶段对路线 B 做了多轮视觉调参,逐步修掉"推入到位后右缘颜色不均""标题区与封面区分界生硬""磨砂前端与前沿渐变分界明显"等问题,并把推入速度定稿为比原基准(600ms)稍快的 400ms。

## 2. 需求确认(用户逐轮拍板)

- **玻璃本体**:悬停时封面被一块磨砂玻璃盖住
- **玻璃上承载**:正文开头 120 字 + 封面色彩的微弱痕迹(非纯灰板,也非"糊照片上蒙层纱")
- **入场手感**:磨砂玻璃**从左向右推入**,前沿是柔和玻璃边(不是"瞬间全虚")
- **文字来源**:正文开头截 120 字(`bodyPreview`),不取 `excerpt` 摘要字段

## 3. 架构路线对比(B 胜出)

| 路线 | 说明 | 结论 |
|---|---|---|
| A | 构建期用 sharp 生成"玻璃代理图",运行时纯 `transform` 滑入 | 逐像素可控、零运行时成本;但每封面一份资产,且"玻璃长相"预烘焙 |
| **B(选中)** | 运行时 `backdrop-filter: blur() saturate() brightness()` 糊化活封面 + `color-mix` 雾面 tint | **最"真"的玻璃**,糊的永远是背后实际那张图、无构建耦合;代价是"均匀玻璃"不如 A 可控 |
| C | 运行时 CSS `filter` 糊复制的 `<img>` | 仍做不到逐像素均匀,弃 |
| D | 运行时 Canvas/WebGL shader | 控制力最强但过重,弃 |
| E | 全局玻璃纹理 + 封面主色染色 | 资产最小但失真,弃 |

**最终选 B**。落地时严格执行了两个 `backdrop-filter` 已知坑的规避(见 §6)。

## 4. 实现(最终 CSS)

`HomeArticleList.astro` 中,磨砂覆层结构为:

```html
<span class="home-article-cover-wrap">
  <Image ... class="home-article-cover" />                 <!-- 原封面 -->
  <span class="home-article-cover-frost" aria-hidden="true"></span>  <!-- 磨砂玻璃层 -->
  <span class="home-article-cover-preview-text">正文 120 字</span>    <!-- 文字层 -->
</span>
```

磨砂玻璃层(节选关键值):

```css
.home-article-cover-frost {
  position: absolute; top: 0; bottom: 0; left: 0;
  width: calc(100% + 240px);                 /* 比封面宽 240px,柔边落在封面右缘外 */
  backdrop-filter: blur(14px) saturate(0.8) brightness(1.04);   /* 真·糊化活封面 */
  background: color-mix(in srgb, var(--color-surface) 42%, transparent);  /* 雾面 tint */
  transform: translateX(-100%);              /* 起点:藏在左外 */
  transition: transform var(--duration-slow) var(--ease-out);   /* 400ms 推入 */
  /* 前沿"消散"曲线:多 stops,避免与磨砂本体形成分界 */
  mask-image: linear-gradient(to right,
    #000 calc(100% - 240px),
    rgba(0,0,0,0.92) calc(100% - 180px),
    rgba(0,0,0,0.72) calc(100% - 120px),
    rgba(0,0,0,0.45) calc(100% - 60px),
    rgba(0,0,0,0.18) calc(100% - 20px),
    transparent 100%);
}
:hover → transform: translateX(0);
```

文字层:随悬停渐显(`opacity: 0 → 1`,`400ms ease-in`),深色主题用 `var(--color-text)` 保可读。

## 5. 迭代中修复的问题

1. **推入到位后右缘颜色不均匀**
   - 根因:磨砂层 `inset:0` 时,右缘 48px 柔边渐隐落在封面右缘上,露出未处理的锐利原图。
   - 修复:磨砂层改为**比封面宽 240px、贴左缘**,让柔边落到封面右缘之外的裁切区(`cover-wrap` 有 `overflow:hidden`),到位后封面整块均匀,滑动中柔边仍是推进前沿。

2. **标题区与封面区过渡生硬**
   - 左缘从线性 `#000 25%` 渐隐放宽到 **0→45%**,并用多 stops 做成"**先慢后快但更均缓**"的曲线(见第 6 节),既有慢起又不突兀。

3. **磨砂前端与前沿渐变分界明显**
   - 根因:单段线性渐变 + 磨砂"雾面 plate"强烈,交界一眼可见。
   - 修复:前沿从 120px 单段线性改为 **240px 多 stops"消散"曲线**,磨砂先保持较实再渐进淡出,融进背后清晰封面。

4. **速度**
   - 观察期临时放慢到 1.5s(DEBUG),定稿改回 `var(--duration-slow)`(**400ms**),比原基准 `--duration-slower`(600ms)稍快;文字渐显同步为 400ms。

## 6. 关键纪律(踩坑规避)

- **`backdrop-filter` 只写标准属性,不写 `-webkit-` 配对**:lightningcss 压缩会合并成仅前缀版导致标准属性丢失(MVP-PHASE3 两次踩坑)。
- **该层在卡片内、不含 fixed 后代**:不会踩"`backdrop-filter` 制造包含块"害 fixed 子孙(阅读进度条)的坑。

## 7. 遗留 / 待办

路线 B 定稿后,路线 A(构建期 Glass Preview)的相关产物已**弃用但仍留在工作区**,建议清理:

| 项 | 位置 | 处置建议 |
|---|---|---|
| `generate-glass-previews.mjs` | `src/scripts/`(未跟踪) | 路线 B 已不用,建议删除 |
| `predev`/`prebuild` 钩子 | `package.json`(改动,未提交) | 建议还原(不再生成玻璃预览) |
| `.gitignore` 的 `public/generated-glass/` | `.gitignore`(改动,未提交) | 建议删除该行 |
| `frost-texture.webp` | `public/`(未跟踪) | 孤立无用文件,建议删除 |
| `public/generated-glass/*` | 构建产物 | 已 gitignore,可清 |

是否清理并提交,待用户拍板。

## 8. 验证

- `pnpm astro check`:0 errors / 0 warnings(5 个既有 hints,与本改动无关)
- `pnpm dev` 首页 `/zh/` 200,文章卡正常渲染;产物 CSS 含 `backdrop-filter: blur(14px)`、`color-mix` 雾面、`translateX(-100%)`、240px 消散蒙版
- 视觉:用户逐轮确认,最终"无问题"
