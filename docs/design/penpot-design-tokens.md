# Penpot 设计参数(已建成,源自 src/styles/tokens.css)

> 真相源:`src/styles/tokens.css`(Tailwind v4 @theme)。2026-09-13 已通过 MCP 在 Penpot 文件中
> 建成下述全部内容;改 token 先改 tokens.css,再同步 Penpot(或反向同步)。生成日期:2026-09-13。

## 0. Penpot 内的结构

- **Token 集**(penpot.library.local.tokens):`core`(43 个,主题无关)/ `light`(17 色)/ `dark`(11 色)
- **主题组** `mode`:`mode/light` = core+light,`mode/dark` = core+dark(互斥,对应站点的 data-theme)
- **本地库样式**(Assets 面板直用):颜色 16 个(取 light 值)+ 文字样式 10 个(Inter 400)
- 命名规则:Penpot token 名中 `.` 是层级分隔,**已有同名叶子就不能再挂子级**,所以子属性用连字符
  (如 `color.accent-hover`,正好对应 CSS 变量 `--color-accent-hover`)。

## 1. core 集(主题无关)

| 类型 | Token → 值 |
|---|---|
| spacing | 3xs 4 / 2xs 8 / xs 16 / sm 24 / md 32 / lg 48 / xl 64 / 2xl 96 / 3xl 128(px) |
| borderRadius | sm 4 / md 8 / lg 12 / xl 16 / 2xl 24 / full 9999(px) |
| dimension | container.prose 720 / container.page 1080 / container.wide 1280(px) |
| fontFamilies | font.family.sans = Inter;font.family.mono = JetBrains Mono |
| fontSizes | font.size.2xs 12 / xs 14 / sm 16 / md 18 / lg 20 / xl 24 / 2xl 30 / 3xl 36 / 4xl 48 |
| shadow | shadow.sm / shadow.md(双层)/ shadow.lg(双层)/ shadow.glow(引用 {color.accent}) |
| typography | typography.text.{2xs,xs,sm,md,lg}(行高 1.6)、typography.text.{xl,2xl,3xl,4xl}(行高 1.2)、typography.prose(16/1.75),均引用 font.* token |

阴影因 Penpot 不允许负 spread,设计侧钳到 0,精确 CSS 写在各 token 的 description 里(如
shadow.md:`0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)`)。

## 2. light / dark 颜色 token

| Token | light | dark |
|---|---|---|
| color.accent | `#3B82F6` | `#60A5FA` |
| color.accent-hover | `#2563EB` | `#3B82F6` |
| color.accent-contrast | `#FFFFFF` | —(不覆盖) |
| color.bg | `#FFFFFF` | `#0F0F12` |
| color.surface | `#F8F9FA` | `#1A1A1F` |
| color.surface-raised | `#FFFFFF` | `#232328` |
| color.surface-overlay | `#00000080` | `#000000B3` |
| color.text | `#1A1A1A` | `#E8E8EA` |
| color.text-muted | `#6B7280` | `#9CA3AF` |
| color.text-subtle | `#9CA3AF` | `#6B7280` |
| color.text-on-accent | `#FFFFFF` | — |
| color.border | `#E5E7EB` | `#2D2D35` |
| color.border-strong | `#D1D5DB` | `#3F3F47` |
| color.success / warning / danger / info | `#22C55E` / `#F59E0B` / `#EF4444` / `#3B82F6` | — |

已验证:light 激活时 accent 解析 `#3B82F6`;dark 激活时解析 `#60A5FA`、bg `#0F0F12`。

## 3. 本地库样式

- **颜色**(路径 `color/`):accent、accent-hover、accent-contrast、bg、surface、surface-raised、
  text、text-muted、text-subtle、text-on-accent、border、border-strong、success、warning、danger、info。
  surface-overlay 因库颜色不支持 hex8 透明,建成 `#000000` + **opacity 0.5**。
- **文字**(路径 `text/` 与 `prose/`):2xs 12/1.6、xs 14/1.6、sm 16/1.6、md 18/1.6、lg 20/1.6、
  xl 24/1.2、2xl 30/1.2、3xl 36/1.2、4xl 48/1.2、prose/body 16/1.75,全部 Inter 400。

## 4. 已踩坑与注意点

1. **负 spread 不支持**:Penpot shadow token 校验拒绝负扩散,设计侧钳 0,CSS 精确值在 description。
2. **透明度**:color token 值可写入 hex8(如 `#00000080`)且解析正常,但 resolvedValueString 只显示
   hex 部分;若 UI 上看不到透明度,在 token 编辑器手动补 opacity。库颜色完全不支持 hex8,必须用
   `opacity` 字段(已按此建 surface-overlay)。
3. **字体模糊匹配**:`penpot.fonts.findByName("Inter")` 会命中 "Inter Tight"!必须
   `penpot.fonts.all.find(f => f.name === "Inter")` 精确匹配。已修复全部文字样式。
4. **token 名层级**:`color.accent` 存在时不能再建 `color.accent.hover`(叶子/分组冲突),用连字符。
5. 本文件与 Penpot 的同步是手动的;大改动可走 MCP `execute_code` 重建单个 token 集。
