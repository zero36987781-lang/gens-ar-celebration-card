import { TEMPLATES, getTemplateById } from '../core/templates.js';
import { createRecipientPreviewUrl, createRecipientUrl, generateSlug, getCurrentPosition, qs, qsa, readFileAsDataURL, setStatus, toIsoFromHours } from '../core/utils.js';
import { saveGift } from '../core/data-service.js';
import { getSupabaseConfig } from '../core/auth.js';
import { MapPicker } from '../core/maps.js';

const state = {
  templateId: TEMPLATES[0].id,
  photoData: '',
  lastCreatedSlug: '',
  mapPicker: null
};

const els = {
  templateList: qs('#template-list'),
  form: qs('#gift-form'),
  livePreview: qs('#live-preview'),
  shareLink: qs('#share-link'),
  openLink: qs('#open-link'),
  previewLink: qs('#preview-link'),
  statusBox: qs('#status-box'),
  copyLink: qs('#copy-link'),
  storageMode: qs('#storage-mode')
};

function fields() {
  return {
    recipientName: qs('#recipient-name'),
    senderName: qs('#sender-name'),
    message: qs('#message'),
    frontColor: qs('#front-color'),
    accentColor: qs('#accent-color'),
    photoFile: qs('#photo-file'),
    videoUrl: qs('#video-url'),
    videoStart: qs('#video-start'),
    videoEnd: qs('#video-end'),
    ctaLink: qs('#cta-link'),
    mapSearch: qs('#map-search'),
    mapSearchButton: qs('#map-search-btn'),
    mapEl: qs('#sender-map'),
    mapStatus: qs('#map-status'),
    latitude: qs('#latitude'),
    longitude: qs('#longitude'),
    unlockRadius: qs('#unlock-radius'),
    expiryHours: qs('#expiry-hours'),
    spawnHeight: qs('#spawn-height'),
    forwardDistance: qs('#forward-distance'),
    bannerFinale: qs('#banner-finale')
  };
}

function renderTemplates() {
  els.templateList.innerHTML = '';
  TEMPLATES.forEach((template) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `template-item ${template.id === state.templateId ? 'active' : ''}`;
    item.innerHTML = `
      <h3>${template.name}</h3>
      <p>${template.subtitle}</p>
      <div class="template-swatches">
        <span style="background:${template.frontColor}"></span>
        <span style="background:${template.accentColor}"></span>
      </div>
    `;
    item.addEventListener('click', () => applyTemplate(template.id, true));
    els.templateList.appendChild(item);
  });
}

async function applyTemplate(templateId, overwriteMessage = false) {
  state.templateId = templateId;
  const template = getTemplateById(templateId);
  const f = fields();
  f.frontColor.value = template.frontColor;
  f.accentColor.value = template.accentColor;
  if (overwriteMessage || !f.message.value.trim()) {
    f.message.value = template.message;
  }
  renderTemplates();
  renderPreview();
  await setStorageMode();
}

function getFormData() {
  const f = fields();
  const template = getTemplateById(state.templateId);
  return {
    slug: state.lastCreatedSlug || generateSlug('gift'),
    templateId: state.templateId,
    templateName: template.title,
    recipientName: f.recipientName.value.trim(),
    senderName: f.senderName.value.trim(),
    message: f.message.value.trim(),
    frontText: f.message.value.trim() || template.message,
    backText: `${template.backText}${f.senderName.value.trim() ? ` — ${f.senderName.value.trim()}` : ''}`,
    frontColor: f.frontColor.value,
    accentColor: f.accentColor.value,
    photoData: state.photoData,
    backPhotoData: '',
    videoUrl: f.videoUrl.value.trim(),
    videoStart: Number(f.videoStart.value || 0),
    videoEnd: Number(f.videoEnd.value || 12),
    ctaLink: f.ctaLink.value.trim(),
    latitude: Number(f.latitude.value),
    longitude: Number(f.longitude.value),
    unlockRadiusM: Number(f.unlockRadius.value || 50),
    expiresAt: toIsoFromHours(Number(f.expiryHours.value || 48)),
    bannerFinaleEnabled: f.bannerFinale.checked,
    bannerText: template.bannerText,
    spawnHeight: Number(f.spawnHeight.value || 1.6),
    forwardDistance: Number(f.forwardDistance.value || 1.6),
    visibilityMode: 'visibility-first',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function renderPreview() {
  const data = getFormData();
  const title = data.templateName || 'AR Surprise';
  els.livePreview.innerHTML = `
    <article class="preview-card" style="background:linear-gradient(135deg, ${data.frontColor}, ${data.accentColor})">
      <div>
        <div class="card-front">${title}</div>
        <div class="card-message">${data.message || 'Your message will appear here.'}</div>
      </div>
      <div class="card-meta">
        <div>To ${data.recipientName || 'Recipient'}</div>
        <div>From ${data.senderName || 'Sender'}</div>
        <div>Visible at ${data.spawnHeight.toFixed(1)}m · ${data.forwardDistance.toFixed(1)}m forward</div>
      </div>
    </article>
  `;
}

async function handlePhotoChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    state.photoData = '';
    renderPreview();
    return;
  }
  state.photoData = await readFileAsDataURL(file);
  renderPreview();
}

async function handleUseCurrentLocation() {
  try {
    const position = await getCurrentPosition();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    fields().latitude.value = lat.toFixed(6);
    fields().longitude.value = lng.toFixed(6);
    state.mapPicker?.setPosition(lat, lng, true);
    setStatus(fields().mapStatus, 'Current location pinned on the map.', 'success');
    setStatus(els.statusBox, 'Current location loaded.', 'success');
    renderPreview();
  } catch (error) {
    setStatus(fields().mapStatus, error.message || 'Location request failed.', 'error');
    setStatus(els.statusBox, error.message || 'Location request failed.', 'error');
  }
}

function validate(data) {
  if (!data.recipientName) return 'Recipient name is required.';
  if (!data.senderName) return 'Sender name is required.';
  if (!data.message) return 'Message is required.';
  if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return 'Latitude and longitude are required.';
  if (!Number.isFinite(data.spawnHeight) || data.spawnHeight < 0.4 || data.spawnHeight > 5) return 'Card height must be between 0.4m and 5m.';
  if (!Number.isFinite(data.forwardDistance) || data.forwardDistance < 0.5 || data.forwardDistance > 8) return 'Forward offset must be between 0.5m and 8m.';
  if (data.videoEnd <= data.videoStart) return 'Video end must be greater than start.';
  return '';
}

async function handleSubmit(event) {
  event.preventDefault();
  const data = getFormData();
  const error = validate(data);
  if (error) {
    setStatus(els.statusBox, error, 'error');
    return;
  }

  try {
    const saved = await saveGift(data);
    state.lastCreatedSlug = saved.slug;
    const shareUrl = createRecipientUrl(saved.slug);
    const previewUrl = createRecipientPreviewUrl(saved.slug);
    els.shareLink.value = shareUrl;
    els.openLink.href = shareUrl;
    els.previewLink.href = previewUrl;
    els.openLink.classList.remove('disabled-link');
    els.previewLink.classList.remove('disabled-link');
    setStatus(
      els.statusBox,
      `Saved. Link expires at ${new Date(saved.expiresAt).toLocaleString()}. Buyer preview is now available and skips the location gate for QA.`,
      'success'
    );
  } catch (saveError) {
    setStatus(els.statusBox, saveError.message || 'Failed to save the gift.', 'error');
  }
}

async function copyLink() {
  if (!els.shareLink.value) return;
  await navigator.clipboard.writeText(els.shareLink.value);
  setStatus(els.statusBox, 'Link copied.', 'success');
}

function loadSample() {
  const f = fields();
  applyTemplate('birthday', true);
  f.recipientName.value = 'Emma';
  f.senderName.value = 'Minji';
  f.message.value = 'Happy Birthday! Meet me at the spot for your surprise.';
  f.videoStart.value = '0';
  f.videoEnd.value = '12';
  f.unlockRadius.value = '50';
  f.expiryHours.value = '48';
  f.spawnHeight.value = '2.2';
  f.forwardDistance.value = '1.8';
  f.latitude.value = '37.566500';
  f.longitude.value = '126.978000';
  state.mapPicker?.setPosition(37.5665, 126.978, true);
  renderPreview();
  setStatus(fields().mapStatus, 'Sample position pinned on the map.', 'success');
  setStatus(els.statusBox, 'Sample loaded.', 'success');
}

async function initMap() {
  const f = fields();
  if (!f.mapEl) return;

  try {
    state.mapPicker = new MapPicker({
      mapEl: f.mapEl,
      latInput: f.latitude,
      lngInput: f.longitude,
      radiusInput: f.unlockRadius,
      searchInput: f.mapSearch,
      searchButton: f.mapSearchButton,
      statusEl: f.mapStatus
    });
    await state.mapPicker.init();
    setStatus(
      f.mapStatus,
      'Google Maps loaded. Search, click, or drag the pin to define the card location. API key and Map ID are read from Cloudflare runtime secrets.',
      'success'
    );
  } catch (error) {
    setStatus(
      f.mapStatus,
      error.message || 'Map failed to load. You can still type latitude and longitude manually.',
      'warn'
    );
  }
}

function bindEvents() {
  qsa('input, textarea, select', els.form).forEach((input) => {
    input.addEventListener('input', renderPreview);
    input.addEventListener('change', renderPreview);
  });
  fields().photoFile.addEventListener('change', handlePhotoChange);
  els.form.addEventListener('submit', handleSubmit);
  qs('#use-current-location').addEventListener('click', handleUseCurrentLocation);
  qs('#copy-link').addEventListener('click', copyLink);
  qs('#load-sample').addEventListener('click', loadSample);
  qs('#jump-create').addEventListener('click', () => qs('#builder').scrollIntoView({ behavior: 'smooth' }));
  qs('#reset-form').addEventListener('click', async () => {
    state.photoData = '';
    state.lastCreatedSlug = '';
    els.form.reset();
    await applyTemplate(TEMPLATES[0].id, true);
    els.shareLink.value = '';
    els.openLink.href = '#';
    els.previewLink.href = '#';
    els.openLink.classList.add('disabled-link');
    els.previewLink.classList.add('disabled-link');
    setStatus(els.statusBox, 'Form reset.', 'muted');
    renderPreview();
  });
}

async function setStorageMode() {
  const { url, anonKey } = await getSupabaseConfig();
  if (url && anonKey) {
    setStatus(els.storageMode, 'Storage: Supabase cloud mode via Cloudflare runtime config', 'success');
  } else {
    setStatus(els.storageMode, 'Storage: local demo mode. Add SUPABASE_URL and SUPABASE_ANON_KEY in Cloudflare Pages secrets for live cloud storage.', 'warn');
  }
}

async function init() {
  await setStorageMode();
  renderTemplates();
  bindEvents();
  await applyTemplate(TEMPLATES[0].id, true);
  renderPreview();
  await initMap();
}

init();
