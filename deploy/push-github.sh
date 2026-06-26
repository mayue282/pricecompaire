#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/mayue282/pricecompaire.git"
cd "$(dirname "$0")/.."

if ! command -v git >/dev/null 2>&1; then
  echo "未找到 git，请先安装 Git for Windows"
  exit 1
fi

if [ ! -d .git ]; then
  git init
fi

git add .
if git diff --cached --quiet; then
  echo "没有新的更改需要提交"
else
  git commit -m "Initial commit: AU price comparison site"
fi

git branch -M main 2>/dev/null || true

if git remote | grep -qx origin; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

echo "正在推送到 $REPO_URL ..."
git push -u origin main

echo ""
echo "完成! https://github.com/mayue282/pricecompaire"
