import { getGiftBySlug } from '../core/data-service.js';
import { formatDistance, getCurrentPosition, haversineMeters, isExpired, isPreviewModeFromLocation, parseSlugFromLocation, parseYouTubeId, qs, setStatus } from '../core/utils.js';
import { WebXREngine } from '../ar/webxr-engine.js';
import { applyPageLanguage } from '../core/i18n.js';

const previewMode = isPreviewModeFromLocation();

const els = {
  introTitle: qs('#intro-title'),
  introSubtitle: qs('#intro-subtitle'),
  senderLine: qs('#sender-line'),
  messageLine: qs('#message-line'),
  begin: qs('#begin-recipient'),
  supportStatus: qs('#support-status'),
  distanceState: qs('#distance-state'),
  distanceCopy: qs('#distance-copy'),
  refreshDistance: qs('#refresh-distance'),
  launchAr: qs('#launch-ar'),
  arStage: qs('#ar-stage'),
  xrOverlay: qs('#xr-overlay'),
  gestureHint: qs('#gesture-hint'),
  arStatus: qs('#ar-status'),
  replaySequence: qs('#replay-sequence'),
  thanksTemplates: qs('#thanks-templates'),
  thanksMessage: qs('#thanks-message'),
  thanksStatus: qs('#thanks-status'),
  copyThanks: qs('#copy-thanks'),
  shareThanks: qs('#share-thanks'),
  expiredCopy: qs('#expired-copy'),
  ctaButton: qs('#cta-button'),
  giftVideo: qs('#gift-video'),
  previewBanner: qs('#preview-banner')
};

let gift = null;
let engine = null;
let thanksReady = false;
let currentStep = 0;

function showStep(step) {
  const allPages = document.querySelectorAll('[data-rpage]');
  const target = qs(`#r-page-${step}`);

  if (!target) return;

  // Snapshot transition: prepare next page hidden, then swap
  target.classList.remove('hidden');
  target.classList.add('page-entering');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    allPages.forEach(p => {
      if (p !== target) p.classList.add('hidden');
      p.classList.remove('page-entering');
    });
    target.classList.remove('page-entering');
    window.scrollTo({ top: 0, behavior: 'instant' });
    currentStep = step;
  }));
}

function showUnavailable(message) {
  qs('#r-page-expired')?.classList.remove('hidden');
  document.querySelectorAll('[data-rpage]').forEach(p => {
    if (p.id !== 'r-page-expired') p.classList.add('hidden');
  });
  setStatus(els.expiredCopy, message, 'warn');
}

async function detectSupport() {
  if (previewMode) {
    setStatus(els.supportStatus, 'Buyer preview mode. AR stage opens directly.', 'success');
    return Boolean(navigator.xr);
  }
  if (!window.isSecureContext) {
    setStatus(els.supportStatus, 'Full AR needs HTTPS. 3D preview will open instead.', 'warn');
    return false;
  }
  if (!navigator.xr) {
    setStatus(els.supportStatus, 'WebXR not available. Interactive 3D preview will open.', 'warn');
    return false;
  }
  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    setStatus(els.supportStatus, 'Immersive AR not supported. 3D preview will open.', 'warn');
    return false;
  }
  setStatus(els.supportStatus, 'AR supported. Camera mode will start after unlock.', 'success');
  return true;
}

function renderGift() {
  els.introTitle.textContent = `${gift.recipientName || 'You'}, a surprise is waiting`;
  els.introSubtitle.textContent = previewMode
    ? 'Buyer preview — AR stage opens directly.'
    : 'Start, check your location, then open the card.';
  els.senderLine.textContent = gift.senderName || 'Someone special';
  els.messageLine.textContent = gift.message || 'A special message is waiting for you.';
  if (gift.ctaLink) {
    els.ctaButton.href = gift.ctaLink;
    els.ctaButton.classList.remove('hidden');
  }
  if (previewMode) {
    els.previewBanner?.classList.remove('hidden');
  }
}

async function checkDistance() {
  if (previewMode) {
    els.distanceState.textContent = 'Preview mode';
    els.distanceState.className = 'distance-state state-preview';
    setStatus(els.distanceCopy, 'Preview skips location gate.', 'success');
    els.launchAr.disabled = false;
    return;
  }

  try {
    const position = await getCurrentPosition();
    const dist = haversineMeters(position.coords.latitude, position.coords.longitude, Number(gift.latitude), Number(gift.longitude));
    const radius = Number(gift.unlockRadiusM || 50);

    if (dist <= radius) {
      els.distanceState.textContent = 'Unlocked';
      els.distanceState.className = 'distance-state state-ready';
      setStatus(els.distanceCopy, `Inside unlock area (${formatDistance(dist)} away).`, 'success');
      els.launchAr.disabled = false;
    } else if (dist <= radius * 2) {
      els.distanceState.textContent = 'Almost there';
      els.distanceState.className = 'distance-state state-near';
      setStatus(els.distanceCopy, `Move closer. ${formatDistance(dist)} away.`, 'warn');
      els.launchAr.disabled = true;
    } else {
      els.distanceState.textContent = 'Too far';
      els.distanceState.className = 'distance-state state-far';
      setStatus(els.distanceCopy, `${formatDistance(dist)} away. Move closer.`, 'error');
      els.launchAr.disabled = true;
    }
  } catch (error) {
    setStatus(els.distanceCopy, error.message || 'Location check failed.', 'error');
  }
}

/* ---- Gesture hint: stays visible until horizontal drag ---- */
let hintVisible = false;
let hintDismissedByDrag = false;

function showGestureHint() {
  if (hintDismissedByDrag) return;
  els.xrOverlay?.classList.remove('hidden', 'hint-fading');
  hintVisible = true;
}

function fadeGestureHint() {
  els.xrOverlay?.classList.add('hint-fading');
  hintVisible = false;
}

function bindGestureHintBehavior() {
  // Hint stays visible after longpress. Only dismissed when horizontal drag starts.
  let startX = 0;
  const stage = els.arStage;
  if (!stage) return;

  stage.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    // Show hint on every interaction (unless already dismissed by drag)
    showGestureHint();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!hintVisible) return;
    const dx = Math.abs(e.clientX - startX);
    // Dismiss hint once user starts a real horizontal drag
    if (dx > 20) {
      fadeGestureHint();
      hintDismissedByDrag = true;
    }
  });
}

async function launchCardStage() {
  showStep(3);
  setStatus(els.arStatus, 'Preparing the card stage.', 'muted');

  if (!engine) {
    engine = new WebXREngine({
      mountEl: els.arStage,
      statusEl: els.arStatus,
      overlayEl: els.xrOverlay,
      videoEl: els.giftVideo,
      gift,
      previewMode
    });
    await engine.init();
    bindGestureHintBehavior();
  }
  await engine.prepareMedia();

  try {
    await engine.enterAR();
  } catch (error) {
    if (!engine.placed) {
      engine.placeNow();
      await engine.startSequence();
      showGestureHint();
    }
    setStatus(els.arStatus, error.message || 'Interactive 3D card active.', 'warn');
  }
}

function revealThanksPanel() {
  ensureThanksPanel();
  showStep(4);
}

function getThanksTemplates() {
  const sender = gift?.senderName || 'you';
  return [
    `${sender}, thank you so much for this surprise. It made my day.`,
    `Thank you, ${sender}! I loved the card and the whole experience.`,
    `${sender}, this was beautiful and thoughtful. Thank you for making me smile today.`
  ];
}

function ensureThanksPanel() {
  if (thanksReady) return;
  els.thanksTemplates.innerHTML = '';
  getThanksTemplates().forEach((msg, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${i === 0 ? 'btn-primary' : 'btn-secondary'}`;
    btn.textContent = `Template ${i + 1}`;
    btn.addEventListener('click', () => {
      els.thanksMessage.value = msg;
      setStatus(els.thanksStatus, 'Template applied.', 'success');
    });
    els.thanksTemplates.appendChild(btn);
  });
  els.thanksMessage.value = getThanksTemplates()[0];
  thanksReady = true;
}

async function init() {
  applyPageLanguage();
  const slug = parseSlugFromLocation();

  try { gift = await getGiftBySlug(slug); }
  catch (e) { showUnavailable(e.message || 'Card could not be loaded.'); return; }

  if (!gift) { showUnavailable('This link is invalid.'); return; }
  if (!previewMode && gift.status === 'disabled') { showUnavailable('This card is disabled.'); return; }
  if (!previewMode && (isExpired(gift.expiresAt) || gift.status === 'expired')) { showUnavailable('This card has expired.'); return; }

  renderGift();

  // Buyer preview → jump straight to AR
  if (previewMode) {
    document.body.classList.add('buyer-preview-mode');
    await launchCardStage();
    return;
  }

  // Normal recipient flow
  els.begin?.addEventListener('click', async () => {
    showStep(1);
    await detectSupport();
  });

  qs('#check-distance')?.addEventListener('click', async () => {
    await checkDistance();
    showStep(2);
  });

  els.refreshDistance?.addEventListener('click', checkDistance);
  els.launchAr?.addEventListener('click', launchCardStage);

  els.replaySequence?.addEventListener('click', async () => {
    if (!engine) { await launchCardStage(); return; }
    await engine.replay();
  });

  els.copyThanks?.addEventListener('click', async () => {
    const text = els.thanksMessage?.value?.trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setStatus(els.thanksStatus, 'Copied.', 'success');
  });

  els.shareThanks?.addEventListener('click', async () => {
    const text = els.thanksMessage?.value?.trim();
    if (!text) return;
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    setStatus(els.thanksStatus, 'Copied (share not available).', 'success');
  });

  window.addEventListener('ar-session-started', () => document.body.classList.add('ar-live-mode'));
  window.addEventListener('ar-session-ended', () => document.body.classList.remove('ar-live-mode'));
  window.addEventListener('ar-sequence-complete', revealThanksPanel);
}

init();
window.addEventListener('beforeunload', () => engine?.dispose());
