param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$cloudflaredPath = Join-Path $env:TEMP "cloudflared.exe"

function Get-Cloudflared {
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "正在下载 cloudflared..."
    Invoke-WebRequest `
      -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
      -OutFile $cloudflaredPath
  }
  return $cloudflaredPath
}

Write-Host "请确保本机已运行: node server.mjs"
Write-Host "正在启动 Cloudflare 临时公网隧道 -> http://localhost:$Port"
Write-Host ""

$bin = Get-Cloudflared
& $bin tunnel --url "http://localhost:$Port"
