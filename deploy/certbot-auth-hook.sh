#!/bin/bash
set -euo pipefail
DIR="/var/www/certbot/.well-known/acme-challenge"
mkdir -p "$DIR"
echo -n "$CERTBOT_VALIDATION" > "$DIR/$CERTBOT_TOKEN"
chmod 644 "$DIR/$CERTBOT_TOKEN"
chown www-data:www-data "$DIR/$CERTBOT_TOKEN" 2>/dev/null || chown nginx:nginx "$DIR/$CERTBOT_TOKEN" 2>/dev/null || true
