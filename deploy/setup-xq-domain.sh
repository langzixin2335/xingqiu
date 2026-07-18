#!/bin/bash
set -euo pipefail
APP_DIR="/home/shareholder/shining-planet"
ENV_FILE="$APP_DIR/backend/.env"

sudo cp "$APP_DIR/deploy/nginx-shining-planet.conf" /etc/nginx/conf.d/shining-planet.conf
sudo nginx -t
sudo systemctl reload nginx

sed -i 's|^WECHAT_OAUTH_REDIRECT=.*|WECHAT_OAUTH_REDIRECT=https://xq.dongme.me/auth/wechat/callback|' "$ENV_FILE" 2>/dev/null || true
grep -q '^WECHAT_OAUTH_REDIRECT=' "$ENV_FILE" || echo 'WECHAT_OAUTH_REDIRECT=https://xq.dongme.me/auth/wechat/callback' >> "$ENV_FILE"
sed -i 's|^WECHAT_PAY_NOTIFY_URL=.*|WECHAT_PAY_NOTIFY_URL=https://xq.dongme.me/api/member/pay/notify|' "$ENV_FILE" 2>/dev/null || true

sudo systemctl restart shining-planet
sleep 2
curl -fsS -H 'Host: xq.dongme.me' http://127.0.0.1/api/health || true
echo
echo "Nginx 已配置 xq.dongme.me。请确认 DNS：xq.dongme.me A -> 39.105.51.80"
echo "生效后访问：https://xq.dongme.me/  管理后台：https://xq.dongme.me/admin/"
