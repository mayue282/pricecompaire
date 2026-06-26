import { decodeHtml, extractModelCodes, parsePrice } from './utils.mjs';

const HN_BASE = 'https://www.harveynorman.com.au';

export function parseHarveynormanHtml(html) {
  const products = [];
  const seen = new Set();
  const source = String(html || '');

  const patterns = [
    /<a[^>]+class="[^"]*product-item-link[^"]*"[^>]*href="([^"]+)"[^>]*title="([^"]+)"[\s\S]{0,1500}?data-price-amount="([\d.]+)"/gi,
    /<a[^>]+class="[^"]*product-item-link[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]{0,1200}?data-price-amount="([\d.]+)"/gi,
    /<a[^>]+class="[^"]*product-item-link[^"]*"[^>]*href="([^"]+)"[^>]*title="([^"]+)"[\s\S]{0,1200}?>\s*\$?\s*([\d,]+(?:\.\d{2})?)/gi,
    /"productName"\s*:\s*"([^"]{5,120})"[\s\S]{0,500}?"price"\s*:\s*"?(\d[\d.,]*)"?/gi,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      let href;
      let title;
      let priceText;

      if (pattern.source.includes('productName')) {
        title = decodeHtml(match[1].trim());
        priceText = match[2];
        href = `${HN_BASE}/catalogsearch/result/?q=${encodeURIComponent(title)}`;
      } else {
        href = match[1];
        title = decodeHtml((match[2] || '').trim());
        priceText = match[3];
      }

      const price = parsePrice(priceText);
      if (!title || title.length < 5 || !price) continue;

      const key = `${title}|${price}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const url = href.startsWith('http') ? href : `${HN_BASE}${href}`;

      products.push({
        store: 'Harvey Norman',
        title,
        price,
        originalPrice: null,
        url,
        image: null,
        sku: extractModelCodes(title)[0] || null,
        brand: null,
        available: true,
      });
    }
  }

  const ldBlocks = [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const [, jsonText] of ldBlocks) {
    try {
      const data = JSON.parse(jsonText);
      const list = Array.isArray(data) ? data : [data];
      for (const entry of list) {
        if (entry['@type'] !== 'Product') continue;
        const title = entry.name;
        const offer = Array.isArray(entry.offers) ? entry.offers[0] : entry.offers;
        const price = parsePrice(offer?.price);
        if (!title || !price) continue;
        const key = `${title}|${price}`;
        if (seen.has(key)) continue;
        seen.add(key);
        products.push({
          store: 'Harvey Norman',
          title,
          price,
          originalPrice: null,
          url: entry.url || `${HN_BASE}/catalogsearch/result/?q=${encodeURIComponent(title)}`,
          image: entry.image?.[0] || entry.image || null,
          sku: entry.sku || extractModelCodes(title)[0] || null,
          brand: entry.brand?.name || entry.brand || null,
          available: true,
        });
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return products.slice(0, 12);
}
