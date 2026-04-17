/**
 * GET /api/template/load?key=users/{email}/cards/{cardId}/template.json
 * R2_CARDS 버킷에서 template.json 조회
 * Returns: template JSON object
 */
export async function onRequestGet({ request, env }) {
  if (!env.R2_CARDS) {
    return Response.json({ error: 'R2_CARDS binding not configured' }, {
      status: 503,
      headers: corsHeaders()
    });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!key || typeof key !== 'string') {
    return Response.json({ error: 'key query param is required' }, {
      status: 400,
      headers: corsHeaders()
    });
  }

  if (!key.startsWith('users/') || !key.includes('/cards/') || !key.endsWith('/template.json')) {
    return Response.json({ error: 'Invalid key format' }, {
      status: 400,
      headers: corsHeaders()
    });
  }

  try {
    const obj = await env.R2_CARDS.get(key);
    if (!obj) {
      return Response.json({ error: 'Not found' }, {
        status: 404,
        headers: corsHeaders()
      });
    }
    const data = await obj.json();
    return Response.json(data, { headers: corsHeaders() });
  } catch (e) {
    return Response.json({ error: e.message }, {
      status: 500,
      headers: corsHeaders()
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}
