import {
  extractModelCodes,
  extractProductKind,
  formatAud,
  kindsCompatible,
  priceRatioOk,
  similarityScore,
  titlesCompatibleForMatch,
} from './utils.mjs';

const STORES = ['JB Hi-Fi', 'The Good Guys', 'Harvey Norman'];
const MIN_MATCH_SCORE = 0.42;

function pickBestMatch(source, candidates) {
  let best = null;
  let bestScore = 0;
  const sourceKind = extractProductKind(source.title);

  candidates.forEach((candidate, index) => {
    const candidateKind = extractProductKind(candidate.title);
    if (!kindsCompatible(sourceKind, candidateKind)) return;
    if (!titlesCompatibleForMatch(source.title, candidate.title)) return;

    const score = similarityScore(source.title, candidate.title);
    const sourceModels = extractModelCodes(`${source.title} ${source.sku || ''}`);
    const candidateModels = extractModelCodes(`${candidate.title} ${candidate.sku || ''}`);
    const sharedModels = sourceModels.filter((m) => candidateModels.includes(m));
    const modelBoost = sharedModels.length ? 0.35 : 0;

    let total = score + modelBoost;

    // Accessory/main product must share a model code or nearly identical title.
    if (sourceKind === 'accessory' || candidateKind === 'accessory') {
      if (!sharedModels.length && score < 0.72) return;
    }

    if (!priceRatioOk(source.price, candidate.price)) return;

    if (total > bestScore) {
      bestScore = total;
      best = { item: candidate, index, score: total };
    }
  });

  if (!best || best.score < MIN_MATCH_SCORE) return null;
  return best;
}

export function buildComparison(results, query) {
  const byStore = Object.fromEntries(results.map((r) => [r.store, r]));
  const anchorStore = results.find((r) => r.products.length)?.store || 'JB Hi-Fi';
  const anchorProducts = byStore[anchorStore]?.products || [];

  const comparisons = anchorProducts.map((anchor) => {
    const row = {
      matchKey: anchor.sku || anchor.title,
      title: anchor.title,
      image: anchor.image,
      stores: {},
      cheapest: null,
      savings: null,
    };

    for (const store of STORES) {
      row.stores[store] = null;
    }

    row.stores[anchorStore] = anchor;

    for (const store of STORES) {
      if (store === anchorStore) continue;
      const pool = byStore[store]?.products || [];
      const match = pickBestMatch(anchor, pool);
      if (match) row.stores[store] = match.item;
    }

    const priced = STORES.map((s) => row.stores[s]).filter((p) => p?.price != null);
    if (priced.length >= 2) {
      priced.sort((a, b) => a.price - b.price);
      row.cheapest = priced[0].store;
      const highest = priced[priced.length - 1].price;
      const lowest = priced[0].price;
      row.savings = highest > lowest ? highest - lowest : 0;
    } else {
      row.savings = null;
      row.cheapest = priced.length === 1 ? priced[0].store : null;
    }

    return row;
  });

  return {
    query,
    fetchedAt: new Date().toISOString(),
    stores: results.map((r) => ({
      name: r.store,
      count: r.products.length,
      error: r.error,
      blocked: r.blocked,
      via: r.via || null,
    })),
    comparisons: comparisons.slice(0, 10),
    allProducts: results,
    summary: summarize(comparisons),
  };
}

function summarize(comparisons) {
  const withMultiple = comparisons.filter((row) => {
    const priced = STORES.map((s) => row.stores[s]?.price).filter(Boolean);
    return priced.length >= 2 && row.savings != null && row.savings > 0;
  });

  if (!withMultiple.length) {
    return { message: '暂未能匹配到跨店同款商品，可尝试更精确的关键词（如型号）。' };
  }

  const bestDeal = [...withMultiple].sort((a, b) => (b.savings || 0) - (a.savings || 0))[0];
  const cheapestPrice = STORES.map((s) => bestDeal.stores[s]).find((p) => p?.price != null)?.price;

  return {
    message: `最大价差 ${formatAud(bestDeal.savings)}：${bestDeal.title}`,
    bestStore: bestDeal.cheapest,
    bestPrice: cheapestPrice,
  };
}
