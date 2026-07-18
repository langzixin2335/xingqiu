#!/bin/bash
set -euo pipefail
APP_DIR="/home/shareholder/shining-planet"
ENV_FILE="$APP_DIR/backend/.env"

pkill -f 'pip install -r /home/shareholder/shining-planet' 2>/dev/null || true
sleep 1

source "$APP_DIR/venv/bin/activate"
pip install -r "$APP_DIR/deploy/requirements-prod.txt"

if ! grep -q '^SECRET_KEY=' "$ENV_FILE"; then
  echo "SECRET_KEY=$(openssl rand -hex 32)" >> "$ENV_FILE"
fi
sed -i 's|^WECHAT_OAUTH_REDIRECT=.*|WECHAT_OAUTH_REDIRECT=http://39.105.51.80/auth/wechat/callback|' "$ENV_FILE" 2>/dev/null || true
grep -q '^WECHAT_OAUTH_REDIRECT=' "$ENV_FILE" || echo 'WECHAT_OAUTH_REDIRECT=http://39.105.51.80/auth/wechat/callback' >> "$ENV_FILE"
grep -q '^SMS_PROVIDER=' "$ENV_FILE" || echo 'SMS_PROVIDER=dev' >> "$ENV_FILE"
grep -q '^DEV_SMS_CODE=' "$ENV_FILE" || echo 'DEV_SMS_CODE=123456' >> "$ENV_FILE"
grep -q '^WECHAT_DEV_MODE=' "$ENV_FILE" || echo 'WECHAT_DEV_MODE=true' >> "$ENV_FILE"

sudo cp "$APP_DIR/deploy/nginx-shining-planet.conf" /etc/nginx/conf.d/shining-planet.conf
sudo nginx -t
sudo systemctl reload nginx
sudo cp "$APP_DIR/deploy/shining-planet.service" /etc/systemd/system/shining-planet.service
sudo systemctl daemon-reload
sudo systemctl enable shining-planet
sudo systemctl restart shining-planet
sleep 2
curl -fsS http://127.0.0.1:8020/api/health
echo
curl -fsS http://127.0.0.1/api/health
echo
echo DONE
