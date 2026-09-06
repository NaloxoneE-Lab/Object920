#!/usr/bin/env bash
# 手动部署到 ECS(与 CI deploy-ecs job 同逻辑;日常部署走 CI,本脚本用于应急/首次)
# 前置:~/.ssh/aliyun-object920.pem(或 SSH_KEY 环境变量)、本机装 rsync
set -euo pipefail

HOST="${ECS_HOST:-47.114.43.241}"
USER_NAME="${ECS_USER:-root}"
KEY="${SSH_KEY:-$HOME/.ssh/aliyun-object920.pem}"
SITE_URL="${DEPLOY_SITE_URL:-http://47.114.43.241}"

export PUBLIC_SITE_URL="$SITE_URL"
export PUBLIC_SEARCH_ENABLED=true
export PUBLIC_SEARCH_PROVIDER=pagefind

pnpm build
DEPLOY_PLATFORM=nginx pnpm run generate:redirects
pnpm run generate:deploy-config -- --platform=nginx

SSH="ssh -i $KEY -o StrictHostKeyChecking=no $USER_NAME@$HOST"
rsync -az --delete -e "ssh -i $KEY -o StrictHostKeyChecking=no" dist/ "$USER_NAME@$HOST:/var/www/object920/"
scp -i "$KEY" -o StrictHostKeyChecking=no dist/nginx/object920.conf "$USER_NAME@$HOST:/etc/nginx/sites-available/object920"
scp -i "$KEY" -o StrictHostKeyChecking=no dist/nginx/object920-redirects.conf "$USER_NAME@$HOST:/etc/nginx/conf.d/object920-redirects.conf"
$SSH 'nginx -t && systemctl reload nginx'
echo "[deploy-ecs] deployed to $HOST (site URL: $SITE_URL)"
