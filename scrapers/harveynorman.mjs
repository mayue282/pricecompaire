import { BROWSER_HEADERS, fetchText, isBlockedHtml, withTimeout } from './utils.mjs';
import { parseHarveynormanHtml } from './parse-harveynorman-html.mjs';

const BASE = 'https://www.harveynorman.com.au';
const FETCH_TIMEOUT_MS = 8000;
const BROWSER_TIMEOUT_MS = 20000;
const USE_BROWSER = process.env.HN_USE_BROWSER === '1';

async function loadSearchHtml(query) {
  const url = `${BASE}/catalogsearch/result/?q=${encodeURIComponent(query)}`;
  const direct = await fetchText(
    url,
    { ...BROWSER_HEADERS, Referer: `${BASE}/`, Origin: BASE },
    FETCH_TIMEOUT_MS
  );

  if (!direct.blocked && direct.ok && direct.text.includes('product-item-link')) {
    return { html: direct.text, via: 'fetch' };
  }

  if (!USE_BROWSER) {
    throw new Error('fetch-blocked');
  }

  const { fetchWithBrowser } = await import('./browser-node.mjs');
  const html = await withTimeout(
    fetchWithBrowser(url, { waitMs: 15000 }),
    BROWSER_TIMEOUT_MS,
    'Harvey Norman browser'
  );
  if (isBlockedHtml(html)) {
    throw new Error('browser-blocked');
  }

  return { html, via: 'browser' };
}

export async function searchHarveynorman(query) {
  try {
    const { html, via } = await loadSearchHtml(query);
    const products = parseHarveynormanHtml(html);

    if (!products.length) {
      return {
        store: 'Harvey Norman',
        products: [],
        error: isBlockedHtml(html)
          ? '网站启用了 Imperva 防护，当前环境无法抓取。'
          : '未解析到商品，页面结构可能已变化',
        blocked: isBlockedHtml(html),
        via,
      };
    }

    return {
      store: 'Harvey Norman',
      products,
      error: null,
      blocked: false,
      via,
    };
  } catch (error) {
    const skippedBrowser = !USE_BROWSER && error.message === 'fetch-blocked';
    return {
      store: 'Harvey Norman',
      products: [],
      error: skippedBrowser
        ? '当前网络无法直接访问（已跳过慢速浏览器抓取）。如需尝试浏览器模式，请设置 HN_USE_BROWSER=1 后重启。'
        : `抓取失败：${error.message}`,
      blocked: true,
    };
  }
}
