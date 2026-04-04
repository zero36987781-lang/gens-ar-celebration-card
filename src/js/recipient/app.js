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
  replaySequence: qs('#replay-sequence'),
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
    setStatus(els.supportStatus, '구매자 미리보기 모드입니다. 위치 제한 없이 수신자 전체 흐름과 3D 스테이지를 바로 점검할 수 있습니다.', 'success');
    return Boolean(navigator.xr);
  }

  if (!window.isSecureContext) {
    setStatus(els.supportStatus, 'WebXR AR 모드는 HTTPS 환경이 필요합니다.', 'error');
    return false;
  }
  if (!navigator.xr) {
    setStatus(els.supportStatus, '이 브라우저에서는 WebXR이 노출되지 않습니다.', 'error');
    return false;
  }
  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    setStatus(els.supportStatus, '이 기기/브라우저는 immersive AR을 지원하지 않습니다.', 'error');
    return false;
  }
  setStatus(els.supportStatus, '이 기기에서 WebXR AR을 사용할 수 있습니다.', 'success');
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
  els.begin.textContent = '미리보기 시작';
  els.launchAr.textContent = '미리보기 스테이지 열기';
  els.arEnter.textContent = '모바일 AR 진입';
}

function renderGift() {
  els.introTitle.textContent = `${gift.recipientName || 'You'}, a surprise is waiting`;
  els.introSubtitle.textContent = previewMode
    ? '구매자 미리보기에서는 실제 수신자 흐름과 감사 인사 화면까지 모두 확인할 수 있습니다.'
    : '선택된 장소 근처에서 링크를 열면 AR 카드가 언락됩니다.';
  els.senderLine.textContent = gift.senderName || 'Someone special';
  els.messageLine.textContent = gift.message || 'A special message is waiting for you.';

  if (gift.ctaLink) {
    els.ctaButton.href = gift.ctaLink;
    els.ctaButton.classList.remove('hidden');
  }

  if (els.giftVideo && gift.videoUrl) {
    els.giftVideo.preload = 'auto';
    els.giftVideo.playsInline = true;
    els.giftVideo.crossOrigin = 'anonymous';
    els.giftVideo.src = gift.videoUrl;
    els.giftVideo.load();
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
  setStatus(els.thanksStatus, '감사 메시지 템플릿이 적용되었습니다. 자유롭게 수정한 뒤 복사하거나 공유하세요.', 'success');
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
  setStatus(els.thanksStatus, '감사 메시지를 복사했습니다. 카카오톡, 문자, DM, 메일 등에 바로 붙여넣을 수 있습니다.', 'success');
}

async function shareThanksMessage() {
  const text = els.thanksMessage?.value.trim();
  if (!text) return;
  if (navigator.share) {
    try {
      await navigator.share({ text });
      setStatus(els.thanksStatus, '공유 시트가 열렸습니다.', 'success');
      return;
    } catch {
      // fallback below
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
    '위치 게이트를 건너뛰고 실제 수신자 경험을 확인할 수 있습니다. AR 스테이지를 열어 카드, 영상, 감사 메시지 흐름까지 점검하세요.',
    'success'
  );
  els.launchAr.disabled = false;
  revealUnlockedActions();
  showUnlockPopup('구매자 미리보기가 준비되었습니다. 수신자가 보게 될 흐름과 카드 조작 UI를 그대로 점검할 수 있습니다.');
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
        `언락되었습니다. 현재 위치는 ${formatDistance(latestDistance)} 거리이며, 카드는 높이 ${Number(gift.spawnHeight || 2).toFixed(1)}m · 전방 ${Number(gift.forwardDistance || 1.5).toFixed(1)}m 설정으로 준비됩니다.`,
        'success'
      );
      els.launchAr.disabled = false;
      revealUnlockedActions();
      showUnlockPopup(`언락 완료. 카드가 높이 ${Number(gift.spawnHeight || 2).toFixed(1)}m, 전방 ${Number(gift.forwardDistance || 1.5).toFixed(1)}m 위치로 나타날 준비가 되었습니다.`);
    } else if (latestDistance <= radius * 2) {
      els.distanceState.textContent = 'Almost there';
      els.distanceState.className = 'distance-state state-near';
      setStatus(els.distanceCopy, `조금만 더 가까이 이동하세요. 현재 ${formatDistance(latestDistance)} 떨어져 있습니다.`, 'warn');
      els.launchAr.disabled = true;
      hideUnlockPopup();
    } else {
      els.distanceState.textContent = 'Too far';
      els.distanceState.className = 'distance-state state-far';
      setStatus(els.distanceCopy, `현재 ${formatDistance(latestDistance)} 떨어져 있습니다. 지정 위치로 더 가까이 이동해야 합니다.`, 'error');
      els.launchAr.disabled = true;
      hideUnlockPopup();
    }
  } catch (error) {
    setStatus(els.distanceCopy, error.message || '위치 확인에 실패했습니다.', 'error');
    els.distancePanel.classList.remove('hidden');
    hideUnlockPopup();
  }
}

function bindOverlayControls() {
  const handler = (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !engine) return;
    event.preventDefault();
    engine.updateTransform(button.dataset.action);
  };
  els.xrOverlay.addEventListener('click', handler);
  els.xrOverlay.addEventListener('touchstart', handler, { passive: false });
}

async function launchARView() {
  els.arPanel.classList.remove('hidden');
  els.arPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setStatus(
    els.arStatus,
    previewMode
      ? '미리보기 스테이지가 준비되었습니다. 수신자가 보는 카드, 영상, 롱프레스 홀드 조작까지 확인할 수 있습니다.'
      : 'AR 스테이지가 준비되었습니다. 카드가 가려지면 Height / Near / Rotate / Tilt 버튼이나 롱프레스 홀드 조작을 사용하세요.',
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
  await engine.prepareMedia();
}

async function enterAR() {
  try {
    if (!engine) {
      await launchARView();
    }
    await engine.enterAR();
  } catch (error) {
    setArLiveMode(false);
    setStatus(els.arStatus, error.message || 'WebXR 시작에 실패했습니다.', 'error');
  }
}

async function replaySequence() {
  try {
    if (!engine) {
      await launchARView();
    }
    await engine.replay();
  } catch (error) {
    setStatus(els.arStatus, error.message || '시퀀스 다시보기에 실패했습니다.', 'error');
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
    showUnavailable(error.message || '서프라이즈를 불러오지 못했습니다.');
    return;
  }

  if (!gift) {
    showUnavailable('유효하지 않은 링크입니다.');
    return;
  }

  if (!previewMode && gift.status === 'disabled') {
    showUnavailable('이 서프라이즈는 현재 비활성화되어 있습니다.');
    return;
  }

  if (!previewMode && (isExpired(gift.expiresAt) || gift.status === 'expired')) {
    showUnavailable('이 서프라이즈는 만료되었습니다.');
    return;
  }

  renderGift();
  els.begin.addEventListener('click', handleBegin);
  qs('#check-distance').addEventListener('click', checkDistance);
  qs('#refresh-distance').addEventListener('click', checkDistance);
  els.launchAr.addEventListener('click', launchARView);
  els.arEnter.addEventListener('click', enterAR);
  els.replaySequence?.addEventListener('click', replaySequence);
  bindOverlayControls();
  bindUnlockPopup();
  els.copyThanks?.addEventListener('click', copyThanksMessage);
  els.shareThanks?.addEventListener('click', shareThanksMessage);
  window.addEventListener('ar-session-started', () => setArLiveMode(true));
  window.addEventListener('ar-session-ended', () => setArLiveMode(false));
}

init();
window.addEventListener('beforeunload', () => engine?.dispose());
