import { getGiftBySlug } from '../core/data-service.js';
import { formatDistance, getCurrentPosition, haversineMeters, isExpired, isPreviewModeFromLocation, parseSlugFromLocation, qs, setStatus } from '../core/utils.js';
import { WebXREngine } from '../ar/webxr-engine.js';
import { applyPageLanguage } from '../core/i18n.js';

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

const previewMode = isPreviewModeFromLocation();

const els = {
  previewBanner: qs('#preview-banner'),
  introTitle: qs('#intro-title'),
  introSubtitle: qs('#intro-subtitle'),
  senderLine: qs('#sender-line'),
  messageLine: qs('#message-line'),
  begin: qs('#begin-recipient'),
  envPanel: qs('#env-panel'),
  envGpsStatus: qs('#env-gps-status'),
  envMotionStatus: qs('#env-motion-status'),
  envCameraStatus: qs('#env-camera-status'),
  envWarning: qs('#env-warning'),
  btnEnvCheck: qs('#btn-env-check'),
  btnEnvContinue: qs('#btn-env-continue'),
  distancePanel: qs('#distance-panel'),
  distanceState: qs('#distance-state'),
  distanceCopy: qs('#distance-copy'),
  refreshDistance: qs('#refresh-distance'),
  launchAr: qs('#launch-ar'),
  arPanel: qs('#ar-panel'),
  arStage: qs('#ar-stage'),
  xrOverlay: qs('#xr-overlay'),
  gestureHint: qs('#gesture-hint'),
  arStatus: qs('#ar-status'),
  replaySequence: qs('#replay-sequence'),
  thanksPanel: qs('#thanks-panel'),
  thanksTemplates: qs('#thanks-templates'),
  thanksMessage: qs('#thanks-message'),
  thanksStatus: qs('#thanks-status'),
  copyThanks: qs('#copy-thanks'),
  shareThanks: qs('#share-thanks'),
  expiredPanel: qs('#expired-panel'),
  expiredCopy: qs('#expired-copy'),
  ctaButton: qs('#cta-button'),
  giftVideo: qs('#gift-video'),
  toggleCameraAr: qs('#toggle-camera-ar'),
  cameraFeed: qs('#camera-feed'),
  showVideoBtn: qs('#show-video-btn'),
  stopPageOverlay: qs('#stop-page-overlay'),
  stopPageMsg: qs('#stop-page-msg'),
  stopPageYes: qs('#stop-page-yes'),
  stopPageNo: qs('#stop-page-no')
};

let gift = null;
let engine = null;
let thanksReady = false;
let previewAutomationStarted = false;

// Camera AR state
let cameraStream = null;
let cameraArActive = false;

function showPanel(panel) {
  [qs('.hero-panel'), qs('#recipient-card'), els.envPanel, els.distancePanel, els.arPanel, els.thanksPanel, els.expiredPanel]
    .forEach((el) => el?.classList.add('hidden'));
  panel?.classList.remove('hidden');
}

function showUnavailable(message) {
  [qs('#recipient-card'), els.envPanel, els.distancePanel, els.arPanel, els.thanksPanel].forEach((el) => el?.classList.add('hidden'));
  els.expiredPanel.classList.remove('hidden');
  setStatus(els.expiredCopy, message, 'warn');
}

async function detectSupport() {
  if (previewMode) return Boolean(navigator.xr);
  if (!window.isSecureContext) return false;
  if (!navigator.xr) return false;
  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  return supported;
}

async function runEnvironmentCheck() {
  els.btnEnvCheck.disabled = true;
  els.btnEnvCheck.textContent = 'Checking...';

  let gpsOk = false;
  let motionOk = true;

  els.envCameraStatus.className = 'env-item__status pending';
  els.envCameraStatus.textContent = 'Checking';
  const cameraOk = await detectSupport();
  els.envCameraStatus.className = cameraOk ? 'env-item__status success' : 'env-item__status warn';
  els.envCameraStatus.textContent = cameraOk ? 'Active' : 'Missing (3D Only)';

  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    els.envMotionStatus.className = 'env-item__status pending';
    els.envMotionStatus.textContent = 'Requesting';
    try {
      const permissionState = await DeviceOrientationEvent.requestPermission();
      motionOk = permissionState === 'granted';
    } catch {
      motionOk = false;
    }
  }
  els.envMotionStatus.className = motionOk ? 'env-item__status success' : 'env-item__status warn';
  els.envMotionStatus.textContent = motionOk ? 'Active' : 'Locked';

  els.envGpsStatus.className = 'env-item__status pending';
  els.envGpsStatus.textContent = 'Requesting';
  try {
    if (previewMode) {
      gpsOk = true;
    } else {
      await getCurrentPosition();
      gpsOk = true;
    }
  } catch {
    gpsOk = false;
  }
  els.envGpsStatus.className = gpsOk ? 'env-item__status success' : 'env-item__status error';
  els.envGpsStatus.textContent = gpsOk ? 'Active' : 'Denied';

  els.btnEnvCheck.textContent = 'Check Again';
  els.btnEnvCheck.disabled = false;

  if (gpsOk) {
    els.envWarning.classList.add('hidden');
    els.btnEnvCheck.classList.add('hidden');
    els.btnEnvContinue.classList.remove('hidden');
  } else {
    els.envWarning.classList.remove('hidden');
    els.btnEnvContinue.classList.add('hidden');
  }
}

function renderGift() {
  els.introTitle.textContent = `${gift.recipientName || 'You'}, a surprise is waiting`;
  els.introSubtitle.textContent = previewMode
    ? 'Buyer preview will automatically step through the real recipient flow.'
    : 'Start, check your location, then open the card.';
  els.senderLine.textContent = gift.senderName || 'Someone special';
  els.messageLine.textContent = gift.message || gift.frontText || 'A special message is waiting for you.';
  if (gift.ctaLink) {
    els.ctaButton.href = gift.ctaLink;
    els.ctaButton.classList.remove('hidden');
  }
  if (previewMode) {
    els.previewBanner.classList.remove('hidden');
    els.previewBanner.textContent = 'Buyer preview mode';
  }
}

function getThanksTemplates() {
  const sender = gift?.senderName || 'you';
  return [
    `${sender}, thank you so much for this surprise. It made my day.`,
    `Thank you, ${sender}! I loved the card and the whole experience.`,
    `${sender}, this was beautiful and thoughtful. Thank you for making me smile today.`
  ];
}

function selectThanksTemplate(message) {
  els.thanksMessage.value = message;
  setStatus(els.thanksStatus, 'Template applied. Edit it freely, then copy or share it.', 'success');
}

function ensureThanksPanel() {
  if (thanksReady) return;
  els.thanksTemplates.innerHTML = '';
  getThanksTemplates().forEach((message, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${index === 0 ? 'btn-primary' : 'btn-secondary'}`;
    button.textContent = `Template ${index + 1}`;
    button.addEventListener('click', () => selectThanksTemplate(message));
    els.thanksTemplates.appendChild(button);
  });
  selectThanksTemplate(getThanksTemplates()[0]);
  thanksReady = true;
}

function revealThanksPanel() {
  ensureThanksPanel();
  els.thanksPanel.classList.remove('hidden');
  if (!previewMode) {
    els.thanksPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── 클립 순서 기반 시퀀스 플레이어 ──
let _seqIdx = 0;

function getSeqClips() {
  return gift?.clips?.length ? gift.clips : [{ type: 'card' }];
}

async function startClipSequence() {
  showPanel(els.arPanel);
  if (els.toggleCameraAr) els.toggleCameraAr.classList.remove('hidden');
  _seqIdx = 0;
  processNextClip();
}

function processNextClip() {
  const clips = getSeqClips();
  if (_seqIdx >= clips.length) { revealThanksPanel(); return; }
  const clip = clips[_seqIdx++];

  if (clip.type === 'card') {
    runCardClip();
  } else if (clip.type === 'stop') {
    runStopClip(clip);
  } else if (clip.type === 'video' && clip.r2Key) {
    runVideoClip(clip).then(processNextClip);
  } else {
    processNextClip();
  }
}

async function runCardClip() {
  setStatus(els.arStatus, 'Preparing the card stage. Tap empty space to bring the gesture hint back.', 'muted');
  if (!engine) {
    engine = new WebXREngine({
      mountEl: els.arStage, statusEl: els.arStatus,
      overlayEl: els.xrOverlay, videoEl: els.giftVideo, gift, previewMode
    });
    await engine.init();
  }
  await engine.prepareMedia();
  try { await engine.enterAR(); }
  catch (error) {
    if (!engine.placed) { engine.placeNow(); await engine.startSequence(); engine.showHintTemporarily(); }
    setStatus(els.arStatus, error.message || 'Immersive AR could not start, so the interactive 3D card remains available.', 'warn');
  }
  window.addEventListener('ar-sequence-complete', processNextClip, { once: true });
}

function runStopClip(clip) {
  if (els.stopPageMsg) els.stopPageMsg.textContent = clip.message || '준비된 영상을 시청하시겠어요?';
  els.stopPageOverlay?.classList.remove('hidden');
  els.stopPageYes?.addEventListener('click', () => {
    els.stopPageOverlay?.classList.add('hidden');
    processNextClip();
  }, { once: true });
  els.stopPageNo?.addEventListener('click', () => {
    els.stopPageOverlay?.classList.add('hidden');
    revealThanksPanel();
  }, { once: true });
}

function runVideoClip(clip) {
  return new Promise(resolve => {
    const video = els.giftVideo;
    if (!video) { resolve(); return; }
    video.src = `/api/media/stream?key=${encodeURIComponent(clip.r2Key)}`;
    video.classList.remove('hidden');
    video.onended = () => { video.classList.add('hidden'); resolve(); };
    (async () => {
      try {
        if (video.requestFullscreen) await video.requestFullscreen();
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      } catch {}
      video.play().catch(() => {});
    })();
  });
}

async function copyThanksMessage() {
  const text = els.thanksMessage?.value.trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  setStatus(els.thanksStatus, 'Thank-you message copied.', 'success');
}

async function shareThanksMessage() {
  const text = els.thanksMessage?.value.trim();
  if (!text) return;
  if (navigator.share) {
    try {
      await navigator.share({ text });
      setStatus(els.thanksStatus, 'Share sheet opened.', 'success');
      return;
    } catch {
      // fallback below
    }
  }
  await copyThanksMessage();
}

function setArLiveMode(enabled) {
  document.body.classList.toggle('ar-live-mode', enabled);
}

function setUnlockedState(copy, tone = 'success', label = 'Ready') {
  showPanel(els.distancePanel);
  els.distanceState.textContent = label;
  els.distanceState.className = `distance-state ${previewMode ? 'state-preview' : 'state-ready'}`;
  setStatus(els.distanceCopy, copy, tone);
  els.launchAr.disabled = false;
}

async function handleBegin() {
  showPanel(els.envPanel);
  els.envPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function checkDistance() {
  if (previewMode) {
    setUnlockedState('Preview mode skips the location gate and will open the card automatically.', 'success', 'Preview mode');
    return;
  }

  try {
    const position = await getCurrentPosition();
    const latestDistance = haversineMeters(
      position.coords.latitude,
      position.coords.longitude,
      Number(gift.latitude),
      Number(gift.longitude)
    );
    const radius = Number(gift.unlockRadiusM || 50);
    showPanel(els.distancePanel);

    if (latestDistance <= radius) {
      els.distanceState.textContent = 'Unlocked';
      els.distanceState.className = 'distance-state state-ready';
      setStatus(
        els.distanceCopy,
        `You are inside the unlock area (${formatDistance(latestDistance)} away). Open the card to load it ${Number(gift.forwardDistance || 2).toFixed(1)}m in front of you.`,
        'success'
      );
      els.launchAr.disabled = false;
    } else if (latestDistance <= radius * 2) {
      els.distanceState.textContent = 'Almost there';
      els.distanceState.className = 'distance-state state-near';
      setStatus(els.distanceCopy, `Move a little closer. You are ${formatDistance(latestDistance)} away.`, 'warn');
      els.launchAr.disabled = true;
    } else {
      els.distanceState.textContent = 'Too far';
      els.distanceState.className = 'distance-state state-far';
      setStatus(els.distanceCopy, `You are ${formatDistance(latestDistance)} away. Move closer to open the card.`, 'error');
      els.launchAr.disabled = true;
    }
  } catch (error) {
    showPanel(els.distancePanel);
    setStatus(els.distanceCopy, error.message || 'Location check failed.', 'error');
  }
}


/* ══════════════════════════════════════════
   ★ Camera AR — toggle the rear camera as
     a background behind the 3D card.
     Available in BOTH preview and live mode.
   ══════════════════════════════════════════ */
async function toggleCameraAr() {
  if (cameraArActive) {
    // ── Stop camera ──
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    if (els.cameraFeed) {
      els.cameraFeed.srcObject = null;
      els.cameraFeed.classList.add('hidden');
    }
    els.arStage?.classList.remove('camera-ar-mode');
    if (els.toggleCameraAr) els.toggleCameraAr.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> Camera AR';
    cameraArActive = false;
    setStatus(els.arStatus, 'Camera AR stopped. 3D preview continues.', 'muted');
    return;
  }

  // ── Start camera ──
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    if (els.cameraFeed) {
      els.cameraFeed.srcObject = cameraStream;
      els.cameraFeed.classList.remove('hidden');
      try { await els.cameraFeed.play(); } catch { /* autoplay attr handles it */ }
    }
    els.arStage?.classList.add('camera-ar-mode');
    if (els.toggleCameraAr) els.toggleCameraAr.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M15 15l-1.5-1.5"/><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9c0 1.1.9 2 2 2h12.5"/><path d="M22 17.5V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> Stop Camera';
    cameraArActive = true;
    setStatus(els.arStatus, 'Camera AR active — you can see the 3D card overlaid on your camera feed, just like a real recipient.', 'success');
  } catch (err) {
    setStatus(els.arStatus, 'Camera access denied: ' + (err.message || 'Unknown error. Please allow camera access in your browser settings.'), 'error');
  }
}

async function startPreviewAutomation() {
  if (!previewMode || previewAutomationStarted) return;
  previewAutomationStarted = true;
  document.body.classList.add('preview-direct-ar');
  [qs('#recipient-card'), els.envPanel, els.distancePanel].forEach((el) => el?.classList.add('hidden'));
  setStatus(els.arStatus, 'Buyer preview — 3D stage ready. Tap "📷 Camera AR" to overlay the card on your camera feed.', 'success');
  await startClipSequence();
}

async function loadGiftFromR2(r2key) {
  const res = await fetch(`/api/template/load?key=${encodeURIComponent(r2key)}`);
  if (!res.ok) throw new Error(`R2 load failed: ${res.status}`);
  const data = await res.json();
  return {
    templateId: data.templateId,
    templateName: data.templateId,
    recipientName: '',
    senderName: '',
    message: '',
    status: 'active',
    expiresAt: null,
    latitude: 0,
    longitude: 0,
    unlockRadiusM: 0,
    spawnHeight: 3,
    forwardDistance: 2,
    canvasData: { els: data.els, bg: data.bg }
  };
}

async function init() {
  applyPageLanguage();

  const urlParams = new URLSearchParams(location.search);
  const r2key = urlParams.get('r2key');

  if (r2key && previewMode) {
    try {
      gift = await loadGiftFromR2(r2key);
    } catch (error) {
      showUnavailable(error.message || 'R2에서 카드를 불러올 수 없습니다.');
      return;
    }
    renderGift();
    els.begin.addEventListener('click', handleBegin);
    els.launchAr.addEventListener('click', startClipSequence);
    els.replaySequence.addEventListener('click', async () => {
      if (!engine) { await startClipSequence(); return; }
      await engine.replay();
      window.addEventListener('ar-sequence-complete', processNextClip, { once: true });
    });
    els.toggleCameraAr?.addEventListener('click', toggleCameraAr);
    window.addEventListener('ar-session-started', () => setArLiveMode(true));
    window.addEventListener('ar-session-ended', () => setArLiveMode(false));
    await startPreviewAutomation();
    return;
  }

  const slug = parseSlugFromLocation();
  try {
    gift = await getGiftBySlug(slug);
  } catch (error) {
    showUnavailable(error.message || 'The card could not be loaded.');
    return;
  }

  if (!gift) {
    showUnavailable('This link is invalid.');
    return;
  }

  if (!previewMode && gift.status === 'disabled') {
    showUnavailable('This card is currently disabled.');
    return;
  }

  if (!previewMode && (isExpired(gift.expiresAt) || gift.status === 'expired')) {
    showUnavailable('This card has expired.');
    return;
  }

  renderGift();
  els.begin.addEventListener('click', handleBegin);
  els.refreshDistance.addEventListener('click', checkDistance);
  els.btnEnvCheck?.addEventListener('click', runEnvironmentCheck);
  els.btnEnvContinue?.addEventListener('click', checkDistance);
  els.launchAr.addEventListener('click', startClipSequence);
  els.replaySequence.addEventListener('click', async () => {
    if (!engine) { await startClipSequence(); return; }
    await engine.replay();
    window.addEventListener('ar-sequence-complete', processNextClip, { once: true });
  });
  els.copyThanks.addEventListener('click', copyThanksMessage);
  els.shareThanks.addEventListener('click', shareThanksMessage);

  // Camera AR toggle event
  els.toggleCameraAr?.addEventListener('click', toggleCameraAr);

  window.addEventListener('ar-session-started', () => setArLiveMode(true));
  window.addEventListener('ar-session-ended', () => setArLiveMode(false));
  if (previewMode) {
    await startPreviewAutomation();
  }
}

init();

window.addEventListener('beforeunload', () => {
  engine?.dispose();
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
});
