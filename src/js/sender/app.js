import { TEMPLATES, getTemplateById } from '../core/templates.js';
import { createRecipientPreviewUrl, createRecipientUrl, generateSlug, getCurrentPosition, qs, readFileAsDataURL, safeUrl, setStatus } from '../core/utils.js';
import { saveGift } from '../core/data-service.js';
import { getSupabaseConfig } from '../core/auth.js';
import { MapPicker } from '../core/maps.js';
import { applyPageLanguage } from '../core/i18n.js';

const state = {
  templateId: TEMPLATES[0].id,
  page: 0, // 0 = permission gate
  editorMode: 'basic',
  activeSide: 'front',
  lastCreatedSlug: '',
  mapPicker: null,
  studioCanvasH: 0
};

const MAX_PAGES = 6;
const PERM_KEY = 'chariel:perm-done';

const els = {};

function cacheDom() {
  els.permGate = qs('#permission-gate');
  els.appShell = qs('#app-shell');
  els.permAllowBtn = qs('#perm-allow-btn');
  els.permSkipBtn = qs('#perm-skip-btn');
  els.permGps = qs('#perm-gps-status');
  els.permMotion = qs('#perm-motion-status');
  els.permWarning = qs('#perm-warning');
  els.templateList = qs('#template-list');
  els.form = qs('#gift-form');
  els.shareLink = qs('#share-link');
  els.openLink = qs('#open-link');
  els.previewLink = qs('#preview-link');
  els.statusBox = qs('#status-box');
  els.copyLink = qs('#copy-link');
  els.previewCardDefault = qs('#preview-card-default');
  els.previewReceiver = qs('#preview-receiver');
  els.previewSender = qs('#preview-sender');
  els.previewTitle = qs('#preview-title');
  els.previewSubtitle = qs('#preview-subtitle');
  els.previewMessage = qs('#preview-message');
  els.previewBackMessage = qs('#preview-back-message');
  els.videoBadgeDefault = qs('#video-badge-default');
  els.previewCard = qs('#preview-card');
  els.videoBadge = qs('#video-badge');
  els.basicPreview = qs('#basic-preview');
  els.customPreview = qs('#custom-preview');
  els.videoPreviewStatus = qs('#video-preview-status');
  els.videoPreviewArea = qs('#video-preview-area');
  els.navPrev = qs('#nav-prev');
  els.navNext = qs('#nav-next');
  els.navDots = document.querySelectorAll('.nav-dots .dot');
  els.studioCanvasArea = qs('#studio-canvas-area');
  els.studioDivider = qs('#studio-divider');
  els.studioPanelArea = qs('#studio-panel-area');
  els.iconToolbar = qs('#icon-toolbar');
  els.bottomNav = qs('#bottom-nav');
  els.ctxOpacitySlider = qs('#ctx-opacity-slider');
  els.ctxOpacityPct = qs('#ctx-opacity-pct');
}

/* ── Pinch zoom prevention ── */
function preventPagePinchZoom() {
  document.addEventListener('touchmove', e => {
    if (e.touches.length >= 2 && !e.target.closest('.canvas-layer') && !e.target.closest('.stop-handle')) {
      e.preventDefault();
    }
  }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
}

/* ══ Permission gate ══ */
async function requestPermissions() {
  let gpsOk = false, motionOk = false;
  try {
    await new Promise((res, rej) => {
      navigator.geolocation.getCurrentPosition(
        () => { gpsOk = true; res(); },
        (err) => { rej(err); },
        { timeout: 8000, maximumAge: 0 }
      );
    });
  } catch { /* denied or timeout */ }

  els.permGps.textContent = gpsOk ? 'Granted' : 'Denied';
  els.permGps.className = `perm-status ${gpsOk ? 'granted' : 'denied'}`;
  

  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const result = await DeviceOrientationEvent.requestPermission();
      motionOk = result === 'granted';
    } catch { /* denied */ }
  } else {
    motionOk = true;
  }

  els.permMotion.textContent = motionOk ? 'Granted' : 'Denied';
  els.permMotion.className = `perm-status ${motionOk ? 'granted' : 'denied'}`;

  // GPS granted
document.querySelector('#chk-gps').checked = gpsOk;
// Motion granted  
document.querySelector('#chk-motion').checked = motionOk;


  if (!gpsOk || !motionOk) {
    els.permWarning.classList.remove('hidden');
  }

  return { gpsOk, motionOk };
}

function finishPermissions() {
  sessionStorage.setItem(PERM_KEY, '1');
  els.permGate.classList.add('hidden');
  els.appShell.classList.remove('hidden');
  state.page = 1;
  updatePage();
}

function bindPermissions() {
  els.permAllowBtn.addEventListener('click', async () => {
    els.permAllowBtn.disabled = true;
    els.permAllowBtn.textContent = 'Checking…';
    await requestPermissions();
    els.permAllowBtn.textContent = 'Continue';
    els.permAllowBtn.disabled = false;
    els.permAllowBtn.addEventListener('click', finishPermissions, { once: true });
  });
  els.permSkipBtn.addEventListener('click', finishPermissions);
}

/* ── Page navigation ── */
function updatePage() {
  document.querySelectorAll('.page-view').forEach(el => el.classList.add('page-hidden'));
  document.querySelectorAll(`.page-view[data-step="${state.page}"]`).forEach(el => el.classList.remove('page-hidden'));

  const shell = qs('.sender-shell');
  if (shell) {
    shell.style.overflowY = 'auto'; // Always allow scroll to secure workspace
  }

  if (els.bottomNav) els.bottomNav.style.display = '';

  els.navDots.forEach((d, i) => d.classList.toggle('active', i === state.page - 1));
  if (els.navPrev) els.navPrev.disabled = state.page <= 1;
  if (els.navNext) {
    els.navNext.textContent = state.page === MAX_PAGES ? 'Finish' : 'Next ▶';
    els.navNext.disabled = state.page === MAX_PAGES;
  }

  if (state.page === 2) {
    setTimeout(() => {
      const topArea = qs('#main');
      if (topArea && shell) {
        shell.scrollTo({ top: topArea.offsetTop - 10, behavior: 'smooth' });
      }
  if (window.CanvasEditor) {
    window.CanvasEditor.init();
    window.CanvasEditor.setCurrentTemplate(state.templateId);
    window.CanvasEditor.applyTemplateToLayers(getTemplateById(state.templateId));
  }

    }, 50);
  }
}

function nextPage() { if (state.page < MAX_PAGES) { state.page++; updatePage(); if (state.page !== 2) qs('.sender-shell')?.scrollTo({ top: 0, behavior: 'smooth' }); } }
function prevPage() { if (state.page > 1) { state.page--; updatePage(); if (state.page !== 2) qs('.sender-shell')?.scrollTo({ top: 0, behavior: 'smooth' }); } }

/* ── Studio split resizer ── */
function bindStudioResizer() {
  // Handled by CanvasEditor internally now
}

/* ★ Set initial split height based on editor mode */
function applySplitHeight() {
  // Handled by CanvasEditor internally now
}

/* ── Mode & Side toggle ── */
function syncEditorMode() {
  document.querySelectorAll('#mode-toggle .toggle-pill').forEach(p => p.classList.toggle('active', p.dataset.value === state.editorMode));
  if (window.CanvasEditor) window.CanvasEditor.setMode(state.editorMode);
}

function syncSideToggle() {
  document.querySelectorAll('#side-toggle .toggle-pill').forEach(p => p.classList.toggle('active', p.dataset.value === state.activeSide));
  if (window.CanvasEditor) window.CanvasEditor.switchSide(state.activeSide);
}

/* ── Panel management ── */
function closeAllPanels() {
  // Handled inherently by CanvasEditor
}

function bindPanels() {
  // Handled inherently by CanvasEditor
}

function bindToggles() {
  document.querySelectorAll('#mode-toggle .toggle-pill').forEach(btn => {
    btn.addEventListener('click', () => { state.editorMode = btn.dataset.value; syncEditorMode(); });
  });
  document.querySelectorAll('#side-toggle .toggle-pill').forEach(btn => {
    btn.addEventListener('click', () => { state.activeSide = btn.dataset.value; syncSideToggle(); });
  });
}

/* ── Fields ── */
function fields() {
  return {
    recipientName: qs('#recipient-name'), senderName: qs('#sender-name'),
    videoUrl: qs('#video-url'), ctaLink: qs('#cta-link'),
    mapSearch: qs('#map-search'), mapSearchButton: qs('#map-search-btn'),
    mapEl: qs('#sender-map'), mapStatus: qs('#map-status'),
    latitude: qs('#latitude'), longitude: qs('#longitude'),
    unlockRadius: qs('#unlock-radius'), startAt: qs('#start-at'), expiresAt: qs('#expires-at'),
    spawnHeight: qs('#spawn-height'), forwardDistance: qs('#forward-distance')
  };
}

/* ── Date ── */
function fmtDate(d) {
  const p = v => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function setDefaultDates() {
  const { startAt, expiresAt } = fields();
  const now = new Date(); now.setSeconds(0, 0);
  startAt.value = fmtDate(now);
  expiresAt.value = fmtDate(new Date(now.getTime() + 86400000));
  syncExpiry();
}
function syncExpiry() {
  const { startAt, expiresAt } = fields();
  if (!startAt.value) return;
  const s = new Date(startAt.value), mx = new Date(s.getTime() + 86400000);
  expiresAt.min = fmtDate(s); expiresAt.max = fmtDate(mx);
  if (!expiresAt.value) { expiresAt.value = expiresAt.max; return; }
  const c = new Date(expiresAt.value);
  if (c < s) expiresAt.value = expiresAt.min;
  else if (c > mx) expiresAt.value = expiresAt.max;
}

/* ── YouTube ── */
function parseYtId(url) {
  try {
    const p = new URL(url);
    if (p.hostname.includes('youtu.be')) return p.pathname.replace('/', '').trim();
    if (p.hostname.includes('youtube.com')) {
      if (p.pathname === '/watch') return p.searchParams.get('v') || '';
      if (p.pathname.startsWith('/embed/')) return p.pathname.split('/embed/')[1] || '';
      if (p.pathname.startsWith('/shorts/')) return p.pathname.split('/shorts/')[1] || '';
    }
    return '';
  } catch { return ''; }
}
function hmsToSec(pre) {
  const h = Number(qs(`#${pre}-h`)?.value || 0), m = Number(qs(`#${pre}-m`)?.value || 0), s = Number(qs(`#${pre}-s`)?.value || 0);
  return h * 3600 + m * 60 + s;
}
function secToHms(t) {
  const s = Math.max(0, Math.floor(Number(t) || 0));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => String(v).padStart(2, '0')).join(':');
}

/* ★ YouTube Player API — enforce start/end times */
let ytPlayer = null;
let ytPlayerReady = false;
let ytEndSec = 0;
let ytCheckInterval = null;

function ensureYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      // script already loading, wait for callback
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(tag);
  });
}

function destroyYtPlayer() {
  if (ytCheckInterval) { clearInterval(ytCheckInterval); ytCheckInterval = null; }
  if (ytPlayer) { try { ytPlayer.destroy(); } catch {} ytPlayer = null; }
  ytPlayerReady = false;
}

function createYtPlayer(ytId, startSec, endSec) {
  destroyYtPlayer();
  ytEndSec = endSec;

  // clear container and create a fresh div
  els.videoPreviewArea.innerHTML = '';
  const holder = document.createElement('div');
  holder.id = 'yt-player-holder';
  els.videoPreviewArea.appendChild(holder);

  ytPlayer = new YT.Player('yt-player-holder', {
    width: '100%',
    height: '100%',
    videoId: ytId,
    playerVars: {
      start: startSec,
      end: endSec,
      rel: 0,
      playsinline: 1,
      modestbranding: 1,
      controls: 1
    },
    events: {
      onReady: () => {
        ytPlayerReady = true;
        // seek to start when ready
        ytPlayer.seekTo(startSec, true);
      },
      onStateChange: (event) => {
        // When playing, enforce end time
        if (event.data === YT.PlayerState.PLAYING) {
          if (ytCheckInterval) clearInterval(ytCheckInterval);
          ytCheckInterval = setInterval(() => {
            if (!ytPlayer || !ytPlayerReady) return;
            const current = ytPlayer.getCurrentTime();
            if (current >= ytEndSec) {
              ytPlayer.pauseVideo();
              ytPlayer.seekTo(startSec, true);
              clearInterval(ytCheckInterval);
              ytCheckInterval = null;
            }
          }, 250);
        }
        if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
          if (ytCheckInterval) { clearInterval(ytCheckInterval); ytCheckInterval = null; }
        }
      }
    }
  });
}

/* ── Templates ── */
function renderTemplates() {
  els.templateList.innerHTML = TEMPLATES.map(t => `
    <button type="button" class="template-item ${t.id === state.templateId ? 'active' : ''}" data-template-id="${t.id}">
      <h3>${t.name}</h3><p>${t.subtitle}</p>
      <div class="template-swatches"><span style="background:${t.frontColor}"></span><span style="background:${t.accentColor}"></span></div>
    </button>`).join('');
}

function applyTemplate(id) {
  state.templateId = id;
  const tpl = getTemplateById(id);
  els.previewTitle.textContent = tpl.title;
  els.previewSubtitle.textContent = tpl.subtitle;
  els.previewMessage.textContent = tpl.message;
  els.previewBackMessage.textContent = tpl.backText;
  if (window.CanvasEditor) {
    window.CanvasEditor.setCurrentTemplate(id);
    window.CanvasEditor.applyTemplateToLayers(tpl);
  }
  renderTemplates();
  renderPreviewCard();
}


function sanitize(el) { return (el?.innerText || '').replace(/\u00a0/g, ' ').replace(/\r/g, '').trim(); }

function renderPreviewCard() {
  const f = fields(), tpl = getTemplateById(state.templateId);
  [els.previewCardDefault, els.previewCard].forEach(c => {
    if (c) { c.style.setProperty('--card-front', tpl.frontColor); c.style.setProperty('--card-accent', tpl.accentColor); }
  });
  els.previewReceiver.textContent = f.recipientName.value.trim() || 'Receiver';
  els.previewSender.textContent = `From ${f.senderName.value.trim() || 'Sender'}`;
  if (window.CanvasEditor) window.CanvasEditor.updateSenderReceiver(f.senderName.value.trim());
  const hasVid = Boolean(parseYtId(f.videoUrl.value.trim()));
  els.videoBadgeDefault?.classList.toggle('hidden', !hasVid);
  els.videoBadge?.classList.toggle('hidden', !hasVid);
}

/* ★ renderVideoPreview — uses YouTube Player API for accurate start/end enforcement */
async function renderVideoPreview() {
  const url = fields().videoUrl.value.trim();
  const ytId = parseYtId(url);

  if (!url) {
    destroyYtPlayer();
    els.videoPreviewArea.innerHTML = '<div class="video-preview-empty">Paste a YouTube URL.</div>';
    els.videoPreviewStatus.textContent = 'YouTube only.';
    renderPreviewCard();
    return;
  }
  if (!ytId) {
    destroyYtPlayer();
    els.videoPreviewArea.innerHTML = '<div class="video-preview-empty">Only YouTube URLs.</div>';
    els.videoPreviewStatus.textContent = '';
    renderPreviewCard();
    return;
  }

  const vs = hmsToSec('vs'), ve = hmsToSec('ve');
  const ss = Number.isFinite(vs) ? vs : 0;
  const se = Number.isFinite(ve) && ve > ss ? ve : ss + 12;

  els.videoPreviewStatus.textContent = `${secToHms(ss)} → ${secToHms(se)}`;

  try {
    await ensureYouTubeApi();
    createYtPlayer(ytId, ss, se);
  } catch {
    // Fallback to simple iframe if API fails
    const emb = new URL(`https://www.youtube.com/embed/${ytId}`);
    emb.searchParams.set('start', String(ss));
    emb.searchParams.set('end', String(se));
    emb.searchParams.set('rel', '0');
    emb.searchParams.set('playsinline', '1');
    els.videoPreviewArea.innerHTML = `<iframe src="${emb.href}" title="Preview" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>`;
  }

  renderPreviewCard();
}

/* ── Location ── */
async function useCurrentLocation() {
  try {
    const pos = await getCurrentPosition();
    fields().latitude.value = pos.coords.latitude.toFixed(6);
    fields().longitude.value = pos.coords.longitude.toFixed(6);
    state.mapPicker?.setPosition(pos.coords.latitude, pos.coords.longitude, true);
    setStatus(fields().mapStatus, 'Location pinned.', 'success');
  } catch (err) { setStatus(fields().mapStatus, err.message || 'Failed.', 'error'); }
}

/* ── Form ── */
function getFormData() {
  const f = fields(), tpl = getTemplateById(state.templateId);
  const vs = hmsToSec('vs'), ve = hmsToSec('ve');
  const isBasic = state.editorMode === 'basic';
  const canvasData = window.CanvasEditor ? window.CanvasEditor.getLayers() : null;
  return {
    slug: state.lastCreatedSlug || generateSlug('gift'),
    templateId: state.templateId, templateName: tpl.name,
    recipientName: f.recipientName.value.trim(), senderName: f.senderName.value.trim(),
    editorMode: state.editorMode,
    message: isBasic ? sanitize(els.previewMessage) : tpl.message,
    frontTitle: isBasic ? sanitize(els.previewTitle) : (canvasData?.front?.[0]?.text || tpl.title),
    frontSubtitle: isBasic ? sanitize(els.previewSubtitle) : tpl.subtitle,
    frontText: isBasic ? sanitize(els.previewMessage) : tpl.message,
    backText: isBasic ? sanitize(els.previewBackMessage) : tpl.backText,
    canvasData: canvasData,
    frontColor: tpl.frontColor, accentColor: tpl.accentColor,
    videoUrl: safeUrl(f.videoUrl.value.trim()),
    videoStart: Number.isFinite(vs) ? vs : 0, videoEnd: Number.isFinite(ve) ? ve : 12,
    ctaLink: f.ctaLink.value.trim(),
    latitude: Number(f.latitude.value), longitude: Number(f.longitude.value),
    unlockRadiusM: Number(f.unlockRadius.value || 50),
    startAt: f.startAt.value ? new Date(f.startAt.value).toISOString() : new Date().toISOString(),
    expiresAt: f.expiresAt.value ? new Date(f.expiresAt.value).toISOString() : new Date(Date.now() + 86400000).toISOString(),
    spawnHeight: Number(f.spawnHeight.value || 3), forwardDistance: Number(f.forwardDistance.value || 2),
    status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
}

function validate(data) {
  if (!data.recipientName) return 'Receiver name required.';
  if (!data.senderName) return 'Sender name required.';
  if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return 'Lat/lng required.';
  if (data.spawnHeight < 0.5 || data.spawnHeight > 5.5) return 'Height 0.5–5.5m.';
  if (data.forwardDistance < 0.5 || data.forwardDistance > 5.5) return 'Distance 0.5–5.5m.';
  if (data.unlockRadiusM < 10 || data.unlockRadiusM > 150) return 'Radius 10–150m.';
  const f = fields();
  if (f.videoUrl.value.trim() && !parseYtId(f.videoUrl.value.trim())) return 'YouTube URLs only.';
  if (data.videoEnd <= data.videoStart) return 'Video end > start.';
  const s = new Date(f.startAt.value), e = new Date(f.expiresAt.value);
  if (isNaN(s)) return 'Start date required.'; if (isNaN(e)) return 'Expiry required.';
  if (e < s) return 'Expiry after start.'; if (e - s > 86400000) return 'Within 24h.';
  return '';
}

async function handleSubmit(ev) {
  ev.preventDefault();
  const data = getFormData(), err = validate(data);
  if (err) { setStatus(els.statusBox, err, 'error'); return; }
  try {
    const saved = await saveGift(data);
    state.lastCreatedSlug = saved.slug;
    els.shareLink.value = createRecipientUrl(saved.slug);
    els.openLink.href = els.shareLink.value;
    els.previewLink.href = createRecipientPreviewUrl(saved.slug);
    els.openLink.classList.remove('disabled-link');
    els.previewLink.classList.remove('disabled-link');
    setStatus(els.statusBox, `Saved. Expires ${new Date(saved.expiresAt).toLocaleString()}.`, 'success');
  } catch (e) { setStatus(els.statusBox, e.message || 'Save failed.', 'error'); }
}

/* ★ copyLink with visual gradient feedback on button */
async function copyLink() {
  const btn = els.copyLink;
  if (!els.shareLink.value) return;
  try {
    await navigator.clipboard.writeText(els.shareLink.value);
  } catch {
    // Fallback for browsers that block clipboard
    const ta = document.createElement('textarea');
    ta.value = els.shareLink.value;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  // Visual feedback on the button itself
  const originalText = btn.textContent;
  btn.textContent = 'Created ✓';
  btn.classList.add('btn-copy-success');
  setStatus(els.statusBox, 'Link copied to clipboard.', 'success');
  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove('btn-copy-success');
  }, 2000);
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
  } catch (e) { setStatus(f.mapStatus, e.message || 'Map failed.', 'warn'); }
}

async function setRuntimeStatus() {
  const { url, anonKey } = await getSupabaseConfig();
  if (!url || !anonKey) setStatus(els.statusBox, 'Local/demo mode.', 'muted');
}

/* ── HMS inputs ── */
function bindHmsInputs() {
  const inputs = ['vs-h', 'vs-m', 'vs-s', 've-h', 've-m', 've-s'].map(id => qs(`#${id}`)).filter(Boolean);
  inputs.forEach((inp, idx) => {
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('input', e => {
      inp.value = inp.value.replace(/[^\d]/g, '').slice(0, 2);
      if (inp.value.length === 2 && e.inputType !== 'deleteContentBackward') {
        const next = inputs[idx + 1];
        if (next && inp.id.split('-')[0] === next.id.split('-')[0]) next.focus();
      }
      // Debounce video preview rebuild on time change
      clearTimeout(inp._debounce);
      inp._debounce = setTimeout(() => renderVideoPreview(), 600);
    });
    inp.addEventListener('blur', () => {
      const v = inp.value.replace(/[^\d]/g, '').trim();
      inp.value = (!v) ? '00' : v.length === 1 ? v.padStart(2, '0') : v.slice(0, 2);
      renderVideoPreview();
    });
  });
}

/* ── Events ── */
function bindEvents() {
  const f = fields();
  els.templateList.addEventListener('click', e => { const b = e.target.closest('[data-template-id]'); if (b) applyTemplate(b.dataset.templateId); });
  f.recipientName.addEventListener('input', renderPreviewCard);
  f.senderName.addEventListener('input', renderPreviewCard);
  f.videoUrl?.addEventListener('input', () => {
    clearTimeout(f.videoUrl._debounce);
    f.videoUrl._debounce = setTimeout(() => renderVideoPreview(), 400);
  });
  [els.previewTitle, els.previewSubtitle, els.previewMessage, els.previewBackMessage].forEach(el => el?.addEventListener('input', renderPreviewCard));
  bindHmsInputs();
  bindToggles();
  bindPanels();
  f.startAt.addEventListener('change', syncExpiry);
  f.expiresAt.addEventListener('change', syncExpiry);
  f.unlockRadius.addEventListener('input', () => state.mapPicker?.updateRadius());
  qs('#use-current-location')?.addEventListener('click', useCurrentLocation);
  els.form?.addEventListener('submit', handleSubmit);
  els.copyLink?.addEventListener('click', copyLink);
  els.navPrev?.addEventListener('click', prevPage);
  els.navNext?.addEventListener('click', nextPage);
}

/* ── Init ── */
async function init() {
  applyPageLanguage();
  preventPagePinchZoom();
  cacheDom();

  if (sessionStorage.getItem(PERM_KEY)) {
    finishPermissions();
  } else {
    els.appShell.classList.add('hidden');
    els.permGate.classList.remove('hidden');
    bindPermissions();
  }

  renderTemplates();
  setDefaultDates();
  bindEvents();
  bindStudioResizer();
  applyTemplate(state.templateId);
  renderVideoPreview();
  renderPreviewCard();
  syncEditorMode();
  syncSideToggle();
  if (window.CanvasEditor) window.CanvasEditor.init();
  await setRuntimeStatus();
  await initMap();
}

init();
