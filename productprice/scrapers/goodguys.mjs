import { searchGoodguysConstructor } from './constructor-tgg.mjs';
import { BROWSER_HEADERS, fetchText, isBlockedHtml, withTimeout } from './utils.mjs';
import { fetchWithBrowser } from './browser.mjs';
import { parseGoodguysHtml } from './parse-goodguys-html.mjs';

const USE_BROWSER_FALLBACK = process.env.TGG_USE_BROWSER === '1';
const BROWSER_FALLBACK_TIMEOUT_MS = 25000;

const BASE = 'https://www.thegoodguys.com.au';

function normalizeUrl(url) {
  if (!url) return `${BASE}/search`;
  return url
    .replace('https://checkout.thegoodguys.com.au/products/', `${BASE}/`)
    .replace('http://checkout.thegoodguys.com.au/products/', `${BASE}/`)
    .replace('https://checkout.thegoodguys.com.au/', `${BASE}/`)
    .replace(`${BASE}/products/`, `${BASE}/`);
}

function normalizeProducts(products) {
  return products.map((p) => ({ ...p, url: normalizeUrl(p.url) }));
}

async function searchViaBrowser(query) {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}`;
  const html = await withTimeout(
    fetchWithBrowser(url, { waitMs: 20000 }),
    BROWSER_FALLBACK_TIMEOUT_MS,
    'The Good Guys browser'
  );
  if (isBlockedHtml(html)) throw new Error('browser-blocked');
  return normalizeProducts(parseGoodguysHtml(html));
}

async function searchViaFetch(query) {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}`;
  const { ok, text, blocked } = await fetchText(url, {
    ...BROWSER_HEADERS,
    Referer: `${BASE}/`,
    Origin: BASE,
  });
  if (blocked || !ok) throw new Error('fetch-blocked');
  return normalizeProducts(parseGoodguysHtml(text));
}

export async function searchGoodguys(query) {
  const attempts = [];

  try {
    const products = normalizeProducts(await searchGoodguysConstructor(query));
    if (products.length) {
      return { store: 'The Good Guys', products, error: null, blocked: false, via: 'constructor' };
    }
    attempts.push('constructor: empty');
  } catch (error) {
    attempts.push(`constructor: ${error.message}`);
  }

  if (USE_BROWSER_FALLBACK) {
    try {
      const products = await searchViaBrowser(query);
      if (products.length) {
        return { store: 'The Good Guys', products, error: null, blocked: false, via: 'browser' };
      }
      attempts.push('browser: empty');
    } catch (error) {
      attempts.push(`browser: ${error.message}`);
    }
  }

  try {
    const products = await searchViaFetch(query);
    if (products.length) {
      return { store: 'The Good Guys', products, error: null, blocked: false, via: 'fetch' };
    }
    attempts.push('fetch: empty');
  } catch (error) {
    attempts.push(`fetch: ${error.message}`);
  }

  return {
    store: 'The Good Guys',
    products: [],
    error: `抓取失败（${attempts.join('; ')}）`,
    blocked: true,
  };
}
