export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function generateSlug(prefix = 'gift') {
  const token = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${token}`;
}

export function toIsoFromHours(hours) {
  return new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString();
}

export function isExpired(dateString) {
  return !dateString || Date.now() > new Date(dateString).getTime();
}

export function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.href;
  } catch {
    return '';
  }
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return 'Unknown';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function haversineMeters(aLat, aLng, bLat, bLng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function setStatus(element, text, tone = 'muted') {
  if (!element) return;
  element.textContent = text;
  element.className = `status-box ${tone}`;
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getCurrentPosition(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) {
  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not available on this device.');
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function parseSlugFromLocation() {
  const querySlug = new URLSearchParams(window.location.search).get('slug');
  if (querySlug) return querySlug;
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  return pathParts[pathParts.length - 1] || '';
}

export function createRecipientUrl(slug) {
  const url = new URL('./recipient.html', window.location.href);
  url.searchParams.set('slug', slug);
  return url.href;
}

export function createRecipientPreviewUrl(slug) {
  const url = new URL('./recipient.html', window.location.href);
  url.searchParams.set('slug', slug);
  url.searchParams.set('preview', '1');
  return url.href;
}

export function isPreviewModeFromLocation() {
  return new URLSearchParams(window.location.search).get('preview') === '1';
}

export function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const intValue = parseInt(value, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
}
