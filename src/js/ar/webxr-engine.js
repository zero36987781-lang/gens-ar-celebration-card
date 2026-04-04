import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { clamp, hexToRgb, safeUrl } from '../core/utils.js';

function buildTextCanvas({ width = 1024, height = 1024, background = '#7c3aed', accent = '#f59e0b', title = '', body = '', footer = '', photoData = '' }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const accentRgb = hexToRgb(accent);
  const glow = ctx.createRadialGradient(width * 0.25, height * 0.2, 10, width * 0.25, height * 0.2, width * 0.7);
  glow.addColorStop(0, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.55)`);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(48, 48, width - 96, height - 96, 42);
  ctx.fill();

  if (photoData) {
    const img = new Image();
    img.src = photoData;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(86, 130, width - 172, 360, 34);
    ctx.clip();
    img.onload = () => {
      const ratio = Math.max((width - 172) / img.width, 360 / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      ctx.drawImage(img, 86 + ((width - 172) - drawW) / 2, 130 + (360 - drawH) / 2, drawW, drawH);
      if (canvas.__texture) canvas.__texture.needsUpdate = true;
    };
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(86, 130, width - 172, 360, 34);
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 60px Inter, Arial, sans-serif';
  ctx.fillText(title.slice(0, 26), 92, 90);

  ctx.font = '700 56px Inter, Arial, sans-serif';
  wrapText(ctx, body, 94, photoData ? 570 : 220, width - 188, 70);

  ctx.fillStyle = accent;
  ctx.font = '600 34px Inter, Arial, sans-serif';
  wrapText(ctx, footer, 94, height - 108, width - 188, 44);

  return canvas;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  for (let i = 0; i < words.length; i += 1) {
    const testLine = `${line}${words[i]} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y);
      line = `${words[i]} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line.trim(), x, y);
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
    this.session = null;
    this.placed = false;
    this.sequenceStarted = false;
    this.bannerStarted = false;
    this.bannerStartTime = 0;

    this.baseScale = 1;
    this.yawOffset = 0;
    this.pitchOffset = 0;
    this.initialHeight = clamp(Number(this.gift.spawnHeight || 1.6), 0.6, 4.5);
    this.initialForwardDistance = clamp(Number(this.gift.forwardDistance || 1.6), 0.6, 6);
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
    this.renderer.setSize(this.mountEl.clientWidth || window.innerWidth, 420);
    this.renderer.xr.enabled = !this.previewMode;
    this.mountEl.innerHTML = '';
    this.mountEl.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x1b2544, 1.25));
    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(2, 4, 2);
    this.scene.add(dir);


    this.buildGiftMeshes();
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
        new THREE.RingGeometry(0.09, 0.12, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x7c3aed })
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

  initPreviewStage() {
    this.overlayEl?.classList.remove('hidden');
    this.contentGroup.visible = true;
    this.placed = true;
    this.anchorOrigin.set(0, 0, 0);
    this.anchorForward.set(0, 0, -1);
    this.camera.position.set(0, 1.35, 1.9);
    this.previewCameraTarget.set(0, 0.7, -1.1);
    this.camera.lookAt(this.previewCameraTarget);
    this.applyPlacement();
    this.startSequence();
    this.setStatus('Preview stage ready. This is a non-location QA mode for the buyer.', 'success');
  }

  handleResize = () => {
    if (!this.renderer || !this.camera) return;
    const width = this.mountEl.clientWidth || window.innerWidth;
    const height = 420;
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
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.7, metalness: 0.1 });
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.64, 0.015),
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

    this.cardGroup.clear();
    this.cardGroup.add(card);
    this.cardGroup.position.set(0, 0, 0);

    this.contentGroup.clear();
    this.contentGroup.add(this.cardGroup);

    const placementHalo = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 })
    );
    placementHalo.position.set(0, -0.325, 0);
    this.contentGroup.add(placementHalo);

    if (safeUrl(this.gift.videoUrl)) {
      this.videoEl.src = this.gift.videoUrl;
      this.videoEl.crossOrigin = 'anonymous';
      this.videoEl.loop = false;
      this.videoEl.muted = false;
      this.videoEl.playsInline = true;
      this.videoTexture = new THREE.VideoTexture(this.videoEl);
      this.videoTexture.colorSpace = THREE.SRGBColorSpace;
      const videoMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        toneMapped: false,
        transparent: true,
        opacity: 0.98
      });
      this.videoPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.34), videoMaterial);
      this.videoPlane.position.set(0, -0.55, -0.02);
      this.videoPlane.visible = false;
      this.contentGroup.add(this.videoPlane);
    }

    if (this.gift.bannerFinaleEnabled) {
      this.bannerSprite = createBannerSprite(this.gift.bannerText || 'Celebrate!', this.gift.accentColor || '#f59e0b');
      this.bannerSprite.visible = false;
      this.bannerSprite.position.set(0, 0.8, -0.12);
      this.contentGroup.add(this.bannerSprite);
    }
  }

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
    this.localReferenceSpace = await session.requestReferenceSpace('local');
    this.viewerReferenceSpace = await session.requestReferenceSpace('viewer');
    this.hitTestSource = await session.requestHitTestSource({ space: this.viewerReferenceSpace });
    this.renderer.xr.enabled = true;
    await this.renderer.xr.setSession(session);
    this.overlayEl?.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('ar-session-started'));
    this.setStatus('Move your phone to find the ground, then tap once. The card will be placed in visibility-first mode.', 'muted');
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
      `Placed. Height ${this.heightOffset.toFixed(1)}m · forward ${this.forwardDistance.toFixed(1)}m. Use Up/Down or Near/Far if people or objects block the view.`,
      'success'
    );
    this.startSequence();
  }

  applyPlacement() {
    if (!this.placed) return;

    if (this.previewMode) {
      this.contentGroup.position.set(0, this.heightOffset - 0.9, -this.forwardDistance);
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

  async startSequence() {
    this.sequenceStarted = true;
    this.cardGroup.visible = true;

    if (this.videoPlane && this.videoEl?.src) {
      this.videoPlane.visible = true;
      const start = clamp(Number(this.gift.videoStart || 0), 0, 3600);
      const end = Math.max(start + 1, Number(this.gift.videoEnd || start + 12));
      this.videoEl.currentTime = start;
      try {
        await this.videoEl.play();
      } catch {
        this.setStatus('Placed. Tap play on the device if the video is blocked.', 'warn');
      }

      const onTimeUpdate = () => {
        if (this.videoEl.currentTime >= end) {
          this.videoEl.pause();
          this.videoEl.removeEventListener('timeupdate', onTimeUpdate);
          this.triggerBannerFinale();
        }
      };

      this.videoEl.removeEventListener('timeupdate', onTimeUpdate);
      this.videoEl.addEventListener('timeupdate', onTimeUpdate);
    } else {
      window.clearTimeout(this.noVideoTimer);
      this.noVideoTimer = window.setTimeout(() => this.triggerBannerFinale(), 5000);
    }
  }

  triggerBannerFinale() {
    if (!this.bannerSprite || this.bannerStarted) return;
    this.bannerStarted = true;
    this.bannerStartTime = performance.now();
    this.bannerSprite.visible = true;
    this.bannerSprite.position.set(0, 0.8, -0.12);
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
      this.bannerSprite.position.y = 0.8 + elapsed * 0.45;
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
        this.baseScale = clamp(this.baseScale - 0.08, 0.6, 1.9);
        break;
      case 'bigger':
        this.baseScale = clamp(this.baseScale + 0.08, 0.6, 1.9);
        break;
      case 'raise':
        this.heightOffset = clamp(this.heightOffset + 0.15, 0.5, 5);
        break;
      case 'lower':
        this.heightOffset = clamp(this.heightOffset - 0.15, 0.5, 5);
        break;
      case 'closer':
        this.forwardDistance = clamp(this.forwardDistance - 0.15, 0.5, 6);
        break;
      case 'farther':
        this.forwardDistance = clamp(this.forwardDistance + 0.15, 0.5, 6);
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
      `${this.previewMode ? 'Preview' : 'Visible placement'} tuned. Height ${this.heightOffset.toFixed(1)}m · forward ${this.forwardDistance.toFixed(1)}m · scale ${this.baseScale.toFixed(2)}x.`,
      'success'
    );
  }

  async replay() {
    if (!this.placed) return;
    if (this.videoEl?.src) {
      const start = clamp(Number(this.gift.videoStart || 0), 0, 3600);
      this.videoEl.currentTime = start;
      try {
        await this.videoEl.play();
      } catch {
        // ignore autoplay blocks; user can interact again
      }
    }
    if (this.bannerSprite) {
      this.bannerStarted = false;
      this.bannerSprite.visible = false;
      window.clearTimeout(this.noVideoTimer);
      this.noVideoTimer = window.setTimeout(() => this.triggerBannerFinale(), 4500);
    }
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
    window.dispatchEvent(new CustomEvent('ar-session-ended'));
    this.setStatus('AR session ended. Tap Enter AR to start again.', 'muted');
  }

  dispose() {
    window.clearTimeout(this.noVideoTimer);
    this.session?.end?.();
    this.renderer?.setAnimationLoop(null);
    this.videoEl?.pause?.();
    this.videoTexture?.dispose?.();
    this.renderer?.dispose?.();
    if (this.mountEl) this.mountEl.innerHTML = '';
    window.removeEventListener('resize', this.handleResize);
  }
}
