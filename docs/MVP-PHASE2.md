# Object920 — MVP 第二阶段交付文档

| 项 | 值 |
|---|---|
| 阶段周期 | 2026-09-12 ~ 2026-09-15 |
| 状态 | **已完成并上线**,全链路自动化验证通过 |
| 在线地址 | http://47.114.43.241(ECS / nginx) |
| 主仓 | github.com/NaloxoneE-Lab/Object920(67 → 99 commits,本阶段 32 个) |
| 配套仓 | object920-content(内容 + 番剧/术曲同步数据)、object920-assets(音频待上传) |
| 阶段性质 | 无预冻结 Spec,用户驱动迭代;视觉基准为新增的 `docs/design/hero-home-spec.md`(Penpot 画板实测) |

---

## 1. 阶段目标与完成度

本阶段无统一 Spec,由六条主线构成:部署链终局定案、内容自动化双管线(番剧 + 术曲)、首页视觉重构(仿Sakura)、交互组件弹窗化、搜索可靠性修复、SEO/CI 卫生清账。

| 交付块 | 完成度 | 验证方式 |
|---|---|---|
| 部署链终局(方案 D 废止 → SSH 直推定型) | ✅ | 端到端:push → CI → tar/scp → ECS rsync 换装,多次实发 |
| 番剧 Bangumi 同步管线 | ✅ | 线上 /zh/favorites/anime/ 渲染 3 卡 + bgm 外链,每日 CI 待 Variable 配置 |
| 术曲网易云同步管线(方案 A) | ✅ | 真实歌单 18381546226 端到端(拉取/元数据/封面/手记合并/手动条目共存) |
| 首页栏目改版(置顶/最新文章/最近在看/最近在听) | ✅ | 1440×810 DOM 断言 + 线上实测 |
| 仿Sakura Hero 重设计 | ✅ | 与 Penpot 画板逐项几何断言一致(见 §3.6) |
| 卡片弹窗化(番剧/术曲) | ✅ | 开/ESC/背景关、字段完整性、单行省略、角标定位全过 |
| 搜索可靠性(CSP/缓存/索引范围) | ✅ | 线上搜索出真实结果;索引 50 页 → 3 页 |
| 背景音乐上线(弹窗播放器) | ✅ | UI/控件/持久化全验;出声待 assets 仓音频(§7) |
| 主题弹窗化(调色板,多主题预留) | ✅ | 浅/深切换 + 持久化 + 多实例同步 |
| SEO/CI 清账(RSS 发现/索引范围/TEMP 步骤) | ✅ | 构建产物断言 |
| 全站顶栏统一 | ✅ | 非首页与首页逐项几何一致 |

**核心数据**:172 单测(一期 146 → +26)/ 58 页构建 / 主仓 32 提交 / `pnpm ci` 全链绿灯。

---

## 2. 已交付的系统行为

### 2.1 部署链终局(方案 D 试错与回退)

- **CF Worker + R2 中继(方案 D,ff46983)建成即废弃**:workers.dev 被大陆 DNS 污染(ECS 解析到 Facebook IP 段),中继永远拉不到;**回归 SSH 直推**(8d6b50a),前提为阿里云安全组放行 22/0.0.0.0
- 部署形态定型:GitHub runner 打 tar → 单连接 scp(压缩后 ~2MB)→ ECS 本地 `rsync -a --delete` 原子换装 + nginx conf 安装 + reload(3544b23;长连接 rsync 在跨境链路上会被拖死)
- 配套修复:retry() 分支无 else 时 `$?` 恒 0 吞掉真实失败(d7735d1,0.197.x 历史教训的制度化)、ECS_HOST 与公网 IP 不符告警(36e7004)、/admin/ no-cache(7220b59,启发式缓存数小时提供旧 config.yml)、SSH 断连重试(6ed764d)

### 2.2 内容自动化双管线

| 管线 | 命令 | 数据流 |
|---|---|---|
| 番剧(Bangumi) | `pnpm sync:anime` | 公开收藏 API → content 仓 `data/anime.json` + `covers/*.jpg`;手记写 `anime-notes.json`(短评覆盖 bgm、highlight 只在手记),loader 构建期合并;每日 CI 已建,待 GitHub Variable `BANGUMI_USER` + RW token 后全自动 |
| 术曲(网易云) | `pnpm sync:vocaloid` | 公开歌单(`NETEASE_PLAYLIST_ID`)→ `data/vocaloid.json` + `covers/vocaloid/*.jpg`;`vocaloid-notes.json`(评分/感想/歌词/状态/歌手修正,按 id 叠加)+ `vocaloid-manual.json`(站外曲目)构建期合并;**方案 A:歌单手动顺序 = 展示顺序**(schema `order` 字段) |

- 歌手自动分类(`vocaloid-artists.mjs`):约 50 个虚拟歌姬名(日 V + 中 V + 罗马音,大小写不敏感)拆分 producer / vocaloid[],可被手记覆盖
- **封面隔离**:`covers/vocaloid/` 子目录——两个管线共用 covers/ 且孤儿清理按纯数字文件名匹配,曾互删封面(发现于首次真同步,已恢复并双向加 regex 防护)
- 排序:`sortVocaloidByRecency` 统一首页"最近在听"与术曲墙(歌单条目按 order 在前,带 listenedDate 的手动条目按日期倒序在后);**Astro `getCollection` 默认按 id 排序会丢歌单顺序**,必须显式 order 字段

### 2.3 首页重构(仿Sakura)

- **栏目改版**(643aa92):栏目顺序 = 置顶 → 最新文章 → 最近在看 → 最近在听(→ 关于,后移除);articles schema 新增 `pinned`;最新文章排除置顶避免重复;原"番剧精选/术曲精选"被"最近在看/最近在听"取代(同数据源,去重);最新工程移除
- 选取逻辑纯函数化(`src/lib/home-sections.ts`)+ 6 单测
- **Hero 重设计**(9be0d32 / 9328495):按 `docs/design/hero-home-spec.md` + Penpot 画板实测几何落地——64px 透明顶栏(logo x=40/24px/400;图标组右缘≈40px、圆心距 44px、搜索光学 -2px)、左侧 galgame 式菜单(x=240,首项 y=228,行距 76px,英文角标 x=302 底对齐,细线项顶+44px/56px)、底部双箭头(错位 28px,上层 100%/下层 40%,顶 y≈678)。**首页桌面(≥768px)隐藏站点 Header**,由 Hero 自绘顶栏接管(spec §1"页面即首页");移动保留 Header+抽屉(spec §8)
- **背景图**(67611a1 / 9328495):从 Penpot `wallhaven-2y3e56` 矩形以 **fill 模式导出原图**(2660×1865,不含任何设计稿控件),裁剪至画板可见区域 2254×1268,webp 50KB;暗色主题加 78–88% 压暗遮罩保墨字可读。原图版权未确认,替换自有授权图直接覆盖 `public/images/hero-bg.webp`
- **全站顶栏统一**(ac620ab):非首页站点 Header 同规格——高 64px 全宽(logo 距左 40px)、logo 24px/400、图标组 34px 归一/圆心距 44px/搜索光学 -2px/墨色 85%;保留吸顶+毛玻璃与中部导航

### 2.4 交互组件弹窗化

- **番剧/术曲卡片**(643aa92):卡面精简为封面 + 单行标题(超长省略号),状态徽章叠封面右上角(白字 + 82% 语义色底);点击弹原生 `<dialog>` 详情(评分/作者/感想/进度/歌词/外链),ESC/背景/× 关闭;原整卡外链收进弹窗
- **音乐播放器**(0e99500):音符图标 + 弹层面板(header/抽屉/Hero 三处实例共用),含歌单名/当前曲/上下首/播放暂停/音量/曲目列表;MusicHost 只保留 `<audio>` 持久化(`transition:persist` 跨页实测通过:同节点存活、音量保持);CI 注入 `PUBLIC_MUSIC_ENABLED=true` 三处;音频 URL 改由构建环境变量拼接(替换 YourUser 占位)
- **主题切换**(676a91f):调色板图标 + 选择弹窗(浅色/深色),保持 `theme-change` 事件契约(giscus 依赖);新主题 = themes 数组加项 + tokens.css 加 `[data-theme='xxx']`

### 2.5 搜索可靠性(三层洋葱,按发现顺序)

| 层 | 根因 | 修复 |
|---|---|---|
| ① CSP | pagefind 索引解压依赖 WebAssembly,`script-src` 无 `'wasm-unsafe-eval'` 被浏览器拦截 | seo.ts CSP 加窄指令(5f83044) |
| ② 缓存 | nginx 对 `/pagefind/` 全目录 86400s 缓存;**pagefind 以自身为 Worker 并继承其响应头 CSP**——旧 CSP 头随脚本缓存,Worker 内 WASM 照拦 | 哈希产物 immutable / 运行时入口 no-cache 分离 + import 加 `?v=2` 击穿存量(3e67d64) |
| ③ 滞留 | 修复前访问过的浏览器仍缓存带旧 CSP 头的 `pagefind-worker.js`(24h 过期) | 搜索初始化时 `fetch(worker, {cache:'reload'})` 自愈一次(269a073) |

- 索引范围落地(P1-14,55d829d):文章/工程详情页加 `data-pagefind-body`,索引 **50 页 → 3 页**
- 顶栏控件失灵(c598c4c):首页 DOM 同屏多份 SearchBox(2)/MusicPlayerWidget(3),两组件 `querySelector` 只绑第一个(隐藏 Header 实例)→ Hero 顶栏按钮无事件;**教训已制度化:可多处渲染的控件必须 querySelectorAll + 每实例守卫,provider/订阅用模块级单例**

### 2.6 SEO / CI / 内容卫生

- RSS 发现链接恢复,按 locale 指向 `/rss/{locale}.xml`(55d829d)
- CI 移除 TEMP diag 步骤,`contents:write` 回收为 `read`(55d829d)
- GUI 黑盒测试修复包(d8d8a2f):主题/语言/汉堡控件视图切换后重绑、移动抽屉横向溢出(fixed 裁剪根 + `height:100dvh`,header 的 backdrop-filter 会成为 fixed 后代包含块)、ru/ja 全量翻译 + 四语键位 parity 测试、friends 页挂载 Travellings/Comments、about 作者信息、阅读进度条短页 100% bug
- 路由更名:「番&术」→「喜欢」,`/collection/*` → `/favorites/*` 301(ab30e2f + content 仓 12 条重定向);`generate:redirects` 幂等修复(自写 HTML 被二次扫描当路由,deploy 跑两次必炸,579d21c)
- `docs/design/` 入库(hero-home-spec、penpot-design-tokens、设计导出图);`gui-test-screenshots/` 入 .gitignore

---

## 3. 与 Spec / 一期文档的偏差

1. **音乐入口形态**:spec 5.12 的左下角悬浮播放器 → header/Hero 顶栏音符弹窗(用户指定);`transition:persist` 行为不变
2. **首页栏目**:spec 5.7 的"最新文章/最新工程/番剧精选/术曲精选/关于" → "置顶/最新文章/最近在看/最近在听"(用户指定;精选栏目与在看在听同源,去重移除)
3. **Hero 字体**:spec §7 的 Google Fonts(Noto Sans SC/Rubik/Google Sans Flex)→ 系统栈近似——CSP `font-src 'self'` + CJK 子集化成本,视觉差异可接受
4. **Hero 背景**:spec 自认的版权未确认雪景 → 已直接上站(用户指定),替换授权图只需覆盖同名 webp
5. **番剧/术曲数据模型**:新增 `pinned`(articles)、`neteaseId`/`order`(vocaloid)、vocaloid `cover` 从远程 URL 改为本地 `image()`(走 astro:assets 管线)
6. **术曲封面契约**:spec"JSON collection 只存远程 URL" → 同步管线落地为本地文件(与番剧一致),站外手动条目仍支持远程 URL

---

## 4. 新增配置与环境变量

| 项 | 位置 | 值/说明 |
|---|---|---|
| `NETEASE_PLAYLIST_ID` | 本地 .env | 18381546226(公开"在听"歌单);**仅在本地手动跑 sync:vocaloid 用,CI 不跑术曲同步** |
| `PUBLIC_MUSIC_ENABLED` | ci.yml 三处(check 构建/deploy 构建/generate-deploy-config)+ 本地 .env | `'true'`;漏掉第三处会让 nginx CSP 缺 media-src 放行(已踩,3e67d64 补) |
| `PUBLIC_ASSETS_USER/REPO` | 既有 | 现同时用于拼接背景音乐 CDN URL(src/config/music.ts) |
| body class `page-home` | BaseLayout `home` prop | 桌面隐藏站点 Header 的开关,首页专用 |
| 主题扩展点 | ThemeToggle.astro `themes` 数组 + tokens.css `[data-theme='xxx']` | 新配色主题两步接入 |
| nginx `/pagefind/` | generate-deploy-config.ts | 哈希产物 immutable / 运行时入口 no-cache(勿改回整目录缓存) |

---

## 5. 日常操作手册增补

- **加术曲(最近在听)**:网易云歌单加歌/拖顺序 → `pnpm sync:vocaloid` → 内容仓提交推送。手记(评分/感想)写 `data/vocaloid-notes.json`,站外曲目写 `data/vocaloid-manual.json`
- **加番剧(最近在看)**:Bangumi 收藏 → `HTTPS_PROXY=… NODE_USE_ENV_PROXY=1 pnpm sync:anime`(本地需代理)→ 内容仓提交推送
- **置顶文章**:内容仓文章 frontmatter 加 `pinned: true`
- **换 Hero 背景图**:覆盖 `public/images/hero-bg.webp`(竖向裁剪安全,object-fit cover)
- **加配色主题**:themes 数组加项 + tokens.css 加 `[data-theme]` 块
- **dev 模式提示**:搜索仅生产构建后可用(preview 可验);改 content 数据后需重启 dev server;astro:content 集合默认按 id 排序

---

## 6. 风险与运维备忘(新增)

- **网易云接口**:网页版公开端点,非官方无 SLA;sync 脚本失败保留旧 JSON 不阻塞构建;上游若失效可切官方开放平台(个人入驻 type=INDIVIDUAL,2026-03 起)
- **Bangumi 每日 CI 未激活**:需主仓 GitHub **Variable** `BANGUMI_USER=naloxonee`(数字 ID 1281689)+ `CONTENT_GITHUB_TOKEN` 升级 content 仓 RW;本地手动同步不受影响
- **背景音乐静默**:assets 仓无 `audio/` 目录,曲目 URL 404 → 播放优雅降级"音乐不可用";传 mp3 后即出声
- **调试方法论沉淀**:真实点击 vs 合成事件(合成事件会绕过命中测试,曾误判"功能正常");元素命中检测(`elementsFromPoint`)定位遮挡;IAB 输入通道长会话会失效,新回合恢复——交互用例尽量在回合早期做

---

## 7. 遗留事项(第三阶段候选)

| 项 | 说明 | 前置 |
|---|---|---|
| 域名 + HTTPS | DNS → certbot → `DEPLOY_SITE_URL` 换 https 重建 | 域名购买;大陆 ECS 需 ICP 备案 |
| Giscus 评论启用 | 代码就绪(friends 页 + theme-change 同步) | giscus.app 装 App + discussions 仓 category id → 环境变量 |
| Umami 分析启用 | 代码就绪 | Umami 实例 + 环境变量 |
| 背景音乐出声 | 播放器/管线全部就绪 | assets 仓传 `audio/*.mp3` 或改 music.ts 曲目 |
| 多配色主题 | 弹窗/持久化/事件契约就绪 | 用户出配色设计(tokens.css 级) |
| Bangumi 每日 CI 激活 | workflow 已建 | GitHub Variable + RW token(§6) |
| 清理 debug-* releases | 历史诊断产物 | 用户手动或 token |
| OG 模板 / 全站视觉打磨 | 基础出图正常 | 主观迭代 |
| Hero 背景图版权 | wallhaven 占位已上站 | 替换自有授权图(覆盖同名文件) |
| ru/ja 内容 | UI 翻译已全量,内容仍 zh/en 渐进 | 持续翻译 |

---

*MVP 第二阶段交付完毕。文档生成于 2026-09-15,随仓库演进。*
