#!/bin/bash
# 从 GitHub 拉取最新代码并部署到线上运行目录
# 用法：bash /home/shareholder/laopo/deploy/deploy-from-git.sh
set -euo pipefail

# 公开仓库用 HTTPS；若改为私有，把 REPO_URL 换成 git@ 并配置 Deploy Key
REPO_URL="https://github.com/langzixin2335/xingqiu.git"
SRC_DIR="/home/shareholder/laopo"
APP_DIR="/home/shareholder/shining-planet"
BRANCH="main"
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -i $HOME/.ssh/laopo_github -o IdentitiesOnly=yes}"

# Vite 8 需要 Node >= 20（优先使用 ~/.local/node）
if [ -x "$HOME/.local/node/bin/node" ]; then
  export PATH="$HOME/.local/node/bin:$PATH"
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1 || true
fi

echo "==> Node: $(node -v)  npm: $(npm -v)"
NODE_MAJOR=$(node -v | sed 's/v//;s/\..*//')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node 版本过低，请先执行: bash $SRC_DIR/deploy/install-node22.sh"
  exit 1
fi

echo "==> [1/6] 拉取代码"
if [ ! -d "$SRC_DIR/.git" ]; then
  git clone -b "$BRANCH" "$REPO_URL" "$SRC_DIR"
else
  cd "$SRC_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

echo "==> [2/6] 保留线上 .env"
mkdir -p "$APP_DIR/backend" "$APP_DIR/frontend" "$APP_DIR/admin" "$APP_DIR/deploy"
if [ -f "$APP_DIR/backend/.env" ]; then
  cp "$APP_DIR/backend/.env" "$SRC_DIR/backend/.env"
elif [ -f "$SRC_DIR/backend/.env.example" ] && [ ! -f "$SRC_DIR/backend/.env" ]; then
  cp "$SRC_DIR/backend/.env.example" "$SRC_DIR/backend/.env"
fi

echo "==> [3/6] 安装后端依赖"
if [ ! -d "$APP_DIR/venv" ]; then
  python3 -m venv "$APP_DIR/venv"
fi
# shellcheck disable=SC1091
source "$APP_DIR/venv/bin/activate"
pip install -q --upgrade pip
pip install -q -r "$SRC_DIR/deploy/requirements-prod.txt"

echo "==> [4/6] 构建前端与管理后台"
cd "$SRC_DIR/frontend"
npm ci
npm run build

cd "$SRC_DIR/admin"
npm ci
npm run build

echo "==> [5/6] 同步到运行目录"
rsync -a --delete \
  --exclude '.env' \
  --exclude '__pycache__' \
  --exclude '*.db' \
  --exclude '.venv' \
  "$SRC_DIR/backend/" "$APP_DIR/backend/"

if [ -f "$SRC_DIR/backend/.env" ]; then
  cp "$SRC_DIR/backend/.env" "$APP_DIR/backend/.env"
fi

rsync -a --delete "$SRC_DIR/frontend/dist/" "$APP_DIR/frontend/"
rsync -a --delete "$SRC_DIR/admin/dist/" "$APP_DIR/admin/"
rsync -a "$SRC_DIR/deploy/" "$APP_DIR/deploy/"

echo "==> [6/6] 重载服务"
sudo cp "$APP_DIR/deploy/nginx-shining-planet.conf" /etc/nginx/conf.d/shining-planet.conf
sudo nginx -t
sudo systemctl reload nginx
sudo cp "$APP_DIR/deploy/shining-planet.service" /etc/systemd/system/shining-planet.service
sudo systemctl daemon-reload
sudo systemctl restart shining-planet
sleep 2
curl -fsS http://127.0.0.1:8020/api/health
echo
echo "✅ 部署完成"
echo "   用户端: https://xq.dongme.me/"
echo "   管理后台: https://xq.dongme.me/admin/"
echo "   提交: $(cd "$SRC_DIR" && git rev-parse --short HEAD)"
