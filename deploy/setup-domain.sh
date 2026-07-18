#!/bin/bash
set -euo pipefail

DOMAIN="m.laios.cn"
APP_DIR="/home/shareholder/shining-planet"
WEBROOT="/var/www/certbot"

echo "==> Prepare certbot webroot"
sudo mkdir -p "$WEBROOT"
sudo chown -R www-data:www-data "$WEBROOT" 2>/dev/null || sudo chown -R nginx:nginx "$WEBROOT" 2>/dev/null || true

echo "==> Deploy interim HTTP-only nginx (for certificate issue)"
sudo tee /etc/nginx/conf.d/shining-planet.conf >/dev/null <<'NGINX'
upstream shining_planet_api {
    server 127.0.0.1:8020;
}

server {
    listen 80;
    server_name 39.105.51.80;

    client_max_body_size 50M;
    root /home/shareholder/shining-planet/frontend;
    index index.html;

    location /api/ {
        proxy_pass http://shining_planet_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /admin/ {
        alias /home/shareholder/shining-planet/admin/;
        try_files $uri $uri/ /admin/index.html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name m.laios.cn;

    client_max_body_size 50M;
    root /home/shareholder/shining-planet/frontend;
    index index.html;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location /api/ {
        proxy_pass http://shining_planet_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /admin/ {
        alias /home/shareholder/shining-planet/admin/;
        try_files $uri $uri/ /admin/index.html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo nginx -t
sudo systemctl reload nginx

echo "==> Issue Let's Encrypt certificate"
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  sudo certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
    --non-interactive --agree-tos --register-unsafely-without-email
fi

echo "==> Deploy full nginx with HTTPS"
sudo cp "$APP_DIR/deploy/nginx-shining-planet.conf" /etc/nginx/conf.d/shining-planet.conf
sudo nginx -t
sudo systemctl reload nginx

echo "==> Update backend env"
ENV_FILE="$APP_DIR/backend/.env"
sed -i "s|^WECHAT_OAUTH_REDIRECT=.*|WECHAT_OAUTH_REDIRECT=https://${DOMAIN}/auth/wechat/callback|" "$ENV_FILE" 2>/dev/null || true
grep -q '^WECHAT_OAUTH_REDIRECT=' "$ENV_FILE" || echo "WECHAT_OAUTH_REDIRECT=https://${DOMAIN}/auth/wechat/callback" >> "$ENV_FILE"
sed -i "s|^WECHAT_PAY_NOTIFY_URL=.*|WECHAT_PAY_NOTIFY_URL=https://${DOMAIN}/api/member/pay/notify|" "$ENV_FILE" 2>/dev/null || true

sudo systemctl restart shining-planet
sleep 2
curl -fsS "https://${DOMAIN}/api/health"
echo
echo "Done: https://${DOMAIN}/"
