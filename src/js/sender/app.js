import { TEMPLATES, getTemplateById } from '../core/templates.js';
import { loadAllTemplates } from '../core/template-loader.js';

let CARD_SAMPLES = [];
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

/* ── Utility functions ── */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

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
  requestAnimationFrame(() => requestAnimationFrame(() => meScale()));
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
const PAGE_TITLES = {
  1: 'Template',
  2: 'Design Studio',
  3: 'Media Management',
  4: 'Delivery Rules',
  5: 'Map Placement',
  6: 'Share',
};

function updatePage() {
  document.querySelectorAll('.page-view').forEach(el => el.classList.add('page-hidden'));
  document.querySelectorAll(`.page-view[data-step="${state.page}"]`).forEach(el => el.classList.remove('page-hidden'));

  const titleEl = qs('#topbar-page-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[state.page] || '';

  const shell = qs('.sender-shell');
  if (shell) {
    shell.style.overflowY = 'auto'; // Always allow scroll to secure workspace
    shell.classList.toggle('studio-active', state.page === 2);
  }

  if (els.bottomNav) els.bottomNav.style.display = '';

  els.navDots.forEach((d, i) => d.classList.toggle('active', i === state.page - 1));
  if (els.navPrev) els.navPrev.disabled = state.page <= 1;
  if (els.navNext) {
    els.navNext.textContent = state.page === MAX_PAGES ? 'Finish' : 'Next ▶';
    els.navNext.disabled = state.page === MAX_PAGES;
  }

  if (state.page === 2) {
    if (shell) shell.scrollTo({ top: 0 });
    setTimeout(() => {
      const frame = qs('#editor-frame');
      if (frame?.contentWindow) {
        frame.contentWindow.postMessage({ type: 'loadTemplate', id: state.templateId }, '*');
      }
    }, 50);
  }
}

function saveMiniState() {
  if (miniState.els.length > 0) {
    sessionStorage.setItem('chariel:tpl-data', JSON.stringify({ id: miniState.id, els: miniState.els, bg: miniState.bg }));
  } else {
    sessionStorage.removeItem('chariel:tpl-data');
  }
}
function goPage(n) {
  if (n < 1 || n > MAX_PAGES || n === state.page) return;
  if (state.page === 1) saveMiniState();
  state.page = n;
  updatePage();
  if (n !== 2) qs('.sender-shell')?.scrollTo({ top: 0, behavior: 'smooth' });
}
function nextPage() { goPage(state.page + 1); }
function prevPage() { goPage(state.page - 1); }

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
    ctaLink: qs('#cta-link'),
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

function secToHms(t) {
  const s = Math.max(0, Math.floor(Number(t) || 0));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => String(v).padStart(2, '0')).join(':');
}

/* ═══════════════════════════════════════════════════
   Media Manager — Upload, Timeline Edit, R2 Export
   ═══════════════════════════════════════════════════ */

const mediaState = {
  ownerToken: '',
  mediaId: '',
  r2Key: '',
  duration: 0,
  inSec: 0,
  outSec: 0,
  uploaded: false,
  objectUrl: '',
  activeXhr: null
};

function getOrCreateOwnerToken() {
  const KEY = 'gens-owner-id';
  let token = localStorage.getItem(KEY);
  if (!token) { token = generateSlug('u'); localStorage.setItem(KEY, token); }
  return token;
}

async function validateFile(file) {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  if (file.size > 130 * 1024 * 1024) {
    return {
      ok: false,
      error: `파일이 너무 큽니다 (${sizeMB}MB).`,
      tip: '130MB 이하로 압축해 주세요. HandBrake(무료)에서 Preset → Web → Gmail Large로 내보내거나, iMovie/Premiere에서 720p H.264로 내보내면 크기를 크게 줄일 수 있습니다.'
    };
  }
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    let settled = false;
    const done = r => { if (settled) return; settled = true; URL.revokeObjectURL(url); resolve(r); };
    v.onloadedmetadata = () => {
      const w = v.videoWidth, h = v.videoHeight;
      const dur = v.duration;
      if (!isFinite(dur) || dur <= 0) {
        done({ ok: false, error: '영상 길이를 읽을 수 없습니다.', tip: 'H.264 코덱 MP4 파일인지 확인해 주세요.' });
        return;
      }
      if (dur > 300) {
        const m = Math.floor(dur / 60), s = Math.round(dur % 60);
        done({ ok: false, error: `영상이 너무 깁니다 (${m}분 ${s}초).`, tip: '5분(300초) 이하로 편집한 뒤 다시 업로드해 주세요.' });
        return;
      }
      if (w > 0 && h > 0 && w * h > 1280 * 720) {
        done({ ok: false, error: `해상도가 너무 높습니다 (${w}×${h}).`, tip: '720p(1280×720) 이하로 내보내 주세요. H.264 + 720p 설정 시 파일 크기도 함께 줄어듭니다.' });
        return;
      }
      done({ ok: true, duration: dur });
    };
    v.onerror = () => done({
      ok: false,
      error: '영상 파일을 재생할 수 없습니다.',
      tip: 'H.264(AVC) 코덱 + AAC 오디오 MP4 파일만 지원합니다. HandBrake에서 H.264로 변환하거나, iPhone·Android에서 직접 촬영한 영상을 그대로 사용해 보세요.'
    });
    setTimeout(() => done({ ok: false, error: '파일 읽기 시간이 초과됐습니다.', tip: '파일이 손상됐거나 형식이 맞지 않을 수 있습니다. 다른 파일로 시도해 주세요.' }), 12000);
    v.src = url;
  });
}

function uploadMediaFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const ownerToken = mediaState.ownerToken;
    const mediaId = `media-${ownerToken}-${Date.now()}`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mediaId', mediaId);
    fd.append('ownerToken', ownerToken);

    const xhr = new XMLHttpRequest();
    mediaState.activeXhr = xhr;
    xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) onProgress(e.loaded / e.total); });
    xhr.addEventListener('load', () => {
      mediaState.activeXhr = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error('Invalid server response')); }
      } else { reject(new Error(`Upload failed: ${xhr.status}`)); }
    });
    xhr.addEventListener('error',  () => { mediaState.activeXhr = null; reject(new Error('Network error')); });
    xhr.addEventListener('abort',  () => { mediaState.activeXhr = null; reject(new Error('Upload cancelled')); });
    xhr.open('POST', '/api/media/upload');
    xhr.send(fd);
  });
}

/* ── ScrubInput: 터치 + 테두리 하이라이트 + 드래그 스크럽 ── */
class ScrubInput {
  constructor(el, { min = 0, max = 300, step = 1, onChange } = {}) {
    this.el = el; this.min = min; this.max = max; this.step = step; this.onChange = onChange;
    this.value = min; this._dragging = false; this._startX = 0; this._startVal = 0;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown',   this._onDown.bind(this));
    el.addEventListener('pointermove',   this._onMove.bind(this));
    el.addEventListener('pointerup',     this._onUp.bind(this));
    el.addEventListener('pointercancel', this._onUp.bind(this));
    el.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
  }
  setValue(v) {
    this.value = Math.max(this.min, Math.min(this.max, Math.round(v)));
    this._updateDOM();
  }
  _updateDOM() {
    const s = Math.round(this.value);
    const m = Math.floor(s / 60);
    this.el.textContent = m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
  }
  _onDown(e) {
    e.preventDefault();
    this._dragging = true; this._startX = e.clientX; this._startVal = this.value;
    this.el.setPointerCapture(e.pointerId);
    this.el.classList.add('media-scrub__val--active');
  }
  _onMove(e) {
    if (!this._dragging) return;
    const newVal = Math.max(this.min, Math.min(this.max, Math.round(this._startVal + (e.clientX - this._startX) * this.step)));
    this.value = newVal;
    this._updateDOM();
    this.onChange?.(newVal);
  }
  _onUp(e) {
    if (!this._dragging) return;
    this._dragging = false;
    this.el.releasePointerCapture(e.pointerId);
    this.el.classList.remove('media-scrub__val--active');
  }
  _onWheel(e) {
    e.preventDefault();
    const newVal = Math.max(this.min, Math.min(this.max, this.value + (e.deltaY > 0 ? -this.step : this.step)));
    this.value = newVal; this._updateDOM(); this.onChange?.(newVal);
  }
}

let scrubIn = null, scrubOut = null;

function syncTimeline() {
  const track = qs('#media-tl-track');
  if (!track || !mediaState.duration) return;
  const W = track.offsetWidth;
  const dur = mediaState.duration;
  const inX  = (mediaState.inSec  / dur) * W;
  const outX = (mediaState.outSec / dur) * W;
  const handleIn  = qs('#media-tl-handle-in');
  const handleOut = qs('#media-tl-handle-out');
  const range     = qs('#media-tl-range');
  if (handleIn)  handleIn.style.left  = inX  + 'px';
  if (handleOut) handleOut.style.left = outX + 'px';
  if (range) { range.style.left = inX + 'px'; range.style.width = (outX - inX) + 'px'; }
  if (scrubIn)  scrubIn.setValue(mediaState.inSec);
  if (scrubOut) scrubOut.setValue(mediaState.outSec);
  const clipLen = qs('#media-clip-len');
  if (clipLen) {
    const len = Math.round(mediaState.outSec - mediaState.inSec);
    clipLen.textContent = `Clip: ${len}s / 60s max`;
    clipLen.classList.toggle('media-scrub__clip-len--warn', len > 60);
  }
}

function buildTimelineRuler(duration) {
  const ruler = qs('#media-tl-ruler');
  if (!ruler) return;
  const step = duration <= 60 ? 5 : duration <= 120 ? 10 : duration <= 300 ? 30 : 60;
  let html = '';
  for (let t = 0; t <= duration; t += step) {
    const pct = (t / duration * 100).toFixed(2);
    const lbl = t >= 60 ? `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}` : `${t}s`;
    html += `<span class="media-tl__tick" style="left:${pct}%">${lbl}</span>`;
  }
  ruler.innerHTML = html;
}

async function drawThumbnailStrip(videoEl, canvasEl, duration) {
  const W = canvasEl.offsetWidth || canvasEl.parentElement?.offsetWidth || 300;
  const H = 52;
  canvasEl.width = W; canvasEl.height = H;
  const ctx = canvasEl.getContext('2d');
  const FRAMES = Math.max(4, Math.min(20, Math.floor(W / 12)));
  const fw = W / FRAMES;
  for (let i = 0; i < FRAMES; i++) {
    videoEl.currentTime = (i / (FRAMES - 1)) * duration;
    await Promise.race([
      new Promise(r => videoEl.addEventListener('seeked', r, { once: true })),
      new Promise(r => setTimeout(r, 400))
    ]);
    try { ctx.drawImage(videoEl, fw * i, 0, fw, H); } catch { /* frame unavailable */ }
  }
}

function bindTimelineHandles(trackWrap, duration) {
  const handleIn  = qs('#media-tl-handle-in');
  const handleOut = qs('#media-tl-handle-out');
  const video     = qs('#media-preview');

  function makeHandleDrag(handle, field) {
    let startX, startVal;
    const onMove = e => {
      const W = trackWrap.offsetWidth;
      let newVal = Math.round(startVal + ((e.clientX - startX) / W) * duration);
      if (field === 'in') {
        newVal = Math.max(0, Math.min(mediaState.outSec - 1, newVal));
        mediaState.inSec = newVal;
      } else {
        newVal = Math.max(mediaState.inSec + 1, Math.min(Math.floor(duration), newVal));
        mediaState.outSec = newVal;
      }
      syncTimeline();
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup',   onUp);
      handle.removeEventListener('pointercancel', onUp);
    };
    handle.addEventListener('pointerdown', e => {
      e.stopPropagation();
      handle.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startVal = field === 'in' ? mediaState.inSec : mediaState.outSec;
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup',   onUp, { once: true });
      handle.addEventListener('pointercancel', onUp, { once: true });
    });
  }

  makeHandleDrag(handleIn,  'in');
  makeHandleDrag(handleOut, 'out');

  trackWrap.addEventListener('pointerdown', e => {
    if (e.target === handleIn || e.target === handleOut) return;
    const rect = trackWrap.getBoundingClientRect();
    if (video) video.currentTime = Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration));
  });

  if (video) {
    video.addEventListener('timeupdate', () => {
      const playhead = qs('#media-tl-playhead');
      if (!playhead || !mediaState.duration) return;
      playhead.style.left = (video.currentTime / mediaState.duration * trackWrap.offsetWidth) + 'px';
    });
  }
}

async function activateEditor(blobUrl, duration) {
  if (mediaState.objectUrl && mediaState.objectUrl !== blobUrl) URL.revokeObjectURL(mediaState.objectUrl);
  mediaState.objectUrl = blobUrl;
  mediaState.duration  = duration;
  mediaState.inSec     = 0;
  mediaState.outSec    = Math.min(Math.floor(duration), 60);

  const video  = qs('#media-preview');
  const canvas = qs('#media-tl-canvas');
  const track  = qs('#media-tl-track');

  if (video) { video.src = blobUrl; video.load(); }
  if (canvas && track) await drawThumbnailStrip(video, canvas, duration);
  buildTimelineRuler(duration);

  scrubIn = new ScrubInput(qs('#media-scrub-in'), {
    min: 0, max: Math.floor(duration) - 1, step: 1,
    onChange: v => { mediaState.inSec = v; syncTimeline(); }
  });
  scrubOut = new ScrubInput(qs('#media-scrub-out'), {
    min: 1, max: Math.floor(duration), step: 1,
    onChange: v => { mediaState.outSec = v; syncTimeline(); }
  });
  scrubIn.setValue(0);
  scrubOut.setValue(mediaState.outSec);

  if (track) {
    bindTimelineHandles(track, duration);
    if (window.ResizeObserver) new ResizeObserver(() => syncTimeline()).observe(track);
  }

  syncTimeline();
  const editor = qs('#media-editor');
  if (editor) editor.hidden = false;
}

function showMediaStatus(msg, tone) {
  const el = qs('#media-editor-status');
  if (!el) return;
  el.textContent = msg;
  el.className = `media-editor__status media-editor__status--${tone}`;
  el.hidden = false;
  clearTimeout(el._hide);
  el._hide = setTimeout(() => { el.hidden = true; }, 4000);
}

function showValidationError(result) {
  const el = qs('#media-validation-msg');
  if (!el) return;
  el.innerHTML = `<strong>${result.error}</strong>${result.tip ? `<span class="media-val__tip">💡 ${result.tip}</span>` : ''}`;
  el.hidden = false;
}

function clearValidationError() {
  const el = qs('#media-validation-msg');
  if (el) { el.hidden = true; el.innerHTML = ''; }
}

async function onMediaExportClip() {
  const btn = qs('#media-export-btn');
  if (!mediaState.objectUrl || !mediaState.duration) return;
  const clipDuration = mediaState.outSec - mediaState.inSec;
  if (clipDuration <= 0 || clipDuration > 60) { showMediaStatus('Clip must be 1–60 seconds.', 'error'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Loading FFmpeg…'; }
  try {
    const { FFmpeg }    = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/index.js');
    const { toBlobURL } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
    if (btn) btn.textContent = 'Processing…';
    const ffmpeg  = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`,   'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    });
    const inFile  = 'input.mp4';
    const outFile = 'clip.mp4';
    const buf = await fetch(mediaState.objectUrl).then(r => r.arrayBuffer());
    await ffmpeg.writeFile(inFile, new Uint8Array(buf));
    await ffmpeg.exec(['-i', inFile, '-ss', String(mediaState.inSec), '-t', String(clipDuration), '-c', 'copy', outFile]);
    const data = await ffmpeg.readFile(outFile);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    if (btn) btn.textContent = 'Uploading clip…';
    const clipId = `${mediaState.mediaId}-clip`;
    const fd = new FormData();
    fd.append('file', blob, `${clipId}.mp4`);
    fd.append('mediaId', clipId);
    fd.append('ownerToken', mediaState.ownerToken);
    const res    = await fetch('/api/media/upload', { method: 'POST', body: fd });
    const result = await res.json();
    mediaState.r2Key = result.key; mediaState.mediaId = clipId;
    showMediaStatus('Clip exported and saved!', 'success');
  } catch (err) {
    showMediaStatus('Export failed: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Export Clip'; }
  }
}

function bindMediaDrop() {
  const zone     = qs('#media-drop-zone');
  const input    = qs('#media-file-input');
  const progress = qs('#media-upload-progress');
  const bar      = qs('#media-upload-bar');
  const label    = qs('#media-upload-label');
  const cancel   = qs('#media-upload-cancel');
  const editor   = qs('#media-editor');
  const savBtn   = qs('#media-save-btn');
  const expBtn   = qs('#media-export-btn');
  const rstBtn   = qs('#media-reset-btn');

  if (!zone || !input) return;

  mediaState.ownerToken = getOrCreateOwnerToken();

  zone.addEventListener('click',   () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('media-drop__zone--drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('media-drop__zone--drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('media-drop__zone--drag-over');
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  });

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) processFile(file);
    input.value = '';
  });

  cancel?.addEventListener('click', () => {
    mediaState.activeXhr?.abort();
    if (progress) progress.hidden = true;
    zone.classList.remove('media-drop__zone--has-file');
  });

  savBtn?.addEventListener('click', () => {
    if (!mediaState.uploaded) { showMediaStatus('Upload a video first.', 'error'); return; }
    if (mediaState.outSec - mediaState.inSec > 60) { showMediaStatus('Clip must be 60s or shorter.', 'error'); return; }
    showMediaStatus(`Saved! IN=${mediaState.inSec}s / OUT=${mediaState.outSec}s`, 'success');
  });

  expBtn?.addEventListener('click', onMediaExportClip);

  rstBtn?.addEventListener('click', () => {
    if (editor) editor.hidden = true;
    zone.classList.remove('media-drop__zone--has-file');
    mediaState.uploaded = false;
    clearValidationError();
    if (mediaState.objectUrl) { URL.revokeObjectURL(mediaState.objectUrl); mediaState.objectUrl = ''; }
  });

  async function processFile(file) {
    clearValidationError();
    zone.classList.add('media-drop__zone--has-file');
    const validation = await validateFile(file);
    if (!validation.ok) {
      showValidationError(validation);
      zone.classList.remove('media-drop__zone--has-file');
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    if (editor)   editor.hidden   = true;
    if (progress) progress.hidden = false;
    if (bar)   bar.style.width      = '0%';
    if (label) label.textContent    = 'Uploading… 0%';
    try {
      const result = await uploadMediaFile(file, pct => {
        const p = Math.round(pct * 100);
        if (bar)   bar.style.width   = p + '%';
        if (label) label.textContent = `Uploading… ${p}%`;
      });
      if (progress) progress.hidden = true;
      mediaState.mediaId  = result.mediaId;
      mediaState.r2Key    = result.key;
      mediaState.uploaded = true;
      await activateEditor(blobUrl, validation.duration);
    } catch (err) {
      if (progress) progress.hidden = true;
      zone.classList.remove('media-drop__zone--has-file');
      if (err.message !== 'Upload cancelled') showMediaStatus('Upload failed: ' + err.message, 'error');
    }
  }
}

/* ── Mini Editor ── */
const MINI_PALETTE = [
  '#FFFFFF','#000000','#FF3B30','#FF9500','#FFCC00',
  '#34C759','#00C7BE','#007AFF','#5856D6','#AF52DE',
  '#FF2D55','#FFD700','#FF6B6B','#4D96FF','#6BCB77'
];

const miniState = { id: null, els: [], bg: null, sel: null, drag: null, resize: null, scale: 1, nextId: 9000 };

function meScale() {
  const wrap = qs('#me-preview-wrap');
  const outer = qs('.me-card-outer');
  if (!wrap || !outer) return;
  const avail = wrap.offsetWidth;
  const factor = Math.min(1, avail / 270);
  outer.style.transform = `scale(${factor})`;
  outer.style.width = '270px';
  outer.style.height = Math.round(338 * factor) + 'px';
  miniState.scale = factor;
}

function meLoad(id) {
  const sample = CARD_SAMPLES.find(s => s.id === id);
  if (!sample?.data) return;
  miniState.id = id;
  miniState.els = JSON.parse(JSON.stringify(sample.data.els));
  miniState.bg = sample.data.bg ? JSON.parse(JSON.stringify(sample.data.bg)) : null;
  miniState.sel = null;
  meRender();
  meUpdCtrl();
}

function meRender() {
  const card = qs('#me-card');
  if (!card) return;
  const bg = qs('#me-bg');
  if (bg) bg.style.backgroundImage = miniState.bg?.src ? `url('${miniState.bg.src}')` : 'none';
  card.querySelectorAll('.me-el').forEach(el => el.remove());
  [...miniState.els].sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(e => {
    const div = document.createElement('div');
    div.className = 'me-el';
    div.dataset.eid = e.id;
    if (e.type === 'img') {
      div.classList.add('me-img');
      if (e.id === miniState.sel) div.classList.add('me-sel');
      div.style.cssText = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;z-index:${e.z||1};`;
      const img = document.createElement('img');
      img.src = e.src; img.draggable = false;
      img.style.cssText = `width:100%;height:100%;object-fit:cover;border-radius:${e.br||0}px;pointer-events:none;`;
      div.appendChild(img);
      const rh = document.createElement('div');
      rh.className = 'me-resize-handle';
      rh.addEventListener('pointerdown', ev => meResizeStart(ev, e.id));
      div.appendChild(rh);
      div.addEventListener('pointerdown', ev => meDragStart(ev, e.id));
      div.addEventListener('click', ev => { ev.stopPropagation(); meSel(e.id); });
    } else if (e.type === 'text') {
      const clr = e.clr && e.clr !== 'transparent' ? e.clr : '#fff';
      div.classList.add('me-txt');
      if (e.id === miniState.sel) div.classList.add('me-sel');
      let extra = '';
      if (e.bg && e.bg !== 'transparent') extra += `background:${e.bg};border-radius:${e.br||0}px;padding:6px 8px;`;
      div.style.cssText = `left:${e.x}px;top:${e.y}px;width:${e.w}px;min-height:20px;z-index:${e.z||2};color:${clr};font-size:${e.size}px;font-family:'${e.font||'Poppins'}',sans-serif;line-height:${e.line||1.3};${extra}`;
      if (e.txtGrad) { div.style.backgroundImage = e.txtGrad; div.style.webkitBackgroundClip = 'text'; div.style.webkitTextFillColor = 'transparent'; }
      div.textContent = e.txt;
      const rh = document.createElement('div');
      rh.className = 'me-resize-handle';
      rh.addEventListener('pointerdown', ev => meResizeStart(ev, e.id));
      div.appendChild(rh);
      div.addEventListener('pointerdown', ev => meDragStart(ev, e.id));
      div.addEventListener('click', ev => {
        ev.stopPropagation();
        if (miniState.wasDragged) { miniState.wasDragged = false; return; }
        if (miniState.sel === e.id) {
          meStartEdit(qs('#me-card').querySelector(`[data-eid="${e.id}"]`), e.id);
        } else {
          meSel(e.id);
        }
      });
    }
    card.appendChild(div);
  });
}

function meSel(id) { miniState.sel = id; meRender(); meUpdCtrl(); }
function meDesel() { miniState.sel = null; meRender(); meUpdCtrl(); }

function meUpdCtrl() {
  const ctrl = qs('#me-controls');
  const delBtn = qs('#me-del-btn');
  const sizeVal = qs('#me-size-val');
  const replaceBtn = qs('#me-img-replace-btn');
  if (!ctrl) return;
  const sel = miniState.els.find(e => e.id === miniState.sel && e.type === 'text');
  const imgSel = miniState.els.find(e => e.id === miniState.sel && e.type === 'img');
  ctrl.classList.toggle('me-controls--hidden', !sel);
  if (delBtn) delBtn.disabled = !miniState.sel;
  if (replaceBtn) replaceBtn.style.display = imgSel ? '' : 'none';
  if (sel && sizeVal) sizeVal.textContent = sel.size;
  const clrRow = qs('#me-clr-row');
  if (clrRow && sel) {
    const cur = (sel.clr && sel.clr !== 'transparent' ? sel.clr : '#FFFFFF').toUpperCase();
    clrRow.querySelectorAll('.me-clr-chip').forEach(c => c.classList.toggle('sel', c.dataset.clr.toUpperCase() === cur));
  }
}

function meDragStart(ev, id) {
  ev.stopPropagation();
  if (ev.currentTarget.contentEditable === 'true') return;
  // 선택 상태만 업데이트 — meRender() 호출 금지 (DOM 재생성 시 currentTarget 무효화됨)
  if (miniState.sel !== id) {
    qs('#me-card').querySelectorAll('.me-sel').forEach(el => el.classList.remove('me-sel'));
    ev.currentTarget.classList.add('me-sel');
    miniState.sel = id;
    meUpdCtrl();
  }
  const el = miniState.els.find(e => e.id === id);
  if (!el) return;
  miniState.drag = { id, sx: ev.clientX, sy: ev.clientY, ex: el.x, ey: el.y, moved: false };
  ev.currentTarget.setPointerCapture(ev.pointerId);
  ev.currentTarget.addEventListener('pointermove', meDragMove);
  ev.currentTarget.addEventListener('pointerup', meDragEnd);
  ev.currentTarget.addEventListener('pointercancel', meDragEnd);
}
function meDragMove(ev) {
  const d = miniState.drag; if (!d) return;
  const s = miniState.scale;
  const el = miniState.els.find(e => e.id === d.id); if (!el) return;
  const nx = Math.max(0, Math.min(270 - el.w, d.ex + (ev.clientX - d.sx) / s));
  const ny = Math.max(0, Math.min(338 - (el.h || 20), d.ey + (ev.clientY - d.sy) / s));
  if (Math.abs(nx - el.x) > 1 || Math.abs(ny - el.y) > 1) d.moved = true;
  el.x = nx; el.y = ny;
  const div = qs('#me-card').querySelector(`[data-eid="${d.id}"]`);
  if (div) { div.style.left = nx + 'px'; div.style.top = ny + 'px'; }
}
function meDragEnd(ev) {
  miniState.wasDragged = miniState.drag?.moved || false;
  miniState.drag = null;
  ev.currentTarget.removeEventListener('pointermove', meDragMove);
  ev.currentTarget.removeEventListener('pointerup', meDragEnd);
  ev.currentTarget.removeEventListener('pointercancel', meDragEnd);
}
function meResizeStart(ev, id) {
  ev.stopPropagation();
  const el = miniState.els.find(e => e.id === id); if (!el) return;
  miniState.resize = { id, sx: ev.clientX, sy: ev.clientY, ew: el.w, eh: el.h };
  ev.currentTarget.setPointerCapture(ev.pointerId);
  ev.currentTarget.addEventListener('pointermove', meResizeMove);
  ev.currentTarget.addEventListener('pointerup', meResizeEnd);
  ev.currentTarget.addEventListener('pointercancel', meResizeEnd);
}
function meResizeMove(ev) {
  const d = miniState.resize; if (!d) return;
  const s = miniState.scale;
  const el = miniState.els.find(e => e.id === d.id); if (!el) return;
  el.w = Math.max(40, Math.min(270 - el.x, Math.round(d.ew + (ev.clientX - d.sx) / s)));
  el.h = Math.max(40, Math.min(338 - el.y, Math.round(d.eh + (ev.clientY - d.sy) / s)));
  const div = qs('#me-card').querySelector(`[data-eid="${d.id}"]`);
  if (div) { div.style.width = el.w + 'px'; div.style.height = el.h + 'px'; }
}
function meResizeEnd(ev) {
  miniState.resize = null;
  ev.currentTarget.removeEventListener('pointermove', meResizeMove);
  ev.currentTarget.removeEventListener('pointerup', meResizeEnd);
  ev.currentTarget.removeEventListener('pointercancel', meResizeEnd);
}

function meAdd() {
  const newEl = {
    id: miniState.nextId++, type: 'text',
    x: 20, y: 150, w: 230, h: 40, z: miniState.els.length + 2,
    txt: 'Your Text', size: 18, font: 'Poppins', clr: '#ffffff',
    align: 'left', space: 0, line: 1.3,
    strokeClr: 'transparent', strokeW: 0, txtGrad: null,
    bg: 'transparent', bw: 0, bc: '#000', bs: 'solid', br: 0,
    sh: false, tsh: false, ift: false, bft: false,
    sdirs: ['bottom-right'], sdist: 8, sblur: 8, sclrHex: '#000000', sopa: 30,
    tsdirs: ['bottom-right'], tsdist: 2, tsblur: 4, tsclrHex: '#000000', tsopa: 20,
    ifdirs: ['bottom'], ifamt: 100, ifsoft: 50, ifclr: '#ffffff',
    bfdirs: ['bottom'], bfamt: 40, bfsoft: 50, bfclr: '#ffffff',
    mot: 'none', motDur: 2, motDelay: 0, motCount: 'infinite',
    motEase: 'ease-in-out', motAmp: 12, motScl: 1.5,
    motOMax: 1, motOMin: 0.1, motSlideDir: 'bottom',
    opa: 100, rot: 0
  };
  miniState.els.push(newEl);
  meSel(newEl.id);
}

function meDel() {
  if (!miniState.sel) return;
  miniState.els = miniState.els.filter(e => e.id !== miniState.sel);
  miniState.sel = null;
  meRender(); meUpdCtrl();
}

function meStartEdit(div, id) {
  meSel(id);
  const el = miniState.els.find(e => e.id === id && e.type === 'text');
  if (!el) return;
  const editDiv = qs('#me-card').querySelector(`[data-eid="${id}"]`);
  if (!editDiv || editDiv.contentEditable === 'true') return;
  editDiv.contentEditable = 'true';
  editDiv.style.userSelect = 'text';
  editDiv.style.webkitUserSelect = 'text';
  editDiv.style.cursor = 'text';
  editDiv.style.outline = 'none';
  editDiv.style.boxShadow = 'none';
  editDiv.focus();
  // 전체 선택
  const range = document.createRange();
  range.selectNodeContents(editDiv);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  // 키보드 올라오면 카드가 키보드 위에 보이도록 스크롤
  function scrollAboveKeyboard() {
    const vv = window.visualViewport;
    const shell = qs('#sender-shell');
    if (!shell || !vv) return;
    const wrap = qs('#me-preview-wrap');
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const wrapBottom = wrapRect.bottom;
    const visibleBottom = vv.offsetTop + vv.height;
    if (wrapBottom > visibleBottom - 8) {
      shell.scrollBy({ top: wrapBottom - visibleBottom + 8, behavior: 'smooth' });
    }
  }
  const vvHandler = () => scrollAboveKeyboard();
  if (window.visualViewport) window.visualViewport.addEventListener('resize', vvHandler);
  setTimeout(scrollAboveKeyboard, 300);
  function commitEdit() {
    if (editDiv.contentEditable !== 'true') return;
    el.txt = editDiv.textContent || '';
    editDiv.contentEditable = 'false';
    editDiv.style.userSelect = '';
    editDiv.style.webkitUserSelect = '';
    editDiv.style.cursor = '';
    editDiv.style.outline = '';
    editDiv.style.boxShadow = '';
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', vvHandler);
    editDiv.removeEventListener('blur', commitEdit);
    editDiv.removeEventListener('keydown', onKey);
  }
  function onKey(ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); commitEdit(); }
    if (ev.key === 'Escape') { editDiv.textContent = el.txt; commitEdit(); }
    ev.stopPropagation();
  }
  editDiv.addEventListener('blur', commitEdit);
  editDiv.addEventListener('keydown', onKey);
}

function meSizeChg(delta) {
  const el = miniState.els.find(e => e.id === miniState.sel && e.type === 'text');
  if (!el) return;
  el.size = Math.max(8, Math.min(120, el.size + delta));
  const sv = qs('#me-size-val'); if (sv) sv.textContent = el.size;
  const div = qs('#me-card')?.querySelector(`[data-eid="${el.id}"]`);
  if (div) div.style.fontSize = el.size + 'px';
}

function meClrChg(clr) {
  const el = miniState.els.find(e => e.id === miniState.sel && e.type === 'text');
  if (!el) return;
  el.clr = clr; el.txtGrad = null;
  const div = qs('#me-card')?.querySelector(`[data-eid="${el.id}"]`);
  if (div) { div.style.backgroundImage = ''; div.style.webkitBackgroundClip = ''; div.style.webkitTextFillColor = ''; div.style.color = clr; }
  meUpdCtrl();
}

function meInitControls() {
  const clrRow = qs('#me-clr-row');
  if (clrRow) {
    clrRow.innerHTML = MINI_PALETTE.map(c =>
      `<button class="me-clr-chip${c === '#FFFFFF' ? ' white-chip' : ''}" data-clr="${c}" style="background:${c};" type="button"></button>`
    ).join('');
    clrRow.querySelectorAll('.me-clr-chip').forEach(chip =>
      chip.addEventListener('click', () => meClrChg(chip.dataset.clr))
    );
  }
  function bindSizeBtn(btnId, delta) {
    const btn = qs(btnId); if (!btn) return;
    let holdTimer = null, repeatTimer = null;
    function stopAll() {
      clearTimeout(holdTimer); clearInterval(repeatTimer);
      holdTimer = null; repeatTimer = null;
      document.removeEventListener('pointerup', stopAll);
      document.removeEventListener('pointercancel', stopAll);
    }
    btn.addEventListener('click', () => meSizeChg(delta));
    btn.addEventListener('pointerdown', () => {
      document.addEventListener('pointerup', stopAll);
      document.addEventListener('pointercancel', stopAll);
      holdTimer = setTimeout(() => {
        repeatTimer = setInterval(() => meSizeChg(delta), 80);
      }, 450);
    });
  }
  bindSizeBtn('#me-size-minus', -1);
  bindSizeBtn('#me-size-plus', 1);
  qs('#me-add-btn')?.addEventListener('click', meAdd);
  qs('#me-del-btn')?.addEventListener('click', meDel);
  qs('#me-card')?.addEventListener('click', () => meDesel());
  const imgFile = qs('#me-img-file');
  qs('#me-img-replace-btn')?.addEventListener('click', () => imgFile?.click());
  imgFile?.addEventListener('change', ev => {
    const file = ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = re => {
      const el = miniState.els.find(e => e.id === miniState.sel && e.type === 'img');
      if (!el) return;
      el.src = re.target.result;
      const div = qs('#me-card')?.querySelector(`[data-eid="${el.id}"]`);
      if (div) { const img = div.querySelector('img'); if (img) img.src = el.src; }
    };
    reader.readAsDataURL(file);
    ev.target.value = '';
  });
  window.addEventListener('resize', meScale);
  meScale();
}

/* ── Sample Carousel ── */
const CAT_LABELS = {
  all: 'All',
  affection: 'Affection',
  apology: 'Apology',
  celebration: 'Celebration',
  checkin: 'Check-in',
  comfort: 'Comfort',
  encouragement: 'Encouragement',
  forgiveness: 'Forgiveness',
  gratitude: 'Gratitude',
  longing: 'Longing',
  praise: 'Praise',
  promise: 'Promise'
};

function filterSampleCarousel(cat) {
  const container = qs('#sample-carousel');
  if (!container) return;
  container.querySelectorAll('.sample-card').forEach(btn => {
    btn.style.display = (cat === 'all' || btn.dataset.cat === cat) ? '' : 'none';
  });
  qs('#category-filter')?.querySelectorAll('.cat-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.cat === cat);
  });
}

function renderSampleCarousel() {
  const container = qs('#sample-carousel');
  if (!container) return;

  // Category filter
  const filterEl = qs('#category-filter');
  if (filterEl) {
    const cats = ['all', ...new Set(CARD_SAMPLES.map(s => s.category))];
    filterEl.innerHTML = cats.map(c => `
      <button class="cat-chip${c === 'all' ? ' active' : ''}" data-cat="${c}" type="button">${CAT_LABELS[c] || c}</button>`
    ).join('');
    filterEl.querySelectorAll('.cat-chip').forEach(chip => {
      chip.addEventListener('click', () => filterSampleCarousel(chip.dataset.cat));
    });
  }

  container.innerHTML = CARD_SAMPLES.map((s, i) => {
    const allEls = (s.data?.els || [])
      .sort((a, b) => (a.z || 0) - (b.z || 0))
      .map(e => {
        const lp = v => (v / 270 * 100).toFixed(3) + '%';
        const tp = v => (v / 338 * 100).toFixed(3) + '%';
        if (e.type === 'img') {
          const rot = e.rot ? `transform:rotate(${e.rot}deg);` : '';
          const opa = (e.opa ?? 100) < 100 ? `opacity:${e.opa/100};` : '';
          return `<img class="sample-card__el" src="${e.src}" draggable="false" style="left:${lp(e.x)};top:${tp(e.y)};width:${lp(e.w)};height:${tp(e.h)};z-index:${e.z||1};border-radius:${e.br||0}px;object-fit:cover;${rot}${opa}" />`;
        } else if (e.type === 'text') {
          const clr = e.clr && e.clr !== 'transparent' ? e.clr : '#fff';
          const fsz = (e.size / 270 * 100).toFixed(3) + 'cqw';
          const opa = (e.opa ?? 100) < 100 ? `opacity:${e.opa/100};` : '';
          let st = `left:${lp(e.x)};top:${tp(e.y)};width:${lp(e.w)};z-index:${e.z||2};color:${clr};font-size:${fsz};font-family:'${e.font||'sans-serif'}',sans-serif;line-height:${e.line||1.3};text-align:${e.align||'left'};${opa}`;
          if (e.bg && e.bg !== 'transparent') st += `background:${e.bg};border-radius:${e.br||0}px;padding:2.2% 3%;`;
          let grad = '';
          if (e.txtGrad) grad = ` background-image:${e.txtGrad};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
          return `<div class="sample-card__el" style="${st}${grad}">${e.txt.replace(/\n/g, '<br>')}</div>`;
        }
        return '';
      }).join('');
    return `
    <button class="sample-card${i === 0 ? ' active' : ''}" data-id="${s.id}" data-cat="${s.category}" type="button">
      <div class="sample-card__bg" style="background-image:url('${s.bg}')"></div>
      ${allEls}
      <div class="sample-card__overlay"></div>
    </button>`;
  }).join('');
  container.querySelectorAll('.sample-card').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.sample-card').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.templateId = btn.dataset.id;
      meLoad(btn.dataset.id);
    });
  });

  // 캐루셀 스크롤 시 보이는 카드로 미니 에디터 동기화
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        const btn = entry.target;
        container.querySelectorAll('.sample-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.templateId = btn.dataset.id;
        meLoad(btn.dataset.id);
      }
    });
  }, { root: container, threshold: 0.5 });
  container.querySelectorAll('.sample-card').forEach(btn => io.observe(btn));

  // 첫 번째 샘플 미니 에디터에 자동 로드
  if (CARD_SAMPLES.length > 0) meLoad(CARD_SAMPLES[0].id);
}

function setTemplateActiveClass(id) {
  els.templateList?.querySelectorAll('[data-template-id]').forEach(el => {
    el.classList.toggle('active', el.dataset.templateId === id);
  });
}

function applyTemplate(id) {
  state.templateId = id;
  const tpl = getTemplateById(id);
  setTemplateActiveClass(id);
  if(els.previewTitle) els.previewTitle.textContent = tpl.title;
  if(els.previewSubtitle) els.previewSubtitle.textContent = tpl.subtitle;
  if(els.previewMessage) els.previewMessage.textContent = tpl.message;
  if(els.previewBackMessage) els.previewBackMessage.textContent = tpl.backText;
  if (window.CanvasEditor) {
    window.CanvasEditor.setCurrentTemplate(id);
    window.CanvasEditor.applyTemplateToLayers(tpl);
  }
  renderPreviewCard();
}


function sanitize(el) { return (el?.innerText || '').replace(/\u00a0/g, ' ').replace(/\r/g, '').trim(); }

function renderPreviewCard() {
  const f = fields(), tpl = getTemplateById(state.templateId);
  [els.previewCardDefault, els.previewCard].forEach(c => {
    if (c) { 
      c.style.setProperty('--card-front', tpl.frontColor); 
      c.style.setProperty('--card-accent', tpl.accentColor);
      // Add shadow based on card color for depth and elegance
      const rgb = hexToRgb(tpl.frontColor);
      if (rgb) {
        const shadowColor = `rgba(${rgb.r * 0.5}, ${rgb.g * 0.5}, ${rgb.b * 0.5}, 0.25)`;
        c.style.boxShadow = `0 8px 32px ${shadowColor}, 0 4px 16px rgba(0,0,0,0.1)`;
      }
    }
  });
  if(els.previewReceiver) els.previewReceiver.textContent = f.recipientName.value.trim() || 'Receiver';
  if(els.previewSender) els.previewSender.textContent = `From ${f.senderName.value.trim() || 'Sender'}`;
  if (window.CanvasEditor) window.CanvasEditor.updateSenderReceiver(f.senderName.value.trim());
  const hasVid = mediaState.uploaded;
  els.videoBadgeDefault?.classList.toggle('hidden', !hasVid);
  els.videoBadge?.classList.toggle('hidden', !hasVid);
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
    mediaR2Key: mediaState.r2Key,
    mediaStart: mediaState.inSec,
    mediaEnd: mediaState.outSec,
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
  if (mediaState.uploaded && data.mediaEnd - data.mediaStart > 60) return 'Clip must be 60s or shorter.';
  const f = fields();
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

/* ── Events ── */
function bindEvents() {
  const f = fields();
  f.recipientName.addEventListener('input', renderPreviewCard);
  f.senderName.addEventListener('input', renderPreviewCard);
  [els.previewTitle, els.previewSubtitle, els.previewMessage, els.previewBackMessage].forEach(el => el?.addEventListener('input', renderPreviewCard));
  bindToggles();
  bindPanels();
  bindMediaDrop();
  f.startAt.addEventListener('change', syncExpiry);
  f.expiresAt.addEventListener('change', syncExpiry);
  f.unlockRadius.addEventListener('input', () => state.mapPicker?.updateRadius());
  qs('#use-current-location')?.addEventListener('click', useCurrentLocation);
  els.form?.addEventListener('submit', handleSubmit);
  els.copyLink?.addEventListener('click', copyLink);
  els.navPrev?.addEventListener('click', prevPage);
  els.navNext?.addEventListener('click', nextPage);
  els.navDots.forEach((d, i) => d.addEventListener('click', () => goPage(i + 1)));

  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'navigate') {
      if (e.data.dir === 'prev') prevPage();
      else if (e.data.dir === 'next') nextPage();
    }
    if (e.data.type === 'editorSaved') {
      state.editorData = e.data.data;
    }
  });
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

  CARD_SAMPLES = await loadAllTemplates();
  renderSampleCarousel();
  meInitControls();
  setDefaultDates();
  bindEvents();
  bindStudioResizer();
  applyTemplate(state.templateId);
  renderPreviewCard();
  syncEditorMode();
  syncSideToggle();
  await setRuntimeStatus();
  await initMap();
}

init();
