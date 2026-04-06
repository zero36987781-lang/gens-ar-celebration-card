import { TEMPLATES, getTemplateById } from '../core/templates.js';
import { createRecipientPreviewUrl, createRecipientUrl, generateSlug, getCurrentPosition, qs, readFileAsDataURL, safeUrl, setStatus } from '../core/utils.js';
import { saveGift } from '../core/data-service.js';
import { getSupabaseConfig } from '../core/auth.js';
import { MapPicker } from '../core/maps.js';
import { applyPageLanguage } from '../core/i18n.js';

const state = {
  templateId: TEMPLATES[0].id,
  page: 1,
  editorMode: 'default', // 'default' | 'custom'
  activeSide: 'front',
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
  // Default mode card
  previewCardDefault: qs('#preview-card-default'),
  previewReceiver: qs('#preview-receiver'),
  previewSender: qs('#preview-sender'),
  previewTitle: qs('#preview-title'),
  previewSubtitle: qs('#preview-subtitle'),
  previewMessage: qs('#preview-message'),
  previewBackMessage: qs('#preview-back-message'),
  videoBadgeDefault: qs('#video-badge-default'),
  // Custom mode card
  previewCard: qs('#preview-card'),
  videoBadge: qs('#video-badge'),
  // Containers
  defaultPreview: qs('#default-preview'),
  customPreview: qs('#custom-preview'),
  canvasToolbar: qs('#canvas-toolbar'),
  // Video
  videoPreviewStatus: qs('#video-preview-status'),
  videoPreviewArea: qs('#video-preview-area'),
  builderGrid: qs('#builder-grid'),
  navPrev: qs('#nav-prev'),
  navNext: qs('#nav-next'),
  navDots: document.querySelectorAll('.nav-dots .dot')
};

const MAX_PAGES = 5;

/* ── Pinch-to-zoom prevention on page level ── */
function preventPagePinchZoom() {
  document.addEventListener('touchmove', e => {
    if (e.touches.length >= 2) {
      // Allow pinch only inside canvas-layer (handled by canvas editor)
      const t = e.target;
      if (!t.closest('.canvas-layer')) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  // Also prevent gesturestart (Safari)
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
}

/* ── Page navigation ── */
function updatePage() {
  document.querySelectorAll('.page-view').forEach(el => el.classList.add('page-hidden'));
  document.querySelectorAll(`.page-view[data-step="${state.page}"]`).forEach(el => el.classList.remove('page-hidden'));

  if (state.page >= 1 && state.page <= 4) {
    els.builderGrid?.classList.add('single-column-override');
  } else {
    els.builderGrid?.classList.remove('single-column-override');
  }

  els.navDots.forEach((dot, i) => dot.classList.toggle('active', i === state.page - 1));
  if (els.navPrev) els.navPrev.disabled = state.page === 1;
  if (els.navNext) {
    els.navNext.textContent = state.page === MAX_PAGES ? 'Finish' : 'Next ▶';
    els.navNext.disabled = state.page === MAX_PAGES;
  }
}

function nextPage() { if (state.page < MAX_PAGES) { state.page++; updatePage(); window.scrollTo({top:0,behavior:'smooth'}); } }
function prevPage() { if (state.page > 1) { state.page--; updatePage(); window.scrollTo({top:0,behavior:'smooth'}); } }

/* ── Mode & Side toggles ── */
function syncEditorMode() {
  const isCustom = state.editorMode === 'custom';
  els.defaultPreview.classList.toggle('hidden', isCustom);
  els.customPreview.classList.toggle('hidden', !isCustom);
  els.canvasToolbar.classList.toggle('hidden', !isCustom);

  // Sync toggle pills
  document.querySelectorAll('#mode-toggle .toggle-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.value === state.editorMode);
  });
}

function syncSideToggle() {
  document.querySelectorAll('#side-toggle .toggle-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.value === state.activeSide);
  });

  const showBack = state.activeSide === 'back';

  // Default card flip
  els.previewCardDefault.classList.toggle('is-back', showBack);
  els.previewCardDefault.classList.toggle('is-front', !showBack);

  // Custom card flip
  els.previewCard.classList.toggle('is-back', showBack);
  els.previewCard.classList.toggle('is-front', !showBack);

  if (window.CanvasEditor) window.CanvasEditor.switchSide(state.activeSide);
}

function bindToggles() {
  document.querySelectorAll('#mode-toggle .toggle-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editorMode = btn.dataset.value;
      syncEditorMode();
    });
  });
  document.querySelectorAll('#side-toggle .toggle-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeSide = btn.dataset.value;
      syncSideToggle();
    });
  });

  // Legacy flip buttons inside default card
  qs('#flip-default')?.addEventListener('click', () => { state.activeSide = 'back'; syncSideToggle(); });
  qs('#flip-default-back')?.addEventListener('click', () => { state.activeSide = 'front'; syncSideToggle(); });
}

/* ── Fields ── */
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

/* ── Date ── */
function fmtDate(d) {
  const p = v => String(v).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function setDefaultDates() {
  const {startAt, expiresAt} = fields();
  const now = new Date(); now.setSeconds(0,0);
  const end = new Date(now.getTime() + 86400000);
  startAt.value = fmtDate(now);
  expiresAt.value = fmtDate(end);
  syncExpiry();
}

function syncExpiry() {
  const {startAt, expiresAt} = fields();
  if (!startAt.value) return;
  const s = new Date(startAt.value);
  const mx = new Date(s.getTime() + 86400000);
  expiresAt.min = fmtDate(s);
  expiresAt.max = fmtDate(mx);
  if (!expiresAt.value) { expiresAt.value = expiresAt.max; return; }
  const c = new Date(expiresAt.value);
  if (c < s) expiresAt.value = expiresAt.min;
  else if (c > mx) expiresAt.value = expiresAt.max;
}

/* ── YouTube ── */
function parseYtId(url) {
  try {
    const p = new URL(url);
    if (p.hostname.includes('youtu.be')) return p.pathname.replace('/','').trim();
    if (p.hostname.includes('youtube.com')) {
      if (p.pathname==='/watch') return p.searchParams.get('v')||'';
      if (p.pathname.startsWith('/embed/')) return p.pathname.split('/embed/')[1]||'';
      if (p.pathname.startsWith('/shorts/')) return p.pathname.split('/shorts/')[1]||'';
    }
    return '';
  } catch { return ''; }
}

function hmsToSec(prefix) {
  const h=Number(qs(`#${prefix}-h`)?.value||0), m=Number(qs(`#${prefix}-m`)?.value||0), s=Number(qs(`#${prefix}-s`)?.value||0);
  return h*3600+m*60+s;
}

function secToHms(t) {
  const s = Math.max(0,Math.floor(Number(t)||0));
  return [Math.floor(s/3600),Math.floor((s%3600)/60),s%60].map(v=>String(v).padStart(2,'0')).join(':');
}

/* ── Templates ── */
function renderTemplates() {
  els.templateList.innerHTML = TEMPLATES.map(t => `
    <button type="button" class="template-item ${t.id===state.templateId?'active':''}" data-template-id="${t.id}">
      <h3>${t.name}</h3><p>${t.subtitle}</p>
      <div class="template-swatches"><span style="background:${t.frontColor}"></span><span style="background:${t.accentColor}"></span></div>
    </button>`).join('');
}

function applyTemplate(id) {
  state.templateId = id;
  const tpl = getTemplateById(id);

  // Default mode
  els.previewTitle.textContent = tpl.title;
  els.previewSubtitle.textContent = tpl.subtitle;
  els.previewMessage.textContent = tpl.message;
  els.previewBackMessage.textContent = tpl.backText;

  // Custom mode
  if (window.CanvasEditor) window.CanvasEditor.applyTemplateToLayers(tpl);

  renderTemplates();
  renderPreviewCard();
}

function sanitizeEditable(el) {
  return (el?.innerText || '').replace(/\u00a0/g,' ').replace(/\r/g,'').trim();
}

function renderPreviewCard() {
  const f = fields();
  const tpl = getTemplateById(state.templateId);

  // Colors on both cards
  [els.previewCardDefault, els.previewCard].forEach(card => {
    if (card) {
      card.style.setProperty('--card-front', tpl.frontColor);
      card.style.setProperty('--card-accent', tpl.accentColor);
    }
  });

  // Default mode texts
  els.previewReceiver.textContent = f.recipientName.value.trim() || 'Receiver';
  els.previewSender.textContent = `From ${f.senderName.value.trim() || 'Sender'}`;

  // Update canvas editor sender name
  if (window.CanvasEditor) {
    window.CanvasEditor.updateSenderReceiver(f.senderName.value.trim(), f.recipientName.value.trim());
  }

  const hasVid = Boolean(parseYtId(f.videoUrl.value.trim()));
  els.videoBadgeDefault?.classList.toggle('hidden', !hasVid);
  els.videoBadge?.classList.toggle('hidden', !hasVid);
}

function renderVideoPreview() {
  const {videoUrl} = fields();
  const url = videoUrl.value.trim();
  const ytId = parseYtId(url);
  if (!url) {
    els.videoPreviewArea.innerHTML = '<div class="video-preview-empty">Paste a YouTube URL to preview.</div>';
    els.videoPreviewStatus.textContent = 'YouTube links only.';
    renderPreviewCard(); return;
  }
  if (!ytId) {
    els.videoPreviewArea.innerHTML = '<div class="video-preview-empty">Only YouTube URLs accepted.</div>';
    els.videoPreviewStatus.textContent = 'Non-YouTube links blocked.';
    renderPreviewCard(); return;
  }
  const vs = hmsToSec('vs'), ve = hmsToSec('ve');
  const ss = Number.isFinite(vs)?vs:0, se = Number.isFinite(ve)?ve:ss+12;
  const emb = new URL(`https://www.youtube.com/embed/${ytId}`);
  emb.searchParams.set('start',String(ss));
  emb.searchParams.set('end',String(Math.max(ss+1,se)));
  emb.searchParams.set('rel','0');
  emb.searchParams.set('playsinline','1');
  els.videoPreviewArea.innerHTML = `<iframe src="${emb.href}" title="Preview" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen></iframe>`;
  els.videoPreviewStatus.textContent = `Previewing ${secToHms(ss)} → ${secToHms(Math.max(ss+1,se))}.`;
  renderPreviewCard();
}

/* ── Location ── */
async function useCurrentLocation() {
  try {
    const pos = await getCurrentPosition();
    fields().latitude.value = pos.coords.latitude.toFixed(6);
    fields().longitude.value = pos.coords.longitude.toFixed(6);
    state.mapPicker?.setPosition(pos.coords.latitude, pos.coords.longitude, true);
    setStatus(fields().mapStatus, 'Current location pinned.', 'success');
  } catch (err) {
    setStatus(fields().mapStatus, err.message || 'Location failed.', 'error');
  }
}

/* ── Form ── */
function getFormData() {
  const f = fields();
  const tpl = getTemplateById(state.templateId);
  const vs = hmsToSec('vs'), ve = hmsToSec('ve');

  // Collect default-mode text if in default mode
  const frontMsg = state.editorMode === 'default' ? sanitizeEditable(els.previewMessage) : tpl.message;
  const backMsg = state.editorMode === 'default' ? sanitizeEditable(els.previewBackMessage) : tpl.backText;

  return {
    slug: state.lastCreatedSlug || generateSlug('gift'),
    templateId: state.templateId,
    templateName: tpl.title,
    recipientName: f.recipientName.value.trim(),
    senderName: f.senderName.value.trim(),
    editorMode: state.editorMode,
    message: frontMsg,
    frontSubtitle: state.editorMode === 'default' ? sanitizeEditable(els.previewSubtitle) : tpl.subtitle,
    frontTitle: state.editorMode === 'default' ? sanitizeEditable(els.previewTitle) : tpl.title,
    frontText: frontMsg,
    backText: backMsg,
    canvasData: window.CanvasEditor ? window.CanvasEditor.getLayers() : null,
    frontColor: tpl.frontColor,
    accentColor: tpl.accentColor,
    videoUrl: safeUrl(f.videoUrl.value.trim()),
    videoStart: Number.isFinite(vs) ? vs : 0,
    videoEnd: Number.isFinite(ve) ? ve : 12,
    mediaSequence: 'card-first',
    ctaLink: f.ctaLink.value.trim(),
    latitude: Number(f.latitude.value),
    longitude: Number(f.longitude.value),
    unlockRadiusM: Number(f.unlockRadius.value || 50),
    startAt: f.startAt.value ? new Date(f.startAt.value).toISOString() : new Date().toISOString(),
    expiresAt: f.expiresAt.value ? new Date(f.expiresAt.value).toISOString() : new Date(Date.now()+86400000).toISOString(),
    spawnHeight: Number(f.spawnHeight.value || 3),
    forwardDistance: Number(f.forwardDistance.value || 2),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function validate(data) {
  if (!data.recipientName) return 'Receiver name required.';
  if (!data.senderName) return 'Sender name required.';
  if (!Number.isFinite(data.latitude)||!Number.isFinite(data.longitude)) return 'Lat/lng required.';
  if (data.spawnHeight<0.5||data.spawnHeight>5.5) return 'Card height 0.5–5.5m.';
  if (data.forwardDistance<0.5||data.forwardDistance>5.5) return 'Forward distance 0.5–5.5m.';
  if (data.unlockRadiusM<10||data.unlockRadiusM>150) return 'Unlock radius 10–150m.';
  const f = fields();
  if (f.videoUrl.value.trim() && !parseYtId(f.videoUrl.value.trim())) return 'Only YouTube URLs accepted.';
  if (data.videoEnd<=data.videoStart) return 'Video end must be after start.';
  const s=new Date(f.startAt.value), e=new Date(f.expiresAt.value);
  if (isNaN(s.getTime())) return 'Start date required.';
  if (isNaN(e.getTime())) return 'Expiry date required.';
  if (e<s) return 'Expiry must be after start.';
  if (e-s>86400000) return 'Expiry within 24h of start.';
  return '';
}

async function handleSubmit(ev) {
  ev.preventDefault();
  const data = getFormData();
  const err = validate(data);
  if (err) { setStatus(els.statusBox, err, 'error'); return; }
  try {
    const saved = await saveGift(data);
    state.lastCreatedSlug = saved.slug;
    const sUrl = createRecipientUrl(saved.slug);
    const pUrl = createRecipientPreviewUrl(saved.slug);
    els.shareLink.value = sUrl;
    els.openLink.href = sUrl;
    els.previewLink.href = pUrl;
    els.openLink.classList.remove('disabled-link');
    els.previewLink.classList.remove('disabled-link');
    setStatus(els.statusBox, `Saved. Expires ${new Date(saved.expiresAt).toLocaleString()}.`, 'success');
  } catch (e) {
    setStatus(els.statusBox, e.message || 'Save failed.', 'error');
  }
}

async function copyLink() {
  if (!els.shareLink.value) return;
  await navigator.clipboard.writeText(els.shareLink.value);
  setStatus(els.statusBox, 'Copied.', 'success');
}

async function initMap() {
  const f = fields();
  try {
    state.mapPicker = new MapPicker({
      mapEl:f.mapEl, latInput:f.latitude, lngInput:f.longitude,
      radiusInput:f.unlockRadius, searchInput:f.mapSearch,
      searchButton:f.mapSearchButton, statusEl:f.mapStatus
    });
    await state.mapPicker.init();
  } catch (e) {
    setStatus(f.mapStatus, e.message||'Map load failed.', 'warn');
  }
}

async function setRuntimeStatus() {
  const {url,anonKey} = await getSupabaseConfig();
  if (!url||!anonKey) setStatus(els.statusBox, 'Running in local/demo mode.', 'muted');
}

/* ── HMS inputs ── */
function bindHmsInputs() {
  const inputs = ['vs-h','vs-m','vs-s','ve-h','ve-m','ve-s'].map(id=>qs(`#${id}`)).filter(Boolean);
  inputs.forEach((inp, idx) => {
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('input', e => {
      inp.value = inp.value.replace(/[^\d]/g,'').slice(0,2);
      if (inp.value.length===2 && e.inputType!=='deleteContentBackward') {
        const next = inputs[idx+1];
        if (next && inp.id.split('-')[0]===next.id.split('-')[0]) next.focus();
      }
      renderVideoPreview();
    });
    inp.addEventListener('blur', () => {
      const v = inp.value.replace(/[^\d]/g,'').trim();
      if (!v) inp.value = '00';
      else if (v.length===1) inp.value = v.padStart(2,'0');
      else inp.value = v.slice(0,2);
      renderVideoPreview();
    });
  });
}

/* ── Bind events ── */
function bindEvents() {
  const f = fields();

  els.templateList.addEventListener('click', e => {
    const btn = e.target.closest('[data-template-id]');
    if (btn) applyTemplate(btn.dataset.templateId);
  });

  f.recipientName.addEventListener('input', renderPreviewCard);
  f.senderName.addEventListener('input', renderPreviewCard);
  f.videoUrl.addEventListener('input', renderVideoPreview);

  // Default mode contenteditable sync
  [els.previewTitle, els.previewSubtitle, els.previewMessage, els.previewBackMessage].forEach(el => {
    el?.addEventListener('input', () => renderPreviewCard());
  });

  bindHmsInputs();
  bindToggles();

  f.startAt.addEventListener('change', syncExpiry);
  f.expiresAt.addEventListener('change', syncExpiry);
  f.unlockRadius.addEventListener('input', () => state.mapPicker?.updateRadius());
  qs('#use-current-location').addEventListener('click', useCurrentLocation);
  els.form.addEventListener('submit', handleSubmit);
  els.copyLink.addEventListener('click', copyLink);
  if (els.navPrev) els.navPrev.addEventListener('click', prevPage);
  if (els.navNext) els.navNext.addEventListener('click', nextPage);
}

/* ── Init ── */
async function init() {
  applyPageLanguage();
  preventPagePinchZoom();
  renderTemplates();
  setDefaultDates();
  bindEvents();
  applyTemplate(state.templateId);
  renderVideoPreview();
  renderPreviewCard();
  syncEditorMode();
  syncSideToggle();
  updatePage();
  if (window.CanvasEditor) window.CanvasEditor.init();
  await setRuntimeStatus();
  await initMap();
}

init();
