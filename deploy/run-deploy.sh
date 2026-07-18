#!/bin/bash
set -euo pipefail
export PATH="$HOME/.local/node/bin:$PATH"
export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/laopo_github -o IdentitiesOnly=yes"
cp -f ~/laopo/deploy/deploy-from-git.sh /tmp/deploy-from-git.sh 2>/dev/null || true
chmod +x ~/laopo/deploy/deploy-from-git.sh
bash ~/laopo/deploy/deploy-from-git.sh
