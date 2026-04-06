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
  permissionPanel: qs('#permission-panel'),
  supportStatus: qs('#support-status'),
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
  giftVideo: qs('#gift-video')
};

let gift = null;
let engine = null;
let thanksReady = false;
let previewAutomationStarted = false;

function showPanel(panel) {
  panel?.classList.remove('hidden');
}

function showUnavailable(message) {
  [qs('#recipient-card'), els.permissionPanel, els.distancePanel, els.arPanel, els.thanksPanel].forEach((el) => el?.classList.add('hidden'));
  els.expiredPanel.classList.remove('hidden');
  setStatus(els.expiredCopy, message, 'warn');
}

async function detectSupport() {
  if (previewMode) {
    setStatus(els.supportStatus, 'Buyer preview mode is active. The location gate is simulated and the stage sequence will auto-play.', 'success');
    return Boolean(navigator.xr);
  }
  if (!window.isSecureContext) {
    setStatus(els.supportStatus, 'Full AR needs HTTPS. A touch-ready 3D card will still open in preview mode.', 'warn');
    return false;
  }
  if (!navigator.xr) {
    setStatus(els.supportStatus, 'WebXR is not available here. The card will open in interactive 3D preview mode.', 'warn');
    return false;
  }
  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    setStatus(els.supportStatus, 'Immersive AR is not supported on this device. Interactive 3D preview will open instead.', 'warn');
    return false;
  }
  setStatus(els.supportStatus, 'AR is supported. After you open the card, camera mode will start automatically.', 'success');
  return true;
}

function renderGift() {
  els.introTitle.textContent = `${gift.recipientName || 'You'}, a surprise is waiting`;
  els.introSubtitle.textContent = previewMode
    ? 'Buyer preview will automatically step through the real recipient flow.'
    : 'Start, check your location, then open the card.';
  els.senderLine.textContent = gift.senderName || 'Someone special';
  els.messageLine.textContent = gift.message || 'A special message is waiting for you.';
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
  showPanel(els.permissionPanel);
  await detectSupport();
  els.permissionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        `You are inside the unlock area (${formatDistance(latestDistance)} away). Open the card to load it ${Number(gift.forwardDistance || 2).toFixed(1)}m in front of you.${parseYouTubeId(gift.videoUrl || '') ? ' YouTube media remains editor-preview only for runtime stability.' : ''}`,
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

async function launchCardStage() {
  showPanel(els.arPanel);
  setStatus(els.arStatus, 'Preparing the card stage. Tap empty space to bring the gesture hint back.', 'muted');
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
  }
  await engine.prepareMedia();
  try {
    await engine.enterAR();
  } catch (error) {
    if (!engine.placed) {
      engine.placeNow();
      await engine.startSequence();
      engine.showHintTemporarily();
    }
    setStatus(els.arStatus, error.message || 'Immersive AR could not start, so the interactive 3D card remains available.', 'warn');
  }
}

async function startPreviewAutomation() {
  if (!previewMode || previewAutomationStarted) return;
  previewAutomationStarted = true;
  document.body.classList.add('preview-direct-ar');
  [qs('#recipient-card'), els.permissionPanel, els.distancePanel].forEach((el) => el?.classList.add('hidden'));
  showPanel(els.arPanel);
  setStatus(els.arStatus, 'Buyer preview opens directly in the AR / 3D stage.', 'success');
  await launchCardStage();
}

async function init() {
  applyPageLanguage();
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
  qs('#check-distance').addEventListener('click', checkDistance);
  els.launchAr.addEventListener('click', launchCardStage);
  els.replaySequence.addEventListener('click', async () => {
    if (!engine) {
      await launchCardStage();
      return;
    }
    await engine.replay();
  });
  els.copyThanks.addEventListener('click', copyThanksMessage);
  els.shareThanks.addEventListener('click', shareThanksMessage);
  window.addEventListener('ar-session-started', () => setArLiveMode(true));
  window.addEventListener('ar-session-ended', () => setArLiveMode(false));
  window.addEventListener('ar-sequence-complete', revealThanksPanel);
  if (previewMode) {
    await startPreviewAutomation();
  }
}

init();
window.addEventListener('beforeunload', () => engine?.dispose());
