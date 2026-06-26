# 一键推送到 GitHub
# 用法: powershell -ExecutionPolicy Bypass -File deploy/push-github.ps1

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/mayue282/pricecompaire.git"
$ProjectDir = Resolve-Path (Join-Path $PSScriptRoot "..")

Set-Location $ProjectDir

function Find-Git {
  $paths = @(
    "git",
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe"
  )
  foreach ($p in $paths) {
    $cmd = Get-Command $p -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    if (Test-Path $p) { return $p }
  }
  return $null
}

$git = Find-Git
if (-not $git) {
  Write-Host "未找到 Git。请先安装: https://git-scm.com/download/win"
  Write-Host "安装后重新打开终端，再运行本脚本。"
  exit 1
}

Write-Host "使用 Git: $git"
Write-Host "项目目录: $ProjectDir"
Write-Host ""

if (-not (Test-Path ".git")) {
  & $git init
}

& $git add .
& $git status

$hasChanges = & $git status --porcelain
if ($hasChanges) {
  & $git commit -m "Initial commit: AU price comparison site"
} else {
  Write-Host "没有新的更改需要提交。"
}

$branch = (& $git branch --show-current 2>$null)
if (-not $branch) {
  & $git checkout -b main
} elseif ($branch -ne "main") {
  & $git branch -M main
}

$remotes = & $git remote 2>$null
if ($remotes -notcontains "origin") {
  & $git remote add origin $RepoUrl
} else {
  & $git remote set-url origin $RepoUrl
}

Write-Host ""
Write-Host "正在推送到 $RepoUrl ..."
& $git push -u origin main

Write-Host ""
Write-Host "完成! 仓库地址: https://github.com/mayue282/pricecompaire"
