import { BROWSER_HEADERS, fetchText, parsePrice } from './utils.mjs';

const BASE = 'https://www.jbhifi.com.au';

export async function searchJbhifi(query, limit = 10) {
  const url = `${BASE}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=${Math.min(limit, 10)}`;
  const { ok, status, text, blocked } = await fetchText(url, {
    ...BROWSER_HEADERS,
    Accept: 'application/json, text/plain, */*',
    Referer: `${BASE}/`,
  });

  if (!ok) {
    return { store: 'JB Hi-Fi', products: [], error: `HTTP ${status}`, blocked };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { store: 'JB Hi-Fi', products: [], error: 'Invalid JSON response', blocked };
  }

  const items = data?.resources?.results?.products || [];
  const products = items.map((item) => ({
    store: 'JB Hi-Fi',
    title: item.title,
    price: parsePrice(item.price),
    originalPrice: parsePrice(item.compare_at_price_max || item.compare_at_price_min),
    url: item.url?.startsWith('http') ? item.url : `${BASE}${item.url}`,
    image: item.image || item.featured_image?.url || null,
    sku: item.handle,
    brand: item.vendor || null,
    available: item.available !== false,
  }));

  return { store: 'JB Hi-Fi', products, error: null, blocked: false };
}
