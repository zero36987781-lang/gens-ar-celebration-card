/**
 * POST /api/results
 * 편집 완료된 카드 데이터(S.els + S.bg)를 R2 버킷(R2_CARDS)에 저장
 * Body: { id, createdAt, els: [...], bg: {...} }
 * Returns: { id, key }
 */
export async function onRequestPost({ request, env }) {
  if (!env.R2_CARDS) {
    return Response.json({ error: 'R2_CARDS binding not configured' }, {
      status: 503,
      headers: corsHeaders()
    });
  }
  try {
    const data = await request.json();
    if (!data.id) {
      return Response.json({ error: 'id is required' }, { status: 400, headers: corsHeaders() });
    }
    const key = `results/${data.id}.json`;
    await env.R2_CARDS.put(key, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' }
    });
    return Response.json({ id: data.id, key }, { headers: corsHeaders() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}
