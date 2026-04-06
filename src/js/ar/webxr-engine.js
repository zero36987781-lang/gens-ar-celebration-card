import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, hexToRgb, safeUrl } from '../core/utils.js';

function isDirectVideoUrl(url) {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(String(url || ''));
}

function drawWrappedParagraphs(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = String(text || '').replace(/\r/g, '').split('\n');
  let cursorY = y;
  paragraphs.forEach((paragraph, index) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { cursorY += lineHeight; return; }
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
    if (line.trim()) { ctx.fillText(line.trim(), x, cursorY); cursorY += lineHeight; }
    if (index !== paragraphs.length - 1) cursorY += lineHeight * 0.28;
  });
}

/* Build card face canvas — NO ambient glow overlay, exact color match */
function buildTextCanvas({ width = 1024, height = 1536, background = '#7c3aed', title = '', subtitle = '', body = '', footer = '', footerColor = '#f59e0b', photoData = '' }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Exact background color — no gradient overlay
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  // Subtle inner border
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.roundRect(44, 44, width - 88, height - 88, 54);
  ctx.fill();

  if (photoData) {
    const img = new Image();
    img.src = photoData;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(86, 180, width - 172, 390, 36);
    ctx.clip();
    img.onload = () => {
      const ratio = Math.max((width - 172) / img.width, 390 / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      ctx.drawImage(img, 86 + ((width - 172) - drawW) / 2, 180 + (390 - drawH) / 2, drawW, drawH);
      if (canvas.__texture) canvas.__texture.needsUpdate = true;
    };
    ctx.restore();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 68px Inter, Arial, sans-serif';
  drawWrappedParagraphs(ctx, title.slice(0, 50), 92, 118, width - 184, 74);

  ctx.font = '500 34px Inter, Arial, sans-serif';
  drawWrappedParagraphs(ctx, subtitle, 92, photoData ? 610 : 236, width - 184, 44);

  ctx.font = '700 54px Inter, Arial, sans-serif';
  drawWrappedParagraphs(ctx, body, 92, photoData ? 720 : 340, width - 184, 66);

  ctx.fillStyle = footerColor;
  ctx.font = '600 34px Inter, Arial, sans-serif';
  drawWrappedParagraphs(ctx, footer, 92, height - 144, width - 184, 42);

  return canvas;
}

function makeCanvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  canvas.__texture = texture;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export class WebXREngine {
  constructor({ mountEl, statusEl, overlayEl, videoEl, gift, previewMode = false }) {
    this.mountEl = mountEl;
    this.statusEl = statusEl;
    this.overlayEl = overlayEl;
    this.videoEl = videoEl;
    this.gift = gift;
    this.previewMode = previewMode;

    this.renderer = null; this.scene = null; this.camera = null; this.session = null;
    this.contentGroup = new THREE.Group();
    this.cardGroup = new THREE.Group();
    this.videoPlane = null; this.videoTexture = null;
    this.cardMesh = null; this.glowMesh = null; this.floorCircle = null;

    this.placed = false; this.sequenceComplete = false;
    this.autoPlacedInSession = false; this.pendingArPlacement = false;
    this.isCardBack = false;

    this.baseScale = 1; this.yawOffset = 0; this.pitchOffset = 0;
    this.localOffsetX = 0; this.localOffsetY = 0;
    this.forwardDistance = clamp(Number(this.gift.forwardDistance || 2), 0.5, 5.5);
    this.heightOffset = clamp(Number(this.gift.spawnHeight || 3), 0.5, 5.5);

    this.cameraWorld = new THREE.Vector3();
    this.cameraDirection = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
    this.placementVector = new THREE.Vector3();
    this.anchorOrigin = new THREE.Vector3(0, 0, 0);
    this.anchorForward = new THREE.Vector3(0, 0, -1);

    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.activePointers = new Map();
    this.longPressTimer = null;
    this.gestureMode = 'none';
    this.lastTapTime = 0;
    this.lastPointerPoint = { x: 0, y: 0 };
    this.lastPinchDistance = 0;
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.previewMode ? 0x09101f : 0x000000);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(this.mountEl.clientWidth || window.innerWidth, 620);
    this.renderer.xr.enabled = !this.previewMode;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.mountEl.innerHTML = '';
    this.mountEl.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = 'none';

    // Lights — minimal so MeshBasicMaterial colors stay exact
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    this.buildGiftMeshes();
    this.bindStageGestures();
    this.scene.add(this.contentGroup);
    this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    this.camera.position.set(0, 1.6, 3.0);
    this.camera.lookAt(new THREE.Vector3(0, 1.2, 0));

    if (this.previewMode) {
      this.anchorOrigin.set(0, 0, 0);
      this.anchorForward.set(0, 0, -1);
      this.placeNow();
      this.startSequence();
      this.setStatus('Interactive preview ready. Long-press card to move, drag outside to rotate, pinch to zoom, double-tap to flip.', 'success');
    }
  }

  async prepareMedia() {
    const mediaUrl = safeUrl(this.gift.videoUrl);
    if (!this.videoEl || !mediaUrl || !isDirectVideoUrl(mediaUrl)) return;
    this.videoEl.crossOrigin = 'anonymous';
    this.videoEl.preload = 'auto'; this.videoEl.playsInline = true;
    if (this.videoEl.src !== mediaUrl) this.videoEl.src = mediaUrl;
    this.videoEl.load();
    try { await this.videoEl.play(); this.videoEl.pause(); } catch {}
  }

  buildGiftMeshes() {
    const frontColor = this.gift.frontColor || '#7c3aed';
    const accentColor = this.gift.accentColor || '#f59e0b';

    const frontCanvas = buildTextCanvas({
      background: frontColor,
      title: this.gift.templateName || 'CHARIEL',
      subtitle: this.gift.frontSubtitle || '',
      body: this.gift.frontText || this.gift.message || '',
      footer: `From ${this.gift.senderName || 'Someone special'}`,
      footerColor: accentColor,
      photoData: this.gift.photoData || ''
    });

    const backCanvas = buildTextCanvas({
      background: '#0b1224',
      title: 'Back side',
      subtitle: this.gift.recipientName ? `For ${this.gift.recipientName}` : '',
      body: this.gift.backText || '',
      footer: 'CHARIEL',
      footerColor: accentColor,
      photoData: this.gift.backPhotoData || ''
    });

    const frontTexture = makeCanvasTexture(frontCanvas);
    const backTexture = makeCanvasTexture(backCanvas);

    // All MeshBasicMaterial — no lighting interference, colors stay fixed
    const edgeColor = new THREE.Color(frontColor).multiplyScalar(0.76);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: edgeColor });

    this.cardMesh = new THREE.Mesh(
      new RoundedBoxGeometry(0.62, 0.88, 0.04, 8, 0.02),
      [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial,
       new THREE.MeshBasicMaterial({ map: frontTexture }),
       new THREE.MeshBasicMaterial({ map: backTexture })]
    );
    this.cardMesh.rotation.y = Math.PI;

    // 3D glow — slightly larger RoundedBox wrapping entire card
    const glowGeom = new RoundedBoxGeometry(0.68, 0.94, 0.08, 8, 0.03);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#dff7ff'),
      transparent: true, opacity: 0.18,
      depthWrite: false, side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    this.glowMesh = new THREE.Mesh(glowGeom, glowMat);

    this.cardGroup.clear();
    this.cardGroup.add(this.glowMesh);
    this.cardGroup.add(this.cardMesh);

    this.floorCircle = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.18 })
    );
    this.floorCircle.position.set(0, -0.46, 0);

    this.contentGroup.clear();
    this.contentGroup.add(this.cardGroup);
    this.contentGroup.add(this.floorCircle);
    this.contentGroup.visible = false;

    // Direct video
    const mediaUrl = safeUrl(this.gift.videoUrl);
    if (mediaUrl && isDirectVideoUrl(mediaUrl)) {
      this.videoEl.src = mediaUrl;
      this.videoEl.crossOrigin = 'anonymous';
      this.videoEl.loop = false; this.videoEl.muted = false;
      this.videoEl.playsInline = true; this.videoEl.preload = 'auto';
      this.videoTexture = new THREE.VideoTexture(this.videoEl);
      this.videoTexture.colorSpace = THREE.SRGBColorSpace;
      const videoMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, toneMapped: false, transparent: true, opacity: 0.995 });
      this.videoPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.551), videoMaterial);
      this.videoPlane.position.set(0, -0.88, 0.01);
      this.videoPlane.visible = false;
      this.contentGroup.add(this.videoPlane);
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
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  handleResize = () => {
    if (!this.renderer || !this.camera) return;
    const width = this.mountEl.clientWidth || window.innerWidth;
    const height = this.previewMode ? 620 : Math.max(620, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  setGlowMode(active) {
    if (!this.glowMesh?.material) return;
    this.glowMesh.material.color.set(active ? '#8b5cf6' : '#dff7ff');
    this.glowMesh.material.opacity = active ? 0.35 : 0.18;
  }

  stagePointerToRay(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  screenIntersectsCard(event) {
    if (!this.cardMesh || !this.camera || !this.renderer) return false;
    this.stagePointerToRay(event);
    return this.raycaster.intersectObject(this.cardMesh, false).length > 0;
  }

  getPointerDistance() {
    const points = Array.from(this.activePointers.values());
    if (points.length < 2) return 0;
    const [a, b] = points;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  onPointerDown = (event) => {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.lastPointerPoint = { x: event.clientX, y: event.clientY };

    const now = performance.now();
    if (now - this.lastTapTime < 280 && this.screenIntersectsCard(event)) {
      this.flipCard(); this.lastTapTime = 0; return;
    }
    this.lastTapTime = now;

    if (this.activePointers.size >= 2) {
      this.gestureMode = 'pinch';
      this.lastPinchDistance = this.getPointerDistance();
      return;
    }

    const onCard = this.screenIntersectsCard(event);
    this.gestureMode = onCard ? 'card-pending' : 'view';

    window.clearTimeout(this.longPressTimer);
    if (onCard) {
      this.longPressTimer = window.setTimeout(() => {
        this.gestureMode = 'move';
        this.setGlowMode(true);
        this.setStatus('Edit mode. Drag to move the card.', 'success');
      }, 360);
    }
  };

  onPointerMove = (event) => {
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (!this.placed) return;

    if (this.activePointers.size >= 2) {
      const nextDistance = this.getPointerDistance();
      if (!nextDistance) return;
      const delta = (nextDistance - (this.lastPinchDistance || nextDistance)) / 180;
      this.baseScale = clamp(this.baseScale + delta, 0.5, 5.5);
      this.lastPinchDistance = nextDistance;
      this.applyPlacement();
      return;
    }

    const dx = event.clientX - this.lastPointerPoint.x;
    const dy = event.clientY - this.lastPointerPoint.y;
    this.lastPointerPoint = { x: event.clientX, y: event.clientY };

    if (this.gestureMode === 'move') {
      this.localOffsetX = clamp(this.localOffsetX + dx * 0.0028, -1.8, 1.8);
      this.localOffsetY = clamp(this.localOffsetY - dy * 0.0035, -1.8, 2.8);
      this.applyPlacement();
      return;
    }

    if (this.gestureMode === 'view') {
      this.yawOffset -= dx * 0.007;
      this.pitchOffset = clamp(this.pitchOffset + dy * 0.0055, -0.9, 0.9);
      this.applyPlacement();
    }
  };

  onPointerUp = (event) => {
    this.activePointers.delete(event.pointerId);
    window.clearTimeout(this.longPressTimer);
    if (this.gestureMode === 'move') {
      this.setGlowMode(false);
      this.setStatus('Edit mode ended.', 'muted');
    }
    this.gestureMode = this.activePointers.size >= 2 ? 'pinch' : 'none';
  };

  onWheel = (event) => {
    if (!this.placed) return;
    event.preventDefault();
    this.baseScale = clamp(this.baseScale + (event.deltaY < 0 ? 0.12 : -0.12), 0.5, 5.5);
    this.applyPlacement();
  };

  flipCard() {
    this.isCardBack = !this.isCardBack;
    this.cardMesh.rotation.y = Math.PI + (this.isCardBack ? Math.PI : 0);
    this.setStatus(this.isCardBack ? 'Back side.' : 'Front side.', 'success');
  }

  placeNow() {
    this.placed = true;
    this.contentGroup.visible = true;
    this.applyPlacement();
  }

  placeInFrontOfCamera() {
    const xrCamera = this.session ? this.renderer.xr.getCamera(this.camera) : this.camera;
    xrCamera.getWorldDirection(this.cameraDirection);
    this.cameraDirection.y = 0;
    if (this.cameraDirection.lengthSq() < 0.0001) this.cameraDirection.set(0, 0, -1);
    this.cameraDirection.normalize();
    this.anchorForward.copy(this.cameraDirection);
    this.anchorOrigin.set(0, 0, 0);
    this.placeNow();
  }

  applyPlacement() {
    if (!this.placed) return;

    if (this.previewMode || !this.session) {
      this.contentGroup.position.set(this.localOffsetX, this.heightOffset - 1.2 + this.localOffsetY, -this.forwardDistance);
      this.contentGroup.scale.setScalar(this.baseScale);
      this.contentGroup.rotation.set(this.pitchOffset, this.yawOffset, 0);
      return;
    }

    const right = new THREE.Vector3().crossVectors(this.anchorForward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    this.placementVector.copy(this.anchorForward).multiplyScalar(this.forwardDistance)
      .add(right.multiplyScalar(this.localOffsetX))
      .add(up.multiplyScalar(this.heightOffset + this.localOffsetY));
    this.contentGroup.position.copy(this.anchorOrigin).add(this.placementVector);
    this.contentGroup.scale.setScalar(this.baseScale);
    this.orientTowardCamera();
  }

  orientTowardCamera() {
    const xrCamera = this.session ? this.renderer.xr.getCamera(this.camera) : this.camera;
    xrCamera.getWorldPosition(this.cameraWorld);
    this.lookTarget.copy(this.cameraWorld);
    this.lookTarget.y = this.contentGroup.position.y;
    this.contentGroup.lookAt(this.lookTarget);
    this.contentGroup.rotateY(Math.PI + this.yawOffset);
    this.contentGroup.rotateX(this.pitchOffset);
  }

  async playVideoSegment() {
    if (!this.videoPlane || !this.videoEl?.src) {
      this.sequenceComplete = true;
      window.dispatchEvent(new CustomEvent('ar-sequence-complete'));
      return;
    }

    const start = clamp(Number(this.gift.videoStart || 0), 0, 36000);
    const rawEnd = Number(this.gift.videoEnd || start + 12);
    const end = Math.max(start + 1, rawEnd);
    this.videoPlane.visible = true;
    this.videoEl.currentTime = start;

    try { await this.videoEl.play(); } catch {
      this.setStatus('Video waiting for gesture.', 'warn');
    }

    if (this.videoEndHandler) {
      this.videoEl.removeEventListener('timeupdate', this.videoEndHandler);
    }

    this.videoEndHandler = () => {
      if (this.videoEl.currentTime >= end) {
        this.videoEl.pause();
        this.videoEl.removeEventListener('timeupdate', this.videoEndHandler);
        this.videoEndHandler = null;
        this.sequenceComplete = true;
        window.dispatchEvent(new CustomEvent('ar-sequence-complete'));
        this.setStatus('Card sequence completed.', 'success');
      }
    };
    this.videoEl.addEventListener('timeupdate', this.videoEndHandler);
  }

  async startSequence() {
    this.sequenceComplete = false;
    this.cardGroup.visible = true;
    if (this.videoPlane) this.videoPlane.visible = false;
    await this.playVideoSegment();
  }

  async replay() {
    if (!this.placed) return;
    if (this.videoEl?.src) { this.videoEl.pause(); this.videoEl.currentTime = clamp(Number(this.gift.videoStart || 0), 0, 36000); }
    await this.startSequence();
    this.setStatus('Sequence restarted.', 'success');
  }

  async enterAR() {
    if (this.previewMode) throw new Error('Preview mode active. Open on mobile for immersive AR.');
    if (!navigator.xr || !window.isSecureContext) throw new Error('Immersive AR unavailable. 3D card active.');
    if (this.session) return;

    const session = await navigator.xr.requestSession('immersive-ar', {
      optionalFeatures: ['dom-overlay', 'local-floor', 'light-estimation'],
      domOverlay: { root: document.body }
    });

    session.addEventListener('end', () => this.onSessionEnd());
    this.session = session;
    this.renderer.xr.enabled = true;
    await this.renderer.xr.setSession(session);
    this.pendingArPlacement = true;
    this.autoPlacedInSession = false;
    window.dispatchEvent(new CustomEvent('ar-session-started'));
    this.setStatus('AR started. Card placed in front of you.', 'success');
  }

  render(_time, _frame) {
    if (!this.renderer || !this.scene || !this.camera) return;
    if (this.session && this.pendingArPlacement && !this.autoPlacedInSession) {
      this.placeInFrontOfCamera();
      this.autoPlacedInSession = true;
      this.pendingArPlacement = false;
      this.startSequence();
    }
    if (!this.previewMode && this.placed && this.session) this.orientTowardCamera();
    this.renderer.render(this.scene, this.camera);
  }

  setStatus(message, tone = 'muted') {
    if (!this.statusEl) return;
    this.statusEl.textContent = message;
    this.statusEl.className = `status-box ${tone}`;
  }

  onSessionEnd() {
    this.session = null;
    this.pendingArPlacement = false;
    this.autoPlacedInSession = false;
    this.setGlowMode(false);
    window.dispatchEvent(new CustomEvent('ar-session-ended'));
    this.setStatus('AR session ended.', 'muted');
  }

  dispose() {
    window.clearTimeout(this.longPressTimer);
    if (this.videoEndHandler) this.videoEl?.removeEventListener('timeupdate', this.videoEndHandler);
    this.session?.end?.();
    this.renderer?.setAnimationLoop(null);
    this.videoEl?.pause?.();
    this.videoTexture?.dispose?.();
    this.renderer?.dispose?.();
    if (this.mountEl) this.mountEl.innerHTML = '';
    window.removeEventListener('resize', this.handleResize);
  }
}
