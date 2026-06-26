import { decodeHtml, parsePrice } from './utils.mjs';

const TGG_BASE = 'https://www.thegoodguys.com.au';

export function parseGoodguysHtml(html) {
  const products = [];
  const seen = new Set();
  const source = String(html || '');

  const cardRegex = /<h4[^>]*><a[^>]+href="(\/[^"]+)"[^>]*>([^<]+)<\/a><\/h4>/g;

  for (const match of source.matchAll(cardRegex)) {
    const href = match[1];
    const title = decodeHtml(match[2].trim());
    if (!title || title.length < 5) continue;

    const chunk = source.slice(match.index, match.index + 14000);
    const priceMatch = chunk.match(
      /data-testid="product-card-price-section-price"[^>]*>(?:[\s\S]{0,150}?)(?:\$[\s\S]{0,40}?)?([\d,]+(?:\.\d{2})?)/
    );
    const price = parsePrice(priceMatch?.[1]);
    if (!price) continue;

    const key = `${title}|${price}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lookback = source.slice(Math.max(0, match.index - 3000), match.index + 500);
    const imageMatch =
      lookback.match(/src="(https:\/\/cdn\.shopify\.com[^"]+)"/) ||
      chunk.match(/src="(https:\/\/cdn\.shopify\.com[^"]+)"/);
    const ticketMatch = chunk.match(/TICKET[\s\S]{0,400}?\$[\s\S]{0,40}?([\d,]+(?:\.\d{2})?)/i);

    products.push({
      store: 'The Good Guys',
      title,
      price,
      originalPrice: ticketMatch ? parsePrice(ticketMatch[1]) : null,
      url: `${TGG_BASE}${href}`,
      image: imageMatch?.[1]?.replace(/&amp;/g, '&') || null,
      sku: href.split('-').slice(-2).join('-') || null,
      brand: null,
      available: true,
    });
  }

  return products.slice(0, 12);
}
