let cachedClient = null;
let runtimeConfigPromise = null;

async function loadRuntimeConfig() {
  if (runtimeConfigPromise) return runtimeConfigPromise;

  runtimeConfigPromise = (async () => {
    try {
      const response = await fetch('/api/runtime-config', { cache: 'no-store' });
      if (!response.ok) return { supabaseUrl: '', supabaseAnonKey: '' };
      return await response.json();
    } catch {
      return { supabaseUrl: '', supabaseAnonKey: '' };
    }
  })();

  return runtimeConfigPromise;
}

export async function getSupabaseConfig() {
  const runtime = await loadRuntimeConfig();
  return {
    url: window.__SUPABASE_URL__ || localStorage.getItem('supabase:url') || runtime.supabaseUrl || '',
    anonKey: window.__SUPABASE_ANON_KEY__ || localStorage.getItem('supabase:anon') || runtime.supabaseAnonKey || ''
  };
}

export async function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = await getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  return cachedClient;
}

export async function signInAdmin(email, password) {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured. Add URL and anon key before using real auth.');
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function getAdminSession() {
  const client = await getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session || null;
}

export function setSupabaseConfig(url, anonKey) {
  if (url) localStorage.setItem('supabase:url', url);
  if (anonKey) localStorage.setItem('supabase:anon', anonKey);
  cachedClient = null;
  runtimeConfigPromise = null;
}
