const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 5 * 60 * 1000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);

const searchCache = new Map();
const rateBuckets = new Map();

function pruneRateBuckets(now) {
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(key);
  }
}

export function getClientIp(req) {
  if (process.env.TRUST_PROXY === '1') {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function checkRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  pruneRateBuckets(now);

  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start >= RATE_LIMIT_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.start)) / 1000);
    return { ok: false, retryAfter };
  }
  return { ok: true };
}

export function getCachedSearch(query) {
  const key = query.trim().toLowerCase();
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return { ...entry.data, cached: true };
}

export function setCachedSearch(query, data) {
  const key = query.trim().toLowerCase();
  searchCache.set(key, { at: Date.now(), data });
  if (searchCache.size > 200) {
    const oldest = [...searchCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) searchCache.delete(oldest[0]);
  }
}
