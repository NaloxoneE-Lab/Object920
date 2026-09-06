# ECS 部署(阿里云 Debian 13)

当前部署:`root@47.114.43.241`,nginx 纯静态托管,构建在 GitHub Actions 完成。

## 流程

```
内容推送(content 仓)→ validate-redirects → repository_dispatch → 主仓 Actions:
  pnpm build(PUBLIC_SITE_URL=DEPLOY_SITE_URL)→ generate:redirects(nginx map)
  → generate:deploy-config --platform=nginx(CSP/server 块)
  → rsync dist/ → /var/www/object920 + 更新 /etc/nginx 配置 → reload

代码 push(main)→ CI(check/lint/test/lychee)→ 同一 deploy-ecs job
```

## 一次性服务器初始化(已完成 2026-09-06)

```bash
apt install -y nginx && systemctl enable --now nginx
mkdir -p /var/www/object920
# 首次部署后:/etc/nginx/sites-available/object920 + conf.d/object920-redirects.conf
# 由 generate:deploy-config / generate:redirects 生成,后续随每次部署自动更新
```

## GitHub Secrets 清单(主仓 Object920)

| Secret | 值 |
|---|---|
| `ECS_HOST` | `47.114.43.241` |
| `ECS_USER` | `root` |
| `ECS_SSH_KEY` | `naloxonee.pem` 的完整内容(含 BEGIN/END 行) |
| `CONTENT_REPO` | `NaloxoneE-Lab/object920-content` |
| `CONTENT_GITHUB_TOKEN` | fine-grained PAT:仅 content 仓,Contents: Read(CI 拉内容用) |
| `DEPLOY_SITE_URL` | `http://47.114.43.241`(换域名后改为 `https://域名`) |

## GitHub Secrets 清单(content 仓 object920-content)

| Secret | 值 |
|---|---|
| `CONTENT_DEPLOY_TOKEN` | fine-grained PAT:仅主仓 Object920,**Contents: Read and write + Actions: Read and write**(repository_dispatch 触发权) |

配置齐全后:`git push` 到主仓 main 或 Sveltia 发内容 → 自动构建部署;未配置时 deploy job 自动跳过(仅 CI)。

## 手动部署(应急)

```bash
scripts/deploy-ecs.sh   # 需本机 rsync(本机暂缺,可 sudo pacman -S rsync)或用 CI 手动触发(workflow_dispatch)
```

## 域名与 HTTPS(待办)

1. 域名解析 A 记录 → 47.114.43.241;若域名用于大陆 ECS,需完成 ICP 备案
2. `DEPLOY_SITE_URL` 改为 `https://域名` 并重新部署
3. 服务器:修改生成的 server 块增加 443 监听(或装 certbot:`apt install certbot python3-certbot-nginx` 后 `certbot --nginx -d 域名`,生成的 server_name 需同步改)
4. 安全组确认 443 放行

## 注意

- `check:links`(lychee)只在 GitHub CI 跑,不在 ECS 上
- @resvg/resvg-js 在 GitHub runner 上预编译可用;ECS 本身无构建环境
- Sveltia 本地开发流不受影响;生产 Sveltia 登录用 write PAT(与 CI 只读 token 不同,spec 7.12 P2-18)
