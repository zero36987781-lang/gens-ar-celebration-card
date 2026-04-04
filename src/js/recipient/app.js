import { getGiftBySlug } from '../core/data-service.js';
import { formatDistance, getCurrentPosition, haversineMeters, isExpired, isPreviewModeFromLocation, parseSlugFromLocation, qs, setStatus } from '../core/utils.js';
import { WebXREngine } from '../ar/webxr-engine.js';

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
  thanksPanel: qs('#thanks-panel'),
  thanksTemplates: qs('#thanks-templates'),
  thanksMessage: qs('#thanks-message'),
  thanksStatus: qs('#thanks-status'),
  copyThanks: qs('#copy-thanks'),
  shareThanks: qs('#share-thanks'),
  launchAr: qs('#launch-ar'),
  arPanel: qs('#ar-panel'),
  arStage: qs('#ar-stage'),
  arEnter: qs('#ar-enter'),
  xrOverlay: qs('#xr-overlay'),
  arStatus: qs('#ar-status'),
  expiredPanel: qs('#expired-panel'),
  expiredCopy: qs('#expired-copy'),
  ctaButton: qs('#cta-button'),
  giftVideo: qs('#gift-video'),
  unlockPopup: qs('#unlock-popup'),
  unlockPopupCopy: qs('#unlock-popup-copy'),
  unlockPopupOpen: qs('#unlock-popup-open'),
  unlockPopupClose: qs('#unlock-popup-close')
};

let gift = null;
let engine = null;
let thanksReady = false;

async function detectSupport() {
  if (previewMode) {
    setStatus(els.supportStatus, 'Buyer preview mode is active. The location gate is skipped and a 3D preview stage can open even on non-AR devices.', 'success');
    return Boolean(navigator.xr);
  }

  if (!window.isSecureContext) {
    setStatus(els.supportStatus, 'HTTPS is required for WebXR AR mode.', 'error');
    return false;
  }
  if (!navigator.xr) {
    setStatus(els.supportStatus, 'This browser does not expose WebXR.', 'error');
    return false;
  }
  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    setStatus(els.supportStatus, 'This device/browser does not support immersive AR.', 'error');
    return false;
  }
  setStatus(els.supportStatus, 'WebXR AR is supported on this device.', 'success');
  return true;
}

function hideUnlockPopup() {
  els.unlockPopup?.classList.add('hidden');
}

function showUnlockPopup(message) {
  if (!els.unlockPopup) return;
  els.unlockPopup.classList.remove('hidden');
  els.unlockPopupCopy.textContent = message;
}

function showUnavailable(message) {
  [qs('#recipient-card'), els.permissionPanel, els.distancePanel, els.arPanel].forEach((el) => el?.classList.add('hidden'));
  hideUnlockPopup();
  els.expiredPanel.classList.remove('hidden');
  setStatus(els.expiredCopy, message, 'warn');
}

function configurePreviewModeUI() {
  if (!previewMode) return;
  els.previewBanner?.classList.remove('hidden');
  els.begin.textContent = 'Start preview';
  els.launchAr.textContent = 'Open preview stage';
  els.arEnter.textContent = 'Enter AR on mobile';
}

function renderGift() {
  els.introTitle.textContent = `${gift.recipientName || 'You'}, a surprise is waiting`;
  els.introSubtitle.textContent = previewMode
    ? 'Buyer preview mode shows the recipient flow before the link is shared.'
    : 'Open the link near the pinned place to unlock the AR card.';
  els.senderLine.textContent = gift.senderName || 'Someone special';
  els.messageLine.textContent = gift.message || 'A special message is waiting for you.';

  if (gift.ctaLink) {
    els.ctaButton.href = gift.ctaLink;
    els.ctaButton.classList.remove('hidden');
  }
}

function getThanksTemplates() {
  const sender = gift?.senderName || 'you';
  return [
    `${sender}, thank you so much for this surprise. It made my day and I will remember it for a long time.`,
    `Thank you, ${sender}! I loved the card, the message, and the whole experience.`,
    `${sender}, this was beautiful and thoughtful. Thank you for making me smile today.`
  ];
}

function selectThanksTemplate(message) {
  if (!els.thanksMessage) return;
  els.thanksMessage.value = message;
  setStatus(els.thanksStatus, 'Thank-you template loaded. You can edit it before copying or sharing.', 'success');
}

function ensureThanksPanel() {
  if (!els.thanksPanel || thanksReady) return;
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

function revealUnlockedActions() {
  ensureThanksPanel();
  els.thanksPanel?.classList.remove('hidden');
}

async function copyThanksMessage() {
  if (!els.thanksMessage?.value.trim()) return;
  await navigator.clipboard.writeText(els.thanksMessage.value.trim());
  setStatus(els.thanksStatus, 'Thank-you message copied. Paste it into KakaoTalk, Messages, DM, or email.', 'success');
}

async function shareThanksMessage() {
  const text = els.thanksMessage?.value.trim();
  if (!text) return;
  if (navigator.share) {
    try {
      await navigator.share({ text });
      setStatus(els.thanksStatus, 'Share sheet opened for your thank-you message.', 'success');
      return;
    } catch {
      // fall back to copy below
    }
  }
  await copyThanksMessage();
}

function setArLiveMode(enabled) {
  document.body.classList.toggle('ar-live-mode', enabled);
  if (enabled) hideUnlockPopup();
}

function setPreviewUnlockedState() {
  els.distancePanel.classList.remove('hidden');
  els.distanceState.textContent = 'Preview mode';
  els.distanceState.className = 'distance-state state-preview';
  setStatus(
    els.distanceCopy,
    'Location gating is skipped for buyer QA. Open the preview stage to inspect the recipient experience and 3D placement.',
    'success'
  );
  els.launchAr.disabled = false;
  revealUnlockedActions();
  showUnlockPopup('Buyer preview is ready. Open the preview stage to inspect the recipient flow before sharing the live link.');
}

async function handleBegin() {
  els.permissionPanel.classList.remove('hidden');
  await detectSupport();
  if (previewMode) {
    setPreviewUnlockedState();
  }
  els.permissionPanel.scrollIntoView({ behavior: 'smooth' });
}

async function checkDistance() {
  if (previewMode) {
    setPreviewUnlockedState();
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
    els.distancePanel.classList.remove('hidden');

    if (latestDistance <= radius) {
      els.distanceState.textContent = 'Unlocked';
      els.distanceState.className = 'distance-state state-ready';
      setStatus(
        els.distanceCopy,
        `You are inside the unlock zone (${formatDistance(latestDistance)} away). The AR card can pop up now.`,
        'success'
      );
      els.launchAr.disabled = false;
      revealUnlockedActions();
      showUnlockPopup(`Unlocked. The card is ready to appear ${Number(gift.spawnHeight || 1.6).toFixed(1)}m high so it stays visible above nearby obstacles or people.`);
    } else if (latestDistance <= radius * 2) {
      els.distanceState.textContent = 'Almost there';
      els.distanceState.className = 'distance-state state-near';
      setStatus(els.distanceCopy, `Move a little closer. You are ${formatDistance(latestDistance)} away.`, 'warn');
      els.launchAr.disabled = true;
      hideUnlockPopup();
    } else {
      els.distanceState.textContent = 'Too far';
      els.distanceState.className = 'distance-state state-far';
      setStatus(els.distanceCopy, `You are ${formatDistance(latestDistance)} away. Go closer to the selected place.`, 'error');
      els.launchAr.disabled = true;
      hideUnlockPopup();
    }
  } catch (error) {
    setStatus(els.distanceCopy, error.message || 'Location check failed.', 'error');
    els.distancePanel.classList.remove('hidden');
    hideUnlockPopup();
  }
}

function bindOverlayControls() {
  els.xrOverlay.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !engine) return;
    engine.updateTransform(button.dataset.action);
  });
}

async function launchARView() {
  els.arPanel.classList.remove('hidden');
  els.arPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setStatus(
    els.arStatus,
    previewMode
      ? 'Preview stage ready. Inspect the recipient flow and tune the card with the same controls the recipient will use.'
      : 'Visibility-first stage ready. Use Up/Down and Near/Far if the card is blocked by people, walls, or street furniture.',
    'muted'
  );
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
}

async function enterAR() {
  try {
    if (!engine) {
      await launchARView();
    }
    await engine.enterAR();
  } catch (error) {
    setArLiveMode(false);
    setStatus(els.arStatus, error.message || 'Failed to start WebXR.', 'error');
  }
}

function bindUnlockPopup() {
  els.unlockPopupOpen?.addEventListener('click', async () => {
    await launchARView();
  });
  els.unlockPopupClose?.addEventListener('click', hideUnlockPopup);
}

async function init() {
  configurePreviewModeUI();
  const slug = parseSlugFromLocation();
  try {
    gift = await getGiftBySlug(slug);
  } catch (error) {
    showUnavailable(error.message || 'Failed to load this surprise.');
    return;
  }

  if (!gift) {
    showUnavailable('This link is invalid.');
    return;
  }

  if (!previewMode && gift.status === 'disabled') {
    showUnavailable('This surprise is currently disabled.');
    return;
  }

  if (!previewMode && (isExpired(gift.expiresAt) || gift.status === 'expired')) {
    showUnavailable('This surprise has expired.');
    return;
  }

  renderGift();
  els.begin.addEventListener('click', handleBegin);
  qs('#check-distance').addEventListener('click', checkDistance);
  qs('#refresh-distance').addEventListener('click', checkDistance);
  els.launchAr.addEventListener('click', launchARView);
  els.arEnter.addEventListener('click', enterAR);
  bindOverlayControls();
  bindUnlockPopup();
  els.copyThanks?.addEventListener('click', copyThanksMessage);
  els.shareThanks?.addEventListener('click', shareThanksMessage);
  window.addEventListener('ar-session-started', () => setArLiveMode(true));
  window.addEventListener('ar-session-ended', () => setArLiveMode(false));
}

init();
window.addEventListener('beforeunload', () => engine?.dispose());
