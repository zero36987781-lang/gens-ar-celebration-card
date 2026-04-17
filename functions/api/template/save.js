/**
 * POST /api/template/save
 * JSON: { key: string, data: object }
 * R2_CARDS 버킷에 key 경로로 template.json 저장
 * key 형식: users/{sanitized_email}/cards/{card_id}/template.json
 * Returns: { key }
 */
export async function onRequestPost({ request, env }) {
  if (!env.R2_CARDS) {
    return Response.json({ error: 'R2_CARDS binding not configured' }, {
      status: 503,
      headers: corsHeaders()
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, {
      status: 400,
      headers: corsHeaders()
    });
  }

  const { key, data } = body;

  if (!key || typeof key !== 'string') {
    return Response.json({ error: 'key is required' }, {
      status: 400,
      headers: corsHeaders()
    });
  }

  // key 형식 검증: users/*/cards/*/template.json
  if (!key.startsWith('users/') || !key.includes('/cards/') || !key.endsWith('/template.json')) {
    return Response.json({ error: 'Invalid key format' }, {
      status: 400,
      headers: corsHeaders()
    });
  }

  if (!data || typeof data !== 'object') {
    return Response.json({ error: 'data is required' }, {
      status: 400,
      headers: corsHeaders()
    });
  }

  try {
    await env.R2_CARDS.put(key, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { savedAt: new Date().toISOString() }
    });

    return Response.json({ key }, { headers: corsHeaders() });
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}
