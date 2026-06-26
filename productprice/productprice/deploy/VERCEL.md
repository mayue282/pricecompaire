# Vercel 部署

项目已适配 [Vercel](https://vercel.com) 无服务器部署。

- 前端：`public/` 自动发布
- API：`api/health.js`、`api/search.js`
- 区域：悉尼 `syd1`（更接近澳洲电商）

## 方式一：连接 GitHub（推荐）

1. 先把代码 push 到 GitHub：
   ```powershell
   npm run push-github
   ```

2. 打开 [Vercel Dashboard](https://vercel.com/dashboard)

3. **Add New → Project**，导入仓库 `mayue282/pricecompaire`

4. 保持默认设置：
   - **Framework Preset:** Other
   - **Build Command:** 留空
   - **Output Directory:** 留空（使用 `public/` + `api/`）

5. 点击 **Deploy**

6. 部署完成后访问：`https://pricecompaire.vercel.app`

## 方式二：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## 验证

```bash
curl https://pricecompaire.vercel.app/api/health
curl "https://pricecompaire.vercel.app/api/search?q=bose"
```

## 注意事项

| 项目 | 说明 |
|------|------|
| **Harvey Norman** | Vercel 机房 IP 常被拦截，可能显示「未抓取」 |
| **函数超时** | 免费版最长 10 秒，JB + TGG 通常够用 |
| **浏览器抓取** | Vercel 不支持 Edge 无头浏览器，请勿设置 `HN_USE_BROWSER=1` |
| **自定义域名** | 在 Vercel 项目 Settings → Domains 绑定 |

## 环境变量（可选）

在 Vercel 项目 Settings → Environment Variables 添加：

- `TGG_CONSTRUCTOR_KEY` — 仅当 TGG API 密钥变更时需要
- `CACHE_TTL_MS` — 搜索缓存毫秒数，默认 300000
- `RATE_LIMIT_MAX` — 每 IP 每分钟请求上限，默认 30
