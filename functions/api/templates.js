/**
 * GET /api/templates
 * R2 버킷(R2_CARDS)의 templates/ 폴더에서 템플릿 목록 반환
 * R2 바인딩 설정 전까지는 빈 배열 반환
 */
export async function onRequestGet({ env }) {
  if (!env.R2_CARDS) {
    return Response.json([], { headers: corsHeaders() });
  }
  try {
    const list = await env.R2_CARDS.list({ prefix: 'templates/' });
    const items = list.objects
      .filter(o => o.key.endsWith('.json'))
      .map(o => ({
        id: o.key.replace('templates/', '').replace('.json', ''),
        size: o.size,
        uploaded: o.uploaded
      }));
    return Response.json(items, { headers: corsHeaders() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders() });
  }
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
}
