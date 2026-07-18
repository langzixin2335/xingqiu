#!/bin/bash
set -euo pipefail
# 用 npmmirror 安装 Node 22（避免直连 nodejs.org 过慢）
NODE_VER="v22.17.0"
PREFIX="$HOME/.local/node"
ARCH="linux-x64"
URL="https://npmmirror.com/mirrors/node/${NODE_VER}/node-${NODE_VER}-${ARCH}.tar.xz"
TMP="/tmp/node-${NODE_VER}.tar.xz"

mkdir -p "$HOME/.local"
if [ ! -x "$PREFIX/bin/node" ] || ! "$PREFIX/bin/node" -v | grep -q '^v22'; then
  echo "Downloading $URL"
  curl -fL --retry 3 --connect-timeout 20 -o "$TMP" "$URL"
  rm -rf "$PREFIX"
  mkdir -p "$HOME/.local"
  tar -xJf "$TMP" -C "$HOME/.local"
  mv "$HOME/.local/node-${NODE_VER}-${ARCH}" "$PREFIX"
fi

# 写入 profile
MARKER="# shining-planet-node22"
if ! grep -q "$MARKER" "$HOME/.bashrc" 2>/dev/null; then
  {
    echo "$MARKER"
    echo "export PATH=\"\$HOME/.local/node/bin:\$PATH\""
  } >> "$HOME/.bashrc"
fi
export PATH="$HOME/.local/node/bin:$PATH"
node -v
npm -v
