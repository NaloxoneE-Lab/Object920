# 贡献指南

## 内容贡献

### 通过 Sveltia CMS 编辑

1. 打开 `/admin/`(本地:Chrome/Edge 选 "Work with Local Repository" → `src/content/`;生产:用 Access Token 或 OAuth 代理登录)
2. 编辑文章/工程/番剧/术曲/友链
3. 提交直接推 content 仓库 main 分支
4. content 仓库 GitHub Actions 校验通过后触发主站重建
5. **主仓无需任何提交**(非 submodule,无指针更新)

### 双语配对

zh/en 两版文章必须填同样的 `translationKey`(opaque identifier,`z.string().trim().min(1)`)。

- 有 `translationKey`:两语言版本共享该 key,`getLocalizedEntryPath()` 按 key 查目标 slug(允许不同 slug)
- 无 `translationKey`:用 `single:${entry.id}` 合成组,不参与跨语言配对
- 未翻译语言走占位页(显示已有语言版本的跳转链接,`noindex, follow`)

### URL Migration(修改 _slug)

**修改 `_slug` = 修改 URL**,必须同一 content commit 更新 `redirects.json`:

1. 在 Sveltia 中修改文章的 `_slug` 字段
2. 在同一 CMS 会话中编辑 `redirects.json` file collection,添加 `"旧URL/": "新URL/"` 映射
3. 提交(同一个 content commit)
4. content CI 校验 redirect manifest 通过后才触发重建
5. **普通内容修改(title/正文)不涉及 redirect**

`redirects.json` 格式:

```json
{
  "/en/articles/old-slug/": "/en/articles/new-slug/",
  "/zh/projects/old/": "/zh/projects/new/"
}
```

### 数据手册(Datasheet)上传

1. PDF 文件传到 **assets 仓库**(独立于 content 仓库,public)
2. Sveltia 中只填 `filename`(不含路径)+ `mirror`(jsdelivr/raw)+ 必要时 `releaseTag`
3. 历史资料显式填 `ref`(tag/commit,不用 `@main`)
4. 构建时 `check-datasheets` 校验可达(至少一镜像可用通过)

### 图片规范

- **folder collection(文章/工程)**:entry-relative media——图片与 `index.md` 同目录,Sveltia 上传后 frontmatter 写 `./cover.webp`,经 Astro 图片管线优化(AVIF/WebP/srcset)
- **JSON collection(番剧/术曲/友链)**:封面/头像只填远程 URL,不存本地图片
- **alt 必填且非空**(`trim().min(1)`);`alt=""` 仅限正文装饰性图片

## 代码贡献

### 开发流程

1. Fork 主仓,创建 feature branch
2. `pnpm install && pnpm dev`
3. 编码 + 同步加单测(`src/lib/` 新函数必须有 `src/lib/__tests__/` 对应测试)
4. `pnpm ci` 全链通过(check → lint → test → build)
5. 提交 PR

### 风格纪律

- **零框架运行时**:禁止引入 React/Vue/Solid,只允许 vanilla client enhancement
- **Git 操作只在 `src/scripts/`**:`src/lib/`、`src/components/` 禁止 git 命令
- **Token 引用**:scoped CSS 用 `var(--*)` 引用 tokens.css,不硬编码维度
- **`trailingSlash: 'always'`**:全站 URL 带尾斜杠
- **页面文件 ≤ 60 行**:超了抽组件
- **vanilla enhancement ≤ 80 行**(软阈值):超了考虑外置
- **领域叶子组件禁止互相 import**:跨领域复用走 `common/`
- **可插拔 Integration 隔离**:统一在 `src/components/integrations/`,环境变量开关,单向依赖
- **不引入 incremental build / Runtime Routing**:保持完整 build + 静态架构

### 测试纪律

- 单测只测纯函数(`src/lib/`),不测组件渲染
- 测试与代码同 PR:新增/修改 `src/lib/` 函数必须同步更新测试
- 测试不依赖网络:datasheet 校验测试用 mock fetch
- CI 失败阻断合并

### Commit 信息

`feat:` 新功能 | `fix:` 修复 | `docs:` 文档 | `ci:` CI 配置 | `refactor:` 重构 | `test:` 测试 | `chore:` 杂项

### 环境变量命名

- `PUBLIC_*` = 客户端可见(允许进生产 HTML)
- 非 `PUBLIC_*` = 构建/服务端专用(绝不加 `PUBLIC_` 前缀)
