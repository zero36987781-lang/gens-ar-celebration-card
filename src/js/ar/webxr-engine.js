import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { clamp, hexToRgb, safeUrl } from '../core/utils.js';

function createEdgeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, 'rgba(255,255,255,0.98)');
  grad.addColorStop(0.3, 'rgba(196,181,253,0.95)');
  grad.addColorStop(0.65, 'rgba(59,130,246,0.85)');
  grad.addColorStop(1, 'rgba(236,72,153,0.88)');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 36;
  ctx.strokeStyle = grad;
  ctx.shadowColor = 'rgba(159,103,255,0.72)';
  ctx.shadowBlur = 42;
  ctx.beginPath();
  ctx.roundRect(36, 36, canvas.width - 72, canvas.height - 72, 70);
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

function drawWrappedParagraphs(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = String(text || '').replace(/\r/g, '').split('\n');
  let cursorY = y;
  paragraphs.forEach((paragraph, index) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      cursorY += lineHeight;
      return;
    }
    let line = '';
    words.forEach((word) => {
      const testLine = `${line}${word} `;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, cursorY);
        line = `${word} `;
        cursorY += lineHeight;
      } else {
        line = testLine;
      }
    });
    if (line.trim()) {
      ctx.fillText(line.trim(), x, cursorY);
      cursorY += lineHeight;
    }
    if (index !== paragraphs.length - 1) {
      cursorY += lineHeight * 0.28;
    }
  });
}

function buildTextCanvas({ width = 1024, height = 1536, background = '#7c3aed', accent = '#f59e0b', title = '', body = '', footer = '', photoData = '' }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const accentRgb = hexToRgb(accent);
  const glow = ctx.createRadialGradient(width * 0.25, height * 0.22, 10, width * 0.25, height * 0.22, width * 0.8);
  glow.addColorStop(0, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.58)`);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(44, 44, width - 88, height - 88, 50);
  ctx.fill();

  if (photoData) {
    const img = new Image();
    img.src = photoData;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(84, 170, width - 168, 420, 36);
    ctx.clip();
    img.onload = () => {
      const ratio = Math.max((width - 168) / img.width, 420 / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      ctx.drawImage(img, 84 + ((width - 168) - drawW) / 2, 170 + (420 - drawH) / 2, drawW, drawH);
      if (canvas.__texture) canvas.__texture.needsUpdate = true;
    };
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(84, 170, width - 168, 420, 36);
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 64px Inter, Arial, sans-serif';
  drawWrappedParagraphs(ctx, title.slice(0, 48), 92, 116, width - 184, 74);

  ctx.font = '700 56px Inter, Arial, sans-serif';
  drawWrappedParagraphs(ctx, body, 92, photoData ? 670 : 260, width - 184, 70);

  ctx.fillStyle = accent;
  ctx.font = '600 34px Inter, Arial, sans-serif';
  drawWrappedParagraphs(ctx, footer, 92, height - 144, width - 184, 44);

  return canvas;
}

function makeCanvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  canvas.__texture = texture;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createBannerSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(8, 15, 30, 0.75)';
  ctx.beginPath();
  ctx.roundRect(12, 18, 1000, 220, 110);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(12, 18, 1000, 220, 110);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 92px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text || 'Celebrate!', 512, 128);
  const texture = makeCanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.94 });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 0.32, 1);
  return sprite;
}

export class WebXREngine {
  constructor({ mountEl, statusEl, overlayEl, videoEl, gift, previewMode = false }) {
    this.mountEl = mountEl;
    this.statusEl = statusEl;
    this.overlayEl = overlayEl;
    this.videoEl = videoEl;
    this.gift = gift;
    this.previewMode = previewMode;

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controller = null;
    this.reticle = null;
    this.hitTestSource = null;
    this.viewerReferenceSpace = null;
    this.localReferenceSpace = null;
    this.contentGroup = new THREE.Group();
    this.cardGroup = new THREE.Group();
    this.bannerSprite = null;
    this.videoPlane = null;
    this.videoTexture = null;
    this.edgeGlow = null;
    this.cardMesh = null;
    this.session = null;
    this.placed = false;
    this.sequenceStarted = false;
    this.bannerStarted = false;
    this.bannerStartTime = 0;
    this.activePointers = new Map();
    this.holdTimer = null;
    this.holdActive = false;
    this.holdPointerId = null;
    this.dragState = { x: 0, y: 0, pinchDistance: 0 };
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.mediaSequence = this.gift.mediaSequence || 'simultaneous';

    this.baseScale = 1;
    this.yawOffset = 0;
    this.pitchOffset = 0;
    this.initialHeight = clamp(Number(this.gift.spawnHeight || 2), 0.3, 3);
    this.initialForwardDistance = clamp(Number(this.gift.forwardDistance || 1.5), 0.6, 3);
    this.heightOffset = this.initialHeight;
    this.forwardDistance = this.initialForwardDistance;

    this.anchorOrigin = new THREE.Vector3();
    this.anchorForward = new THREE.Vector3(0, 0, -1);
    this.cameraWorld = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
    this.placementVector = new THREE.Vector3();
    this.previewCameraTarget = new THREE.Vector3();
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.previewMode ? 0x0f172a : 0x000000);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.mountEl.clientWidth || window.innerWidth, 520);
    this.renderer.xr.enabled = !this.previewMode;
    this.mountEl.innerHTML = '';
    this.mountEl.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = 'none';

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x1b2544, 1.25));
    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(2, 4, 2);
    this.scene.add(dir);

    this.buildGiftMeshes();
    this.bindStageGestures();
    this.scene.add(this.contentGroup);

    if (this.previewMode) {
      this.initPreviewStage();
    } else {
      if (!navigator.xr) {
        throw new Error('WebXR is not available on this browser. Use buyer preview mode or a supported mobile device.');
      }
      if (!window.isSecureContext) {
        throw new Error('WebXR requires HTTPS or localhost.');
      }

      this.reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.06, 0.085, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42 })
      );
      this.reticle.matrixAutoUpdate = false;
      this.reticle.visible = false;
      this.scene.add(this.reticle);

      this.contentGroup.visible = false;
      this.controller = this.renderer.xr.getController(0);
      this.controller.addEventListener('select', () => this.placeAtReticle());
      this.scene.add(this.controller);
    }

    this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  async prepareMedia() {
    if (!this.videoEl || !safeUrl(this.gift.videoUrl)) return;
    this.videoEl.crossOrigin = 'anonymous';
    this.videoEl.preload = 'auto';
    this.videoEl.playsInline = true;
    this.videoEl.setAttribute('playsinline', 'true');
    this.videoEl.setAttribute('webkit-playsinline', 'true');
    if (this.videoEl.src !== safeUrl(this.gift.videoUrl)) {
      this.videoEl.src = safeUrl(this.gift.videoUrl);
    }
    this.videoEl.load();
    try {
      await this.videoEl.play();
      this.videoEl.pause();
      this.videoEl.currentTime = clamp(Number(this.gift.videoStart || 0), 0, 600);
    } catch {
      // silent warm-up failure is fine; real playback is retried on user gesture
    }
  }

  initPreviewStage() {
    this.overlayEl?.classList.remove('hidden');
    this.contentGroup.visible = true;
    this.placed = true;
    this.anchorOrigin.set(0, 0, 0);
    this.anchorForward.set(0, 0, -1);
    this.camera.position.set(0, 1.4, 2.1);
    this.previewCameraTarget.set(0, 1.1, -1.2);
    this.camera.lookAt(this.previewCameraTarget);
    this.applyPlacement();
    this.startSequence();
    this.setStatus('Preview stage ready. Long-press the card edge to enter hold mode, drag to rotate / move, and pinch to scale.', 'success');
  }

  handleResize = () => {
    if (!this.renderer || !this.camera) return;
    const width = this.mountEl.clientWidth || window.innerWidth;
    const height = this.previewMode ? 520 : Math.max(520, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  buildGiftMeshes() {
    const templateTitle = this.gift.templateName || 'AR Surprise';
    const frontCanvas = buildTextCanvas({
      background: this.gift.frontColor,
      accent: this.gift.accentColor,
      title: templateTitle,
      body: this.gift.frontText || this.gift.message || 'A special message is waiting for you.',
      footer: `From ${this.gift.senderName || 'Someone special'}`,
      photoData: this.gift.photoData || ''
    });

    const backCanvas = buildTextCanvas({
      background: '#111936',
      accent: this.gift.accentColor,
      title: 'For you',
      body: this.gift.backText || this.gift.message || 'Open your card in AR.',
      footer: this.gift.recipientName ? `To ${this.gift.recipientName}` : 'AR Celebration Card',
      photoData: this.gift.backPhotoData || ''
    });

    const frontTexture = makeCanvasTexture(frontCanvas);
    const backTexture = makeCanvasTexture(backCanvas);
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.72, metalness: 0.12 });
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.88, 0.02),
      [
        edgeMaterial,
        edgeMaterial,
        edgeMaterial,
        edgeMaterial,
        new THREE.MeshStandardMaterial({ map: frontTexture }),
        new THREE.MeshStandardMaterial({ map: backTexture })
      ]
    );
    card.rotation.y = Math.PI;
    this.cardMesh = card;

    const edgeGlowTexture = createEdgeGlowTexture();
    const edgeGlowMaterial = new THREE.MeshBasicMaterial({
      map: edgeGlowTexture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.edgeGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.98), edgeGlowMaterial);
    this.edgeGlow.position.set(0, 0, 0.015);
    this.edgeGlow.visible = false;

    this.cardGroup.clear();
    this.cardGroup.add(card);
    this.cardGroup.add(this.edgeGlow);
    this.cardGroup.position.set(0, 0, 0);

    this.contentGroup.clear();
    this.contentGroup.add(this.cardGroup);

    const placementHalo = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })
    );
    placementHalo.position.set(0, -0.45, 0);
    this.contentGroup.add(placementHalo);

    if (safeUrl(this.gift.videoUrl)) {
      this.videoEl.src = safeUrl(this.gift.videoUrl);
      this.videoEl.crossOrigin = 'anonymous';
      this.videoEl.loop = false;
      this.videoEl.muted = false;
      this.videoEl.playsInline = true;
      this.videoEl.preload = 'auto';
      this.videoTexture = new THREE.VideoTexture(this.videoEl);
      this.videoTexture.colorSpace = THREE.SRGBColorSpace;
      const videoMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        toneMapped: false,
        transparent: true,
        opacity: 0.995
      });
      this.videoPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.518), videoMaterial);
      this.videoPlane.position.set(0, -0.86, -0.02);
      this.videoPlane.visible = false;
      this.contentGroup.add(this.videoPlane);
    }

    if (this.gift.bannerFinaleEnabled) {
      this.bannerSprite = createBannerSprite(this.gift.bannerText || 'Celebrate!', this.gift.accentColor || '#f59e0b');
      this.bannerSprite.visible = false;
      this.bannerSprite.position.set(0, 1.02, -0.12);
      this.contentGroup.add(this.bannerSprite);
    }
  }

  bindStageGestures() {
    const canvas = this.renderer?.domElement;
    if (!canvas) return;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  screenIntersectsCard(event) {
    if (!this.cardMesh || !this.camera || !this.renderer) return false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.cardMesh, false);
    return hits.length > 0;
  }

  getPointerDistance() {
    const points = Array.from(this.activePointers.values());
    if (points.length < 2) return 0;
    const [a, b] = points;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  activateHoldMode() {
    this.holdActive = true;
    if (this.edgeGlow) this.edgeGlow.visible = true;
    this.overlayEl?.classList.remove('hidden');
    this.setStatus('Hold mode active. Drag to rotate / move the card. Pinch to resize.', 'success');
  }

  deactivateHoldMode() {
    this.holdActive = false;
    if (this.edgeGlow) this.edgeGlow.visible = false;
  }

  onPointerDown = (event) => {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!this.placed || !this.screenIntersectsCard(event)) return;
    if (this.holdActive) {
      this.dragState.pinchDistance = this.getPointerDistance();
      return;
    }
    this.holdPointerId = event.pointerId;
    this.dragState = { x: event.clientX, y: event.clientY, pinchDistance: this.getPointerDistance() };
    window.clearTimeout(this.holdTimer);
    this.holdTimer = window.setTimeout(() => this.activateHoldMode(), 360);
  };

  onPointerMove = (event) => {
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (!this.holdActive || !this.placed) return;

    if (this.activePointers.size >= 2) {
      const nextDistance = this.getPointerDistance();
      const prevDistance = this.dragState.pinchDistance || nextDistance;
      const delta = (nextDistance - prevDistance) / 220;
      this.baseScale = clamp(this.baseScale + delta, 0.65, 1.85);
      this.dragState.pinchDistance = nextDistance;
    } else {
      const dx = event.clientX - this.dragState.x;
      const dy = event.clientY - this.dragState.y;
      this.yawOffset -= dx * 0.0075;
      this.heightOffset = clamp(this.heightOffset - dy * 0.0055, 0.3, 3.2);
      this.dragState.x = event.clientX;
      this.dragState.y = event.clientY;
    }

    this.applyPlacement();
    this.setStatus(`Hold mode. Height ${this.heightOffset.toFixed(1)}m · forward ${this.forwardDistance.toFixed(1)}m · scale ${this.baseScale.toFixed(2)}x.`, 'success');
  };

  onPointerUp = (event) => {
    this.activePointers.delete(event.pointerId);
    if (!this.holdActive) {
      window.clearTimeout(this.holdTimer);
      this.holdTimer = null;
      return;
    }
    if (!this.activePointers.size) {
      this.deactivateHoldMode();
      this.setStatus('Hold mode ended. Use replay to restart the sequence anytime.', 'muted');
    }
  };

  onWheel = (event) => {
    if (!this.placed || !this.holdActive) return;
    event.preventDefault();
    this.baseScale = clamp(this.baseScale + (event.deltaY < 0 ? 0.05 : -0.05), 0.65, 1.85);
    this.applyPlacement();
  };

  async enterAR() {
    if (this.previewMode && (!navigator.xr || !window.isSecureContext)) {
      throw new Error('Preview stage is active. Use a supported mobile browser over HTTPS to enter immersive AR.');
    }
    if (this.session) return;

    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'local-floor', 'light-estimation'],
      domOverlay: { root: document.body }
    });

    session.addEventListener('end', () => this.onSessionEnd());

    this.session = session;
    try {
      this.localReferenceSpace = await session.requestReferenceSpace('local-floor');
    } catch {
      this.localReferenceSpace = await session.requestReferenceSpace('local');
    }
    this.viewerReferenceSpace = await session.requestReferenceSpace('viewer');
    this.hitTestSource = await session.requestHitTestSource({ space: this.viewerReferenceSpace });
    this.renderer.xr.enabled = true;
    await this.renderer.xr.setSession(session);
    this.overlayEl?.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('ar-session-started'));
    this.setStatus('Move your phone to find the ground, then tap once. The card will respect the saved height / distance values.', 'muted');
  }

  placeAtReticle() {
    if (!this.reticle?.visible || this.placed) return;

    this.anchorOrigin.setFromMatrixPosition(this.reticle.matrix);
    this.camera.getWorldDirection(this.anchorForward);
    this.anchorForward.y = 0;
    if (this.anchorForward.lengthSq() < 0.0001) {
      this.anchorForward.set(0, 0, -1);
    }
    this.anchorForward.normalize();

    this.placed = true;
    this.sequenceStarted = false;
    this.bannerStarted = false;
    this.contentGroup.visible = true;
    this.applyPlacement();
    this.setStatus(
      `Placed. Height ${this.heightOffset.toFixed(1)}m · forward ${this.forwardDistance.toFixed(1)}m. Use controls or long-press hold mode to fine-tune.`,
      'success'
    );
    this.startSequence();
  }

  applyPlacement() {
    if (!this.placed) return;

    if (this.previewMode) {
      this.contentGroup.position.set(0, this.heightOffset - 0.95, -this.forwardDistance);
      this.contentGroup.scale.setScalar(this.baseScale);
      this.contentGroup.rotation.set(this.pitchOffset, this.yawOffset, 0);
      return;
    }

    this.placementVector.copy(this.anchorForward).multiplyScalar(this.forwardDistance);
    this.contentGroup.position.copy(this.anchorOrigin).add(this.placementVector);
    this.contentGroup.position.y = this.anchorOrigin.y + this.heightOffset;
    this.contentGroup.scale.setScalar(this.baseScale);
    this.orientTowardCamera();
  }

  orientTowardCamera() {
    if (!this.placed || !this.camera || this.previewMode) return;
    this.camera.getWorldPosition(this.cameraWorld);
    this.lookTarget.copy(this.cameraWorld);
    this.lookTarget.y = this.contentGroup.position.y;
    this.contentGroup.lookAt(this.lookTarget);
    this.contentGroup.rotateY(Math.PI + this.yawOffset);
    this.contentGroup.rotateX(this.pitchOffset);
    this.contentGroup.scale.setScalar(this.baseScale);
  }

  clearSequenceTimers() {
    window.clearTimeout(this.noVideoTimer);
    window.clearTimeout(this.mediaSequenceTimer);
    if (this.videoEndHandler) {
      this.videoEl?.removeEventListener('timeupdate', this.videoEndHandler);
      this.videoEndHandler = null;
    }
  }

  async playVideoSegment() {
    if (!this.videoPlane || !this.videoEl?.src) {
      window.clearTimeout(this.noVideoTimer);
      this.noVideoTimer = window.setTimeout(() => this.triggerBannerFinale(), 4500);
      return;
    }

    const start = clamp(Number(this.gift.videoStart || 0), 0, 600);
    const rawEnd = Number(this.gift.videoEnd || start + 12);
    const end = clamp(Math.max(start + 1, rawEnd), start + 1, 600);
    this.videoPlane.visible = true;
    this.videoEl.currentTime = start;

    try {
      await this.videoEl.play();
    } catch {
      this.setStatus('Video playback is blocked until the next tap. Tap replay or interact again.', 'warn');
    }

    this.videoEndHandler = () => {
      if (this.videoEl.currentTime >= end) {
        this.videoEl.pause();
        this.videoEl.removeEventListener('timeupdate', this.videoEndHandler);
        this.videoEndHandler = null;
        if (this.mediaSequence === 'video-first') {
          this.cardGroup.visible = true;
        }
        this.triggerBannerFinale();
      }
    };

    this.videoEl.addEventListener('timeupdate', this.videoEndHandler);
  }

  async startSequence() {
    this.clearSequenceTimers();
    this.sequenceStarted = true;
    this.bannerStarted = false;
    if (this.bannerSprite) this.bannerSprite.visible = false;
    if (this.videoPlane) this.videoPlane.visible = false;

    switch (this.mediaSequence) {
      case 'video-first':
        this.cardGroup.visible = false;
        await this.playVideoSegment();
        break;
      case 'photo-first':
        this.cardGroup.visible = true;
        this.mediaSequenceTimer = window.setTimeout(() => {
          this.playVideoSegment();
        }, 900);
        break;
      case 'simultaneous':
      default:
        this.cardGroup.visible = true;
        await this.playVideoSegment();
        break;
    }
  }

  triggerBannerFinale() {
    if (!this.bannerSprite || this.bannerStarted) return;
    this.bannerStarted = true;
    this.bannerStartTime = performance.now();
    this.bannerSprite.visible = true;
    this.bannerSprite.position.set(0, 1.02, -0.12);
    this.setStatus('Banner finale started.', 'success');
  }

  render(_time, frame) {
    if (!this.renderer || !this.scene || !this.camera) return;

    if (frame && this.session && !this.placed && this.hitTestSource && this.localReferenceSpace) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(this.localReferenceSpace);
        if (pose) {
          this.reticle.visible = true;
          this.reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else if (this.reticle) {
        this.reticle.visible = false;
      }
    }

    if (!this.previewMode && this.placed) {
      this.orientTowardCamera();
    }

    if (this.bannerStarted && this.bannerSprite) {
      const elapsed = (performance.now() - this.bannerStartTime) / 1000;
      this.bannerSprite.position.y = 1.02 + elapsed * 0.45;
      this.bannerSprite.material.opacity = clamp(1 - elapsed / 2.8, 0, 1);
      if (elapsed >= 2.8) {
        this.bannerSprite.visible = false;
        this.bannerStarted = false;
        this.bannerSprite.material.opacity = 0.94;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateTransform(action) {
    if (!this.contentGroup || !this.placed) return;

    switch (action) {
      case 'smaller':
        this.baseScale = clamp(this.baseScale - 0.08, 0.65, 1.85);
        break;
      case 'bigger':
        this.baseScale = clamp(this.baseScale + 0.08, 0.65, 1.85);
        break;
      case 'raise':
        this.heightOffset = clamp(this.heightOffset + 0.15, 0.3, 3.2);
        break;
      case 'lower':
        this.heightOffset = clamp(this.heightOffset - 0.15, 0.3, 3.2);
        break;
      case 'closer':
        this.forwardDistance = clamp(this.forwardDistance - 0.15, 0.6, 3.2);
        break;
      case 'farther':
        this.forwardDistance = clamp(this.forwardDistance + 0.15, 0.6, 3.2);
        break;
      case 'left':
        this.yawOffset += 0.14;
        break;
      case 'right':
        this.yawOffset -= 0.14;
        break;
      case 'tilt-up':
        this.pitchOffset = clamp(this.pitchOffset - 0.08, -0.7, 0.45);
        break;
      case 'tilt-down':
        this.pitchOffset = clamp(this.pitchOffset + 0.08, -0.7, 0.45);
        break;
      case 'reset':
        this.baseScale = 1;
        this.yawOffset = 0;
        this.pitchOffset = 0;
        this.heightOffset = this.initialHeight;
        this.forwardDistance = this.initialForwardDistance;
        break;
      case 'replay':
        this.replay();
        return;
      default:
        return;
    }

    this.applyPlacement();
    this.setStatus(
      `${this.previewMode ? 'Preview' : 'AR'} tuned. Height ${this.heightOffset.toFixed(1)}m · forward ${this.forwardDistance.toFixed(1)}m · scale ${this.baseScale.toFixed(2)}x.`,
      'success'
    );
  }

  async replay() {
    if (!this.placed) return;
    this.clearSequenceTimers();
    if (this.videoEl?.src) {
      this.videoEl.pause();
      this.videoEl.currentTime = clamp(Number(this.gift.videoStart || 0), 0, 600);
    }
    await this.startSequence();
    this.setStatus('Sequence restarted.', 'success');
  }

  setStatus(message, tone = 'muted') {
    if (!this.statusEl) return;
    this.statusEl.textContent = message;
    this.statusEl.className = `status-box ${tone}`;
  }

  onSessionEnd() {
    this.session = null;
    this.hitTestSource = null;
    this.viewerReferenceSpace = null;
    this.localReferenceSpace = null;
    this.overlayEl?.classList.add('hidden');
    this.deactivateHoldMode();
    window.dispatchEvent(new CustomEvent('ar-session-ended'));
    this.setStatus('AR session ended. Tap Enter AR to start again.', 'muted');
  }

  dispose() {
    this.clearSequenceTimers();
    window.clearTimeout(this.holdTimer);
    this.session?.end?.();
    this.renderer?.setAnimationLoop(null);
    this.videoEl?.pause?.();
    this.videoTexture?.dispose?.();
    this.renderer?.dispose?.();
    if (this.mountEl) this.mountEl.innerHTML = '';
    window.removeEventListener('resize', this.handleResize);
  }
}
