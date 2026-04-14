/**
 * GET /api/template/:id
 * R2 버킷(R2_CARDS)에서 templates/{id}.json 파일 반환
 * 템플릿 JSON 형식: { id, name, els: [...], bg: {...} }
 */
export async function onRequestGet({ params, env }) {
  if (!env.R2_CARDS) {
    return new Response(JSON.stringify({ error: 'R2_CARDS binding not configured' }), {
      status: 503,
      headers: corsHeaders()
    });
  }
  try {
    const key = `templates/${params.id}.json`;
    const obj = await env.R2_CARDS.get(key);
    if (!obj) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: corsHeaders()
      });
    }
    const text = await obj.text();
    return new Response(text, { headers: corsHeaders() });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders()
    });
  }
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
}
