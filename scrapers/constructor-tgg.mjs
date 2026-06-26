import { parsePrice } from './utils.mjs';

const TGG_BASE = 'https://www.thegoodguys.com.au';
const SHOPIFY_BASE = 'https://checkout.thegoodguys.com.au';
const CNSTR_SCRIPT = 'https://cnstrc.com/js/cust/the_good_guys_hUmYzp.js';
let cachedKey = null;

async function getSearchKey() {
  if (cachedKey) return cachedKey;
  if (process.env.TGG_CONSTRUCTOR_KEY) {
    cachedKey = process.env.TGG_CONSTRUCTOR_KEY;
    return cachedKey;
  }

  const response = await fetch(CNSTR_SCRIPT, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(8000),
  });
  const script = await response.text();

  const patterns = [
    /apiKey\s*:\s*['"](key_[a-zA-Z0-9_-]+)['"]/,
    /apiKey\s*=\s*['"](key_[a-zA-Z0-9_-]+)['"]/,
    /key\s*:\s*['"](key_[a-zA-Z0-9_-]+)['"]/,
  ];

  for (const pattern of patterns) {
    const match = script.match(pattern);
    if (match?.[1]) {
      cachedKey = match[1];
      return cachedKey;
    }
  }

  throw new Error('Constructor.io search key not found');
}

function normalizeHandle(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  if (value.startsWith('http')) {
    const fromProducts = value.match(/\/products\/([^/?#]+)/);
    if (fromProducts) return fromProducts[1];
    const fromRoot = value.match(/thegoodguys\.com\.au\/([^/?#]+)/);
    if (fromRoot && !['search', 'products', 'collections'].includes(fromRoot[1])) {
      return fromRoot[1];
    }
    return null;
  }

  return value.replace(/^\/+/, '').split('?')[0] || null;
}

function buildProductUrl(handle) {
  return `${TGG_BASE}/${handle}`;
}

async function fetchLiveProduct(handle) {
  const url = `${SHOPIFY_BASE}/products/${handle}.json`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const product = data?.product;
  const variants = product?.variants || [];
  if (!product?.handle || !variants.length) return null;

  let lowest = null;
  let lowestCompare = null;

  for (const variant of variants) {
    const price = parsePrice(variant.price);
    if (!price) continue;
    if (!lowest || price < lowest) {
      lowest = price;
      lowestCompare = parsePrice(variant.compare_at_price) || null;
    }
  }

  if (!lowest) return null;

  return {
    handle: product.handle,
    title: product.title,
    price: lowest,
    originalPrice: lowestCompare,
    image: product.images?.[0]?.src || null,
    available: variants.some((v) => v.available !== false),
  };
}

async function verifyProduct(product) {
  const handle = normalizeHandle(product.sku || product.url);
  if (!handle) return null;

  try {
    const live = await fetchLiveProduct(handle);
    if (!live?.price) return null;

    const catalogPrice = product.price;
    let originalPrice = live.originalPrice;
    if (catalogPrice && catalogPrice > live.price) {
      originalPrice = originalPrice && originalPrice > live.price ? originalPrice : catalogPrice;
    }

    return {
      ...product,
      title: live.title || product.title,
      price: live.price,
      originalPrice: originalPrice || null,
      url: buildProductUrl(live.handle),
      image: live.image || product.image,
      sku: live.handle,
      available: live.available,
    };
  } catch {
    return null;
  }
}

export async function searchGoodguysConstructor(query) {
  const key = await getSearchKey();
  const url = `https://ac.cnstrc.com/v1/search/${encodeURIComponent(query)}?key=${encodeURIComponent(key)}&num_results_per_page=12&fmt_options[groups_max_depth]=3&fmt_options[groups_start]=current`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
      Origin: TGG_BASE,
      Referer: `${TGG_BASE}/`,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Constructor search HTTP ${response.status}`);
  }

  const data = await response.json();
  const results = data?.response?.results || [];

  const candidates = results
    .map((item) => {
      const d = item.data || {};
      const title = item.value || d.title || d.name;
      const catalogPrice = parsePrice(d.price ?? d.sale_price ?? d.current_price);
      const rawHandle = d.url || d.handle || item.url;

      if (!title || !catalogPrice) return null;

      const handle = normalizeHandle(rawHandle);
      return {
        store: 'The Good Guys',
        title,
        price: catalogPrice,
        originalPrice: parsePrice(d.original_price ?? d.list_price) || null,
        url: handle ? buildProductUrl(handle) : `${TGG_BASE}/search?q=${encodeURIComponent(title)}`,
        image: d.image_url || d.image || null,
        sku: handle,
        brand: d.brand || d.vendor || null,
        available: true,
      };
    })
    .filter(Boolean)
    .slice(0, 12);

  const verified = (await Promise.all(candidates.map(verifyProduct))).filter(Boolean);
  return verified;
}
