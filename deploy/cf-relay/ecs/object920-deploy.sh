#!/bin/bash
# /usr/local/bin/object920-deploy.sh — 从 Cloudflare Worker 中继拉取部署包并换装
# 依赖:curl rsync tar nginx;环境变量 DEPLOY_URL / DEPLOY_TOKEN 由 systemd EnvironmentFile 提供
set -euo pipefail

state=/var/lib/object920-deploy
mkdir -p "$state"
last=$(cat "$state/version" 2>/dev/null || echo '')

# 轮询:拿不到版本标记(未初始化/网络抖动)就本轮放弃
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
