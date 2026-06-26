// 无服务器环境占位：Cloudflare / Vercel 不会调用浏览器抓取。
export async function fetchWithBrowser() {
  throw new Error('browser-not-supported');
}

export function findEdgePath() {
  throw new Error('browser-not-supported');
}
