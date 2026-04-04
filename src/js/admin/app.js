import { getSupabaseConfig, signInAdmin } from '../core/auth.js';
import { getAllGifts, getGiftBySlug, saveGift } from '../core/data-service.js';
import { TEMPLATES } from '../core/templates.js';
import { qs, readFileAsDataURL, setStatus } from '../core/utils.js';
import { MapPicker } from '../core/maps.js';

const els = {
  editor: qs('#admin-editor'),
  authStatus: qs('#admin-auth-status'),
  saveStatus: qs('#admin-save-status'),
  giftList: qs('#gift-list'),
  recentGifts: qs('#recent-gifts')
};

const state = {
  authenticated: false,
  currentGift: null,
  mapPicker: null
};

function populateTemplates() {
  const select = qs('#admin-template');
  select.innerHTML = TEMPLATES.map((template) => `<option value="${template.id}">${template.name}</option>`).join('');
}

function enableEditor(message = 'Admin access granted.') {
  state.authenticated = true;
  els.editor.classList.remove('hidden');
  setStatus(els.authStatus, message, 'success');
}

async function onLogin(event) {
  event.preventDefault();
  const email = qs('#admin-email').value.trim();
  const password = qs('#admin-password').value.trim();

  try {
    await signInAdmin(email, password);
    enableEditor('Supabase admin session started.');
  } catch (error) {
    setStatus(els.authStatus, error.message || 'Sign in failed.', 'error');
  }
}

function onDemoMode() {
  enableEditor('Demo mode enabled. Cloud save still depends on runtime Supabase config.');
}

function fillForm(gift) {
  qs('#admin-template').value = gift.templateId || TEMPLATES[0].id;
  qs('#admin-status').value = gift.status || 'active';
  qs('#admin-expires-at').value = gift.expiresAt ? new Date(gift.expiresAt).toISOString().slice(0, 16) : '';
  qs('#admin-front-text').value = gift.frontText || gift.message || '';
  qs('#admin-back-text').value = gift.backText || '';
  qs('#admin-front-color').value = gift.frontColor || '#7c3aed';
  qs('#admin-accent-color').value = gift.accentColor || '#f59e0b';
  qs('#admin-lat').value = gift.latitude ?? '';
  qs('#admin-lng').value = gift.longitude ?? '';
  qs('#admin-radius').value = String(gift.unlockRadiusM || 50);
  qs('#admin-spawn-height').value = Number(gift.spawnHeight || 1.6).toFixed(1);
  qs('#admin-forward-distance').value = Number(gift.forwardDistance || 1.6).toFixed(1);
  qs('#admin-video-url').value = gift.videoUrl || '';
  qs('#admin-video-start').value = gift.videoStart ?? 0;
  qs('#admin-video-end').value = gift.videoEnd ?? 12;
  qs('#admin-cta-link').value = gift.ctaLink || '';
  qs('#admin-banner').checked = Boolean(gift.bannerFinaleEnabled);
  state.mapPicker?.setPosition(Number(gift.latitude), Number(gift.longitude), true);
}

async function loadGift() {
  const slug = qs('#admin-slug').value.trim();
  if (!slug) {
    setStatus(els.saveStatus, 'Enter a slug first.', 'error');
    return;
  }

  try {
    const gift = await getGiftBySlug(slug);
    if (!gift) {
      setStatus(els.saveStatus, 'Gift not found.', 'error');
      return;
    }
    state.currentGift = gift;
    fillForm(gift);
    setStatus(els.saveStatus, 'Gift loaded.', 'success');
  } catch (error) {
    setStatus(els.saveStatus, error.message || 'Failed to load gift.', 'error');
  }
}

async function saveCurrentGift() {
  if (!state.authenticated) {
    setStatus(els.saveStatus, 'Sign in first.', 'error');
    return;
  }

  const slug = qs('#admin-slug').value.trim();
  if (!slug) {
    setStatus(els.saveStatus, 'Gift slug is required.', 'error');
    return;
  }

  let base = state.currentGift;
  if (!base) {
    try {
      base = await getGiftBySlug(slug);
    } catch (error) {
      setStatus(els.saveStatus, error.message || 'Failed to load gift.', 'error');
      return;
    }
  }

  if (!base) {
    setStatus(els.saveStatus, 'Load a valid gift first.', 'error');
    return;
  }

  const templateId = qs('#admin-template').value;
  const template = TEMPLATES.find((item) => item.id === templateId) || TEMPLATES[0];

  const updated = {
    ...base,
    slug,
    templateId,
    templateName: template.title,
    frontText: qs('#admin-front-text').value.trim(),
    message: qs('#admin-front-text').value.trim(),
    backText: qs('#admin-back-text').value.trim(),
    frontColor: qs('#admin-front-color').value,
    accentColor: qs('#admin-accent-color').value,
    status: qs('#admin-status').value,
    expiresAt: qs('#admin-expires-at').value ? new Date(qs('#admin-expires-at').value).toISOString() : base.expiresAt,
    latitude: Number(qs('#admin-lat').value),
    longitude: Number(qs('#admin-lng').value),
    unlockRadiusM: Number(qs('#admin-radius').value),
    spawnHeight: Number(qs('#admin-spawn-height').value || 1.6),
    forwardDistance: Number(qs('#admin-forward-distance').value || 1.6),
    visibilityMode: 'visibility-first',
    videoUrl: qs('#admin-video-url').value.trim(),
    videoStart: Number(qs('#admin-video-start').value || 0),
    videoEnd: Number(qs('#admin-video-end').value || 12),
    ctaLink: qs('#admin-cta-link').value.trim(),
    bannerFinaleEnabled: qs('#admin-banner').checked,
    bannerText: template.bannerText,
    photoData: window.__adminFrontPhotoData || base.photoData || '',
    backPhotoData: window.__adminBackPhotoData || base.backPhotoData || '',
    updatedAt: new Date().toISOString()
  };

  if (!Number.isFinite(updated.latitude) || !Number.isFinite(updated.longitude)) {
    setStatus(els.saveStatus, 'Valid latitude and longitude are required.', 'error');
    return;
  }

  if (!Number.isFinite(updated.spawnHeight) || updated.spawnHeight < 0.4 || updated.spawnHeight > 5) {
    setStatus(els.saveStatus, 'Card height must be between 0.4m and 5m.', 'error');
    return;
  }

  if (!Number.isFinite(updated.forwardDistance) || updated.forwardDistance < 0.5 || updated.forwardDistance > 8) {
    setStatus(els.saveStatus, 'Forward offset must be between 0.5m and 8m.', 'error');
    return;
  }

  try {
    state.currentGift = await saveGift(updated);
    setStatus(
      els.saveStatus,
      `Gift updated. Default visibility placement is ${updated.spawnHeight.toFixed(1)}m high / ${updated.forwardDistance.toFixed(1)}m forward.`,
      'success'
    );
    renderGiftList();
  } catch (error) {
    setStatus(els.saveStatus, error.message || 'Failed to save gift.', 'error');
  }
}

function bindPhotoInputs() {
  qs('#admin-front-photo').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    window.__adminFrontPhotoData = await readFileAsDataURL(file);
    setStatus(els.saveStatus, 'Front image loaded for save.', 'success');
  });

  qs('#admin-back-photo').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    window.__adminBackPhotoData = await readFileAsDataURL(file);
    setStatus(els.saveStatus, 'Back image loaded for save.', 'success');
  });
}

async function renderGiftList() {
  try {
    const gifts = await getAllGifts();
    els.recentGifts.classList.remove('hidden');
    if (!gifts.length) {
      els.giftList.innerHTML = '<div class="status-box muted">No saved gifts yet.</div>';
      return;
    }
    els.giftList.innerHTML = gifts.map((gift) => `
      <button class="gift-item" type="button" data-slug="${gift.slug}">
        <div>
          <strong>${gift.slug}</strong>
          <div class="meta">${gift.recipientName || 'Recipient'} · ${gift.senderName || 'Sender'} · ${gift.status || 'active'}</div>
        </div>
        <span class="meta">${new Date(gift.updatedAt || gift.createdAt).toLocaleString()}</span>
      </button>
    `).join('');
  } catch (error) {
    els.recentGifts.classList.remove('hidden');
    els.giftList.innerHTML = `<div class="status-box error">${error.message || 'Failed to load gifts.'}</div>`;
  }
}

function bindGiftList() {
  els.giftList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-slug]');
    if (!item) return;
    qs('#admin-slug').value = item.dataset.slug;
    loadGift();
  });
}

async function initMap() {
  try {
    state.mapPicker = new MapPicker({
      mapEl: qs('#admin-map'),
      latInput: qs('#admin-lat'),
      lngInput: qs('#admin-lng'),
      radiusInput: qs('#admin-radius'),
      searchInput: qs('#admin-map-search'),
      searchButton: qs('#admin-map-search-btn'),
      statusEl: qs('#admin-map-status')
    });
    await state.mapPicker.init();
    setStatus(
      qs('#admin-map-status'),
      'Google Maps loaded. Search, click, or drag the pin to refine the live placement point. Values come from Cloudflare runtime secrets.',
      'success'
    );
  } catch (error) {
    setStatus(qs('#admin-map-status'), error.message || 'Map failed to load. You can still edit lat/lng manually.', 'warn');
  }
}

async function setRuntimeStatus() {
  const { url, anonKey } = await getSupabaseConfig();
  if (url && anonKey) {
    setStatus(els.authStatus, 'Supabase runtime config detected from Cloudflare. Sign in to edit live data.', 'success');
  } else {
    setStatus(els.authStatus, 'Supabase runtime config not detected yet. Add SUPABASE_URL and SUPABASE_ANON_KEY in Cloudflare Pages secrets.', 'warn');
  }
}

async function init() {
  populateTemplates();
  await setRuntimeStatus();
  await initMap();
  qs('#admin-login').addEventListener('submit', onLogin);
  qs('#demo-admin').addEventListener('click', onDemoMode);
  qs('#admin-load').addEventListener('click', loadGift);
  qs('#admin-save').addEventListener('click', saveCurrentGift);
  bindPhotoInputs();
  bindGiftList();
  renderGiftList();
}

init();
