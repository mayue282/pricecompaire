import { runSearch } from '../../lib/search-service.mjs';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const query = (url.searchParams.get('q') || '').trim();

  if (!query) {
    return Response.json(
      { error: '请输入搜索关键词，例如：Bose QuietComfort 或 Samsung Galaxy S26' },
      { status: 400 }
    );
  }

  try {
    const data = await runSearch(query);
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.message || '搜索失败' }, { status: 500 });
  }
}
