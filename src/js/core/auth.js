// src/js/core/auth.js
// Supabase 클라이언트 초기화 및 인증 헬퍼
// runtime-config.js의 getRuntimeConfig()를 공유하여 중복 fetch 로직 제거

import { getRuntimeConfig, resetRuntimeConfigCache } from './runtime-config.js';

let cachedClient = null;

/**
 * Supabase URL / anon key를 반환합니다.
 * 우선순위: window 전역 → localStorage → runtime-config API
 */
export async function getSupabaseConfig() {
  const runtime = await getRuntimeConfig();
  return {
    url: window.__SUPABASE_URL__
      || localStorage.getItem('supabase:url')
      || runtime.supabaseUrl
      || '',
    anonKey: window.__SUPABASE_ANON_KEY__
      || localStorage.getItem('supabase:anon')
      || runtime.supabaseAnonKey
      || ''
  };
}

/**
 * Supabase 클라이언트 싱글턴을 반환합니다.
 * URL / anon key가 없으면 null을 반환합니다.
 */
export async function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = await getSupabaseConfig();
  if (!url || !anonKey) return null;

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  return cachedClient;
}

/**
 * 이메일 / 비밀번호로 Admin 로그인합니다.
 */
export async function signInAdmin(email, password) {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Add the URL and anon key before using authentication.'
    );
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * 현재 Admin 세션을 반환합니다. 없으면 null.
 */
export async function getAdminSession() {
  const client = await getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session || null;
}

/**
 * Supabase 설정을 localStorage에 저장하고 클라이언트 캐시를 초기화합니다.
 * runtime-config 캐시도 함께 초기화하여 다음 호출 시 최신 값을 반영합니다.
 */
export function setSupabaseConfig(url, anonKey) {
  if (url)     localStorage.setItem('supabase:url', url);
  if (anonKey) localStorage.setItem('supabase:anon', anonKey);
  cachedClient = null;
  resetRuntimeConfigCache();
}
