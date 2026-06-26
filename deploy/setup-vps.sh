#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/productprice}"
DOMAIN="${DOMAIN:-}"
ACME_EMAIL="${ACME_EMAIL:-}"

if [[ $EUID -ne 0 ]]; then
  echo "请使用 root 运行，或在命令前加 sudo"
  exit 1
fi

if [[ -z "$DOMAIN" || -z "$ACME_EMAIL" ]]; then
  echo "用法: DOMAIN=price.example.com ACME_EMAIL=you@example.com bash deploy/setup-vps.sh"
  exit 1
fi

echo "==> 安装依赖"
if command -v apt-get >/dev/null; then
  apt-get update
  apt-get install -y curl git ca-certificates
elif command -v yum >/dev/null; then
  yum install -y curl git ca-certificates
fi

if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs || true
fi

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

echo "==> 同步代码到 $APP_DIR"
mkdir -p "$APP_DIR"
rsync -a --delete --exclude node_modules --exclude .git ./ "$APP_DIR/"

echo "==> 启动 Docker Compose"
cd "$APP_DIR"
export DOMAIN ACME_EMAIL
docker compose up -d --build

echo
echo "部署完成。"
echo "1. 在域名 DNS 添加 A 记录 -> 本机公网 IP"
echo "2. 等待 1-2 分钟后访问: https://$DOMAIN"
echo "3. 查看日志: docker compose logs -f"
