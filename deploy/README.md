# 公网部署指南

本项目支持 **VPS + 域名 + HTTPS** 长期部署，也支持 **Cloudflare Tunnel** 快速上线。

## 方案一：VPS + Docker + 域名（推荐长期）

### 1. 准备

- 一台有公网 IP 的服务器（建议澳洲/新加坡节点）
- 已购买的域名
- 服务器安装 Docker 与 Docker Compose

### 2. 上传代码

```bash
git clone <你的仓库地址> /opt/productprice
cd /opt/productprice
```

### 3. 配置环境变量

```bash
cp deploy/.env.example .env
# 编辑 .env，填写 DOMAIN 和 ACME_EMAIL
```

示例：

```env
DOMAIN=price.yourdomain.com
ACME_EMAIL=you@example.com
```

### 4. DNS 设置

在域名服务商添加 **A 记录**：

```
price.yourdomain.com  ->  你的 VPS 公网 IP
```

### 5. 启动

```bash
docker compose --env-file .env up -d --build
```

### 6. 验证

```bash
curl https://price.yourdomain.com/api/health
```

浏览器打开 `https://price.yourdomain.com` 即可使用。

### 常用命令

```bash
docker compose logs -f app      # 查看应用日志
docker compose restart app      # 重启应用
docker compose down             # 停止服务
```

---

## 方案二：一键脚本（Linux VPS）

在项目根目录执行：

```bash
DOMAIN=price.yourdomain.com ACME_EMAIL=you@example.com bash deploy/setup-vps.sh
```

---

## 方案三：pm2（不用 Docker）

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

再用 Nginx/Caddy 反代到 `localhost:3000`，并配置 HTTPS。

---

## 方案四：Cloudflare Tunnel（本机快速公网）

适合先让别人试用，电脑需保持开机。

### Windows

```powershell
# 1. 确保本机服务已启动
node server.mjs

# 2. 另开终端，安装 cloudflared 后运行
cloudflared tunnel --url http://localhost:3000
```

终端会输出一个 `*.trycloudflare.com` 公网地址，发给他人即可访问。

### 绑定自己的域名（Cloudflare）

1. 在 Cloudflare 添加站点并修改 NS
2. `cloudflared tunnel login`
3. `cloudflared tunnel create productprice`
4. 配置 Public Hostname 指向 `http://localhost:3000`
5. `cloudflared tunnel run productprice`

---

## 生产环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `3000` | 端口 |
| `TRUST_PROXY` | `1`（Docker） | 信任反代 IP |
| `CACHE_TTL_MS` | `300000` | 搜索缓存 5 分钟 |
| `RATE_LIMIT_MAX` | `30` | 每 IP 每分钟最多搜索次数 |
| `HN_USE_BROWSER` | 未设置 | 设为 `1` 尝试 Harvey Norman 浏览器抓取 |

---

## 注意事项

- Harvey Norman 在机房 IP 上常被拦截，公网部署后可能仍显示「未抓取」
- JB Hi-Fi / The Good Guys 在澳洲 VPS 上成功率更高
- 已内置缓存与限流，降低被封风险
- 价格仅供参考，请遵守各网站使用条款
