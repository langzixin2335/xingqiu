# Build locally and upload to server (does not require server -> GitHub)
# Usage: .\deploy\deploy-via-upload.ps1
#        .\deploy\deploy-via-upload.ps1 -SkipPush

param(
  [string]$Message = "",
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Key = "C:\Users\Lenovo\.cursor\projects\d-laopo\deploy-keys\shareholder"
$Server = "shareholder@39.105.51.80"

Set-Location $Root

$status = git status --porcelain
if ($status) {
  if (-not $Message) { $Message = "chore: deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
  Write-Host "==> commit: $Message"
  git add -A
  git commit -m $Message
}

if (-not $SkipPush) {
  Write-Host "==> push GitHub"
  git push origin main
}

Write-Host "==> build frontend"
Set-Location "$Root\frontend"
npm run build

Write-Host "==> build admin"
Set-Location "$Root\admin"
npm run build

Set-Location $Root
$stage = Join-Path $env:TEMP "laopo-deploy"
Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "$stage\backend","$stage\frontend","$stage\admin","$stage\deploy" | Out-Null
Copy-Item -Recurse "$Root\backend\app" "$stage\backend\"
Copy-Item "$Root\backend\requirements.txt" "$stage\backend\" -ErrorAction SilentlyContinue
Copy-Item -Recurse "$Root\frontend\dist\*" "$stage\frontend\"
Copy-Item -Recurse "$Root\admin\dist\*" "$stage\admin\"
Copy-Item "$Root\deploy\*" "$stage\deploy\"
tar -czf "$env:TEMP\laopo-deploy.tar.gz" -C $stage .

Write-Host "==> upload and publish"
scp -i $Key -o StrictHostKeyChecking=accept-new "$env:TEMP\laopo-deploy.tar.gz" "${Server}:~/laopo-deploy.tar.gz"

$remote = @'
set -e
APP=/home/shareholder/shining-planet
TMP=/tmp/laopo-deploy
rm -rf "$TMP"
mkdir -p "$TMP"
tar -xzf ~/laopo-deploy.tar.gz -C "$TMP"
rsync -a --delete --exclude '.env' --exclude '*.db' --exclude '__pycache__' "$TMP/backend/" "$APP/backend/"
rsync -a --delete "$TMP/frontend/" "$APP/frontend/"
rsync -a --delete "$TMP/admin/" "$APP/admin/"
rsync -a "$TMP/deploy/" "$APP/deploy/"
source "$APP/venv/bin/activate"
pip install -q -r "$APP/deploy/requirements-prod.txt"
sudo cp "$APP/deploy/nginx-shining-planet.conf" /etc/nginx/conf.d/shining-planet.conf
sudo nginx -t && sudo systemctl reload nginx
sudo cp "$APP/deploy/shining-planet.service" /etc/systemd/system/shining-planet.service
sudo systemctl daemon-reload
sudo systemctl restart shining-planet
sleep 2
curl -fsS http://127.0.0.1:8020/api/health
echo
echo DONE
'@
$remote | ssh -i $Key $Server "bash -s"

Write-Host "Done: https://xq.dongme.me/"
