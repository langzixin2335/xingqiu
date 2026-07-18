#!/bin/bash
# 加固 Let's Encrypt 自动续期（方案一）
set -euo pipefail

DOMAIN="m.laios.cn"
APP_DIR="/home/shareholder/shining-planet"
WEBROOT="/var/www/certbot"
HOOKS="/etc/letsencrypt/renewal-hooks"
RENEWAL="/etc/letsencrypt/renewal/m.laios.cn.conf"

echo "==> ACME 目录与钩子"
sudo mkdir -p "$WEBROOT/.well-known/acme-challenge"
sudo chmod -R 755 "$WEBROOT"
sudo chown -R www-data:www-data "$WEBROOT" 2>/dev/null || true

sudo cp "$APP_DIR/deploy/certbot-auth-hook.sh" /usr/local/bin/certbot-auth-hook.sh
sudo cp "$APP_DIR/deploy/certbot-cleanup-hook.sh" /usr/local/bin/certbot-cleanup-hook.sh
sudo cp "$APP_DIR/deploy/certbot-deploy-hook.sh" "$HOOKS/deploy/reload-nginx.sh"
sudo chmod +x /usr/local/bin/certbot-auth-hook.sh /usr/local/bin/certbot-cleanup-hook.sh "$HOOKS/deploy/reload-nginx.sh"

echo "==> 续期方式改为 manual hook（避免 403）"
sudo python3 - <<'PY'
from pathlib import Path
p = Path("/etc/letsencrypt/renewal/m.laios.cn.conf")
lines = []
in_renewal = False
skip = False
keys_done = set()
for line in p.read_text().splitlines():
    if line.strip() == "[renewalparams]":
        in_renewal = True
        lines.append(line)
        continue
    if in_renewal and line.startswith("["):
        in_renewal = False
    if in_renewal and (
        line.startswith("authenticator =")
        or line.startswith("installer =")
        or line.startswith("webroot_path")
        or line.startswith("[[webroot_map]]")
        or line.startswith("m.laios.cn =")
    ):
        continue
    if line.startswith("[[webroot_map]]"):
        skip = True
        continue
    if skip:
        if line.startswith("m.laios.cn"):
            continue
        skip = False
    lines.append(line)

if "[renewalparams]" not in "\n".join(lines):
    lines.append("[renewalparams]")
extra = {
    "authenticator = manual": "authenticator",
    "manual_auth_hook = /usr/local/bin/certbot-auth-hook.sh": "manual_auth_hook",
    "manual_cleanup_hook = /usr/local/bin/certbot-cleanup-hook.sh": "manual_cleanup_hook",
}
# rebuild renewalparams block
out, in_r, added = [], False, set()
for line in lines:
    if line.strip() == "[renewalparams]":
        in_r = True
        out.append(line)
        for k, tag in extra.items():
            out.append(k)
            added.add(tag)
        continue
    if in_r and line.startswith("["):
        in_r = False
    if in_r and (
        line.startswith("authenticator =")
        or line.startswith("manual_auth_hook =")
        or line.startswith("manual_cleanup_hook =")
        or line.startswith("installer =")
        or line.startswith("webroot_path")
    ):
        continue
    out.append(line)
p.write_text("\n".join(out) + "\n")
print(p.read_text())
PY

echo "==> Nginx"
sudo cp "$APP_DIR/deploy/nginx-shining-planet.conf" /etc/nginx/conf.d/shining-planet.conf
sudo nginx -t
sudo systemctl reload nginx

echo "==> 续期模拟"
sudo certbot renew --dry-run

echo "==> 证书信息"
sudo certbot certificates

curl -fsS "https://${DOMAIN}/api/health"
echo
echo "OK: https://${DOMAIN}/"
