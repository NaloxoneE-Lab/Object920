# Object920 — MVP 第三阶段交付文档

| 项 | 值 |
|---|---|
| 阶段周期 | 2026-09-19 ~ 2026-09-25 |
| 状态 | **已完成并上线**,端到端验证通过 |
| 在线地址 | http://47.114.43.241(ECS / nginx) |
| 主仓 | github.com/NaloxoneE-Lab/Object920(99 → 106 commits,本阶段 7 个 + 本文) |
| 配套仓 | object920-content(内容 + 番剧/术曲同步数据,含本阶段多次同步提交) |
| 阶段性质 | 用户驱动迭代;两条主线:**首页双屏化**(电灯开关式切换)与**全站视觉统一**(常驻顶栏 / 统一壁纸 / 内容磨砂),外加**同步管线修复闭环** |

---

## 1. 阶段目标与完成度

| 交付块 | 完成度 | 验证方式 |
|---|---|---|
| 首页双屏"电灯开关"切换(第一屏 Penpot 原样 ⇄ 第二屏内容区) | ✅ | 滚轮/键盘/箭头/触摸全通道实测,落位像素级精确(y=0 ⇄ y=100svh),不停留中间 |
| 全站常驻透明顶栏(样式统一,仅首页第一屏无中间跳转按钮) | ✅ | fixed 定位 + 首页第一屏几何断言(1440×810 逐项与 Penpot 一致) |
| 全站统一壁纸("网站有一张统一背景图") | ✅ | 首页/文章页/工程页实测壁纸铺底,暗色主题自动压暗 |
| 内容磨砂遮罩 + 顶栏内容穿越带 | ✅ | 参数经多轮用户视觉调参定稿(31% 底色 / 8px 模糊 / 穿越带 72px·6px·无渐变) |
| 术曲专辑卡改版(封面 1:1、展示缩小) | ✅ | 线上产物断言(内联样式 + 网格类) |
| 菜单 x 全尺寸跟随设计稿比例 | ✅ | 1280/1440/1920/2560 四档断言(x = 16.67vw,无上限) |
| 番剧/术曲每日同步管线修复闭环 | ✅ | 手动触发双双转绿,内容推送自动触发主站重建,全链路自动化 |
| MobileNav 多实例化(顶栏多副本前提) | ✅ | 双 Header 下抽屉状态隔离 [false,true] 实测 |

**核心数据**:172 单测全绿 / 主仓 7 提交(全部上线)/ 内容仓同步提交若干 / `pnpm ci` 全链绿灯。

---

## 2. 已交付的系统行为

### 2.1 首页双屏"电灯开关"切换

- 结构:第一屏 = 原 Hero(Penpot 画板逐像素,分毫未动);第二屏 = 新组件 `HomePanel`(原首页内容区);两者同处一个文档流(第二屏在第一屏下方),第二屏比一屏高,切换后内部自由滚动
- 机制(`src/components/home/scroll-switch.ts`,构建后 ~1.3KB gzip,零依赖):
  - **边界手势劫持**:第一屏内滚轮/键盘(↓/PageDown/空格)/触摸上滑 → 整屏切到第二屏顶;第二屏顶 ±96px 边界带内上滑 → 整屏切回;深处自由滚动不干预
  - **动画**:rAF + easeInOutCubic 800ms 逐帧 scrollTo;落位后 200ms 惯性冷却;动画期 watchdog + `visibilitychange` 兜底(防标签页切走后 rAF 节流导致永久锁死)
  - **状态机**:`body.home-at-panel` 单类驱动两端 CSS 动画(Hero 内容上浮淡出 / 面板区块错峰上滑淡入);`home-ready`(JS 就绪)、`home-skip-anim`(滚动位置恢复时跳过动画)
  - **健壮性**:所有几何判定带 `heroReady` 守卫(`astro:page-load` 可能早于布局,Hero 子元素全绝对定位时高度≈0);抽屉/弹层打开时(body overflow hidden)不劫持;`prefers-reduced-motion` 瞬跳
- 无 JS 时全站退化为原生滚动,一切内容可达

### 2.2 全站常驻透明顶栏

- `Header.astro` 改 `position: fixed` **恒透明**(任何页面任何滚动位置无底色、无磨砂、无边框——用户明确要求;曾加过滚动磨砂底后按需求整体移除)
- 首页第一屏:中间跳转按钮经 `body.page-home:not(.home-at-panel) .header-nav` 隐藏(opacity+visibility,不占焦),切到第二屏随切换动画淡入;**顶栏本体全程不动**(动画设计的硬前提)
- 布局:导航绝对居中(`left:50%`+translate),图标组 `margin-left:auto` 贴右——**不能用 space-between**:末尾 0 宽的 MobileNav 包装层会吃掉一个间隙槽,把图标组顶离右缘 ~300px
- Hero 自绘顶栏与背景整体移除,透明浮于壁纸之上,第一屏观感不变

### 2.3 全站统一壁纸 + 内容磨砂 + 穿越带

- **壁纸**:`siteConfig.background`(原 heroBackground 升级,语义="网站有一张统一背景图",当前临时取首页雪景图验证);BaseLayout 输出 `.site-bg` fixed 层(z-index:-1、暗色 78–88% 压暗遮罩)。**可见性前提:html 无背景时 body 背景传播为画布底**,z:-1 层才能露出
- **内容磨砂**:`--frost-bg`(color-mix 31%)/ `--frost-blur`(8px)token 化,用户多轮视觉调参定稿;非首页挂 **`main::before` 视口 fixed 层**——必须用伪元素,backdrop-filter 挂 main 本体会把 main 变成 fixed 后代(阅读进度条)的包含块破坏其视口定位(实测验证);首页第二屏为面板磨砂板 + Footer 同规格;首页第一屏恒为壁纸原样
- **顶栏内容穿越带**(`.top-fade`,fixed 72px):blur(6px) + `--frost-bg` 浅色磨砂底,内容滚过顶栏时被虚化提浅,消除与顶栏文字的相撞;无渐变;非首页常开、首页第一屏隐藏、第二屏随切换淡入

### 2.4 术曲专辑卡 + 菜单比例

- 专辑封面 `3:4 → 1:1`(详情弹窗同步),首页「最近在听」与术曲墙网格 280px → 160px 小格
- Hero 左侧菜单 x 从 `clamp(24px, 16.67vw, 240px)` 改为纯 `16.67vw`:任何分辨率按画板比例(240/1440)定位,无上限(1280→213 / 1440→240 / 1920→320 / 2560→427,断言全过)

### 2.5 同步管线修复闭环(番剧 + 术曲)

- **番剧**:CI 连续 5 天失败的根因 = 仓库 Variable `BANGUMI_USER` 从未配置(Run sync 0 秒退出,脚本守卫直接 exit 1;步骤定位法:日志 API 匿名 403,改经 ECS 查 `actions/runs/{id}/jobs` 的 steps conclusion)。修复:工作流 env 写成 `vars.X || '<.env 公开值>'` 兜底
- **术曲**:此前**没有 CI 工作流**,新建 `sync-vocaloid.yml`(每日 UTC 03:20,与番剧 03:00 错峰防推撞),同 fallback 模式
- **token 终局**:fine-grained PAT(仅授 object920-content 一仓 + Contents: Read and write)——旧 token 只读导致两条管线连续 5 天在 Commit & push 步骤失败(Run sync 成功是定位关键)
- **网易大歌单截断**(用户报"歌单 202 首只同步 10 首"):老 `api/playlist/detail` 对大歌单只回前 10 首截断视图。重写为 **v6 `playlist/detail`(全量有序 trackIds)+ v3 `song/detail` 每批 100 首批量补全**;v3 用新字段名 `al`/`ar`(旧 `album`/`artists` 兜底)——字段名错导致每首空烧 17s 重试,是"同步慢"的主因
- **加固**:单请求 15s 超时(无超时遇挂连接永久卡死);网易反爬对高频请求随机返回缺 `al/ar` 的稀疏对象,缺字段条目逐条单拉补全(限量 50)
- 网络事实:`api.bgm.tv` 本机(DNS 污染)与阿里云 ECS 均不可达,GitHub 境外 runner 正常,CI 无碍;`music.163.com` 两边都可达
- 实测端到端:两条管线手动触发双双转绿 → 内容仓提交 → repository_dispatch → 主站自动重建;线上术曲墙 202/202 与歌单逐首一致

### 2.6 MobileNav 多实例化

- 原实现硬编码 `#mobile-nav-toggle` 等 ID,顶栏多副本场景(首页双屏)下重复 ID 导致抽屉失灵;重构为实例作用域(随机 uid + `.mobile-nav` 包装层作用域查询,Escape 关闭全部实例),状态隔离实测 [false,true]

---

## 3. 本阶段的教训(制度化)

1. **lightningcss 前缀合并(踩了两次)**:源码同时写标准属性与 `-webkit-` 前缀(如 backdrop-filter)时,压缩产物**只保留 -webkit- 版**,而运行环境对别名未生效 → 线上静默失效(磨砂模糊两次丢失)。**规矩:backdrop-filter 等带前缀史的属性只写标准属性,前缀交给压缩器**
2. **backdrop-filter 的包含块副作用**:任何元素加 backdrop-filter 即成为 fixed/absolute 后代的包含块;fixed 子孙(阅读进度条/抽屉)存在时,滤镜必须挂伪元素而非容器
3. **几何判定要等布局**:`astro:page-load` 可能早于布局完成,基于 offsetHeight/getBoundingClientRect 的判定必须有就绪守卫 + 重试
4. **eslint 脚本全局白名单**:Node 新全局(AbortSignal)同 Headers 一样要进 `eslint.config.js` 的 globals 清单,否则 CI Code checks 连红
5. **Astro 小样式内联进 HTML**:`build.inlineStylesheets` 默认 auto,排查产物样式时 HTML 和 css chunk 都要查
6. **第三方"官方接口"的版本坑**:网易老 `playlist/detail` 对大歌单截断,v3 歌曲详情换 `al/ar` 新字段名——对非官方端点,响应 shape 要用真实数据断言,不能凭文档

---

## 4. 配置与环境变量(本阶段新增/变更)

| 项 | 位置 | 说明 |
|---|---|---|
| `siteConfig.background` | src/config/site.ts | 全站统一壁纸;置 undefined 回退主题底色 |
| `--hero-ink` / `--frost-bg` / `--frost-blur` | src/styles/tokens.css | 壁纸墨色(亮/暗)、磨砂底色与模糊半径 |
| `.top-fade` 参数 | BaseLayout 全局样式 | 穿越带高度/blur/底色 |
| `.github/workflows/sync-vocaloid.yml` | 新增 | 术曲每日同步;`NETEASE_PLAYLIST_ID` 带 `.env` 值兜底(vars 优先) |
| `sync-bangumi.yml` env | 变更 | `BANGUMI_USER` 同上兜底 |
| secret `CONTENT_GITHUB_TOKEN` | 主仓 Actions secrets | **fine-grained PAT,object920-content + Contents: Read and write**(旧只读 token 已弃用) |

---

## 5. 日常操作手册增补

- 本地手动同步:术曲 `pnpm sync:vocaloid` 直连可用;番剧 `pnpm sync:anime` 需代理(`HTTPS_PROXY=http://127.0.0.1:7890 NODE_USE_ENV_PROXY=1`,api.bgm.tv 本机被 DNS 污染,ECS 也不可达,唯 GitHub runner 可达)
- 查 CI 状态:本机匿名 API 限流 60/h 且连 GitHub 偶发抽风,借道 ECS `ssh root@47.114.43.241 'curl api.github.com/...'`;日志 API 匿名 403,失败定位用 `actions/runs/{id}/jobs` 的 steps conclusion
- 同步排障速查:`Run sync` 失败 = 上游 API/配置;`Commit & push` 失败 = token 权限;内容仓推送非 fast-forward 时本地 `reset --hard origin/main` 后重跑同步再提交
- 主仓推送仍走 ECS 跳板:`git push ssh://git@ssh.github.com:443/...`,推完手动 `git update-ref refs/remotes/origin/main <sha>`

---

## 6. 风险与运维备忘

- 网易云接口为非官方网页端点:大歌单走 v6+v3 组合已实测稳定,但上游无兼容性承诺;失效时切官方开放平台(个人入驻)
- 网易反爬会对高频请求随机返回缺字段稀疏对象——脚本已内置逐条补拉(限量 50);若整批持续降级,同步会以不完整数据落盘,构建不阻塞(设计如此),需人工重跑
- GitHub Actions 平台提示(Node 20 deprecation / ubuntu-latest → 26 迁移)为噪音,等官方 action 升版本号即可
- 测试工具(ZCode IAB)输入通道会中途劣化(CUA/键盘/触摸全部静默失效),新回合自动恢复——交互类用例尽量在回合早期完成

---

## 7. 遗留事项(第四阶段候选)

1. **首页「最近在听」预览上限 4 张**(RECENT_LIMIT):歌单已 202 首,首页是否全量/调大待用户拍板(全量在收藏墙页 `/zh/favorites/vocaloid/`)
2. **移动端适配**:双屏切换的移动端打磨(触摸已实现未充分实测)、穿越带与磨砂在窄屏的表现——用户明确暂缓
3. **404 页**为独立页面,未接入壁纸/常驻顶栏(错误页保持极简,待定)
4. 番剧首页「最近在看」同为 4 张预览,bgm 收藏增多后是否调整,与 #1 同批决策
5. 壁纸图(wallhaven 占位)版权未确认,替换自有授权图时覆盖 `public/images/hero-bg.webp` 即可
6. Giscus 评论启用(二期遗留)、域名 + HTTPS(ICP)仍待外部条件
