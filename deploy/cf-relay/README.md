# Cloudflare Relay 部署(方案 D)

背景:GitHub Actions(海外 runner)→ 阿里云 ECS 的 SSH(22)不可达,部署连续失败。
本方案把部署改为"推拉分离":CI 把产物上传到 Cloudflare Worker(R2 存储),ECS 上的
轮询器每分钟检查版本标记、发现新版本就地换装。**全程出站连接,不依赖任何入站端口。**

```
GitHub Actions ──PUT dist.tgz / version──▶ CF Worker + R2
                                              ▲ ECS 每分钟 GET /version
                                              └─ 新版本 → GET dist.tgz → rsync 换装 → reload nginx
```

## 一次性配置

### 1. Cloudflare(控制台)

1. R2 → 创建桶 `object920-deploy`(位置任意)。
2. Workers & Pages → Create Worker,名称 `object920-deploy`,粘贴本目录 `worker.js` 全文。
   - wrangler 部署亦可:`wrangler r2 bucket create object920-deploy && wrangler deploy`(见 `wrangler.toml`)。
3. Worker → Settings → Variables/Bindings:
   - R2 Bucket Binding:变量名 `DEPLOY_BUCKET`,绑定上面的桶;
   - Secret:`DEPLOY_TOKEN`,值为 `openssl rand -hex 24` 生成。
4. 记下 Worker 地址:`https://object920-deploy.<你的子域>.workers.dev`。

### 2. GitHub 仓库 Secrets

Settings → Secrets and variables → Actions:

- `DEPLOY_URL` = Worker 地址
- `DEPLOY_TOKEN` = 同一个 token

### 3. ECS 安装轮询器(Workbench 里执行)

```bash
sudo env DEPLOY_URL='https://object920-deploy.<子域>.workers.dev' \
  DEPLOY_TOKEN='<和上面相同>' \
  bash <(sed -n '/^#!\/bin\/bash$/,$p' ecs-install.sh)
```

或本机 `scp deploy/cf-relay/ecs/install.sh` 后在 ECS 执行同款命令。安装完成后轮询器
每分钟运行一次(见 `systemctl list-timers object920-deploy.timer`)。

## 部署流程(配置完成后)

1. push 到 main → CI 构建通过 → `deploy-ecs` job 把 `dist/` 打成 tar 包 PUT 给 Worker;
2. ≤1 分钟内 ECS 轮询器发现新版本标记,拉包、`rsync --delete` 换装、`nginx -t && reload`。

## 运维

- 看部署日志(ECS):`journalctl -u object920-deploy.service -f`
- 手动重拉一次(ECS):`systemctl start object920-deploy.service`
- 强制重部署:CI 重跑 `deploy-ecs`(新版本标记必然不同)
- 换 token:三处同步更新(Worker Secret、GitHub Secret、`/etc/object920-deploy.env`)
- 回退到 SSH 方案:revert 相关 commit + 安全组放行 22 即可,历史保留

## 安全

- token 走 `Authorization: Bearer`,Worker 端校验;ECS 侧存于 `/etc/object920-deploy.env`(600)
- 明文 HTTP 之上(Workers.dev 是 HTTPS);worker 只暴露 `dist.tgz`/`version` 两个对象
- 泄露影响面:可向站点推送内容;token 可在三处轮换
