/**
 * POST /api/media/upload
 * multipart/form-data: file(Blob), mediaId(str), ownerToken(str)
 * R2_CARDS 버킷에 media/{ownerToken}/{mediaId} 경로로 저장
 * Returns: { key, mediaId, ownerToken }
 */
export async function onRequestPost({ request, env }) {
  if (!env.R2_CARDS) {
    return Response.json({ error: 'R2_CARDS binding not configured' }, {
      status: 503,
      headers: corsHeaders()
    });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid multipart/form-data' }, {
      status: 400,
      headers: corsHeaders()
    });
  }

  const mediaId    = formData.get('mediaId');
  const ownerToken = formData.get('ownerToken');
  const customKey  = formData.get('key');
  const file       = formData.get('file');

  if (!ownerToken) {
    return Response.json({ error: 'ownerToken is required' }, {
      status: 400,
      headers: corsHeaders()
    });
  }
  if (!file || typeof file.stream !== 'function') {
    return Response.json({ error: 'file is required' }, {
      status: 400,
      headers: corsHeaders()
    });
  }

  let key;
  if (customKey) {
    key = customKey;
  } else {
    if (!mediaId || !mediaId.startsWith('media-')) {
      return Response.json({ error: 'Invalid mediaId format' }, {
        status: 400,
        headers: corsHeaders()
      });
    }
    key = `media/${ownerToken}/${mediaId}`;
  }

  try {
    await env.R2_CARDS.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'video/mp4'
      },
      customMetadata: {
        ownerToken,
        mediaId,
        originalName: file.name || '',
        uploadedAt: new Date().toISOString()
      }
    });

    return Response.json({ key, mediaId, ownerToken }, { headers: corsHeaders() });
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
