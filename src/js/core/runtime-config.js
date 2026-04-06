let runtimeConfigPromise = null;

export async function getRuntimeConfig() {
  if (runtimeConfigPromise) return runtimeConfigPromise;

  runtimeConfigPromise = (async () => {
    try {
      const response = await fetch('/api/runtime-config', { cache: 'no-store' });
      if (!response.ok) {
        return { supabaseUrl: '', supabaseAnonKey: '', googleMapsApiKey: '', googleMapsMapId: '' };
      }
      return await response.json();
    } catch {
      return { supabaseUrl: '', supabaseAnonKey: '', googleMapsApiKey: '', googleMapsMapId: '' };
    }
  })();

  return runtimeConfigPromise;
}

export function resetRuntimeConfigCache() {
  runtimeConfigPromise = null;
}
