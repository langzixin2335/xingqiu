# Local one-click: optional commit -> push GitHub -> SSH server pull & deploy
# Usage:
#   .\deploy\push-and-deploy.ps1
#   .\deploy\push-and-deploy.ps1 -Message "fix home tasks"
#   .\deploy\push-and-deploy.ps1 -SkipCommit

param(
  [string]$Message = "",
  [switch]$SkipCommit
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Key = "$env:USERPROFILE\.cursor\projects\d-laopo\deploy-keys\shareholder"
if (-not (Test-Path $Key)) {
  $Key = "C:\Users\Lenovo\.cursor\projects\d-laopo\deploy-keys\shareholder"
}
$Server = "shareholder@39.105.51.80"

Set-Location $Root

if (-not $SkipCommit) {
  $status = git status --porcelain
  if ($status) {
    if (-not $Message) {
      $Message = "chore: update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }
    Write-Host "==> commit: $Message"
    git add -A
    git commit -m $Message
  } else {
    Write-Host "==> no local changes"
  }
}

Write-Host "==> push GitHub (abort deploy on failure)"
$pushOk = $false
foreach ($attempt in 1..3) {
  Write-Host "    push attempt $attempt/3 ..."
  git -c http.version=HTTP/1.1 push origin main
  if ($LASTEXITCODE -eq 0) {
    $pushOk = $true
    break
  }
  Start-Sleep -Seconds (5 * $attempt)
}
if (-not $pushOk) {
  Write-Host "GitHub push failed. Deploy aborted to keep versions aligned." -ForegroundColor Red
  Write-Host "Retry: .\deploy\push-and-deploy.ps1 -SkipCommit"
  Write-Host "Emergency only: .\deploy\deploy-via-upload.ps1 -SkipPush"
  exit 1
}

Write-Host "==> server pull from GitHub and deploy"
if (-not (Test-Path $Key)) {
  Write-Host "SSH key not found: $Key" -ForegroundColor Red
  Write-Host "Manual: ssh $Server 'bash ~/laopo/deploy/deploy-from-git.sh'"
  exit 1
}

ssh -i $Key -o StrictHostKeyChecking=accept-new $Server "bash /home/shareholder/laopo/deploy/deploy-from-git.sh"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Server deploy failed (code is already on GitHub)." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Done: https://xq.dongme.me/"
