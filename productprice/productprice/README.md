# 澳洲电商比价网站

实时搜索并对比 [JB Hi-Fi](https://www.jbhifi.com.au/)、[The Good Guys](https://www.thegoodguys.com.au/)、[Harvey Norman](https://www.harveynorman.com.au/) 的同类商品价格。

## 快速开始

需要 **Node.js 18+**（自带 `fetch`，无需额外依赖）。

```bash
cd productprice
node server.mjs
```

浏览器打开：**http://localhost:3000**

## 公网部署

| 平台 | 文档 |
|------|------|
| **Vercel**（推荐） | [deploy/VERCEL.md](deploy/VERCEL.md) → https://pricecompaire.vercel.app |
| VPS + Docker | [deploy/README.md](deploy/README.md) |

## 抓取方式

| 网站 | 方式 | 说明 |
|------|------|------|
| JB Hi-Fi | Shopify 搜索 API | 稳定，每次最多 10 条 |
| The Good Guys | Constructor.io 搜索 API | 稳定，含实时价格 |
| The Good Guys | Edge 浏览器备用 | API 失败时启用 |
| Harvey Norman | Edge 无头浏览器 | 需本机安装 Microsoft Edge |

Harvey Norman 默认使用快速模式（约 8 秒内返回）；若需尝试浏览器抓取，设置 `HN_USE_BROWSER=1`。

可选环境变量：

- `EDGE_PATH` — Edge 浏览器路径
- `TGG_CONSTRUCTOR_KEY` — The Good Guys Constructor.io 密钥（通常无需设置，会自动读取）

## 使用建议

- 输入具体型号（如 `Bose QuietComfort Ultra`、`Samsung Galaxy S26`）匹配更准确
- 价格仅供参考，以各官网结算价为准

## API

```
GET /api/search?q=Bose+QuietComfort
```

## 免责声明

本工具仅供个人购物比价参考。请遵守各网站使用条款，合理控制请求频率。
