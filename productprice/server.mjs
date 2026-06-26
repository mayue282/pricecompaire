import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { searchJbhifi } from './scrapers/jbhifi.mjs';
import { searchGoodguys } from './scrapers/goodguys.mjs';
import { searchHarveynorman } from './scrapers/harveynorman.mjs';
import { buildComparison } from './scrapers/matcher.mjs';
import { checkRateLimit, getCachedSearch, setCachedSearch } from './server/middleware.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function serveStatic(pathname, res) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath);
  const content = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(content);
}

async function handleSearch(query) {
  const [jb, tgg, hn] = await Promise.all([
    searchJbhifi(query),
    searchGoodguys(query),
    searchHarveynorman(query),
  ]);

  return buildComparison([jb, tgg, hn], query);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, time: new Date().toISOString() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/search') {
    const query = (url.searchParams.get('q') || '').trim();
    if (!query) {
      sendJson(res, 400, { error: '请输入搜索关键词，例如：Bose QuietComfort 或 Samsung Galaxy S26' });
      return;
    }

    const rate = checkRateLimit(req);
    if (!rate.ok) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(rate.retryAfter),
      });
      res.end(JSON.stringify({ error: `请求过于频繁，请 ${rate.retryAfter} 秒后再试` }));
      return;
    }

    const cached = getCachedSearch(query);
    if (cached) {
      sendJson(res, 200, cached);
      return;
    }

    try {
      const data = await handleSearch(query);
      setCachedSearch(query, data);
      sendJson(res, 200, data);
    } catch (error) {
      sendJson(res, 500, { error: error.message || '搜索失败' });
    }
    return;
  }

  serveStatic(url.pathname, res);
});

server.listen(PORT, HOST, () => {
  console.log(`\n  澳洲三家电商比价网站已启动`);
  console.log(`  访问地址: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}\n`);
});
