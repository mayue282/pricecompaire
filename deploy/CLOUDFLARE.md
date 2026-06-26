# Cloudflare Pages 部署

## 重要：先整理 GitHub 仓库

当前 GitHub 仓库结构是乱的（`productprice/productprice/...` 嵌套），Cloudflare 找不到 `index.html`。

请在本机 **项目根目录**（有 `public/`、`api/` 的那层）重新 push：

```bash
cd "/d/MY/翻译工作/productprice"
git add .
git commit -m "Fix repo structure for deployment"
git push -u origin main
```

推送后 GitHub 根目录应直接包含：`public/`、`functions/`、`api/`、`vercel.json`

---

## Cloudflare Pages 设置

在 Cloudflare Dashboard → Workers & Pages → 你的项目 → **Settings → Builds**：

| 配置项 | 值 |
|--------|-----|
| **Production branch** | `main` |
| **Framework preset** | None |
| **Build command** | 留空 |
| **Build output directory** | `public` |
| **Root directory** | 留空（代码在仓库根目录时） |

Cloudflare 会自动读取仓库根目录的 **`wrangler.toml`**（已包含 `nodejs_compat`）。

保存后点 **Retry deployment**。

---

## 日志里这两行的含义

```
No build command specified. Skipping build step.     ← 正常，无需构建
No functions dir at /functions found. Skipping.    ← 旧代码没有 functions/，API 不会运行
```

推送包含 `functions/` 目录的新代码后，第二行会变成检测到 Functions。

---

## 验证

- 首页：`https://你的域名.pages.dev/`
- 健康检查：`https://你的域名.pages.dev/api/health`
- 搜索：`https://你的域名.pages.dev/api/search?q=bose`

---

## 平台对比

| 平台 | 是否推荐 | 说明 |
|------|----------|------|
| **Vercel** | 推荐 | Root Directory 留空，自动识别 `api/` + `public/` |
| **Cloudflare Pages** | 可用 | 需 `public` 输出目录 + `functions/` |
| **纯静态上传** | 不可用 | 没有后端，搜索功能无法工作 |

## 注意事项

- Harvey Norman 在 Cloudflare 机房 IP 上常被拦截
- 不支持 Edge 浏览器抓取（请勿设置 `HN_USE_BROWSER=1`）
