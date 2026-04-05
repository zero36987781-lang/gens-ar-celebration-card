import { TEMPLATES, getTemplateById } from '../core/templates.js';
import { createRecipientPreviewUrl, createRecipientUrl, generateSlug, getCurrentPosition, qs, qsa, readFileAsDataURL, setStatus, toIsoFromHours } from '../core/utils.js';
import { saveGift } from '../core/data-service.js';
import { getSupabaseConfig } from '../core/auth.js';
import { MapPicker } from '../core/maps.js';

const COLOR_SWATCHES = [
  '#7c3aed', '#9f67ff', '#1d4ed8', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#374151', '#111827'
];

const state = {
  templateId: TEMPLATES[0].id,
  photoData: '',
  backPhotoData: '',
  lastCreatedSlug: '',
  mapPicker: null,
  appearanceTarget: 'front',
  activeStudioTab: 'text',
  activeNumberInput: null
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
  storageMode: qs('#storage-mode'),
  studioMiniPreview: qs('#studio-mini-preview'),
  studioTabs: qsa('.studio-tab'),
  studioSections: qsa('.studio-section'),
  targetButtons: qsa('.target-btn'),
  colorSwatchGrid: qs('#color-swatch-grid'),
  colorPaletteGrid: qs('#color-palette-grid'),
  numberTuner: qs('#number-tuner'),
  numberTunerLabel: qs('#number-tuner-label'),
  numberTunerValue: qs('#number-tuner-value'),
  numberTunerRange: qs('#number-tuner-range'),
  numberTunerPlus: qs('#number-tuner-plus'),
  numberTunerMinus: qs('#number-tuner-minus'),
  numberTunerClose: qs('#number-tuner-close'),
  numberKeypad: qs('#number-keypad'),
  videoStartDisplay: qs('#video-start-display'),
  videoEndDisplay: qs('#video-end-display'),
  videoPreviewStatus: qs('#video-preview-status'),
  videoPreviewArea: qs('#video-preview-area')
};

function fields() {
  return {
    recipientName: qs('#recipient-name'),
    senderName: qs('#sender-name'),
    message: qs('#message'),
    frontColor: qs('#front-color'),
    accentColor: qs('#accent-color'),
    photoFile: qs('#photo-file'),
    backPhotoFile: qs('#back-photo-file'),
    videoUrl: qs('#video-url'),
    videoStart: qs('#video-start'),
    videoEnd: qs('#video-end'),
    mediaSequence: qs('#media-sequence'),
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function formatSecondsDisplay(value) {
  const seconds = Math.max(0, Number(value || 0));
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
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

function renderVideoPreview() {
  const url = fields().videoUrl.value.trim();
  if (!els.videoPreviewArea || !els.videoPreviewStatus) return;
  if (!url) {
    els.videoPreviewArea.innerHTML = '<div class="video-preview-empty">비디오 URL을 입력하면 여기에서 유효성/미리보기를 확인할 수 있습니다.</div>';
    els.videoPreviewStatus.textContent = 'Paste a direct MP4/WebM URL or a YouTube link to preview it here.';
    return;
  }

  const youtubeId = parseYouTubeId(url);
  if (youtubeId) {
    els.videoPreviewArea.innerHTML = `<iframe src="https://www.youtube.com/embed/${youtubeId}" title="YouTube preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    els.videoPreviewStatus.textContent = 'YouTube 링크가 감지되었습니다. 에디터에서는 iframe 미리보기를 보여주지만, AR 재생은 직접 미디어 파일 URL 또는 업로드 저장소 연동이 더 안정적입니다.';
    return;
  }

  els.videoPreviewArea.innerHTML = `<video controls muted preload="metadata" playsinline src="${escapeHtml(url)}"></video>`;
  els.videoPreviewStatus.textContent = '직접 비디오 URL 미리보기입니다. CORS/파일 형식에 따라 실제 AR 재생 가능 여부가 달라질 수 있습니다.';
}

function updateVideoTimeDisplays() {
  if (els.videoStartDisplay) els.videoStartDisplay.textContent = formatSecondsDisplay(fields().videoStart.value || 0);
  if (els.videoEndDisplay) els.videoEndDisplay.textContent = formatSecondsDisplay(fields().videoEnd.value || 12);
}

function currentPalettePairs() {
  return TEMPLATES.map((template) => ({
    name: template.name,
    front: template.frontColor,
    accent: template.accentColor,
    templateId: template.id
  }));
}

function renderTemplates() {
  els.templateList.innerHTML = '';
  TEMPLATES.forEach((template) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `template-item ${template.id === state.templateId ? 'active' : ''}`;
    item.innerHTML = `
      <h3>${escapeHtml(template.name)}</h3>
      <p>${escapeHtml(template.subtitle)}</p>
      <div class="template-swatches">
        <span style="background:${template.frontColor}"></span>
        <span style="background:${template.accentColor}"></span>
      </div>
    `;
    item.addEventListener('click', () => applyTemplate(template.id, true));
    els.templateList.appendChild(item);
  });
}

function renderColorStudio() {
  const f = fields();
  const activeColor = state.appearanceTarget === 'front' ? f.frontColor.value : f.accentColor.value;

  if (els.colorSwatchGrid) {
    els.colorSwatchGrid.innerHTML = COLOR_SWATCHES.map((color) => `
      <button
        type="button"
        class="color-swatch ${activeColor.toLowerCase() === color.toLowerCase() ? 'active' : ''}"
        data-color="${color}"
        style="background:${color}"
        aria-label="Apply ${color}"
      ></button>
    `).join('');
  }

  if (els.colorPaletteGrid) {
    els.colorPaletteGrid.innerHTML = currentPalettePairs().map((palette) => `
      <button
        type="button"
        class="palette-card ${palette.templateId === state.templateId ? 'active' : ''}"
        data-palette-template="${palette.templateId}"
      >
        <div class="palette-card__swatches">
          <span style="background:${palette.front}"></span>
          <span style="background:${palette.accent}"></span>
        </div>
        <div class="palette-card__name">${escapeHtml(palette.name)}</div>
      </button>
    `).join('');
  }

  els.targetButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.target === state.appearanceTarget);
  });

  if (els.studioMiniPreview) {
    els.studioMiniPreview.style.background = `linear-gradient(135deg, ${f.frontColor.value}, ${f.accentColor.value})`;
    const titleEl = els.studioMiniPreview.querySelector('.studio-preview__title');
    const copyEl = els.studioMiniPreview.querySelector('.studio-preview__copy');
    if (titleEl) titleEl.textContent = getTemplateById(state.templateId).title;
    if (copyEl) copyEl.textContent = f.message.value.trim() || 'Your message appears here.';
  }
}

function setStudioTab(tab) {
  state.activeStudioTab = tab;
  els.studioTabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  els.studioSections.forEach((section) => {
    section.classList.toggle('active', section.dataset.section === tab);
  });
}

function setAppearanceTarget(target) {
  state.appearanceTarget = target;
  renderColorStudio();
}

function applyColorToTarget(color) {
  const f = fields();
  if (state.appearanceTarget === 'front') {
    f.frontColor.value = color;
  } else {
    f.accentColor.value = color;
  }
  renderColorStudio();
  renderPreview();
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
  renderColorStudio();
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
    message: f.message.value,
    frontText: f.message.value || template.message,
    backText: `${template.backText}${f.senderName.value.trim() ? ` — ${f.senderName.value.trim()}` : ''}`,
    frontColor: f.frontColor.value,
    accentColor: f.accentColor.value,
    photoData: state.photoData,
    backPhotoData: state.backPhotoData,
    videoUrl: f.videoUrl.value.trim(),
    videoStart: Number(f.videoStart.value || 0),
    videoEnd: Number(f.videoEnd.value || 12),
    mediaSequence: f.mediaSequence.value || 'simultaneous',
    ctaLink: f.ctaLink.value.trim(),
    latitude: Number(f.latitude.value),
    longitude: Number(f.longitude.value),
    unlockRadiusM: Number(f.unlockRadius.value || 50),
    expiresAt: toIsoFromHours(Number(f.expiryHours.value || 48)),
    bannerFinaleEnabled: f.bannerFinale.checked,
    bannerText: template.bannerText,
    spawnHeight: Number(f.spawnHeight.value || 2),
    forwardDistance: Number(f.forwardDistance.value || 1.5),
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
        <div class="card-front">${escapeHtml(title)}</div>
        <div class="card-message">${nl2br(data.message || 'Your message will appear here.')}</div>
      </div>
      <div class="card-meta">
        <div>To ${escapeHtml(data.recipientName || 'Recipient')}</div>
        <div>From ${escapeHtml(data.senderName || 'Sender')}</div>
        <div>Visible at ${data.spawnHeight.toFixed(1)}m · ${data.forwardDistance.toFixed(1)}m forward</div>
        <div>Reveal: ${escapeHtml(data.mediaSequence.replace(/-/g, ' '))}</div>
      </div>
    </article>
  `;
  renderColorStudio();
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

async function handleBackPhotoChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    state.backPhotoData = '';
    renderPreview();
    return;
  }
  state.backPhotoData = await readFileAsDataURL(file);
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
  if (!data.message.trim()) return 'Message is required.';
  if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return 'Latitude and longitude are required.';
  if (!Number.isFinite(data.spawnHeight) || data.spawnHeight < 0.3 || data.spawnHeight > 3) return 'Card height must be between 0.3m and 3m.';
  if (!Number.isFinite(data.forwardDistance) || data.forwardDistance < 0.6 || data.forwardDistance > 3) return 'Forward offset must be between 0.6m and 3m.';
  if (!Number.isFinite(data.unlockRadiusM) || data.unlockRadiusM < 10 || data.unlockRadiusM > 150) return 'Unlock radius must be between 10m and 150m.';
  if (!Number.isFinite(Number(fields().expiryHours.value)) || Number(fields().expiryHours.value) < 1 || Number(fields().expiryHours.value) > 168) return 'Expiry hours must be between 1 and 168.';
  if (!Number.isFinite(data.videoStart) || data.videoStart < 0 || data.videoStart > 600) return 'Video start must be between 0 and 600 seconds.';
  if (!Number.isFinite(data.videoEnd) || data.videoEnd < 1 || data.videoEnd > 600) return 'Video end must be between 1 and 600 seconds.';
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
      `Saved. Link expires at ${new Date(saved.expiresAt).toLocaleString()}. Buyer preview now mirrors the recipient flow, including AR stage, media order, and thank-you templates.`,
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
  f.message.value = 'Happy Birthday!\nMeet me at the spot for your surprise.';
  f.videoStart.value = '0';
  f.videoEnd.value = '12';
  f.mediaSequence.value = 'photo-first';
  f.unlockRadius.value = '50';
  f.expiryHours.value = '48';
  f.spawnHeight.value = '2.0';
  f.forwardDistance.value = '1.5';
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
      'Google Maps loaded. Search, tap, or long-press inside the radius to move the point without your finger covering the marker. API key and Map ID come from Cloudflare runtime secrets.',
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

function lockNumberTunerOpen() {
  document.body.classList.add('number-tuner-open');
}

function unlockNumberTuner() {
  document.body.classList.remove('number-tuner-open');
}

function formatNumberValue(value, step) {
  const next = Number(value);
  if (!Number.isFinite(next)) return '0';
  return String(step < 1 ? Number(next.toFixed(2)) : Math.round(next));
}

function showNumberTuner(input) {
  if (!input || input.dataset.noTuner === 'true') return;
  state.activeNumberInput = input;
  const label = input.closest('label')?.querySelector('span')?.textContent || input.id || 'Value';
  const min = Number(input.min || 0);
  const max = Number(input.max || Math.max(min + 100, Number(input.value || 0) + 100));
  const step = Number(input.step || 1) || 1;
  const value = Number(input.value || min || 0);

  els.numberTunerLabel.textContent = label;
  els.numberTunerRange.min = String(min);
  els.numberTunerRange.max = String(max);
  els.numberTunerRange.step = String(step);
  els.numberTunerRange.value = String(Number.isFinite(value) ? value : min);
  els.numberTunerValue.textContent = formatNumberValue(Number.isFinite(value) ? value : min, step);
  els.numberTuner.classList.remove('hidden');
  els.numberTuner.setAttribute('aria-hidden', 'false');
  lockNumberTunerOpen();
  window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
}

function updateActiveNumberFromTuner(nextValue, commit = false) {
  if (!state.activeNumberInput) return;
  const step = Number(state.activeNumberInput.step || 1) || 1;
  const min = Number(state.activeNumberInput.min || Number.NEGATIVE_INFINITY);
  const max = Number(state.activeNumberInput.max || Number.POSITIVE_INFINITY);
  const clamped = Math.min(max, Math.max(min, Number(nextValue)));
  const finalValue = step < 1 ? Number(clamped.toFixed(2)) : Math.round(clamped);
  state.activeNumberInput.value = String(finalValue);
  els.numberTunerRange.value = String(finalValue);
  els.numberTunerValue.textContent = formatNumberValue(finalValue, step);
  state.activeNumberInput.dispatchEvent(new Event('input', { bubbles: true }));
  if (commit) {
    state.activeNumberInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function hideNumberTuner() {
  state.activeNumberInput = null;
  els.numberTuner.classList.add('hidden');
  els.numberTuner.setAttribute('aria-hidden', 'true');
  unlockNumberTuner();
}

function applyKeyToActiveInput(key) {
  if (!state.activeNumberInput) return;
  const input = state.activeNumberInput;
  const step = Number(input.step || 1) || 1;
  const current = input.value || '';

  if (key === 'back') {
    const next = current.slice(0, -1) || '0';
    updateActiveNumberFromTuner(Number(next), true);
    return;
  }

  if (key === '.' && !String(step).includes('.')) return;
  if (key === '.' && current.includes('.')) return;

  const candidate = current === '0' && key !== '.' ? key : `${current}${key}`;
  const parsed = Number(candidate);
  if (!Number.isFinite(parsed)) return;
  updateActiveNumberFromTuner(parsed, true);
}

function bindNumberTuner() {
  const numberInputs = qsa('input[type="number"]:not([data-no-tuner="true"])', els.form);
  numberInputs.forEach((input) => {
    input.setAttribute('inputmode', input.step && String(input.step).includes('.') ? 'decimal' : 'numeric');
    input.addEventListener('focus', () => showNumberTuner(input));
    input.addEventListener('click', () => showNumberTuner(input));
    input.addEventListener('input', () => {
      if (state.activeNumberInput === input) {
        els.numberTunerRange.value = input.value || els.numberTunerRange.min;
        els.numberTunerValue.textContent = formatNumberValue(input.value || els.numberTunerRange.min, Number(input.step || 1) || 1);
      }
    });
  });

  els.numberTunerRange?.addEventListener('input', () => updateActiveNumberFromTuner(els.numberTunerRange.value));
  els.numberTunerRange?.addEventListener('change', () => updateActiveNumberFromTuner(els.numberTunerRange.value, true));
  els.numberTunerPlus?.addEventListener('click', () => {
    if (!state.activeNumberInput) return;
    const step = Number(state.activeNumberInput.step || 1) || 1;
    const nextValue = Number(state.activeNumberInput.value || 0) + step;
    updateActiveNumberFromTuner(nextValue, true);
  });
  els.numberTunerMinus?.addEventListener('click', () => {
    if (!state.activeNumberInput) return;
    const step = Number(state.activeNumberInput.step || 1) || 1;
    const nextValue = Number(state.activeNumberInput.value || 0) - step;
    updateActiveNumberFromTuner(nextValue, true);
  });
  els.numberTunerClose?.addEventListener('click', hideNumberTuner);
  els.numberKeypad?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-key]');
    if (!button) return;
    applyKeyToActiveInput(button.dataset.key);
  });
  els.numberTuner?.addEventListener('touchmove', (event) => {
    event.stopPropagation();
  }, { passive: true });
}

function bindVideoPreview() {
  const { videoUrl, videoStart, videoEnd } = fields();
  [videoUrl, videoStart, videoEnd].forEach((input) => {
    input?.addEventListener('input', () => {
      renderVideoPreview();
      updateVideoTimeDisplays();
    });
    input?.addEventListener('change', () => {
      renderVideoPreview();
      updateVideoTimeDisplays();
    });
  });
}

function bindStudio() {
  els.studioTabs.forEach((button) => {
    button.addEventListener('click', () => setStudioTab(button.dataset.tab));
  });
  els.targetButtons.forEach((button) => {
    button.addEventListener('click', () => setAppearanceTarget(button.dataset.target));
  });
  els.colorSwatchGrid?.addEventListener('click', (event) => {
    const swatch = event.target.closest('[data-color]');
    if (!swatch) return;
    applyColorToTarget(swatch.dataset.color);
  });
  els.colorPaletteGrid?.addEventListener('click', (event) => {
    const palette = event.target.closest('[data-palette-template]');
    if (!palette) return;
    applyTemplate(palette.dataset.paletteTemplate, false);
  });

  fields().frontColor.addEventListener('input', () => {
    setAppearanceTarget('front');
    renderPreview();
  });
  fields().accentColor.addEventListener('input', () => {
    setAppearanceTarget('accent');
    renderPreview();
  });
}

function bindEvents() {
  qsa('input, textarea, select', els.form).forEach((input) => {
    input.addEventListener('input', renderPreview);
    input.addEventListener('change', renderPreview);
  });
  fields().photoFile.addEventListener('change', handlePhotoChange);
  fields().backPhotoFile.addEventListener('change', handleBackPhotoChange);
  els.form.addEventListener('submit', handleSubmit);
  qs('#use-current-location').addEventListener('click', handleUseCurrentLocation);
  qs('#copy-link').addEventListener('click', copyLink);
  qs('#load-sample').addEventListener('click', loadSample);
  qs('#jump-create').addEventListener('click', () => qs('#builder').scrollIntoView({ behavior: 'smooth' }));
  qs('#reset-form').addEventListener('click', async () => {
    state.photoData = '';
    state.backPhotoData = '';
    state.lastCreatedSlug = '';
    els.form.reset();
    fields().spawnHeight.value = '2.0';
    fields().forwardDistance.value = '1.5';
    fields().mediaSequence.value = 'simultaneous';
    await applyTemplate(TEMPLATES[0].id, true);
    els.shareLink.value = '';
    els.openLink.href = '#';
    els.previewLink.href = '#';
    els.openLink.classList.add('disabled-link');
    els.previewLink.classList.add('disabled-link');
    setStudioTab('text');
    setAppearanceTarget('front');
    hideNumberTuner();
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
  fields().spawnHeight.value = '2.0';
  fields().forwardDistance.value = '1.5';
  await setStorageMode();
  renderTemplates();
  bindStudio();
  bindNumberTuner();
  bindEvents();
  bindVideoPreview();
  setStudioTab('text');
  setAppearanceTarget('front');
  await applyTemplate(TEMPLATES[0].id, true);
  renderPreview();
  updateVideoTimeDisplays();
  renderVideoPreview();
  await initMap();
}

init();
