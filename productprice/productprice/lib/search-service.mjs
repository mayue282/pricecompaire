export async function runSearch(query) {
  const { searchJbhifi } = await import('../scrapers/jbhifi.mjs');
  const { searchGoodguys } = await import('../scrapers/goodguys.mjs');
  const { searchHarveynorman } = await import('../scrapers/harveynorman.mjs');
  const { buildComparison } = await import('../scrapers/matcher.mjs');

  const [jb, tgg, hn] = await Promise.all([
    searchJbhifi(query),
    searchGoodguys(query),
    searchHarveynorman(query),
  ]);

  return buildComparison([jb, tgg, hn], query);
}
