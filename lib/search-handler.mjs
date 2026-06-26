import { checkRateLimit, getCachedSearch, setCachedSearch } from '../server/middleware.mjs';
import { runSearch } from '../lib/search-service.mjs';

function json(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(data));
}

export async function handleSearchRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const query = (url.searchParams.get('q') || '').trim();

  if (!query) {
    json(res, 400, { error: '请输入搜索关键词，例如：Bose QuietComfort 或 Samsung Galaxy S26' });
    return;
  }

  const rate = checkRateLimit(req);
  if (!rate.ok) {
    json(res, 429, { error: `请求过于频繁，请 ${rate.retryAfter} 秒后再试` }, {
      'Retry-After': String(rate.retryAfter),
    });
    return;
  }

  const cached = getCachedSearch(query);
  if (cached) {
    json(res, 200, cached);
    return;
  }

  try {
    const data = await runSearch(query);
    setCachedSearch(query, data);
    json(res, 200, data);
  } catch (error) {
    json(res, 500, { error: error.message || '搜索失败' });
  }
}
