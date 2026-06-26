export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const BROWSER_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
};

export function parsePrice(text) {
  if (text == null || text === '') return null;
  const cleaned = String(text).replace(/[^\d.,]/g, '').replace(/,/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function formatAud(amount) {
  if (amount == null) return '—';
  return `$${amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function decodeHtml(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function isBlockedHtml(html) {
  const sample = String(html || '').slice(0, 4000).toLowerCase();
  return (
    sample.includes('access denied') ||
    sample.includes('pardon our interruption') ||
    sample.includes('cf-browser-verification') ||
    sample.includes('please verify you are a human') ||
    sample.includes('incapsula') ||
    sample.includes('err_timed_out') ||
    sample.includes('无法访问此页面')
  );
}

export function withTimeout(promise, timeoutMs, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

export async function fetchText(url, headers = BROWSER_HEADERS, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text, blocked: isBlockedHtml(text) };
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractModelCodes(text) {
  const matches = String(text || '').match(/\b[A-Z0-9][A-Z0-9\-/.]{3,}[A-Z0-9]\b/gi) || [];
  return [...new Set(matches.map((m) => m.toUpperCase()))].filter((m) => /[A-Z]/.test(m) && /\d/.test(m));
}

export function tokenSet(text) {
  const stop = new Set([
    'the', 'and', 'with', 'for', 'from', 'series', 'smart', 'wifi', 'wi', 'fi', 'au', 'australia',
    'black', 'white', 'silver', 'grey', 'gray', 'new', 'product', 'all', 'inch', 'inches',
  ]);
  return new Set(
    normalizeTitle(text)
      .split(' ')
      .filter((t) => t.length > 1 && !stop.has(t))
  );
}

export function extractProductKind(title) {
  const t = normalizeTitle(title);

  const accessoryPattern =
    /\b(cushion|ear pad|earpad|replacement kit|carrying case|case only|cover only|charging case|silicone case|screen protector|mount kit|wall bracket|remote control|power adapter|charger only|battery pack|filter kit|accessory kit|spare part|replacement part)\b/;
  const headphonePattern = /\b(headphones?|over ear|on ear|in ear)\b/;
  const earbudPattern = /\b(earbuds?|true wireless|airpods?)\b/;
  const tvPattern = /\b(tv|television|oled|qled|smart tv)\b/;
  const phonePattern = /\b(phone|iphone|galaxy s|pixel \d|smartphone)\b/;

  if (accessoryPattern.test(t) || (/\bkit\b/.test(t) && !/\btool kit\b/.test(t))) {
    return 'accessory';
  }
  if (earbudPattern.test(t)) return 'earbuds';
  if (headphonePattern.test(t)) return 'headphones';
  if (tvPattern.test(t)) return 'tv';
  if (phonePattern.test(t)) return 'phone';
  return 'general';
}

export function kindsCompatible(kindA, kindB) {
  if (kindA === kindB) return true;
  if (kindA === 'general' || kindB === 'general') return true;
  return false;
}

export function extractStrictVariants(title) {
  const t = normalizeTitle(title);
  const markers = [
    'ultra',
    'pro',
    'max',
    'plus',
    'mini',
    'lite',
    'slim',
    'se',
    'fe',
    'oled',
    'qled',
    'neo qled',
    'airpods pro',
    'airpods max',
  ];
  return markers.filter((m) => t.includes(m));
}

export function extractLineNumbers(title) {
  const t = normalizeTitle(title);
  const nums = new Set();
  for (const m of t.matchAll(/\b(?:qc|quietcomfort)\s*(\d{2})\b/g)) {
    nums.add(m[1]);
  }
  return [...nums];
}

export function variantsCompatible(a, b) {
  const va = extractStrictVariants(a);
  const vb = extractStrictVariants(b);
  if (va.length !== vb.length) return false;
  const setB = new Set(vb);
  return va.every((v) => setB.has(v));
}

export function lineNumbersCompatible(a, b) {
  const na = extractLineNumbers(a);
  const nb = extractLineNumbers(b);
  if (!na.length || !nb.length) return true;
  return na.some((n) => nb.includes(n));
}

export function titlesCompatibleForMatch(a, b) {
  return variantsCompatible(a, b) && lineNumbersCompatible(a, b);
}

export function priceRatioOk(priceA, priceB, maxRatio = 1.85) {
  if (priceA == null || priceB == null) return true;
  const low = Math.min(priceA, priceB);
  const high = Math.max(priceA, priceB);
  if (low <= 0) return false;
  return high / low <= maxRatio;
}

export function similarityScore(a, b) {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (!ta.size || !tb.size) return 0;
  let overlap = 0;
  for (const token of ta) if (tb.has(token)) overlap += 1;
  const union = ta.size + tb.size - overlap;
  let score = union ? overlap / union : 0;

  const ma = extractModelCodes(a);
  const mb = extractModelCodes(b);
  const sharedModels = ma.filter((m) => mb.includes(m));
  if (sharedModels.length) score += 0.45;
  return Math.min(score, 1);
}
