import { TEMPLATES, getTemplateById } from '../core/templates.js';
import { createRecipientPreviewUrl, createRecipientUrl, generateSlug, getCurrentPosition, qs, readFileAsDataURL, safeUrl, setStatus } from '../core/utils.js';
import { saveGift } from '../core/data-service.js';
import { getSupabaseConfig } from '../core/auth.js';
import { MapPicker } from '../core/maps.js';
import { applyPageLanguage } from '../core/i18n.js';

const state = {
  templateId: TEMPLATES[0].id,
  page: 1,
  photoData: '',
  backPhotoData: '',
  lastCreatedSlug: '',
  mapPicker: null
};

const els = {
  templateList: qs('#template-list'),
  form: qs('#gift-form'),
  shareLink: qs('#share-link'),
  openLink: qs('#open-link'),
  previewLink: qs('#preview-link'),
  statusBox: qs('#status-box'),
  copyLink: qs('#copy-link'),
  previewCard: qs('#preview-card'),
  videoBadge: qs('#video-badge'),
  videoPreviewStatus: qs('#video-preview-status'),
  videoPreviewArea: qs('#video-preview-area'),
  builderGrid: qs('#builder-grid'),
  navPrev: qs('#nav-prev'),
  navNext: qs('#nav-next'),
  navDots: document.querySelectorAll('.nav-dots .dot')
};

const MAX_PAGES = 5;

/* ─── Page navigation ─── */
function updatePage() {
  document.querySelectorAll('.page-view').forEach((el) => el.classList.add('page-hidden'));
  document.querySelectorAll(`.page-view[data-step="${state.page}"]`).forEach((el) => el.classList.remove('page-hidden'));

  if (state.page >= 1 && state.page <= 4) {
    els.builderGrid?.classList.add('single-column-override');
  } else {
    els.builderGrid?.classList.remove('single-column-override');
  }

  els.navDots.forEach((dot, index) => {
    dot.classList.toggle('active', index === state.page - 1);
  });

  if (els.navPrev) els.navPrev.disabled = state.page === 1;
  if (els.navNext) {
    els.navNext.textContent = state.page === MAX_PAGES ? 'Finish' : 'Next ▶';
    els.navNext.disabled = state.page === MAX_PAGES;
  }
}

function handleNextPage() {
  if (state.page < MAX_PAGES) { state.page++; updatePage(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}
function handlePrevPage() {
  if (state.page > 1) { state.page--; updatePage(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}

/* ─── Form fields ─── */
function fields() {
  return {
    recipientName: qs('#recipient-name'),
    senderName: qs('#sender-name'),
    videoUrl: qs('#video-url'),
    ctaLink: qs('#cta-link'),
    mapSearch: qs('#map-search'),
    mapSearchButton: qs('#map-search-btn'),
    mapEl: qs('#sender-map'),
    mapStatus: qs('#map-status'),
    latitude: qs('#latitude'),
    longitude: qs('#longitude'),
    unlockRadius: qs('#unlock-radius'),
    startAt: qs('#start-at'),
    expiresAt: qs('#expires-at'),
    spawnHeight: qs('#spawn-height'),
    forwardDistance: qs('#forward-distance')
  };
}

/* ─── Date helpers ─── */
function formatLocalDateInput(date) {
  const pad = (v) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setDefaultDateWindow() {
  const { startAt, expiresAt } = fields();
  const now = new Date(); now.setSeconds(0, 0);
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  startAt.value = formatLocalDateInput(now);
  expiresAt.value = formatLocalDateInput(end);
  syncExpiryBounds();
}

function syncExpiryBounds() {
  const { startAt, expiresAt } = fields();
  if (!startAt.value) return;
  const start = new Date(startAt.value);
  const max = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  expiresAt.min = formatLocalDateInput(start);
  expiresAt.max = formatLocalDateInput(max);
  if (!expiresAt.value) { expiresAt.value = expiresAt.max; return; }
  const current = new Date(expiresAt.value);
  if (current < start) expiresAt.value = expiresAt.min;
  else if (current > max) expiresAt.value = expiresAt.max;
}

/* ─── YouTube helpers ─── */
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
  } catch { return ''; }
}

function secondsToHms(totalSeconds = 0) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60].map(v => String(v).padStart(2, '0')).join(':');
}

function getHmsSeconds(prefix) {
  const h = Number(qs(`#${prefix}-h`)?.value || 0);
  const m = Number(qs(`#${prefix}-m`)?.value || 0);
  const s = Number(qs(`#${prefix}-s`)?.value || 0);
  return (h * 3600) + (m * 60) + s;
}

/* ─── Templates ─── */
function renderTemplates() {
  els.templateList.innerHTML = TEMPLATES.map(t => `
    <button type="button" class="template-item ${t.id === state.templateId ? 'active' : ''}" data-template-id="${t.id}">
      <h3>${t.name}</h3><p>${t.subtitle}</p>
      <div class="template-swatches"><span style="background:${t.frontColor}"></span><span style="background:${t.accentColor}"></span></div>
    </button>
  `).join('');
}

function applyTemplate(templateId) {
  state.templateId = templateId;
  renderTemplates();
  renderPreviewCard();
}

function renderPreviewCard() {
  const f = fields();
  const template = getTemplateById(state.templateId);
  const card = els.previewCard;
  card.style.setProperty('--card-front', template.frontColor);
  card.style.setProperty('--card-accent', template.accentColor);
  const hasVideo = Boolean(parseYouTubeId(f.videoUrl.value.trim()));
  els.videoBadge.classList.toggle('hidden', !hasVideo);
}

function renderVideoPreview() {
  const { videoUrl } = fields();
  const url = videoUrl.value.trim();
  const youtubeId = parseYouTubeId(url);
  if (!url) {
    els.videoPreviewArea.innerHTML = '<div class="video-preview-empty">Paste a YouTube URL to preview the selected time segment.</div>';
    els.videoPreviewStatus.textContent = 'YouTube links only.';
    renderPreviewCard(); return;
  }
  if (!youtubeId) {
    els.videoPreviewArea.innerHTML = '<div class="video-preview-empty">This version accepts YouTube URLs only.</div>';
    els.videoPreviewStatus.textContent = 'Non-YouTube links are blocked.';
    renderPreviewCard(); return;
  }
  const start = getHmsSeconds('vs');
  const end = getHmsSeconds('ve');
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

/* ─── Location ─── */
async function handleUseCurrentLocation() {
  try {
    const position = await getCurrentPosition();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    fields().latitude.value = lat.toFixed(6);
    fields().longitude.value = lng.toFixed(6);
    state.mapPicker?.setPosition(lat, lng, true);
    setStatus(fields().mapStatus, 'Current location pinned.', 'success');
  } catch (error) {
    setStatus(fields().mapStatus, error.message || 'Location request failed.', 'error');
  }
}

/* ─── Card flip ─── */
function toggleCardFlip(forceBack = null) {
  const back = typeof forceBack === 'boolean' ? forceBack : !els.previewCard.classList.contains('is-back');
  els.previewCard.classList.toggle('is-back', back);
  els.previewCard.classList.toggle('is-front', !back);
  if (window.CanvasEditor) window.CanvasEditor.switchSide(back ? 'back' : 'front');
}

/* ─── Form data ─── */
function getFormData() {
  const f = fields();
  const template = getTemplateById(state.templateId);
  const startSeconds = getHmsSeconds('vs');
  const endSeconds = getHmsSeconds('ve');
  return {
    slug: state.lastCreatedSlug || generateSlug('gift'),
    templateId: state.templateId,
    templateName: template.title,
    recipientName: f.recipientName.value.trim(),
    senderName: f.senderName.value.trim(),
    message: template.message,
    frontSubtitle: template.subtitle,
    frontText: template.message,
    backText: template.backText,
    canvasData: window.CanvasEditor ? window.CanvasEditor.getLayers() : null,
    frontColor: template.frontColor,
    accentColor: template.accentColor,
    photoData: state.photoData,
    backPhotoData: state.backPhotoData,
    videoUrl: safeUrl(f.videoUrl.value.trim()),
    videoStart: Number.isFinite(startSeconds) ? startSeconds : 0,
    videoEnd: Number.isFinite(endSeconds) ? endSeconds : 12,
    mediaSequence: 'card-first',
    ctaLink: f.ctaLink.value.trim(),
    latitude: Number(f.latitude.value),
    longitude: Number(f.longitude.value),
    unlockRadiusM: Number(f.unlockRadius.value || 50),
    startAt: f.startAt.value ? new Date(f.startAt.value).toISOString() : new Date().toISOString(),
    expiresAt: f.expiresAt.value ? new Date(f.expiresAt.value).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    bannerFinaleEnabled: false,
    bannerText: '',
    spawnHeight: Number(f.spawnHeight.value || 3),
    forwardDistance: Number(f.forwardDistance.value || 2),
    visibilityMode: 'visibility-first',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function validate(data) {
  const f = fields();
  if (!data.recipientName) return 'Receiver name is required.';
  if (!data.senderName) return 'Sender name is required.';
  if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return 'Latitude and longitude are required.';
  if (!Number.isFinite(data.spawnHeight) || data.spawnHeight < 0.5 || data.spawnHeight > 5.5) return 'Card height must be between 0.5m and 5.5m.';
  if (!Number.isFinite(data.forwardDistance) || data.forwardDistance < 0.5 || data.forwardDistance > 5.5) return 'Forward distance must be between 0.5m and 5.5m.';
  if (!Number.isFinite(data.unlockRadiusM) || data.unlockRadiusM < 10 || data.unlockRadiusM > 150) return 'Unlock radius must be between 10m and 150m.';
  const youtubeId = parseYouTubeId(f.videoUrl.value.trim());
  if (f.videoUrl.value.trim() && !youtubeId) return 'Only YouTube URLs are accepted.';
  if (!Number.isFinite(data.videoStart) || !Number.isFinite(data.videoEnd)) return 'Video time must be valid.';
  if (data.videoEnd <= data.videoStart) return 'Video end must be greater than start.';
  const start = new Date(f.startAt.value);
  const end = new Date(f.expiresAt.value);
  if (Number.isNaN(start.getTime())) return 'Start date/time is required.';
  if (Number.isNaN(end.getTime())) return 'Expiry date/time is required.';
  if (end < start) return 'Expiry must be after the start time.';
  if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) return 'Expiry must stay within 24 hours of start.';
  return '';
}

async function handleSubmit(event) {
  event.preventDefault();
  const data = getFormData();
  const error = validate(data);
  if (error) { setStatus(els.statusBox, error, 'error'); return; }
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
    setStatus(els.statusBox, `Saved. Expires at ${new Date(saved.expiresAt).toLocaleString()}.`, 'success');
  } catch (saveError) {
    setStatus(els.statusBox, saveError.message || 'Failed to save.', 'error');
  }
}

async function copyLink() {
  if (!els.shareLink.value) return;
  await navigator.clipboard.writeText(els.shareLink.value);
  setStatus(els.statusBox, 'Link copied.', 'success');
}

async function initMap() {
  const f = fields();
  try {
    state.mapPicker = new MapPicker({
      mapEl: f.mapEl, latInput: f.latitude, lngInput: f.longitude,
      radiusInput: f.unlockRadius, searchInput: f.mapSearch,
      searchButton: f.mapSearchButton, statusEl: f.mapStatus
    });
    await state.mapPicker.init();
  } catch (error) {
    setStatus(f.mapStatus, error.message || 'Map failed to load.', 'warn');
  }
}

async function setRuntimeStatus() {
  const { url, anonKey } = await getSupabaseConfig();
  if (!url || !anonKey) setStatus(els.statusBox, 'Running in local/demo mode.', 'muted');
}

/* ─── HMS input behavior fix ─── */
function bindHmsInputs() {
  const hmsInputs = ['vs-h', 'vs-m', 'vs-s', 've-h', 've-m', 've-s'].map(id => qs(`#${id}`)).filter(Boolean);

  hmsInputs.forEach((input, index) => {
    // Focus: clear to let user type fresh
    input.addEventListener('focus', () => {
      input.select(); // select all instead of clearing — better UX
    });

    // Input: digits only, max 2 chars, auto-advance
    input.addEventListener('input', (e) => {
      input.value = input.value.replace(/[^\d]/g, '').slice(0, 2);
      if (input.value.length === 2 && e.inputType !== 'deleteContentBackward') {
        const next = hmsInputs[index + 1];
        // Only auto-advance within same group (vs or ve)
        if (next && input.id.split('-')[0] === next.id.split('-')[0]) {
          next.focus();
        }
      }
      renderVideoPreview();
    });

    // Blur: restore "00" if empty, pad single digit
    input.addEventListener('blur', () => {
      const val = input.value.replace(/[^\d]/g, '').trim();
      if (!val || val === '') {
        input.value = '00';
      } else if (val.length === 1) {
        input.value = val.padStart(2, '0');
      } else {
        input.value = val.slice(0, 2);
      }
      renderVideoPreview();
    });
  });
}

/* ─── Bind all events ─── */
function bindEvents() {
  const f = fields();

  els.templateList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-template-id]');
    if (btn) applyTemplate(btn.dataset.templateId);
  });

  f.recipientName.addEventListener('input', renderPreviewCard);
  f.senderName.addEventListener('input', renderPreviewCard);
  f.videoUrl.addEventListener('input', renderVideoPreview);

  // HMS inputs with proper blur behavior
  bindHmsInputs();

  f.startAt.addEventListener('change', syncExpiryBounds);
  f.expiresAt.addEventListener('change', syncExpiryBounds);
  f.unlockRadius.addEventListener('input', () => state.mapPicker?.updateRadius());
  qs('#use-current-location').addEventListener('click', handleUseCurrentLocation);
  els.form.addEventListener('submit', handleSubmit);
  els.copyLink.addEventListener('click', copyLink);
  qs('#flip-card').addEventListener('click', () => toggleCardFlip(true));
  qs('#flip-card-back').addEventListener('click', () => toggleCardFlip(false));
  if (els.navPrev) els.navPrev.addEventListener('click', handlePrevPage);
  if (els.navNext) els.navNext.addEventListener('click', handleNextPage);
}

/* ─── Init ─── */
async function init() {
  applyPageLanguage();
  renderTemplates();
  setDefaultDateWindow();
  bindEvents();
  applyTemplate(state.templateId);
  renderVideoPreview();
  renderPreviewCard();
  updatePage();
  if (window.CanvasEditor) window.CanvasEditor.init();
  await setRuntimeStatus();
  await initMap();
}

init();
