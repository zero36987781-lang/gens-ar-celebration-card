import { getSupabaseConfig, signInAdmin } from '../core/auth.js';
import { getAllGifts, getGiftBySlug, saveGift } from '../core/data-service.js';
import { TEMPLATES, getTemplateById } from '../core/templates.js';
import { qs, readFileAsDataURL, safeUrl, setStatus } from '../core/utils.js';
import { MapPicker } from '../core/maps.js';
import { applyPageLanguage } from '../core/i18n.js';

const els = {
  editor: qs('#admin-editor'),
  authStatus: qs('#admin-auth-status'),
  saveStatus: qs('#admin-save-status'),
  giftList: qs('#gift-list'),
  recentGifts: qs('#recent-gifts'),
  previewCard: qs('#admin-preview-card'),
  previewReceiver: qs('#admin-preview-receiver'),
  previewSender: qs('#admin-preview-sender'),
  previewTitle: qs('#admin-preview-title'),
  previewSubtitle: qs('#admin-preview-subtitle'),
  previewMessage: qs('#admin-preview-message'),
  previewBackMessage: qs('#admin-preview-back-message'),
  videoBadge: qs('#admin-video-badge'),
  videoPreviewStatus: qs('#admin-video-preview-status'),
  videoPreviewArea: qs('#admin-video-preview-area')
};

const state = {
  authenticated: false,
  currentGift: null,
  mapPicker: null,
  frontPhotoData: '',
  backPhotoData: ''
};

function fields() {
  return {
    slug: qs('#admin-slug'),
    template: qs('#admin-template'),
    status: qs('#admin-status'),
    recipientName: qs('#admin-recipient-name'),
    senderName: qs('#admin-sender-name'),
    frontColor: qs('#admin-front-color'),
    accentColor: qs('#admin-accent-color'),
    frontPhoto: qs('#admin-front-photo'),
    backPhoto: qs('#admin-back-photo'),
    videoUrl: qs('#admin-video-url'),
    videoStart: qs('#admin-video-start'),
    videoEnd: qs('#admin-video-end'),
    ctaLink: qs('#admin-cta-link'),
    startAt: qs('#admin-start-at'),
    expiresAt: qs('#admin-expires-at'),
    lat: qs('#admin-lat'),
    lng: qs('#admin-lng'),
    radius: qs('#admin-radius'),
    spawnHeight: qs('#admin-spawn-height'),
    forwardDistance: qs('#admin-forward-distance'),
    mapSearch: qs('#admin-map-search'),
    mapSearchButton: qs('#admin-map-search-btn'),
    mapEl: qs('#admin-map'),
    mapStatus: qs('#admin-map-status')
  };
}

function formatLocalDateInput(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sanitizeEditableText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\r/g, '').trim();
}

function editableText(element) {
  return sanitizeEditableText(element?.innerText || element?.textContent || '');
}

function parseYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '').trim();
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1] || '';
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1] || '';
    }
    return '';
  } catch {
    return '';
  }
}

function secondsToHms(totalSeconds = 0) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function parseHms(value) {
  const raw = String(value || '').replace(/[^\d]/g, '').slice(0, 6);
  const padded = raw.padStart(6, '0');
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2, 4));
  const seconds = Number(padded.slice(4, 6));
  if (minutes > 59 || seconds > 59) return Number.NaN;
  return (hours * 3600) + (minutes * 60) + seconds;
}

function maskHmsInput(input) {
  const raw = String(input.value || '').replace(/[^\d]/g, '').slice(0, 6);
  const padded = raw.padStart(6, '0');
  input.value = `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
}

function syncExpiryBounds() {
  const { startAt, expiresAt } = fields();
  if (!startAt.value) return;
  const start = new Date(startAt.value);
  const max = new Date(start.getTime() + (24 * 60 * 60 * 1000));
  expiresAt.min = formatLocalDateInput(start);
  expiresAt.max = formatLocalDateInput(max);
  if (!expiresAt.value) {
    expiresAt.value = expiresAt.max;
    return;
  }
  const current = new Date(expiresAt.value);
  if (current < start) expiresAt.value = expiresAt.min;
  if (current > max) expiresAt.value = expiresAt.max;
}

function populateTemplates() {
  fields().template.innerHTML = TEMPLATES.map((template) => `<option value="${template.id}">${template.name}</option>`).join('');
}

function renderPreviewCard() {
  const f = fields();
  els.previewCard.style.setProperty('--card-front', f.frontColor.value);
  els.previewCard.style.setProperty('--card-accent', f.accentColor.value);
  els.previewReceiver.textContent = f.recipientName.value.trim() || 'Receiver';
  els.previewSender.textContent = `From ${f.senderName.value.trim() || 'Sender'}`;
  els.videoBadge.classList.toggle('hidden', !parseYouTubeId(f.videoUrl.value.trim()));
}

function applyTemplate(templateId) {
  const template = getTemplateById(templateId);
  const f = fields();
  f.template.value = templateId;
  f.frontColor.value = template.frontColor;
  f.accentColor.value = template.accentColor;
  els.previewTitle.textContent = template.title;
  els.previewSubtitle.textContent = template.subtitle;
  els.previewMessage.textContent = template.message;
  els.previewBackMessage.textContent = template.backText;
  renderPreviewCard();
}

function renderVideoPreview() {
  const { videoUrl, videoStart, videoEnd } = fields();
  const url = videoUrl.value.trim();
  const youtubeId = parseYouTubeId(url);
  if (!url) {
    els.videoPreviewArea.innerHTML = '<div class="video-preview-empty">Paste a YouTube URL to preview the selected time segment.</div>';
    els.videoPreviewStatus.textContent = 'YouTube links only in this revision.';
    renderPreviewCard();
    return;
  }
  if (!youtubeId) {
    els.videoPreviewArea.innerHTML = '<div class="video-preview-empty">This version accepts YouTube URLs only.</div>';
    els.videoPreviewStatus.textContent = 'Non-YouTube links are blocked for now.';
    renderPreviewCard();
    return;
  }
  const start = parseHms(videoStart.value);
  const end = parseHms(videoEnd.value);
  const safeStart = Number.isFinite(start) ? start : 0;
  const safeEnd = Number.isFinite(end) ? end : safeStart + 12;
  const embed = new URL(`https://www.youtube.com/embed/${youtubeId}`);
  embed.searchParams.set('start', String(safeStart));
  embed.searchParams.set('end', String(Math.max(safeStart + 1, safeEnd)));
  embed.searchParams.set('rel', '0');
  embed.searchParams.set('playsinline', '1');
  els.videoPreviewArea.innerHTML = `<iframe src="${embed.href}" title="YouTube segment preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  els.videoPreviewStatus.textContent = `Previewing ${secondsToHms(safeStart)} → ${secondsToHms(Math.max(safeStart + 1, safeEnd))}.`;
  renderPreviewCard();
}

function toggleCardFlip(forceBack = null) {
  const shouldShowBack = typeof forceBack === 'boolean' ? forceBack : !els.previewCard.classList.contains('is-back');
  els.previewCard.classList.toggle('is-back', shouldShowBack);
  els.previewCard.classList.toggle('is-front', !shouldShowBack);
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
  const f = fields();
  f.template.value = gift.templateId || TEMPLATES[0].id;
  f.status.value = gift.status || 'active';
  f.recipientName.value = gift.recipientName || '';
  f.senderName.value = gift.senderName || '';
  f.frontColor.value = gift.frontColor || '#7c3aed';
  f.accentColor.value = gift.accentColor || '#f59e0b';
  f.lat.value = gift.latitude ?? '';
  f.lng.value = gift.longitude ?? '';
  f.radius.value = String(gift.unlockRadiusM || 50);
  f.spawnHeight.value = Number(gift.spawnHeight || 3).toFixed(1);
  f.forwardDistance.value = Number(gift.forwardDistance || 2).toFixed(1);
  f.videoUrl.value = gift.videoUrl || '';
  f.videoStart.value = secondsToHms(gift.videoStart ?? 0);
  f.videoEnd.value = secondsToHms(gift.videoEnd ?? 12);
  f.ctaLink.value = gift.ctaLink || '';
  f.startAt.value = gift.startAt ? formatLocalDateInput(new Date(gift.startAt)) : formatLocalDateInput(new Date());
  f.expiresAt.value = gift.expiresAt ? formatLocalDateInput(new Date(gift.expiresAt)) : formatLocalDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000));
  els.previewTitle.textContent = gift.templateName || getTemplateById(f.template.value).title;
  els.previewSubtitle.textContent = gift.frontSubtitle || getTemplateById(f.template.value).subtitle;
  els.previewMessage.textContent = gift.frontText || gift.message || getTemplateById(f.template.value).message;
  els.previewBackMessage.textContent = gift.backText || getTemplateById(f.template.value).backText;
  state.frontPhotoData = gift.photoData || '';
  state.backPhotoData = gift.backPhotoData || '';
  syncExpiryBounds();
  renderPreviewCard();
  renderVideoPreview();
  state.mapPicker?.setPosition(Number(gift.latitude), Number(gift.longitude), true);
}

async function loadGift() {
  const slug = fields().slug.value.trim();
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

function buildGiftPayload(base = {}) {
  const f = fields();
  return {
    ...base,
    slug: f.slug.value.trim(),
    templateId: f.template.value,
    templateName: editableText(els.previewTitle) || getTemplateById(f.template.value).title,
    recipientName: f.recipientName.value.trim(),
    senderName: f.senderName.value.trim(),
    message: editableText(els.previewMessage),
    frontSubtitle: editableText(els.previewSubtitle),
    frontText: editableText(els.previewMessage),
    backText: editableText(els.previewBackMessage),
    frontColor: f.frontColor.value,
    accentColor: f.accentColor.value,
    status: f.status.value,
    startAt: f.startAt.value ? new Date(f.startAt.value).toISOString() : new Date().toISOString(),
    expiresAt: f.expiresAt.value ? new Date(f.expiresAt.value).toISOString() : new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
    latitude: Number(f.lat.value),
    longitude: Number(f.lng.value),
    unlockRadiusM: Number(f.radius.value),
    spawnHeight: Number(f.spawnHeight.value || 3),
    forwardDistance: Number(f.forwardDistance.value || 2),
    visibilityMode: 'visibility-first',
    videoUrl: safeUrl(f.videoUrl.value.trim()),
    videoStart: parseHms(f.videoStart.value),
    videoEnd: parseHms(f.videoEnd.value),
    ctaLink: f.ctaLink.value.trim(),
    bannerFinaleEnabled: false,
    bannerText: '',
    photoData: state.frontPhotoData || base.photoData || '',
    backPhotoData: state.backPhotoData || base.backPhotoData || '',
    updatedAt: new Date().toISOString()
  };
}

function validateGift(payload) {
  const f = fields();
  if (!payload.slug) return 'Gift slug is required.';
  if (!payload.recipientName) return 'Receiver name is required.';
  if (!payload.senderName) return 'Sender name is required.';
  if (!payload.message.trim()) return 'Front message is required.';
  if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) return 'Valid latitude and longitude are required.';
  if (!Number.isFinite(payload.spawnHeight) || payload.spawnHeight < 0.5 || payload.spawnHeight > 5.5) return 'Card height must be between 0.5m and 5.5m.';
  if (!Number.isFinite(payload.forwardDistance) || payload.forwardDistance < 0.5 || payload.forwardDistance > 5.5) return 'Forward distance must be between 0.5m and 5.5m.';
  if (!Number.isFinite(payload.unlockRadiusM) || payload.unlockRadiusM < 10 || payload.unlockRadiusM > 150) return 'Unlock radius must be between 10m and 150m.';
  const youtubeId = parseYouTubeId(f.videoUrl.value.trim());
  if (f.videoUrl.value.trim() && !youtubeId) return 'Only YouTube URLs are accepted in this revision.';
  if (!Number.isFinite(payload.videoStart) || !Number.isFinite(payload.videoEnd)) return 'Video time must use HH:MM:SS format.';
  if (payload.videoEnd <= payload.videoStart) return 'Video end must be greater than start.';
  const start = new Date(f.startAt.value);
  const end = new Date(f.expiresAt.value);
  if (end < start) return 'Expiry must be after the selected start time.';
  if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) return 'Expiry must stay within 24 hours of the start time.';
  return '';
}

async function saveCurrentGift() {
  if (!state.authenticated) {
    setStatus(els.saveStatus, 'Sign in first.', 'error');
    return;
  }
  const payload = buildGiftPayload(state.currentGift || {});
  const error = validateGift(payload);
  if (error) {
    setStatus(els.saveStatus, error, 'error');
    return;
  }
  try {
    state.currentGift = await saveGift(payload);
    setStatus(els.saveStatus, `Gift updated. Default placement is ${payload.spawnHeight.toFixed(1)}m high / ${payload.forwardDistance.toFixed(1)}m forward.`, 'success');
    renderGiftList();
  } catch (error) {
    setStatus(els.saveStatus, error.message || 'Failed to save gift.', 'error');
  }
}

function bindPhotoInputs() {
  fields().frontPhoto.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    state.frontPhotoData = file ? await readFileAsDataURL(file) : '';
    setStatus(els.saveStatus, file ? 'Front image loaded for save.' : 'Front image removed.', 'success');
  });
  fields().backPhoto.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    state.backPhotoData = file ? await readFileAsDataURL(file) : '';
    setStatus(els.saveStatus, file ? 'Back image loaded for save.' : 'Back image removed.', 'success');
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
          <div class="meta">${gift.recipientName || 'Receiver'} · ${gift.senderName || 'Sender'} · ${gift.status || 'active'}</div>
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
    fields().slug.value = item.dataset.slug;
    loadGift();
  });
}

async function initMap() {
  const f = fields();
  try {
    state.mapPicker = new MapPicker({
      mapEl: f.mapEl,
      latInput: f.lat,
      lngInput: f.lng,
      radiusInput: f.radius,
      searchInput: f.mapSearch,
      searchButton: f.mapSearchButton,
      statusEl: f.mapStatus
    });
    await state.mapPicker.init();
  } catch (error) {
    setStatus(f.mapStatus, error.message || 'Map failed to load. You can still edit lat/lng manually.', 'warn');
  }
}

async function setRuntimeStatus() {
  const { url, anonKey } = await getSupabaseConfig();
  if (url && anonKey) {
    setStatus(els.authStatus, 'Supabase runtime config detected. Sign in to edit live data.', 'success');
  } else {
    setStatus(els.authStatus, 'Supabase runtime config not detected yet. Demo/local mode is still available.', 'warn');
  }
}

function bindPreviewEditors() {
  [els.previewTitle, els.previewSubtitle, els.previewMessage, els.previewBackMessage].forEach((element) => {
    if (!element) return;
    element.addEventListener('input', () => renderPreviewCard());
    element.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  });
}

function bindEvents() {
  const f = fields();
  qs('#admin-login').addEventListener('submit', onLogin);
  qs('#demo-admin').addEventListener('click', onDemoMode);
  qs('#admin-load').addEventListener('click', loadGift);
  qs('#admin-save').addEventListener('click', saveCurrentGift);
  qs('#admin-flip-card').addEventListener('click', () => toggleCardFlip(true));
  qs('#admin-flip-card-back').addEventListener('click', () => toggleCardFlip(false));
  f.template.addEventListener('change', () => applyTemplate(f.template.value));
  f.recipientName.addEventListener('input', renderPreviewCard);
  f.senderName.addEventListener('input', renderPreviewCard);
  f.frontColor.addEventListener('input', renderPreviewCard);
  f.accentColor.addEventListener('input', renderPreviewCard);
  [f.videoStart, f.videoEnd].forEach((input) => {
    input.addEventListener('input', () => maskHmsInput(input));
    input.addEventListener('change', () => {
      maskHmsInput(input);
      renderVideoPreview();
    });
    input.addEventListener('blur', () => {
      maskHmsInput(input);
      renderVideoPreview();
    });
  });
  f.videoUrl.addEventListener('input', renderVideoPreview);
  f.startAt.addEventListener('change', syncExpiryBounds);
  f.expiresAt.addEventListener('change', syncExpiryBounds);
  f.radius.addEventListener('input', () => state.mapPicker?.updateRadius());
  bindPreviewEditors();
  bindPhotoInputs();
  bindGiftList();
}

async function init() {
  applyPageLanguage();
  populateTemplates();
  await setRuntimeStatus();
  await initMap();
  bindEvents();
  const now = new Date();
  now.setSeconds(0, 0);
  fields().startAt.value = formatLocalDateInput(now);
  fields().expiresAt.value = formatLocalDateInput(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  syncExpiryBounds();
  applyTemplate(TEMPLATES[0].id);
  renderVideoPreview();
  renderGiftList();
}

init();
