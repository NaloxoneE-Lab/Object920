#!/bin/bash
# deploy/cf-relay/ecs/install.sh — ECS 一次性安装(阿里云 Workbench 里以 root 运行)
# 用法:sudo env DEPLOY_URL='https://object920-deploy.<子域>.workers.dev' DEPLOY_TOKEN='<openssl rand -hex 24>' bash ecs-install.sh
set -euo pipefail

: "${DEPLOY_URL:?缺少 DEPLOY_URL(Worker 的 https://...workers.dev 地址)}"
: "${DEPLOY_TOKEN:?缺少 DEPLOY_TOKEN(openssl rand -hex 24 生成)}"

if ! command -v rsync >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq rsync
fi

install -m 755 /dev/stdin /usr/local/bin/object920-deploy.sh <<'SCRIPT'
#!/bin/bash
set -euo pipefail
state=/var/lib/object920-deploy
mkdir -p "$state"
last=$(cat "$state/version" 2>/dev/null || echo '')
remote=$(curl -fsS -m 20 -H "Authorization: Bearer $DEPLOY_TOKEN" "$DEPLOY_URL/version" 2>/dev/null || true)
if [ -z "$remote" ]; then
  exit 0
fi
if [ "$remote" = "$last" ]; then
  exit 0
fi
echo "$(date -Is) new version: $remote (was: ${last:-none})"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsS -m 300 -H "Authorization: Bearer $DEPLOY_TOKEN" "$DEPLOY_URL/dist.tgz" -o "$tmp/dist.tgz"
mkdir -p "$tmp/incoming"
tar -xzf "$tmp/dist.tgz" -C "$tmp/incoming"
rsync -a --delete "$tmp/incoming/" /var/www/object920/
cp /var/www/object920/nginx/object920.conf /etc/nginx/sites-available/object920
cp /var/www/object920/nginx/object920-redirects.conf /etc/nginx/conf.d/object920-redirects.conf
nginx -t && systemctl reload nginx
echo "$remote" > "$state/version"
echo "$(date -Is) deployed ok"
SCRIPT

cat > /etc/object920-deploy.env <<ENV
DEPLOY_URL=$DEPLOY_URL
DEPLOY_TOKEN=$DEPLOY_TOKEN
ENV
chmod 600 /etc/object920-deploy.env

cat > /etc/systemd/system/object920-deploy.service <<'UNIT'
[Unit]
Description=Object920 deploy poller (pull from Cloudflare relay)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/object920-deploy.env
ExecStart=/usr/local/bin/object920-deploy.sh
SyslogIdentifier=object920-deploy
UNIT

cat > /etc/systemd/system/object920-deploy.timer <<'UNIT'
[Unit]
Description=Poll for Object920 deploys every minute

[Timer]
OnCalendar=*-*-* *:*:00
RandomizedDelaySec=15
AccuracySec=5s

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now object920-deploy.timer
echo "== 安装完成,轮询器状态: =="
systemctl list-timers object920-deploy.timer --no-pager | head -4
echo "== 手动测试一轮: =="
DEPLOY_URL="$DEPLOY_URL" DEPLOY_TOKEN="$DEPLOY_TOKEN" /usr/local/bin/object920-deploy.sh || true
