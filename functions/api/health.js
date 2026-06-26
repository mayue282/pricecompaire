export async function onRequestGet() {
  return Response.json(
    { ok: true, time: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
