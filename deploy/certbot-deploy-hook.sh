#!/bin/bash
# Certbot 续期成功后自动重载 Nginx
nginx -t && systemctl reload nginx
