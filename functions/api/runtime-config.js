// functions/api/runtime-config.js
// Cloudflare Pages Function — serves environment secrets to the client

export async function onRequestGet(context) {
  const { env } = context;

  const config = {
    supabaseUrl: env.SUPABASE_URL || '',
    supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || '',
    googleMapsMapId: env.GOOGLE_MAPS_MAP_ID || ''
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
