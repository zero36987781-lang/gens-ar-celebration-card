import { TEMPLATES, getTemplateById } from '../core/templates.js';
import { createRecipientPreviewUrl, createRecipientUrl, generateSlug, getCurrentPosition, qs, qsa, readHms, writeHms, bindHmsAutoAdvance, parseYouTubeId, setStatus, safeUrl, formatLocalDateInput, clamp } from '../core/utils.js';
import { saveGift } from '../core/data-service.js';
import { getSupabaseConfig } from '../core/auth.js';
import { MapPicker } from '../core/maps.js';
import { applyPageLanguage } from '../core/i18n.js';
import { PageManager } from '../core/page-manager.js';
import { CardEditor } from '../core/card-editor.js';
import { YouTubePreview } from '../core/youtube-preview.js';

/* ---- State ---- */
const state = {
  templateId: TEMPLATES[0].id,
  lastCreatedSlug: '',
  mapPicker: null,
  frontEditor: null,
  backEditor: null,
  frontExport: null,
  backExport: null,
  ytPreview: null,
  pageManager: null
};

/* ---- Carousel ---- */
function initCarousel() {
  const viewport = qs('#carousel-viewport');
  const track = qs('#carousel-track');
  const dotsContainer = qs('#carousel-dots');
  if (!track || !viewport) return;

  // Build slides: clone first and last for infinite loop
  const slides = TEMPLATES.map((t, i) => buildTemplateSlide(t, i));
  const lastClone = buildTemplateSlide(TEMPLATES[TEMPLATES.length - 1], -1);
  const firstClone = buildTemplateSlide(TEMPLATES[0], TEMPLATES.length);

  track.innerHTML = '';
  track.appendChild(lastClone);
  slides.forEach(s => track.appendChild(s));
  track.appendChild(firstClone);

  let currentIndex = 0;
  const totalReal = TEMPLATES.length;
  const slideWidth = () => {
    const s = track.children[1];
    return s ? s.offsetWidth + parseFloat(getComputedStyle(s).marginLeft) * 2 : viewport.offsetWidth;
  };

  function setTrackPosition(idx, animate = true) {
    const offset = -(idx + 1) * slideWidth();
    track.style.transition = animate ? 'transform 0.35s cubic-bezier(0.25,0.8,0.25,1)' : 'none';
    track.style.transform = `translateX(${offset}px)`;
  }

  function goTo(idx, animate = true) {
    currentIndex = idx;
    setTrackPosition(idx, animate);
    updateDots();
    selectTemplate(TEMPLATES[((idx % totalReal) + totalReal) % totalReal].id);
  }

  track.addEventListener('transitionend', () => {
    if (currentIndex < 0) { goTo(totalReal - 1, false); }
    else if (currentIndex >= totalReal) { goTo(0, false); }
  });

  // Touch/drag
  let startX = 0, isDragging = false, startTranslate = 0;
  viewport.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
    startTranslate = -(currentIndex + 1) * slideWidth();
    track.style.transition = 'none';
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    track.style.transform = `translateX(${startTranslate + dx}px)`;
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) {
      goTo(currentIndex + (dx < 0 ? 1 : -1));
    } else {
      goTo(currentIndex);
    }
  });

  // Dots
  function renderDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    TEMPLATES.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = `carousel-dot${i === 0 ? ' active' : ''}`;
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    });
  }

  function updateDots() {
    if (!dotsContainer) return;
    const realIdx = ((currentIndex % totalReal) + totalReal) % totalReal;
    dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === realIdx));
  }

  renderDots();
  requestAnimationFrame(() => goTo(0, false));

  // Click on slide
  track.addEventListener('click', (e) => {
    const slide = e.target.closest('.carousel-slide');
    if (!slide) return;
    const tplId = slide.dataset.templateId;
    if (tplId) {
      const idx = TEMPLATES.findIndex(t => t.id === tplId);
      if (idx >= 0) goTo(idx);
    }
  });
}

function buildTemplateSlide(template, idx) {
  const div = document.createElement('div');
  div.className = 'carousel-slide';
  div.dataset.templateId = template.id;
  div.innerHTML = `
    <div class="template-item${template.id === state.templateId ? ' active' : ''}">
      <h3>${template.name}</h3>
      <p style="color:var(--muted);font-size:13px;">${template.subtitle}</p>
      <div class="template-swatches">
        <span style="background:${template.frontColor}"></span>
        <span style="background:${template.accentColor}"></span>
      </div>
    </div>
  `;
  return div;
}

function selectTemplate(templateId) {
  state.templateId = templateId;
  const template = getTemplateById(templateId);

  // Update editors if initialized
  if (state.frontEditor) {
    state.frontEditor.state.bg.fill.color = template.frontColor;
    state.frontEditor.gradientStops = [
      { id: 1, pos: 0, color: template.frontColor },
      { id: 2, pos: 100, color: template.accentColor }
    ];
    state.frontEditor.importState({
      titleText: template.title,
      subtitleText: template.subtitle,
      messageText: template.message,
      bgFill: { type: 'solid', color: template.frontColor }
    });
  }
  if (state.backEditor) {
    state.backEditor.importState({
      titleText: 'Back side',
      messageText: template.backText,
      bgFill: { type: 'solid', color: '#0b1224' }
    });
  }

  // Highlight active template in carousel
  qsa('.template-item').forEach(el => {
    el.classList.toggle('active', el.closest('[data-template-id]')?.dataset.templateId === templateId);
  });
}

/* ---- HMS fields ---- */
function initHmsFields() {
  bindHmsAutoAdvance(qs('#vs-h'), qs('#vs-m'), qs('#vs-s'));
  bindHmsAutoAdvance(qs('#ve-h'), qs('#ve-m'), qs('#ve-s'));
}

function getVideoStart() { return readHms(qs('#vs-h'), qs('#vs-m'), qs('#vs-s')); }
function getVideoEnd() { return readHms(qs('#ve-h'), qs('#ve-m'), qs('#ve-s')); }

/* ---- YouTube Preview ---- */
function initYouTubePreview() {
  state.ytPreview = new YouTubePreview({
    urlInput: qs('#video-url'),
    startHms: getVideoStart,
    endHms: getVideoEnd,
    thumbContainer: qs('#yt-thumb-container'),
    thumbnailImg: qs('#yt-thumbnail'),
    playerWrap: qs('#yt-player-wrap'),
    playBtn: qs('#yt-play-btn'),
    statusEl: qs('#video-preview-status')
  });
}

/* ---- Map ---- */
async function initMap() {
  try {
    state.mapPicker = new MapPicker({
      mapEl: qs('#sender-map'),
      latInput: qs('#latitude'),
      lngInput: qs('#longitude'),
      radiusInput: qs('#unlock-radius'),
      searchInput: qs('#map-search'),
      searchButton: qs('#map-search-btn'),
      statusEl: qs('#map-status')
    });
    await state.mapPicker.init();
  } catch (error) {
    setStatus(qs('#map-status'), error.message || 'Map failed to load.', 'warn');
  }
}

/* ---- Date window ---- */
function setDefaultDateWindow() {
  const now = new Date(); now.setSeconds(0, 0);
  const end = new Date(now.getTime() + (24 * 60 * 60 * 1000));
  qs('#start-at').value = formatLocalDateInput(now);
  qs('#expires-at').value = formatLocalDateInput(end);
}

function syncExpiryBounds() {
  const startAt = qs('#start-at');
  const expiresAt = qs('#expires-at');
  if (!startAt?.value) return;
  const start = new Date(startAt.value);
  const max = new Date(start.getTime() + (24 * 60 * 60 * 1000));
  expiresAt.min = formatLocalDateInput(start);
  expiresAt.max = formatLocalDateInput(max);
  if (!expiresAt.value) { expiresAt.value = expiresAt.max; return; }
  const current = new Date(expiresAt.value);
  if (current < start) expiresAt.value = expiresAt.min;
  else if (current > max) expiresAt.value = expiresAt.max;
}

/* ---- Form data + save ---- */
function getFormData() {
  const frontState = state.frontEditor?.getExportState();
  const backState = state.backEditor?.getExportState();
  const template = getTemplateById(state.templateId);

  return {
    slug: state.lastCreatedSlug || generateSlug('gift'),
    templateId: state.templateId,
    templateName: frontState?.titleText || template.title,
    recipientName: qs('#recipient-name')?.value?.trim() || '',
    senderName: qs('#sender-name')?.value?.trim() || '',
    message: frontState?.messageText || template.message,
    frontSubtitle: frontState?.subtitleText || template.subtitle,
    frontText: frontState?.messageText || template.message,
    backText: backState?.messageText || template.backText,
    frontColor: frontState?.bgFill?.color || template.frontColor,
    accentColor: template.accentColor,
    photoData: frontState?.imageData || '',
    backPhotoData: backState?.imageData || '',
    frontStyle: frontState || null,
    backStyle: backState || null,
    videoUrl: safeUrl(qs('#video-url')?.value?.trim() || ''),
    videoStart: getVideoStart(),
    videoEnd: getVideoEnd(),
    ctaLink: qs('#cta-link')?.value?.trim() || '',
    latitude: Number(qs('#latitude')?.value),
    longitude: Number(qs('#longitude')?.value),
    unlockRadiusM: Number(qs('#unlock-radius')?.value || 50),
    startAt: qs('#start-at')?.value ? new Date(qs('#start-at').value).toISOString() : new Date().toISOString(),
    expiresAt: qs('#expires-at')?.value ? new Date(qs('#expires-at').value).toISOString() : new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
    spawnHeight: Number(qs('#spawn-height')?.value || 3),
    forwardDistance: Number(qs('#forward-distance')?.value || 2),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function validate(data) {
  if (!data.recipientName) return 'Receiver name is required.';
  if (!data.senderName) return 'Sender name is required.';
  if (!data.message.trim()) return 'Front message is required.';
  if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return 'Latitude and longitude are required.';
  if (!Number.isFinite(data.spawnHeight) || data.spawnHeight < 0.5 || data.spawnHeight > 5.5) return 'Card height must be 0.5–5.5m.';
  if (!Number.isFinite(data.forwardDistance) || data.forwardDistance < 0.5 || data.forwardDistance > 5.5) return 'Forward distance must be 0.5–5.5m.';
  if (data.videoUrl && !parseYouTubeId(data.videoUrl)) return 'Only YouTube URLs are accepted.';
  if (data.videoEnd <= data.videoStart) return 'Video end must be after start.';
  return '';
}

async function handleCreateLink() {
  const data = getFormData();
  const error = validate(data);
  const statusBox = qs('#status-box');
  if (error) { setStatus(statusBox, error, 'error'); return; }

  try {
    const saved = await saveGift(data);
    state.lastCreatedSlug = saved.slug;
    const shareUrl = createRecipientUrl(saved.slug);
    const previewUrl = createRecipientPreviewUrl(saved.slug);
    qs('#share-link').value = shareUrl;
    qs('#open-link').href = shareUrl;
    qs('#preview-link').href = previewUrl;
    qs('#open-link').classList.remove('disabled-link');
    qs('#preview-link').classList.remove('disabled-link');
    setStatus(statusBox, `Saved. Expires ${new Date(saved.expiresAt).toLocaleString()}.`, 'success');
  } catch (e) {
    setStatus(statusBox, e.message || 'Failed to save.', 'error');
  }
}

/* ---- Page manager ---- */
let mapInitialized = false;

function initPageManager() {
  state.pageManager = new PageManager({
    containerSelector: '.sender-shell',
    pageSelector: '.sender-shell > .page-view',
    dotContainerSelector: '#nav-dots',
    prevBtnSelector: '#nav-prev',
    nextBtnSelector: '#nav-next',
    onBeforeEnter: async (nextIndex, currentIndex) => {
      // Lazy init map only when entering page 4
      if (nextIndex === 4 && !mapInitialized) {
        mapInitialized = true;
        // Wait a frame so the page is in DOM
        await new Promise(r => requestAnimationFrame(r));
        await initMap();
      }
    },
    onAfterEnter: (index) => {
      // Sync receiver/sender name to editor previews
      const rName = qs('#recipient-name')?.value?.trim() || 'Receiver';
      const sName = qs('#sender-name')?.value?.trim() || 'Sender';
      const fpReceiver = qs('#fp-receiver');
      const fpSender = qs('#fp-sender');
      if (fpReceiver) fpReceiver.textContent = rName;
      if (fpSender) fpSender.textContent = `From ${sName}`;
    }
  });
}

/* ---- Card editors ---- */
function initEditors() {
  state.frontEditor = new CardEditor({
    prefix: 'front',
    previewCardSelector: '#front-preview-card',
    onStateChange: (exportState) => { state.frontExport = exportState; }
  });

  state.backEditor = new CardEditor({
    prefix: 'back',
    previewCardSelector: '#back-preview-card',
    onStateChange: (exportState) => { state.backExport = exportState; }
  });
}

/* ---- Bind events ---- */
function bindEvents() {
  qs('#create-link-btn')?.addEventListener('click', handleCreateLink);
  qs('#copy-link')?.addEventListener('click', async () => {
    const link = qs('#share-link')?.value;
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setStatus(qs('#status-box'), 'Link copied.', 'success');
  });
  qs('#start-at')?.addEventListener('change', syncExpiryBounds);
  qs('#expires-at')?.addEventListener('change', syncExpiryBounds);
  qs('#use-current-location')?.addEventListener('click', async () => {
    try {
      const pos = await getCurrentPosition();
      qs('#latitude').value = pos.coords.latitude.toFixed(6);
      qs('#longitude').value = pos.coords.longitude.toFixed(6);
      state.mapPicker?.setPosition(pos.coords.latitude, pos.coords.longitude, true);
    } catch (e) {
      setStatus(qs('#map-status'), e.message || 'Location failed.', 'error');
    }
  });

  // Name syncing
  qs('#recipient-name')?.addEventListener('input', () => {
    const val = qs('#recipient-name').value.trim() || 'Receiver';
    const fpR = qs('#fp-receiver');
    if (fpR) fpR.textContent = val;
  });
  qs('#sender-name')?.addEventListener('input', () => {
    const val = qs('#sender-name').value.trim() || 'Sender';
    const fpS = qs('#fp-sender');
    if (fpS) fpS.textContent = `From ${val}`;
  });
}

/* ---- Init ---- */
async function init() {
  applyPageLanguage();
  initCarousel();
  initEditors();
  initHmsFields();
  initYouTubePreview();
  setDefaultDateWindow();
  initPageManager();
  bindEvents();
  selectTemplate(state.templateId);

  const { url, anonKey } = await getSupabaseConfig();
  if (!url || !anonKey) {
    setStatus(qs('#status-box'), 'Running in local/demo mode.', 'muted');
  }
}

init();
