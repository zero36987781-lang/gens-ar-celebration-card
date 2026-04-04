export async function onRequestGet(context) {
  const origin = context.request.headers.get('Origin') || '*';
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type'
  };

  const supabaseUrl = context.env.SUPABASE_URL || '';
  const supabaseAnonKey = context.env.SUPABASE_ANON_KEY || '';
  const googleMapsApiKey = context.env.GOOGLE_MAPS_API_KEY || '';
  const googleMapsMapId = context.env.GOOGLE_MAPS_MAP_ID || '';

  return new Response(JSON.stringify({
    supabaseUrl,
    supabaseAnonKey,
    googleMapsApiKey,
    googleMapsMapId,
    cloudflare: true
  }), { headers });
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin') || '*';
  return new Response(null, {
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'Content-Type'
    }
  });
}
