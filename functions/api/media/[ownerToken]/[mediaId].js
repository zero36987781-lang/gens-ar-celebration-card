/**
 * GET /api/media/{ownerToken}/{mediaId}
 * R2_CARDS 버킷에서 media/{ownerToken}/{mediaId} 객체를 서빙
 * Range 요청 지원 (video 시킹)
 */
export async function onRequestGet({ request, env, params }) {
  if (!env.R2_CARDS) {
    return new Response('R2_CARDS binding not configured', { status: 503 });
  }

  const { ownerToken, mediaId } = params;
  if (!ownerToken || !mediaId) {
    return new Response('Not found', { status: 404 });
  }

  const key = `media/${ownerToken}/${mediaId}`;
  const rangeHeader = request.headers.get('Range');

  let object;
  if (rangeHeader) {
    object = await env.R2_CARDS.get(key, { range: request });
  } else {
    object = await env.R2_CARDS.get(key);
  }

  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const contentType = object.httpMetadata?.contentType || 'video/mp4';
  const headers = new Headers({
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
    'Access-Control-Allow-Origin': '*'
  });

  if (object.range) {
    const { offset, length } = object.range;
    const total = object.size;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${total}`);
    headers.set('Content-Length', String(length));
    return new Response(object.body, { status: 206, headers });
  }

  if (object.size != null) {
    headers.set('Content-Length', String(object.size));
  }

  return new Response(object.body, { status: 200, headers });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range'
    }
  });
}
