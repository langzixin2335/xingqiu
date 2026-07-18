#!/bin/bash
set -euo pipefail

APP_DIR="/home/shareholder/shining-planet"
RELEASE_DIR="/home/shareholder/shining-planet-release"

echo "==> Preparing directories"
mkdir -p "$APP_DIR"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf /home/shareholder/shining-planet-release.tar.gz -C "$RELEASE_DIR"

echo "==> Syncing application files"
rsync -a --delete "$RELEASE_DIR/backend/" "$APP_DIR/backend/"
rsync -a --delete "$RELEASE_DIR/frontend/" "$APP_DIR/frontend/"
rsync -a --delete "$RELEASE_DIR/admin/" "$APP_DIR/admin/"
mkdir -p "$APP_DIR/deploy"
cp -r "$RELEASE_DIR/deploy/"* "$APP_DIR/deploy/"

echo "==> Python virtualenv"
if [ ! -d "$APP_DIR/venv" ]; then
  python3 -m venv "$APP_DIR/venv"
fi
source "$APP_DIR/venv/bin/activate"
pip install --upgrade pip
pip install -r "$APP_DIR/deploy/requirements-prod.txt"

echo "==> Production env"
ENV_FILE="$APP_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$APP_DIR/backend/.env.example" "$ENV_FILE" 2>/dev/null || touch "$ENV_FILE"
fi
if ! grep -q '^SECRET_KEY=' "$ENV_FILE"; then
  echo "SECRET_KEY=$(openssl rand -hex 32)" >> "$ENV_FILE"
fi
sed -i 's|^WECHAT_OAUTH_REDIRECT=.*|WECHAT_OAUTH_REDIRECT=http://39.105.51.80/auth/wechat/callback|' "$ENV_FILE" || true
grep -q '^WECHAT_OAUTH_REDIRECT=' "$ENV_FILE" || echo 'WECHAT_OAUTH_REDIRECT=http://39.105.51.80/auth/wechat/callback' >> "$ENV_FILE"
sed -i 's|^WECHAT_PAY_NOTIFY_URL=.*|WECHAT_PAY_NOTIFY_URL=http://39.105.51.80/api/member/pay/notify|' "$ENV_FILE" || true
grep -q '^SMS_PROVIDER=' "$ENV_FILE" || echo 'SMS_PROVIDER=dev' >> "$ENV_FILE"
grep -q '^DEV_SMS_CODE=' "$ENV_FILE" || echo 'DEV_SMS_CODE=123456' >> "$ENV_FILE"
grep -q '^WECHAT_DEV_MODE=' "$ENV_FILE" || echo 'WECHAT_DEV_MODE=true' >> "$ENV_FILE"

echo "==> Nginx"
sudo cp "$APP_DIR/deploy/nginx-shining-planet.conf" /etc/nginx/conf.d/shining-planet.conf
sudo nginx -t
sudo systemctl reload nginx

echo "==> Systemd service"
sudo cp "$APP_DIR/deploy/shining-planet.service" /etc/systemd/system/shining-planet.service
sudo systemctl daemon-reload
sudo systemctl enable shining-planet
sudo systemctl restart shining-planet

sleep 2
curl -fsS http://127.0.0.1:8020/api/health
echo
curl -fsS http://127.0.0.1/api/health
echo
echo "Deploy complete: http://39.105.51.80/  admin: http://39.105.51.80/admin/"
