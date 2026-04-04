import { getGiftBySlug } from '../core/data-service.js';
import { formatDistance, getCurrentPosition, haversineMeters, isExpired, parseSlugFromLocation, qs, setStatus } from '../core/utils.js';
import { WebXREngine } from '../ar/webxr-engine.js';

const els = {
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
let latestDistance = Number.POSITIVE_INFINITY;

async function detectSupport() {
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

function renderGift() {
  els.introTitle.textContent = `${gift.recipientName || 'You'}, a surprise is waiting`;
  els.introSubtitle.textContent = 'Open the link near the pinned place to unlock the AR card.';
  els.senderLine.textContent = gift.senderName || 'Someone special';
  els.messageLine.textContent = gift.message || 'A special message is waiting for you.';

  if (gift.ctaLink) {
    els.ctaButton.href = gift.ctaLink;
    els.ctaButton.classList.remove('hidden');
  }
}

async function handleBegin() {
  els.permissionPanel.classList.remove('hidden');
  await detectSupport();
  els.permissionPanel.scrollIntoView({ behavior: 'smooth' });
}

async function checkDistance() {
  try {
    const position = await getCurrentPosition();
    latestDistance = haversineMeters(
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
    'Visibility-first stage ready. Use Up/Down and Near/Far if the card is blocked by people, walls, or street furniture.',
    'muted'
  );
  if (!engine) {
    engine = new WebXREngine({
      mountEl: els.arStage,
      statusEl: els.arStatus,
      overlayEl: els.xrOverlay,
      videoEl: els.giftVideo,
      gift
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

  if (gift.status === 'disabled') {
    showUnavailable('This surprise is currently disabled.');
    return;
  }

  if (isExpired(gift.expiresAt) || gift.status === 'expired') {
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
}

init();
window.addEventListener('beforeunload', () => engine?.dispose());
